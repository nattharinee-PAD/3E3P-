/**
 * 3E3P (แรงจูงใจ) — GAS Backend v3 (NEW)
 * Deploy: Web App → execute as "Me" → access "Anyone"
 * 
 * Sheet ID: 11ygxdfIqJNQvXsDzAr43YysZRBcP-gpS5sQ7oO_Z1Ak
 * - Tab "Submissions" — เก็บ submissions จากฟอร์ม
 * - Tab "PKGemployee" — เก็บข้อมูลสมาชิก (mock lookup)
 */

// =============================================================
// CONFIG
// =============================================================
const SPREADSHEET_ID = '11ygxdfIqJNQvXsDzAr43YysZRBcP-gpS5sQ7oO_Z1Ak';
const MEMBER_TAB = 'PKGemployee';
const SUBMISSION_TAB = 'Submissions';
const GITHUB_HTML_URL = 'https://raw.githubusercontent.com/nattharinee-PAD/3E3P-/main/gas/index.html';

// Rate limit (per IP) — ป้องกัน spam
const RATE_LIMIT_MAX = 10;          // max submits
const RATE_LIMIT_WINDOW = 600000;   // 10 min (ms)

// Honeypot field name
const HONEYPOT_FIELD = 'website_hp';

// =============================================================
// ENTRY POINTS
// =============================================================

/**
 * GET → แสดง HTML form จาก GitHub
 */
function doGet(e) {
  try {
    const response = UrlFetchApp.fetch('https://raw.githubusercontent.com/nattharinee-PAD/3E3P-/main/gas/index.html');
    const html = response.getContentText();
    return HtmlService.createHtmlOutput(html)
      .setTitle('แบบฟอร์ม 3E3P (แรงจูงใจ) สมาชิก P5')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (err) {
    return HtmlService.createHtmlOutput('<h1>⚠️ Cannot load form</h1><p>' + err.message + '</p>');
  }
}

/**
 * POST → รับ submission จาก form, validate, append row
 */
function doPost(e) {
  try {
    // ===== 1. Parse payload =====
    const data = JSON.parse(e.postData.contents);

    // ===== 2. Security checks =====
    // 2.1 Honeypot (anti-bot)
    if (data[HONEYPOT_FIELD] && data[HONEYPOT_FIELD] !== '') {
      logSuspicious('honeypot_triggered', data);
      return jsonResponse({ ok: false, error: 'Suspicious activity detected' });
    }

    // 2.2 Form load time (anti-bot: < 3s = bot, > 30min = session expired)
    const loadTime = parseInt(data.form_load_time || 0);
    const elapsed = Date.now() - loadTime;
    if (loadTime > 0 && elapsed < 3000) {
      logSuspicious('submit_too_fast', data);
      return jsonResponse({ ok: false, error: 'Form submitted too quickly' });
    }

    // 2.3 Origin check (ต้องมาจาก nattharinee-PAD.github.io เท่านั้น)
    const referer = (e.headers && (e.headers.Referer || e.headers.referer)) || '';
    if (referer && !referer.startsWith('https://nattharinee-PAD.github.io/')) {
      logSuspicious('invalid_origin', { referer: referer });
      return jsonResponse({ ok: false, error: 'Invalid origin' });
    }

    // 2.4 Rate limit (per IP)
    const ip = getClientIp(e);
    if (!checkRateLimit(ip)) {
      logSuspicious('rate_limit_exceeded', { ip: ip });
      return jsonResponse({ ok: false, error: 'Rate limit exceeded. Please try again later.' });
    }

    // ===== 3. Validate schema =====
    const errors = validatePayload(data);
    if (errors.length > 0) {
      return jsonResponse({ ok: false, error: 'Validation failed', details: errors });
    }

    // ===== 4. Verify member ID exists in PKGemployee =====
    const member = lookupMember(data.member_id);
    if (!member) {
      return jsonResponse({ ok: false, error: 'ไม่พบรหัสสมาชิกนี้ในระบบ' });
    }

    // ===== 5. Save submission =====
    const result = saveSubmission(data);

    // ===== 6. Audit log (ไม่ log PII) =====
    logSubmission(result.submission_id, ip);

    return jsonResponse({ ok: true, submission_id: result.submission_id });
  } catch (err) {
    logSuspicious('exception', { message: err.message, stack: err.stack });
    return jsonResponse({ ok: false, error: err.message });
  }
}

// =============================================================
// CORE FUNCTIONS
// =============================================================

/**
 * บันทึก submission ลง Sheet
 */
function saveSubmission(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SUBMISSION_TAB);

  // Generate submission_id (ถ้ายังไม่มี)
  const submissionId = data.submission_id || ('sub_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5));

  // Flatten motivation_initial (array) → string "A,C"
  const motivationInitial = Array.isArray(data.motivation_initial) 
    ? data.motivation_initial.join(',')
    : '';

  // Flatten motivation_current (object) → string "A,B,C,D,E,F"
  const motivationCurrent = data.motivation_current
    ? ['rank1','rank2','rank3','rank4','rank5','rank6']
        .map(k => data.motivation_current[k] || '')
        .join(',')
    : '';

  // Append row (13 cols)
  sheet.appendRow([
    submissionId,
    data.timestamp || new Date().toISOString(),
    data.member_id,
    data.member_name,
    data.bu,
    data.assessment_type || '',
    data.status || '',
    data.course || '',
    data.course_other || '',
    motivationInitial,
    motivationCurrent,
    data.motivation_detail || '',
    data.source || '3E3P_Form'
  ]);

  return { submission_id: submissionId };
}

/**
 * Lookup member จาก PKGemployee tab
 */
function lookupMember(memberId) {
  // Validate format first
  if (!/^\d{7}$/.test(memberId)) return null;

  const cache = CacheService.getScriptCache();
  const cacheKey = 'member_' + memberId;
  const cached = cache.get(cacheKey);
  if (cached) return JSON.parse(cached);

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(MEMBER_TAB);
    if (!sheet) return null;

    const data = sheet.getDataRange().getValues();
    // data[0] = headers, data[1..] = rows
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (String(row[0]) === memberId) {
        const member = {
          member_id: String(row[0]),
          name: row[1],
          bu: row[2],
          position: row[3]
        };
        // Cache 1 hour
        cache.put(cacheKey, JSON.stringify(member), 3600);
        return member;
      }
    }
    return null;
  } catch (err) {
    console.error('lookupMember error:', err.message);
    return null;
  }
}

// =============================================================
// VALIDATION
// =============================================================

/**
 * ตรวจ payload schema + business rules
 */
function validatePayload(data) {
  const errors = [];

  // Required fields
  if (!data.member_id || !/^\d{7}$/.test(data.member_id)) {
    errors.push('member_id: ต้องเป็นตัวเลข 7 หลัก');
  }
  if (!data.assessment_type || !['status', 'course'].includes(data.assessment_type)) {
    errors.push('assessment_type: ต้องเป็น status หรือ course');
  }
  if (data.assessment_type === 'status' && !data.status) {
    errors.push('status: ต้องระบุเมื่อ assessment_type = status');
  }
  if (data.assessment_type === 'course' && !data.course) {
    errors.push('course: ต้องระบุเมื่อ assessment_type = course');
  }
  if (data.course === 'อื่นๆ' && (!data.course_other || data.course_other.trim().length < 3)) {
    errors.push('course_other: ต้องระบุอย่างน้อย 3 ตัวอักษร');
  }

  // motivation_initial
  if (!Array.isArray(data.motivation_initial) || data.motivation_initial.length === 0) {
    errors.push('motivation_initial: ต้องเลือกอย่างน้อย 1 ข้อ');
  } else if (data.motivation_initial.length > 6) {
    errors.push('motivation_initial: ห้ามเกิน 6 ข้อ');
  } else {
    const valid = ['A','B','C','D','E','F'];
    for (const v of data.motivation_initial) {
      if (!valid.includes(v)) {
        errors.push(`motivation_initial: ค่า "${v}" ไม่ถูกต้อง`);
        break;
      }
    }
  }

  // motivation_current (ranking 1-6)
  if (!data.motivation_current || typeof data.motivation_current !== 'object') {
    errors.push('motivation_current: ต้องเป็น object');
  } else {
    const ranks = ['rank1','rank2','rank3','rank4','rank5','rank6'];
    const vals = [];
    for (const k of ranks) {
      const v = data.motivation_current[k];
      if (!v) {
        errors.push(`motivation_current.${k}: ต้องระบุ`);
        break;
      }
      vals.push(v);
    }
    if (new Set(vals).size !== vals.length) {
      errors.push('motivation_current: อันดับ 1-6 ต้องไม่ซ้ำกัน');
    }
    if (vals.length === 6 && !vals.sort().every((v, i) => v === ['A','B','C','D','E','F'][i])) {
      errors.push('motivation_current: ต้องใช้ A,B,C,D,E,F ทุกตัว');
    }
  }

  // motivation_detail
  if (!data.motivation_detail || data.motivation_detail.length < 5 || data.motivation_detail.length > 5000) {
    errors.push('motivation_detail: ต้องมี 5-5000 ตัวอักษร');
  }

  return errors;
}

// =============================================================
// SECURITY HELPERS
// =============================================================

/**
 * Get client IP from request
 */
function getClientIp(e) {
  return (e.parameter && e.parameter.userIp) || 'unknown';
}

/**
 * Rate limit per IP (max 10 / 10 min)
 */
function checkRateLimit(ip) {
  if (ip === 'unknown') return true; // skip if no IP
  const cache = CacheService.getScriptCache();
  const key = 'rl_' + ip;
  const count = parseInt(cache.get(key) || '0');
  if (count >= RATE_LIMIT_MAX) return false;
  cache.put(key, String(count + 1), RATE_LIMIT_WINDOW / 1000);
  return true;
}

/**
 * Log suspicious activity (no PII)
 */
function logSuspicious(reason, data) {
  // Strip PII before logging
  const safeData = {
    reason: reason,
    timestamp: new Date().toISOString(),
    member_id_hash: data.member_id ? hashString(String(data.member_id)) : null,
    honeypot: !!data[HONEYPOT_FIELD]
  };
  console.warn('SUSPICIOUS:', JSON.stringify(safeData));
}

/**
 * Log successful submission (no PII)
 */
function logSubmission(submissionId, ip) {
  console.log('SUBMISSION_OK:', JSON.stringify({
    submission_id: submissionId,
    timestamp: new Date().toISOString(),
    ip_hash: ip !== 'unknown' ? hashString(ip) : null
  }));
}

/**
 * Simple hash for PII protection in logs
 */
function hashString(s) {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    const chr = s.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return 'h_' + Math.abs(hash).toString(36);
}

/**
 * JSON response helper
 */
function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// =============================================================
// SETUP (run once)
// =============================================================

/**
 * สร้าง header rows ใน Submissions + PKGemployee tabs (ถ้ายังไม่มี)
 * วิธีใช้: เปิด Apps Script → Run function 'setupSheets'
 */
function setupSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // ----- Submissions tab -----
  let subSheet = ss.getSheetByName(SUBMISSION_TAB);
  if (!subSheet) {
    subSheet = ss.insertSheet(SUBMISSION_TAB);
  }
  if (subSheet.getLastRow() === 0) {
    subSheet.appendRow([
      'submission_id', 'timestamp', 'member_id', 'member_name', 'bu',
      'assessment_type', 'status', 'course', 'course_other',
      'motivation_initial', 'motivation_current', 'motivation_detail', 'source'
    ]);
    subSheet.getRange(1, 1, 1, 13).setFontWeight('bold').setBackground('#e8f0fe');
    Logger.log('✅ Submissions header created');
  }
  
  // ----- PKGemployee tab -----
  let memSheet = ss.getSheetByName(MEMBER_TAB);
  if (!memSheet) {
    memSheet = ss.insertSheet(MEMBER_TAB);
  }
  if (memSheet.getLastRow() === 0) {
    memSheet.appendRow(['member_id', 'name', 'bu', 'position']);
    memSheet.getRange(1, 1, 1, 4).setFontWeight('bold').setBackground('#e8f0fe');
    // Mock data
    memSheet.appendRow(['6006083', 'ณัฐฑริณี คำนึง', 'CPDG - ทีมบริหารหลักสูตร', 'สมาชิกบริหารหลักสูตร']);
    memSheet.appendRow(['6407049', 'ปวีร์ ผ่องโสภา', 'ทีม 21RT', 'สมาชิก Technology Research']);
    memSheet.appendRow(['9005905', 'เขมิกา หัตถวิจิตรกุล', 'AAMG - ทีมกฎหมาย', 'ผู้รับใช้ทีมกฎหมาย']);
    memSheet.appendRow(['6604216', 'สลักจิตร บัวแก้ว', 'AAMG - ทีมกฎหมาย', 'ผู้รับใช้ทีมกฎหมาย']);
    memSheet.appendRow(['9999999', 'ทดสอบ ตัวอย่าง', 'TEST', 'สมาชิกทดสอบ']);
    Logger.log('✅ PKGemployee header + mock data created');
  }
  
  SpreadsheetApp.flush();
  Logger.log('🎉 Setup complete!');
}