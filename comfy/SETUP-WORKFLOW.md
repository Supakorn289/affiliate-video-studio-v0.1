# SETUP-WORKFLOW

เป้าหมายคือให้ BasketClip ส่ง prompt เข้า ComfyUI ได้จริง

## ขั้นตอน

1. เปิด ComfyUI
2. โหลด workflow ที่ใช้กับ Wan 2.2 / video model ที่เลือก
3. ทดสอบให้ render ผ่านจากหน้า ComfyUI ก่อน
4. Export เป็น API JSON
5. นำไฟล์ JSON ที่ export มาแก้ placeholders

## placeholders ที่ต้องใส่ใน workflow

- `__POSITIVE_PROMPT__`
- `__NEGATIVE_PROMPT__`
- `__PRODUCT_IMAGE__`
- `__SCENE_IMAGE__`
- `__WIDTH__`
- `__HEIGHT__`
- `__FRAMES__`
- `__FPS__`
- `__SEED__`
- `__FILENAME_PREFIX__`

## ตัวอย่างแนวคิดการ map

- Load Image สินค้า -> `__PRODUCT_IMAGE__`
- Load Image ฉาก -> `__SCENE_IMAGE__`
- CLIP Text Encode positive -> `__POSITIVE_PROMPT__`
- CLIP Text Encode negative -> `__NEGATIVE_PROMPT__`
- Empty Latent / video size -> `__WIDTH__`, `__HEIGHT__`
- Frame length -> `__FRAMES__`
- FPS / output settings -> `__FPS__`
- Seed -> `__SEED__`
- Save Video prefix -> `__FILENAME_PREFIX__`

## หมายเหตุ

ไฟล์ example ใช้เพื่อดูรูปแบบ placeholder เท่านั้น
ต้องเอา API JSON จริงจาก workflow ของตัวเองมาใช้
