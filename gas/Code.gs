/**
 * 3E3P (แรงจูงใจ) — GAS Backend v2
 * Deploy Web App → ดึง HTML จาก GitHub
 */

// CONFIG
const SPREADSHEET_ID = '1XOK2R9PkCucbHMbCc8Nl69t9KjTjzk1CqBAvFNyubHE';
const MEMBER_TAB = 'PKGemployee';
const SUBMISSION_TAB = '3E3P_Motivation_Submissions';
const COL_ID = 1;       // A
const COL_FIRSTNAME = 3; // C
const COL_LASTNAME = 4;  // D
const COL_BU = 13;      // M (ฝ่าย)
const GITHUB_HTML_URL = 'https://raw.githubusercontent.com/nattharinee-PAD/3E3P-/main/gas/index.html';

const SUBMISSION_HEADERS = [
  'submission_id', 'timestamp', 'member_id', 'member_name', 'bu',
  'status', 'course', 'course_other',
  'motivation_initial_A', 'motivation_initial_B', 'motivation_initial_C',
  'motivation_initial_D', 'motivation_initial_E', 'motivation_initial_F',
  'motivation_current_rank1', 'motivation_current_rank2', 'motivation_current_rank3',
  'motivation_current_rank4', 'motivation_current_rank5', 'motivation_current_rank6',
  'motivation_detail', 'source'
];

const _memberCache = {};

// ENTRY POINTS
function doGet(e) {
  return HtmlService.createHtmlOutputFromUrl(GITHUB_HTML_URL)
    .setTitle('แบบฟอร์ม 3E3P (แรงจูงใจ) สมาชิก P5')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const result = saveSubmission(data);
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ok: false, error: err.message}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// MEMBER LOOKUP
function lookupMember(memberId) {
  if (_memberCache[memberId]) return _memberCache[memberId];
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(MEMBER_TAB);
    if (!sheet) return null;
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const id = String(row[COL_ID - 1]).trim();
      if (id === String(memberId).trim()) {
        const m = {
          id: id,
          name: (String(row[COL_FIRSTNAME - 1]).trim() + ' ' + String(row[COL_LASTNAME - 1]).trim()).trim(),
          bu: String(row[COL_BU - 1]).trim()
        };
        _memberCache[memberId] = m;
        return m;
      }
    }
    const idStr = String(memberId).trim();
    if (idStr.length >= 6) {
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const id = String(row[COL_ID - 1]).trim();
        if (id.startsWith(idStr)) {
          const m = {
            id: id,
            name: (String(row[COL_FIRSTNAME - 1]).trim() + ' ' + String(row[COL_LASTNAME - 1]).trim()).trim(),
            bu: String(row[COL_BU - 1]).trim()
          };
          _memberCache[memberId] = m;
          return m;
        }
      }
    }
    return null;
  } catch (err) {
    return { error: err.message };
  }
}

// SAVE
function saveSubmission(data) {
  const v = validateSubmission(data);
  if (!v.ok) return { ok: false, error: v.error };

  if (!data.member_name || !data.bu) {
    const m = lookupMember(data.member_id);
    if (!m || m.error) return { ok: false, error: 'ไม่พบรหัสสมาชิก: ' + data.member_id };
    data.member_name = data.member_name || m.name;
    data.bu = data.bu || m.bu;
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SUBMISSION_TAB);
  if (!sheet) {
    sheet = ss.insertSheet(SUBMISSION_TAB);
    sheet.getRange(1, 1, 1, SUBMISSION_HEADERS.length).setValues([SUBMISSION_HEADERS]);
    sheet.getRange(1, 1, 1, SUBMISSION_HEADERS.length)
      .setFontWeight('bold').setBackground('#667eea').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }

  const init = data.motivation_initial || [];
  const row = [
    data.submission_id, data.timestamp, data.member_id, data.member_name, data.bu,
    data.status || '', data.course || '', data.course_other || '',
    init.indexOf('A') >= 0, init.indexOf('B') >= 0, init.indexOf('C') >= 0,
    init.indexOf('D') >= 0, init.indexOf('E') >= 0, init.indexOf('F') >= 0,
    data.motivation_current.rank1 || '', data.motivation_current.rank2 || '',
    data.motivation_current.rank3 || '', data.motivation_current.rank4 || '',
    data.motivation_current.rank5 || '', data.motivation_current.rank6 || '',
    data.motivation_detail || '', data.source || '3E3P_Form'
  ];

  sheet.appendRow(row);
  for (let i = 1; i <= SUBMISSION_HEADERS.length; i++) sheet.autoResizeColumn(i);
  return { ok: true, row: sheet.getLastRow(), submission_id: data.submission_id };
}

// VALIDATE
function validateSubmission(data) {
  if (!data.submission_id) return { ok: false, error: 'missing submission_id' };
  if (!data.member_id) return { ok: false, error: 'missing member_id' };
  if (!data.status && !data.course) return { ok: false, error: 'status หรือ course ต้องเลือกอย่างน้อย 1' };
  if (data.course === 'อื่นๆ' && !data.course_other) return { ok: false, error: 'course_other required when course=อื่นๆ' };
  if (!data.motivation_initial || data.motivation_initial.length === 0) {
    return { ok: false, error: 'motivation_initial ต้องมีอย่างน้อย 1 ข้อ' };
  }
  if (!data.motivation_current) return { ok: false, error: 'missing motivation_current' };
  const mc = data.motivation_current;
  const rankVals = [mc.rank1, mc.rank2, mc.rank3, mc.rank4, mc.rank5, mc.rank6];
  if (rankVals.some(v => !v)) return { ok: false, error: 'rank1-6 ต้องครบ' };
  if (new Set(rankVals).size !== rankVals.length) return { ok: false, error: 'rank1-6 ต้องไม่ซ้ำกัน' };
  if (!data.motivation_detail || data.motivation_detail.length < 5) {
    return { ok: false, error: 'motivation_detail required (≥5 ตัวอักษร)' };
  }
  return { ok: true };
}

// SETUP
function setup() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SUBMISSION_TAB);
  if (!sheet) {
    sheet = ss.insertSheet(SUBMISSION_TAB);
    Logger.log('✅ Created: ' + SUBMISSION_TAB);
  } else {
    Logger.log('⚠️ Exists: ' + SUBMISSION_TAB);
  }
  sheet.getRange(1, 1, 1, SUBMISSION_HEADERS.length).setValues([SUBMISSION_HEADERS]);
  sheet.getRange(1, 1, 1, SUBMISSION_HEADERS.length)
    .setFontWeight('bold').setBackground('#667eea').setFontColor('#ffffff');
  sheet.setFrozenRows(1);
  for (let i = 1; i <= SUBMISSION_HEADERS.length; i++) sheet.autoResizeColumn(i);
  Logger.log('✅ setup() done — 22 cols + frozen + format');
  return { ok: true, tab: SUBMISSION_TAB, headers: SUBMISSION_HEADERS.length };
}
