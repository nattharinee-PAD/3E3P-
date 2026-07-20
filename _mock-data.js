// Real members from Sheet 1XOK2R9PkCucbHMbCc8Nl69t9KjTjzk1CqBAvFNyubHE
// Snapshot: 2026-07-20
// Source: docs.google.com/spreadsheets/d/1XOK2R9PkCucbHMbCc8Nl69t9KjTjzk1CqBAvFNyubHE
// 30 sample members (first 30 rows, excluding empty)
const REAL_MEMBERS = [
  { id: '6407049', name: 'ปวีร์ ผ่องโสภา', bu: '21RTG', pos: 'สมาชิก Technology Research & Developer' },
  { id: '6407047', name: 'ปภาวี ผ่องโสภา', bu: '21RTG', pos: 'สมาชิก Technology Research & Developer' },
  { id: '6407048', name: 'นันท์นลิน โพธิ์นทีไท', bu: '21RTG', pos: 'สมาชิก Technology Research & Developer' },
  { id: '6607239', name: 'ธนภูมิ เมืองแก้ว', bu: 'AAMG', pos: 'สมาชิก Digital Contents' },
  { id: '9005905', name: 'เขมิกา หัตถวิจิตรกุล', bu: 'AAMG', pos: 'ผู้รับใช้ทีมกฎหมาย' },
  { id: '6604216', name: 'สลักจิตร บัวแก้ว', bu: 'AAMG', pos: 'ผู้รับใช้ทีมกฎหมาย' },
  { id: '5004066', name: 'ศักรินทร์ ป้องหมู่', bu: 'AAMG', pos: 'ที่ปรึกษาทีมการตลาดและบริหารลูกค้า' },
  { id: '5707120', name: 'จันทร์มีนา พรหมณรงค์', bu: 'AAMG', pos: 'สมาชิกการตลาดและบริหารลูกค้า' },
  { id: '6103025', name: 'เต็มสิริ ยินดี', bu: 'AAMG', pos: 'สมาชิกการตลาดและบริหารลูกค้า' },
  { id: '6408063', name: 'ศรตุลา กลิ่นแย้ม', bu: 'AAMG', pos: 'สมาชิกตรวจสอบหลักทรัพย์' },
  { id: '9307002', name: 'ศิริสรร กลิ่นแย้ม', bu: 'AAMG', pos: 'สมาชิกตรวจสอบหลักทรัพย์' },
  { id: '6007105', name: 'รมณีย์ แสงโรจน์', bu: 'AAMG', pos: 'สมาชิกติดตามหนี้สิน' },
  { id: '5704072', name: 'วิภาวี คามมะวรรณ์', bu: 'AAMG', pos: 'ผู้รับใช้ทีมธุรกิจประกันภัย' },
  { id: '5409130', name: 'สุภาภรณ์ ประสพเนตร', bu: 'AAMG', pos: 'สมาชิกนวัตกรรมธุรกิจสินเชื่อ' },
  { id: '5211040', name: 'จันทรรัตน์ เหมือนเหลา', bu: 'AAMG', pos: 'ผู้รับใช้ทีมนวัตกรรมบัญชี' },
  { id: '2204003', name: 'จันทกานต์ วัฒนกิจ', bu: 'AAMG', pos: 'สมาชิกนวัตกรรมบัญชี' },
  { id: '4806050', name: 'เอกสิทธิ์ วรรณสุข', bu: 'AAMG', pos: 'สมาชิกนวัตกรรมบัญชี' },
  { id: '9606001', name: 'กนิษฐา ศรีธรรมชาติ', bu: 'AAMG', pos: 'ที่ปรึกษาทีมบริหารผลผลิตและนวัตกรรมสินเชื่อ' },
  { id: '9916013', name: 'สุนิษา ภาคสะอาด', bu: 'AAMG', pos: 'ที่ปรึกษาทีมบริหารจัดการธุรกิจต่างประเทศ' },
  { id: '6601012', name: 'ชูชาติ อัตโน', bu: 'AAMG', pos: 'ผู้รับใช้ทีมบริหารหลักประกัน' },
  { id: '6903009', name: 'สุพิชฌาย์ ยินดีทรัพย์', bu: 'AAMG', pos: 'สมาชิกบริหารสินเชื่อ' },
  { id: '6803012', name: 'สกล ก้องโสตร', bu: 'AAMG', pos: 'สมาชิกบังคับคดี' },
  { id: '5205006', name: 'สรินญา ขยันงาน', bu: 'AAMG', pos: 'สมาชิกบัญชีงบการเงิน' },
  { id: '5503030', name: 'อรกัญญา เคล้าคล่อง', bu: 'AAMG', pos: 'สมาชิกบัญชีงบการเงิน' },
  { id: '5704071', name: 'นิตยา เสียงเสนาะ', bu: 'AAMG', pos: 'สมาชิกบัญชีงบการเงิน' },
  { id: '5508106', name: 'วิลาวัลย์ มังคลา', bu: 'AAMG', pos: 'สมาชิกบัญชีภาษี' },
  { id: '5703047', name: 'มาลัยทิพย์ วงษ์เล็ก', bu: 'AAMG', pos: 'สมาชิกบัญชีภาษี' },
  { id: '9604903', name: 'เบญจมาส คุ้มนุ่น', bu: 'AAMG', pos: 'ที่ปรึกษาทีมพัฒนาหนี้' },
  { id: '9906004', name: 'ชรีย์พร นาคจรูญ', bu: 'AAMG', pos: 'ผู้รับใช้ทีมพัฒนาเทคโนโลยีสินเชื่อ' },
  { id: '6601047', name: 'พัชรี อุทัยรัศมี', bu: 'AAMG', pos: 'ผู้รับใช้ทีมวิเคราะห์ตรวจสอบกำกับสินเชื่อ' }
];

// Build lookup map
const MOCK_MEMBERS = {};
REAL_MEMBERS.forEach(m => {
  MOCK_MEMBERS[m.id] = { name: m.name, bu: m.bu, pos: m.pos };
});

// Add test fallback
MOCK_MEMBERS['9999999'] = { name: 'ทดสอบ ตัวอย่าง', bu: 'TEST', pos: 'สมาชิกทดสอบ' };

// ===== Auto-fill member =====
let lookupTimer = null;
function lookupMember(id) {
  // Exact match first
  if (MOCK_MEMBERS[id]) return MOCK_MEMBERS[id];
  // Prefix match: ถ้ากรอก >= 6 หลัก ลองหา mock ที่ขึ้นต้นด้วย id นี้
  if (id.length >= 6) {
    for (const key of Object.keys(MOCK_MEMBERS)) {
      if (key.startsWith(id)) return MOCK_MEMBERS[key];
    }
  }
  return null;
}

document.getElementById('memberId').addEventListener('input', (e) => {
  clearTimeout(lookupTimer);
  const id = e.target.value.trim();
  const errorEl = document.getElementById('memberIdError');
  const nameEl = document.getElementById('memberName');
  const buEl = document.getElementById('memberBU');

  if (id.length === 0) {
    nameEl.value = '';
    nameEl.placeholder = '— รอกรอกรหัส —';
    nameEl.classList.remove('error');
    buEl.value = '';
    buEl.placeholder = '—';
    buEl.classList.remove('error');
    errorEl.classList.remove('show');
    return;
  }

  if (id.length < 6) {
    // ยังกรอกไม่ครบ — รอ
    return;
  }

  lookupTimer = setTimeout(() => {
    const member = lookupMember(id);
    if (member) {
      nameEl.value = member.name;
      buEl.value = member.bu;
      nameEl.placeholder = '';
      buEl.placeholder = '';
      nameEl.classList.remove('error');
      buEl.classList.remove('error');
      errorEl.classList.remove('show');
    } else {
      nameEl.value = '';
      buEl.value = '';
      nameEl.placeholder = '— ไม่พบข้อมูล —';
      buEl.placeholder = '—';
      nameEl.classList.add('error');
      buEl.classList.add('error');
      errorEl.classList.add('show');
    }
  }, 300);
});
