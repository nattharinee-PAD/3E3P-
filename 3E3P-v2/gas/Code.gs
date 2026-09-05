/**
 * 3E3P Motivation Form - GAS Backend v6 (Clean)
 * Sheet ID: 1XOK2R9PkCucbHMbCc8Nl69t9KjTjzk1CqBAvFNyubHE
 * Tab gid=634702585 → 3E3P_Submissions
 *
 * รับ payload: member_id, member_name, bu, motivation_rating,
 *              motivation_weighted, motivation_total, motivation_max,
 *              toe_direct, toe_indirect, toe_score, toe_tier,
 *              chart_1_image (base64 PNG)
 */

// =============================================================
// SECTION 1: CONFIG
// =============================================================

const SPREADSHEET_ID = '1XOK2R9PkCucbHMbCc8Nl69t9KjTjzk1CqBAvFNyubHE';
const MEMBER_GID = 0;
const SUBMISSION_GID = 634702585;
const RATING_WEIGHTS = { A: 10, B: 5, C: 1.66, D: 1.66, E: 5, F: 10 };

// =============================================================
// SECTION 2: doGet
// =============================================================

function doGet(e) {
  return HtmlService.createHtmlOutput(
    '<h1>3E3P Backend v6</h1>' +
    '<p>POST submissions only. Status: OK</p>'
  ).setTitle('3E3P Backend');
}

// =============================================================
// SECTION 3: doPost - รับและบันทึก
// =============================================================

function doPost(e) {
  try {
    // ===== Parse payload =====
    const data = JSON.parse(e.postData.contents);

    // ===== Validate required fields =====
    const errors = [];
    if (!data.member_id) errors.push('member_id required');
    if (!data.motivation_rating) errors.push('motivation_rating required');
    if (errors.length > 0) {
      return jsonResponse({ ok: false, error: 'Validation failed', details: errors });
    }

    // ===== Validate member_id format =====
    if (!/^\d{7}$/.test(String(data.member_id))) {
      return jsonResponse({ ok: false, error: 'Invalid member_id format (must be 7 digits)' });
    }

    // ===== Generate submission_id =====
    const submissionId = data.submission_id ||
      ('sub_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5));

    // ===== Get Sheet =====
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheets().find(s => s.getSheetId() === SUBMISSION_GID);
    if (!sheet) {
      return jsonResponse({ ok: false, error: 'Submission tab not found' });
    }

    // ===== Ensure headers =====
    const headers = [
      'submission_id', 'timestamp', 'member_id', 'member_name', 'bu',
      'assessment_type', 'status', 'course', 'course_other',
      'motivation_rating', 'motivation_weighted', 'motivation_total', 'motivation_max',
      'toe_direct', 'toe_indirect', 'toe_score', 'toe_tier',
      'chart_1_image', 'chart_2_image',
      'source'
    ];

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length)
        .setFontWeight('bold')
        .setBackground('#e8f0fe');
    }

    // ===== Flatten rating/weighted =====
    const ratingStr = Object.keys(RATING_WEIGHTS)
      .map(k => `${k}:${data.motivation_rating[k] || 0}`)
      .join(',');

    const weightedStr = Object.keys(RATING_WEIGHTS)
      .map(k => `${k}:${(data.motivation_weighted[k] || 0).toFixed(2)}`)
      .join(',');

    // ===== Handle chart_1_image (truncate if too large) =====
    let chart1Img = data.chart_1_image || '';
    if (chart1Img.length > 49000) {
      // Truncate to fit cell limit (50,000 chars)
      chart1Img = chart1Img.substring(0, 49000);
    }

    // ===== Append row =====
    sheet.appendRow([
      submissionId,
      data.timestamp || new Date().toISOString(),
      String(data.member_id),
      data.member_name || '',
      data.bu || '',
      data.assessment_type || '',
      data.status || '',
      data.course || '',
      data.course_other || '',
      ratingStr,
      weightedStr,
      data.motivation_total || 0,
      data.motivation_max || 166.60,
      data.toe_direct || 0,
      data.toe_indirect || 0,
      data.toe_score || 0,
      data.toe_tier || '',
      chart1Img,
      data.chart_2_image || '',
      data.source || '3E3P_Form_v2'
    ]);

    return jsonResponse({
      ok: true,
      submission_id: submissionId,
      row: sheet.getLastRow()
    });

  } catch (err) {
    return jsonResponse({
      ok: false,
      error: err.message,
      stack: err.stack
    });
  }
}

// =============================================================
// SECTION 4: JSON Response Helper
// =============================================================

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// =============================================================
// SECTION 5: Test functions (optional)
// =============================================================

function testAppend() {
  const testData = {
    member_id: '9999999',
    member_name: 'ทดสอบ ตัวอย่าง',
    bu: 'TEST',
    assessment_type: 'Direct',
    status: 'Active',
    motivation_rating: { A: 5, B: 4, C: 3, D: 2, E: 4, F: 1 },
    motivation_weighted: { A: 50, B: 20, C: 4.98, D: 3.32, E: 20, F: 10 },
    motivation_total: 108.30,
    motivation_max: 166.60,
    toe_direct: 74.98,
    toe_indirect: 33.32,
    toe_score: 41.66,
    toe_tier: 'Self-driven',
    chart_1_image: '',
    source: '3E3P_Test'
  };

  const result = doPost({
    postData: { contents: JSON.stringify(testData) }
  });

  Logger.log(result.getContent());
  return result.getContent();
}
