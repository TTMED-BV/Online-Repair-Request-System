/**
 * ═══════════════════════════════════════════════════════════════════════
 *  ระบบแจ้งซ่อมออนไลน์ — Google Apps Script Backend (v15)
 *  เวอร์ชัน v15 (2026-10-26) — ต้องใช้คู่กับหน้าเว็บ index.html v15
 *  ประวัติ: v12 ฟิลเตอร์/ปฏิทินแถบ/วันคาดว่าเสร็จ/PM 5 แบบ/ประเมินแทน+อีเมล · v12.1–12.2 แก้ใบค้าง ใบรหัสซ้ำ
 *           v13 คาร์บอนที่ประหยัดได้รายเดือน · v14 แจ้งเตือนรายคน LINE OA/อีเมล
 *           v15 คลังอุปกรณ์+จุดสั่งซื้อ/แจ้งของใกล้หมด · สรุปรายเดือนอัตโนมัติ (วันที่ 1 08:00)
 *               · ตั้งค่าจุดซ่อมซ้ำ/เป้า KPI · บันทึกการเคลื่อนไหวคลัง (แท็บ InvLog)
 *  รวมทุกฟีเจอร์: แจ้งซ่อม + ตั้งค่า + วันหยุด + LINE + Auth + รูปภาพ
 * ═══════════════════════════════════════════════════════════════════════
 *
 *  วิธีติดตั้งครั้งแรก (ทำตามลำดับ):
 *  1. เปิด Google Sheet ใหม่ → Extensions → Apps Script
 *  2. วางโค้ดนี้ทั้งหมดทับของเดิม → กด Save (💾)
 *  3. Deploy → New deployment → Web app
 *       Execute as: Me | Who has access: Anyone
 *  4. คัดลอก URL ไปวางใน index.html (DEFAULT_GAS_URL) หรือหน้า ⚙ ตั้งค่า
 *  5. เข้าหน้า ⚙ ตั้งค่า ในเว็บ → กด "เริ่มใช้งาน (สร้าง Sheet)"
 *       หรือ Run ฟังก์ชัน setup() ในหน้า Apps Script โดยตรง
 *  6. Run ฟังก์ชัน setupUsers() หนึ่งครั้ง (ตั้งรหัสผ่านก่อน)
 *  7. (ถ้าต้องการ LINE) แก้ setupLine() แล้ว Run
 *  8. Run ฟังก์ชัน setupTriggers() หนึ่งครั้ง (สร้างใบ PM ทุกวัน 06:00 + ปลุกระบบให้ตอบเร็ว)
 *  9. Run ฟังก์ชัน testRatingEmail() หนึ่งครั้ง → กดอนุญาตสิทธิ์ "ส่งอีเมล" (ใช้ส่งลิงก์ประเมินความพึงพอใจ)
 *     แล้วไปหน้า ⚙ ตั้งค่า ในเว็บ → ใส่ "ลิงก์เว็บระบบ" → บันทึก
 *
 *  10. (แจ้งเตือน LINE รายคน) แก้ setupLineOA() ใส่ Channel access token ของ OA ใหม่ แล้ว Run หนึ่งครั้ง
 *      จากนั้นใน LINE Developers → Messaging API → Webhook URL = ลิงก์ /exec นี้ → เปิด Use webhook
 *      ช่างแต่ละคนผูก LINE เองที่เว็บ (ชื่อผู้ใช้มุมขวาบน → การแจ้งเตือนของฉัน)
 *
 *  v15: อัปเดตจาก v14 → วางโค้ดทับ → Save → Deploy → Manage deployments → ✏️ Edit → New version → Deploy
 *       ไม่ต้อง Run อะไรเพิ่ม (สรุปรายเดือนอาศัยตัวตั้งเวลา keepWarm ที่มีอยู่แล้ว)
 *       ทดสอบส่งสรุปรายเดือนถึงตัวเองได้ที่ ⚙ ตั้งค่า → "ส่งสรุปรายเดือนทดสอบ" หรือ Run testMonthlySummary()
 *
 *  v12: คอลัมน์ใหม่ (DueOverride, RatedBy ในแท็บ Tickets / Mode, Schedule ในแท็บ PM) ระบบเติมให้เองอัตโนมัติ
 *
 *  หมายเหตุการอัปเดตภายหลัง:
 *  - แก้โค้ด → Save → Deploy → Manage deployments → ✏️ Edit → New version → Deploy
 *  - ห้ามกด "New deployment" เพราะจะได้ URL ใหม่ (เว็บจะเชื่อมไม่ติด)
 */

// ─── ชื่อแท็บ (Sheet tabs) ───
const TICKETS_SHEET = 'Tickets';
const HISTORY_SHEET = 'History';
const USERS_SHEET   = 'Users';
const PHOTOS_SHEET  = 'Photos';
const ROUTING_SHEET = 'Routing';      // ข้อ 5: กติกาการวิ่งงาน
const INVENTORY_SHEET = 'Inventory';  // ข้อ 3: คลังอุปกรณ์ (ซ่อนไว้)
const ROUTING_HEADERS = ['Category','AutoAssign','ApproverRoles'];
const INV_HEADERS = ['ID','Name','Unit','Stock','Hidden','Min'];   // v15: Min = จุดสั่งซื้อ (เหลือ ≤ นี้ = ใกล้หมด)
const INVLOG_SHEET = 'InvLog';                                        // v15: บันทึกการเคลื่อนไหวคลัง
const INVLOG_HEADERS = ['Date','ItemID','Name','Qty','Balance','TicketID','By','Note'];

const TICKET_HEADERS = [
  'ID','CreatedAt','Name','Phone','Dept','Email','Building','Room','Category',
  'Priority','Desc','EstimatedCost','ActualCost','Status','Assignees',
  'ApprovedAt','ApprovedBy','ApprovedBudget','CompletedAt',
  'Rating','RatingComment','Source',
  'NeedsPurchase','PurchaseApprovedBy','PurchaseApprovedAt',  // ข้อ 6: ด่านอนุมัติจัดซื้อ
  'DueOverride','RatedBy',                                      // v12: วันคาดว่าเสร็จที่แอดมินกำหนดเอง / ผู้ประเมินแทน
  'CarbonFlags'                                                 // v13: refrig,replace (ติ๊กตอนปิดงาน)
];
const HISTORY_HEADERS = ['TicketID','Status','Date','Note','By'];
// งานซ่อมบำรุงเชิงป้องกัน (PM) — รอบเป็นจำนวนวัน
const PM_SHEET = 'PM';
const PM_HEADERS = ['ID','Name','Building','Floor','Category','Priority','IntervalDays','LastDone','Desc','Active','Mode','Schedule'];
// Mode: interval | dates | range | monthly | yearly   Schedule: JSON (ดู pmNextOcc_)

// ─── ค่าเริ่มต้นของ config (ใช้ตอนสร้าง Sheet ครั้งแรก) ───
// อาคารตัวอย่างของคณะการแพทย์แผนไทย — แก้/ลบ/เพิ่มได้เองในหน้าตั้งค่า
const DEFAULT_BUILDINGS = [
  ['b1','อาคารสหเวชศาสตร์','สหเวชศาสตร์','🏛',150000,'FALSE'],
];
// ชั้นของแต่ละอาคาร — คอลัมน์: BuildingID, Floor(ชื่อชั้น), Hidden
const DEFAULT_FLOORS = [
  ['b1','ชั้น B','FALSE'],
  ['b1','ชั้น 1','FALSE'],['b1','ชั้น 2','FALSE'],['b1','ชั้น 3','FALSE'],['b1','ชั้น 4','FALSE'],
  ['b1','ชั้น 5','FALSE'],['b1','ชั้น 6','FALSE'],['b1','ชั้น 7','FALSE'],
  ['b1','ชั้นดาดฟ้า','FALSE'],
];
const DEFAULT_STATUSES = [
  ['pending_approval','รอวิศวกรอนุมัติ','b-amber','FALSE','FALSE','FALSE'],
  ['assigned','มอบหมายแล้ว','b-purple','FALSE','FALSE','FALSE'],
  ['survey','กำลังสำรวจหน้างาน','b-amber','FALSE','FALSE','FALSE'],
  ['pending_purchase','รออนุมัติจัดซื้อ','b-amber','FALSE','FALSE','FALSE'],
  ['purchase','อยู่ระหว่างจัดซื้อ','b-purple','FALSE','FALSE','FALSE'],
  ['working','กำลังดำเนินการซ่อม','b-blue','FALSE','FALSE','FALSE'],
  ['insurance','ส่งประกันเคลม','b-teal','TRUE','FALSE','FALSE'],
  ['contractor','ส่งผู้รับเหมา','b-teal','TRUE','FALSE','FALSE'],
  ['done','เสร็จเรียบร้อย','b-green','FALSE','TRUE','FALSE'],
  ['cannot','ซ่อมไม่ได้','b-red','FALSE','TRUE','FALSE'],
  ['cancelled','ยกเลิกใบแจ้ง','b-gray','FALSE','TRUE','FALSE'],
];
const DEFAULT_CATEGORIES = [
  ['ระบบไฟฟ้า',5,'FALSE'],
  ['ระบบประปา/สุขาภิบาล',5,'FALSE'],
  ['ระบบปรับอากาศ',7,'FALSE'],
  ['งานโครงสร้างอาคาร',30,'FALSE'],
  ['ระบบสื่อสาร/เครือข่าย IT',7,'FALSE'],
  ['งานครุภัณฑ์/เฟอร์นิเจอร์',14,'FALSE'],
  ['อื่นๆ',14,'FALSE'],
];
// วันหยุดราชการ (YYYY-MM-DD) — ตัวอย่างปี 2569/2026 ปรับได้ในหน้าตั้งค่า
const DEFAULT_HOLIDAYS = [
  ['2026-01-01','วันขึ้นปีใหม่'],
  ['2026-04-06','วันจักรี'],
  ['2026-04-13','วันสงกรานต์'],
  ['2026-04-14','วันสงกรานต์'],
  ['2026-04-15','วันสงกรานต์'],
  ['2026-05-01','วันแรงงาน'],
  ['2026-12-05','วันพ่อแห่งชาติ'],
  ['2026-12-10','วันรัฐธรรมนูญ'],
  ['2026-12-31','วันสิ้นปี'],
];
const CFG = {
  buildings:  { sheet:'Buildings',  headers:['ID','Name','Short','Icon','Budget','Hidden'],   seed:DEFAULT_BUILDINGS },
  floors:     { sheet:'Floors',     headers:['BuildingID','Floor','Hidden'],                   seed:DEFAULT_FLOORS },
  statuses:   { sheet:'Statuses',   headers:['ID','Label','Class','Paused','Closed','Hidden'], seed:DEFAULT_STATUSES },
  categories: { sheet:'Categories', headers:['Name','SLA','Hidden'],                           seed:DEFAULT_CATEGORIES },
  holidays:   { sheet:'Holidays',   headers:['Date','Name'],                                   seed:DEFAULT_HOLIDAYS },
};

const SESSION_HOURS = 12;   // อายุ session token (ชั่วโมง)

// ─── บทบาท + สิทธิ์ (แก้ได้เองในหน้าตั้งค่า โดยวิศวกร/แอดมิน) ───
const ROLES_SHEET = 'Roles';
const ROLES_HEADERS = ['Role','Label','IsEngineer','Capabilities','Hidden'];
// รายการความสามารถทั้งหมดที่เปิด/ปิดได้ (key : คำอธิบาย)
const ALL_CAPS = [
  'dashboard',        // ดู Dashboard/รายงาน
  'approve_ticket',   // อนุมัติใบแจ้งซ่อม (วิศวกร)
  'approve_purchase', // อนุมัติจัดซื้อ/ใช้เงิน (บริหาร — ข้อ 6)
  'manage_tickets',   // รับงาน/อัปเดตสถานะงาน
  'assignable',       // ถูกมอบหมายงานได้ (เป็นผู้รับผิดชอบ)
  'manage_pm',        // จัดการแผน PM
  'manage_config',    // ตั้งค่าระบบ (อาคาร/สถานะ/ประเภท)
  'manage_users',     // จัดการผู้ใช้ (สงวนให้วิศวกร)
  'manage_routing',   // ตั้งกติกาการวิ่งงานอัตโนมัติ (ข้อ 5)
  'manage_inventory'  // ระบบเบิกอุปกรณ์ (ข้อ 3 — ซ่อนไว้ก่อน)
];
// บทบาทเริ่มต้น + สิทธิ์เริ่มต้น (วิศวกรปรับเพิ่ม/ลด/จัดการได้ทั้งหมด)
const DEFAULT_ROLES = [
  ['admin',    'วิศวกร/แอดมิน', 'TRUE',  ALL_CAPS.join(','),                                  'FALSE'],
  ['manager',  'บริหาร',        'FALSE', 'dashboard,approve_purchase,approve_ticket',          'FALSE'],
  ['tech',     'ช่าง',          'FALSE', 'manage_tickets,assignable',                          'FALSE'],
  ['it',       'ไอที',          'FALSE', 'manage_tickets,assignable',                          'FALSE'],
  ['scientist','นักวิทย์',       'FALSE', 'manage_tickets,assignable',                          'FALSE'],
];

// ═══════════════════════════════════════════════════════════════
//  ROUTER — รับทุกคำขอจากหน้าเว็บ
// ═══════════════════════════════════════════════════════════════
// คำขอที่ "อ่านอย่างเดียว" — ไม่ต้องล็อก ไม่ต้องล้างแคช (ทำงานพร้อมกันได้หลายคน)
var READ_ACTIONS = ['bootstrap','getAll','getConfig','getUsers','getPhotos','getTicketPhotos',
                    'getRoles','getRouting','getInventory','login','logout','ping','getInvLog'];

function doPost(e) {
  var out = {};
  var lock = null;
  try {
    var body = JSON.parse(e.postData.contents);
    // v14: Webhook จาก LINE OA (ไม่มี action แต่มี events) → ผูกบัญชีด้วยรหัส 6 หลัก
    if (!body.action && body.events) { handleLineWebhook_(body.events); return ContentService.createTextOutput('OK'); }
    var action = body.action;
    var isRead = READ_ACTIONS.indexOf(action) >= 0;
    if (!isRead) { lock = LockService.getScriptLock(); lock.tryLock(20000); }   // ล็อกเฉพาะตอนเขียน
    var result;

    switch (action) {
      case 'init':        result = initSheets();                               break;
      case 'ping':        result = { pong: true };                             break;
      case 'getAll':      result = getAllTickets();                            break;
      // รวม "แก้ใบ + เพิ่มประวัติ" เป็นคำขอเดียว (เร็วกว่าเรียก 2 ครั้ง)
      case 'updateWithHistory': result = requireAuth(body.token, function(){
                            var r = updateTicket(body.id, body.fields || {});
                            if (r && r.error) return r;
                            if (body.entry) addHistory(body.id, body.entry);
                            return r; }); break;
      case 'getTicketPhotos': result = getTicketPhotos(body.id);               break;
      case 'bootstrap':   result = bootstrap();                                break;
      case 'add':         result = addTicket(body.ticket);
                          if (body.entry && result && !result.error && !result.duplicate) addHistory(body.ticket.id, body.entry);  // รวมประวัติแรกในคำขอเดียว
                          break;
      case 'update':      result = requireAuth(body.token, function(){ return updateTicket(body.id, body.fields); }); break;
      case 'addHistory':  result = addHistory(body.ticketId, body.entry);      break;
      case 'getConfig':   result = getConfig();                                break;
      case 'saveConfig':  result = requireAuth(body.token, function(){ return saveConfig(body.config); }); break;
      case 'login':       result = login(body.username, body.password);        break;
      case 'logout':      result = logout(body.token);                         break;
      case 'getUsers':    result = getUsers();                                 break;
      case 'uploadPhoto': result = uploadPhoto(body.photo);                    break;
      case 'getPhotos':   result = getPhotos();                                break;
      case 'deletePhoto': result = requireAuth(body.token, function(){ return deletePhoto(body.fileId); }); break;
      case 'rateTicket':  result = rateTicket(body.id, body.rating, body.comment, body.ratedBy); break;
      case 'savePM':      result = requireAuth(body.token, function(){ return savePM(body.list); }); break;
      // ─── ข้อ 4: จัดการผู้ใช้ + บทบาท/สิทธิ์ (เฉพาะวิศวกร/แอดมิน) ───
      case 'getRoles':    result = getRoles();                                    break;
      case 'addUser':     result = requireEngineer_(body.token, function(){ return addUser(body.user); }); break;
      case 'updateUser':  result = requireEngineer_(body.token, function(){ return updateUser(body.username, body.fields); }); break;
      case 'deleteUser':  result = requireEngineer_(body.token, function(){ return deleteUser(body.username); }); break;
      case 'setPassword': result = requireEngineer_(body.token, function(){ return setUserPassword(body.username, body.password); }); break;
      case 'saveRoles':   result = requireEngineer_(body.token, function(){ return saveRoles(body.roles); }); break;
      // ─── ข้อ 5: กติกาการวิ่งงาน ───
      case 'getRouting':  result = getRouting();                                break;
      case 'saveRouting': result = requireEngineer_(body.token, function(){ return saveRouting(body.routing); }); break;
      // ─── ข้อ 6: อนุมัติจัดซื้อ (ผู้มีสิทธิ์ approve_purchase) ───
      case 'approvePurchase': result = requireCap_(body.token, 'approve_purchase', function(by){ return approvePurchase(body.id, by, body.note); }); break;
      // ─── ข้อ 3: คลังอุปกรณ์ (ซ่อนไว้) ───
      case 'getInventory':  result = getInventory();                            break;
      case 'saveInventory': result = requireEngineer_(body.token, function(){ var u = getUserByUsername_(verifyToken_(body.token)); return saveInventory(body.inventory, u ? u.name : ''); }); break;
      case 'withdrawItems': result = requireAuth(body.token, function(){ return withdrawItems(body.ticketId, body.items, body.by); }); break;
      case 'myNotify':      result = requireAuth(body.token, function(){ return myNotify_(verifyToken_(body.token), body.fields); }); break;
      case 'testNotify':    result = requireAuth(body.token, function(){ return testNotify_(verifyToken_(body.token)); }); break;
      case 'getNotifyAll':  result = requireEngineer_(body.token, function(){ return getNotifyAll_(); }); break;
      case 'setUserNotify': result = requireEngineer_(body.token, function(){ return setUserNotify_(body.username, body.fields); }); break;
      case 'setFlag':       result = requireEngineer_(body.token, function(){ return setFlag(body.key, body.value); }); break;
      // ─── v15 ───
      case 'monthlyTest':   result = requireEngineer_(body.token, function(){ return sendMonthlySummary({ onlyUser: verifyToken_(body.token), force:true }); }); break;
      case 'getInvLog':     result = requireAuth(body.token, function(){ return getInvLog_(body.limit); }); break;
      default:            result = { error: 'Unknown action: ' + action };
    }

    if (result && result.error) out = { ok:false, error:result.error };
    else                        out = { ok:true,  data:result };
    // มีการเขียนข้อมูล → ล้างแคช bootstrap เพื่อให้ทุกคนเห็นข้อมูลล่าสุด
    if (!isRead && out.ok) invalidateCache_();
  } catch (err) {
    out = { ok:false, error:String(err) };
  } finally {
    try { if (lock) lock.releaseLock(); } catch(e2) {}
  }
  return ContentService.createTextOutput(JSON.stringify(out))
    .setMimeType(ContentService.MimeType.JSON);
}

// รองรับการเปิด URL ตรง ๆ ด้วย GET (ไว้ทดสอบว่า deploy ติดไหม)
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ ok:true, data:{ status:'online', version:'v15' } }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ═══════════════════════════════════════════════════════════════
//  ตัวช่วยทั่วไป
// ═══════════════════════════════════════════════════════════════
function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }

function ensureSheet_(name, headers, headerBg) {
  var ss = ss_();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
    sh.getRange(1,1,1,headers.length)
      .setBackground(headerBg || '#12233b').setFontColor('#FFFFFF').setFontWeight('bold');
    sh.setFrozenRows(1);
  } else if (sh.getLastColumn() < headers.length) {
    // แท็บเดิมมีคอลัมน์ไม่ครบ (อัปเกรดเวอร์ชัน) → เติมหัวคอลัมน์ใหม่ต่อท้าย
    var have = sh.getLastColumn();
    if (sh.getMaxColumns() < headers.length) sh.insertColumnsAfter(sh.getMaxColumns(), headers.length - sh.getMaxColumns());
    sh.getRange(1, have + 1, 1, headers.length - have).setValues([headers.slice(have)])
      .setBackground(headerBg || '#12233b').setFontColor('#FFFFFF').setFontWeight('bold');
  }
  return sh;
}

// อ่านทั้งแท็บเป็น array of rows (ไม่รวมหัวตาราง)
function readRows_(name) {
  var sh = ss_().getSheetByName(name);
  if (!sh) return [];
  var d = sh.getDataRange().getValues();
  return d.length > 1 ? d.slice(1) : [];
}

// ═══════════════════════════════════════════════════════════════
//  สร้าง Sheet ทั้งหมด (เรียกจากปุ่ม "เริ่มใช้งาน" หรือ Run setup())
// ═══════════════════════════════════════════════════════════════
function initSheets() {
  ensureSheet_(TICKETS_SHEET, TICKET_HEADERS, '#12233b');
  ensureSheet_(HISTORY_SHEET, HISTORY_HEADERS, '#0f6e56');
  initConfigSheets();
  initPhotoSheet();
  initPMSheet();
  return { initialized: true };
}
// ใช้ชื่อ setup() ให้ Run ง่ายจากเมนู Apps Script
function setup() { return initSheets(); }

function initConfigSheets() {
  Object.keys(CFG).forEach(function(key){
    var c = CFG[key];
    var ss = ss_();
    var sh = ss.getSheetByName(c.sheet);
    if (!sh) {
      sh = ss.insertSheet(c.sheet);
      sh.appendRow(c.headers);
      sh.getRange(1,1,1,c.headers.length).setBackground('#185fa5').setFontColor('#FFFFFF').setFontWeight('bold');
      sh.setFrozenRows(1);
      c.seed.forEach(function(row){ sh.appendRow(row); });
    }
  });
  return { ok: true };
}

// ═══════════════════════════════════════════════════════════════
//  ใบแจ้งซ่อม (Tickets)
// ═══════════════════════════════════════════════════════════════
function getAllTickets() {
  var ts = ss_().getSheetByName(TICKETS_SHEET);
  if (!ts) return { tickets:[], history:{} };
  var rows = readRows_(TICKETS_SHEET);
  var tickets = rows.filter(function(r){ return r[0]; }).map(function(r){
    return {
      id:            String(r[0]),
      createdAt:     toIso_(r[1]),
      name:          r[2],
      phone:         String(r[3]),
      dept:          r[4],
      email:         r[5],
      building:      String(r[6]),
      room:          r[7],
      category:      r[8],
      priority:      r[9] || 'low',
      desc:          r[10],
      estimatedCost: Number(r[11]) || 0,
      actualCost:    Number(r[12]) || 0,
      status:        r[13] || 'pending_approval',
      assignees:     r[14] ? String(r[14]).split(',').map(function(s){return s.trim();}).filter(Boolean) : [],
      approvedAt:    r[15] ? toIso_(r[15]) : null,
      approvedBy:    r[16] || null,
      approvedBudget:Number(r[17]) || 0,
      completedAt:   r[18] ? toIso_(r[18]) : null,
      rating:        Number(r[19]) || 0,
      ratingComment: r[20] || '',
      source:        r[21] || 'ปกติ',
      needsPurchase: String(r[22]).toUpperCase() === 'TRUE',
      purchaseApprovedBy: r[23] || null,
      purchaseApprovedAt: r[24] ? toIso_(r[24]) : null,
      dueOverride:   r[25] ? formatHolidayDate_(r[25]) : '',
      ratedBy:       r[26] || '',
      carbonFlags:   r[27] ? String(r[27]).split(',').map(function(x){return x.trim();}).filter(Boolean) : []
    };
  });

  // ประวัติ จัดกลุ่มตาม TicketID
  var history = {};
  readRows_(HISTORY_SHEET).forEach(function(r){
    var tid = String(r[0]);
    if (!tid) return;
    if (!history[tid]) history[tid] = [];
    history[tid].push({ status:r[1], date:toIso_(r[2]), note:r[3], by:r[4] });
  });

  return { tickets: tickets, history: history };
}

// รวมทุกอย่างที่หน้าเว็บต้องใช้ตอนเปิด ไว้ในการเรียกครั้งเดียว
// ลด overhead ของ Apps Script (แต่ละการเรียกมี cold start/auth ~1-2 วิ)
// แทนการยิง getAll + getConfig + getPhotos + getUsers แยก 4 ครั้ง
// ─── แคชฝั่งเซิร์ฟเวอร์ (ข้อ 1) — เก็บผล bootstrap ไว้ชั่วคราว ล้างเมื่อมีการเขียน ───
var CACHE_KEY = 'BOOT_v15';
var CACHE_SEC = 300;            // อายุแคช 5 นาที (ล้างทันทีเมื่อมีการบันทึก)
var CHUNK = 90000;              // CacheService จำกัด ~100KB ต่อ key → แบ่งเป็นชิ้น
function cachePut_(key, str) {
  try {
    var c = CacheService.getScriptCache(), n = Math.ceil(str.length / CHUNK), m = {};
    if (n > 20) return;                                  // ใหญ่เกิน ไม่แคช
    for (var i = 0; i < n; i++) m[key + '_' + i] = str.substr(i * CHUNK, CHUNK);
    m[key + '_n'] = String(n);
    c.putAll(m, CACHE_SEC);
  } catch (e) { Logger.log('cachePut: ' + e); }
}
function cacheGet_(key) {
  try {
    var c = CacheService.getScriptCache(), n = Number(c.get(key + '_n'));
    if (!n) return null;
    var keys = []; for (var i = 0; i < n; i++) keys.push(key + '_' + i);
    var got = c.getAll(keys), str = '';
    for (var j = 0; j < n; j++) { if (got[keys[j]] == null) return null; str += got[keys[j]]; }
    return str;
  } catch (e) { return null; }
}
function invalidateCache_() {
  try { CacheService.getScriptCache().remove(CACHE_KEY + '_n'); } catch (e) {}
}

function bootstrap() {
  // ข้อ 3: ไม่สร้างใบ PM ตอนเปิดเว็บแล้ว — ย้ายไปตั้งเวลารันวันละครั้ง (setupTriggers)
  var hit = cacheGet_(CACHE_KEY);
  if (hit) { try { var o = JSON.parse(hit); o.cached = true; return o; } catch (e) {} }
  var out = buildBootstrap_();
  cachePut_(CACHE_KEY, JSON.stringify(out));
  return out;
}
function buildBootstrap_() {
  var all = getAllTickets();
  var out = { tickets: all.tickets, history: all.history, config: {}, users: [], pm: [] };
  // ข้อ 7: ไม่ส่งรูปทั้งหมดมาพร้อมหน้าแรก — ส่งแค่จำนวนรูปต่อใบ (รูปจริงโหลดตอนเปิดดู)
  try { out.config = getConfig(); }      catch (e) { Logger.log('bootstrap config: ' + e); }
  try { out.photoCounts = getPhotoCounts_(); } catch (e) { Logger.log('bootstrap photoCounts: ' + e); }
  try { out.users  = getUsers().users; }   catch (e) { Logger.log('bootstrap users: ' + e); }
  try { out.pm     = getPM().pm; }         catch (e) { Logger.log('bootstrap pm: ' + e); }
  try { out.roles  = getRoles().roles; }   catch (e) { Logger.log('bootstrap roles: ' + e); }
  try { out.routing = getRouting().routing; } catch (e) { Logger.log('bootstrap routing: ' + e); }
  try { out.inventory = getInventory().inventory; } catch (e) { Logger.log('bootstrap inventory: ' + e); }
  try { out.flags  = getFlags(); }          catch (e) { Logger.log('bootstrap flags: ' + e); }
  return out;
}

// แปลงค่าวันที่ (Date object หรือ string) → ISO string
function toIso_(v) {
  if (!v) return '';
  if (Object.prototype.toString.call(v) === '[object Date]') return v.toISOString();
  return String(v);
}

function addTicket(ticket) {
  var ts = ensureSheet_(TICKETS_SHEET, TICKET_HEADERS, '#12233b');
  // v12.1: กันใบซ้ำ — ถ้าหน้าเว็บส่งซ้ำ (เน็ตช้า/หมดเวลารอ) แต่ใบนี้บันทึกไปแล้ว ไม่ต้องเพิ่มแถวใหม่
  var ids = ts.getLastRow() > 1 ? ts.getRange(2, 1, ts.getLastRow() - 1, 1).getValues() : [];
  for (var k = 0; k < ids.length; k++) if (String(ids[k][0]) === String(ticket.id)) return { inserted: k + 2, duplicate: true };
  var row = [
    ticket.id, ticket.createdAt, ticket.name, ticket.phone, ticket.dept,
    ticket.email, ticket.building, ticket.room, ticket.category, ticket.priority,
    ticket.desc, ticket.estimatedCost || 0, ticket.actualCost || 0,
    ticket.status || 'pending_approval',
    (ticket.assignees || []).join(','),
    ticket.approvedAt || '', ticket.approvedBy || '', ticket.approvedBudget || 0,
    ticket.completedAt || '',
    ticket.rating || '', ticket.ratingComment || '', ticket.source || 'ปกติ',
    ticket.needsPurchase ? 'TRUE' : 'FALSE', ticket.purchaseApprovedBy || '', ticket.purchaseApprovedAt || '',
    ticket.dueOverride || '', ticket.ratedBy || '', (ticket.carbonFlags || []).join(',')
  ];
  ts.appendRow(row);
  var lastRow = ts.getLastRow();
  ts.getRange(lastRow, 1, 1, TICKET_HEADERS.length).setBackground('#FFF8E6');

  try { notifyNewTicket(ticket); } catch (e) { Logger.log('notify error: ' + e); }
  try { notifyPeopleNewTicket_(ticket); } catch (e) { Logger.log('notify people error: ' + e); }
  try { emailRequesterReceived_(ticket); } catch (e) { Logger.log('requester email error: ' + e); }
  return { inserted: lastRow };
}

function updateTicket(id, fields) {
  var ts = ss_().getSheetByName(TICKETS_SHEET);
  if (!ts) return { error: 'ยังไม่มีแท็บ Tickets' };
  var data = ts.getDataRange().getValues();
  var colIndex = {
    status:14, assignees:15, actualCost:13, estimatedCost:12,
    approvedAt:16, approvedBy:17, approvedBudget:18, completedAt:19,
    name:3, phone:4, dept:5, email:6, building:7, room:8, category:9, priority:10, desc:11,
    rating:20, ratingComment:21, source:22,
    needsPurchase:23, purchaseApprovedBy:24, purchaseApprovedAt:25,
    dueOverride:26, ratedBy:27, carbonFlags:28
  };
  ensureSheet_(TICKETS_SHEET, TICKET_HEADERS, '#12233b');   // เติมคอลัมน์ใหม่ถ้ายังไม่มี

  var lastResult = null;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) !== String(id)) continue;
    var rowNum = i + 1;

    // ข้อ 6: แก้ค่าในหน่วยความจำ แล้วเขียนลงชีต "ครั้งเดียวทั้งแถว" (เร็วกว่าเขียนทีละช่อง)
    var width = Math.max(TICKET_HEADERS.length, data[i].length);
    if (ts.getMaxColumns() < width) ts.insertColumnsAfter(ts.getMaxColumns(), width - ts.getMaxColumns());
    var rowVals = data[i].slice();
    while (rowVals.length < width) rowVals.push('');
    var changed = false;
    Object.keys(fields).forEach(function(k){
      var col = colIndex[k];
      if (!col) return;
      var val = fields[k];
      if (val === true) val = 'TRUE';
      else if (val === false) val = 'FALSE';
      else if (Array.isArray(val)) val = val.join(', ');
      else if (val === null || val === undefined) val = '';
      rowVals[col - 1] = val; changed = true;
    });
    if (changed) ts.getRange(rowNum, 1, 1, width).setValues([rowVals]);

    if (fields.status) {
      var statusColors = {
        pending_approval:'#FFF8E6', assigned:'#E6F1FB', survey:'#FFF8E6',
        pending_purchase:'#FFF8E6', purchase:'#EEEDFE', working:'#E6F1FB', insurance:'#E1F5EE',
        contractor:'#E1F5EE', done:'#EAF3DE', cannot:'#FCEBEB', cancelled:'#F2F2F2'
      };
      ts.getRange(rowNum, 1, 1, TICKET_HEADERS.length)
        .setBackground(statusColors[fields.status] || '#FFFFFF');
    }

    try { if (fields.status && !fields.__dup) notifyStatusChange(id, fields, data[i]); }
    catch (e) { Logger.log('notify error: ' + e); }
    // v12: ปิดงาน → ส่งอีเมลลิงก์ประเมินความพึงพอใจให้ผู้แจ้ง (ถ้ากรอกอีเมลไว้)
    try { if (fields.status === 'done' && !fields.__dup && String(data[i][13]) !== 'done') sendRatingEmail_(id, rowVals); }
    catch (e) { Logger.log('rating email error: ' + e); }
    try { if (!fields.__dup) notifyPeopleOnUpdate_(id, fields, data[i], rowVals); }
    catch (e) { Logger.log('rating email error: ' + e); }

    lastResult = { updated: rowNum };   // v12.1: ไม่ return ทันที — ถ้ามีแถวซ้ำ (ข้อมูลเก่า) อัปเดตให้ครบทุกแถว
    fields = JSON.parse(JSON.stringify(fields)); if (fields.status) { /* แจ้งเตือน/อีเมลครั้งเดียวพอ */ fields.__dup = true; }
  }
  return lastResult || { error: 'Ticket not found: ' + id };
}

function addHistory(ticketId, entry) {
  if (!entry) return { skipped: true };
  var hs = ensureSheet_(HISTORY_SHEET, HISTORY_HEADERS, '#0f6e56');
  hs.appendRow([ ticketId, entry.status, entry.date, entry.note || '', entry.by || '' ]);
  return { added: true };
}

// ═══════════════════════════════════════════════════════════════
//  การตั้งค่า (อาคาร / สถานะ / ประเภทงาน / วันหยุด)
// ═══════════════════════════════════════════════════════════════
function getConfig() {
  var B = readRows_(CFG.buildings.sheet).map(function(r){
    return { id:String(r[0]), name:r[1], short:r[2], icon:r[3],
             budget:Number(r[4])||0, hidden:String(r[5]).toUpperCase()==='TRUE' };
  }).filter(function(b){ return b.id; });

  var S = readRows_(CFG.statuses.sheet).map(function(r){
    return { id:String(r[0]), label:r[1], cls:r[2],
             paused:String(r[3]).toUpperCase()==='TRUE',
             closed:String(r[4]).toUpperCase()==='TRUE',
             hidden:String(r[5]).toUpperCase()==='TRUE' };
  }).filter(function(s){ return s.id; });

  var C = readRows_(CFG.categories.sheet).map(function(r){
    return { name:String(r[0]).trim(), sla:Number(r[1])||14, hidden:String(r[2]).toUpperCase()==='TRUE' };
  }).filter(function(c){ return c.name; });

  var H = readRows_(CFG.holidays.sheet).map(function(r){
    return { date:formatHolidayDate_(r[0]), name:r[1]||'' };
  }).filter(function(h){ return h.date; });

  var F = readRows_(CFG.floors.sheet).map(function(r){
    return { building:String(r[0]), floor:String(r[1]), hidden:String(r[2]).toUpperCase()==='TRUE' };
  }).filter(function(f){ return f.building && f.floor; });

  var props = PropertiesService.getScriptProperties();
  var siteUrl = props.getProperty('SITE_URL') || '';
  var carbon = parseJson_(props.getProperty('CARBON_CFG'), null);   // v13: ค่ามาตรฐานคาร์บอน (null = ใช้ค่าเริ่มต้นในหน้าเว็บ)
  return { buildings:B, floors:F, statuses:S, categories:C, holidays:H, siteUrl:siteUrl, carbon:carbon, ops:opsCfg_() };
}

// แปลงวันที่จาก Sheet (Date object หรือข้อความ) → 'YYYY-MM-DD'
function formatHolidayDate_(v) {
  if (!v) return '';
  if (Object.prototype.toString.call(v) === '[object Date]') {
    var y=v.getFullYear(), m=('0'+(v.getMonth()+1)).slice(-2), d=('0'+v.getDate()).slice(-2);
    return y+'-'+m+'-'+d;
  }
  var s = String(v).trim();
  var mm = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (mm) return mm[1]+'-'+('0'+mm[2]).slice(-2)+'-'+('0'+mm[3]).slice(-2);
  return s;
}

function saveConfig(cfg) {
  if (!cfg) return { error: 'ไม่มีข้อมูลตั้งค่า' };

  function writeAll(key, rows) {
    var c = CFG[key];
    var ss = ss_();
    var sh = ss.getSheetByName(c.sheet);
    if (!sh) {
      sh = ss.insertSheet(c.sheet);
      sh.getRange(1,1,1,c.headers.length).setValues([c.headers])
        .setBackground('#185fa5').setFontColor('#FFFFFF').setFontWeight('bold');
      sh.setFrozenRows(1);
    }
    var last = sh.getLastRow();
    if (last > 1) sh.getRange(2,1,last-1,c.headers.length).clearContent();
    if (rows.length) sh.getRange(2,1,rows.length,c.headers.length).setValues(rows);
  }

  if (cfg.buildings)  writeAll('buildings',  cfg.buildings.map(function(b){ return [b.id,b.name,b.short||b.name,b.icon||'🏢',Number(b.budget)||0,b.hidden?'TRUE':'FALSE']; }));
  if (cfg.floors)     writeAll('floors',     cfg.floors.map(function(f){ return [f.building,f.floor,f.hidden?'TRUE':'FALSE']; }));
  if (cfg.statuses)   writeAll('statuses',   cfg.statuses.map(function(s){ return [s.id,s.label,s.cls||'b-gray',s.paused?'TRUE':'FALSE',s.closed?'TRUE':'FALSE',s.hidden?'TRUE':'FALSE']; }));
  if (cfg.categories) writeAll('categories', cfg.categories.map(function(c){ return [String(c.name).trim(),Number(c.sla)||14,c.hidden?'TRUE':'FALSE']; }));
  if (cfg.holidays)   writeAll('holidays',   cfg.holidays.map(function(h){ return [h.date,h.name||'']; }));
  if (typeof cfg.siteUrl === 'string') PropertiesService.getScriptProperties().setProperty('SITE_URL', cfg.siteUrl.trim());
  if (cfg.carbon && typeof cfg.carbon === 'object') PropertiesService.getScriptProperties().setProperty('CARBON_CFG', JSON.stringify(cfg.carbon));
  if (cfg.ops && typeof cfg.ops === 'object') PropertiesService.getScriptProperties().setProperty('OPS_CFG', JSON.stringify(normOps_(cfg.ops)));

  return { saved: true };
}

// ═══════════════════════════════════════════════════════════════
//  ยืนยันตัวตนฝั่งเซิร์ฟเวอร์ (Auth)
//  รหัสผ่านเก็บแบบ hash (SHA-256 + salt) ไม่เก็บรหัสจริง
// ═══════════════════════════════════════════════════════════════
const USER_HEADERS = ['Username','PasswordHash','Salt','Name','Role','IsEngineer','Color','Initials','Specialty','Active',
                      'Email','LineId','Notify','NotifyEvents','LinkCode'];   // v14: การแจ้งเตือนรายคน

function sha256_(text) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8);
  return bytes.map(function(b){ return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('');
}
function makeSalt_() { return Utilities.getUuid().replace(/-/g,'').substring(0,16); }
function hashPassword_(password, salt) { return sha256_(salt + '::' + password + '::vetrepair'); }

// ⬇️ แก้รหัสผ่านตรงนี้ แล้วกด Run ฟังก์ชันนี้หนึ่งครั้ง (ตอนติดตั้ง)
function setupUsers() {
  // บัญชีเริ่มต้น — เปลี่ยนรหัสผ่านทันทีหลังติดตั้ง และเพิ่มคนอื่นได้เองในหน้าตั้งค่า → จัดการผู้ใช้
  var SEED = [
    // username, password,    ชื่อที่แสดง,          role,    isEngineer, สี,        อักษรย่อ, ความเชี่ยวชาญ
    ['admin', 'admin1234', 'นายปณิธาน แก้วเจริญ', 'admin', true,  '#7ecbb4', 'ปณ', ''],
    ['tech1', 'tech1234',  'นายธีรพงศ์ ดอกดวง',   'tech',  false, '#b5d4f4', 'ธร', 'ระบบไฟฟ้า, ระบบประปา/สุขาภิบาล, ระบบปรับอากาศ'],
  ];

  var ss = ss_();
  var sh = ss.getSheetByName(USERS_SHEET);
  if (!sh) {
    sh = ss.insertSheet(USERS_SHEET);
    sh.appendRow(USER_HEADERS);
    sh.getRange(1,1,1,USER_HEADERS.length).setBackground('#12233b').setFontColor('#FFFFFF').setFontWeight('bold');
    sh.setFrozenRows(1);
  } else {
    var last = sh.getLastRow();
    if (last > 1) sh.getRange(2,1,last-1,USER_HEADERS.length).clearContent();
  }

  SEED.forEach(function(u){
    var salt = makeSalt_();
    sh.appendRow([ u[0], hashPassword_(u[1], salt), salt, u[2], u[3], u[4]?'TRUE':'FALSE', u[5], u[6], u[7], 'TRUE' ]);
  });

  sh.hideColumns(2, 2);   // ซ่อนคอลัมน์ hash + salt
  Logger.log('สร้างบัญชี ' + SEED.length + ' รายการเรียบร้อย — อย่าลืมเปลี่ยนรหัสจากค่าตัวอย่าง');
  return { created: SEED.length };
}

// เปลี่ยนรหัสผ่าน (แก้ค่าแล้ว Run)
function changePassword() {
  var USERNAME     = 'admin';
  var NEW_PASSWORD = 'ใส่รหัสผ่านใหม่ที่นี่';
  if (NEW_PASSWORD.indexOf('ใส่') === 0) { Logger.log('กรุณาแก้ NEW_PASSWORD ก่อน'); return; }

  var sh = ss_().getSheetByName(USERS_SHEET);
  if (!sh) { Logger.log('ยังไม่มีแท็บ Users — Run setupUsers() ก่อน'); return; }
  var d = sh.getDataRange().getValues();
  for (var i = 1; i < d.length; i++) {
    if (String(d[i][0]) === USERNAME) {
      var salt = makeSalt_();
      sh.getRange(i+1, 2).setValue(hashPassword_(NEW_PASSWORD, salt));
      sh.getRange(i+1, 3).setValue(salt);
      Logger.log('เปลี่ยนรหัสผ่านของ ' + USERNAME + ' เรียบร้อย');
      return { ok:true };
    }
  }
  Logger.log('ไม่พบผู้ใช้ ' + USERNAME);
}

function rowToUser_(r) {
  return {
    username:   String(r[0]),
    name:       String(r[3]),
    role:       String(r[4]),
    isEngineer: String(r[5]).toUpperCase() === 'TRUE',
    color:      String(r[6]) || '#cccccc',
    initials:   String(r[7]) || '?',
    specialty:  String(r[8]) ? String(r[8]).split(',').map(function(s){return s.trim();}).filter(Boolean) : [],
    notify:     String(r[12] || 'both'),          // line | email | both | none
    hasLine:    !!String(r[11] || ''),
    hasEmail:   !!String(r[10] || '')
  };
}

function login(username, password) {
  if (!username || !password) return { error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' };
  var sh = ss_().getSheetByName(USERS_SHEET);
  if (!sh) return { error: 'ยังไม่ได้ตั้งค่าบัญชีผู้ใช้ (ผู้ดูแลต้อง Run setupUsers ก่อน)' };

  var d = sh.getDataRange().getValues();
  for (var i = 1; i < d.length; i++) {
    if (String(d[i][0]).trim() !== String(username).trim()) continue;
    if (String(d[i][9]).toUpperCase() === 'FALSE') return { error: 'บัญชีนี้ถูกระงับการใช้งาน' };

    var stored = String(d[i][1]);
    var salt   = String(d[i][2]);
    if (hashPassword_(password, salt) !== stored) return { error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' };

    var token = Utilities.getUuid().replace(/-/g,'');
    var exp   = Date.now() + SESSION_HOURS * 3600 * 1000;
    PropertiesService.getScriptProperties().setProperty('S_' + token, JSON.stringify({ u:username, exp:exp }));
    cleanupSessions_();

    return { token: token, user: rowToUser_(d[i]) };
  }
  return { error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' };
}

function getUsers() {
  var sh = ss_().getSheetByName(USERS_SHEET);
  if (!sh) return { users: [] };
  var d = sh.getDataRange().getValues();
  var out = [];
  for (var i = 1; i < d.length; i++) {
    if (!d[i][0]) continue;
    var u = rowToUser_(d[i]);
    u.active = String(d[i][9]).toUpperCase() !== 'FALSE';
    out.push(u);
  }
  return { users: out };
}

function logout(token) {
  if (token) PropertiesService.getScriptProperties().deleteProperty('S_' + token);
  return { ok:true };
}

// ═══════════════════════════════════════════════════════════════
//  ข้อ 4 — จัดการบทบาท/สิทธิ์ และผู้ใช้ (เฉพาะวิศวกร/แอดมิน)
// ═══════════════════════════════════════════════════════════════

// คืน username จาก token ถ้าเป็นวิศวกร (isEngineer) เท่านั้น ไม่งั้นปฏิเสธ
function requireEngineer_(token, fn) {
  var sh = ss_().getSheetByName(USERS_SHEET);
  if (!sh) return fn();                       // ระบบเก่ายังไม่มีผู้ใช้ → ผ่าน (ครั้งแรก)
  var username = verifyToken_(token);
  if (!username) return { error:'AUTH_REQUIRED', message:'กรุณาเข้าสู่ระบบใหม่ (session หมดอายุ)' };
  var u = getUserByUsername_(username);
  if (!u || !u.isEngineer) return { error:'FORBIDDEN', message:'เฉพาะวิศวกร/แอดมินเท่านั้นที่ทำรายการนี้ได้' };
  return fn();
}

function getUserByUsername_(username) {
  var sh = ss_().getSheetByName(USERS_SHEET);
  if (!sh) return null;
  var d = sh.getDataRange().getValues();
  for (var i = 1; i < d.length; i++) {
    if (String(d[i][0]).trim() === String(username).trim()) { var u = rowToUser_(d[i]); u._row = i+1; u.active = String(d[i][9]).toUpperCase() !== 'FALSE'; return u; }
  }
  return null;
}

// ─── บทบาท/สิทธิ์ ───
function ensureRolesSheet_() {
  var ss = ss_();
  var sh = ss.getSheetByName(ROLES_SHEET);
  if (!sh) {
    sh = ensureSheet_(ROLES_SHEET, ROLES_HEADERS);
    DEFAULT_ROLES.forEach(function(r){ sh.appendRow(r); });
  }
  return sh;
}
function getRoles() {
  var sh = ensureRolesSheet_();
  var d = sh.getDataRange().getValues();
  var out = [];
  for (var i = 1; i < d.length; i++) {
    if (!d[i][0]) continue;
    if (String(d[i][4]).toUpperCase() === 'TRUE') continue; // hidden
    out.push({
      role:       String(d[i][0]),
      label:      String(d[i][1]) || String(d[i][0]),
      isEngineer: String(d[i][2]).toUpperCase() === 'TRUE',
      caps:       String(d[i][3]) ? String(d[i][3]).split(',').map(function(s){return s.trim();}).filter(Boolean) : []
    });
  }
  return { roles: out, allCaps: ALL_CAPS };
}
function roleIsEngineer_(role) {
  var r = getRoles().roles.filter(function(x){ return x.role === role; })[0];
  return r ? r.isEngineer : (role === 'admin');
}
// บันทึกตารางบทบาททั้งชุด (เขียนทับ)  roles = [{role,label,isEngineer,caps:[]|string,hidden}]
function saveRoles(roles) {
  if (!Array.isArray(roles) || !roles.length) return { error:'ข้อมูลบทบาทไม่ถูกต้อง' };
  // ต้องมีวิศวกรอย่างน้อย 1 บทบาท
  if (!roles.some(function(r){ return r.isEngineer === true || String(r.isEngineer).toUpperCase() === 'TRUE'; }))
    return { error:'ต้องมีบทบาทที่เป็นวิศวกร/แอดมินอย่างน้อย 1 บทบาท' };
  var sh = ensureRolesSheet_();
  var last = sh.getLastRow();
  if (last > 1) sh.getRange(2,1,last-1,ROLES_HEADERS.length).clearContent();
  roles.forEach(function(r){
    var caps = Array.isArray(r.caps) ? r.caps.join(',') : String(r.caps||'');
    var isEng = (r.isEngineer === true || String(r.isEngineer).toUpperCase() === 'TRUE') ? 'TRUE' : 'FALSE';
    sh.appendRow([ String(r.role||'').trim(), String(r.label||r.role||'').trim(), isEng, caps, (r.hidden?'TRUE':'FALSE') ]);
  });
  // อัปเดต IsEngineer ของผู้ใช้ให้ตรงกับบทบาทใหม่
  syncUsersEngineerFlag_();
  return { saved: roles.length };
}
// ปรับคอลัมน์ IsEngineer ของผู้ใช้ให้ตรงกับบทบาทปัจจุบัน
function syncUsersEngineerFlag_() {
  var sh = ss_().getSheetByName(USERS_SHEET);
  if (!sh) return;
  var d = sh.getDataRange().getValues();
  for (var i = 1; i < d.length; i++) {
    if (!d[i][0]) continue;
    var isEng = roleIsEngineer_(String(d[i][4])) ? 'TRUE' : 'FALSE';
    if (String(d[i][5]).toUpperCase() !== isEng) sh.getRange(i+1, 6).setValue(isEng);
  }
}

// ─── ผู้ใช้ (CRUD) ───
function addUser(user) {
  user = user || {};
  var username = String(user.username||'').trim();
  var password = String(user.password||'');
  if (!username) return { error:'กรุณาระบุชื่อผู้ใช้ (username)' };
  if (!/^[A-Za-z0-9_.-]{3,}$/.test(username)) return { error:'username ต้องยาว ≥3 ตัว ใช้ A–Z a–z 0–9 _ . - เท่านั้น' };
  if (password.length < 4) return { error:'รหัสผ่านต้องยาวอย่างน้อย 4 ตัว' };
  if (getUserByUsername_(username)) return { error:'มีชื่อผู้ใช้นี้อยู่แล้ว' };

  var sh = ss_().getSheetByName(USERS_SHEET) || ensureSheet_(USERS_SHEET, USER_HEADERS);
  var role = String(user.role||'tech');
  var salt = makeSalt_();
  var specialty = Array.isArray(user.specialty) ? user.specialty.join(', ') : String(user.specialty||'');
  sh.appendRow([
    username, hashPassword_(password, salt), salt,
    String(user.name||username), role, roleIsEngineer_(role)?'TRUE':'FALSE',
    String(user.color||'#9fb4cc'), String(user.initials|| username.substring(0,2).toUpperCase()),
    specialty, (user.active===false?'FALSE':'TRUE')
  ]);
  try { sh.hideColumns(2, 2); } catch(e){}
  return { created: username };
}

function updateUser(username, fields) {
  fields = fields || {};
  var u = getUserByUsername_(username);
  if (!u) return { error:'ไม่พบผู้ใช้ ' + username };
  var sh = ss_().getSheetByName(USERS_SHEET);
  var row = u._row;
  if (fields.name !== undefined)      sh.getRange(row, 4).setValue(String(fields.name));
  if (fields.role !== undefined) {
    sh.getRange(row, 5).setValue(String(fields.role));
    sh.getRange(row, 6).setValue(roleIsEngineer_(String(fields.role)) ? 'TRUE' : 'FALSE');
  }
  if (fields.color !== undefined)     sh.getRange(row, 7).setValue(String(fields.color));
  if (fields.initials !== undefined)  sh.getRange(row, 8).setValue(String(fields.initials));
  if (fields.specialty !== undefined) sh.getRange(row, 9).setValue(Array.isArray(fields.specialty)?fields.specialty.join(', '):String(fields.specialty));
  if (fields.active !== undefined) {
    // กันปิด/ลดวิศวกรคนสุดท้าย
    if (fields.active === false && u.isEngineer && countActiveEngineers_() <= 1)
      return { error:'ปิดการใช้งานไม่ได้ — ต้องเหลือวิศวกร/แอดมินที่ใช้งานได้อย่างน้อย 1 คน' };
    sh.getRange(row, 10).setValue(fields.active===false?'FALSE':'TRUE');
  }
  return { updated: username };
}

function deleteUser(username) {
  var u = getUserByUsername_(username);
  if (!u) return { error:'ไม่พบผู้ใช้ ' + username };
  if (u.isEngineer && countActiveEngineers_() <= 1) return { error:'ลบไม่ได้ — ต้องเหลือวิศวกร/แอดมินอย่างน้อย 1 คน' };
  ss_().getSheetByName(USERS_SHEET).deleteRow(u._row);
  return { deleted: username };
}

function setUserPassword(username, password) {
  if (String(password||'').length < 4) return { error:'รหัสผ่านต้องยาวอย่างน้อย 4 ตัว' };
  var u = getUserByUsername_(username);
  if (!u) return { error:'ไม่พบผู้ใช้ ' + username };
  var sh = ss_().getSheetByName(USERS_SHEET);
  var salt = makeSalt_();
  sh.getRange(u._row, 2).setValue(hashPassword_(String(password), salt));
  sh.getRange(u._row, 3).setValue(salt);
  return { ok:true, username: username };
}

function countActiveEngineers_() {
  var sh = ss_().getSheetByName(USERS_SHEET);
  if (!sh) return 0;
  var d = sh.getDataRange().getValues(), n = 0;
  for (var i = 1; i < d.length; i++) {
    if (!d[i][0]) continue;
    if (String(d[i][5]).toUpperCase() === 'TRUE' && String(d[i][9]).toUpperCase() !== 'FALSE') n++;
  }
  return n;
}

// บังคับว่าผู้ใช้ต้องมีสิทธิ์ (capability) ที่กำหนด — วิศวกรผ่านเสมอ
function requireCap_(token, cap, fn) {
  var username = verifyToken_(token);
  if (!username) return { error:'AUTH_REQUIRED', message:'กรุณาเข้าสู่ระบบใหม่' };
  var u = getUserByUsername_(username);
  if (!u) return { error:'FORBIDDEN', message:'ไม่พบบัญชีผู้ใช้' };
  var ok = u.isEngineer;
  if (!ok) { var r = getRoles().roles.filter(function(x){ return x.role === u.role; })[0]; ok = r && (r.caps||[]).indexOf(cap) >= 0; }
  if (!ok) return { error:'FORBIDDEN', message:'บทบาทของคุณไม่มีสิทธิ์ทำรายการนี้' };
  return fn(u.name || username);
}

// ═══════════════════════════════════════════════════════════════
//  ข้อ 5 — กติกาการวิ่งงาน (Routing)
// ═══════════════════════════════════════════════════════════════
function getRouting() {
  var sh = ss_().getSheetByName(ROUTING_SHEET) || ensureSheet_(ROUTING_SHEET, ROUTING_HEADERS);
  var d = sh.getDataRange().getValues(), out = [];
  for (var i = 1; i < d.length; i++) {
    if (!d[i][0]) continue;
    out.push({
      category: String(d[i][0]).trim(),
      autoAssign: String(d[i][1] || ''),
      approverRoles: String(d[i][2]) ? String(d[i][2]).split(',').map(function(s){return s.trim();}).filter(Boolean) : []
    });
  }
  return { routing: out };
}
function saveRouting(list) {
  if (!Array.isArray(list)) return { error:'ข้อมูลกติกาไม่ถูกต้อง' };
  var sh = ss_().getSheetByName(ROUTING_SHEET) || ensureSheet_(ROUTING_SHEET, ROUTING_HEADERS);
  var last = sh.getLastRow();
  if (last > 1) sh.getRange(2,1,last-1,ROUTING_HEADERS.length).clearContent();
  list.forEach(function(r){
    sh.appendRow([ String(r.category||''), String(r.autoAssign||''),
      Array.isArray(r.approverRoles)?r.approverRoles.join(','):String(r.approverRoles||'') ]);
  });
  return { saved: list.length };
}

// ═══════════════════════════════════════════════════════════════
//  ข้อ 6 — อนุมัติจัดซื้อ
// ═══════════════════════════════════════════════════════════════
function approvePurchase(id, by, note) {
  var r1 = updateTicket(id, { status:'purchase', purchaseApprovedBy:by, purchaseApprovedAt:new Date().toISOString() });
  if (r1 && r1.error) return r1;
  addHistory(id, { status:'purchase', date:new Date().toISOString(), note:'อนุมัติจัดซื้อโดย '+by+(note?(' — '+note):''), by:by });
  return { approved: id };
}

// ═══════════════════════════════════════════════════════════════
//  ข้อ 3 — คลังอุปกรณ์ (ซ่อนไว้จนกว่าจะเปิดใช้)
// ═══════════════════════════════════════════════════════════════
function getInventory() {
  var sh = ensureSheet_(INVENTORY_SHEET, INV_HEADERS);
  var d = sh.getDataRange().getValues(), out = [];
  for (var i = 1; i < d.length; i++) {
    if (!d[i][0]) continue;
    out.push({ id:String(d[i][0]), name:String(d[i][1]||''), unit:String(d[i][2]||'ชิ้น'),
      stock:Number(d[i][3])||0, hidden:String(d[i][4]).toUpperCase()==='TRUE', min:Number(d[i][5])||0 });
  }
  return { inventory: out };
}
function isLow_(it) { return it.min > 0 && it.stock <= it.min; }
function saveInventory(list, by) {
  if (!Array.isArray(list)) return { error:'ข้อมูลคลังไม่ถูกต้อง' };
  var before = {}; getInventory().inventory.forEach(function(it){ before[it.id] = it; });
  var sh = ensureSheet_(INVENTORY_SHEET, INV_HEADERS);
  var last = sh.getLastRow();
  if (last > 1) sh.getRange(2,1,last-1,INV_HEADERS.length).clearContent();
  var rows = [], logs = [], nowLow = [];
  list.forEach(function(it){
    var id = it.id || ('INV-' + Utilities.getUuid().substring(0,6).toUpperCase());
    var stock = Math.max(0, Number(it.stock)||0), min = Math.max(0, Number(it.min)||0);
    rows.push([ id, String(it.name||''), String(it.unit||'ชิ้น'), stock, it.hidden?'TRUE':'FALSE', min ]);
    var old = before[id], diff = stock - (old ? old.stock : 0);
    if (diff !== 0) logs.push([ new Date(), id, String(it.name||''), diff, stock, '', by||'-', old ? (diff > 0 ? 'รับเข้า/ปรับยอด' : 'ปรับยอดลด') : 'เพิ่มรายการใหม่' ]);
    var cur = { stock:stock, min:min };
    if (isLow_(cur) && !(old && isLow_(old))) nowLow.push({ id:id, name:String(it.name||''), unit:String(it.unit||'ชิ้น'), stock:stock, min:min });
  });
  if (rows.length) sh.getRange(2,1,rows.length,INV_HEADERS.length).setValues(rows);
  logInv_(logs);
  if (nowLow.length) { try { notifyLowStock_(nowLow); } catch (e) { Logger.log('lowstock: ' + e); } }
  return { saved: list.length, inventory: getInventory().inventory };
}
// เบิกของเข้าใบงาน: items = [{id, qty}] → ตัดสต็อก + บันทึกประวัติ + แจ้งเตือนถ้าลดลงถึงจุดสั่งซื้อ
function withdrawItems(ticketId, items, by) {
  if (!Array.isArray(items) || !items.length) return { error:'ไม่มีรายการเบิก' };
  var sh = ss_().getSheetByName(INVENTORY_SHEET);
  if (!sh) return { error:'ยังไม่มีคลังอุปกรณ์' };
  ensureSheet_(INVENTORY_SHEET, INV_HEADERS);
  var d = sh.getDataRange().getValues();
  var idx = {}; for (var i = 1; i < d.length; i++) { if (d[i][0]) idx[String(d[i][0])] = i; }
  // ตรวจสต็อกพอก่อน
  for (var j = 0; j < items.length; j++) {
    var it = items[j], row = idx[String(it.id)];
    if (row === undefined) return { error:'ไม่พบอุปกรณ์รหัส ' + it.id };
    if (!(Number(it.qty) > 0)) return { error:'จำนวนเบิกต้องมากกว่า 0' };
    if ((Number(d[row][3])||0) < Number(it.qty||0)) return { error:'สต็อกไม่พอ: ' + d[row][1] };
  }
  var names = [], logs = [], low = [];
  items.forEach(function(it){
    var row = idx[String(it.id)];
    var had = Number(d[row][3])||0, min = Number(d[row][5])||0;
    var left = had - Number(it.qty||0);
    sh.getRange(row+1, 4).setValue(left);
    d[row][3] = left;
    names.push(d[row][1] + ' x' + it.qty);
    logs.push([ new Date(), String(d[row][0]), String(d[row][1]), -Number(it.qty), left, ticketId||'', by||'-', 'เบิกเข้าใบงาน' ]);
    if (min > 0 && left <= min && had > min) low.push({ id:String(d[row][0]), name:String(d[row][1]), unit:String(d[row][2]||'ชิ้น'), stock:left, min:min });
  });
  logInv_(logs);
  try { addHistory(ticketId, { status:'', date:new Date().toISOString(), note:'เบิกอุปกรณ์: ' + names.join(', '), by:by||'-' }); } catch(e){}
  if (low.length) { try { notifyLowStock_(low); } catch (e) { Logger.log('lowstock: ' + e); } }
  return getInventory();
}
function logInv_(rows) {
  if (!rows || !rows.length) return;
  var sh = ensureSheet_(INVLOG_SHEET, INVLOG_HEADERS);
  sh.getRange(sh.getLastRow() + 1, 1, rows.length, INVLOG_HEADERS.length).setValues(rows);
}
function getInvLog_(limit) {
  var sh = ss_().getSheetByName(INVLOG_SHEET); if (!sh) return { log: [] };
  var d = sh.getDataRange().getValues().slice(1).filter(function(r){ return r[1]; });
  var n = Math.min(Number(limit) || 100, 500);
  return { log: d.slice(-n).reverse().map(function(r){ return { date:toIso_(r[0]), id:String(r[1]), name:String(r[2]), qty:Number(r[3])||0,
    balance:Number(r[4])||0, ticketId:String(r[5]||''), by:String(r[6]||''), note:String(r[7]||'') }; }) };
}
// แจ้งของใกล้หมด → วิศวกร + ผู้มีสิทธิ์อนุมัติจัดซื้อ (เหตุการณ์ 'stock')
function notifyLowStock_(items) {
  var msg = { title:'📦 อุปกรณ์ใกล้หมด ควรสั่งซื้อ', color:'#b7791f', ticketId:'', link: siteLink_('config'),
    rows: items.slice(0, 12).map(function(it){ return [it.name, 'เหลือ ' + it.stock + ' ' + it.unit + ' (จุดสั่งซื้อ ' + it.min + ')']; }) };
  managerRows_().forEach(function(r){ sendToUser_(r, 'stock', msg); });
}
// วิศวกร + ผู้ที่บทบาทมีสิทธิ์ approve_purchase (ผู้บริหาร)
function managerRows_() {
  var roles = {}; try { getRoles().roles.forEach(function(x){ roles[x.role] = x; }); } catch (e) {}
  return allUserRows_().filter(function(r){
    if (String(r[5]).toUpperCase() === 'TRUE') return true;
    var ro = roles[String(r[4])];
    return !!(ro && (ro.caps || []).indexOf('approve_purchase') >= 0);
  });
}

// ─── ธงเปิด/ปิดฟีเจอร์ (เช่น คลังอุปกรณ์) ───
function getFlags() {
  var p = PropertiesService.getScriptProperties();
  return { inventory: String(p.getProperty('FLAG_inventory')).toUpperCase() !== 'FALSE' };   // v15: เปิดใช้เป็นค่าเริ่มต้น
}
function setFlag(key, value) {
  PropertiesService.getScriptProperties().setProperty('FLAG_' + key, value ? 'TRUE' : 'FALSE');
  return { ok:true, key:key, value: !!value };
}

function verifyToken_(token) {
  if (!token) return null;
  var raw = PropertiesService.getScriptProperties().getProperty('S_' + token);
  if (!raw) return null;
  try {
    var s = JSON.parse(raw);
    if (Date.now() > s.exp) {
      PropertiesService.getScriptProperties().deleteProperty('S_' + token);
      return null;
    }
    return s.u;
  } catch (e) { return null; }
}

function cleanupSessions_() {
  try {
    var props = PropertiesService.getScriptProperties();
    var all = props.getProperties();
    var now = Date.now();
    Object.keys(all).forEach(function(k){
      if (k.indexOf('S_') !== 0) return;
      try { if (now > JSON.parse(all[k]).exp) props.deleteProperty(k); }
      catch (e) { props.deleteProperty(k); }
    });
  } catch (e) { Logger.log('cleanup error: ' + e); }
}

// บังคับ token ก่อนแก้ไขข้อมูล — ถ้ายังไม่มีแท็บ Users (ระบบเก่า) ให้ผ่านไปก่อน
function requireAuth(token, fn) {
  if (!ss_().getSheetByName(USERS_SHEET)) return fn();
  if (!verifyToken_(token)) return { error: 'AUTH_REQUIRED', message: 'กรุณาเข้าสู่ระบบใหม่ (session หมดอายุ)' };
  return fn();
}

// ═══════════════════════════════════════════════════════════════
//  แจ้งเตือนผ่าน LINE (LINE Messaging API)
//  หมายเหตุ: LINE Notify ปิดบริการแล้ว 31 มี.ค. 2568 จึงใช้ Messaging API
//
//  วิธีตั้งค่า:
//   1. สร้าง LINE Official Account ที่ manager.line.biz
//   2. developers.line.biz → Provider → Channel (Messaging API)
//   3. คัดลอก Channel access token (long-lived)
//   4. เชิญบอทเข้ากลุ่ม แล้วหา Group ID (หรือใช้ User ID ส่วนตัว)
//   5. แก้ค่าใน setupLine() แล้ว Run หนึ่งครั้ง → ทดสอบด้วย testLine()
// ═══════════════════════════════════════════════════════════════
function setupLine() {
  var CHANNEL_ACCESS_TOKEN = 'ใส่ Channel access token ที่นี่';
  var TARGET_ID            = 'ใส่ Group ID หรือ User ID ที่นี่';
  var props = PropertiesService.getScriptProperties();
  props.setProperty('LINE_TOKEN',  CHANNEL_ACCESS_TOKEN.trim());
  props.setProperty('LINE_TARGET', TARGET_ID.trim());
  props.setProperty('LINE_ENABLED','TRUE');
  Logger.log('บันทึกการตั้งค่า LINE แล้ว — ลอง Run testLine() เพื่อทดสอบ');
  return { ok:true };
}
function enableLine()  { PropertiesService.getScriptProperties().setProperty('LINE_ENABLED','TRUE');  return 'เปิดการแจ้งเตือนแล้ว'; }
function disableLine() { PropertiesService.getScriptProperties().setProperty('LINE_ENABLED','FALSE'); return 'ปิดการแจ้งเตือนแล้ว'; }

function sendLine(text) {
  try {
    var props   = PropertiesService.getScriptProperties();
    var token   = props.getProperty('LINE_TOKEN');
    var target  = props.getProperty('LINE_TARGET');
    var enabled = props.getProperty('LINE_ENABLED');
    if (enabled === 'FALSE') return { skipped:'ปิดการแจ้งเตือนอยู่' };
    if (!token || !target || token.indexOf('ใส่ ') === 0) return { skipped:'ยังไม่ได้ตั้งค่า LINE' };

    var res = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
      method:'post', contentType:'application/json',
      headers:{ 'Authorization':'Bearer ' + token },
      payload: JSON.stringify({ to:target, messages:[{ type:'text', text:String(text).substring(0,4900) }] }),
      muteHttpExceptions:true
    });
    var code = res.getResponseCode();
    if (code !== 200) Logger.log('LINE ส่งไม่สำเร็จ (' + code + '): ' + res.getContentText());
    return { code: code };
  } catch (err) {
    Logger.log('LINE error: ' + err);
    return { error: String(err) };
  }
}

function testLine() {
  var r = sendLine('🔧 ทดสอบระบบแจ้งเตือน\nระบบแจ้งซ่อมออนไลน์\nหากเห็นข้อความนี้แสดงว่าตั้งค่าสำเร็จแล้ว');
  Logger.log(JSON.stringify(r));
  return r;
}

function lineLookup_() {
  try {
    var cfg = getConfig();
    var bMap = {}, sMap = {};
    (cfg.buildings || []).forEach(function(b){ bMap[b.id] = b.name; });
    (cfg.statuses  || []).forEach(function(s){ sMap[s.id] = s.label; });
    return { b:bMap, s:sMap };
  } catch (e) { return { b:{}, s:{} }; }
}
function priorityLabel_(p) {
  return p === 'high' ? '🔴 เร่งด่วน' : p === 'med' ? '🟡 ปานกลาง' : '🟢 ปกติ';
}

function notifyNewTicket(ticket) {
  var L = lineLookup_();
  var bName = L.b[ticket.building] || ticket.building || '-';
  var lines = [
    '🆕 มีใบแจ้งซ่อมใหม่', '━━━━━━━━━━━━━━',
    'เลขที่: ' + (ticket.id || '-'),
    'อาคาร: ' + bName,
    'ห้อง: ' + (ticket.room || '-'),
    'ประเภท: ' + (ticket.category || '-'),
    'ความเร่งด่วน: ' + priorityLabel_(ticket.priority),
    'ผู้แจ้ง: ' + (ticket.name || '-') + (ticket.phone ? ' (' + ticket.phone + ')' : ''),
    '', 'รายละเอียด:', String(ticket.desc || '-').substring(0,300),
    '', '⏳ รอวิศวกรพิจารณาอนุมัติ'
  ];
  return sendLine(lines.join('\n'));
}

function notifyStatusChange(id, fields, oldRow) {
  var L = lineLookup_();
  var newStatus = fields.status;
  if (!newStatus) return { skipped:'ไม่ได้เปลี่ยนสถานะ' };

  var bName  = oldRow ? (L.b[oldRow[6]] || oldRow[6]) : '-';
  var room   = oldRow ? oldRow[7] : '-';
  var cat    = oldRow ? oldRow[8] : '-';
  var sLabel = L.s[newStatus] || newStatus;

  var icon = '🔄';
  if (newStatus === 'done')       icon = '✅';
  else if (newStatus === 'cannot')    icon = '⛔';
  else if (newStatus === 'cancelled') icon = '🚫';
  else if (newStatus === 'assigned')  icon = '👷';
  else if (newStatus === 'insurance' || newStatus === 'contractor') icon = '⏸️';

  var lines = [
    icon + ' อัปเดตสถานะงาน', '━━━━━━━━━━━━━━',
    'เลขที่: ' + id, 'อาคาร: ' + bName, 'ห้อง: ' + room,
    'ประเภท: ' + cat, 'สถานะใหม่: ' + sLabel
  ];
  if (fields.assignees) {
    var a = Array.isArray(fields.assignees) ? fields.assignees.join(', ') : fields.assignees;
    if (a) lines.push('ผู้รับผิดชอบ: ' + a);
  }
  if (fields.approvedBudget) lines.push('งบที่อนุมัติ: ' + Number(fields.approvedBudget).toLocaleString() + ' บาท');
  if (fields.actualCost)     lines.push('ค่าใช้จ่ายจริง: ' + Number(fields.actualCost).toLocaleString() + ' บาท');
  return sendLine(lines.join('\n'));
}

// สรุปงานค้างประจำวัน (ตั้ง Trigger รายวันได้: Triggers → sendDailySummary → Day timer)
function sendDailySummary() {
  var ts = ss_().getSheetByName(TICKETS_SHEET);
  if (!ts) return { error:'ไม่พบแท็บ Tickets' };
  var data = ts.getDataRange().getValues();
  var L = lineLookup_();
  var pending = 0, active = 0, urgent = [];
  for (var i = 1; i < data.length; i++) {
    var st = String(data[i][13]), pr = String(data[i][9]);
    if (st === 'done' || st === 'cannot' || st === 'cancelled') continue;
    if (st === 'pending_approval') pending++; else active++;
    if (pr === 'high') urgent.push('• ' + data[i][0] + ' ' + (L.b[data[i][6]] || data[i][6]) + ' — ' + data[i][7]);
  }
  var lines = [
    '📊 สรุปงานซ่อมประจำวัน', '━━━━━━━━━━━━━━',
    'รออนุมัติ: ' + pending + ' รายการ',
    'กำลังดำเนินการ: ' + active + ' รายการ'
  ];
  if (urgent.length) { lines.push('', '🔴 งานเร่งด่วนที่ยังค้าง (' + urgent.length + '):'); lines.push(urgent.slice(0,10).join('\n')); }
  if (pending === 0 && active === 0) lines.push('', '🎉 ไม่มีงานค้าง');
  return sendLine(lines.join('\n'));
}

// ═══════════════════════════════════════════════════════════════
//  แนบรูปภาพ (เก็บใน Google Drive)
// ═══════════════════════════════════════════════════════════════
const PHOTO_HEADERS = ['TicketID','FileID','Kind','FileName','UploadedBy','UploadedAt'];
const PHOTO_FOLDER  = 'VetRepair Photos';
const MAX_PHOTO_MB  = 5;

function getPhotoFolder_() {
  var it = DriveApp.getFoldersByName(PHOTO_FOLDER);
  if (it.hasNext()) return it.next();
  var f = DriveApp.createFolder(PHOTO_FOLDER);
  f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return f;
}

function initPhotoSheet() {
  return ensureSheet_(PHOTOS_SHEET, PHOTO_HEADERS, '#0f6e56');
}

// อัปโหลดรูป — รับ base64 (ไม่มี prefix data:) จากหน้าเว็บ
function uploadPhoto(p) {
  try {
    if (!p || !p.ticketId || !p.data) return { error:'ข้อมูลไม่ครบ' };
    var mime = p.mimeType || 'image/jpeg';
    if (mime.indexOf('image/') !== 0) return { error:'รองรับเฉพาะไฟล์รูปภาพ' };

    var bytes = Utilities.base64Decode(p.data);
    if (bytes.length > MAX_PHOTO_MB * 1024 * 1024) return { error:'ไฟล์ใหญ่เกิน ' + MAX_PHOTO_MB + ' MB' };

    var kind = ['report','before','after'].indexOf(p.kind) >= 0 ? p.kind : 'report';
    var stamp = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyyMMdd-HHmmss');
    var ext  = mime === 'image/png' ? 'png' : (mime === 'image/webp' ? 'webp' : 'jpg');
    var name = p.ticketId + '_' + kind + '_' + stamp + '.' + ext;

    var blob = Utilities.newBlob(bytes, mime, name);
    var file = getPhotoFolder_().createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    var sh = initPhotoSheet();
    sh.appendRow([ p.ticketId, file.getId(), kind, name, p.by || '-', new Date().toISOString() ]);
    return { fileId:file.getId(), kind:kind, name:name };
  } catch (err) {
    Logger.log('uploadPhoto error: ' + err);
    return { error: String(err) };
  }
}

function getPhotos() {
  var sh = ss_().getSheetByName(PHOTOS_SHEET);
  if (!sh) return { photos:{} };
  var out = {};
  readRows_(PHOTOS_SHEET).forEach(function(r){
    var tid = String(r[0]);
    if (!tid) return;
    if (!out[tid]) out[tid] = [];
    out[tid].push({ fileId:String(r[1]), kind:String(r[2]), name:String(r[3]), by:String(r[4]), at:String(r[5]) });
  });
  return { photos: out };
}

// ข้อ 7: โหลดรูปเฉพาะใบที่เปิดดู
function getTicketPhotos(id) {
  var out = [];
  readRows_(PHOTOS_SHEET).forEach(function(r){
    if (String(r[0]) !== String(id)) return;
    out.push({ fileId:String(r[1]), kind:String(r[2]), name:String(r[3]), by:String(r[4]), at:String(r[5]) });
  });
  return { id: String(id), photos: out };
}
// จำนวนรูปต่อใบ (ส่งไปพร้อม bootstrap — เล็กมาก)
function getPhotoCounts_() {
  var out = {};
  readRows_(PHOTOS_SHEET).forEach(function(r){ var t = String(r[0]); if (t) out[t] = (out[t]||0) + 1; });
  return out;
}

function deletePhoto(fileId) {
  try {
    var sh = ss_().getSheetByName(PHOTOS_SHEET);
    if (sh) {
      var d = sh.getDataRange().getValues();
      for (var i = d.length - 1; i >= 1; i--) {
        if (String(d[i][1]) === String(fileId)) { sh.deleteRow(i + 1); break; }
      }
    }
    try { DriveApp.getFileById(fileId).setTrashed(true); } catch (e) { Logger.log('trash error: ' + e); }
    return { deleted: fileId };
  } catch (err) {
    return { error: String(err) };
  }
}

// ═══════════════════════════════════════════════════════════════
//  ความพึงพอใจหลังปิดงาน (ดาว 1-5) — ผู้แจ้งให้คะแนนได้ ไม่ต้อง login
// ═══════════════════════════════════════════════════════════════
function rateTicket(id, rating, comment, ratedBy) {
  var ts = ss_().getSheetByName(TICKETS_SHEET);
  if (!ts) return { error: 'ยังไม่มีแท็บ Tickets' };
  var r = Math.round(Number(rating) || 0);
  if (r < 1 || r > 5) return { error: 'คะแนนต้องอยู่ระหว่าง 1-5' };
  var data = ts.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) !== String(id)) continue;
    // ให้คะแนนได้เฉพาะงานที่เสร็จแล้ว และยังไม่เคยให้คะแนน
    if (String(data[i][13]) !== 'done') return { error: 'ให้คะแนนได้เฉพาะงานที่เสร็จแล้ว' };
    if (Number(data[i][19]) > 0)        return { error: 'ใบนี้ให้คะแนนไปแล้ว' };
    // v12: ประเมินแทน — เปิดให้หลังปิดงานครบ RATE_PROXY_DAYS วัน และต้องระบุชื่อผู้ประเมิน
    var proxy = String(ratedBy || '').trim();
    if (proxy) {
      var doneAt = data[i][18] ? new Date(data[i][18]) : null;
      if (doneAt && (new Date() - doneAt) < RATE_PROXY_DAYS * 86400000)
        return { error: 'ประเมินแทนได้หลังปิดงาน ' + RATE_PROXY_DAYS + ' วัน' };
    }
    ensureSheet_(TICKETS_SHEET, TICKET_HEADERS, '#12233b');
    ts.getRange(i+1, 20).setValue(r);                    // Rating
    ts.getRange(i+1, 21).setValue(comment || '');        // RatingComment
    ts.getRange(i+1, 27).setValue(proxy);                // RatedBy (ว่าง = ผู้แจ้งประเมินเอง)
    addHistory(id, { status:'done', date:new Date().toISOString(),
      note: (proxy ? 'ประเมินแทนโดย ' + proxy : 'ผู้แจ้งประเมิน') + ' — ' + r + ' ดาว' + (comment ? ' “' + comment + '”' : ''),
      by: proxy || 'ผู้แจ้ง' });
    return { rated: r };
  }
  return { error: 'ไม่พบใบแจ้งซ่อม: ' + id };
}

// ═══════════════════════════════════════════════════════════════
//  ระบบ PM (ซ่อมบำรุงเชิงป้องกัน) — รอบเป็นจำนวนวัน
// ═══════════════════════════════════════════════════════════════
function initPMSheet() {
  return ensureSheet_(PM_SHEET, PM_HEADERS, '#7a5a0f');
}

function getPM() {
  var sh = ss_().getSheetByName(PM_SHEET);
  if (!sh) return { pm: [] };
  var pm = readRows_(PM_SHEET).map(function(r){
    return {
      id:           String(r[0]),
      name:         r[1],
      building:     String(r[2]),
      floor:        r[3] || '',
      category:     r[4] || 'อื่นๆ',
      priority:     r[5] || 'low',
      intervalDays: Number(r[6]) || 180,
      lastDone:     r[7] ? toIso_(r[7]) : '',
      desc:         r[8] || '',
      active:       String(r[9]).toUpperCase() !== 'FALSE',
      mode:         r[10] || 'interval',
      schedule:     parseJson_(r[11], {})
    };
  }).filter(function(p){ return p.id; });
  return { pm: pm };
}

// บันทึกรายการ PM ทั้งชุด (เขียนทับ) — เรียกจากหน้าจัดการ PM
function savePM(list) {
  if (!list) return { error: 'ไม่มีข้อมูล PM' };
  var sh = initPMSheet();
  ensureSheet_(PM_SHEET, PM_HEADERS, '#7a5a0f');
  var last = sh.getLastRow();
  if (last > 1) sh.getRange(2,1,last-1,PM_HEADERS.length).clearContent();
  var rows = list.filter(function(p){ return p.name && p.building; }).map(function(p){
    return [
      p.id || ('PM-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2,3).toUpperCase()),
      p.name, p.building, p.floor || '', p.category || 'อื่นๆ', p.priority || 'low',
      Number(p.intervalDays) || 180, p.lastDone || '', p.desc || '', p.active===false ? 'FALSE':'TRUE',
      p.mode || 'interval', JSON.stringify(p.schedule || {})
    ];
  });
  if (rows.length) sh.getRange(2,1,rows.length,PM_HEADERS.length).setValues(rows);
  return { saved: rows.length };
}

// เช็ก PM ที่ถึงรอบ แล้วสร้างใบแจ้งซ่อมอัตโนมัติ (แบบ A)
// เงื่อนไข: active=TRUE และ (วันนี้ - lastDone) >= intervalDays (ถ้าไม่มี lastDone ถือว่าถึงรอบ)
function runDuePM() {
  var sh = ss_().getSheetByName(PM_SHEET);
  if (!sh) return { created: 0 };
  ensureSheet_(PM_SHEET, PM_HEADERS, '#7a5a0f');
  var data = sh.getDataRange().getValues();
  var now = new Date();
  var created = 0;
  var MODE_LABEL = { interval:'ตามรอบวัน', dates:'วันที่กำหนด', range:'ช่วงวันที่', monthly:'รายเดือน', yearly:'รายปี' };

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue;
    if (String(row[9]).toUpperCase() === 'FALSE') continue;   // ปิดอยู่

    var p = { intervalDays:Number(row[6]) || 180, lastDone: row[7] ? new Date(row[7]) : null,
              mode: row[10] || 'interval', schedule: parseJson_(row[11], {}) };
    var occ = pmNextOcc_(p, now);
    if (!occ || occ.start > now) continue;                     // ยังไม่ถึงรอบ

    var rangeTxt = occ.end ? ('\n(ช่วงที่ต้องทำ: ' + ymd_(occ.start) + ' ถึง ' + ymd_(occ.end) + ')')
                 : (p.mode === 'interval' ? '\n(รอบทุก ' + p.intervalDays + ' วัน)' : '\n(' + (MODE_LABEL[p.mode]||p.mode) + ')');
    var ticket = {
      id: 'REP-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2,4).toUpperCase(),
      createdAt: now.toISOString(),
      name: 'ระบบ PM (ซ่อมบำรุงเชิงป้องกัน)',
      phone: '-', dept: 'งานกายภาพ', email: '',
      building: String(row[2]), room: (row[3] ? row[3] + ' — ' : '') + String(row[1]),
      category: row[4] || 'อื่นๆ', priority: row[5] || 'low',
      desc: '[งานบำรุงรักษาตามแผน PM] ' + (row[8] || row[1]) + rangeTxt,
      estimatedCost: 0, actualCost: 0, status: 'pending_approval', assignees: [],
      approvedAt: '', approvedBy: '', approvedBudget: 0, completedAt: '',
      rating: '', ratingComment: '', source: 'PM',
      dueOverride: occ.end ? ymd_(occ.end) : ''               // ช่วงวันที่ → วันสุดท้ายของช่วง = วันคาดว่าเสร็จ
    };
    addTicket(ticket);
    addHistory(ticket.id, { status:'pending_approval', date:now.toISOString(), note:'สร้างอัตโนมัติจากแผน PM: ' + row[1], by:'ระบบ PM' });

    sh.getRange(i+1, 8).setValue(now.toISOString());          // LastDone = วันนี้ (กันสร้างซ้ำ)
    created++;
  }
  return { created: created };
}

// ─── v12: หาวันที่ PM รอบถัดไป (ต้องตรงกับ pmNextOcc ฝั่งหน้าเว็บ) ───
// คืน { start: Date, end: Date|null } = รอบแรกที่ "เริ่มหลัง lastDone" (ยังไม่เคยทำ = รอบแรกตั้งแต่วันนี้)
function pmNextOcc_(p, now) {
  now = now || new Date();
  var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  var last = p.lastDone ? new Date(p.lastDone) : null;
  var s = p.schedule || {};
  var after = function(d){ return last ? d > last : d >= today; };
  var dt = function(y, m, d){ var maxd = new Date(y, m + 1, 0).getDate(); return new Date(y, m, Math.min(d, maxd)); };
  var mode = p.mode || 'interval';
  if (mode === 'interval') {
    if (!last) return { start: today, end: null };
    return { start: new Date(last.getTime() + (Number(p.intervalDays) || 180) * 86400000), end: null };
  }
  if (mode === 'dates') {
    var ds = (s.dates || []).map(parseYmd_).filter(Boolean).sort(function(a,b){ return a - b; });
    for (var k = 0; k < ds.length; k++) if (after(ds[k])) return { start: ds[k], end: null };
    return null;
  }
  var base = last && last > today ? last : today;
  var y0 = (last ? Math.min(last.getFullYear(), today.getFullYear()) : today.getFullYear());
  if (mode === 'monthly') {
    var day = Number(s.day) || 1;
    for (var n = 0; n < 40; n++) {
      var c = dt(y0, (last ? last.getMonth() : today.getMonth()) + n, day);
      if (after(c)) return { start: c, end: null };
    }
    return null;
  }
  if (mode === 'yearly') {
    for (var y = y0; y < y0 + 3; y++) { var c2 = dt(y, (Number(s.month) || 1) - 1, Number(s.day) || 1); if (after(c2)) return { start: c2, end: null }; }
    return null;
  }
  if (mode === 'range') {
    var a = parseYmd_(s.start), b = parseYmd_(s.end);
    if (!a || !b) return null;
    if (!s.yearly) {
      // ช่วงเดียว: ยังไม่เคยสร้างในช่วงนี้ และยังไม่เลยวันสุดท้าย
      if (last && last >= a) return null;
      if (b < today) return null;
      return { start: a, end: b };
    }
    for (var yy = y0 - 1; yy < y0 + 3; yy++) {
      var sa = dt(yy, a.getMonth(), a.getDate());
      var sb = new Date(sa.getTime() + Math.max(0, Math.round((b - a) / 86400000)) * 86400000);   // ความยาวช่วงเท่าเดิมทุกปี
      if (sb < today) continue;                              // ช่วงนี้ผ่านไปแล้ว
      if (last && last >= sa) continue;                      // ช่วงนี้สร้างใบไปแล้ว
      return { start: sa, end: sb };
    }
    return null;
  }
  return null;
}
function parseYmd_(v) {
  if (!v) return null;
  if (Object.prototype.toString.call(v) === '[object Date]') return new Date(v.getFullYear(), v.getMonth(), v.getDate());
  var m = String(v).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}
function ymd_(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
function parseJson_(v, dflt) { if (!v) return dflt; try { return JSON.parse(v); } catch (e) { return dflt; } }

// ─── v12: อีเมลลิงก์ประเมินความพึงพอใจ (ส่งเมื่อปิดงานเป็น "เสร็จเรียบร้อย") ───
var RATE_PROXY_DAYS = 3;     // ไม่มีผู้แจ้งประเมินภายใน 3 วัน → เปิดให้ผู้เกี่ยวข้องในชั้นนั้นประเมินแทน
function sendRatingEmail_(id, row) {
  var email = String(row[5] || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { skipped: 'ไม่มีอีเมลผู้แจ้ง' };
  if (Number(row[19]) > 0) return { skipped: 'ประเมินแล้ว' };
  var site = PropertiesService.getScriptProperties().getProperty('SITE_URL') || '';
  if (!site) return { skipped: 'ยังไม่ได้ตั้งลิงก์เว็บระบบ (หน้าตั้งค่า)' };
  var L = lineLookup_();
  var link = site.replace(/[?#].*$/, '') + '?rate=' + encodeURIComponent(id);
  var esc = function(t){ return String(t == null ? '' : t).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); };
  var place = (L.b[row[6]] || row[6]) + ' — ' + row[7];
  var html = '<div style="font-family:Tahoma,sans-serif;font-size:14px;color:#222;max-width:560px">'
    + '<p>เรียน คุณ' + esc(row[2]) + '</p>'
    + '<p>งานซ่อมที่ท่านแจ้งดำเนินการ<b>เสร็จเรียบร้อย</b>แล้ว</p>'
    + '<table style="border-collapse:collapse;font-size:13px">'
    + '<tr><td style="padding:3px 10px 3px 0;color:#666">เลขที่ใบแจ้ง</td><td><b>' + esc(id) + '</b></td></tr>'
    + '<tr><td style="padding:3px 10px 3px 0;color:#666">สถานที่</td><td>' + esc(place) + '</td></tr>'
    + '<tr><td style="padding:3px 10px 3px 0;color:#666">ประเภทงาน</td><td>' + esc(row[8]) + '</td></tr>'
    + '<tr><td style="padding:3px 10px 3px 0;color:#666">รายละเอียด</td><td>' + esc(String(row[10]).slice(0, 200)) + '</td></tr>'
    + '</table>'
    + '<p style="margin:22px 0"><a href="' + link + '" style="background:#1d6b4f;color:#fff;padding:11px 22px;border-radius:8px;text-decoration:none;font-weight:bold">⭐ ประเมินความพึงพอใจ (1–5 ดาว)</a></p>'
    + '<p style="color:#666;font-size:12px">ใช้เวลาไม่ถึง 1 นาที ความเห็นของท่านช่วยให้เราพัฒนาบริการ<br>หากไม่ประเมินภายใน ' + RATE_PROXY_DAYS + ' วัน ผู้เกี่ยวข้องในชั้นนั้นอาจประเมินแทน</p>'
    + '<p style="color:#999;font-size:11px">อีเมลอัตโนมัติจากระบบแจ้งซ่อมออนไลน์ คณะการแพทย์แผนไทย — ไม่ต้องตอบกลับ</p></div>';
  MailApp.sendEmail({ to: email, subject: 'งานซ่อม ' + id + ' เสร็จแล้ว — ขอความกรุณาประเมินความพึงพอใจ',
                      htmlBody: html, name: 'ระบบแจ้งซ่อม คณะการแพทย์แผนไทย' });
  return { sent: email };
}
// ทดสอบส่งอีเมลถึงตัวเอง (Run ใน Apps Script เพื่อกดอนุญาตสิทธิ์ส่งอีเมลครั้งแรก)
function testRatingEmail() {
  var me = Session.getActiveUser().getEmail();
  MailApp.sendEmail(me, 'ทดสอบอีเมลระบบแจ้งซ่อม', 'ถ้าได้รับอีเมลนี้ แปลว่าระบบส่งลิงก์ประเมินความพึงพอใจได้แล้ว');
  return 'ส่งถึง ' + me;
}

// ═══════════════════════════════════════════════════════════════
//  ตั้งเวลาอัตโนมัติ (Run ฟังก์ชัน setupTriggers() หนึ่งครั้งหลัง Deploy)
// ═══════════════════════════════════════════════════════════════
// ข้อ 3: สร้างใบ PM ที่ถึงรอบ วันละครั้ง (แทนการทำตอนเปิดเว็บ)
function runDuePMDaily() {
  var r = runDuePM();
  if (r && r.created) invalidateCache_();
  return r;
}
// ข้อ 10: ปลุก Apps Script + เตรียมแคชไว้ล่วงหน้า (เฉพาะเวลาทำการ จ.–ศ. 07:00–19:00)
function keepWarm() {
  var now = new Date(), h = now.getHours(), d = now.getDay();
  try { maybeSendMonthly_(now); } catch (e) { Logger.log('monthly: ' + e); }   // v15: วันที่ 1 ตั้งแต่ 08:00 ส่งสรุปเดือนก่อน (ครั้งเดียว)
  if (d === 0 || d === 6 || h < 7 || h >= 19) return 'off-hours';
  if (!cacheGet_(CACHE_KEY)) cachePut_(CACHE_KEY, JSON.stringify(buildBootstrap_()));
  return 'warm';
}
function setupTriggers() {
  var keep = { runDuePMDaily:1, keepWarm:1 };
  ScriptApp.getProjectTriggers().forEach(function(t){
    if (keep[t.getHandlerFunction()]) ScriptApp.deleteTrigger(t);   // กันสร้างซ้ำ
  });
  ScriptApp.newTrigger('runDuePMDaily').timeBased().everyDays(1).atHour(6).create();
  ScriptApp.newTrigger('keepWarm').timeBased().everyMinutes(10).create();
  Logger.log('ตั้งเวลาแล้ว: สร้างใบ PM ทุกวัน 06:00 และปลุกระบบทุก 10 นาที (เวลาทำการ)');
  return { ok:true };
}

// ข้อ 9: ย้ายใบงานที่ปิดแล้วเกิน N วันไปแท็บเก็บถาวร (Run เองเมื่อข้อมูลเยอะ)
function archiveOldTickets() {
  var DAYS = 365;                                       // ⬅️ ปรับได้
  var ss = ss_(), ts = ss.getSheetByName(TICKETS_SHEET);
  if (!ts) return { moved: 0 };
  var closed = ['done','cannot','cancelled'];
  try { var cs = readRows_('Statuses').filter(function(r){ return String(r[4]).toUpperCase()==='TRUE'; }).map(function(r){ return String(r[0]); }); if (cs.length) closed = cs; } catch(e){}
  var arc = ensureSheet_('Tickets_Archive', TICKET_HEADERS, '#5c584e');
  var data = ts.getDataRange().getValues(), cutoff = Date.now() - DAYS*86400000, keepRows = [], moveRows = [];
  for (var i = 1; i < data.length; i++) {
    var r = data[i]; if (!r[0]) continue;
    var ref = r[18] || r[1];                           // CompletedAt หรือ CreatedAt
    var old = ref && new Date(ref).getTime() < cutoff;
    if (closed.indexOf(String(r[13])) >= 0 && old) moveRows.push(r); else keepRows.push(r);
  }
  if (!moveRows.length) return { moved: 0 };
  var w = data[0].length;
  arc.getRange(arc.getLastRow()+1, 1, moveRows.length, w).setValues(moveRows);
  ts.getRange(2, 1, data.length-1, w).clearContent();
  if (keepRows.length) ts.getRange(2, 1, keepRows.length, w).setValues(keepRows);
  invalidateCache_();
  Logger.log('ย้ายไปเก็บถาวร ' + moveRows.length + ' ใบ');
  return { moved: moveRows.length };
}


// ═══════════════════════════════════════════════════════════════
//  v14: แจ้งเตือนรายคน รายรายการ (LINE OA ใหม่ และ/หรือ อีเมล)
// ═══════════════════════════════════════════════════════════════
var NOTIFY_EVENTS = ['new','assigned','purchase','stock','monthly'];   // ใบใหม่ / ถูกมอบหมาย / รออนุมัติจัดซื้อ / ของใกล้หมด / สรุปรายเดือน
var NOTIFY_V15 = ['stock','monthly'];   // เหตุการณ์ใหม่ v15 — ผู้ใช้ที่ตั้งค่าไว้ก่อน v15 ได้รับโดยอัตโนมัติ

// ตั้งค่า OA ใหม่ (Run หนึ่งครั้ง) — token เก็บใน Script Properties ไม่อยู่ในโค้ด
function setupLineOA() {
  var CHANNEL_ACCESS_TOKEN = 'ใส่ Channel access token ของ LINE OA ใหม่ที่นี่';
  var MONTHLY_LIMIT = 300;    // โควตาแพ็กเกจฟรี (ข้อความ/เดือน) — เกินแล้วสลับไปส่งอีเมลแทนอัตโนมัติ
  var p = PropertiesService.getScriptProperties();
  p.setProperty('LINE_OA_TOKEN', CHANNEL_ACCESS_TOKEN.trim());
  p.setProperty('LINE_OA_LIMIT', String(MONTHLY_LIMIT));
  Logger.log('บันทึกแล้ว — ตั้ง Webhook URL ใน LINE Developers เป็นลิงก์ /exec แล้วให้ช่างผูกบัญชีจากหน้าเว็บ');
  return { ok:true };
}
function lineOAToken_() { var t = PropertiesService.getScriptProperties().getProperty('LINE_OA_TOKEN') || ''; return t.indexOf('ใส่ ') === 0 ? '' : t; }
function lineMonthKey_() { var d = new Date(); return 'LINE_CNT_' + d.getFullYear() + ('0' + (d.getMonth() + 1)).slice(-2); }
function lineUsage_() {
  var p = PropertiesService.getScriptProperties();
  return { used: Number(p.getProperty(lineMonthKey_()) || 0), limit: Number(p.getProperty('LINE_OA_LIMIT') || 300), ready: !!lineOAToken_() };
}

// ส่ง push ถึงคนเดียว คืน true ถ้าสำเร็จ (นับโควตา) — เกินโควตา/ผิดพลาด คืน false ให้ไปส่งอีเมลแทน
function linePush_(to, messages) {
  var token = lineOAToken_(); if (!token || !to) return false;
  var u = lineUsage_(); if (u.used >= u.limit) return false;
  var res = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
    method:'post', contentType:'application/json', headers:{ Authorization:'Bearer ' + token },
    payload: JSON.stringify({ to: to, messages: messages }), muteHttpExceptions:true });
  var code = res.getResponseCode();
  if (code === 200) { PropertiesService.getScriptProperties().setProperty(lineMonthKey_(), String(u.used + 1)); return true; }
  Logger.log('LINE push ' + code + ': ' + res.getContentText());
  return false;
}
function lineReply_(replyToken, text) {
  var token = lineOAToken_(); if (!token || !replyToken) return;
  UrlFetchApp.fetch('https://api.line.me/v2/bot/message/reply', {
    method:'post', contentType:'application/json', headers:{ Authorization:'Bearer ' + token },
    payload: JSON.stringify({ replyToken: replyToken, messages:[{ type:'text', text:text }] }), muteHttpExceptions:true });
}

// Webhook: พิมพ์รหัส 6 หลักที่ได้จากหน้าเว็บ → ผูก LINE กับบัญชี (การตอบกลับ reply ไม่นับโควตา)
function handleLineWebhook_(events) {
  (events || []).forEach(function(ev){
    try {
      var uid = ev.source && ev.source.userId;
      if (ev.type === 'follow') { lineReply_(ev.replyToken, 'สวัสดีครับ 👋 ระบบแจ้งซ่อมออนไลน์\nเจ้าหน้าที่: เปิดเว็บ → กดชื่อผู้ใช้มุมขวาบน → "การแจ้งเตือนของฉัน" แล้วพิมพ์รหัส 6 หลักที่เห็นส่งมาที่นี่'); return; }
      if (ev.type !== 'message' || !ev.message || ev.message.type !== 'text' || !uid) return;
      var txt = String(ev.message.text || '').replace(/\s/g, '');
      if (!/^\d{6}$/.test(txt)) { var st = siteLink_('');
        lineReply_(ev.replyToken, 'ระบบนี้ใช้ส่งแจ้งเตือนงานซ่อม' + (st ? '\n\n📝 แจ้งซ่อม: ' + siteLink_('report') + '\n🔎 ติดตามงาน: ' + siteLink_('status') + '\n📄 ใบของฉัน: ' + siteLink_('mine') : '') + '\n\nผูกบัญชีเจ้าหน้าที่: พิมพ์รหัส 6 หลักจากหน้าเว็บ'); return; }
      var sh = ss_().getSheetByName(USERS_SHEET); ensureSheet_(USERS_SHEET, USER_HEADERS);
      var d = sh.getDataRange().getValues();
      for (var i = 1; i < d.length; i++) {
        var code = String(d[i][14] || '');
        if (!code) continue;
        var parts = code.split('|');   // รหัส|หมดอายุ(ms)
        if (parts[0] === txt && Number(parts[1]) > Date.now()) {
          sh.getRange(i + 1, 12).setValue(uid);
          sh.getRange(i + 1, 15).setValue('');
          invalidateCache_();
          lineReply_(ev.replyToken, '✅ ผูก LINE กับบัญชี ' + d[i][3] + ' แล้ว\nจากนี้จะได้รับแจ้งเตือนงานซ่อมที่นี่');
          return;
        }
      }
      lineReply_(ev.replyToken, 'รหัสไม่ถูกต้องหรือหมดอายุ (ใช้ได้ 15 นาที) — ขอรหัสใหม่จากหน้าเว็บ');
    } catch (e) { Logger.log('webhook error: ' + e); }
  });
}

// ─── ตั้งค่าของตัวเอง / ของผู้อื่น (แอดมิน) ───
function userRowFull_(username) {
  var sh = ensureSheet_(USERS_SHEET, USER_HEADERS);
  var d = sh.getDataRange().getValues();
  for (var i = 1; i < d.length; i++) if (String(d[i][0]).trim() === String(username).trim()) return { sh:sh, row:i + 1, r:d[i] };
  return null;
}
function notifyInfo_(r) {
  var raw = String(r[13] || ''), ev;
  if (!raw) ev = NOTIFY_EVENTS.slice();
  else {
    ev = raw.split(',').filter(function(e){ return e && e !== '_v15'; });
    if (raw.indexOf('_v15') < 0) NOTIFY_V15.forEach(function(e){ if (ev.indexOf(e) < 0) ev.push(e); });   // ตั้งค่าไว้ก่อน v15
  }
  return { email:String(r[10] || ''), hasLine:!!String(r[11] || ''), notify:String(r[12] || 'both'), events: ev };
}
function applyNotifyFields_(x, fields) {
  fields = fields || {};
  if (fields.email !== undefined) {
    var em = String(fields.email || '').trim();
    if (em && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return { error:'รูปแบบอีเมลไม่ถูกต้อง' };
    x.sh.getRange(x.row, 11).setValue(em);
  }
  if (fields.notify !== undefined && ['line','email','both','none'].indexOf(fields.notify) >= 0) x.sh.getRange(x.row, 13).setValue(fields.notify);
  if (fields.events !== undefined) x.sh.getRange(x.row, 14).setValue((fields.events || []).filter(function(e){ return NOTIFY_EVENTS.indexOf(e) >= 0; }).concat(['_v15']).join(','));
  if (fields.unlinkLine) x.sh.getRange(x.row, 12).setValue('');
  return null;
}
function myNotify_(username, fields) {
  var x = userRowFull_(username); if (!x) return { error:'ไม่พบผู้ใช้' };
  if (fields) { var er = applyNotifyFields_(x, fields); if (er) return er; x = userRowFull_(username); }
  var out = notifyInfo_(x.r);
  if (fields && fields.newCode) {
    var code = String(Math.floor(100000 + Math.random() * 900000));
    x.sh.getRange(x.row, 15).setValue(code + '|' + (Date.now() + 15 * 60000));
    out.linkCode = code;
  }
  out.line = lineUsage_();
  invalidateCache_();
  return out;
}
function getNotifyAll_() {
  var sh = ensureSheet_(USERS_SHEET, USER_HEADERS), d = sh.getDataRange().getValues(), out = {};
  for (var i = 1; i < d.length; i++) if (d[i][0]) out[String(d[i][0])] = notifyInfo_(d[i]);
  return { users: out, line: lineUsage_() };
}
function setUserNotify_(username, fields) {
  var x = userRowFull_(username); if (!x) return { error:'ไม่พบผู้ใช้' };
  var er = applyNotifyFields_(x, fields); if (er) return er;
  invalidateCache_();
  return { updated: username };
}
function testNotify_(username) {
  var x = userRowFull_(username); if (!x) return { error:'ไม่พบผู้ใช้' };
  var r = sendToUser_(x.r, 'new', {
    title:'🔔 ทดสอบการแจ้งเตือน', color:'#29914f',
    rows:[['ถึง', String(x.r[3])], ['สถานะ', 'ถ้าเห็นข้อความนี้ แปลว่าตั้งค่าสำเร็จ']], ticketId:'' }, true);
  return r;
}

// ─── ส่งถึงผู้ใช้หนึ่งคนตามช่องทางที่เลือก (LINE ไม่ได้ → อีเมลแทน) ───
function sendToUser_(r, evt, msg, force) {
  var info = notifyInfo_(r), sent = { line:false, email:false };
  if (String(r[9]).toUpperCase() === 'FALSE') return sent;                     // ผู้ใช้ถูกปิด
  if (!force && (info.notify === 'none' || info.events.indexOf(evt) < 0)) return sent;
  var wantLine = info.notify === 'line' || info.notify === 'both';
  var wantMail = info.notify === 'email' || info.notify === 'both';
  if (wantLine && info.hasLine) sent.line = linePush_(String(r[11]), [flexCard_(msg)]);
  if ((wantMail || (wantLine && !sent.line)) && info.email) {
    MailApp.sendEmail({ to: info.email, subject: msg.title.replace(/^[^\wก-๙]+\s*/, '') + (msg.ticketId ? ' — ' + msg.ticketId : ''),
                        htmlBody: mailHtml_(msg), name:'ระบบแจ้งซ่อม คณะการแพทย์แผนไทย' });
    sent.email = true;
  }
  return sent;
}
function ticketLink_(id) {
  var site = PropertiesService.getScriptProperties().getProperty('SITE_URL') || '';
  return site && id ? site.replace(/[?#].*$/, '') + '?id=' + encodeURIComponent(id) : '';
}
function siteLink_(page) {
  var site = PropertiesService.getScriptProperties().getProperty('SITE_URL') || '';
  return site ? site.replace(/[?#].*$/, '') + (page ? '?page=' + page : '') : '';
}
function msgLink_(msg) { return msg.link || ticketLink_(msg.ticketId); }
function flexCard_(msg) {
  var link = msgLink_(msg);
  var rows = msg.rows.map(function(kv){ return { type:'box', layout:'baseline', spacing:'sm', contents:[
    { type:'text', text:String(kv[0]), color:'#888888', size:'sm', flex:2 },
    { type:'text', text:String(kv[1] || '-').substring(0, 300), wrap:true, color:'#333333', size:'sm', flex:5 } ] }; });
  var bubble = { type:'bubble', size:'mega',
    header:{ type:'box', layout:'vertical', backgroundColor: msg.color || '#29914f', paddingAll:'14px',
      contents:[{ type:'text', text:msg.title, color:'#FFFFFF', weight:'bold', size:'lg', wrap:true }].concat(
        msg.ticketId ? [{ type:'text', text:msg.ticketId, color:'#FFFFFFCC', size:'sm' }] : []) },
    body:{ type:'box', layout:'vertical', spacing:'sm', contents: rows } };
  if (link) bubble.footer = { type:'box', layout:'vertical', contents:[{ type:'button', style:'primary', color: msg.color || '#29914f',
    action:{ type:'uri', label: msg.linkLabel || 'เปิดใบงาน', uri: link } }] };
  return { type:'flex', altText: msg.title + (msg.ticketId ? ' ' + msg.ticketId : ''), contents: bubble };
}
function mailHtml_(msg) {
  var esc = function(t){ return String(t == null ? '' : t).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); };
  var link = msgLink_(msg);
  return '<div style="font-family:Tahoma,sans-serif;max-width:560px;border:1px solid #ddd;border-radius:10px;overflow:hidden">'
    + '<div style="background:' + (msg.color || '#29914f') + ';color:#fff;padding:14px 18px;font-size:17px;font-weight:bold">' + esc(msg.title)
    + (msg.ticketId ? '<div style="font-size:13px;font-weight:normal;opacity:.85">' + esc(msg.ticketId) + '</div>' : '') + '</div>'
    + '<table style="padding:12px 18px;font-size:14px;border-collapse:collapse">' + msg.rows.map(function(kv){
        return '<tr><td style="color:#888;padding:4px 14px 4px 0;vertical-align:top;white-space:nowrap">' + esc(kv[0]) + '</td><td style="padding:4px 0">' + esc(kv[1]) + '</td></tr>'; }).join('') + '</table>'
    + (link ? '<div style="padding:4px 18px 18px"><a href="' + link + '" style="background:' + (msg.color || '#29914f') + ';color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold">' + esc(msg.linkLabel || 'เปิดใบงาน') + '</a></div>' : '')
    + (msg.extraHtml || '')
    + '<div style="color:#999;font-size:11px;padding:0 18px 14px">อีเมลอัตโนมัติจากระบบแจ้งซ่อมออนไลน์ — ตั้งค่าการรับแจ้งเตือนได้ที่เว็บ (กดชื่อผู้ใช้มุมขวาบน)</div></div>';
}
function ticketRows_(t, L) {
  return [['สถานที่', (L.b[t.building] || t.building || '-') + ' — ' + (t.room || '-')], ['ประเภท', t.category || '-'],
          ['ความเร่งด่วน', priorityLabel_(t.priority)], ['ผู้แจ้ง', (t.name || '-') + (t.phone && t.phone !== '-' ? ' (' + t.phone + ')' : '')],
          ['รายละเอียด', String(t.desc || '-').substring(0, 200)]];
}
function allUserRows_() { var sh = ss_().getSheetByName(USERS_SHEET); if (!sh) return []; ensureSheet_(USERS_SHEET, USER_HEADERS); return sh.getDataRange().getValues().slice(1).filter(function(r){ return r[0]; }); }

// ใบใหม่ → วิศวกร + บทบาทที่กติกาวิ่งงานกำหนดให้อนุมัติ + ช่างที่กติกากำหนด (autoAssign)
function notifyPeopleNewTicket_(t) {
  var rule = null, cat = String(t.category || '').trim();
  try { rule = getRouting().routing.filter(function(r){ return String(r.category).trim() === cat; })[0] || null; } catch (e) {}
  var roles = rule && rule.approverRoles ? rule.approverRoles : [];
  var auto = rule && rule.autoAssign ? String(rule.autoAssign).trim().toLowerCase() : '';
  var L = lineLookup_(), msg = { title:'🆕 มีใบแจ้งซ่อมใหม่', color: t.priority === 'high' ? '#d64545' : '#29914f', rows: ticketRows_(t, L), ticketId: t.id };
  allUserRows_().forEach(function(r){
    var isEng = String(r[5]).toUpperCase() === 'TRUE';
    if (isEng || roles.indexOf(String(r[4])) >= 0 || String(r[0]).toLowerCase() === auto) sendToUser_(r, 'new', msg);
  });
}
// ถูกมอบหมาย → ช่างที่ได้รับงาน (เฉพาะคนที่เพิ่งถูกเพิ่ม) · รออนุมัติจัดซื้อ → บริหาร
function notifyPeopleOnUpdate_(id, fields, oldRow, newRow) {
  var L = lineLookup_();
  var t = { id:id, building:newRow[6], room:newRow[7], category:newRow[8], priority:newRow[9], desc:newRow[10], name:newRow[2], phone:newRow[3] };
  if (fields.assignees !== undefined) {
    var before = String(oldRow[14] || '').split(',').map(function(s){ return s.trim(); });
    var now = (Array.isArray(fields.assignees) ? fields.assignees : String(fields.assignees).split(',')).map(function(s){ return String(s).trim(); }).filter(Boolean);
    var added = now.filter(function(u){ return before.indexOf(u) < 0; });
    if (added.length) {
      var msg = { title:'👷 คุณได้รับมอบหมายงานซ่อม', color:'#2f6fb5', rows: ticketRows_(t, L).concat(
        fields.dueOverride ? [['กำหนดเสร็จ', fields.dueOverride]] : []), ticketId:id };
      allUserRows_().forEach(function(r){ if (added.indexOf(String(r[0])) >= 0) sendToUser_(r, 'assigned', msg); });
    }
  }
  if (fields.status === 'pending_purchase' && String(oldRow[13]) !== 'pending_purchase') {
    var roles = {}; try { getRoles().roles.forEach(function(x){ roles[x.role] = x; }); } catch (e) {}
    var msg2 = { title:'💰 มีงานรออนุมัติจัดซื้อ', color:'#b7791f', rows: ticketRows_(t, L).concat([['งบที่เสนอ', (Number(newRow[17]) || Number(newRow[11]) || 0).toLocaleString() + ' บาท']]), ticketId:id };
    allUserRows_().forEach(function(r){
      var ro = roles[String(r[4])];
      var isMgr = String(r[5]).toUpperCase() !== 'TRUE' && ro && (ro.caps || []).indexOf('approve_purchase') >= 0;
      if (isMgr) sendToUser_(r, 'purchase', msg2);
    });
  }
}
// อีเมลถึงผู้แจ้ง: รับเรื่องแล้ว (ตอนเสร็จมีอีเมลลิงก์ประเมินอยู่แล้ว)
function emailRequesterReceived_(t) {
  var email = String(t.email || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || t.source === 'PM') return;
  var L = lineLookup_();
  var site = PropertiesService.getScriptProperties().getProperty('SITE_URL') || '';
  var msg = { title:'📥 ได้รับเรื่องแจ้งซ่อมแล้ว', color:'#29914f', ticketId:t.id,
    rows:[['เลขที่ใบแจ้ง', t.id]].concat(ticketRows_(t, L).slice(0, 3)).concat([['สถานะ', 'รอวิศวกรตรวจสอบและอนุมัติ'], ['ติดตามงาน', site ? 'กดปุ่มด้านล่าง หรือค้นหาเลขที่ใบในหน้า "ติดตามงาน"' : 'ค้นหาเลขที่ใบในหน้า "ติดตามงาน"']]) };
  MailApp.sendEmail({ to: email, subject:'ได้รับเรื่องแจ้งซ่อมแล้ว — ' + t.id, htmlBody: mailHtml_(msg), name:'ระบบแจ้งซ่อม คณะการแพทย์แผนไทย' });
}


// ═══════════════════════════════════════════════════════════════
//  v15 — ตั้งค่างานปฏิบัติการ (จุดซ่อมซ้ำ / เป้า KPI / สรุปรายเดือน)
// ═══════════════════════════════════════════════════════════════
var OPS_DEFAULT = { hotCount:3, hotMonths:6, kpiOnTime:80, kpiRating:4, kpiDone:90, monthly:true };
function normOps_(o) {
  o = o || {};
  var n = function(v, d, lo, hi){ v = Number(v); return isFinite(v) && v >= lo && v <= hi ? v : d; };
  return { hotCount: n(o.hotCount, 3, 2, 50), hotMonths: n(o.hotMonths, 6, 1, 36),
           kpiOnTime: n(o.kpiOnTime, 80, 0, 100), kpiRating: n(o.kpiRating, 4, 1, 5), kpiDone: n(o.kpiDone, 90, 0, 100),
           monthly: o.monthly !== false };
}
function opsCfg_() { return normOps_(parseJson_(PropertiesService.getScriptProperties().getProperty('OPS_CFG'), OPS_DEFAULT)); }

// ─── สรุปรายเดือน ───
function maybeSendMonthly_(now) {
  if (now.getDate() !== 1 || now.getHours() < 8) return 'not-yet';
  var key = 'MONTHLY_SENT_' + now.getFullYear() + ('0' + (now.getMonth() + 1)).slice(-2);
  var p = PropertiesService.getScriptProperties();
  if (p.getProperty(key)) return 'sent';
  if (!opsCfg_().monthly) { p.setProperty(key, 'off'); return 'off'; }
  p.setProperty(key, new Date().toISOString());   // กันส่งซ้ำก่อน (keepWarm รันทุก 10 นาที)
  return sendMonthlySummary({});
}
function testMonthlySummary() {   // Run เองในหน้า Apps Script → ส่งสรุปเดือนก่อนถึงอีเมลของบัญชีที่ Run
  var me = Session.getActiveUser().getEmail();
  var html = monthlyMail_(monthlyStats_(prevMonth_(new Date())));
  MailApp.sendEmail({ to: me, subject: '[ทดสอบ] ' + html.subject, htmlBody: html.body, name:'ระบบแจ้งซ่อม คณะการแพทย์แผนไทย' });
  return 'ส่งถึง ' + me;
}
function prevMonth_(d) { return { y: d.getMonth() === 0 ? d.getFullYear() - 1 : d.getFullYear(), m: d.getMonth() === 0 ? 11 : d.getMonth() - 1 }; }
var TH_MONTHS = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];

// opts: { onlyUser: username (ส่งเฉพาะคนนี้ — ปุ่มทดสอบ), force: ไม่สนการตั้งค่าเหตุการณ์ }
function sendMonthlySummary(opts) {
  opts = opts || {};
  var st = monthlyStats_(prevMonth_(new Date()));
  var mail = monthlyMail_(st);
  var rows = opts.onlyUser ? allUserRows_().filter(function(r){ return String(r[0]) === String(opts.onlyUser); }) : managerRows_();
  var sent = [], skipped = [];
  rows.forEach(function(r){
    var info = notifyInfo_(r);
    if (String(r[9]).toUpperCase() === 'FALSE') return;
    if (!opts.force && (info.notify === 'none' || info.events.indexOf('monthly') < 0)) { skipped.push(String(r[3])); return; }
    if (info.email) {   // สรุปรายเดือนส่งทางอีเมลเป็นหลัก (ตารางยาว ไม่เปลืองโควตา LINE)
      MailApp.sendEmail({ to: info.email, subject: mail.subject, htmlBody: mail.body, name:'ระบบแจ้งซ่อม คณะการแพทย์แผนไทย' });
      sent.push(String(r[3]) + ' (อีเมล)');
    } else if (info.hasLine) {
      var ok = linePush_(String(r[11]), [flexCard_({ title:'📊 ' + mail.subject, color:'#1d4632', ticketId:'', link: siteLink_('dashboard'), linkLabel:'ดู Dashboard', rows: mail.shortRows })]);
      if (ok) sent.push(String(r[3]) + ' (LINE)'); else skipped.push(String(r[3]) + ' (ส่ง LINE ไม่ได้)');
    } else skipped.push(String(r[3]) + ' (ไม่มีอีเมล/LINE)');
  });
  Logger.log('สรุปรายเดือน: ส่ง ' + sent.join(', ') + (skipped.length ? ' · ข้าม ' + skipped.join(', ') : ''));
  return { sent: sent, skipped: skipped, month: st.label };
}

// ─── คำนวณสถิติของเดือน ───
function workDaysAdd_(date, n, hol) {
  var d = new Date(date), left = Math.max(0, Math.round(n));
  while (left > 0) { d.setDate(d.getDate() + 1); var w = d.getDay(); if (w !== 0 && w !== 6 && !hol[ymd_(d)]) left--; }
  return d;
}
function monthlyStats_(pm) {
  var start = new Date(pm.y, pm.m, 1), end = new Date(pm.y, pm.m + 1, 1);
  var cfg = getConfig(), ops = cfg.ops || opsCfg_();
  var sla = {}; (cfg.categories || []).forEach(function(c){ sla[String(c.name).trim()] = Number(c.sla) || 14; });
  var hol = {}; (cfg.holidays || []).forEach(function(h){ hol[h.date] = 1; });
  var bName = {}; (cfg.buildings || []).forEach(function(b){ bName[b.id] = b.short || b.name; });
  var all = getAllTickets(), T = all.tickets.filter(function(t){ return t.status !== 'cancelled'; });
  var inR = function(iso){ if (!iso) return false; var d = new Date(iso); return d >= start && d < end; };
  var created = T.filter(function(t){ return inR(t.createdAt); });
  var doneM = T.filter(function(t){ return t.status === 'done' && inR(t.completedAt); });
  var onTime = 0, judged = 0, days = 0;
  doneM.forEach(function(t){
    var c = new Date(t.completedAt);
    if (t.approvedAt) days += Math.max(0, (c - new Date(t.approvedAt)) / 86400000);
    var due = t.dueOverride ? parseYmd_(t.dueOverride) : (t.approvedAt ? workDaysAdd_(new Date(t.approvedAt), sla[String(t.category).trim()] || 14, hol) : null);
    if (due) { judged++; var e = new Date(due); e.setHours(23,59,59,999); if (c <= e) onTime++; }
  });
  var rated = doneM.filter(function(t){ return t.rating > 0; });
  var avgR = rated.length ? rated.reduce(function(a,t){ return a + t.rating; }, 0) / rated.length : 0;
  var cost = doneM.reduce(function(a,t){ return a + (Number(t.actualCost) || 0); }, 0);
  var open = T.filter(function(t){ return ['done','cannot','cancelled'].indexOf(String(t.status)) < 0 && new Date(t.createdAt) < end; });
  var cat = {}; created.forEach(function(t){ var k = String(t.category || '-').trim(); cat[k] = (cat[k] || 0) + 1; });
  var topCat = Object.keys(cat).sort(function(a,b){ return cat[b] - cat[a]; }).slice(0, 5).map(function(k){ return [k, cat[k]]; });
  var bld = {}; created.forEach(function(t){ var k = bName[t.building] || t.building; bld[k] = (bld[k] || 0) + 1; });
  var topB = Object.keys(bld).sort(function(a,b){ return bld[b] - bld[a]; }).slice(0, 5).map(function(k){ return [k, bld[k]]; });
  // จุดซ่อมซ้ำ: ห้องเดียวกัน ≥ hotCount ครั้ง ใน hotMonths เดือนล่าสุด (นับถึงสิ้นเดือนที่สรุป)
  var since = new Date(end); since.setMonth(since.getMonth() - ops.hotMonths);
  var hot = {};
  T.forEach(function(t){
    var c = new Date(t.createdAt); if (!(c >= since && c < end)) return;
    var k = t.building + '|' + roomKey_(t.room);
    if (!hot[k]) hot[k] = { place: (bName[t.building] || t.building) + ' — ' + String(t.room || '-'), n:0, cats:{} };
    hot[k].n++; var cc = String(t.category || '-').trim(); hot[k].cats[cc] = (hot[k].cats[cc] || 0) + 1;
  });
  var hotList = Object.keys(hot).map(function(k){ return hot[k]; }).filter(function(h){ return h.n >= ops.hotCount; })
    .sort(function(a,b){ return b.n - a.n; }).slice(0, 8);
  var low = []; try { low = getInventory().inventory.filter(function(it){ return !it.hidden && isLow_(it); }); } catch (e) {}
  var pmN = created.filter(function(t){ return t.source === 'PM'; }).length;
  return { label: TH_MONTHS[pm.m] + ' ' + (pm.y + 543), ops: ops,
    created: created.length, done: doneM.length, pm: pmN, open: open.length,
    onTimePct: judged ? Math.round(onTime / judged * 100) : null, judged: judged,
    avgDays: doneM.length ? Math.round(days / doneM.length * 10) / 10 : null,
    avgRating: rated.length ? Math.round(avgR * 10) / 10 : null, rated: rated.length,
    cost: cost, topCat: topCat, topB: topB, hot: hotList, low: low };
}
// ห้อง: ตัดช่องว่างซ้ำ/ตัวพิมพ์ใหญ่เล็ก เพื่อนับเป็นจุดเดียวกัน
function roomKey_(room) { return String(room || '').toLowerCase().replace(/\s+/g, ' ').replace(/\s*[—-]\s*/g, '-').trim(); }

function monthlyMail_(st) {
  var esc = function(t){ return String(t == null ? '' : t).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); };
  var o = st.ops;
  var kpi = function(label, val, unit, target, ok){ return '<td style="padding:10px;border:1px solid #e3dfd0;text-align:center;background:' + (val == null ? '#f6f4ec' : ok ? '#ecf5dc' : '#fceaea') + '">'
    + '<div style="font-size:12px;color:#5e5844">' + label + '</div><div style="font-size:22px;font-weight:bold;color:#211d12">' + (val == null ? '—' : val + unit) + '</div>'
    + (target != null ? '<div style="font-size:11px;color:#9c9578">เป้า ' + target + unit + '</div>' : '') + '</td>'; };
  var list = function(title, arr, fmt){ return arr.length ? '<div style="margin-top:14px"><b>' + title + '</b><ul style="margin:6px 0;padding-left:20px">' + arr.map(function(x){ return '<li>' + fmt(x) + '</li>'; }).join('') + '</ul></div>' : ''; };
  var subject = 'สรุปงานซ่อมประจำเดือน ' + st.label;
  var body = '<div style="font-family:Tahoma,sans-serif;max-width:640px;border:1px solid #ddd;border-radius:10px;overflow:hidden;color:#211d12">'
    + '<div style="background:#1d4632;color:#fff;padding:16px 20px"><div style="font-size:18px;font-weight:bold">📊 ' + esc(subject) + '</div><div style="font-size:12px;opacity:.85">ระบบแจ้งซ่อมออนไลน์ คณะการแพทย์แผนไทย</div></div>'
    + '<div style="padding:16px 20px;font-size:14px">'
    + '<table style="border-collapse:collapse;width:100%"><tr>'
    + kpi('แจ้งเข้าใหม่', st.created, ' ใบ') + kpi('ซ่อมเสร็จ', st.done, ' ใบ') + kpi('ค้างอยู่สิ้นเดือน', st.open, ' ใบ') + '</tr><tr>'
    + kpi('เสร็จทันกำหนด', st.onTimePct, '%', o.kpiOnTime, st.onTimePct >= o.kpiOnTime)
    + kpi('ความพึงพอใจ', st.avgRating, '', o.kpiRating, st.avgRating >= o.kpiRating)
    + kpi('เวลาซ่อมเฉลี่ย', st.avgDays, ' วัน') + '</tr></table>'
    + '<div style="margin-top:10px;font-size:13px;color:#5e5844">ค่าใช้จ่ายจริงงานที่ปิดในเดือน: <b>' + st.cost.toLocaleString() + '</b> บาท · ใบ PM ที่สร้าง: <b>' + st.pm + '</b> ใบ · ประเมินความพึงพอใจ <b>' + st.rated + '</b> ใบ</div>'
    + list('ประเภทงานที่แจ้งมากที่สุด', st.topCat, function(x){ return esc(x[0]) + ' — ' + x[1] + ' ใบ'; })
    + list('อาคารที่แจ้งมากที่สุด', st.topB, function(x){ return esc(x[0]) + ' — ' + x[1] + ' ใบ'; })
    + list('🔥 จุดซ่อมซ้ำ (≥' + o.hotCount + ' ครั้งใน ' + o.hotMonths + ' เดือน) — ควรพิจารณาเปลี่ยนใหม่', st.hot, function(h){
        return esc(h.place) + ' — <b>' + h.n + ' ครั้ง</b> (' + Object.keys(h.cats).map(function(c){ return esc(c) + ' ' + h.cats[c]; }).join(', ') + ')'; })
    + list('📦 อุปกรณ์ใกล้หมด ควรสั่งซื้อ', st.low, function(it){ return esc(it.name) + ' — เหลือ ' + it.stock + ' ' + esc(it.unit) + ' (จุดสั่งซื้อ ' + it.min + ')'; })
    + (siteLink_('') ? '<div style="margin-top:18px"><a href="' + siteLink_('dashboard') + '" style="background:#1d4632;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold">ดู Dashboard / รายงาน KPI</a></div>' : '')
    + '</div><div style="color:#999;font-size:11px;padding:0 20px 14px">ส่งอัตโนมัติทุกวันที่ 1 เวลา 08:00 — ปิดได้ที่ "การแจ้งเตือนของฉัน" (ยกเลิกติ๊ก สรุปรายเดือน)</div></div>';
  var shortRows = [['แจ้งใหม่', st.created + ' ใบ'], ['ซ่อมเสร็จ', st.done + ' ใบ'], ['ค้างอยู่', st.open + ' ใบ'],
    ['ทันกำหนด', st.onTimePct == null ? '—' : st.onTimePct + '%'], ['พึงพอใจ', st.avgRating == null ? '—' : String(st.avgRating)],
    ['จุดซ่อมซ้ำ', st.hot.length + ' จุด'], ['ของใกล้หมด', st.low.length + ' รายการ']];
  return { subject: subject, body: body, shortRows: shortRows };
}
