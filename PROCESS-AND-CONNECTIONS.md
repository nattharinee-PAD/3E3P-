# 🏗️ 3E3P — กระบวนการทำงาน + เงื่อนไขการเชื่อมโยง

> **เว็บไซต์:** แบบประเมิน 3E3P (แรงจูงใจ) สมาชิก P5
> **URL:** https://nattharinee-PAD.github.io/3E3P-/
> **Repo:** `nattharinee-PAD/3E3P-`
> **Owner:** ลูกหมี (ณัฐฑริณี) · **Maker:** ต้าเป่า
> **วันที่จัดทำ:** 8 ส.ค. 2569

---

## 🎯 ภาพรวม (Architecture Overview)

```
┌────────────────────────────────────────────────────────────────────┐
│                    🌍 USER (สมาชิก P5)                              │
│              เปิด https://nattharinee-PAD.github.io/3E3P-/           │
└────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌────────────────────────────────────────────────────────────────────┐
│          📄 FRONTEND (GitHub Pages — nattharinee-PAD/3E3P-)         │
│ ┌──────────────────────────────────────────────────────────────┐   │
│ │  index.html (141 KB)                                          │   │
│ │  • HTML form 5 Sections + Vanilla JS                         │   │
│ │  • CSP: script-src 'self' 'unsafe-inline' + Google endpoints │   │
│ │  • Anti-bot: honeypot + form_load_time                        │   │
│ └──────────────────────────────────────────────────────────────┘   │
│ ┌──────────────────────────────────────────────────────────────┐   │
│ │  _mock-data.js (109 KB) — 479 สมาชิก                         │   │
│ │  • Source: docs.google.com/spreadsheets/d/                   │   │
│ │    1XOK2R9PkCucbHMbCc8Nl69t9KjTjzk1CqBAvFNyubHE              │   │
│ │  • Snapshot: 2026-07-20                                       │   │
│ │  • Key: REAL_MEMBERS[] (id/name/bu/pos)                       │   │
│ │  • Lookup: lookupMember(id) — debounce 300ms                  │   │
│ └──────────────────────────────────────────────────────────────┘   │
│ ┌──────────────────────────────────────────────────────────────┐   │
│ │  pad-dashboard.html (Dashboard PAD-02 daily)                  │   │
│ │  • Source: 1kVePNmh6WnqJxdLk5uJd8kjw5xAA6M-G3Fx2uyZVJlc       │   │
│ └──────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌────────────────────────────────────────────────────────────────────┐
│            ⚙️  BACKEND (Google Apps Script — GAS)                   │
│ ┌──────────────────────────────────────────────────────────────┐   │
│ │  gas/Code.gs (6.8 KB)                                         │   │
│ │  • doGet(e) / doPost(e) — handle submission                   │   │
│ │  • appendToSheet(payload) — write row to Sheet                │   │
│ └──────────────────────────────────────────────────────────────┘   │
│ ┌──────────────────────────────────────────────────────────────┐   │
│ │  gas/index.html (33 KB)                                       │   │
│ │  • Reuses logic from root index.html (or simplified)          │   │
│ └──────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌────────────────────────────────────────────────────────────────────┐
│                   📊 GOOGLE SHEETS (Backend Storage)                │
│ ┌──────────────────────────────────────────────────────────────┐   │
│ │  Sheet A — Member Master                                      │   │
│ │  ID: 1XOK2R9PkCucbHMbCc8Nl69t9KjTjzk1CqBAvFNyubHE            │   │
│ │  Tab: สมาชิก (479 rows)                                       │   │
│ │  Cols: รหัส | ชื่อ | BU | ตำแหน่ง                             │   │
│ └──────────────────────────────────────────────────────────────┘   │
│ ┌──────────────────────────────────────────────────────────────┐   │
│ │  Sheet B — 3E3P Submissions (Phase 2 — ยังไม่เริ่มใช้)        │   │
│ │  Source payload จาก form                                      │   │
│ └──────────────────────────────────────────────────────────────┘   │
│ ┌──────────────────────────────────────────────────────────────┐   │
│ │  Sheet C — PAD-02 Daily Report                                │   │
│ │  ID: 1kVePNmh6WnqJxdLk5uJd8kjw5xAA6M-G3Fx2uyZVJlc            │   │
│ │  Layout: A=metric, B=value, C=unit                            │   │
│ │  Sections: *Training, *Roleplay, *Mentor, *Coach, AP, BP,     │   │
│ │            LL, II, XP, 📝Daily Comments                      │   │
│ └──────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────┘
```

---

## 📋 กระบวนการทำงาน (Process Flow)

### 📌 Flow หลัก: สมาชิกกรอกฟอร์ม

```
[1] เปิด URL https://nattharinee-PAD.github.io/3E3P-/
    ↓
[2] HTML โหลด → สร้าง form_load_time = Date.now() (anti-bot)
    ↓
[3] Honeypot field (website_hp) ถูกซ่อน — ต้องเว้นว่าง
    ↓
[4] User กรอก Section 0: รหัสสมาชิก 7 หลัก
    ↓
[5] ⏱ debounce 300ms → lookupMember(id) ใน MOCK_MEMBERS
    ↓
    ┌─────────────────────────────────────┐
    │  เงื่อนไข: id.length >= 6?         │
    │  ├─ YES → ค้นหาใน MOCK_MEMBERS     │
    │  └─ NO  → ยังไม่ค้นหา (รอพิมพ์ต่อ) │
    └─────────────────────────────────────┘
    ↓
[6] ผลลัพธ์ 2 ทาง:
    ├─ ✅ เจอ → autofill name + BU (remove error class)
    └─ ❌ ไม่เจอ → แดง + "ไม่พบรหัสสมาชิกนี้ในระบบ"
    ↓
[7] Section 0.5: เลือกประเภท (status / course)
    ↓
[8] toggleAssessmentType() — แสดง sub-form ที่เลือก + ซ่อน dropdown
    ↓
[9] Section 1: เลือก motivation แรก (multi-choice ≥ 1)
    ↓
[10] Section 2: Ranking 1-6 (option ที่เลือกแล้วถูก disable ใน dropdown อื่น)
    ↓
[11] Section 3: textarea ≥ 5 ตัวอักษร
    ↓
[12] กดส่ง → onsubmit handler
    ↓
[13] 🔒 Validation chain:
    • memberId ต้อง valid
    • assessmentType ต้องเลือก
    • sub-field ต้องเลือก
    • motivation_initial ≥ 1
    • motivation_current ครบ 6 + ไม่ซ้ำ
    • motivation_detail ≥ 5 chars
    • website_hp ต้องว่าง (anti-bot)
    • form_load_time ต้อง > 3s (กัน bot)
    ↓
[14] ✅ PASS → POST to GAS endpoint
    ↓
[15] GAS: doPost(e) → parse payload → appendToSheet()
    ↓
[16] 📊 Sheet B (3E3P Submissions) เพิ่ม row ใหม่
    ↓
[17] 🎉 Success message → form reset
```

---

## 🔗 เงื่อนไขการเชื่อมโยง (Connection Conditions)

### 🅰️ Section 0 → Mock Data Connection

| Condition | Action |
|---|---|
| `id.length === 0` | Clear name + BU, ลบ error class |
| `id.length < 6` | ไม่ค้นหา (รอพิมพ์ต่อ) |
| `id.length >= 6` (after 300ms) | ค้นหาใน `MOCK_MEMBERS[id]` |
| ตรง match | ✅ autofill name + BU |
| ไม่ตรง → ตรวจ `key.startsWith(id)` | ✅ partial match (รองรับ 6 หลัก) |
| ไม่เจอทั้งคู่ | ❌ แดง + "ไม่พบรหัสสมาชิกนี้ในระบบ" |

```javascript
// Lookup logic จาก _mock-data.js
function lookupMember(id) {
  if (MOCK_MEMBERS[id]) return MOCK_MEMBERS[id];   // exact match
  if (id.length >= 6) {
    for (const key of Object.keys(MOCK_MEMBERS)) {
      if (key.startsWith(id)) return MOCK_MEMBERS[key];  // partial
    }
  }
  return null;
}
```

### 🅱️ Section 0.5 → Sub-form Connection

| Selected | Hidden | Visible |
|---|---|---|
| `""` (ยังไม่เลือก) | `#statusBlock`, `#courseBlock` | `#assessmentTypeBlock` |
| `"status"` | `#assessmentTypeBlock`, `#courseBlock` | `#statusBlock` |
| `"course"` | `#assessmentTypeBlock`, `#statusBlock` | `#courseBlock` |

**Sub-form dependencies:**
- Course = `"อื่นๆ"` → แสดง `#otherCourseGroup` (required)
- Course ≠ `"อื่นๆ"` → ซ่อน `#otherCourseGroup`

### 🅲 Section 1 → Section 2 Connection

- Section 1 options (A-F) = Section 2 options (A-F) — **ใช้ชุดเดียวกัน**
- Section 1 = **multi-choice** (เลือกได้หลายข้อ)
- Section 2 = **ranking** (ห้ามซ้ำ — แต่ละ A-F ใช้ได้แค่ 1 ครั้ง)
- Section 2 มี **disable logic** เมื่อ option ถูกเลือกใน dropdown อื่น

```
Section 1: เลือก A, B, C → ไม่มีผลต่อ Section 2
Section 2: เลือก 1=A → dropdown อื่น disable A
```

### 🅳 Validation Chain (Section 0 → 1 → 2 → 3)

```
Section 0 ─┐
           ├─→ [BLOCK] ถ้า memberId ไม่ valid → หยุดทันที
Section 0.5┤
           ├─→ [BLOCK] ถ้า assessmentType/sub-field ว่าง → หยุด
Section 1 ─┤
           ├─→ [BLOCK] ถ้า motivation_initial ว่าง → หยุด
Section 2 ─┤
           ├─→ [BLOCK] ถ้า rank ไม่ครบ 6 หรือซ้ำ → หยุด
Section 3 ─┘
           └─→ [BLOCK] ถ้า motivation_detail < 5 chars → หยุด

✅ ALL PASS → submit
```

---

## 📡 Data Flow: Frontend → Backend → Sheet

### Payload Structure (JSON)

```json
{
  "submission_id": "sub_<timestamp>_<random>",
  "timestamp": "2026-08-08T09:05:10+07:00 (ISO 8601)",
  "member_id": "6006083",
  "member_name": "ณัฐฑริณี คำนึง",
  "bu": "CPDG - ทีมบริหารหลักสูตร",
  "assessment_type": "status | course",
  "status": "สมาชิกกราบวัน (ถ้าเลือก status)",
  "course": "ปฐมนิเทศ Mini (ถ้าเลือก course)",
  "course_other": "(ถ้า course=อื่นๆ)",
  "motivation_initial": ["A", "C", "D"],
  "motivation_current": {
    "rank1": "A",
    "rank2": "B",
    "rank3": "C",
    "rank4": "D",
    "rank5": "E",
    "rank6": "F"
  },
  "motivation_detail": "...",
  "source": "3E3P_Form"
}
```

### Connection Path (Phase 2 — Plan)

```
index.html
    │ POST (JSON)
    ▼
gas/Code.gs : doPost(e)
    │ parse payload
    ▼
gas/Code.gs : appendToSheet(payload)
    │ append row
    ▼
Sheet B (3E3P Submissions)
    │
    ├──→ Dashboard view (อนาคต)
    ├──→ Reporting (อนาคต)
    └──→ Notification (อนาคต)
```

---

## 🛡️ Security & Anti-Bot Conditions

| Layer | Condition | Effect |
|---|---|---|
| **CSP** | `script-src 'self' 'unsafe-inline'` + Google endpoints | Block external scripts |
| **Honeypot** | `website_hp` ต้องเว้นว่าง | Bot จะกรอก → reject |
| **Timing** | `form_load_time - now > 3s` | Bot ส่งเร็วเกินไป → reject |
| **X-Frame-Options** | `DENY` | ป้องกัน clickjacking |
| **Referrer-Policy** | `no-referrer` | ป้องกัน referrer leak |
| **Permissions-Policy** | `geolocation/microphone/camera/payment=()` | Block ทุก permission |
| **robots** | `noindex, nofollow, noarchive, nosnippet` | ป้องกัน search engine |

---

## 🔄 Cron + PAD-02 Dashboard Flow

```
[⏰ Cron: ทุกวัน 16:30 Bangkok]
    │
    ▼
fetch_pad_daily.js : fetchPADData()
    │
    │ GET https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv
    ▼
parseCSV() → extractSections()
    │
    │ detect sections by `*` prefix
    │ colA = metric, colB = value, colC = unit
    ▼
JSON structure:
{
  ok: true,
  training: { metric1: {label, value, unit}, cheer_up: {...} },
  roleplay: { ... },
  mentor: { ... },
  coach: { ... },
  ap: [{num, text}, ...],
  daily_comments: [...],
  ...
}
    │
    ▼
build_summary.js : buildSummary()
    │
    │ Format → Telegram message (เรียนแบบพี่แนน)
    ▼
📨 ส่ง Telegram message + Dashboard link
    │
    ▼
[Dashboard live URL]
https://nattharinee-PAD.github.io/3E3P-/pad-dashboard.html
    │
    │ Browser → fetch CSV จาก Sheet C (real-time)
    ▼
    แสดง 4 KPI cards + AP list + Comments
```

### Section Detection Rule (Sheet C)

```
Row A starts with "*" → section header
*Training → currentSection = "training"
*Roleplay → currentSection = "roleplay"
*Mentor → currentSection = "mentor"
*Coach → currentSection = "coach"
AP → currentList = sections.ap
📝Daily Comments → currentList = sections.daily_comments
BP / LL / II / XP → single-column sections
```

---

## 🚀 Deploy Workflow

```
┌─────────────────────────────────────────────────────────────┐
│  Local Repo: /home/admin/.openclaw/workspace/3E3P/          │
└─────────────────────────────────────────────────────────────┘
    │
    │ git add + commit
    ▼
GIT_SSH_COMMAND="ssh -i ~/.ssh/3e3p-deploy -o IdentitiesOnly=yes"
    │
    │ git push origin main
    ▼
┌─────────────────────────────────────────────────────────────┐
│  GitHub: nattharinee-PAD/3E3P-                              │
│  • Deploy: GitHub Pages auto (~30s)                         │
│  • Branch: main only                                        │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  Live URLs:                                                 │
│  • https://nattharinee-PAD.github.io/3E3P-/                 │
│  • https://nattharinee-PAD.github.io/3E3P-/pad-dashboard.html│
└─────────────────────────────────────────────────────────────┘
```

### ⚠️ SSH Key Safety

| Key | Scope | ใช้กับ |
|---|---|---|
| `~/.ssh/3e3p-deploy` (ED25519) | read+write เฉพาะ `nattharinee-PAD/3E3P-` | ✅ 3E3P repo |
| อื่นๆ (likepoint-2.0-deploy, etc.) | — | ❌ ห้ามใช้กับ 3E3P |

**Override SSH config:**
```bash
GIT_SSH_COMMAND="ssh -i ~/.ssh/3e3p-deploy -o IdentitiesOnly=yes" \
  git push origin main
```

---

## 🔁 Connection Map (ทุก Node ในระบบ)

```
            ┌─────────────────────────────────────┐
            │  🌐 USER (สมาชิก P5 / Admin / Dev)  │
            └────────────┬────────────────────────┘
                         │
        ┌────────────────┼─────────────────┐
        │                │                 │
        ▼                ▼                 ▼
   [Form Input]    [Dashboard View]   [Cron 16:30]
        │                │                 │
        │                │                 │
        ▼                ▼                 ▼
┌─────────────┐  ┌──────────────┐  ┌──────────────────┐
│ index.html  │  │ pad-dashboard│  │ fetch_pad_daily  │
│  (5 form)   │  │    .html     │  │      .js         │
└──────┬──────┘  └──────┬───────┘  └─────────┬────────┘
       │                │                    │
       │ ใช้ mock data   │                    │
       ▼                │                    │
┌─────────────┐         │                    │
│ _mock-data  │         │                    │
│   .js       │         │                    │
│ (479 members│         │                    │
│  lookup)    │         │                    │
└──────┬──────┘         │                    │
       │                │                    │
       │ Phase 2        │                    │
       ▼                │                    │
┌─────────────┐         │                    │
│  gas/Code.gs│         │                    │
│  (doPost)   │         │                    │
└──────┬──────┘         │                    │
       │                │                    │
       ▼                ▼                    ▼
┌─────────────────────────────────────────────────┐
│          📊 GOOGLE SHEETS (3 Sheets)            │
├─────────────────────────────────────────────────┤
│ Sheet A: Member Master (479 rows)               │
│   └─→ _mock-data.js sync (snapshot 2026-07-20) │
│                                                 │
│ Sheet B: 3E3P Submissions (Phase 2 — planned)  │
│   └─→ gas/Code.gs append                        │
│                                                 │
│ Sheet C: PAD-02 Daily Report                    │
│   └─→ fetch_pad_daily.js (CSV)                  │
│   └─→ pad-dashboard.html (CSV)                  │
└─────────────────────────────────────────────────┘
```

---

## ⚙️ Conditions Summary (ตารางรวม)

| # | Condition | Trigger | Effect |
|---|---|---|---|
| 1 | `id.length >= 6` (after 300ms debounce) | Section 0 typing | Lookup member |
| 2 | Member found in MOCK_MEMBERS | Lookup result | Autofill name + BU |
| 3 | Member not found | Lookup result | ❌ Error "ไม่พบรหัสสมาชิกนี้ในระบบ" |
| 4 | `assessmentType` selected | Section 0.5 select | Show sub-form + hide type dropdown |
| 5 | Course = "อื่นๆ" | Section 0.5 sub-form | Show otherCourse field |
| 6 | `motivation_initial.length >= 1` | Section 1 submit | ✅ Pass |
| 7 | `motivation_current` rank 1-6 unique | Section 2 submit | ✅ Pass |
| 8 | `motivation_detail.length >= 5` | Section 3 submit | ✅ Pass |
| 9 | `website_hp === ''` | Submit | ✅ Anti-bot pass |
| 10 | `now - form_load_time > 3000ms` | Submit | ✅ Anti-bot pass |
| 11 | Section detect starts with `*` in colA | CSV parse | Switch currentSection |
| 12 | `colA === "AP"` | CSV parse | Start AP list |
| 13 | Cron triggers at 16:30 Bangkok | Daily | Send Telegram + dashboard link |
| 14 | `cheer_up` keyword in colA | CSV parse | Special metric (percentage) |

---

## 📂 File Inventory (อ้างอิง)

| Path | Size | Purpose |
|---|---|---|
| `3E3P/index.html` | 141 KB | Main form (GitHub Pages) |
| `3E3P/_mock-data.js` | 109 KB | 479 members lookup |
| `3E3P/pad-dashboard.html` | ~12 KB | PAD-02 dashboard |
| `3E3P/gas/Code.gs` | 6.8 KB | GAS backend (doPost) |
| `3E3P/gas/index.html` | 33 KB | GAS HTML |
| `3E3P/README.md` | 0.5 KB | Repo overview |
| `3E3P/USER_MANUAL.md` | ~14 KB | User guide |
| `pad-dashboard/fetch_pad_daily.js` | 6.4 KB | Fetcher (Node) |
| `pad-dashboard/build_summary.js` | 7.6 KB | Telegram formatter |

---

## 🔄 Version Log (3E3P repo)

| Date | Commit | Note |
|---|---|---|
| 3 ส.ค. 2569 | `4bdb8ed` | revert 2-Tab merge (single tab) |
| 3 ส.ค. 2569 | `af7ed53` | remove section weight badges (initial) |
| 7 ส.ค. 2569 | `843c8eb` | restore badges 1/2/3 (keep 0/0.5 removed) |
| 7 ส.ค. 2569 | `9c6cc40` | hide test member IDs (reverted) |
| 7 ส.ค. 2569 | `1be030c` | revert 9c6cc40 |
| 7 ส.ค. 2569 | `42abc8f` | remove help-text "ทดสอบ..." |
| 7 ส.ค. 2569 | `cd8ebad` | feat: conditional assessment type dropdown |
| 7 ส.ค. 2569 | `e79d6c0` | rename section title → "สถานะ" |
| 7 ส.ค. 2569 | `1a2c062` | remove "Every voice matters" banner |
| 7 ส.ค. 2569 | `881832e` | feat: hide assessment type after selection |
| 7 ส.ค. 2569 | `52768d5` | fix: FULLY hide assessment type + remove change button |

---

## 🎯 Phase Status

| Phase | Description | Status |
|---|---|---|
| **Phase 1** | Mockup (HTML + Vanilla JS + Mock data) | ✅ Live |
| **Phase 2** | GAS + Google Sheet (real submission) | ⏸️ Wait (GAS code ready, upload pending) |

---

**จัดทำโดย:** ต้าเป่า
**วันที่:** 8 ส.ค. 2569
**ไฟล์:** `3E3P/PROCESS-AND-CONNECTIONS.md`
