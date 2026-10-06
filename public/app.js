const $ = q => document.querySelector(q);
const $$ = q => [...document.querySelectorAll(q)];


const TRANSITION_OPTIONS = [
  { key:"auto_smart", label:"Auto Smart · ให้ระบบเลือกแบบสมเหตุสมผล" },
  { key:"match_cut", label:"Match Cut · ตำแหน่งภาพใกล้กัน" },
  { key:"hold_reveal", label:"Hold & Reveal · ค้างก่อนเปลี่ยนช็อต" },
  { key:"cut_on_action", label:"Cut on Action · ตัดตอนกำลังขยับ" },
  { key:"zoom_counter", label:"Counter Zoom · ซูมสวนแบบนุ่มนวล" },
  { key:"object_follow", label:"Object Follow · ตามการหยิบ/ถือ/สวม" },
  { key:"clean_cut", label:"Clean Cut · ตัดตรงแบบปลอดภัย" }
];

const END_MOVE_OPTIONS = [
  { key:"auto", label:"Auto / ตามคลิปจริง" },
  { key:"static", label:"นิ่ง" },
  { key:"zoom_in", label:"ซูมเข้า" },
  { key:"zoom_out", label:"ซูมออก" },
  { key:"pan_left", label:"แพนซ้าย" },
  { key:"pan_right", label:"แพนขวา" }
];

const CATEGORY_PROFILES = {
  "แฟชั่น/เครื่องแต่งกาย": {
    family: "generic",
    guideTitle: "หมวดรวมแฟชั่น",
    guide: "ใช้เมื่อสินค้าไม่เข้าหมวดเฉพาะ ระบบจะอิงภาพรวม + มุมรอง + รายละเอียด + ภาพตอนใช้งาน",
    slots: [
      { key:"main_view", labelTh:"ภาพรวมหลัก", labelEn:"Main hero view", required:true, priority:"required", badge:"จำเป็น", helpTh:"มุมหลักที่เห็นทรง สี และสัดส่วนชัดที่สุด", helpEn:"Primary overall reference defining the complete product shape, colors and proportions." },
      { key:"secondary_view", labelTh:"ภาพมุมรอง/อีกด้าน", labelEn:"Secondary angle", required:true, priority:"required", badge:"จำเป็น", helpTh:"ช่วยล็อกโครงสร้างที่มุมหลักมองไม่เห็น", helpEn:"Secondary angle defining hidden geometry and asymmetric details." },
      { key:"detail_view", labelTh:"ภาพรายละเอียด", labelEn:"Detail / macro", required:false, priority:"recommended", badge:"แนะนำ", helpTh:"โลโก้ ลาย ตะเข็บ ซิป ตัวล็อก หรือพื้นผิว", helpEn:"Macro detail for exact logos, patterns, seams, trims, hardware and visible finish." },
      { key:"worn_use_ref", labelTh:"ภาพตอนสวม/ใช้งาน", labelEn:"Worn / use reference", required:false, priority:"recommended", badge:"แนะนำ", helpTh:"ช่วยล็อกสเกล ตำแหน่ง และการวางตัวบนร่างกาย", helpEn:"Real-use reference defining scale, placement and orientation on the body." },
      { key:"functional_state", labelTh:"ภาพสถานะสำคัญ", labelEn:"Functional state", required:false, priority:"optional", badge:"เสริม", helpTh:"เช่น พับ เปิด คล้อง หรือสถานะใช้งานที่สำคัญ", helpEn:"Functional-state reference defining an important physical configuration." }
    ]
  },
  "เสื้อ": {
    family: "garment",
    guideTitle: "เสื้อ",
    guide: "ใช้ Front / Back แยกชัด พร้อม Detail และภาพสวมจริง เพื่อกันลาย/โลโก้/โครงสร้างสลับด้าน",
    slots: [
      { key:"front", labelTh:"ภาพด้านหน้า", labelEn:"Front", required:true, priority:"required", badge:"จำเป็น", helpTh:"ด้านที่อยู่บนอก/ด้านหน้าลำตัว", helpEn:"Exact garment FRONT. This side belongs on the presenter's chest/front torso." },
      { key:"back", labelTh:"ภาพด้านหลัง", labelEn:"Back", required:false, priority:"recommended", badge:"แนะนำมาก", helpTh:"ล็อกลาย ตะเข็บ และโครงสร้างด้านหลัง", helpEn:"Exact garment BACK. This side belongs on the presenter's back only." },
      { key:"detail", labelTh:"ภาพรายละเอียด", labelEn:"Detail", required:false, priority:"recommended", badge:"แนะนำ", helpTh:"โลโก้ ลาย ปก แขน กระดุม ซิป ตะเข็บ", helpEn:"Macro reference for print/logo placement, collar, sleeves, seams, buttons, zippers and trims." },
      { key:"construction_detail", labelTh:"คอ/แขน/ชายเสื้อ", labelEn:"Construction detail", required:false, priority:"optional", badge:"เสริม", helpTh:"จุดโครงสร้างที่ต้องการล็อกเพิ่ม", helpEn:"Construction close-up for collar, cuff, hem or another critical structural area." },
      { key:"worn_ref", labelTh:"ภาพสวมใส่จริง", labelEn:"Worn fit reference", required:false, priority:"recommended", badge:"แนะนำ", helpTh:"ช่วยล็อกทรง สเกล ความยาว และตำแหน่งบนร่างกาย", helpEn:"Worn reference defining visible fit, silhouette, length and placement." }
    ]
  },
  "กางเกง": {
    family: "garment",
    guideTitle: "กางเกง",
    guide: "ล็อก Front / Back + เอว/ซิป/กระเป๋า + ช่วงขา เพื่อไม่ให้โครงหน้าหลังสลับกัน",
    slots: [
      { key:"front", labelTh:"ภาพด้านหน้า", labelEn:"Front", required:true, priority:"required", badge:"จำเป็น", helpTh:"ทรงหน้า เอว ซิป กระดุม กระเป๋าหน้า", helpEn:"Exact pants FRONT defining waistband, fly, front pockets and leg shape." },
      { key:"back", labelTh:"ภาพด้านหลัง", labelEn:"Back", required:false, priority:"recommended", badge:"แนะนำมาก", helpTh:"ทรงหลัง กระเป๋าหลัง yoke และตะเข็บ", helpEn:"Exact pants BACK defining rear pockets, yoke, seams and back construction." },
      { key:"waist_detail", labelTh:"รายละเอียดช่วงเอว", labelEn:"Waist detail", required:false, priority:"recommended", badge:"แนะนำ", helpTh:"กระดุม ซิป หูเข็มขัด ป้าย กระเป๋า", helpEn:"Waistband/fly detail for buttons, zipper, belt loops, labels and pocket geometry." },
      { key:"leg_hem_detail", labelTh:"ช่วงขา/ปลายขา", labelEn:"Leg / hem detail", required:false, priority:"optional", badge:"เสริม", helpTh:"ลายขา ตะเข็บ ความกว้าง และปลายขา", helpEn:"Leg/hem reference defining taper, cuff, stitching, distressing or other leg details." },
      { key:"worn_ref", labelTh:"ภาพสวมใส่จริง", labelEn:"Worn fit reference", required:false, priority:"recommended", badge:"แนะนำ", helpTh:"ช่วยล็อกสัดส่วนและทรงเมื่ออยู่บนร่างกาย", helpEn:"Worn reference defining visible silhouette, rise, leg proportions and placement." }
    ]
  },
  "เดรส": {
    family: "garment",
    guideTitle: "เดรส",
    guide: "ล็อก Front / Back + ช่วงบน + ชาย/ความยาว + ภาพสวมจริง เพื่อรักษาทรงเต็มตัว",
    slots: [
      { key:"front", labelTh:"ภาพด้านหน้า", labelEn:"Front", required:true, priority:"required", badge:"จำเป็น", helpTh:"คอ อก เอว ลาย และโครงด้านหน้า", helpEn:"Exact dress FRONT defining neckline, bodice, waist, print placement and front silhouette." },
      { key:"back", labelTh:"ภาพด้านหลัง", labelEn:"Back", required:false, priority:"recommended", badge:"แนะนำมาก", helpTh:"คอหลัง ซิป ผูกหลัง ตะเข็บ และลายหลัง", helpEn:"Exact dress BACK defining back neckline, zipper/tie, seams, pattern and back silhouette." },
      { key:"upper_detail", labelTh:"รายละเอียดช่วงบน", labelEn:"Upper detail", required:false, priority:"recommended", badge:"แนะนำ", helpTh:"คอ แขน อก กระดุม ซิป โบว์", helpEn:"Upper-body construction detail for neckline, sleeves, bodice, buttons, zipper, bow or trim." },
      { key:"hem_full_length", labelTh:"ชายชุด/ความยาว", labelEn:"Hem / full length", required:false, priority:"recommended", badge:"แนะนำ", helpTh:"ช่วยล็อกความยาว จีบ ผ่า และรูปทรงชายชุด", helpEn:"Hem/full-length reference defining exact length, flare, pleats, slit and lower silhouette." },
      { key:"worn_ref", labelTh:"ภาพสวมใส่จริง", labelEn:"Worn fit reference", required:false, priority:"recommended", badge:"แนะนำ", helpTh:"ช่วยล็อกทรงเต็มตัวและตำแหน่งรายละเอียด", helpEn:"Worn reference defining full-body silhouette, scale and garment placement." }
    ]
  },
  "รองเท้า": {
    family: "footwear",
    guideTitle: "รองเท้า",
    guide: "รองเท้าใช้ Pair / Side / Top / Sole / Heel / Detail / On-foot เพื่อคุมคู่ซ้ายขวา ทรง พื้น และตำแหน่งบนเท้า",
    slots: [
      { key:"pair_overview", labelTh:"ภาพรวมรองเท้าทั้งคู่", labelEn:"Pair overview", required:true, priority:"required", badge:"จำเป็น", helpTh:"เห็นซ้าย/ขวา สี ทรง และสัดส่วนทั้งคู่", helpEn:"Primary pair identity defining both left and right shoes as a matched pair." },
      { key:"side_profile", labelTh:"มุมด้านข้างหลัก", labelEn:"Side profile", required:true, priority:"required", badge:"จำเป็น", helpTh:"มุมที่เห็นทรง โลโก้ พื้น และเส้นสายชัดที่สุด", helpEn:"Primary side profile defining silhouette, logo/panel placement, sole thickness and side geometry." },
      { key:"top_view", labelTh:"มุมด้านบน", labelEn:"Top view", required:false, priority:"recommended", badge:"แนะนำ", helpTh:"หน้าเท้า เชือก สายรัด ลิ้นรองเท้า และช่องเปิด", helpEn:"Top view defining toe shape, lacing/straps, tongue, opening and top color layout." },
      { key:"opposite_side", labelTh:"ด้านข้างอีกฝั่ง", labelEn:"Opposite side", required:false, priority:"optional", badge:"เสริม", helpTh:"สำคัญถ้าสองด้านมีโลโก้/ลายไม่เหมือนกัน", helpEn:"Opposite-side reference for asymmetric branding, panels or hardware." },
      { key:"sole_view", labelTh:"พื้นรองเท้า", labelEn:"Sole / outsole", required:false, priority:"recommended", badge:"แนะนำ", helpTh:"ลายพื้น สีพื้น และรูปทรง outsole", helpEn:"Outsole reference defining tread pattern, outsole color, edge shape and sole geometry." },
      { key:"heel_view", labelTh:"ด้านส้น", labelEn:"Heel / rear", required:false, priority:"optional", badge:"เสริม", helpTh:"ส้น โลโก้หลัง ห่วง และรูปทรงด้านท้าย", helpEn:"Heel/rear reference defining heel counter, rear branding, pull tabs and geometry." },
      { key:"detail_view", labelTh:"ภาพรายละเอียด", labelEn:"Detail / macro", required:false, priority:"recommended", badge:"แนะนำ", helpTh:"โลโก้ ตะเข็บ เชือก สาย และจุดเด่น", helpEn:"Macro reference for exact logo, stitching, lace/strap, hardware and visible surface details." },
      { key:"on_foot_ref", labelTh:"ภาพใส่จริงบนเท้า", labelEn:"On-foot reference", required:false, priority:"recommended", badge:"แนะนำ", helpTh:"ช่วยล็อกสเกล ทิศทาง และซ้าย/ขวาบนเท้า", helpEn:"On-foot reference defining scale, correct left/right placement, ankle relationship and worn orientation." }
    ]
  },
  "กระเป๋า": {
    family: "bag",
    guideTitle: "กระเป๋า",
    guide: "กระเป๋าใช้ Exterior / Secondary / Closed / Open Interior / Hardware / Strap / Depth / On-body เพื่อรักษาสถานะเปิด-ปิดและโครง 3 มิติ",
    slots: [
      { key:"main_exterior", labelTh:"ภาพภายนอกมุมหลัก", labelEn:"Main exterior", required:true, priority:"required", badge:"จำเป็น", helpTh:"เห็นทรง สี โลโก้ ฝาปิด และโครงหลัก", helpEn:"Primary exterior identity defining overall shape, color layout, logo and main construction." },
      { key:"secondary_exterior", labelTh:"ภาพอีกมุม/ด้านข้าง", labelEn:"Secondary exterior", required:true, priority:"required", badge:"จำเป็น", helpTh:"เห็นความลึก ด้านข้าง/หลัง และโครงที่มุมหลักไม่เห็น", helpEn:"Secondary exterior angle defining depth, side/back construction and asymmetric details." },
      { key:"closed_state", labelTh:"สภาพปิดกระเป๋า", labelEn:"Closed state", required:false, priority:"recommended", badge:"แนะนำ", helpTh:"ตำแหน่งฝา ซิป ตัวล็อก และสายตอนปิด", helpEn:"Closed-state reference defining flap, zipper, clasp and strap positions when fully closed." },
      { key:"interior_open", labelTh:"ภาพเปิดด้านใน", labelEn:"Open interior", required:false, priority:"recommended", badge:"แนะนำมาก", helpTh:"ช่องหลัก ช่องย่อย ซับใน และโครงภายใน", helpEn:"Open/interior reference defining compartments, lining, inner pockets and opening geometry." },
      { key:"hardware_detail", labelTh:"ซิป/ตัวล็อก/โลโก้", labelEn:"Hardware detail", required:false, priority:"recommended", badge:"แนะนำ", helpTh:"รายละเอียดชิ้นส่วนที่มักเพี้ยนเวลาเจน", helpEn:"Hardware macro defining zipper pulls, clasps, buckles, rings, logo plates and metal details." },
      { key:"strap_handle_detail", labelTh:"สาย/หูจับ", labelEn:"Strap / handle", required:false, priority:"optional", badge:"เสริม", helpTh:"จุดยึดสาย ความกว้าง หัวปรับ และหูจับ", helpEn:"Strap/handle reference defining attachment points, width, adjusters and handle geometry." },
      { key:"bottom_side_depth", labelTh:"ก้น/ความลึกด้านข้าง", labelEn:"Bottom / side depth", required:false, priority:"optional", badge:"เสริม", helpTh:"ช่วยล็อกรูปทรง 3 มิติและฐานกระเป๋า", helpEn:"Bottom/side-depth reference defining base shape, gusset, depth and three-dimensional structure." },
      { key:"on_body_ref", labelTh:"ภาพถือ/สะพายจริง", labelEn:"On-body reference", required:false, priority:"recommended", badge:"แนะนำ", helpTh:"ช่วยล็อกสเกล ตำแหน่ง และความยาวสายตอนใช้งาน", helpEn:"On-body reference defining real-world scale, carry position and strap placement." }
    ]
  },
  "เครื่องประดับ": {
    family: "jewelry",
    guideTitle: "เครื่องประดับ",
    guide: "เครื่องประดับใช้ Hero / Macro / Clasp-Back / Side / Worn / Pair-Set / Scale เพื่อคุมจำนวนชิ้น รูปทรงเล็กละเอียด และตำแหน่งตอนสวม",
    slots: [
      { key:"hero_view", labelTh:"ภาพรวมสินค้า", labelEn:"Hero overview", required:true, priority:"required", badge:"จำเป็น", helpTh:"เห็นรูปทรง จำนวนชิ้น สี และองค์ประกอบหลัก", helpEn:"Primary identity defining complete jewelry form, piece count, color and composition." },
      { key:"macro_detail", labelTh:"Macro รายละเอียด", labelEn:"Macro detail", required:true, priority:"required", badge:"จำเป็น", helpTh:"เม็ดประดับ ลาย ขอบ ตัวเรือน ข้อต่อ และผิว", helpEn:"Macro reference defining stones, settings, engraving, links, edges and visible finish." },
      { key:"clasp_back", labelTh:"ตัวล็อก/ด้านหลัง", labelEn:"Clasp / back / underside", required:false, priority:"recommended", badge:"แนะนำ", helpTh:"ตัวล็อก ก้าน ต่างหู ด้านหลังจี้ หรือโครงที่ซ่อน", helpEn:"Clasp/back reference defining fastening mechanism, posts, backs and hidden-side construction." },
      { key:"side_profile", labelTh:"มุมด้านข้าง", labelEn:"Side profile", required:false, priority:"optional", badge:"เสริม", helpTh:"ช่วยล็อกความหนา ระดับนูน และรูปทรง 3 มิติ", helpEn:"Side profile defining thickness, elevation, setting height and 3D geometry." },
      { key:"worn_ref", labelTh:"ภาพตอนสวมใส่", labelEn:"Worn reference", required:false, priority:"recommended", badge:"แนะนำ", helpTh:"ช่วยล็อกขนาดจริงและตำแหน่งบนคอ หู นิ้ว หรือข้อมือ", helpEn:"Worn reference defining scale and correct anatomical placement." },
      { key:"pair_set_ref", labelTh:"ภาพคู่/ทั้งเซ็ต", labelEn:"Pair / set reference", required:false, priority:"optional", badge:"เสริม", helpTh:"สำคัญสำหรับต่างหูหรือสินค้าที่ขายเป็นคู่/เซ็ต", helpEn:"Pair/set reference defining exact piece count, matching relationship and left/right pairing." },
      { key:"size_scale_ref", labelTh:"ภาพเทียบสเกล", labelEn:"Size / scale reference", required:false, priority:"optional", badge:"เสริม", helpTh:"ช่วยล็อกขนาดเมื่อไม่มีภาพสวมใส่", helpEn:"Scale reference defining approximate physical size without inventing dimensions." }
    ]
  }
};

const state = {
  productRefs: {},
  sceneRefs: {
    table:{fileName:"table-review.png",dataUrl:null,isDefault:true},
    room:{fileName:"room-review.png",dataUrl:null,isDefault:true},
  },
  analysis:null,
  selectedHook:null,
  project:null,
  reviseClipId:null,
  transitionPrefs:null,
  clipArtifacts:{},
  apiBusy:false,
  cooldownUntil:0,
};

const el = {
  category: $("#category"),
  productSlots: $("#productSlots"),
  categoryGuide: $("#categoryGuide"),
  analyze: $("#analyzeBtn"),
  empty: $("#emptyState"),
  loading: $("#loading"),
  loadingTitle: $("#loadingTitle"),
  loadingSub: $("#loadingSub"),
  analysisView: $("#analysisView"),
  projectView: $("#projectView"),
  exportPack: $("#exportPackBtn"),
  exportJson: $("#exportJsonBtn"),
  toast: $("#toast"),
  modal: $("#reviseModal"),
  closeModal: $("#closeModal"),
  reviseTitle: $("#reviseTitle"),
  reviseInstruction: $("#reviseInstruction"),
  reviseSubmit: $("#reviseSubmit"),
};

function friendlyApiError(err){
  const msg=String(err?.message||err||"");
  if(msg.includes("429") || msg.includes("RATE LIMIT") || msg.includes("RATE_LIMIT")){
    return msg.includes("ประมาณ") ? msg : "Gemini API ถึงขีดจำกัดอัตราการใช้งานชั่วคราว กรุณารอสักครู่แล้วลองใหม่ อย่ากดซ้ำถี่ ๆ";
  }
  if(msg.includes("503") || msg.includes("GEMINI_OVERLOADED") || msg.includes("โหลดสูง")){
    return "Gemini ฝั่ง Google กำลังมีผู้ใช้งานสูงชั่วคราว ระบบลองซ้ำและสลับโมเดลให้อัตโนมัติแล้ว หากยังขึ้นข้อความนี้ให้รอ 30–60 วินาทีแล้วลองใหม่";
  }
  return msg.slice(0,260);
}

function setApiBusy(busy){
  state.apiBusy=busy;
  if(el.analyze) el.analyze.disabled = busy || !currentProfile();
  const build=$("#buildBtn");
  if(build) build.disabled = busy || !state.selectedHook;
}

function startCooldown(seconds){
  const sec=Math.max(0,Number(seconds)||0);
  if(!sec)return;
  state.cooldownUntil=Date.now()+sec*1000;
  const tick=()=>{
    const left=Math.ceil((state.cooldownUntil-Date.now())/1000);
    if(left<=0){state.cooldownUntil=0;return;}
    toast(`Gemini rate limit · รออีกประมาณ ${left} วินาที แล้วค่อยลองใหม่`);
    setTimeout(tick, Math.min(5000,left*1000));
  };
  tick();
}

function toast(msg){
  el.toast.textContent=msg;el.toast.classList.add("show");clearTimeout(toast.t);
  toast.t=setTimeout(()=>el.toast.classList.remove("show"),2800);
}
function esc(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function li(items=[]){return items?.length?items.map(x=>`<li>${esc(x)}</li>`).join(""):"<li>—</li>"}


function clipCountValue(){
  return Number($("#clipCount")?.value || 4);
}

function buildDefaultTransitionPrefs(count=clipCountValue()){
  const pairs={};
  for(let i=1;i<count;i++){
    pairs[`BC_${String(i).padStart(2,"0")}_to_BC_${String(i+1).padStart(2,"0")}`] = "auto_smart";
  }
  return { motionPolicy: "minimal", pairs };
}

function ensureTransitionPrefs(){
  const count = clipCountValue();
  if(!state.transitionPrefs) state.transitionPrefs = buildDefaultTransitionPrefs(count);
  if(!state.transitionPrefs.pairs) state.transitionPrefs.pairs = {};
  for(let i=1;i<count;i++){
    const key = `BC_${String(i).padStart(2,"0")}_to_BC_${String(i+1).padStart(2,"0")}`;
    if(!state.transitionPrefs.pairs[key]) state.transitionPrefs.pairs[key] = "auto_smart";
  }
  state.transitionPrefs.motionPolicy = $("#continuityMotionPolicy")?.value || state.transitionPrefs.motionPolicy || "minimal";
  return state.transitionPrefs;
}

function transitionKey(prevId,nextId){
  return `BC_${String(prevId).padStart(2,"0")}_to_BC_${String(nextId).padStart(2,"0")}`;
}

function transitionLabel(key){
  return TRANSITION_OPTIONS.find(x=>x.key===key)?.label || key;
}

function openingMoveAdvice(prevMove, transitionType, motionPolicy){
  if(transitionType === "zoom_counter" || motionPolicy === "counter_zoom"){
    if(prevMove === "zoom_in") return "ถ้าคลิปก่อนจบด้วยซูมเข้า ให้คลิปนี้เปิดด้วยซูมออกเบา ๆ";
    if(prevMove === "zoom_out") return "ถ้าคลิปก่อนจบด้วยซูมออก ให้คลิปนี้เปิดด้วยซูมเข้าเบา ๆ";
  }
  if(motionPolicy === "minimal") return "เปิดคลิปแบบนิ่งก่อน แล้วค่อยขยับเท่าที่จำเป็น";
  return "เปิดคลิปแบบนุ่มนวลและต่อเนื่องจากช็อตก่อนหน้า";
}

function ensureClipArtifact(id){
  const key = `BC_${String(id).padStart(2,"0")}`;
  if(!state.clipArtifacts[key]) state.clipArtifacts[key] = { endFrameDataUrl:null, endFrameFileName:"", endMove:"auto", endFrameAnalysis:null, transitionDecision:null, continuityPromptBlock_en:"" };
  return state.clipArtifacts[key];
}

function saveCurrentProjectState(){
  try{
    if(!state.project) return;
    localStorage.setItem("basketclip:v065:project",JSON.stringify({
      analysis:state.analysis,
      project:state.project,
      selectedHook:state.selectedHook,
      referenceManifest:referenceManifest(),
      category:$("#category").value,
      productRefs:state.productRefs,
      sceneRefs:state.sceneRefs,
      transitionPrefs:state.transitionPrefs,
      clipArtifacts:state.clipArtifacts
    }));
  }catch{}
}

function forensicSummaryHtml(snapshot, decision){
  if(!snapshot) return "";
  const comp=snapshot.composition||{}, prod=snapshot.productAtCut||{}, pres=snapshot.presenterAtCut||{}, light=snapshot.lightingAndColor||{}, depth=snapshot.depthFocusAndMotion||{};
  return `
    <details class="forensic-details">
      <summary>Frame DNA · วิเคราะห์เฟรมสุดท้ายแล้ว</summary>
      <div class="forensic-grid">
        <div><b>สรุปเฟรม</b><span>${esc(snapshot.frameSummary_th||"")}</span></div>
        <div><b>Composition</b><span>${esc([comp.shotSize,comp.cameraAngle,comp.cameraDistanceImpression,comp.mainSubjectScreenPlacement].filter(Boolean).join(" · "))}</span></div>
        <div><b>Product at cut</b><span>${esc([prod.visibleViewOrRole,prod.physicalState,prod.orientation,prod.scaleInFrame,prod.screenPosition].filter(Boolean).join(" · "))}</span></div>
        <div><b>Presenter / Hands</b><span>${esc([pres.bodyOrientation,pres.pose,pres.leftHand,pres.rightHand].filter(Boolean).join(" · "))}</span></div>
        <div><b>Lighting</b><span>${esc([light.lightDirection,light.lightTemperature,light.shadowCharacter,light.exposureContrast].filter(Boolean).join(" · "))}</span></div>
        <div><b>Focus / Depth / Motion</b><span>${esc([depth.focusTarget,depth.depthOfField,depth.userReportedEndMove].filter(Boolean).join(" · "))}</span></div>
      </div>
      ${(snapshot.continuityLocks||[]).length?`<div class="detail-box forensic-locks"><b>Continuity locks</b><ul>${li(snapshot.continuityLocks)}</ul></div>`:""}
      ${decision?`<div class="detail-box"><b>Transition Director</b><p>${esc(decision.reason_th||"")}<br>${esc(decision.openingCameraRule_en||"")}<br>${esc(decision.motionRule_en||"")}</p></div>`:""}
    </details>`;
}

function renderTransitionPlanner(){
  const host = $("#transitionPlanner");
  if(!host) return;
  const prefs = ensureTransitionPrefs();
  const motion = $("#continuityMotionPolicy");
  if(motion) motion.value = prefs.motionPolicy || "minimal";
  let html = "";
  for(let i=1;i<clipCountValue();i++){
    const key = transitionKey(i,i+1);
    html += `<label class="transition-row"><span>Transition ${String(i).padStart(2,"0")} → ${String(i+1).padStart(2,"0")}</span><select data-transition-pair="${key}">${TRANSITION_OPTIONS.map(op=>`<option value="${op.key}" ${prefs.pairs[key]===op.key?"selected":""}>${op.label}</option>`).join("")}</select></label>`;
  }
  host.innerHTML = html;
  motion?.addEventListener("change",()=>{ ensureTransitionPrefs(); }, { once:true });
  $$('[data-transition-pair]').forEach(sel=>sel.onchange=()=>{
    ensureTransitionPrefs();
    state.transitionPrefs.pairs[sel.dataset.transitionPair] = sel.value;
  });
}

async function fileToDataUrl(file){
  return await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)});
}

function currentProfile(){
  return CATEGORY_PROFILES[el.category.value] || null;
}

function ensureProfileState(){
  const profile=currentProfile();
  if(!profile){ state.productRefs={}; return; }
  const next={};
  for(const slot of profile.slots){
    next[slot.key]=state.productRefs[slot.key] || {fileName:"",dataUrl:null,note:"",unavailable:false};
  }
  state.productRefs=next;
}

function renderCategoryGuide(){
  const profile=currentProfile();
  if(!profile){
    el.categoryGuide.innerHTML=`<b>เลือกหมวดสินค้าก่อน</b><p>หลังเลือกแล้ว ระบบจะสร้าง Reference Kit ที่เหมาะกับสินค้านั้น</p>`;
    return;
  }
  el.categoryGuide.innerHTML=`<b>${esc(profile.guideTitle)}</b><p>${esc(profile.guide)}</p>`;
}

function renderProductSlots(){
  ensureProfileState();
  const profile=currentProfile();
  if(!profile){ el.productSlots.innerHTML=""; el.analyze.disabled=true; return; }
  el.analyze.disabled=state.apiBusy;
  el.productSlots.innerHTML = profile.slots.map(slot=>{
    const ref=state.productRefs[slot.key] || {fileName:"",dataUrl:null,note:"",unavailable:false};
    return `
    <div class="slot-card ${slot.priority||"optional"} ${ref.unavailable?"is-unavailable":""}">
      <div class="slot-head">
        <div><b>${esc(slot.labelTh)}</b><small>${esc(slot.helpTh)}</small></div>
        <span class="slot-badge">${esc(slot.badge)}</span>
      </div>
      <div class="slot-uploader">
        <div class="slot-preview" id="preview-${slot.key}">
          ${ref.dataUrl ? `<img src="${ref.dataUrl}" alt="">` : `<span>${ref.unavailable?"NO IMAGE":esc(slot.labelEn)}</span>`}
        </div>
        <div class="slot-actions">
          <label class="slot-upload-btn ${ref.unavailable?"disabled":""}">เพิ่ม/เปลี่ยนรูป<input data-slot-input="${slot.key}" type="file" accept="image/*" hidden ${ref.unavailable?"disabled":""}/></label>
          <label class="no-image-row"><input data-slot-unavailable="${slot.key}" type="checkbox" ${ref.unavailable?"checked":""}/><span>ไม่มีภาพนี้</span><small>ระบบจะไม่เดามุม/รายละเอียดนี้</small></label>
          <input class="slot-note" data-slot-note="${slot.key}" placeholder="จุดสังเกตเพิ่ม (ถ้ามี) เช่น โลโก้อยู่ซ้ายบน / มีช่องซิปด้านใน 1 ช่อง" value="${esc(ref.note || "")}" />
        </div>
      </div>
    </div>`;
  }).join("");

  $$('[data-slot-input]').forEach(input=>input.addEventListener("change",async e=>{
    const f=e.target.files?.[0];if(!f)return;
    const key=e.target.dataset.slotInput;
    state.productRefs[key]=state.productRefs[key]||{fileName:"",dataUrl:null,note:"",unavailable:false};
    state.productRefs[key].fileName=f.name;
    state.productRefs[key].dataUrl=await fileToDataUrl(f);
    state.productRefs[key].unavailable=false;
    state.analysis=null;state.project=null;state.selectedHook=null;
    renderProductSlots();
  }));

  $$('[data-slot-unavailable]').forEach(input=>input.addEventListener("change",e=>{
    const key=e.target.dataset.slotUnavailable;
    const prev=state.productRefs[key]||{note:""};
    state.productRefs[key]={fileName:e.target.checked?"":(prev.fileName||""),dataUrl:e.target.checked?null:(prev.dataUrl||null),note:prev.note||"",unavailable:e.target.checked};
    state.analysis=null;state.project=null;state.selectedHook=null;
    renderProductSlots();
  }));

  $$('[data-slot-note]').forEach(input=>input.addEventListener("input",e=>{
    const key=e.target.dataset.slotNote;
    state.productRefs[key]=state.productRefs[key]||{fileName:"",dataUrl:null,note:"",unavailable:false};
    state.productRefs[key].note=e.target.value;
  }));
}

async function bindSceneInput(id, previewId, key){
  const input=$(id), preview=$(previewId);
  input.addEventListener("change",async e=>{
    const f=e.target.files?.[0];if(!f)return;
    const dataUrl=await fileToDataUrl(f);
    state.sceneRefs[key]={fileName:f.name,dataUrl,isDefault:false};
    preview.src=dataUrl;
  });
}
bindSceneInput("#tableSceneInput","#tableScenePreview","table");
bindSceneInput("#roomSceneInput","#roomScenePreview","room");

function setStep(n){
  $$(".progress-step").forEach((step,i)=>step.classList.toggle("active",i+1<=n));
}
function showLoading(title, sub){
  el.empty.classList.add("hidden");
  el.analysisView.classList.add("hidden");
  el.projectView.classList.add("hidden");
  el.loading.classList.remove("hidden");
  el.loadingTitle.textContent=title;
  el.loadingSub.textContent=sub;
}
function hideLoading(){ el.loading.classList.add("hidden"); }

function formBase(){
  const profile=currentProfile();
  if(!profile) throw new Error("กรุณาเลือกหมวดสินค้าก่อน");
  return {
    productName: $("#productName").value.trim(),
    category: $("#category").value,
    categoryProfile: profile,
    facts: $("#facts").value.trim(),
    audience: $("#audience").value.trim(),
    tone: $("#tone").value,
    angle: $("#angle").value,
    presenterGender: $("#presenterGender").value,
    clipCount: Number($("#clipCount").value),
    geminiModel: $("#geminiModel").value,
    smartQa: $("#smartQa").checked,
    transitionPrefs: ensureTransitionPrefs(),
    productRefs: state.productRefs,
    sceneRefs: state.sceneRefs,
  };
}

function referenceManifest(){
  const profile=currentProfile();
  if(!profile) return {};
  const out = {};
  for(const slot of profile.slots){
    const ref=state.productRefs[slot.key];
    out[`product_${slot.key}`]=ref?.unavailable ? `(ไม่มีภาพ: ${slot.labelTh})` : (ref?.fileName || `(${slot.labelTh} ยังไม่ได้ระบุชื่อไฟล์)`);
  }
  out.scene_table=state.sceneRefs.table.fileName || "table-review.png";
  out.scene_room=state.sceneRefs.room.fileName || "room-review.png";
  return out;
}

function manifestText(){
  const profile=currentProfile();
  const lines = ["FLOW REFERENCE MANIFEST"];
  for(const slot of profile.slots){
    lines.push(`- product_${slot.key}: ${referenceManifest()[`product_${slot.key}`]} — ${slot.labelTh} / ${slot.helpTh}`);
  }
  lines.push(`- scene_table: ${referenceManifest().scene_table} — Scene A โต๊ะรีวิว`);
  lines.push(`- scene_room: ${referenceManifest().scene_room} — Scene B ห้องรีวิว`);
  lines.push("IMPORTANT: Respect the role of each reference slot exactly. Do not substitute one slot for another.");
  return lines.join("\n");
}

function slotLabel(slotKey){
  const profile=currentProfile();
  if(!profile) return slotKey;
  const slot = profile.slots.find(s=>s.key===slotKey);
  return slot ? slot.labelTh : slotKey;
}
function refLabel(refName){
  if(refName==="scene_table") return "Scene A โต๊ะรีวิว";
  if(refName==="scene_room") return "Scene B ห้องรีวิว";
  if(refName.startsWith("product_")) return slotLabel(refName.replace(/^product_/,""));
  return refName;
}

$("#clipCount").addEventListener("change",()=>{ state.transitionPrefs=null; renderTransitionPlanner(); });

el.category.addEventListener("change",()=>{
  state.productRefs={};
  state.analysis=null;
  state.selectedHook=null;
  state.project=null;
  el.analysisView.classList.add("hidden");
  el.projectView.classList.add("hidden");
  el.exportPack.disabled=true;
  el.exportJson.disabled=true;
  setStep(1);
  renderCategoryGuide();
  renderProductSlots();
  renderTransitionPlanner();
});

async function loadAvailableModels(){
  const select=$("#geminiModel");
  const status=$("#modelStatus");
  try{
    const r=await fetch("/api/models");
    const data=await r.json();
    if(!r.ok) throw new Error(data.error||`HTTP ${r.status}`);
    const preferredOrder=["gemini-3.5-flash-lite","gemini-3.6-flash","gemini-3.1-pro-preview"];
    const map=new Map((data.models||[]).map(m=>[m.id,m]));
    const visible=[
      ...preferredOrder.filter(id=>map.has(id)).map(id=>map.get(id)),
      ...(data.models||[]).filter(m=>/^gemini-/i.test(m.id) && !preferredOrder.includes(m.id)).slice(0,8),
    ];
    if(visible.length){
      const current=select.value;
      select.innerHTML=visible.map(m=>`<option value="${m.id}">${m.displayName||m.id}</option>`).join("");
      select.value = visible.some(m=>m.id===current) ? current : (data.defaultModel || visible[0].id);
      status.textContent=`API key ใช้งานได้ ${data.models.length} รุ่น · เลือก ${select.value}`;
    } else {
      status.textContent="ไม่พบรุ่นที่รองรับ generateContent";
    }
  }catch(err){
    console.error(err);
    status.textContent="ตรวจรุ่นอัตโนมัติไม่สำเร็จ";
  }
}
loadAvailableModels();
renderTransitionPlanner();

function validateRequiredSlots(){
  const profile=currentProfile();
  if(!profile){ toast("กรุณาเลือกหมวดสินค้าก่อน"); return false; }
  const missing=profile.slots.filter(x=>x.required&&!state.productRefs[x.key]?.dataUrl&&!state.productRefs[x.key]?.unavailable);
  if(missing.length){toast(`ช่องจำเป็นยังไม่ได้จัดการ: ${missing.map(x=>x.labelTh).join(", ")} · เพิ่มรูปหรือเลือก “ไม่มีภาพนี้”`);return false;}
  return true;
}

el.analyze.onclick=async()=>{
  if(state.apiBusy)return;
  if(state.cooldownUntil>Date.now()) return toast(`ยังอยู่ในช่วง cooldown · รออีกประมาณ ${Math.ceil((state.cooldownUntil-Date.now())/1000)} วินาที`);
  if(!validateRequiredSlots()) return;
  const profile=currentProfile();
  const missingRecommended=(profile?.slots||[]).filter(x=>x.priority==="recommended"&&!state.productRefs[x.key]?.dataUrl&&!state.productRefs[x.key]?.unavailable);
  const unavailableImportant=(profile?.slots||[]).filter(x=>["required","recommended"].includes(x.priority)&&state.productRefs[x.key]?.unavailable);
  const notices=[];
  if(missingRecommended.length) notices.push(`ยังไม่ได้จัดการภาพแนะนำ:\n- ${missingRecommended.map(x=>x.labelTh).join("\n- ")}`);
  if(unavailableImportant.length) notices.push(`ระบุว่าไม่มีภาพ:\n- ${unavailableImportant.map(x=>x.labelTh).join("\n- ")}\nระบบจะหลีกเลี่ยงมุมที่ต้องใช้ภาพเหล่านี้`);
  if(notices.length&&!confirm(`${notices.join("\n\n")}\n\nต้องการวิเคราะห์ต่อหรือไม่?`))return;
  setApiBusy(true);
  showLoading("กำลังวิเคราะห์สินค้า…","อ่านรายละเอียดตาม Reference Role + สร้าง Product State Map + Hook Lab");
  try{
    const r=await fetch("/api/analyze",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(formBase())});
    const data=await r.json();
    if(!r.ok){if(data.retryAfterSec)startCooldown(data.retryAfterSec);throw new Error(data.error||`HTTP ${r.status}`);}
    state.analysis=data.analysis;state.selectedHook=null;
    localStorage.setItem("basketclip:v065:analysis",JSON.stringify({analysis:state.analysis,category:$("#category").value,productRefs:state.productRefs,sceneRefs:state.sceneRefs}));
    renderAnalysis();setStep(2);toast(`วิเคราะห์สำเร็จ · ${data.geminiModel}${data.fallbackUsed?" · fallback":""}${data.attempts>1?` · ${data.attempts} attempts`:""}`);
  }catch(err){toast(friendlyApiError(err));if(state.analysis){renderAnalysis();setStep(2);}else el.empty.classList.remove("hidden");}
  finally{hideLoading();setApiBusy(false);}
};

function renderAnalysis(){
  const a=state.analysis;if(!a)return;
  const readiness=a.readiness||{};
  const fp=a.productFingerprint||{};
  const detailSections=[
    ["Identity core", fp.identityCore],
    ["Color & finish", fp.colorAndFinish],
    ["Shape & silhouette", fp.shapeAndSilhouette],
    ["Logos / prints / patterns", fp.logosPrintsPatterns],
    ["Visible construction", fp.visibleConstruction],
    ["Closures / hardware", fp.closuresHardware],
    ["Interior / underside / secondary area", fp.interiorUndersideOrSecondaryArea],
    ["Materials / texture (visible only)", fp.materialsTextureVisibleOnly],
    ["Scale & proportion", fp.scaleAndProportion],
    ["Distinctive details", fp.distinctiveDetails],
    ["Do not change", fp.doNotChange],
  ].filter(([,v])=>Array.isArray(v));
  const roleMap=a.referenceRoleMap||{};
  el.projectView.classList.add("hidden");
  el.analysisView.innerHTML=`
    <section class="card ${readiness.score>=80?"good":""}">
      <div class="card-head"><h3>Reference Coverage</h3><span class="score">${readiness.score??"—"}/100</span></div>
      <p><b>${readiness.workflowReady===false?"ยังไม่พร้อม":"พร้อมสำหรับขั้นเลือก Hook"}</b> · มีภาพจริง ${readiness.uploadedCount??"—"}/${readiness.totalSlots??"—"} ช่อง${(readiness.unavailableRoles||[]).length?` · ไม่มีภาพ ${(readiness.unavailableRoles||[]).length} ช่อง`:""}</p>
      ${(readiness.warnings_th||[]).length?`<ul class="warning-list">${li(readiness.warnings_th)}</ul>`:""}
      ${(readiness.recommendedExtraReferences_th||[]).length?`<div class="detail-box" style="margin-top:8px"><b>แนะนำให้เพิ่มภาพ</b><ul>${li(readiness.recommendedExtraReferences_th)}</ul></div>`:""}
      ${readiness.aiAssessmentScore!=null?`<div class="subnote"><b>AI assessment:</b> ${esc(readiness.aiAssessmentScore)}/100 · ใช้เป็นความเห็นประกอบเท่านั้น คะแนนหลักด้านบนคำนวณจาก Reference ที่แนบจริง</div>`:""}${(a.continuityDirectorNotes_th||[]).length?`<div class="detail-box" style="margin-top:8px"><b>Continuity notes</b><ul>${li(a.continuityDirectorNotes_th)}</ul></div>`:""}
    </section>

    <section class="card">
      <h3>Reference Role Map</h3>
      <div class="refmap-grid">${(roleMap.roles||[]).map(role=>`
        <div class="ref-role">
          <b>${esc(role.label_th||role.key)}</b>
          <ul>${li(role.observedAnchors)}</ul>
          <p style="margin-top:6px"><small>${esc(role.usageRule_th||"")}</small><br><small>${esc(role.whenNeeded_th||"")}</small></p>
        </div>`).join("")}
      </div>
      <div class="detail-box" style="margin-top:8px"><b>Global rules</b><ul>${li(roleMap.globalRules)}</ul></div>
    </section>

    <section class="card">
      <h3>Product Fingerprint · รายละเอียดที่ต้องรักษา</h3>
      <div class="detail-grid">${detailSections.map(([n,v])=>`<div class="detail-box"><b>${esc(n)}</b><ul>${li(v)}</ul></div>`).join("")}</div>
    </section>

    <section class="card">
      <h3>Product State Map · ใช้เชื่อมคลิปให้ต่อเนื่อง</h3>
      <div class="state-map">${(a.stateMap?.states||[]).map(s=>`
        <div class="state-node"><b>${esc(s.label_th||s.id)}</b><small>${esc(s.id||"")}</small><p>${esc(s.description_th||"")}</p><em>Refs: ${esc((s.bestReferenceKeys||[]).join(", "))}</em></div>`).join("")}</div>
      <div class="transition-list">${(a.stateMap?.validTransitions||[]).map(t=>`
        <div><b>${esc(t.from)}</b><i>→</i><b>${esc(t.to)}</b><span>${esc(t.rule_th||"")}</span></div>`).join("")}</div>
      ${(a.stateMap?.forbiddenTransitions||[]).length?`<div class="forbidden"><b>ห้ามเกิด:</b> ${esc(a.stateMap.forbiddenTransitions.join(" · "))}</div>`:""}
    </section>

    <section class="card">
      <h3>Scene Continuity Anchors</h3>
      <div class="detail-grid">
        <div class="detail-box"><b>Scene A · Table</b><ul>${li(a.sceneBible?.sceneAAnchors)}</ul></div>
        <div class="detail-box"><b>Scene B · Room</b><ul>${li(a.sceneBible?.sceneBAnchors)}</ul></div>
        <div class="detail-box"><b>Shared lighting</b><ul>${li(a.sceneBible?.sharedLighting)}</ul></div>
        <div class="detail-box"><b>Continuity rules</b><ul>${li(a.sceneBible?.continuityRules)}</ul></div>
      </div>
    </section>

    <section class="card">
      <div class="card-head"><h3>Hook Lab · เลือก 1 อันก่อนสร้าง Prompt</h3><span class="score">ยังไม่สร้างวิดีโอ Prompt</span></div>
      <div class="hook-grid">${(a.hookVariants||[]).map(h=>`
        <div class="hook-card" data-hook="${esc(h.id)}">
          <small>HOOK ${esc(h.id)}</small><b>${esc(h.hook_th)}</b><p>${esc(h.strategy_th)}</p><span class="choose">เลือก Hook นี้</span>
        </div>`).join("")}
      </div>
      <div class="build-row">
        <button id="buildBtn" class="primary" disabled><span>2. ใช้ Hook ที่เลือกและสร้าง Production Prompts</span><kbd>Stage 2</kbd></button>
        <span id="selectedHookText">ยังไม่ได้เลือก Hook</span>
      </div>
    </section>
  `;
  el.analysisView.classList.remove("hidden");
  $$(".hook-card").forEach(card=>card.onclick=()=>{
    const id=card.dataset.hook;state.selectedHook=(a.hookVariants||[]).find(h=>h.id===id)||null;
    $$(".hook-card").forEach(x=>x.classList.toggle("selected",x===card));
    $("#buildBtn").disabled=!state.selectedHook;
    $("#selectedHookText").textContent=state.selectedHook?`เลือก: ${state.selectedHook.hook_th}`:"ยังไม่ได้เลือก Hook";
  });
  $("#buildBtn").onclick=buildProject;
}

async function buildProject(){
  if(state.apiBusy)return;
  if(state.cooldownUntil>Date.now()) return toast(`ยังอยู่ในช่วง cooldown · รออีกประมาณ ${Math.ceil((state.cooldownUntil-Date.now())/1000)} วินาที`);
  if(!state.selectedHook) return toast("เลือก Hook ก่อน");
  setApiBusy(true);
  showLoading("กำลัง Compile Production Prompts…","ใส่ Product Lock + Role Map + Scene Reference + Continuity ลงทุกคลิป");
  try{
    const r=await fetch("/api/build-project",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({
      ...formBase(),
      analysis: state.analysis,
      selectedHook: state.selectedHook,
      referenceManifest: referenceManifest(),
    })});
    const data=await r.json();if(!r.ok){if(data.retryAfterSec)startCooldown(data.retryAfterSec);throw new Error(data.error||`HTTP ${r.status}`);}
    state.project=data.project;
    localStorage.setItem("basketclip:v065:project",JSON.stringify({
      analysis:state.analysis,project:state.project,selectedHook:state.selectedHook,
      referenceManifest:referenceManifest(),category:$("#category").value,productRefs:state.productRefs,sceneRefs:state.sceneRefs,
      transitionPrefs:state.transitionPrefs,clipArtifacts:state.clipArtifacts
    }));
    renderProject();setStep(3);el.exportPack.disabled=false;el.exportJson.disabled=false;toast(`Production Pack พร้อม · ${data.geminiModel}`);
  }catch(err){toast(friendlyApiError(err));renderAnalysis()}
  finally{hideLoading();setApiBusy(false);}
}


function clipHtml(c,i){
  const refs=c.requiredReferences||[];
  const art=ensureClipArtifact(c.id);
  const prevTransition = c.id>1 ? (ensureTransitionPrefs().pairs[transitionKey(c.id-1,c.id)] || "auto_smart") : "";
  const prevArt = c.id>1 ? ensureClipArtifact(c.id-1) : null;
  return `
    <article class="clip">
      <div class="clip-no">${String(i+1).padStart(2,"0")}<small>${c.seconds||8}s</small></div>
      <div>
        <div class="meta">${esc(c.assetName||`BC_${String(i+1).padStart(2,"0")}`)} · ${esc(c.stage||"")} · ${esc(c.flowModel||"fast")}</div>
        <h3>${esc(c.title_th||"")}</h3>
        <div class="tags"><span class="tag">${c.scene==="room"?"Scene B · Room":"Scene A · Table"}</span><span class="tag">View: ${esc(c.visibleView||"")}</span><span class="tag">State: ${esc(c.productState_th||"")}</span></div>
        <p><b>หน้าที่:</b> ${esc(c.job_th||"")}<br><b>ผู้ใช้สินค้า/ผู้สวม:</b> ${esc(c.presenterOrientation_th||"")}<br><b>กล้อง:</b> ${esc(c.camera_th||"")}</p>
        <div class="timeline">${(c.timeline||[]).map(b=>`<div class="beat"><b>${esc(b.time)}</b><span>${esc(b.action_th)}<br>View: ${esc(b.productView||"")}<br><small>Lock: ${esc(b.continuityInvariant||"")}</small></span></div>`).join("")}</div>
        <div class="refs">${refs.map(r=>`<span class="ref-chip">📎 ${esc(refLabel(r))}</span>`).join("")}</div>
        <p><b>Voice:</b> “${esc(c.voiceover_th||"")}”<br><b>Text:</b> ${esc(c.onscreen_text_th||"")}</p>
        ${(c.fidelityChecks||[]).length?`<div class="detail-box compact-check"><b>Fidelity checks</b><ul>${li(c.fidelityChecks)}</ul></div>`:""}
        ${c.id>1?`<div class="detail-box continuity-box"><b>Continuity Bridge</b><ul><li>Transition ที่เลือก: ${esc(transitionLabel(prevTransition))}</li><li>แนบภาพฉากสุดท้ายของคลิปก่อนหน้าเป็น reference เปิดคลิปนี้</li><li>${esc(openingMoveAdvice(prevArt?.endMove||"auto", prevTransition, ensureTransitionPrefs().motionPolicy))}</li>${prevArt?.endFrameAnalysis?`<li><b>Frame DNA พร้อมแล้ว:</b> Prompt ของคลิปนี้สามารถอธิบายเฟรมก่อนหน้าแบบละเอียดได้</li>`:""}</ul>${forensicSummaryHtml(prevArt?.endFrameAnalysis,prevArt?.transitionDecision)}</div>`:""}
      </div>
      <div class="clip-actions">
        <button class="copy copy-clip" data-id="${c.id}">Copy Flow Prompt</button>
        <button class="copy-refs" data-id="${c.id}">ดู/Copy References</button>
        <button class="revise-clip" data-id="${c.id}">แก้ Clip ด้วย AI</button>
        ${c.id>1?`<button class="reinforce-clip" data-id="${c.id}">เสริมต่อเนื่องจากคลิปก่อน</button>`:""}
        <div class="artifact-box">
          <b>คลิปนี้จบอย่างไร</b>
          <label class="mini-btn upload-inline">อัปโหลดภาพฉากสุดท้าย<input data-endframe="${c.id}" type="file" accept="image/*" hidden /></label>
          <small>${art.endFrameFileName?`ไฟล์: ${esc(art.endFrameFileName)}`:"ยังไม่มีภาพฉากสุดท้าย"}</small>
          <select data-endmove="${c.id}">${END_MOVE_OPTIONS.map(op=>`<option value="${op.key}" ${((art.endMove||"auto")===op.key)?"selected":""}>จบช็อต: ${op.label}</option>`).join("")}</select>
          <small>${art.endFrameAnalysis?"✓ Frame DNA วิเคราะห์แล้ว · ใช้เป็นคำอธิบายละเอียดใน Prompt ถัดไป":"หลังอัปโหลด ให้ไปกดเสริมต่อเนื่องที่คลิปถัดไป ระบบจะวิเคราะห์ภาพนี้แบบละเอียดอัตโนมัติ"}</small>
          ${art.endFrameAnalysis?`<button class="copy-forensic" data-id="${c.id}">Copy Frame DNA Description</button>`:""}
        </div>
        <div class="statebox"><b>Start:</b> ${esc(c.startState_th||"")}<br><br><b>End:</b> ${esc(c.endState_th||"")}<br><br><b>Next:</b> ${esc(c.nextClipBridge_th||"")}</div>
      </div>
    </article>`;
}

function renderProject(){
  const p=state.project;if(!p)return;
  el.analysisView.classList.add("hidden");
  el.projectView.innerHTML=`
    <section class="card good">
      <div class="card-head"><h3>Selected Hook</h3><span class="score">${esc(p.selectedHook?.id||"")}</span></div>
      <p><b style="color:#171713">${esc(p.selectedHook?.hook_th||state.selectedHook?.hook_th||"")}</b><br>${esc(p.selectedHook?.strategy_th||"")}</p>
    </section>

    <section class="card">
      <h3>Production Bible</h3>
      <div class="bible-grid">
        <div class="bible-box"><b>Product Identity Lock</b><span>${esc(p.productionBible?.productIdentityLock_en||"")}</span></div>
        <div class="bible-box"><b>Reference Role Lock</b><span>${esc(p.productionBible?.referenceRoleLock_en||"")}</span></div>
        <div class="bible-box"><b>State Transition Lock</b><span>${esc(p.productionBible?.stateTransitionLock_en||"")}</span></div>
        <div class="bible-box"><b>Presenter Lock</b><span>${esc(p.productionBible?.presenterLock_en||"")}</span></div>
        <div class="bible-box"><b>Scene Continuity</b><span>${esc(p.productionBible?.sceneContinuityLock_en||"")}</span></div>
      </div>
    </section>

    <section class="card">
      <div class="card-head"><h3>Continuity Ledger · จุดเชื่อมทุกคลิป</h3><span class="score">${(p.clips||[]).length} clips</span></div>
      <div class="ledger">${(p.continuityLedger||[]).map(x=>`
        <div class="ledger-row"><b>${esc(x.assetName||"")}</b><span>${x.scene==="room"?"Scene B":"Scene A"}</span><p><strong>Start:</strong> ${esc(x.startProductState_th||"")}<br><strong>End:</strong> ${esc(x.endProductState_th||"")}<br><strong>Camera:</strong> ${esc(x.cameraState_th||"")}<br><strong>Carry:</strong> ${esc((x.carryForwardDetails||[]).join(" · "))}</p></div>`).join("")}</div>
    </section>

    <section class="card quality-card">
      <div class="card-head"><h3>Sequential Fidelity Mode · แนะนำสำหรับคุณภาพสูงสุด</h3><span class="score">BEST CONTINUITY</span></div>
      <p><b>วิธีที่แม่นที่สุด:</b> เจน BC_01 → แคปเฟรมสุดท้าย → อัปโหลดกลับเข้าเว็บ → ระบุว่าช็อตจบแบบไหน → กด “เสริมต่อเนื่องจากคลิปก่อน” ที่ BC_02 → ค่อยเจน BC_02 และทำซ้ำต่อไป เพราะระบบจะวิเคราะห์ Frame DNA จริงของผลลัพธ์ก่อนหน้า ไม่ได้อาศัยแค่แผนที่คาดไว้</p>
    </section>

    <section class="card">
      <div class="card-head"><h3>Master Flow Agent Pack · สร้างหลายคลิปจากคำสั่งเดียว</h3><span class="score">FAST / BATCH</span></div>
      <p>เหมาะกับความเร็ว แต่ความต่อเนื่องจะสู้ Sequential Fidelity Mode ไม่ได้ เพราะยังไม่มีเฟรมสุดท้ายจริงของคลิปก่อนหน้าให้วิเคราะห์ ก่อน Paste: อัปโหลดภาพอ้างอิงสินค้า + Scene A / Scene B เข้า Flow project แล้วลาก References เข้า Agent พร้อม Master Prompt</p>
      <div class="master-actions"><button id="copyMasterBtn">Copy Master Agent Prompt</button><button id="copyManifestBtn">Copy Reference Manifest</button></div>
    </section>

    ${(p.clips||[]).map((c,i)=>clipHtml(c,i)).join("")}

    <section class="card">
      <h3>Scenebuilder Order</h3>
      <p>${esc((p.scenebuilderOrder||[]).join(" → "))}</p>
    </section>
  `;
  el.projectView.classList.remove("hidden");
  $("#copyMasterBtn").onclick=async()=>{await navigator.clipboard.writeText(p.masterFlowAgentPrompt_en||"");toast("คัดลอก Master Flow Agent Prompt แล้ว")};
  $("#copyManifestBtn").onclick=async()=>{await navigator.clipboard.writeText(manifestText());toast("คัดลอก Reference Manifest แล้ว")};
  $$(".copy-clip").forEach(b=>b.onclick=()=>copyClip(Number(b.dataset.id)));
  $$(".revise-clip").forEach(b=>b.onclick=()=>openRevise(Number(b.dataset.id)));
  $$(".copy-refs").forEach(b=>b.onclick=()=>copyRefs(Number(b.dataset.id)));
  $$(".reinforce-clip").forEach(b=>b.onclick=()=>reinforceClip(Number(b.dataset.id)));
  $$(".copy-forensic").forEach(b=>b.onclick=async()=>{
    const art=ensureClipArtifact(Number(b.dataset.id));
    const text=art.continuityPromptBlock_en || art.endFrameAnalysis?.flowContinuityDescription_en || art.endFrameAnalysis?.frameSummary_th || "";
    await navigator.clipboard.writeText(text);toast("คัดลอก Frame DNA Description แล้ว");
  });
  $$('[data-endframe]').forEach(input=>input.onchange=async(e)=>{
    const f=e.target.files?.[0]; if(!f) return;
    const art=ensureClipArtifact(Number(e.target.dataset.endframe));
    art.endFrameDataUrl = await fileToDataUrl(f);
    art.endFrameFileName = f.name;
    art.endFrameAnalysis = null;
    art.transitionDecision = null;
    art.continuityPromptBlock_en = "";
    saveCurrentProjectState();
    renderProject();
  });
  $$('[data-endmove]').forEach(sel=>sel.onchange=(e)=>{
    ensureClipArtifact(Number(e.target.dataset.endmove)).endMove = e.target.value;
    saveCurrentProjectState();
  });
}


async function copyClip(id){
  const c=state.project.clips.find(x=>Number(x.id)===id);if(!c)return;
  let continuityText="";
  if(id>1){
    const prevArt = ensureClipArtifact(id-1);
    const transitionType = ensureTransitionPrefs().pairs[transitionKey(id-1,id)] || "auto_smart";
    const forensic = prevArt.endFrameAnalysis;
    const decision = prevArt.transitionDecision;

    if(forensic){
      continuityText = `

PREVIOUS END-FRAME CONTINUITY ANCHOR — DETAILED FORENSIC DESCRIPTION:
${prevArt.continuityPromptBlock_en || forensic.flowContinuityDescription_en || forensic.frameSummary_th || ""}

FRAME MATCH CHECKLIST:
${(forensic.continuityLocks||[]).map(x=>`- ${x}`).join("\n")}

TRANSITION DIRECTOR:
- Selected transition: ${transitionLabel(transitionType)}
- Effective transition: ${decision?.effectiveTransition || transitionType}
- Reason: ${decision?.reason_th || ""}
- Opening camera rule: ${decision?.openingCameraRule_en || openingMoveAdvice(prevArt.endMove||"auto", transitionType, ensureTransitionPrefs().motionPolicy)}
- Motion rule: ${decision?.motionRule_en || "Keep movement subtle and comfortable."}
- Attach actual previous end-frame file: ${prevArt.endFrameFileName}
- The actual previous end-frame image is an additional continuity reference; do not replace the product/scene references with it.`;
    }else{
      continuityText = `

PLANNED CONTINUITY BRIDGE — ACTUAL END FRAME NOT ANALYZED YET:
- Transition style: ${transitionLabel(transitionType)}
- Attach the final-frame still from BC_${String(id-1).padStart(2,"0")} as an extra reference before generating this clip.
- Previous clip ending frame file: ${prevArt.endFrameFileName || "(not uploaded yet)"}
- Planned previous-to-next description: ${c.plannedContinuityFromPrevious_en || c.openingContinuityRule_th || c.transitionFromPrevious_th || "Match product state, pose and framing before continuing."}
- ${openingMoveAdvice(prevArt.endMove||"auto", transitionType, ensureTransitionPrefs().motionPolicy)}
- For maximum continuity, upload the previous final frame and click “เสริมต่อเนื่องจากคลิปก่อน” before using this prompt.`;
    }
  }
  const text=`ATTACH THESE REFERENCES FIRST:\n${(c.requiredReferences||[]).map(r=>`- ${refLabel(r)} = ${referenceManifest()[r]||r}`).join("\n")}${continuityText}\n\nFLOW PROMPT:\n${c.flowPrompt_en}\n\nNEGATIVE:\n${c.negativePrompt_en}`;
  await navigator.clipboard.writeText(text);toast(`คัดลอก Clip ${id} พร้อม continuity description แล้ว`);
}

async function copyRefs(id){
  const c=state.project.clips.find(x=>Number(x.id)===id);if(!c)return;
  const extra = id>1 ? `
+ Continuity image: BC_${String(id-1).padStart(2,"0")} last frame` : "";
  const text=(c.requiredReferences||[]).map(r=>`${refLabel(r)}: ${referenceManifest()[r]||r}`).join("\n") + extra;
  await navigator.clipboard.writeText(text);toast(`คัดลอก Reference Checklist Clip ${id} แล้ว`);
}

async function reinforceClip(id){
  if(id<=1) return toast("คลิปแรกไม่ต้องเสริมจากคลิปก่อน");
  const prevArt = ensureClipArtifact(id-1);
  if(!prevArt?.endFrameDataUrl) return toast(`กรุณาอัปโหลดภาพฉากสุดท้ายของ Clip ${id-1} ก่อน`);
  const transitionType = ensureTransitionPrefs().pairs[transitionKey(id-1,id)] || "auto_smart";
  try{
    showLoading("กำลังเสริม continuity…","ใช้ภาพฉากสุดท้ายของคลิปก่อนหน้าเพื่อปรับ prompt คลิปถัดไป");
    const r = await fetch("/api/reinforce-continuity", {
      method:"POST",
      headers:{"content-type":"application/json"},
      body: JSON.stringify({
        analysis: state.analysis,
        project: state.project,
        clipId: id,
        previousEndFrameDataUrl: prevArt.endFrameDataUrl,
        previousEndFrameFileName: prevArt.endFrameFileName,
        previousEndMove: prevArt.endMove || "auto",
        transitionType,
        motionPolicy: ensureTransitionPrefs().motionPolicy,
        geminiModel: $("#geminiModel").value,
      })
    });
    const data = await r.json();
    if(!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
    const idx = state.project.clips.findIndex(x=>Number(x.id)===Number(id));
    if(idx>=0) state.project.clips[idx] = data.clip;
    if(Array.isArray(data.transitionPlan)) state.project.transitionPlan = data.transitionPlan;
    prevArt.endFrameAnalysis = data.frameSnapshot || null;
    prevArt.transitionDecision = data.transitionDecision || null;
    prevArt.continuityPromptBlock_en = data.continuityPromptBlock_en || data.frameSnapshot?.flowContinuityDescription_en || "";
    saveCurrentProjectState();
    renderProject();
    toast(`วิเคราะห์ Frame DNA + เสริม continuity ให้ Clip ${id} แล้ว`);
  }catch(err){
    toast(friendlyApiError(err));
  }finally{ hideLoading(); }
}

function openRevise(id){
  const c=state.project.clips.find(x=>Number(x.id)===id);if(!c)return;
  state.reviseClipId=id;el.reviseTitle.textContent=`${c.assetName||`Clip ${id}`} · ${c.title_th}`;el.reviseInstruction.value="";el.modal.classList.remove("hidden");
}
el.closeModal.onclick=()=>el.modal.classList.add("hidden");
el.modal.addEventListener("click",e=>{if(e.target===el.modal)el.modal.classList.add("hidden")});
el.reviseSubmit.onclick=async()=>{
  const note=el.reviseInstruction.value.trim();if(!note)return toast("ใส่สิ่งที่ต้องการแก้ก่อน");
  el.reviseSubmit.disabled=true;el.reviseSubmit.textContent="กำลังแก้…";
  try{
    const r=await fetch("/api/revise-clip",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({
      analysis:state.analysis,project:state.project,clipId:state.reviseClipId,instruction:note,geminiModel:$("#geminiModel").value
    })});
    const data=await r.json();if(!r.ok)throw new Error(data.error||`HTTP ${r.status}`);
    const idx=state.project.clips.findIndex(x=>Number(x.id)===Number(state.reviseClipId));
    if(idx>=0)state.project.clips[idx]=data.clip;
    el.modal.classList.add("hidden");saveCurrentProjectState();renderProject();toast("แก้ Clip แล้ว โดยคง Product Lock + Continuity");
  }catch(err){toast(friendlyApiError(err))}
  finally{el.reviseSubmit.disabled=false;el.reviseSubmit.textContent="แก้ Clip นี้"}
};

function download(name,text,type="text/plain"){
  const blob=new Blob([text],{type:`${type};charset=utf-8`});const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
el.exportJson.onclick=()=>{
  if(!state.project)return;
  download("basketclip-v064-project.json",JSON.stringify({
    category: $("#category").value,
    categoryProfile: currentProfile(),
    referenceManifest:referenceManifest(),
    analysis:state.analysis,
    selectedHook:state.selectedHook,
    project:state.project
  },null,2),"application/json");
};
el.exportPack.onclick=()=>{
  if(!state.project)return;
  const p=state.project;
  const md=[
    "# BasketClip v0.6.4 — Google Flow Agent Production Pack","",
    "## 0. CATEGORY", $("#category").value, "",
    "## 1. REFERENCE MANIFEST","```",manifestText(),"```","",
    "## 2. SELECTED HOOK",p.selectedHook?.hook_th||state.selectedHook?.hook_th||"","",
    "## 3. PRODUCT ANALYSIS","```json",JSON.stringify({
      productTruth:state.analysis?.productTruth,
      productFingerprint:state.analysis?.productFingerprint,
      referenceRoleMap:state.analysis?.referenceRoleMap,
      stateMap:state.analysis?.stateMap,
      presenterSpec:state.analysis?.presenterSpec,
      sceneBible:state.analysis?.sceneBible
    },null,2),"```","",
    "## 4. CONTINUITY LEDGER","```json",JSON.stringify(p.continuityLedger||[],null,2),"```","",
    "## 5. MASTER FLOW AGENT PROMPT","```text",p.masterFlowAgentPrompt_en||"","```","",
    "## 6. INDIVIDUAL CLIPS",
    ...(p.clips||[]).flatMap(c=>[
      `### ${c.assetName} — ${c.title_th}`,
      `Required references: ${(c.requiredReferences||[]).map(refLabel).join(", ")}`,
      `Start state: ${c.startState_th||""}`,
      `End state: ${c.endState_th||""}`,
      `Next bridge: ${c.nextClipBridge_th||""}`,"",
      "FLOW PROMPT:","```text",c.flowPrompt_en||"","```",
      "NEGATIVE:","```text",c.negativePrompt_en||"","```",""
    ]),
    "## 7. SCENEBUILDER ORDER",(p.scenebuilderOrder||[]).join(" -> "),"",
    "## 8. CAPTION",p.caption_th||"","",(p.hashtags||[]).join(" ")
  ].join("\n");
  download("basketclip-v064-flow-agent-pack.md",md,"text/markdown");
};

function restoreSaved(){
  try{
    const saved=JSON.parse(localStorage.getItem("basketclip:v065:project")||"null");
    if(saved?.category) $("#category").value=saved.category;
    renderCategoryGuide();
    renderProductSlots();
    if(saved?.productRefs) state.productRefs=saved.productRefs;
    if(saved?.sceneRefs) state.sceneRefs=saved.sceneRefs;
    if(saved?.analysis) state.analysis=saved.analysis;
    if(saved?.project) state.project=saved.project;
    if(saved?.selectedHook) state.selectedHook=saved.selectedHook;
    if(saved?.transitionPrefs) state.transitionPrefs=saved.transitionPrefs;
    if(saved?.clipArtifacts) state.clipArtifacts=saved.clipArtifacts;
    if(state.sceneRefs.table?.dataUrl) $("#tableScenePreview").src=state.sceneRefs.table.dataUrl;
    if(state.sceneRefs.room?.dataUrl) $("#roomScenePreview").src=state.sceneRefs.room.dataUrl;
    renderProductSlots();
    if(state.project?.clips?.length){
      el.empty.classList.add("hidden");el.exportPack.disabled=false;el.exportJson.disabled=false;renderProject();setStep(3);
    }else if(state.analysis){
      el.empty.classList.add("hidden");renderAnalysis();setStep(2);
    }
  }catch{}
}

renderCategoryGuide();
renderTransitionPlanner();
renderProductSlots();
restoreSaved();
