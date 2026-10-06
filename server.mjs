import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, "public");

const PORT = Number(process.env.PORT || 3000);
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL_DEFAULT = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

const defaultSceneFiles = {
  table: path.join(PUBLIC_DIR, "scenes", "table-review.png"),
  room: path.join(PUBLIC_DIR, "scenes", "room-review.png"),
};

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".md": "text/markdown; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

const PREFERRED_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.6-flash",
  "gemini-3.1-pro-preview",
];

function transitionTypeLabel(type="auto_smart") {
  return ({
    auto_smart: "Auto Smart",
    match_cut: "Match Cut",
    hold_reveal: "Hold & Reveal",
    cut_on_action: "Cut on Action",
    zoom_counter: "Counter Zoom",
    object_follow: "Object Follow",
    clean_cut: "Clean Cut",
  })[type] || type;
}

function buildTransitionPrefsSummary(transitionPrefs = {}, clipCount = 4) {
  const lines = [];
  const motionPolicy = transitionPrefs?.motionPolicy || "minimal";
  for (let i = 1; i < clipCount; i++) {
    const from = `BC_${String(i).padStart(2, "0")}`;
    const to = `BC_${String(i+1).padStart(2, "0")}`;
    const key = `${from}_to_${to}`;
    const type = transitionPrefs?.pairs?.[key] || "auto_smart";
    lines.push(`- ${from} -> ${to}: ${type} (${transitionTypeLabel(type)})`);
  }
  return `Motion policy: ${motionPolicy}
${lines.join("\n")}`;
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(data));
}

async function readBody(req, maxBytes = 64 * 1024 * 1024) {
  return await new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error("Request ใหญ่เกิน 64 MB กรุณาลดขนาดรูป"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("JSON ไม่ถูกต้อง"));
      }
    });
    req.on("error", reject);
  });
}

function dataUrlToInlineData(dataUrl) {
  const match = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl || "");
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

async function fileInline(file) {
  const buf = await readFile(file);
  return { mimeType: "image/png", data: buf.toString("base64") };
}

async function sceneInline(customDataUrl, sceneKey) {
  return dataUrlToInlineData(customDataUrl) || await fileInline(defaultSceneFiles[sceneKey]);
}

function stripJsonFence(text = "") {
  const t = text.trim();
  const m = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return m ? m[1].trim() : t;
}

async function listGeminiModels() {
  if (!GEMINI_API_KEY) return [];
  const r = await fetch(`${GEMINI_BASE}/models?key=${encodeURIComponent(GEMINI_API_KEY)}`);
  const raw = await r.text();
  if (!r.ok) throw new Error(`อ่านรายการ Gemini models ไม่สำเร็จ: ${raw.slice(0, 1200)}`);
  let data = {};
  try { data = JSON.parse(raw); } catch {}
  return (data.models || [])
    .filter(m => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes("generateContent"))
    .map(m => ({
      id: String(m.name || "").replace(/^models\//, ""),
      displayName: m.displayName || String(m.name || "").replace(/^models\//, ""),
    }))
    .filter(m => m.id);
}

async function resolveGeminiModel(requestedModel) {
  let available = [];
  try { available = await listGeminiModels(); } catch {}
  const availableIds = new Set(available.map(m => m.id));
  const candidates = [requestedModel, GEMINI_MODEL_DEFAULT, ...PREFERRED_MODELS].filter(Boolean);
  if (availableIds.size) {
    const matched = candidates.find(id => availableIds.has(id));
    if (matched) return { model: matched, available };
    const firstGemini = available.find(m => /^gemini-/i.test(m.id));
    if (firstGemini) return { model: firstGemini.id, available };
  }
  return { model: requestedModel || GEMINI_MODEL_DEFAULT, available };
}

const TRANSIENT_GEMINI_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function parseRetryAfterMs(value) {
  if (!value) return 0;
  const n = Number(value);
  if (Number.isFinite(n) && n > 0) return Math.min(n * 1000, 60000);
  const t = Date.parse(value);
  if (Number.isFinite(t)) return Math.max(0, Math.min(t - Date.now(), 60000));
  return 0;
}

function overloadDelayMs(attemptIndex, retryAfterHeader = null) {
  const h = parseRetryAfterMs(retryAfterHeader);
  if (h) return h;
  return Math.min(1500 * (2 ** attemptIndex), 12000) + Math.floor(Math.random() * 900);
}

function rateLimitDelayMs(attemptIndex, retryAfterHeader = null) {
  const h = parseRetryAfterMs(retryAfterHeader);
  if (h) return h;
  const seq = [8000, 18000];
  return seq[Math.min(attemptIndex, seq.length - 1)] + Math.floor(Math.random() * 1500);
}

function readApiMessage(raw) {
  try { const p = JSON.parse(raw || "{}"); return p?.error?.message || p?.message || ""; }
  catch { return ""; }
}

function friendlyGeminiError(status, modelId, raw, attempts, retryAfterMs = 0) {
  const message = readApiMessage(raw);
  if (status === 503) {
    const err = new Error(`Gemini ฝั่ง Google กำลังโหลดสูงชั่วคราว (503). ระบบลองซ้ำและสลับโมเดลที่รองรับแล้ว ${attempts} ครั้ง แต่ยังไม่สำเร็จ กรุณารอ 30–60 วินาทีแล้วลองใหม่${message ? ` — ${message}` : ""}`);
    err.statusCode = 503; err.code = "GEMINI_OVERLOADED"; err.retryAfterSec = 45; return err;
  }
  if (status === 429) {
    const suggested = Math.max(15, Math.ceil((retryAfterMs || 15000) / 1000));
    const err = new Error(`Gemini API ถึงขีดจำกัดอัตราการใช้งานชั่วคราว (429 RATE LIMIT). อย่ากดซ้ำถี่ ๆ เพราะอาจเป็น RPM/TPM ของโปรเจกต์ กรุณารอประมาณ ${suggested} วินาทีแล้วลองขั้นตอนเดิมอีกครั้ง${message ? ` — ${message}` : ""}`);
    err.statusCode = 429; err.code = "GEMINI_RATE_LIMIT"; err.retryAfterSec = suggested; return err;
  }
  const err = new Error(`Gemini API error (${modelId}, HTTP ${status}): ${(message || raw || "Unknown error").slice(0, 2200)}`);
  err.statusCode = status || 502; err.retryAfterSec = 0; return err;
}

function rankFallbackModels(available = [], requestedModel = "") {
  const ids = available.map(x => x.id).filter(id => /^gemini-/i.test(id));
  const order = [requestedModel, GEMINI_MODEL_DEFAULT, ...PREFERRED_MODELS, ...ids.filter(id => /flash-lite/i.test(id)), ...ids.filter(id => /flash/i.test(id) && !/flash-lite/i.test(id)), ...ids.filter(id => /pro/i.test(id))].filter(Boolean);
  return [...new Set(order)].filter(id => !ids.length || ids.includes(id));
}

async function callGemini({ model, parts, maxOutputTokens = 12000 }) {
  const resolved = await resolveGeminiModel(model);
  const candidateModels = rankFallbackModels(resolved.available || [], resolved.model || model);
  if (!candidateModels.length) candidateModels.push(resolved.model || model || GEMINI_MODEL_DEFAULT);

  async function runOnce(modelId) {
    return await fetch(`${GEMINI_BASE}/models/${encodeURIComponent(modelId)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig: { maxOutputTokens, responseMimeType: "application/json" } }),
    });
  }

  let totalAttempts = 0, lastStatus = 0, lastRaw = "", lastModel = candidateModels[0], lastRetryAfterMs = 0;
  for (let modelIndex = 0; modelIndex < Math.min(candidateModels.length, 4); modelIndex++) {
    const activeModel = candidateModels[modelIndex]; lastModel = activeModel;
    let overloadAttempt = 0, rateLimitAttempt = 0;
    while (true) {
      totalAttempts += 1;
      let r, raw;
      try { r = await runOnce(activeModel); raw = await r.text(); }
      catch (networkErr) {
        lastStatus = 503; lastRaw = String(networkErr?.message || networkErr);
        if (overloadAttempt < 2) { await sleep(overloadDelayMs(overloadAttempt++)); continue; }
        break;
      }
      lastStatus = r.status; lastRaw = raw;
      if (r.ok) {
        let parsed; try { parsed = JSON.parse(raw); } catch { throw new Error("อ่านคำตอบ Gemini ไม่สำเร็จ"); }
        const text = parsed?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("") || "";
        try { return { data: JSON.parse(stripJsonFence(text)), model: activeModel, attempts: totalAttempts, fallbackUsed: activeModel !== (resolved.model || model) }; }
        catch { throw new Error(`Gemini ตอบกลับมาไม่ใช่ JSON ที่สมบูรณ์: ${text.slice(0, 3000)}`); }
      }
      if (r.status === 404) break;
      if (!TRANSIENT_GEMINI_STATUSES.has(r.status)) throw friendlyGeminiError(r.status, activeModel, raw, totalAttempts, 0);
      if (r.status === 429) {
        lastRetryAfterMs = rateLimitDelayMs(rateLimitAttempt, r.headers.get("retry-after"));
        if (modelIndex === 0 && rateLimitAttempt < 1) { await sleep(lastRetryAfterMs); rateLimitAttempt += 1; continue; }
        throw friendlyGeminiError(429, activeModel, raw, totalAttempts, lastRetryAfterMs);
      }
      if (overloadAttempt < (modelIndex === 0 ? 3 : 1)) { await sleep(overloadDelayMs(overloadAttempt++, r.headers.get("retry-after"))); continue; }
      break;
    }
  }
  throw friendlyGeminiError(lastStatus, lastModel, lastRaw, totalAttempts, lastRetryAfterMs);
}

function presenterText(gender) {
  if (gender === "female") return "adult female presenter/model";
  if (gender === "male") return "adult male presenter/model";
  if (gender === "neutral") return "adult gender-neutral presenter/model";
  return "adult presenter/model; do not emphasize gender";
}

function angleText(angle) {
  return {
    trust: "Trust-first: observational, authentic, low-hype, buyer-confidence focused.",
    conversion: "Conversion-first: strong scroll-stopping opening, efficient proof, concise CTA, no unsupported claims.",
    aesthetic: "Aesthetic-first: elegant fashion rhythm, premium composition, minimal wording, product-led visuals.",
    detail: "Detail-first: construction, shape, structure, closures, prints, trims and physical proof.",
  }[angle] || "Trust-first";
}

function slotKeyToRefName(key) {
  return `product_${key}`;
}

function categoryGuidelines(profile = {}) {
  const family = profile.family || "generic";
  if (family === "garment") {
    return `
CATEGORY FAMILY: GARMENT (shirt / pants / dress / clothing)
SPECIAL FIDELITY RULES
- FRONT and BACK are semantically different and must never be swapped.
- A model facing camera must show the garment FRONT on chest/front torso.
- To show garment BACK while worn, the model must physically turn away so the back faces camera.
- On tabletop, showing the back requires a real physical flip/rotation by the hands.
- Preserve front/back specific print/logo placement, neckline, collar, placket, seams, pockets, hem and silhouette.
- For try-on, preserve how the garment hangs on the body and keep left/right orientation natural.
- If the item is pants or dress, apply the same semantic rule: the front waist/front body corresponds to FRONT reference, rear body corresponds to BACK reference.
SHOT INTENT
- Table scene should show pickup, laydown, fold, flip, tactile detail.
- Room scene should show correct wear orientation, movement, pose, and a controlled turn only if back needs to be shown.
`.trim();
  }
  if (family === "footwear") {
    return `
CATEGORY FAMILY: FOOTWEAR
SPECIAL FIDELITY RULES
- Do not force a fake FRONT/BACK mapping like clothing. Instead preserve product views: pair overview, side profile, top/opening, outsole/sole, close-up detail.
- Keep left/right shoe consistent. Do not accidentally duplicate one shoe into both feet unless the product is visually symmetrical and the pair reference supports it.
- Toe direction, heel shape, sole pattern, laces/straps, logo placement and stitching must remain consistent.
- Outsole or bottom view should only appear when the shoe is lifted, tilted, flipped, or explicitly shown from below.
- Top/opening details should appear only from a believable top angle.
- When worn, the shoe should remain faithful to side profile, toe box, sole thickness, and color blocking.
SHOT INTENT
- Table scene: pair hero, side profile, close-up detail, outsole/top view proof.
- Room scene: on-foot try-on, walking, side step, heel-to-toe movement, close-up on feet only.
`.trim();
  }
  if (family === "bag") {
    return `
CATEGORY FAMILY: BAG
SPECIAL FIDELITY RULES
- Do not force a fake FRONT/BACK mapping like clothing. Preserve product views: main exterior, alternate exterior/side/back, interior open, closure/hardware detail.
- The interior must only appear when the bag is physically opened.
- Do not invent pockets, compartments, zipper heads, lining colors, strap adjustments, buckles, studs, logo plaques or handle shapes.
- Preserve strap length, handle shape, flap/zipper orientation, silhouette, bottom structure and hardware color.
- If showing alternate exterior or side/back, the bag must be rotated physically, not magically texture-swapped.
SHOT INTENT
- Table scene: closed exterior hero, open/close demonstration, interior proof, hardware/detail.
- Room scene: carried on shoulder/hand/body, movement while wearing/carrying, scale and strap behavior.
`.trim();
  }
  if (family === "jewelry") {
    return `
CATEGORY FAMILY: JEWELRY
SPECIAL FIDELITY RULES
- Do not force a fake FRONT/BACK mapping like clothing. Preserve product views: overview/hero, alternate angle, clasp/underside, macro detail.
- Preserve metal tone, finish, stone count, stone color, shape, setting, chain thickness, links, pendant form, clasp type and surface texture.
- Do not invent engravings, gemstones, extra charms, missing clasps or altered symmetry.
- The clasp/back/underside should appear only when the hand/body angle makes it visible.
- Keep scale believable on the body (neck/wrist/hand/ear depending item type) without showing the face.
SHOT INTENT
- Table scene: hero sparkle shot, macro detail, clasp/underside proof.
- Room scene: worn close-up, small movement, gesture, styling shot, no face.
`.trim();
  }
  return `
CATEGORY FAMILY: GENERIC FASHION ACCESSORY
SPECIAL FIDELITY RULES
- Treat each reference slot according to its declared role and do not invent missing views.
- Preserve colors, shape, visible construction, logo placement, closures, surface texture and distinctive details.
- If a different side or inner part is not shown in references, mark unknown rather than inventing it.
SHOT INTENT
- Table scene: hero, detail, manipulation if physically possible.
- Room scene: realistic usage/wear/carry/movement, no face.
`.trim();
}

function clipBlueprint(profile = {}, count = 4) {
  const family = profile.family || "generic";
  const keys = new Set((profile.slots || []).map(s => s.key));
  if (family === "garment") {
    if (count <= 3) return [
      "Clip 1: Scene A tabletop hook using front reference clearly",
      "Clip 2: Scene B correct front-facing try-on",
      "Clip 3: Scene B movement/turn; reveal back only if back reference exists and presenter physically turns away"
    ];
    if (count === 4) return [
      "Clip 1: Scene A tabletop hook showing the main/front side",
      "Clip 2: Scene A detail or physical flip to back depending available references",
      "Clip 3: Scene B correct front-facing try-on with no face",
      "Clip 4: Scene B movement / pose / controlled turn / CTA"
    ];
    return [
      "Clip 1: Scene A tabletop hook",
      "Clip 2: Scene A detailed proof of identity / front-back distinction",
      "Clip 3: Scene B front-facing try-on",
      "Clip 4: Scene B controlled side-to-back turn if needed",
      "Clip 5: Scene B polished CTA while preserving all identity details"
    ];
  }
  if (family === "footwear") {
    if (count <= 3) return [
      "Clip 1: Scene A pair overview or side profile hook",
      "Clip 2: Scene B on-foot try-on and walk start",
      "Clip 3: Scene B movement/step/close-up CTA"
    ];
    if (count === 4) return [
      "Clip 1: Scene A pair overview hook",
      "Clip 2: Scene A detail proof such as side/top/sole depending references",
      "Clip 3: Scene B on-foot try-on and standing look",
      "Clip 4: Scene B walk / side step / CTA"
    ];
    return [
      "Clip 1: Scene A hero pair overview",
      "Clip 2: Scene A detail proof (side/top/sole)",
      "Clip 3: Scene B first on-foot view",
      "Clip 4: Scene B dynamic walking / movement",
      "Clip 5: Scene B refined close-up CTA"
    ];
  }
  if (family === "bag") {
    if (count <= 3) return [
      "Clip 1: Scene A exterior hero hook",
      "Clip 2: Scene A open/close or interior proof",
      "Clip 3: Scene B carried/worn movement CTA"
    ];
    if (count === 4) return [
      "Clip 1: Scene A exterior hero hook",
      "Clip 2: Scene A interior or hardware/detail proof",
      "Clip 3: Scene B carried/worn on body",
      "Clip 4: Scene B movement / strap behavior / CTA"
    ];
    return [
      "Clip 1: Scene A exterior hero",
      "Clip 2: Scene A opening/interior proof",
      "Clip 3: Scene A detail/hardware proof",
      "Clip 4: Scene B carrying/wearing movement",
      "Clip 5: Scene B polished CTA"
    ];
  }
  if (family === "jewelry") {
    if (count <= 3) return [
      "Clip 1: Scene A overview or macro hook",
      "Clip 2: Scene B worn close-up",
      "Clip 3: Scene B movement/gesture CTA"
    ];
    if (count === 4) return [
      "Clip 1: Scene A overview hook",
      "Clip 2: Scene A macro detail or clasp/underside proof",
      "Clip 3: Scene B worn close-up",
      "Clip 4: Scene B small gesture / sparkle CTA"
    ];
    return [
      "Clip 1: Scene A overview hook",
      "Clip 2: Scene A macro detail",
      "Clip 3: Scene A clasp/underside proof if available",
      "Clip 4: Scene B worn close-up",
      "Clip 5: Scene B gesture / CTA"
    ];
  }
  return [
    "Clip 1: Scene A hero hook",
    "Clip 2: Scene A detail proof",
    "Clip 3: Scene B real usage / try-on",
    "Clip 4: Scene B movement / CTA"
  ].slice(0, count);
}

function requiredSlots(profile = {}) {
  return (profile.slots || []).filter(s => s.required).map(s => s.key);
}

function providedSlots(productRefs = {}) {
  return Object.entries(productRefs)
    .filter(([,v]) => v && v.dataUrl)
    .map(([k]) => k);
}

function buildProductParts(profile = {}, productRefs = {}) {
  const parts = [];
  for (const slot of (profile.slots || [])) {
    const ref = productRefs?.[slot.key];
    const note = ref?.note ? `User note: ${ref.note}` : "User note: (none)";
    if (ref?.unavailable === true && !ref?.dataUrl) {
      parts.push({ text: `PRODUCT REFERENCE SLOT ${slot.key.toUpperCase()} — ${slot.labelEn}: USER CONFIRMED NO IMAGE AVAILABLE. ${note}. Treat details unique to this view/state as UNKNOWN. Do not invent, mirror, reconstruct, or require this unsupported view in later clips.` });
      continue;
    }
    const inline = dataUrlToInlineData(ref?.dataUrl);
    if (!inline) continue;
    parts.push({ text: `PRODUCT REFERENCE SLOT ${slot.key.toUpperCase()} — ${slot.labelEn}. Role meaning: ${slot.helpEn}. ${note}` }, { inlineData: inline });
  }
  return parts;
}

function manifestLabelMap(profile = {}, manifest = {}) {
  const out = {};
  for (const slot of (profile.slots || [])) {
    out[slotKeyToRefName(slot.key)] = manifest[slotKeyToRefName(slot.key)] || slot.labelTh;
  }
  out.scene_table = manifest.scene_table || "Scene A โต๊ะรีวิว";
  out.scene_room = manifest.scene_room || "Scene B ห้องรีวิว";
  return out;
}

function refAvailability(ref) {
  if (ref?.dataUrl) return "image";
  if (ref?.unavailable === true) return "unavailable";
  return "missing";
}

function computeReferenceCoverage(profile = {}, productRefs = {}) {
  const slots = profile.slots || [];
  const groups = {
    required: slots.filter(s => s.priority === "required" || s.required),
    recommended: slots.filter(s => !s.required && s.priority === "recommended"),
    optional: slots.filter(s => !s.required && s.priority === "optional"),
  };
  const weights = { required: 60, recommended: 30, optional: 10 };
  const active = Object.entries(groups).reduce((sum,[k,v]) => sum + (v.length ? weights[k] : 0), 0) || 100;
  let score = 0; const breakdown = {};
  for (const [name, group] of Object.entries(groups)) {
    if (!group.length) continue;
    const per = (weights[name] * (100 / active)) / group.length;
    let imageCount=0, unavailableCount=0, missingCount=0;
    for (const slot of group) {
      const st = refAvailability(productRefs?.[slot.key]);
      if (st === "image") { score += per; imageCount += 1; }
      else if (st === "unavailable") unavailableCount += 1;
      else missingCount += 1;
    }
    breakdown[name] = { total: group.length, imageCount, unavailableCount, missingCount };
  }
  const unresolved = groups.required.filter(s => refAvailability(productRefs?.[s.key]) === "missing");
  const unavailable = slots.filter(s => refAvailability(productRefs?.[s.key]) === "unavailable");
  return { score: Math.round(Math.max(0, Math.min(100, score))), workflowReady: unresolved.length === 0, breakdown, unresolvedRequired: unresolved.map(s=>s.labelTh), unavailableRoles: unavailable.map(s=>s.labelTh), uploadedCount: slots.filter(s=>refAvailability(productRefs?.[s.key]) === "image").length, totalSlots: slots.length };
}

async function analyzeProduct(req, res) {
  if (!GEMINI_API_KEY) return sendJson(res, 500, { error: "ยังไม่ได้ตั้ง GEMINI_API_KEY ใน .env" });

  const body = await readBody(req);
  const {
    productName = "",
    category = "แฟชั่น/เครื่องแต่งกาย",
    categoryProfile = {},
    facts = "",
    audience = "",
    tone = "จริงใจ กระชับ ดูเป็นธรรมชาติ",
    angle = "trust",
    presenterGender = "female",
    geminiModel = GEMINI_MODEL_DEFAULT,
    productRefs = {},
    sceneRefs = {},
  } = body;

  const coverage = computeReferenceCoverage(categoryProfile, productRefs);
  if (!coverage.workflowReady) {
    return sendJson(res, 400, { error: `ช่องภาพจำเป็นยังไม่ได้จัดการ: ${coverage.unresolvedRequired.join(", ")} — กรุณาอัปโหลดรูป หรือเลือก “ไม่มีภาพนี้”` });
  }

  const sceneTable = await sceneInline(sceneRefs?.table?.dataUrl, "table");
  const sceneRoom = await sceneInline(sceneRefs?.room?.dataUrl, "room");
  const roleSummary = (categoryProfile.slots || []).map(s => {
    const have = refAvailability(productRefs?.[s.key]);
    const note = productRefs?.[s.key]?.note || "(none)";
    return `- ${s.key} | ${s.labelEn} | required=${Boolean(s.required)} | status=${have} | note=${note}`;
  }).join("\n");

  const prompt = `
You are Stage 1 of a specialized affiliate-product video production system.
DO NOT create final video prompts yet.
Your task is to extract a precise PRODUCT IDENTITY SPEC, a CATEGORY-AWARE REFERENCE ROLE MAP, stable SCENE CONTINUITY anchors, and a HOOK LAB.

USER DATA
Product: ${productName || "(not specified)"}
Category: ${category}
Category family: ${categoryProfile.family || "generic"}
Verified facts only:
${facts || "(none)"}
Audience: ${audience || "general shoppers"}
Tone: ${tone}
Creative angle: ${angleText(angle)}
Presenter: ${presenterText(presenterGender)}

REFERENCE SLOT DECLARATIONS
${roleSummary}

REFERENCE AVAILABILITY POLICY
- status=image: supplied and analyzable.
- status=unavailable: user explicitly has no image. Never invent, mirror, reconstruct, or plan a shot that depends on this view/state.
- status=missing: no decision supplied. Do not pretend it exists.

${categoryGuidelines(categoryProfile)}

GLOBAL FIDELITY RULES
- Every uploaded reference slot has a semantic role. Respect it strictly.
- Build a physical PRODUCT STATE MAP so later clips transition between believable states rather than regenerating unrelated versions.
- State transitions must be physically possible: flip/turn/open/close/lift/wear/carry through real motion, never texture swapping.
- If a required state/view has no supporting reference, mark it unsupported and avoid inventing it later.
- Preserve exact visible colors, color blocking, pattern scale, pattern placement, logo/text location, silhouette, structure, closures, hardware, interior details, outsole details, or clasp details depending on category.
- If a detail is not visible enough, mark it UNKNOWN rather than inventing it.
- Do not invent material, comfort, price, stretch, durability, performance or promotions unless verified above.
- No face when later showing a body.
- Scene A is the supplied tabletop image.
- Scene B is the supplied room image.
- Extract stable visual anchors that should stay constant across all generated clips.

HOOK LAB RULE
Create 4 meaningfully different Thai hooks, not minor rewrites.
Hooks must be factual/observational, short-video friendly, and usable BEFORE final prompt generation.
Do not generate clip prompts yet.

Return VALID JSON ONLY:
{
  "productTruth": {
    "visualObservations": ["string"],
    "verifiedClaims": ["string"],
    "blockedClaims": ["string"],
    "unknowns": ["string"]
  },
  "productFingerprint": {
    "identityCore": ["string"],
    "colorAndFinish": ["string"],
    "shapeAndSilhouette": ["string"],
    "logosPrintsPatterns": ["string"],
    "visibleConstruction": ["string"],
    "closuresHardware": ["string"],
    "interiorUndersideOrSecondaryArea": ["string"],
    "materialsTextureVisibleOnly": ["string"],
    "scaleAndProportion": ["string"],
    "distinctiveDetails": ["string"],
    "doNotChange": ["string"]
  },
  "referenceRoleMap": {
    "mode": "front_back|multi_view",
    "roles": [
      {
        "key": "string",
        "label_th": "string",
        "label_en": "string",
        "observedAnchors": ["string"],
        "usageRule_th": "string",
        "whenNeeded_th": "string",
        "confidence": 0
      }
    ],
    "globalRules": ["string"],
    "categorySpecificWarnings_th": ["string"]
  },
  "stateMap": {
    "states": [
      {"id":"string","label_th":"string","description_th":"string","bestReferenceKeys":["string"]}
    ],
    "validTransitions": [
      {"from":"string","to":"string","rule_th":"string"}
    ],
    "forbiddenTransitions": ["string"]
  },
  "presenterSpec": {
    "genderInstruction_en": "string",
    "bodyFramingRule_en": "string",
    "wearUsageRule_en": "string"
  },
  "sceneBible": {
    "sceneAAnchors": ["string"],
    "sceneBAnchors": ["string"],
    "sharedLighting": ["string"],
    "continuityRules": ["string"]
  },
  "hookVariants": [
    {"id":"A","hook_th":"string","strategy_th":"string"},
    {"id":"B","hook_th":"string","strategy_th":"string"},
    {"id":"C","hook_th":"string","strategy_th":"string"},
    {"id":"D","hook_th":"string","strategy_th":"string"}
  ],
  "readiness": {
    "score": 0,
    "warnings_th": ["string"],
    "recommendedExtraReferences_th": ["string"]
  },
  "continuityDirectorNotes_th": ["string"]
}
`.trim();

  try {
    const result = await callGemini({
      model: geminiModel,
      maxOutputTokens: 11000,
      parts: [
        { text: prompt },
        ...buildProductParts(categoryProfile, productRefs),
        { text: "SCENE A / TABLE REFERENCE — use as the exact visual environment reference for table clips." },
        { inlineData: sceneTable },
        { text: "SCENE B / ROOM REFERENCE — use as the exact visual environment reference for room / on-body / movement clips." },
        { inlineData: sceneRoom },
      ],
    });
    const aiReadiness = result.data?.readiness || {};
    result.data.readiness = { ...aiReadiness, aiAssessmentScore: aiReadiness.score ?? null, score: coverage.score, workflowReady: coverage.workflowReady, coverageBreakdown: coverage.breakdown, uploadedCount: coverage.uploadedCount, totalSlots: coverage.totalSlots, unavailableRoles: coverage.unavailableRoles, scoringMethod: "deterministic_reference_coverage_v1" };
    return sendJson(res, 200, { analysis: result.data, geminiModel: result.model, attempts: result.attempts, fallbackUsed: result.fallbackUsed });
  } catch (err) {
    return sendJson(res, Number(err.statusCode) || 502, { error: String(err.message || err), code: err.code || null, retryAfterSec: err.retryAfterSec || 0 });
  }
}

async function buildProject(req, res) {
  if (!GEMINI_API_KEY) return sendJson(res, 500, { error: "ยังไม่ได้ตั้ง GEMINI_API_KEY ใน .env" });

  const body = await readBody(req);
  const {
    analysis,
    selectedHook,
    productName = "",
    category = "",
    categoryProfile = {},
    facts = "",
    audience = "",
    tone = "",
    angle = "trust",
    presenterGender = "female",
    clipCount = 4,
    smartQa = true,
    geminiModel = GEMINI_MODEL_DEFAULT,
    transitionPrefs = {},
    referenceManifest = {},
    productRefs = {},
  } = body;

  if (!analysis || !selectedHook?.hook_th) {
    return sendJson(res, 400, { error: "ต้องวิเคราะห์สินค้าและเลือก Hook ก่อนสร้าง Production Prompts" });
  }

  const count = Math.max(3, Math.min(5, Number(clipCount) || 4));
  const flowPlan = clipBlueprint(categoryProfile, count);
  const profileSlots = (categoryProfile.slots || []).map(s => ({
    key: s.key,
    refName: slotKeyToRefName(s.key),
    labelTh: s.labelTh,
    labelEn: s.labelEn,
    required: Boolean(s.required),
    supplied: Boolean(productRefs?.[s.key]?.dataUrl),
    unavailable: Boolean(productRefs?.[s.key]?.unavailable),
    helpEn: s.helpEn,
  }));

  const prompt = `
You are Stage 2: Production Prompt Compiler for a specialized affiliate-product video system.

The user ALREADY selected the hook. Build the final production package around EXACTLY this hook:
SELECTED HOOK: "${selectedHook.hook_th}"
Hook strategy: ${selectedHook.strategy_th || ""}

PRODUCT
Name: ${productName}
Category: ${category}
Category family: ${categoryProfile.family || "generic"}
Verified facts: ${facts || "(none)"}
Audience: ${audience || "general shoppers"}
Tone: ${tone}
Creative angle: ${angleText(angle)}
Presenter: ${presenterText(presenterGender)}
Clip count: ${count}
Each clip: 8 seconds
Orientation: 9:16

ANALYSIS / LOCKED SPEC
${JSON.stringify(analysis)}

REFERENCE MANIFEST
${JSON.stringify(referenceManifest)}

DECLARED PRODUCT REFERENCE SLOTS
${JSON.stringify(profileSlots)}

REQUIRED CLIP FLOW
${flowPlan.map((x, i) => `${i+1}. ${x}`).join("\n")}

USER TRANSITION PREFERENCES
${buildTransitionPrefsSummary(transitionPrefs, count)}

TRANSITION / CONTINUITY RULES
- Design continuity so clip 2 onward is built in TWO layers:
  A) PLANNED CONTINUITY before the previous clip is generated, using continuityLedger + target scene/product state;
  B) FORENSIC CONTINUITY after the previous clip exists, where the user uploads the ACTUAL final frame and the app analyzes that frame in detail before rewriting the next prompt.
- For every clip after BC_01, write a detailed plannedContinuityFromPrevious_en describing the expected previous ending state, target opening state, product orientation, hand/body position, framing, scene relationship, and transition intent.
- For each boundary BC_01->BC_02, BC_02->BC_03, and so on, define the preferred transition behavior.
- If transition type is zoom_counter and a previous clip ends with zoom-in, recommend the next clip open with a gentle zoom-out; if previous ends with zoom-out, recommend a gentle zoom-in.
- Do not force zooming in every boundary. Prefer stable openings when zoom is unnecessary.
- Transition variety is good, but keep it tasteful and not dizzying.
- If the scene changes (for example table -> room), preserve PRODUCT position/orientation/scale and presenter action rhythm across the cut, but DO NOT copy the old background into the new scene. The target scene reference remains authoritative.
- If the scene stays the same, preserve as much of the full frame composition as practical: product, hands/body, props, camera distance, lighting and background anchors.
- The actual previous ending frame, when supplied later, overrides the planned estimate for the opening continuity description.

${categoryGuidelines(categoryProfile)}

ABSOLUTE FIDELITY RULES
- Respect the semantic role of every reference slot. Never substitute one slot for another.
- Preserve the full productFingerprint in EVERY clip prompt, even if repetitive.
- Re-state the role-based reference rules in EVERY clip prompt.
- Re-state the relevant scene anchors in EVERY clip prompt.
- Never "simplify" a logo, print or color layout. If text/logo cannot be guaranteed, instruct the video model to preserve the reference exactly rather than rewrite it.
- No face. Crop head fully out or frame body parts only; adult presenter only.
- Natural hands/anatomy. No extra fingers, warped structure, flicker, mirrored logos, color drift, texture-swapping.

REFERENCE ATTACHMENT RULES FOR GOOGLE FLOW
- Explicitly list which product reference slots are required for every clip.
- Clips must always include the product reference slots that are essential to understand the visible side/view/detail in that clip.
- Scene A clips require scene_table.
- Scene B clips require scene_room.
- If a clip depends on a missing slot, either avoid that shot or explicitly state that the shot must stay conservative and not invent hidden details.

CONTINUITY LEDGER
Before writing clips, define a continuity ledger carrying forward:
- product physical state and orientation
- exact visible view/side
- hand/body interaction
- camera distance/angle
- scene placement and important props
- details that must survive into the next clip

CLIP DETAIL REQUIREMENTS
Each clip must include:
- purpose/job
- exact visible side/view/state at every beat
- actor orientation or usage orientation at every beat
- camera framing and motion
- second-by-second 0-2s / 2-5s / 5-8s plan
- starting continuity state
- ending continuity state
- bridge to next clip
- required references checklist
- Flow-ready self-contained English prompt
- negative prompt
- Thai voiceover <= 8 seconds
- on-screen text
- recommended Flow class: lite/fast/quality
- QA checkpoints

MASTER FLOW AGENT PACK
Also write one highly detailed English master prompt for Google Flow Agent.
It must instruct the Agent to:
1. use the uploaded product references and scene A/B references as project Ingredients;
2. treat each product reference according to its semantic role exactly;
3. generate ${count} SEPARATE 9:16 video clips, each 8 seconds, named BC_01 ... BC_${String(count).padStart(2,"0")};
4. follow the exact clip order below;
5. keep the same product identity, same presenter gender instruction, same scene world and lighting;
6. create each clip as a separate asset, not as alternate variations of one shot;
7. preserve continuity between the ending state of one clip and starting state of the next;
8. do not spend credits on extra variations unless the user asks;
9. stop and ask for a missing reference if a required reference is unavailable rather than inventing product details.

Return VALID JSON ONLY:
{
  "selectedHook": {"id":"string","hook_th":"string","strategy_th":"string"},
  "productionBible": {
    "productIdentityLock_en": "very detailed string",
    "referenceRoleLock_en": "very detailed string",
    "stateTransitionLock_en": "very detailed string",
    "presenterLock_en": "string",
    "sceneContinuityLock_en": "string",
    "globalNegative_en": "string"
  },
  "continuityLedger": [
    {
      "assetName":"BC_01",
      "scene":"table|room",
      "startProductState_th":"string",
      "endProductState_th":"string",
      "presenterState_th":"string",
      "cameraState_th":"string",
      "carryForwardDetails":["string"]
    }
  ],
  "transitionPlan": [
    {
      "fromAsset":"BC_01",
      "toAsset":"BC_02",
      "transitionType":"auto_smart|match_cut|hold_reveal|cut_on_action|zoom_counter|object_follow|clean_cut",
      "transitionLabel_th":"string",
      "bridgeRule_th":"string",
      "attachPreviousEndFrame": true,
      "openingRule_th":"string"
    }
  ],
  "clips": [
    {
      "id": 1,
      "assetName": "BC_01",
      "title_th": "string",
      "scene": "table|room",
      "stage": "hook|detail|tryon|movement|cta",
      "seconds": 8,
      "flowModel": "lite|fast|quality",
      "job_th": "string",
      "visibleView": "string",
      "productState_th": "string",
      "presenterOrientation_th": "string",
      "camera_th": "string",
      "timeline": [
        {"time":"0-2s","action_th":"string","camera_th":"string","productView":"string","continuityInvariant":"string"},
        {"time":"2-5s","action_th":"string","camera_th":"string","productView":"string","continuityInvariant":"string"},
        {"time":"5-8s","action_th":"string","camera_th":"string","productView":"string","continuityInvariant":"string"}
      ],
      "startState_th": "string",
      "endState_th": "string",
      "transitionFromPrevious_th": "string",
      "openingContinuityRule_th": "string",
      "plannedContinuityFromPrevious_en": "very detailed string; empty only for BC_01",
      "previousEndFrameRequirement_th": "string; empty only for BC_01",
      "nextClipBridge_th": "string",
      "requiredReferences": ["scene_table","scene_room","product_slot_name"],
      "referenceInstructions_th": ["string"],
      "fidelityChecks": ["string"],
      "voiceover_th": "string",
      "onscreen_text_th": "string",
      "flowPrompt_en": "VERY detailed self-contained prompt repeating product identity, reference role rules, presenter, scene, timeline, camera, continuity, fidelity and no-face requirements",
      "negativePrompt_en": "string",
      "continuityChecks": ["string"]
    }
  ],
  "masterFlowAgentPrompt_en": "very detailed one-shot Google Flow Agent production instruction",
  "scenebuilderOrder": ["BC_01","BC_02"],
  "caption_th": "string",
  "hashtags": ["string"],
  "directorNotes_th": ["string"]
}
`.trim();

  try {
    const generated = await callGemini({
      model: geminiModel,
      maxOutputTokens: 15000,
      parts: [{ text: prompt }],
    });

    let project = generated.data;

    if (smartQa) {
      const qaPrompt = `
You are the final Continuity & Product Fidelity QA gate.
Audit the following production JSON. Repair only errors; return the complete corrected project JSON in exactly the same schema.

Mandatory checks:
- selected hook is used consistently.
- product reference roles are respected (front/back for garments, multi-view rules for non-garments).
- no category-specific impossible view appears without a supporting reference or believable camera/body/hand action.
- all visible color/print/logo/pattern locations remain locked to the productFingerprint.
- every clip repeats enough identity/reference information to stand alone in Google Flow.
- relevant scene reference is required in each clip.
- same presenter gender/body framing across clips.
- no face.
- stateMap transitions are physically respected.
- start/end state continuity across clip boundaries and continuityLedger agree.
- transitionPlan agrees with clip boundaries and avoids overusing zooms.
- every clip after BC_01 contains a detailed plannedContinuityFromPrevious_en and previousEndFrameRequirement_th.
- when scenes change, continuity preserves product/pose/composition logic without carrying the old background into the new scene.
- shoe left/right pair, bag open/closed state, jewelry piece count/placement, and garment front/back rules are correct for their category.
- masterFlowAgentPrompt_en contains every clip and tells Agent to make separate assets BC_01... in order.

If something is uncertain, make the prompt more conservative, not more imaginative.

PROJECT:
${JSON.stringify(project)}

LOCKED ANALYSIS:
${JSON.stringify(analysis)}
`.trim();

      try {
        const qa = await callGemini({
          model: geminiModel,
          maxOutputTokens: 16000,
          parts: [{ text: qaPrompt }],
        });
        project = qa.data;
        project.qaApplied = true;
      } catch (qaErr) {
        project.qaApplied = false;
        project.qaWarning = String(qaErr.message || qaErr);
      }
    }

    return sendJson(res, 200, { project, geminiModel: generated.model });
  } catch (err) {
    return sendJson(res, Number(err.statusCode) || 502, { error: String(err.message || err), code: err.code || null, retryAfterSec: err.retryAfterSec || 0 });
  }
}

async function reviseClip(req, res) {
  if (!GEMINI_API_KEY) return sendJson(res, 500, { error: "ยังไม่ได้ตั้ง GEMINI_API_KEY ใน .env" });

  const body = await readBody(req);
  const { analysis, project, clipId, instruction = "", geminiModel = GEMINI_MODEL_DEFAULT } = body;
  if (!analysis || !project || !clipId || !instruction.trim()) {
    return sendJson(res, 400, { error: "ข้อมูลแก้ไขไม่ครบ" });
  }

  const target = (project.clips || []).find(c => Number(c.id) === Number(clipId));
  if (!target) return sendJson(res, 404, { error: "ไม่พบ clip" });

  const prompt = `
Revise ONLY the target affiliate-video clip.
Preserve ALL locked product details, selected hook strategy, referenceRoleMap, presenter gender, scene continuity, no-face rule, required references and neighboring clip boundary states.

USER REVISION:
${instruction}

LOCKED PRODUCT ANALYSIS:
${JSON.stringify(analysis)}

PRODUCTION BIBLE:
${JSON.stringify(project.productionBible)}

PREVIOUS CLIP:
${JSON.stringify((project.clips || []).find(c => Number(c.id) === Number(clipId)-1) || null)}

TARGET CLIP:
${JSON.stringify(target)}

NEXT CLIP:
${JSON.stringify((project.clips || []).find(c => Number(c.id) === Number(clipId)+1) || null)}

Return VALID JSON ONLY:
{"clip": <complete revised clip object in the exact same schema as TARGET CLIP>}
`.trim();

  try {
    const revised = await callGemini({
      model: geminiModel,
      maxOutputTokens: 8000,
      parts: [{ text: prompt }],
    });
    return sendJson(res, 200, { clip: revised.data.clip });
  } catch (err) {
    return sendJson(res, Number(err.statusCode) || 502, { error: String(err.message || err), code: err.code || null, retryAfterSec: err.retryAfterSec || 0 });
  }
}


async function reinforceContinuity(req, res) {
  if (!GEMINI_API_KEY) return sendJson(res, 500, { error: "ยังไม่ได้ตั้ง GEMINI_API_KEY ใน .env" });

  const body = await readBody(req);
  const {
    analysis,
    project,
    clipId,
    previousEndFrameDataUrl,
    previousEndFrameFileName = "previous-end-frame.png",
    previousEndMove = "auto",
    transitionType = "auto_smart",
    motionPolicy = "minimal",
    geminiModel = GEMINI_MODEL_DEFAULT,
  } = body;

  if (!analysis || !project || !clipId || !previousEndFrameDataUrl) {
    return sendJson(res, 400, { error: "ข้อมูลสำหรับเสริม continuity ไม่ครบ" });
  }

  const target = (project.clips || []).find(c => Number(c.id) === Number(clipId));
  const prev = (project.clips || []).find(c => Number(c.id) === Number(clipId) - 1);
  if (!target || !prev) return sendJson(res, 404, { error: "ไม่พบคลิปเป้าหมายหรือคลิปก่อนหน้า" });

  const inline = dataUrlToInlineData(previousEndFrameDataUrl);
  if (!inline) return sendJson(res, 400, { error: "ภาพฉากสุดท้ายไม่ถูกต้อง" });

  const sceneChanged = prev.scene !== target.scene;

  // PASS 1 — End-frame forensics. The still image is analyzed as a production state,
  // not merely attached as an unnamed reference.
  const forensicPrompt = `
You are END-FRAME FORENSICS for a high-fidelity multi-clip affiliate video system.
Analyze the ACTUAL final-frame still from ${prev.assetName || `BC_${String(Number(clipId)-1).padStart(2,"0")}`} with extreme visual precision.
This analysis will be converted into the opening instructions for ${target.assetName || `BC_${String(clipId).padStart(2,"0")}`}.

IMPORTANT GROUNDING RULES
- Describe ONLY what is visibly supported by the attached frame plus the locked project context.
- Do not invent hidden product details.
- A single still image cannot reliably prove zoom/pan direction. Treat the USER-REPORTED ending move "${previousEndMove}" as authoritative for motion direction; visual motion cues from the still are only secondary evidence.
- Product identity from LOCKED ANALYSIS remains authoritative if the frame is blurry/compressed.
- Quantify screen placement approximately when useful, using percentages of the 9:16 frame. Mark estimates as approximate.
- Pay special attention to product orientation/view/state, logo/print placement, hand contact, presenter pose, camera framing, lighting, scene anchors, occlusions and depth.

PROJECT CONTEXT
Previous clip:
${JSON.stringify(prev)}

Next target clip:
${JSON.stringify(target)}

Locked product/scene analysis:
${JSON.stringify(analysis)}

USER TRANSITION REQUEST
- selected transition: ${transitionType} (${transitionTypeLabel(transitionType)})
- motion policy: ${motionPolicy}
- user-reported previous ending move: ${previousEndMove}
- scene changes between clips: ${sceneChanged}

SCENE-CHANGE LOGIC
${sceneChanged
  ? `The next clip uses a DIFFERENT scene. Analyze the previous frame fully, but for the next opening carry across PRODUCT screen position, orientation, scale, hand/body pose/rhythm and visual direction. Do NOT carry the old background/furniture into the new scene. The target scene reference is authoritative.`
  : `The next clip stays in the SAME scene. Carry across the full composition as far as practical: product, hands/body, props, camera distance/angle, lighting, background anchors and spatial relationships.`}

Return VALID JSON ONLY:
{
  "frameSnapshot": {
    "frameSummary_th": "long Thai summary of exactly what the final frame looks like",
    "flowContinuityDescription_en": "VERY detailed English description written so a video model can reconstruct the opening visual state without relying on the phrase 'use previous frame'. Include scene, composition, product, presenter/hands, lighting, focus, depth and relative positions.",
    "scene": {
      "detectedScene_th": "string",
      "backgroundAnchors": ["string"],
      "foregroundAnchors": ["string"],
      "spatialRelationships": ["string"]
    },
    "composition": {
      "shotSize": "string",
      "cameraAngle": "string",
      "cameraHeightImpression": "string",
      "cameraDistanceImpression": "string",
      "perspectiveAndLensImpression": "string",
      "horizonAndFrameBalance": "string",
      "mainSubjectScreenPlacement": "string",
      "productBBoxApproxPercent": {"x":0,"y":0,"width":0,"height":0},
      "negativeSpace": "string"
    },
    "productAtCut": {
      "visibleViewOrRole": "string",
      "physicalState": "string",
      "orientation": "string",
      "scaleInFrame": "string",
      "screenPosition": "string",
      "visibleIdentityDetails": ["string"],
      "occludedDetails": ["string"],
      "contactWithPresenterOrSurface": ["string"]
    },
    "presenterAtCut": {
      "visibleBodyParts": ["string"],
      "bodyOrientation": "string",
      "pose": "string",
      "leftHand": "string",
      "rightHand": "string",
      "handProductContact": ["string"],
      "cropAndNoFaceState": "string"
    },
    "lightingAndColor": {
      "lightDirection": "string",
      "lightTemperature": "string",
      "shadowCharacter": "string",
      "exposureContrast": "string",
      "dominantPalette": ["string"]
    },
    "depthFocusAndMotion": {
      "focusTarget": "string",
      "depthOfField": "string",
      "foregroundMidgroundBackground": "string",
      "motionBlurEvidence": "string",
      "userReportedEndMove": "${previousEndMove}",
      "motionInferenceWarning": "A still frame cannot reliably prove camera-motion direction; use userReportedEndMove as authoritative."
    },
    "continuityLocks": ["at least 10 concrete details that should match at the next clip opening"],
    "uncertainties": ["string"]
  },
  "transitionDecision": {
    "userSelectedTransition": "${transitionType}",
    "effectiveTransition": "auto_smart|match_cut|hold_reveal|cut_on_action|zoom_counter|object_follow|clean_cut",
    "sceneChanged": ${sceneChanged},
    "openingMatchScope": "full_frame|product_pose_composition_only",
    "reason_th": "string",
    "openingHoldSeconds": 0.0,
    "openingCameraRule_en": "string",
    "motionRule_en": "string",
    "firstActionBridge_en": "string",
    "avoid_th": ["string"]
  },
  "continuityPromptBlock_en": "EXTREMELY detailed production-ready English continuity block combining the forensic frame description, exact match instructions, scene-change handling, transition logic, motion comfort rules, and a clear instruction to attach the actual final-frame still as an additional reference. It must stand alone and be suitable to paste directly before the next clip prompt."
}
`.trim();

  try {
    const forensic = await callGemini({
      model: geminiModel,
      maxOutputTokens: 9000,
      parts: [
        { text: forensicPrompt },
        { text: `ACTUAL FINAL FRAME FROM PREVIOUS CLIP — ${previousEndFrameFileName}` },
        { inlineData: inline },
      ],
    });

    const frameSnapshot = forensic.data.frameSnapshot || {};
    const transitionDecision = forensic.data.transitionDecision || {};
    const continuityPromptBlock = forensic.data.continuityPromptBlock_en || frameSnapshot.flowContinuityDescription_en || "";

    // PASS 2 — Continuity compiler. It receives both the structured forensic description
    // and the actual image, then rewrites the next clip prompt in detail.
    const compilerPrompt = `
You are CONTINUITY PROMPT COMPILER for the next affiliate-video clip.
Revise ONLY the TARGET CLIP so it opens as a visually credible continuation of the ACTUAL previous ending frame.
Do not merely say "refer to the previous frame". The prompt itself must EXPLICITLY DESCRIBE that previous ending frame in detail.

LOCKED PRIORITIES, IN ORDER
1. exact product identity/fingerprint and correct semantic reference roles;
2. physically plausible product state/orientation;
3. continuity with the actual previous end frame;
4. scene fidelity;
5. presenter/hand/body continuity;
6. comfortable camera motion and selected transition style.

FORENSIC SNAPSHOT OF ACTUAL PREVIOUS END FRAME
${JSON.stringify(frameSnapshot)}

FORENSIC CONTINUITY BLOCK
${continuityPromptBlock}

TRANSITION DIRECTOR DECISION
${JSON.stringify(transitionDecision)}

PREVIOUS CLIP STRUCTURE
${JSON.stringify(prev)}

TARGET CLIP BEFORE REVISION
${JSON.stringify(target)}

PRODUCTION BIBLE
${JSON.stringify(project.productionBible || {})}

CONTINUITY LEDGER
${JSON.stringify(project.continuityLedger || [])}

MANDATORY REWRITE RULES
- Put a clearly labeled section near the beginning of flowPrompt_en named "PREVIOUS END-FRAME CONTINUITY ANCHOR".
- Inside that section, describe the previous final frame explicitly: scene/background or carried scene-independent elements, camera framing, product location/scale/orientation/state, visible product details, presenter/body/hand pose, contact points, lighting, focus/depth, and important spatial relationships.
- Tell the generator to attach the actual previous ending-frame image as an extra continuity reference, BUT the textual description must be detailed enough that it is still useful on its own.
- For the FIRST 0.5–1.5 seconds of the target clip, match the relevant previous-frame geometry before beginning the new action.
- If the scene is unchanged, match full-frame composition as closely as practical.
- If the scene changes, match product screen position/orientation/scale and pose/action rhythm while switching immediately to the TARGET scene background. Never morph old furniture/background into the new scene.
- Respect the selected/effective transition. If zoom_counter is used: zoom-in -> gentle zoom-out, zoom-out -> gentle zoom-in. If ending movement is static/unknown, do not manufacture a zoom just to create motion.
- Do not alternate zoom-in/zoom-out mechanically at every cut. Use stable framing when it serves continuity better.
- Avoid nausea-inducing motion, whip effects, rapid push-pulls and unnecessary camera oscillation.
- Keep all existing product fidelity and no-face constraints.
- Update timeline[0] so its first beat explicitly performs the continuity match before the next action.
- Update transitionFromPrevious_th, openingContinuityRule_th, plannedContinuityFromPrevious_en, previousEndFrameRequirement_th, nextClipBridge_th, continuityChecks, and flowPrompt_en.
- Add/replace these fields on the clip:
  previousEndFrameSummary_th,
  previousEndFrameDescription_en,
  continuityBridgeDetailed_th,
  openingMatchChecklist,
  continuityConfidence.

Return VALID JSON ONLY:
{
  "clip": <complete revised target clip object>,
  "transitionPlan": <fully updated transitionPlan array>
}
`.trim();

    const revised = await callGemini({
      model: geminiModel,
      maxOutputTokens: 12000,
      parts: [
        { text: compilerPrompt },
        { text: `ACTUAL PREVIOUS END FRAME — ${previousEndFrameFileName}. Validate the forensic snapshot against this image while compiling the next prompt.` },
        { inlineData: inline },
      ],
    });

    return sendJson(res, 200, {
      clip: revised.data.clip,
      transitionPlan: revised.data.transitionPlan || project.transitionPlan || [],
      frameSnapshot,
      transitionDecision,
      continuityPromptBlock_en: continuityPromptBlock,
      forensicModel: forensic.model,
      compilerModel: revised.model,
    });
  } catch (err) {
    return sendJson(res, Number(err.statusCode) || 502, { error: String(err.message || err), code: err.code || null, retryAfterSec: err.retryAfterSec || 0 });
  }
}

async function apiModels(req, res) {
  if (!GEMINI_API_KEY) return sendJson(res, 500, { error: "ยังไม่ได้ตั้ง GEMINI_API_KEY ใน .env" });
  try {
    const models = await listGeminiModels();
    const preferred = PREFERRED_MODELS.filter(id => models.some(m => m.id === id));
    return sendJson(res, 200, {
      models,
      preferred,
      defaultModel: preferred[0] || models[0]?.id || GEMINI_MODEL_DEFAULT,
    });
  } catch (err) {
    return sendJson(res, Number(err.statusCode) || 502, { error: String(err.message || err), code: err.code || null, retryAfterSec: err.retryAfterSec || 0 });
  }
}

async function serveStatic(req, res, url) {
  let rel = decodeURIComponent(url.pathname);
  if (rel === "/") rel = "/index.html";
  const abs = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!abs.startsWith(PUBLIC_DIR)) return sendJson(res, 403, { error: "Forbidden" });

  try {
    const info = await stat(abs);
    if (!info.isFile()) throw new Error("not file");
    res.writeHead(200, {
      "content-type": mime[path.extname(abs).toLowerCase()] || "application/octet-stream",
      "cache-control": "no-cache",
    });
    createReadStream(abs).pipe(res);
  } catch {
    sendJson(res, 404, { error: "Not found" });
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("access-control-allow-headers", "content-type");
  res.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  try {
    if (req.method === "GET" && url.pathname === "/api/models") return await apiModels(req, res);
    if (req.method === "POST" && url.pathname === "/api/analyze") return await analyzeProduct(req, res);
    if (req.method === "POST" && url.pathname === "/api/build-project") return await buildProject(req, res);
    if (req.method === "POST" && url.pathname === "/api/revise-clip") return await reviseClip(req, res);
    if (req.method === "POST" && url.pathname === "/api/reinforce-continuity") return await reinforceContinuity(req, res);
    if (req.method === "GET") return await serveStatic(req, res, url);
    return sendJson(res, 405, { error: "Method not allowed" });
  } catch (err) {
    console.error(err);
    return sendJson(res, 500, { error: String(err.message || err) });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`BasketClip Director v0.6.5: http://localhost:${PORT}`);
  console.log(`Gemini key: ${GEMINI_API_KEY ? "configured" : "NOT configured"}`);
  console.log(`Gemini default model: ${GEMINI_MODEL_DEFAULT}`);
});
