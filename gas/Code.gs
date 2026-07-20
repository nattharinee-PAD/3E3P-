/**
 * 3E3P (แรงจูงใจ) — GAS Backend FINAL
 * -----------------------------------------
 * Project: แบบฟอร์ม 3E3P (แรงจูงใจ) สมาชิก P5 ระบบพัฒนาบุคคลากร
 * Owner: ลูกหมี (LDC-PAD-ณัฐฑริณี)
 * Date: 2026-07-20
 * Version: 2.0 (Spec v2.0)
 * Sheet: 1XOK2R9PkCucbHMbCc8Nl69t9KjTjzk1CqBAvFNyubHE
 *
 * === SETUP (ทำครั้งเดียว) ===
 * 1. เปิด Google Sheet: 1XOK2R9PkCucbHMbCc8Nl69t9KjTjzk1CqBAvFNyubHE
 * 2. Extensions > Apps Script
 * 3. ลบ Code.gs เดิม → paste ไฟล์นี้
 * 4. กด Save (Ctrl+S)
 * 5. Run ฟังก์ชัน `setup()` ครั้งแรก (จะขอ OAuth)
 *    - สร้าง tab "3E3P_Motivation_Submissions" (auto)
 *    - ตั้ง header row + freeze + format
 * 6. Deploy > New deployment > Web app
 *    - Description: 3E3P v2
 *    - Execute as: Me
 *    - Who has access: Anyone (หรือ Anyone within PKG)
 * 7. Copy Web App URL → ใช้เปิดหน้าเว็บ
 */

// ============================================================
// CONFIG
// ============================================================
const SPREADSHEET_ID = '1XOK2R9PkCucbHMbCc8Nl69t9KjTjzk1CqBAvFNyubHE';
const MEMBER_TAB = 'PKGemployee';
const SUBMISSION_TAB = '3E3P_Motivation_Submissions';

// Member sheet column mapping (1-indexed)
const COL_ID = 1;        // A - รหัสสมาชิก (7 หลัก)
const COL_FIRSTNAME = 3; // C - ชื่อ
const COL_LASTNAME = 4;  // D - นามสกุล
const COL_BU = 13;       // M - ฝ่าย (BU)

// Submission tab header (22 columns A-V)
const SUBMISSION_HEADERS = [
  'submission_id',             // A
  'timestamp',                 // B
  'member_id',                 // C
  'member_name',               // D
  'bu',                        // E
  'status',                    // F
  'course',                    // G
  'course_other',              // H
  'motivation_initial_A',      // I
  'motivation_initial_B',      // J
  'motivation_initial_C',      // K
  'motivation_initial_D',      // L
  'motivation_initial_E',      // M
  'motivation_initial_F',      // N
  'motivation_current_rank1',  // O
  'motivation_current_rank2',  // P
  'motivation_current_rank3',  // Q
  'motivation_current_rank4',  // R
  'motivation_current_rank5',  // S
  'motivation_current_rank6',  // T
  'motivation_detail',         // U
  'source'                     // V
];

// Motivation labels (A-F)
const MOTIVATION_LABELS = {
  initial: {
    A: 'ข้าพเจ้ารู้สึกสนุกสนานกับการทำงานใน PKG',
    B: 'องค์กร PKG สามารถตอบโจทย์ตามจุดมุ่งหมายของข้าพเจ้า',
    C: 'องค์กร PKG นี้ทำให้ข้าพเจ้าใช้ความสามารถได้อย่างเต็ม ประสิทธิภาพ',
    D: 'ข้าพเจ้ามีความคิดเห็นว่าการทำงานคือหน้าที่ของทุกๆคน',
    E: 'ข้าพเจ้ามาทำงานเพราะต้องการค่าตอบแทนเพื่อเลี้ยง ครอบครัว',
    F: 'ข้าพเจ้าไม่มีแรงจูงใจในการทำงาน'
  },
  current: {
    A: 'ข้าพเจ้ารู้สึกสนุกสนานกับการทำงานใน PKG',
    B: 'องค์กร PKG สามารถตอบโจทย์ตามจุดมุ่งหมายของข้าพเจ้า',
    C: 'องค์กร PKG นี้ทำให้ข้าพเจ้าใช้ความสามารถได้อย่างเต็ม ประสิทธิภาพ',
    D: 'ข้าพเจ้ามีความคิดเห็นว่าการทำงานคือหน้าที่ของทุกๆคน',
    E: 'ข้าพเจ้ามาทำงานเพราะต้องการค่าตอบแทนเพื่อเลี้ยง ครอบครัว',
    F: 'ข้าพเจ้าไม่มีแรงจูงใจในการทำงาน'
  }
};

// Cache for member lookup (reduce Sheet reads)
const _memberCache = {};

// ============================================================
// ENTRY POINTS
// ============================================================

/**
 * doGet — return HTML form (for direct browser visit)
 */
function doGet(e) {
  return HtmlService
    .createTemplateFromFile('index')
    .evaluate()
    .setTitle('แบบฟอร์ม 3E3P (แรงจูงใจ) สมาชิก P5')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * doPost — receive JSON submission
 * Expected payload: see 02-data-schema.json
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const result = saveSubmission(data);
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({
        ok: false,
        error: err.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * API for client-side: lookup member by ID
 * Called via google.script.run from HTML
 */
function lookupMember(memberId) {
  // Check cache first
  if (_memberCache[memberId]) return _memberCache[memberId];

  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(MEMBER_TAB);
    if (!sheet) return null;

    const data = sheet.getDataRange().getValues();

    // Try exact match first
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const id = String(row[COL_ID - 1]).trim();
      if (id === String(memberId).trim()) {
        const firstname = String(row[COL_FIRSTNAME - 1]).trim();
        const lastname = String(row[COL_LASTNAME - 1]).trim();
        const bu = String(row[COL_BU - 1]).trim();
        const member = {
          id: id,
          name: (firstname + ' ' + lastname).trim(),
          bu: bu
        };
        _memberCache[memberId] = member;
        return member;
      }
    }

    // Prefix match (for partial ID input)
    const idStr = String(memberId).trim();
    if (idStr.length >= 6) {
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const id = String(row[COL_ID - 1]).trim();
        if (id.startsWith(idStr)) {
          const firstname = String(row[COL_FIRSTNAME - 1]).trim();
          const lastname = String(row[COL_LASTNAME - 1]).trim();
          const bu = String(row[COL_BU - 1]).trim();
          const member = {
            id: id,
            name: (firstname + ' ' + lastname).trim(),
            bu: bu
          };
          _memberCache[memberId] = member;
          return member;
        }
      }
    }

    return null;
  } catch (err) {
    return { error: err.message };
  }
}

// ============================================================
// CORE FUNCTIONS
// ============================================================

/**
 * saveSubmission — บันทึกข้อมูลลง Sheet
 */
function saveSubmission(data) {
  // 1. Validate
  const validation = validateSubmission(data);
  if (!validation.ok) {
    return { ok: false, error: validation.error };
  }

  // 2. Lookup member (auto-fill if missing)
  if (!data.member_name || !data.bu) {
    const member = lookupMember(data.member_id);
    if (!member || member.error) {
      return { ok: false, error: 'ไม่พบรหัสสมาชิก: ' + data.member_id };
    }
    data.member_name = data.member_name || member.name;
    data.bu = data.bu || member.bu;
  }

  // 3. Get or create submission sheet
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SUBMISSION_TAB);
  if (!sheet) {
    sheet = ss.insertSheet(SUBMISSION_TAB);
    sheet.getRange(1, 1, 1, SUBMISSION_HEADERS.length).setValues([SUBMISSION_HEADERS]);
    sheet.getRange(1, 1, 1, SUBMISSION_HEADERS.length)
      .setFontWeight('bold')
      .setBackground('#667eea')
      .setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }

  // 4. Build row
  const initial = data.motivation_initial || [];
  const initialA = initial.indexOf('A') >= 0;
  const initialB = initial.indexOf('B') >= 0;
  const initialC = initial.indexOf('C') >= 0;
  const initialD = initial.indexOf('D') >= 0;
  const initialE = initial.indexOf('E') >= 0;
  const initialF = initial.indexOf('F') >= 0;

  const row = [
    data.submission_id,
    data.timestamp,
    data.member_id,
    data.member_name,
    data.bu,
    data.status || '',
    data.course || '',
    data.course_other || '',
    initialA, initialB, initialC, initialD, initialE, initialF,
    data.motivation_current.rank1 || '',
    data.motivation_current.rank2 || '',
    data.motivation_current.rank3 || '',
    data.motivation_current.rank4 || '',
    data.motivation_current.rank5 || '',
    data.motivation_current.rank6 || '',
    data.motivation_detail || '',
    data.source || '3E3P_Form'
  ];

  // 5. Append
  sheet.appendRow(row);

  // 6. Auto-resize columns
  for (let i = 1; i <= SUBMISSION_HEADERS.length; i++) {
    sheet.autoResizeColumn(i);
  }

  return {
    ok: true,
    row: sheet.getLastRow(),
    submission_id: data.submission_id
  };
}

/**
 * validateSubmission — ตรวจสอบข้อมูลก่อนบันทึก
 */
function validateSubmission(data) {
  if (!data.submission_id) return { ok: false, error: 'missing submission_id' };
  if (!data.member_id) return { ok: false, error: 'missing member_id' };
  // status + course: optional แต่ต้องเลือกอย่างน้อย 1
  if (!data.status && !data.course) return { ok: false, error: 'status หรือ course ต้องเลือกอย่างน้อย 1' };
  if (data.course === 'อื่นๆ' && !data.course_other) return { ok: false, error: 'course_other required when course=อื่นๆ' };
  if (!data.motivation_initial || data.motivation_initial.length === 0) {
    return { ok: false, error: 'motivation_initial ต้องมีอย่างน้อย 1 ข้อ' };
  }
  if (!data.motivation_current) return { ok: false, error: 'missing motivation_current' };
  const mc = data.motivation_current;
  const rankVals = [mc.rank1, mc.rank2, mc.rank3, mc.rank4, mc.rank5, mc.rank6];
  if (rankVals.some(v => !v)) {
    return { ok: false, error: 'motivation_current.rank1-6 ต้องครบ' };
  }
  if (new Set(rankVals).size !== rankVals.length) {
    return { ok: false, error: 'rank1-6 ต้องไม่ซ้ำกัน' };
  }
  if (!data.motivation_detail || data.motivation_detail.length < 5) {
    return { ok: false, error: 'motivation_detail required (อย่างน้อย 5 ตัวอักษร)' };
  }
  return { ok: true };
}

/**
 * setup — สร้าง tab + header (run ครั้งเดียว)
 */
function setup() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SUBMISSION_TAB);

  if (!sheet) {
    sheet = ss.insertSheet(SUBMISSION_TAB);
    Logger.log('✅ สร้าง tab ใหม่: ' + SUBMISSION_TAB);
  } else {
    Logger.log('⚠️ tab มีอยู่แล้ว: ' + SUBMISSION_TAB);
  }

  // Add headers
  sheet.getRange(1, 1, 1, SUBMISSION_HEADERS.length).setValues([SUBMISSION_HEADERS]);
  sheet.getRange(1, 1, 1, SUBMISSION_HEADERS.length)
    .setFontWeight('bold')
    .setBackground('#667eea')
    .setFontColor('#ffffff');
  sheet.setFrozenRows(1);

  // Auto-resize columns
  for (let i = 1; i <= SUBMISSION_HEADERS.length; i++) {
    sheet.autoResizeColumn(i);
  }

  Logger.log('✅ setup() สำเร็จ — header row + frozen + format พร้อม');
  return { ok: true, tab: SUBMISSION_TAB, headers: SUBMISSION_HEADERS.length };
}

/**
 * getMotivationLabels — ส่ง labels ให้ client (A-F)
 */
function getMotivationLabels() {
  return MOTIVATION_LABELS;
}

// ============================================================
// TEST HELPERS (Phase 2 — ลบทิ้งหลัง deploy)
// ============================================================

/**
 * testLookup — ทดสอบ lookup member
 */
function testLookup(memberId) {
  const member = lookupMember(memberId);
  Logger.log(JSON.stringify(member, null, 2));
  return member;
}

/**
 * testSave — ทดสอบ save submission
 */
function testSave() {
  const mockData = {
    submission_id: 'sub_test_' + Date.now(),
    timestamp: new Date().toISOString(),
    member_id: '6006083',
    member_name: 'ณัฐฑริณี คำนึง',
    bu: 'CPDG - ทีมบริหารหลักสูตร',
    status: 'สมาชิกกรายวัน',
    course: 'ปฐมนิเทศ Mini',
    course_other: '',
    motivation_initial: ['A', 'C', 'E'],
    motivation_current: { rank1: 'A', rank2: 'B', rank3: 'C', rank4: 'D', rank5: 'E', rank6: 'F' },
    motivation_detail: 'ทดสอบระบบ P5 - live test',
    source: '3E3P_Form'
  };
  const result = saveSubmission(mockData);
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

/**
 * include — helper for HTML template
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
