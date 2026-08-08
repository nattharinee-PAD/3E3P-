# 3E3P-v2 (แรงจูงใจ)

แบบประเมิน **3E3P (แรงจูงใจ)** v2 — Rating 1-5 + Radar Chart

🌐 **Live:** https://nattharinee-PAD.github.io/3E3P-/3E3P-v2/

## โครงสร้างใหม่ (v2)

| Section | เนื้อหา | ประเภท | Required |
|---|---|---|---|
| 0 | ข้อมูลสมาชิก | กรอกรหัส 7 หลัก → ดึงชื่อ + BU | ✅ |
| 0.5 | สถานะ | เลือกประเภท + sub-form | ✅ |
| **1** | **แรงจูงใจในการทำงานอยู่ในปัจจุบัน** | **Rating 1-5 × 6 items + Radar Chart** | ✅ ครบ 6 ข้อ |

> ❌ ลบ Section 1 (multi-choice เดิม), Section 2 (ranking), Section 3 (อธิบาย)

## Rating Items & Weights

| Key | ข้อความ | Weight | Max |
|---|---|---|---|
| **A** | ข้าพเจ้ารู้สึกสนุกสนานกับการทำงานใน PKG | × 10 | 50 |
| **B** | องค์กร PKG สามารถตอบโจทย์ตามจุดมุ่งหมายของข้าพเจ้า | × 5 | 25 |
| **C** | องค์กร PKG นี้ทำให้ข้าพเจ้าใช้ความสามารถได้อย่างเต็มประสิทธิภาพ | × 1.66 | 8.30 |
| **D** | ข้าพเจ้ามีความคิดเห็นว่าการทำงานคือหน้าที่ของทุกๆคน | × 1.66 | 8.30 |
| **E** | ข้าพเจ้ามาทำงานเพราะต้องการค่าตอบแทนเพื่อเลี้ยงครอบครัว | × 5 | 25 |
| **F** | ข้าพเจ้าไม่มีแรงจูงใจในการทำงาน | × 10 | 50 |
| | **Max Total** | | **166.60** |

## Stack

- Frontend: HTML + Vanilla JS + **Chart.js 4.4** (radar)
- Backend: GAS v4 + Google Sheet
  - Sheet ID: `1XOK2R9PkCucbHMbCc8Nl69t9KjTjzk1CqBAvFNyubHE`
  - Member lookup: `gid=0` (PKGemployee)
  - Submissions: `gid=634702585` (3E3P_Submissions)

## Status
- Phase 1 (Mockup + Radar): ✅ Live
- Phase 2 (GAS backend): ⏸️ Wait (upload manual)

## Test IDs
- `6006083` → ณัฐฑริณี คำนึง (CPDG)
- `6407049` → ปวีร์ ผ่องโสภา (ทีม 21RT)
- `9005905` → เขมิกา หัตถวิจิตรกุล (AAMG)
- `9999999` → ทดสอบ ตัวอย่าง