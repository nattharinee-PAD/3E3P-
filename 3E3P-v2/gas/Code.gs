/**
 * 3E3P (แรงจูงใจ) — GAS Backend v4 (NEW: Rating 1-5 + Radar)
 * Deploy: Web App → execute as "Me" → access "Anyone"
 *
 * Sheet ID: 1XOK2R9PkCucbHMbCc8Nl69t9KjTjzk1CqBAvFNyubHE
 * - Tab gid=0     → PKGemployee (member lookup, 479 rows)
 * - Tab gid=634702585 → 3E3P_Submissions (เก็บ rating + weighted + total)
 *
 * Payload (v4):
 *   { member_id, member_name, bu,
 *     assessment_type, status, course, course_other,
 *     motivation_rating: {A:1..5, B:1..5, C:.., D:.., E:.., F:..},
 *     motivation_weighted: {A:.., B:.., C:.., D:.., E:.., F:..},
 *     motivation_total: number,
 *     motivation_max: number,
 *     source: '3E3P_Form_v2' }
 */

// =============================================================
// CONFIG
// =============================================================
const SPREADSHEET_ID = '1XOK2R9PkCucbHMbCc8Nl69t9KjTjzk1CqBAvFNyubHE';
const MEMBER_GID = 0;                // PKGemployee tab
const SUBMISSION_GID = 634702585;    // 3E3P_Submissions tab
const GITHUB_HTML_URL = 'https://raw.githubusercontent.com/nattharinee-PAD/3E3P-/main/3E3P-v2/gas/index.html';

// Rating weights
const RATING_WEIGHTS = { A: 10, B: 5, C: 1.66, D: 1.66, E: 5, F: 10 };

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
    const response = UrlFetchApp.fetch('https://raw.githubusercontent.com/nattharinee-PAD/3E3P-/main/3E3P-v2/gas/index.html');
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
 * บันทึก submission ลง Sheet (gid=634702585)
 * Payload v4: motivation_rating + motivation_weighted + total
 */
function saveSubmission(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = getSheetByGid_(ss, SUBMISSION_GID);
  if (!sheet) {
    throw new Error('ไม่พบ Submission tab (gid=' + SUBMISSION_GID + ')');
  }

  // Generate submission_id (ถ้ายังไม่มี)
  const submissionId = data.submission_id || ('sub_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5));

  // Flatten rating (object → string "A:5,B:3,C:4,D:5,E:2,F:1")
  const ratingStr = data.motivation_rating
    ? Object.keys(RATING_WEIGHTS).map(k => `${k}:${data.motivation_rating[k] || 0}`).join(',')
    : '';

  // Flatten weighted (object → string "A:50.00,B:15.00,...")
  const weightedStr = data.motivation_weighted
    ? Object.keys(RATING_WEIGHTS).map(k => `${k}:${(data.motivation_weighted[k] || 0).toFixed(2)}`).join(',')
    : '';

  // Ensure header row (v4)
  ensureHeader_(sheet, [
    'submission_id', 'timestamp', 'member_id', 'member_name', 'bu',
    'assessment_type', 'status', 'course', 'course_other',
    'motivation_rating', 'motivation_weighted', 'motivation_total', 'motivation_max',
    'source'
  ]);

  // Append row (14 cols)
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
    ratingStr,
    weightedStr,
    data.motivation_total || 0,
    data.motivation_max || 166.60,
    data.source || '3E3P_Form_v2'
  ]);

  return { submission_id: submissionId };
}

/**
 * Get sheet by gid (numeric tab ID)
 */
function getSheetByGid_(ss, gid) {
  const sheets = ss.getSheets();
  for (const s of sheets) {
    if (s.getSheetId() === gid) return s;
  }
  // Fallback: first sheet
  return sheets.length > 0 ? sheets[0] : null;
}

/**
 * Ensure header row exists; create if missing
 */
function ensureHeader_(sheet, headers) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#e8f0fe');
    return;
  }
  const currentHeader = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const current = currentHeader.map(String);
  if (JSON.stringify(current) !== JSON.stringify(headers)) {
    // Append headers into row 2 (don't overwrite user data)
    sheet.insertRowBefore(1);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#e8f0fe');
  }
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
    const sheet = getSheetByGid_(ss, MEMBER_GID);
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

  // motivation_rating (v4: Rating 1-5 × 6 items)
  if (!data.motivation_rating || typeof data.motivation_rating !== 'object') {
    errors.push('motivation_rating: ต้องเป็น object {A:1..5, B:1..5, ...}');
  } else {
    const keys = Object.keys(RATING_WEIGHTS);
    for (const k of keys) {
      const v = data.motivation_rating[k];
      if (!v || isNaN(v)) {
        errors.push(`motivation_rating.${k}: ต้องระบุคะแนน 1-5`);
      } else if (v < 1 || v > 5) {
        errors.push(`motivation_rating.${k}: คะแนนต้องอยู่ในช่วง 1-5 (ได้ค่า ${v})`);
      }
    }
  }

  // motivation_weighted (verify weighted scores match)
  if (data.motivation_weighted) {
    for (const k of Object.keys(RATING_WEIGHTS)) {
      const expected = (data.motivation_rating[k] || 0) * RATING_WEIGHTS[k];
      const got = data.motivation_weighted[k] || 0;
      if (Math.abs(expected - got) > 0.05) {
        errors.push(`motivation_weighted.${k}: weighted score ไม่ตรงกับ rating × weight`);
      }
    }
  }

  // motivation_total (verify total)
  if (data.motivation_total && data.motivation_rating) {
    let expectedTotal = 0;
    for (const k of Object.keys(RATING_WEIGHTS)) {
      expectedTotal += (data.motivation_rating[k] || 0) * RATING_WEIGHTS[k];
    }
    if (Math.abs(expectedTotal - data.motivation_total) > 0.05) {
      errors.push(`motivation_total: ไม่ตรงกับผลรวม weighted (expected ${expectedTotal.toFixed(2)}, got ${data.motivation_total})`);
    }
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
 * NOTE (v4): ใช้ gid-based lookup (PKGemployee = gid 0, Submissions = gid 634702585)
 */
function setupSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // ----- Submissions tab (gid=634702585) -----
  const subSheet = getSheetByGid_(ss, SUBMISSION_GID) || ss.insertSheet('3E3P_Submissions');
  ensureHeader_(subSheet, [
    'submission_id', 'timestamp', 'member_id', 'member_name', 'bu',
    'assessment_type', 'status', 'course', 'course_other',
    'motivation_rating', 'motivation_weighted', 'motivation_total', 'motivation_max',
    'source'
  ]);
  Logger.log('✅ Submissions header ensured');

  // ----- PKGemployee tab (gid=0) — assume existing -----
  const memSheet = getSheetByGid_(ss, MEMBER_GID);
  if (memSheet) {
    Logger.log('✅ PKGemployee (gid=0) already exists (' + memSheet.getLastRow() + ' rows)');
  } else {
    Logger.log('⚠️ PKGemployee (gid=0) not found — please create manually');
  }

  SpreadsheetApp.flush();
  Logger.log('🎉 Setup complete!');
}