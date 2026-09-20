# BasketClip Director v0.6.3.1

เวอร์ชันนี้แก้จุดสำคัญจาก v0.5 ตามข้อเสนอ:

- ไม่บังคับ Front/Back กับสินค้าทุกชนิด
- ให้ **เลือกหมวดก่อน แล้วระบบค่อยสร้างช่องอัปโหลดให้เหมาะกับสินค้า**
- วิเคราะห์สินค้าแบบ **category-aware**
- คุม continuity และ product fidelity แบบละเอียดขึ้น

---

## แนวคิดหลัก

สินค้าแต่ละชนิดต้องใช้ภาพอ้างอิงไม่เหมือนกัน

### 1) เสื้อ / กางเกง / เดรส
ใช้:
- Front
- Back
- Detail

เหมาะกับสินค้าที่มี “ด้านหน้า/ด้านหลัง” ชัดเจน

### 2) รองเท้า
ใช้:
- Pair overview
- Side profile
- Top view
- Sole view
- Detail

เพราะรองเท้าไม่ได้มี front/back แบบเสื้อ
แต่มีเรื่องสำคัญกว่า เช่น
- ทรงรองเท้า
- มุมด้านข้าง
- พื้นรองเท้า
- ความหนา sole
- เชือก / ลิ้น / โลโก้ / ตะเข็บ

### 3) กระเป๋า
ใช้:
- Main exterior
- Secondary exterior
- Interior open
- Hardware detail

เพราะสิ่งสำคัญคือ
- ภายนอก
- มุมรอง/ด้านข้าง
- ตอนเปิดให้เห็นด้านใน
- ซิป / หัวล็อก / หูหิ้ว / สาย / โลโก้

### 4) เครื่องประดับ
ใช้:
- Hero overview
- Alternate angle
- Clasp/back/underside
- Macro detail

เพราะต้องเก็บ:
- รูปทรงหลัก
- มุมรอง
- จุดล็อก / ด้านหลัง / ด้านใต้
- รายละเอียดผิว / หิน / โลหะ / ความเงา

### 5) หมวดรวมแฟชั่น
ใช้:
- Main view
- Secondary view
- Detail view

---

## Workflow

1. เลือกหมวด
2. อัปโหลดภาพตามช่องที่ระบบสร้าง
3. ใส่ note ต่อภาพได้ เช่น
   - “โลโก้อยู่มุมซ้ายบน”
   - “มีช่องซิปด้านใน 1 ช่อง”
   - “ลายพื้นรองเท้าแบบฟันปลา”
4. กด Analyze
5. เลือก Hook
6. Build production prompts
7. Export ไปใช้กับ Google Flow

---

## สิ่งที่เพิ่มใน v0.6

- Category-aware upload slots
- Product Fingerprint แบบ generic ใช้ได้ทั้งเสื้อ รองเท้า กระเป๋า เครื่องประดับ
- Reference Role Map แทน Front/Back ตายตัว
- Prompt compiler อิงตาม family ของสินค้า
- Export pack ใหม่ที่รวมบทบาทของแต่ละ reference

---

## เปิดใช้งาน

```bash
cp .env.example .env
npm run dev
```

`.env`

```env
GEMINI_API_KEY=YOUR_KEY
GEMINI_MODEL=gemini-3.5-flash-lite
PORT=3000
```

เปิด:

```text
http://localhost:3000
```


---

## v0.6 Fidelity Expansion

Reference Kit ถูกขยายให้ละเอียดขึ้น:

### รองเท้า
- Pair overview
- Side profile
- Top view
- Opposite side
- Sole
- Heel
- Detail
- On-foot

### กระเป๋า
- Main exterior
- Secondary exterior
- Closed state
- Open interior
- Hardware
- Strap / handle
- Bottom / depth
- On-body

### เครื่องประดับ
- Hero
- Macro
- Clasp / back
- Side profile
- Worn
- Pair / set
- Size / scale

และเพิ่ม `Product State Map` + `Continuity Ledger` เพื่อให้แต่ละคลิปไม่ใช่การเจนใหม่แบบขาดจากกัน แต่มีสถานะเริ่ม/จบที่ต่อกันทางกายภาพ


## v0.6.1 — สถานะ “ไม่มีภาพนี้”

ทุก Reference Role มี 3 สถานะ: มีภาพ / ไม่มีภาพจริง / ยังไม่ได้ตัดสินใจ

Required ไม่บังคับว่าต้องมีไฟล์อีกต่อไป ถ้าไม่มีจริงให้ติ๊ก “ไม่มีภาพนี้” แล้วระบบจะทำงานต่อ แต่จะไม่เดา ไม่ mirror และไม่สร้างช็อตที่ต้องพึ่งมุมนั้นโดยไม่มีหลักฐาน

ตัวอย่าง:
- เสื้อไม่มี BACK → หลีกเลี่ยง clean back reveal
- รองเท้าไม่มี SOLE → หลีกเลี่ยง outsole shot
- กระเป๋าไม่มี OPEN INTERIOR → ไม่ invent ช่องด้านใน
- เครื่องประดับไม่มี CLASP/BACK → หลีกเลี่ยง macro ตัวล็อก


เพิ่ม Continuity Bridge workflow สำหรับคลิป 2 เป็นต้นไป: เลือก transition ระหว่างคลิป, อัปโหลดภาพเฟรมสุดท้ายของคลิปก่อนหน้า, แล้วใช้ปุ่มเสริม continuity เพื่อปรับ prompt ของคลิปถัดไป.


## v0.6.3 — End-Frame Forensics + Continuity Compiler

Continuity Bridge ถูกยกระดับเป็น 2-pass AI workflow:

### Pass 1 — End-Frame Forensics
เมื่ออัปโหลดภาพเฟรมสุดท้ายของคลิปก่อนหน้าแล้วกด `เสริมต่อเนื่องจากคลิปก่อน` ระบบจะวิเคราะห์ภาพจริงโดยละเอียด เช่น:

- shot size / camera angle / camera distance impression
- ตำแหน่งสินค้าในเฟรมแบบประมาณเป็นเปอร์เซ็นต์
- มุมและสถานะของสินค้า
- รายละเอียดสินค้า visible ณ จุด cut
- ส่วนร่างกายที่เห็น / body orientation
- มือซ้าย มือขวา และจุดสัมผัสกับสินค้า
- foreground / midground / background
- scene anchors และตำแหน่งสัมพันธ์
- direction / temperature ของแสง
- shadow / exposure / contrast
- focus target / depth of field
- motion evidence
- continuity locks อย่างน้อย 10 จุด
- uncertainty ที่ห้าม AI เดา

หมายเหตุ: ภาพนิ่งเฟรมเดียวไม่สามารถพิสูจน์ทิศทาง zoom/pan ได้แน่นอน ดังนั้น dropdown `จบช็อต:` ที่ผู้ใช้เลือกจะเป็นข้อมูล authoritative สำหรับทิศการเคลื่อนกล้อง

### Pass 2 — Continuity Prompt Compiler
ระบบนำ Frame DNA จาก Pass 1 ไปเขียน `flowPrompt_en` ของคลิปถัดไปใหม่ โดยมี section:

```text
PREVIOUS END-FRAME CONTINUITY ANCHOR
```

ใน section นี้ต้องอธิบายภาพก่อนหน้าอย่างละเอียด ไม่ใช่แค่บอกว่า “use previous frame”.

### Same-scene vs Scene-change

- **ฉากเดิม → ฉากเดิม:** match product + hands/body + props + framing + lighting + background anchors
- **ฉากโต๊ะ → ฉากห้อง:** match product screen position/orientation/scale + pose/action rhythm แต่เปลี่ยน background เป็น Scene B ทันที ห้าม morph โต๊ะเข้าไปในห้อง

### Sequential Fidelity Mode
สำหรับคุณภาพสูงสุด:

```text
BC_01 generate
→ capture final frame
→ upload final frame
→ select ending move
→ reinforce BC_02
→ generate BC_02
→ capture final frame
→ reinforce BC_03
→ ...
```

Master Agent Pack ยังใช้ได้สำหรับ batch แต่ Sequential Fidelity Mode จะต่อเนื่องกว่าเพราะใช้ผลลัพธ์จริงของคลิปก่อนหน้า
