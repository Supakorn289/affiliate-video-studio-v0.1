# Local Render — แผน v0.2

เป้าหมาย: ให้เว็บส่ง prompt + product image ไป ComfyUI แล้วรับ MP4 กลับมา โดยไม่เสียค่า Video API

## Model เริ่มต้น

แนะนำทดสอบ:
- Wan 2.2 TI2V 5B
- Image-to-Video
- Portrait 9:16
- เริ่มที่ความละเอียดต่ำ/กลางก่อนเพื่อวัด VRAM และเวลา

## API flow ที่จะต่อ

```text
POST /upload/image        -> อัปโหลดรูปสินค้าไป ComfyUI
POST /prompt              -> ส่ง workflow API JSON
GET  /history/{prompt_id} -> รอผล
GET  /view?...            -> ดึง MP4
```

## สิ่งที่ต้องเตรียมใน ComfyUI

1. เปิด ComfyUI
2. โหลด workflow Wan 2.2 Image-to-Video
3. ทดสอบให้ render จาก UI ได้ก่อน
4. Export เป็น API workflow JSON
5. จากนั้น map node:
   - LoadImage
   - Positive Prompt
   - Negative Prompt
   - Width / Height
   - Frame Length
   - Seed
   - SaveVideo
6. นำ JSON มาใส่ในโฟลเดอร์นี้

เมื่อ workflow ใช้งานได้แล้ว server จะทำ template substitution ให้โดยอัตโนมัติใน v0.2
