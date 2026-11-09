/**
 * ═══════════════════════════════════════════════════════════════════════
 *  ระบบแจ้งซ่อมออนไลน์ — Google Apps Script Backend (v16.2)
 *  เวอร์ชัน v15 (2026-10-26) — ต้องใช้คู่กับหน้าเว็บ index.html v15
 *  ประวัติ: v12 ฟิลเตอร์/ปฏิทินแถบ/วันคาดว่าเสร็จ/PM 5 แบบ/ประเมินแทน+อีเมล · v12.1–12.2 แก้ใบค้าง ใบรหัสซ้ำ
 *           v13 คาร์บอนที่ประหยัดได้รายเดือน · v14 แจ้งเตือนรายคน LINE OA/อีเมล
 *           v15 คลังอุปกรณ์+จุดสั่งซื้อ/แจ้งของใกล้หมด · สรุปรายเดือนอัตโนมัติ (วันที่ 1 08:00)
 *               · ตั้งค่าจุดซ่อมซ้ำ/เป้า KPI · บันทึกการเคลื่อนไหวคลัง (แท็บ InvLog)
 *           v16.2 (9 พ.ย.) รายงานสรุปรายเดือน PDF (แนบอีเมล + ดาวน์โหลดจากเว็บ + เก็บใน Drive) · รองรับคิวรูปจากโหมดออฟไลน์
 *           v16.1 (9 พ.ย.) LINE: ผู้แจ้งติดตามใบงาน (เลขใบ+รหัส 4 หลัก) + แจ้งเมื่อสถานะเปลี่ยน · ปุ่มเริ่มซ่อม/เสร็จแล้วในการ์ด · Rich Menu 6 ปุ่ม
 *           v16.0 (9 พ.ย.) จัดโครงสร้างใหม่: ตารางเส้นทาง ROUTES (สิทธิ์ต่อ action ในที่เดียว) + ตัวช่วยอ่านตารางตามชื่อคอลัมน์ table_()
 *           v15.3 (9 พ.ย.) ความปลอดภัย: ซ่อนข้อมูลส่วนบุคคลจากผู้ไม่ล็อกอิน · กรองอักขระ HTML · ล็อกต้องได้จริง · กันเดารหัสผ่าน · รหัสผ่าน v2
 *           v15.2 (9 พ.ย.) แจ้งงานของฉันรายคนทาง LINE (ค้าง + เสร็จเดือนนี้) — ทุกเช้าวันทำการ 08:00 + พิมพ์ "งานค้าง" ในแชท OA
 *           v15.1 (29 ต.ค.) ล้างใบงานทดสอบก่อนเริ่มใช้งาน (resetTickets — สำรองเป็นชีตซ่อนก่อนลบ)
 *           (27 ต.ค.) ข้อความตอบกลับใน LINE ไม่ส่งลิงก์ "ใบของฉัน" แล้ว (หน้านี้เฉพาะผู้ที่ล็อกอิน)
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
//  ROUTER (v16) — ตารางเส้นทาง: action → สิทธิ์ที่ต้องมี + อ่าน/เขียน + ฟังก์ชันที่ทำงาน
//  auth: 'public'   = ใครก็เรียกได้ (บางตัวมีด่านตรวจของตัวเองข้างใน)
//        'user'     = ต้องล็อกอิน
//        'engineer' = วิศวกร/แอดมินเท่านั้น
//        'cap:<x>'  = บทบาทต้องมีสิทธิ์ x (วิศวกรผ่านทุกสิทธิ์)
//  read: true = อ่านอย่างเดียว → ไม่ล็อก ไม่ล้างแคช (ทำงานพร้อมกันได้หลายคน)
//  fn(body, ctx) — ctx.username = ผู้ที่ล็อกอิน (ถ้ามี), ctx.by = ชื่อที่แสดง (เฉพาะ cap:)
//  เพิ่ม action ใหม่ = เพิ่ม 1 บรรทัดในตารางนี้ (ไม่ต้องแก้ doPost)
// ═══════════════════════════════════════════════════════════════
var ROUTES = {
  // ─── ระบบ ───
  ping:            { auth:'public',   read:true,  fn:function(){ return { pong:true }; } },
  init:            { auth:'engineer',             fn:function(){ return initSheets(); } },   // v16: เดิมเรียกได้ทุกคน
  bootstrap:       { auth:'public',   read:true,  fn:function(b){ return bootstrapFor_(b.token); } },   // ไม่ล็อกอิน = ข้อมูลสาธารณะ
  getAll:          { auth:'public',   read:true,  fn:function(b){ return verifyToken_(b.token) ? getAllTickets() : publicView_(getAllTickets()); } },
  // ─── ใบแจ้งซ่อม ───
  add:             { auth:'public',               fn:function(b){
                       var r = addTicket(sanitizeObj_(b.ticket));
                       if (b.entry && r && !r.error && !r.duplicate) addHistory(b.ticket.id, sanitizeObj_(b.entry));   // รวมประวัติแรกในคำขอเดียว
                       return r; } },
  update:          { auth:'user',                 fn:function(b){ return updateTicket(b.id, sanitizeObj_(b.fields)); } },
  updateWithHistory:{ auth:'user',                fn:function(b){   // แก้ใบ + เพิ่มประวัติในคำขอเดียว
                       var r = updateTicket(b.id, sanitizeObj_(b.fields || {}));
                       if (r && r.error) return r;
                       if (b.entry) addHistory(b.id, sanitizeObj_(b.entry));
                       return r; } },
  addHistory:      { auth:'public',               fn:function(b){ return publicHistoryAllowed_(b) ? addHistory(b.ticketId, sanitizeObj_(b.entry)) : { error:'AUTH_REQUIRED' }; } },
  rateTicket:      { auth:'public',               fn:function(b){ return rateTicket(b.id, b.rating, b.comment, b.ratedBy); } },
  approvePurchase: { auth:'cap:approve_purchase', fn:function(b, c){ return approvePurchase(b.id, c.by, b.note); } },
  resetTickets:    { auth:'engineer',             fn:function(b){ return resetTickets_(b.confirm); } },
  // ─── รูปภาพ ───
  uploadPhoto:     { auth:'public',               fn:function(b){ return publicPhotoAllowed_(b) ? uploadPhoto(b.photo) : { error:'AUTH_REQUIRED' }; } },
  getPhotos:       { auth:'public',   read:true,  fn:function(){ return getPhotos(); } },
  getTicketPhotos: { auth:'public',   read:true,  fn:function(b){ return getTicketPhotos(b.id); } },
  deletePhoto:     { auth:'user',                 fn:function(b){ return deletePhoto(b.fileId); } },
  // ─── ตั้งค่า / PM ───
  getConfig:       { auth:'public',   read:true,  fn:function(){ return getConfig(); } },
  saveConfig:      { auth:'user',                 fn:function(b){ return saveConfig(b.config); } },
  savePM:          { auth:'user',                 fn:function(b){ return savePM(b.list); } },
  setFlag:         { auth:'engineer',             fn:function(b){ return setFlag(b.key, b.value); } },
  // ─── ล็อกอิน / ผู้ใช้ / บทบาท ───
  login:           { auth:'public',   read:true,  fn:function(b){ return loginGuarded_(b.username, b.password); } },   // ผิด 5 ครั้ง ล็อก 15 นาที
  logout:          { auth:'public',   read:true,  fn:function(b){ return logout(b.token); } },
  getUsers:        { auth:'public',   read:true,  fn:function(){ return getUsers(); } },
  getRoles:        { auth:'public',   read:true,  fn:function(){ return getRoles(); } },
  addUser:         { auth:'engineer',             fn:function(b){ return addUser(b.user); } },
  updateUser:      { auth:'engineer',             fn:function(b){ return updateUser(b.username, b.fields); } },
  deleteUser:      { auth:'engineer',             fn:function(b){ return deleteUser(b.username); } },
  setPassword:     { auth:'engineer',             fn:function(b){ return setUserPassword(b.username, b.password); } },
  saveRoles:       { auth:'engineer',             fn:function(b){ return saveRoles(b.roles); } },
  getRouting:      { auth:'public',   read:true,  fn:function(){ return getRouting(); } },
  saveRouting:     { auth:'engineer',             fn:function(b){ return saveRouting(b.routing); } },
  // ─── คลังอุปกรณ์ ───
  getInventory:    { auth:'public',   read:true,  fn:function(){ return getInventory(); } },
  saveInventory:   { auth:'engineer',             fn:function(b, c){ var u = getUserByUsername_(c.username); return saveInventory(b.inventory, u ? u.name : ''); } },
  withdrawItems:   { auth:'user',                 fn:function(b){ return withdrawItems(b.ticketId, b.items, b.by); } },
  getInvLog:       { auth:'user',     read:true,  fn:function(b){ return getInvLog_(b.limit); } },
  // ─── แจ้งเตือน LINE / อีเมล ───
  myNotify:        { auth:'user',                 fn:function(b, c){ return myNotify_(c.username, b.fields); } },
  testNotify:      { auth:'user',                 fn:function(b, c){ return testNotify_(c.username); } },
  mineNow:         { auth:'user',                 fn:function(b, c){ return sendMineNow_(c.username); } },   // ส่งงานที่ฉันรับผิดชอบเข้า LINE ตอนนี้
  getNotifyAll:    { auth:'engineer',             fn:function(){ return getNotifyAll_(); } },
  setUserNotify:   { auth:'engineer',             fn:function(b){ return setUserNotify_(b.username, b.fields); } },
  setupRichMenu:   { auth:'engineer',             fn:function(){ return setupRichMenu(); } },   // v16.1 ติดตั้งเมนู LINE
  monthlyPdf:      { auth:'user',     read:true,  fn:function(b){ return monthlyPdfDownload_(b.ym); } },   // v16.2 ดาวน์โหลดรายงาน PDF
  monthlyTest:     { auth:'engineer',             fn:function(b, c){ return sendMonthlySummary({ onlyUser:c.username, force:true }); } }
};

// ตรวจสิทธิ์ตามตาราง แล้วเรียกฟังก์ชัน (ใช้ด่านเดิม requireAuth / requireEngineer_ / requireCap_)
function runRoute_(route, body) {
  var ctx = { username: verifyToken_(body.token) || '' };
  var call = function(by){ if (by) ctx.by = by; return route.fn(body, ctx); };
  var a = route.auth || 'user';
  if (a === 'public')   return call();
  if (a === 'user')     return requireAuth(body.token, call);
  if (a === 'engineer') return requireEngineer_(body.token, call);
  if (a.indexOf('cap:') === 0) return requireCap_(body.token, a.substring(4), call);
  return { error:'FORBIDDEN', message:'route config ผิด: ' + a };
}

function doPost(e) {
  var out = {};
  var lock = null;
  try {
    var body = JSON.parse(e.postData.contents);
    // v14: Webhook จาก LINE OA (ไม่มี action แต่มี events) → ผูกบัญชีด้วยรหัส 6 หลัก
    if (!body.action && body.events) { handleLineWebhook_(body.events); return ContentService.createTextOutput('OK'); }
    var action = body.action;
    var route = ROUTES.hasOwnProperty(action) ? ROUTES[action] : null;
    var isRead = !route || !!route.read;   // action ที่ไม่รู้จัก = ไม่ล็อก (ตอบ error ทันที)
    if (!isRead) {   // ล็อกเฉพาะตอนเขียน — v15.3: ถ้าไม่ได้ล็อก ห้ามเขียนต่อ (กันข้อมูลทับกัน)
      lock = LockService.getScriptLock();
      if (!lock.tryLock(20000)) { lock = null; return ContentService.createTextOutput(JSON.stringify({ ok:false, error:'ระบบกำลังบันทึกข้อมูลอื่นอยู่ กรุณาลองใหม่อีกครั้ง' })).setMimeType(ContentService.MimeType.JSON); }
    }
    var result;

    result = route ? runRoute_(route, body) : { error: 'Unknown action: ' + action };

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
  return ContentService.createTextOutput(JSON.stringify({ ok:true, data:{ status:'online', version:'v16.2' } }))
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

// v16: อ่านแท็บโดยอ้าง "ชื่อหัวคอลัมน์" แทนเลขคอลัมน์ (เพิ่ม/สลับคอลัมน์แล้วโค้ดไม่พัง)
//   var T = table_(TICKETS_SHEET);
//   T.rows.forEach(function(r){ r.get('Status') });       // อ่านค่า
//   T.set(r, 'Status', 'done');                             // เขียนค่ากลับลงชีต (ทีละช่อง)
//   T.objects()  → [{ID:..., Status:...}, ...]               // แปลงเป็น object ทั้งแท็บ
//   T.find('ID', 'REP-0001')  → แถวแรกที่ตรง (หรือ null)
function table_(name) {
  var sh = ss_().getSheetByName(name);
  var T = { sheet: sh, headers: [], idx: {}, rows: [] };
  if (!sh || sh.getLastRow() < 1) { T.objects = function(){ return []; }; T.find = function(){ return null; }; T.set = function(){}; return T; }
  var d = sh.getDataRange().getValues();
  T.headers = d[0].map(function(h){ return String(h).trim(); });
  T.headers.forEach(function(h, i){ var k = h.toLowerCase(); if (h && !(k in T.idx)) T.idx[k] = i; });   // ไม่สนตัวพิมพ์เล็ก/ใหญ่
  T.col = function(h){ var k = String(h).toLowerCase(); return k in T.idx ? T.idx[k] : -1; };
  T.rows = d.slice(1).map(function(v, i){
    return { row: i + 2, values: v, get: function(h){ var c = T.col(h); return c < 0 ? undefined : v[c]; } };
  });
  T.objects = function(){ return T.rows.map(function(r){ var o = {}; T.headers.forEach(function(h, i){ if (h) o[h] = r.values[i]; }); return o; }); };
  T.find = function(h, val){ var c = T.col(h); if (c < 0) return null; for (var i = 0; i < T.rows.length; i++) if (String(T.rows[i].values[c]) === String(val)) return T.rows[i]; return null; };
  T.set = function(r, h, val){ var c = T.col(h); if (c < 0) throw new Error('ไม่พบคอลัมน์ ' + h + ' ในแท็บ ' + name); sh.getRange(r.row, c + 1).setValue(val); r.values[c] = val; };
  return T;
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
  for (var k = 0; k < ids.length; k++) if (String(ids[k][0]) === String(ticket.id)) { try { savePin_(ticket.id, ticket.trackPin); } catch (e) {} return { inserted: k + 2, duplicate: true }; }
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

  try { savePin_(ticket.id, ticket.trackPin); } catch (e) { Logger.log('track pin: ' + e); }   // v16.1 รหัสติดตามทาง LINE
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
    try { if (fields.status && !fields.__dup) notifyFollowers_(id, fields.status, String(data[i][13])); }   // v16.1 แจ้งผู้แจ้งทาง LINE
    catch (e) { Logger.log('follower notify error: ' + e); }

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
function hashPassword_(password, salt) { return sha256_(salt + '::' + password + '::vetrepair'); }   // v1 (เดิม) — ใช้ตรวจของเก่าเท่านั้น
// v15.3: รหัสผ่าน v2 — วนแฮชซ้ำ (key stretching) ให้เดารหัสได้ช้าลงมาก · เก็บเป็น "v2$<hex>"
var PW_ROUNDS = 2000;
function hashPasswordV2_(password, salt) {
  var h = sha256_(salt + '::' + password + '::ttmed');
  for (var i = 0; i < PW_ROUNDS; i++) h = sha256_(h + ':' + salt);
  return 'v2$' + h;
}
function makePasswordHash_(password, salt) { return hashPasswordV2_(password, salt); }
function checkPassword_(password, salt, stored) {
  stored = String(stored || '');
  if (stored.indexOf('v2$') === 0) return hashPasswordV2_(password, salt) === stored;
  return hashPassword_(password, salt) === stored;
}

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
    sh.appendRow([ u[0], makePasswordHash_(u[1], salt), salt, u[2], u[3], u[4]?'TRUE':'FALSE', u[5], u[6], u[7], 'TRUE' ]);
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
      sh.getRange(i+1, 2).setValue(makePasswordHash_(NEW_PASSWORD, salt));
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
    if (!checkPassword_(password, salt, stored)) return { error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' };
    if (stored.indexOf('v2$') !== 0) { try { sh.getRange(i + 1, 2).setValue(hashPasswordV2_(password, salt)); } catch (e) {} }   // อัปเกรดเป็น v2 เงียบ ๆ

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
    username, makePasswordHash_(password, salt), salt,
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
  sh.getRange(u._row, 2).setValue(makePasswordHash_(String(password), salt));
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
  try { maybeSendMonthly_(now); } catch (e) { Logger.log('monthly: ' + e); }
  try { maybeSendDailyMine_(now); } catch (e) { Logger.log('daily mine: ' + e); }   // v15.2: วันทำการ 08:00 ส่งงานของฉันรายคน   // v15: วันที่ 1 ตั้งแต่ 08:00 ส่งสรุปเดือนก่อน (ครั้งเดียว)
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
var NOTIFY_EVENTS = ['new','assigned','purchase','stock','monthly','daily'];   // v15.2: daily = งานของฉัน (ค้าง/เสร็จ) ทุกเช้าวันทำการ   // ใบใหม่ / ถูกมอบหมาย / รออนุมัติจัดซื้อ / ของใกล้หมด / สรุปรายเดือน
var NOTIFY_V15 = ['stock','monthly'];
var NOTIFY_V152 = ['daily'];   // v15.2 — ผู้ใช้ที่ตั้งค่าไว้ก่อนหน้าได้รับโดยอัตโนมัติ (ปิดเองได้)   // เหตุการณ์ใหม่ v15 — ผู้ใช้ที่ตั้งค่าไว้ก่อน v15 ได้รับโดยอัตโนมัติ

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
      if (ev.type === 'follow') { lineReply_(ev.replyToken, 'สวัสดีครับ 👋 ระบบแจ้งซ่อมออนไลน์ คณะการแพทย์แผนไทย\n\n👤 ผู้แจ้ง: ส่ง "ติดตาม เลขใบงาน รหัส4หลัก" เช่น\nติดตาม REP-XXXX 1234\nเพื่อรับแจ้งเตือนเมื่อสถานะเปลี่ยน\n\n👷 เจ้าหน้าที่: เปิดเว็บ → กดชื่อตัวเอง 🔔 → ขอรหัสผูก LINE แล้วพิมพ์รหัส 6 หลักส่งมาที่นี่\n\nใช้เมนูด้านล่างได้เลย ⬇️'); return; }
      if (ev.type === 'postback' && uid) { handleJobPostback_(ev, uid); return; }   // v16.1 ปุ่มเริ่มซ่อม/เสร็จแล้ว
      if (ev.type !== 'message' || !ev.message || ev.message.type !== 'text' || !uid) return;
      var txt = String(ev.message.text || '').replace(/\s/g, '');
      if (/^(งานค้าง|งานของฉัน|งานฉัน|งาน|สถานะงาน|งานที่ฉันรับผิดชอบ|mine|myjobs?)$/i.test(txt)) { replyMine_(ev.replyToken, uid); return; }   // v15.2
      var rawTxt = String(ev.message.text || '').trim();   // v16.1 ผู้แจ้งติดตามใบงาน
      var mt = rawTxt.match(/^ติดตาม\s*(REP-[A-Za-z0-9]+)\s+(\d{4})$/i); if (mt) { trackFollow_(ev.replyToken, uid, mt[1], mt[2]); return; }
      var mu = rawTxt.match(/^เลิกติดตาม\s*(REP-[A-Za-z0-9]+)$/i); if (mu) { trackUnfollow_(ev.replyToken, uid, mu[1]); return; }
      if (/^(ใบของฉัน|ใบที่ฉันแจ้ง|ติดตามงาน|สถานะ|สถานะใบงาน)$/.test(txt)) { trackList_(ev.replyToken, uid); return; }
      if (/^(วิธีใช้|ช่วยเหลือ|help|เมนู)$/i.test(txt)) { replyHelp_(ev.replyToken); return; }
      if (!/^\d{6}$/.test(txt)) { var st = siteLink_('');
        lineReply_(ev.replyToken, 'ระบบนี้ใช้ส่งแจ้งเตือนงานซ่อม' + (st ? '\n\n📝 แจ้งซ่อม: ' + siteLink_('report') + '\n🔎 ติดตามงาน: ' + siteLink_('status') : '') + '\n\nติดตามใบงาน: ติดตาม REP-XXXX 1234\nผูกบัญชีเจ้าหน้าที่: พิมพ์รหัส 6 หลักจากหน้าเว็บ\nเจ้าหน้าที่ที่ผูกแล้ว: พิมพ์ "งานค้าง" เพื่อดูงานของตัวเอง'); return; }
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
          lineReply_(ev.replyToken, '✅ ผูก LINE กับบัญชี ' + d[i][3] + ' แล้ว\nจากนี้จะได้รับแจ้งเตือนงานซ่อมที่นี่\n\n💡 พิมพ์ "งานค้าง" เมื่อไหร่ก็ได้ เพื่อดูงานค้างและงานที่เสร็จแล้วของคุณ');
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
    ev = raw.split(',').filter(function(e){ return e && e.charAt(0) !== '_'; });
    if (raw.indexOf('_v15') < 0) NOTIFY_V15.forEach(function(e){ if (ev.indexOf(e) < 0) ev.push(e); });   // ตั้งค่าไว้ก่อน v15
    if (raw.indexOf('_v152') < 0) NOTIFY_V152.forEach(function(e){ if (ev.indexOf(e) < 0) ev.push(e); });   // ตั้งค่าไว้ก่อน v15.2
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
  if (fields.events !== undefined) x.sh.getRange(x.row, 14).setValue((fields.events || []).filter(function(e){ return NOTIFY_EVENTS.indexOf(e) >= 0; }).concat(['_v15','_v152']).join(','));
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
  var pdf = null; try { pdf = monthlyPdf_(st, mail); if (!opts.onlyUser) saveMonthlyPdf_(pdf); } catch (e) { Logger.log('monthly pdf: ' + e); }   // v16.2 แนบ PDF
  var rows = opts.onlyUser ? allUserRows_().filter(function(r){ return String(r[0]) === String(opts.onlyUser); }) : managerRows_();
  var sent = [], skipped = [];
  rows.forEach(function(r){
    var info = notifyInfo_(r);
    if (String(r[9]).toUpperCase() === 'FALSE') return;
    if (!opts.force && (info.notify === 'none' || info.events.indexOf('monthly') < 0)) { skipped.push(String(r[3])); return; }
    if (info.email) {   // สรุปรายเดือนส่งทางอีเมลเป็นหลัก (ตารางยาว ไม่เปลืองโควตา LINE)
      var m = { to: info.email, subject: mail.subject, htmlBody: mail.body, name:'ระบบแจ้งซ่อม คณะการแพทย์แผนไทย' };
      if (pdf) m.attachments = [pdf];
      MailApp.sendEmail(m);
      sent.push(String(r[3]) + ' (อีเมล' + (pdf ? ' + PDF' : '') + ')');
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
    cost: cost, topCat: topCat, topB: topB, hot: hotList, low: low,
    doneList: (function(){ var uName = {}; try { allUserRows_().forEach(function(r){ uName[String(r[0])] = String(r[3] || r[0]); }); } catch (e) {} return doneM.slice().sort(function(a, b){ return new Date(a.completedAt) - new Date(b.completedAt); }).map(function(t){   // v16.2 สำหรับรายงาน PDF
      return { id:t.id, completedAt:t.completedAt, place:(bName[t.building] || t.building || '-') + ' — ' + String(t.room || '-'), category:String(t.category || '-').trim(),
               who:(t.assignees || []).map(function(u){ return uName[u] || u; }).join(', '), cost:Number(t.actualCost) || 0, rating:Number(t.rating) || 0 }; }); })() };
}
// ห้อง: ตัดช่องว่างซ้ำ/ตัวพิมพ์ใหญ่เล็ก เพื่อนับเป็นจุดเดียวกัน
function roomKey_(room) { return String(room || '').toLowerCase().replace(/\s+/g, ' ').replace(/\s*[—-]\s*/g, '-').trim(); }

function monthlyMail_(st) {
  var esc = function(t){ return String(t == null ? '' : t).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); };
  var o = st.ops;
  var kpi = function(label, val, unit, target, ok){ return '<td style="padding:10px;border:1px solid #e3dfd0;text-align:center;background:' + (val == null || target == null ? '#f6f4ec' : ok ? '#ecf5dc' : '#fceaea') + '">'
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


// ═══════════════════════════════════════════════════════════════
//  v15.1: ล้างใบงานทั้งหมด (ใช้ก่อนเริ่มใช้งานจริง) — เฉพาะวิศวกร/แอดมิน
//  สำรองชีต Tickets / History / Photos เป็นชีตซ่อน BK_<ชื่อ>_<วันเวลา> ก่อนลบเสมอ
//  ไม่แตะ: ผู้ใช้ การตั้งค่า เส้นทางงาน คลังอุปกรณ์ PM และไฟล์รูปใน Drive
// ═══════════════════════════════════════════════════════════════
function resetTickets_(confirm) {
  if (String(confirm || '') !== 'ลบทั้งหมด') return { error: 'ต้องพิมพ์คำว่า "ลบทั้งหมด" เพื่อยืนยัน' };
  var ss = ss_(), stamp = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyyMMdd_HHmmss');
  var out = { backup: [], deleted: {} };
  [TICKETS_SHEET, HISTORY_SHEET, PHOTOS_SHEET].forEach(function(n) {
    var sh = ss.getSheetByName(n); if (!sh) return;
    var rows = Math.max(0, sh.getLastRow() - 1);
    out.deleted[n] = rows;
    if (rows > 0) {
      var bk = sh.copyTo(ss).setName('BK_' + n + '_' + stamp);
      bk.hideSheet();
      out.backup.push(bk.getName());
      // แถว 1 ถูกตรึงไว้ → Sheets ไม่ยอมให้ลบทุกแถวที่ไม่ได้ตรึง จึงล้างค่าแล้วเหลือแถวว่างไว้ 1 แถว
      sh.getRange(2, 1, rows, sh.getMaxColumns()).clearContent();
      if (rows > 1) sh.deleteRows(3, rows - 1);
    }
  });
  invalidateCache_();
  return out;
}


// ═══════════════════════════════════════════════════════════════
//  v15.2: งานของฉัน — แจ้งช่างทาง LINE ว่างานที่ตัวเองรับผิดชอบ "ยังไม่เสร็จ" และ "เสร็จแล้ว (เดือนนี้)" มีอะไรบ้าง
//   1) ทุกเช้าวันทำการ 08:00 (ผ่าน keepWarm) ส่งถึงทุกคนที่มีงาน และเปิดรับเหตุการณ์ "daily"
//   2) พิมพ์ "งานค้าง" ในแชท OA → ตอบกลับทันที (reply ไม่นับโควตา)
// ═══════════════════════════════════════════════════════════════
var MINE_MAX_OPEN = 10, MINE_MAX_DONE = 5;
function lineReplyMsgs_(replyToken, messages) {
  var token = lineOAToken_(); if (!token || !replyToken) return;
  UrlFetchApp.fetch('https://api.line.me/v2/bot/message/reply', {
    method:'post', contentType:'application/json', headers:{ Authorization:'Bearer ' + token },
    payload: JSON.stringify({ replyToken: replyToken, messages: messages }), muteHttpExceptions:true });
}
function isWorkday_(d, hol) { var w = d.getDay(); return w !== 0 && w !== 6 && !hol[ymd_(d)]; }
function workDaysBetween_(a, b, hol) {   // จำนวนวันทำการจาก a ถึง b (ติดลบถ้า b อยู่ก่อน a)
  var s = new Date(a), e = new Date(b); s.setHours(0,0,0,0); e.setHours(0,0,0,0);
  var sign = e >= s ? 1 : -1, n = 0, d = new Date(s);
  while (sign > 0 ? d < e : d > e) { d.setDate(d.getDate() + sign); if (isWorkday_(d, hol)) n += sign; }
  return n;
}
// อ่านชีตครั้งเดียวแล้วใช้ร่วมกันทุกคน
function mineCtx_() {
  var cfg = getConfig();
  var sla = {}; (cfg.categories || []).forEach(function(c){ sla[String(c.name).trim()] = Number(c.sla) || 14; });
  var hol = {}; (cfg.holidays || []).forEach(function(h){ hol[h.date] = 1; });
  var bName = {}; (cfg.buildings || []).forEach(function(b){ bName[b.id] = b.short || b.name; });
  var st = {}, closed = {}, paused = {};
  (cfg.statuses || []).forEach(function(x){ st[x.id] = x.label; if (x.closed) closed[x.id] = 1; if (x.paused) paused[x.id] = 1; });
  ['done','cannot','cancelled'].forEach(function(k){ closed[k] = 1; });
  return { sla:sla, hol:hol, bName:bName, st:st, closed:closed, paused:paused, tickets:getAllTickets().tickets };
}
function isMine_(t, username) { return (t.assignees || []).indexOf(String(username)) >= 0; }
// งานที่ยังไม่เสร็จ: เกินกำหนดขึ้นก่อน → เร่งด่วน → ใกล้ครบกำหนด
function myOpenTickets_(username, C) {
  var today = new Date(); today.setHours(0,0,0,0);
  var rank = { high:0, med:1, low:2 };
  return C.tickets.filter(function(t){ return !C.closed[t.status] && isMine_(t, username); })
    .map(function(t){
      var due = t.dueOverride ? parseYmd_(t.dueOverride) : (t.approvedAt ? workDaysAdd_(new Date(t.approvedAt), C.sla[String(t.category).trim()] || 14, C.hol) : null);
      return { t:t, due:due, left: due ? workDaysBetween_(today, due, C.hol) : null, paused: !!C.paused[t.status] };
    })
    .sort(function(a, b){
      var oa = mineOver_(a) ? 0 : 1, ob = mineOver_(b) ? 0 : 1;
      if (oa !== ob) return oa - ob;
      var pa = rank[a.t.priority] != null ? rank[a.t.priority] : 2, pb = rank[b.t.priority] != null ? rank[b.t.priority] : 2;
      if (pa !== pb) return pa - pb;
      return (a.left == null ? 9999 : a.left) - (b.left == null ? 9999 : b.left);
    });
}
// งานที่เสร็จแล้ว (สถานะ "เสร็จเรียบร้อย") ที่ปิดในเดือนนี้ — ล่าสุดขึ้นก่อน
function myDoneTickets_(username, C) {
  var n = new Date(), start = new Date(n.getFullYear(), n.getMonth(), 1);
  return C.tickets.filter(function(t){ return t.status === 'done' && isMine_(t, username) && t.completedAt && new Date(t.completedAt) >= start; })
    .sort(function(a, b){ return new Date(b.completedAt) - new Date(a.completedAt); });
}
function mineOver_(x) { return !x.paused && x.left !== null && x.left < 0; }
function mineDueText_(x) {
  if (x.paused) return '⏸ พักรอภายนอก';
  if (x.left === null) return 'ยังไม่มีกำหนด';
  if (x.left < 0) return '⚠️ เกินกำหนด ' + (-x.left) + ' วันทำการ';
  if (x.left === 0) return '⏰ ครบกำหนดวันนี้';
  return 'เหลือ ' + x.left + ' วันทำการ';
}
function thShortDate_(iso) { var d = new Date(iso); return d.getDate() + ' ' + ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'][d.getMonth()]; }
function placeOf_(t, C) { return (C.bName[t.building] || t.building || '-') + ' — ' + String(t.room || '-'); }
function mineFlex_(name, open, done, C) {
  var over = open.filter(mineOver_).length, high = open.filter(function(x){ return x.t.priority === 'high'; }).length;
  var color = over ? '#c0392b' : high ? '#d9822b' : '#29914f';
  var items = [];
  var section = function(text, col){ items.push({ type:'text', text:text, weight:'bold', size:'md', color:col, margin: items.length ? 'xl' : 'none' }); };
  // ── ยังไม่เสร็จ ──
  section('🔧 ยังไม่เสร็จ ' + open.length + ' งาน', open.length ? '#c0392b' : '#29914f');
  if (!open.length) items.push({ type:'text', text:'ไม่มีงานค้าง 🎉', size:'sm', color:'#777777', margin:'sm' });
  open.slice(0, MINE_MAX_OPEN).forEach(function(x, i){
    var t = x.t, pri = t.priority === 'high' ? '🔴' : t.priority === 'med' ? '🟡' : '🟢';
    items.push({ type:'separator', margin:'md' });
    var box = { type:'box', layout:'vertical', margin:'md', spacing:'xs', contents:[
      { type:'text', text: pri + ' ' + t.id, weight:'bold', size:'sm', color:'#333333' },
      { type:'text', text: placeOf_(t, C), size:'sm', wrap:true, color:'#333333' },
      { type:'text', text: String(t.category || '-').trim() + ' · ' + (C.st[t.status] || t.status), size:'xs', wrap:true, color:'#777777' },
      { type:'text', text: mineDueText_(x), size:'xs', color: mineOver_(x) ? '#c0392b' : (x.left === 0 ? '#d9822b' : '#777777'), weight: (mineOver_(x) || x.left === 0) ? 'bold' : 'regular' } ] };
    var link = ticketLink_(t.id); if (link) box.action = { type:'uri', label:'เปิด', uri: link };
    box.contents.push(jobButtons_(t));   // v16.1
    items.push(box);
  });
  if (open.length > MINE_MAX_OPEN) items.push({ type:'text', text:'+ อีก ' + (open.length - MINE_MAX_OPEN) + ' งาน — ดูทั้งหมดในเว็บ', size:'xs', color:'#777777', margin:'md' });
  // ── เสร็จแล้ว (เดือนนี้) ──
  section('✅ เสร็จแล้วเดือนนี้ ' + done.length + ' งาน', '#29914f');
  if (!done.length) items.push({ type:'text', text:'ยังไม่มีงานที่ปิดในเดือนนี้', size:'sm', color:'#777777', margin:'sm' });
  done.slice(0, MINE_MAX_DONE).forEach(function(t){
    var row = { type:'box', layout:'baseline', margin:'sm', spacing:'sm', contents:[
      { type:'text', text: thShortDate_(t.completedAt), size:'xs', color:'#29914f', flex:2 },
      { type:'text', text: t.id + ' · ' + placeOf_(t, C), size:'xs', color:'#555555', wrap:true, flex:7 } ] };
    var link = ticketLink_(t.id); if (link) row.action = { type:'uri', label:'เปิด', uri: link };
    items.push(row);
  });
  if (done.length > MINE_MAX_DONE) items.push({ type:'text', text:'+ อีก ' + (done.length - MINE_MAX_DONE) + ' งาน', size:'xs', color:'#777777', margin:'sm' });
  var sub = 'ค้าง ' + open.length + (over ? ' (เกินกำหนด ' + over + ')' : '') + ' · เสร็จเดือนนี้ ' + done.length;
  var bubble = { type:'bubble', size:'mega',
    header:{ type:'box', layout:'vertical', backgroundColor: color, paddingAll:'14px', contents:[
      { type:'text', text:'📋 งานของ ' + name, color:'#FFFFFF', weight:'bold', size:'lg', wrap:true },
      { type:'text', text: sub, color:'#FFFFFFDD', size:'sm', wrap:true } ] },
    body:{ type:'box', layout:'vertical', contents: items } };
  var site = siteLink_('mywork');
  if (site) bubble.footer = { type:'box', layout:'vertical', contents:[{ type:'button', style:'primary', color: color, height:'sm',
    action:{ type:'uri', label:'เปิดงานที่ฉันรับผิดชอบ', uri: site } }] };
  return { type:'flex', altText:'📋 งานของคุณ: ' + sub, contents: bubble };
}
function mineMailHtml_(name, open, done, C) {
  var esc = function(t){ return String(t == null ? '' : t).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); };
  var td = 'padding:6px 8px;border-bottom:1px solid #eee;vertical-align:top';
  var openRows = open.map(function(x){ var t = x.t;
    return '<tr><td style="' + td + '">' + priorityLabel_(t.priority) + '<br><b>' + esc(t.id) + '</b></td><td style="' + td + '">' + esc(placeOf_(t, C))
      + '<br><span style="color:#777">' + esc(String(t.category || '-').trim() + ' · ' + (C.st[t.status] || t.status)) + '</span></td>'
      + '<td style="' + td + ';white-space:nowrap;color:' + (mineOver_(x) ? '#c0392b' : '#555') + '">' + esc(mineDueText_(x)) + '</td></tr>'; }).join('');
  var doneRows = done.map(function(t){
    return '<tr><td style="' + td + ';color:#29914f;white-space:nowrap">' + esc(thShortDate_(t.completedAt)) + '</td><td style="' + td + '"><b>' + esc(t.id) + '</b> · ' + esc(placeOf_(t, C)) + '</td><td style="' + td + '">' + esc(String(t.category || '-').trim()) + '</td></tr>'; }).join('');
  var site = siteLink_('mywork');
  return '<div style="font-family:Tahoma,sans-serif;max-width:640px"><h3 style="color:#1d4632;margin-bottom:4px">📋 งานของ ' + esc(name) + '</h3>'
    + '<h4 style="color:#c0392b;margin:14px 0 4px">🔧 ยังไม่เสร็จ ' + open.length + ' งาน</h4>'
    + (open.length ? '<table style="border-collapse:collapse;font-size:13px;width:100%">' + openRows + '</table>' : '<p style="color:#777">ไม่มีงานค้าง 🎉</p>')
    + '<h4 style="color:#29914f;margin:16px 0 4px">✅ เสร็จแล้วเดือนนี้ ' + done.length + ' งาน</h4>'
    + (done.length ? '<table style="border-collapse:collapse;font-size:13px;width:100%">' + doneRows + '</table>' : '<p style="color:#777">ยังไม่มีงานที่ปิดในเดือนนี้</p>')
    + (site ? '<p style="margin-top:16px"><a href="' + site + '" style="background:#29914f;color:#fff;padding:9px 18px;border-radius:8px;text-decoration:none">เปิดงานที่ฉันรับผิดชอบ</a></p>' : '')
    + '<p style="color:#999;font-size:11px">ส่งอัตโนมัติทุกเช้าวันทำการ — ปิดได้ที่เว็บ: กดชื่อผู้ใช้ → การแจ้งเตือนของฉัน</p></div>';
}
// ส่งให้หนึ่งคน — คืน 'line' | 'email' | 'none' | 'empty' | 'off'
function sendMineTo_(r, C, force) {
  if (String(r[9]).toUpperCase() === 'FALSE') return 'off';
  var info = notifyInfo_(r);
  if (!force && (info.notify === 'none' || info.events.indexOf('daily') < 0)) return 'off';
  var u = String(r[0]), open = myOpenTickets_(u, C), done = myDoneTickets_(u, C);
  if (!open.length && !done.length) return 'empty';   // ไม่มีงานเลย ไม่ส่ง (ประหยัดโควตา)
  var name = String(r[3] || u);
  var wantLine = force || info.notify === 'line' || info.notify === 'both';
  var wantMail = info.notify === 'email' || info.notify === 'both';
  if (wantLine && info.hasLine && linePush_(String(r[11]), [mineFlex_(name, open, done, C)])) return 'line';
  if ((wantMail || wantLine) && info.email) {
    MailApp.sendEmail({ to: info.email, subject: 'งานของคุณ: ค้าง ' + open.length + ' · เสร็จเดือนนี้ ' + done.length + ' — ' + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'd/M/yyyy'),
      htmlBody: mineMailHtml_(name, open, done, C), name:'ระบบแจ้งซ่อม คณะการแพทย์แผนไทย' });
    return 'email';
  }
  return 'none';
}
function maybeSendDailyMine_(now) {
  if (now.getHours() < 8) return 'not-yet';
  var hol = {};
  try { (getConfig().holidays || []).forEach(function(h){ hol[h.date] = 1; }); } catch (e) {}
  if (!isWorkday_(now, hol)) return 'holiday';
  var key = 'DAILY_MINE_' + ymd_(now), p = PropertiesService.getScriptProperties();
  if (p.getProperty(key)) return 'sent';
  p.setProperty(key, new Date().toISOString());   // กันส่งซ้ำ (keepWarm รันทุก 10 นาที)
  return sendDailyMine();
}
// Run เองในหน้า Apps Script ได้ — ส่งงานของฉันให้ทุกคนตอนนี้
function sendDailyMine() {
  var C = mineCtx_(), out = {};
  allUserRows_().forEach(function(r){ try { out[String(r[0])] = sendMineTo_(r, C, false); } catch (e) { out[String(r[0])] = 'error: ' + e; } });
  Logger.log('งานของฉันรายวัน: ' + JSON.stringify(out));
  return out;
}
// ปุ่มในหน้าเว็บ "ส่งงานของฉันเข้า LINE ตอนนี้"
function sendMineNow_(username) {
  var x = userRowFull_(username); if (!x) return { error:'ไม่พบผู้ใช้' };
  var C = mineCtx_(), res = sendMineTo_(x.r, C, true);
  return { result: res, open: myOpenTickets_(username, C).length, done: myDoneTickets_(username, C).length };
}
// พิมพ์ "งานค้าง" ในแชท OA
function replyMine_(replyToken, uid) {
  var rows = allUserRows_().filter(function(r){ return String(r[11]) === String(uid); });
  if (!rows.length) { lineReply_(replyToken, 'บัญชี LINE นี้ยังไม่ได้ผูกกับผู้ใช้ในระบบ\nเปิดเว็บ → กดชื่อผู้ใช้มุมขวาบน → "การแจ้งเตือนของฉัน" → ขอรหัสผูก LINE แล้วพิมพ์รหัส 6 หลักที่นี่'); return; }
  var C = mineCtx_();
  lineReplyMsgs_(replyToken, rows.slice(0, 5).map(function(r){
    var u = String(r[0]); return mineFlex_(String(r[3] || u), myOpenTickets_(u, C), myDoneTickets_(u, C), C); }));
}


// ═══════════════════════════════════════════════════════════════
//  v15.3: ความปลอดภัย
// ═══════════════════════════════════════════════════════════════
// 1) กรองอักขระ HTML (< >) ออกจากข้อความที่ผู้ใช้พิมพ์ — กันฝังสคริปต์ (XSS) ตั้งแต่ต้นทาง
//    (หน้าเว็บก็ escape ซ้ำอีกชั้น — ป้องกัน 2 ชั้น)
function sanitizeStr_(v) { return typeof v === 'string' ? v.replace(/[<>]/g, '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '') : v; }
function sanitizeObj_(o) {
  if (!o || typeof o !== 'object') return sanitizeStr_(o);
  if (Array.isArray(o)) return o.map(sanitizeObj_);
  var r = {}; Object.keys(o).forEach(function(k){ r[k] = sanitizeObj_(o[k]); }); return r;
}

// 2) ข้อมูลสาธารณะ — ผู้ที่ไม่ได้ล็อกอินไม่ได้รับเบอร์โทร อีเมล หน่วยงาน ค่าใช้จ่าย ความเห็น และหมายเหตุภายใน
var PUBLIC_TICKET_FIELDS = ['id','createdAt','approvedAt','completedAt','building','room','floor','category','priority','status',
  'assignees','rating','ratedBy','source','needsPurchase','dueOverride','carbonFlags','purchaseApprovedAt'];
function maskName_(n) {
  var p = String(n || '').trim().split(/\s+/);
  if (!p[0]) return '-';
  return p[0] + (p[1] ? ' ' + p[1].charAt(0) + '.' : '');
}
function publicTicket_(t) {
  var o = {}; PUBLIC_TICKET_FIELDS.forEach(function(k){ if (t[k] !== undefined) o[k] = t[k]; });
  o.name = maskName_(t.name);
  o.desc = String(t.desc || '').substring(0, 300);   // รายละเอียดอาการยังแสดงได้ (ช่วยให้รู้ว่าใบไหนเป็นของตน)
  if (o.ratedBy) o.ratedBy = maskName_(o.ratedBy);
  return o;
}
function publicHistory_(h) {   // คงขั้นตอน/วันที่ไว้ให้ผู้แจ้งติดตามได้ ตัดหมายเหตุภายในออก
  var out = {};
  Object.keys(h || {}).forEach(function(id){
    out[id] = (h[id] || []).map(function(e){ return { status:e.status, date:e.date, note:'', by:e.by }; });
  });
  return out;
}
function publicView_(all) { return { tickets: (all.tickets || []).map(publicTicket_), history: publicHistory_(all.history) }; }
function bootstrapFor_(token) {
  var data = bootstrap();
  if (token && verifyToken_(token)) { data.view = 'staff'; return data; }
  var pv = publicView_(data);
  data.tickets = pv.tickets; data.history = pv.history;
  data.inventory = [];   // ข้อมูลภายใน
  data.view = 'public';
  return data;
}

// 3) ผู้ไม่ล็อกอินเพิ่มประวัติ/รูปได้เฉพาะ "ใบที่เพิ่งแจ้ง" (กันคนนอกแก้ประวัติใบของผู้อื่น)
function ticketAgeMin_(id) {
  var r = table_(TICKETS_SHEET).find('ID', id);   // v16: อ้างตามชื่อคอลัมน์
  if (!r) return null;
  var c = new Date(r.get('CreatedAt')); return isNaN(c) ? 1e9 : (Date.now() - c.getTime()) / 60000;
}
function publicHistoryAllowed_(body) {
  if (verifyToken_(body.token)) return true;
  var e = body.entry || {}, age = ticketAgeMin_(body.ticketId);
  return age !== null && age <= 30 && (e.status === 'pending_approval' || !e.status);
}
function publicPhotoAllowed_(body) {
  if (verifyToken_(body.token)) return true;
  var p = body.photo || {}; if (p.kind && p.kind !== 'report') return false;
  var age = ticketAgeMin_(p.ticketId);
  if (age !== null && age <= 180) return true;   // ผู้แจ้งแนบรูปได้ภายใน 3 ชั่วโมงหลังแจ้ง
  // v16.2: แจ้งตอนออฟไลน์ (ส่งถึงช้า) → ยังแนบได้ภายใน 24 ชม. ถ้าใบยังรออนุมัติ
  var r = age !== null && age <= 1440 ? table_(TICKETS_SHEET).find('ID', p.ticketId) : null;
  return !!r && String(r.get('Status')) === 'pending_approval';
}

// 4) กันเดารหัสผ่าน: ผิด 5 ครั้งต่อบัญชี → ล็อก 15 นาที (นับใน CacheService)
function loginGuarded_(username, password) {
  var c = CacheService.getScriptCache(), key = 'FAIL_' + String(username || '').trim().toLowerCase();
  var fails = Number(c.get(key) || 0);
  if (fails >= 5) return { error:'ใส่รหัสผ่านผิดหลายครั้ง กรุณารอ 15 นาทีแล้วลองใหม่ (หรือติดต่อผู้ดูแลระบบ)' };
  var r = login(username, password);
  if (r && r.error && /ไม่ถูกต้อง/.test(r.error)) c.put(key, String(fails + 1), 900);
  else if (r && !r.error) c.remove(key);
  return r;
}


// ═══════════════════════════════════════════════════════════════
//  v16.1: ผู้แจ้งติดตามใบงานทาง LINE (เลขใบงาน + รหัส 4 หลัก)
//  - หน้าเว็บสุ่มรหัส 4 หลักตอนแจ้ง → เก็บในแท็บ LineTrack (ไม่อยู่ในแท็บ Tickets / ไม่ส่งออกสาธารณะ)
//  - ผู้แจ้งส่ง "ติดตาม REP-XXXX 1234" ในแชท OA → ผูก LINE กับใบนั้น
//  - สถานะเปลี่ยน (รับเรื่อง / ช่างเริ่มซ่อม / เสร็จ / ซ่อมไม่ได้ / ยกเลิก) → แจ้งผู้ติดตาม
// ═══════════════════════════════════════════════════════════════
var TRACK_SHEET = 'LineTrack';
var TRACK_HEADERS = ['TicketId','Pin','LineUid','FollowedAt','Active'];
var TRACK_MAX_PER_TICKET = 5;   // ผูกได้สูงสุด 5 บัญชีต่อใบ (กันโควตาหมด)
function trackSheet_() { return ensureSheet_(TRACK_SHEET, TRACK_HEADERS, '#06c755'); }
function savePin_(id, pin) {
  if (!/^\d{4}$/.test(String(pin || ''))) pin = ('000' + Math.floor(Math.random() * 10000)).slice(-4);
  var sh = trackSheet_(), T = table_(TRACK_SHEET);
  for (var i = 0; i < T.rows.length; i++) { var r = T.rows[i];
    if (String(r.get('TicketId')) === String(id) && !r.get('LineUid')) return String(r.get('Pin')); }
  sh.appendRow([id, "'" + pin, '', '', '']);   // ' นำหน้า = เก็บเป็นข้อความ (เลข 0 นำหน้าไม่หาย)
  return pin;
}
function pinOf_(id) {
  var T = table_(TRACK_SHEET);
  for (var i = 0; i < T.rows.length; i++) { var r = T.rows[i];
    if (String(r.get('TicketId')) === String(id) && !r.get('LineUid')) return ('000' + String(r.get('Pin')).replace(/\D/g, '')).slice(-4); }
  return '';
}
function followersOf_(id) {
  return table_(TRACK_SHEET).rows.filter(function(r){
    return String(r.get('TicketId')) === String(id) && r.get('LineUid') && String(r.get('Active')).toUpperCase() !== 'FALSE';
  }).map(function(r){ return String(r.get('LineUid')); });
}
function followedBy_(uid) {
  return table_(TRACK_SHEET).rows.filter(function(r){
    return String(r.get('LineUid')) === String(uid) && String(r.get('Active')).toUpperCase() !== 'FALSE';
  }).map(function(r){ return String(r.get('TicketId')); });
}
function ticketById_(id) {
  var all = getAllTickets().tickets;
  for (var i = 0; i < all.length; i++) if (String(all[i].id) === String(id)) return all[i];
  return null;
}
// "ติดตาม REP-XXXX 1234"
function trackFollow_(replyToken, uid, id, pin) {
  id = String(id).toUpperCase();
  var t = ticketById_(id);
  var fails = CacheService.getScriptCache(), fk = 'TRK_' + uid, nf = Number(fails.get(fk) || 0);
  if (nf >= 8) { lineReply_(replyToken, 'ใส่รหัสผิดหลายครั้ง กรุณารอ 15 นาทีแล้วลองใหม่'); return; }
  if (!t || pinOf_(id) !== String(pin)) {
    fails.put(fk, String(nf + 1), 900);
    lineReply_(replyToken, '❌ เลขใบงานหรือรหัส 4 หลักไม่ถูกต้อง\nตรวจจากหน้าจอหลังส่งแจ้งซ่อม หรือหน้า "ใบที่ฉันแจ้ง"\nรูปแบบ: ติดตาม REP-XXXX 1234'); return;
  }
  var C = mineCtx_();
  if (followedBy_(uid).indexOf(id) < 0) {
    if (followersOf_(id).length >= TRACK_MAX_PER_TICKET) { lineReply_(replyToken, 'ใบนี้มีผู้ติดตามครบ ' + TRACK_MAX_PER_TICKET + ' บัญชีแล้ว'); return; }
    var lock = LockService.getScriptLock(); if (!lock.tryLock(15000)) { lineReply_(replyToken, 'ระบบไม่ว่าง ลองส่งใหม่อีกครั้ง'); return; }
    try { trackSheet_().appendRow([id, '', uid, new Date().toISOString(), 'TRUE']); } finally { lock.releaseLock(); }
  }
  lineReplyMsgs_(replyToken, [trackFlex_(t, C, '🔔 ติดตามใบงานนี้แล้ว', 'จะแจ้งเตือนที่นี่เมื่อ รับเรื่อง · ช่างเริ่มซ่อม · ซ่อมเสร็จ', '#06c755'),
    { type:'text', text:'💡 พิมพ์ "ใบของฉัน" เพื่อดูสถานะทุกใบที่ติดตาม\nเลิกติดตาม: พิมพ์ "เลิกติดตาม ' + id + '"\n\n⚠️ ต้อง "เพิ่มเพื่อน" บัญชีนี้ไว้ จึงจะได้รับแจ้งเตือน' }]);
}
function trackUnfollow_(replyToken, uid, id) {
  id = String(id).toUpperCase();
  var T = table_(TRACK_SHEET), n = 0;
  T.rows.forEach(function(r){ if (String(r.get('TicketId')) === id && String(r.get('LineUid')) === String(uid) && String(r.get('Active')).toUpperCase() !== 'FALSE') { T.set(r, 'Active', 'FALSE'); n++; } });
  lineReply_(replyToken, n ? '🔕 เลิกติดตาม ' + id + ' แล้ว' : 'ไม่พบใบ ' + id + ' ในรายการที่คุณติดตาม');
}
// "ใบของฉัน" — สถานะทุกใบที่ LINE นี้ติดตาม (reply ฟรี)
function trackList_(replyToken, uid) {
  var ids = followedBy_(uid);
  if (!ids.length) { lineReply_(replyToken, 'ยังไม่ได้ติดตามใบงานใด\n\nหลังส่งแจ้งซ่อมในเว็บ กดปุ่ม "รับแจ้งเตือนทาง LINE" หรือพิมพ์\nติดตาม REP-XXXX 1234\n(เลขใบงาน + รหัส 4 หลักที่ได้ตอนแจ้ง)'); return; }
  var C = mineCtx_(), list = [];
  ids.slice(-20).reverse().forEach(function(id){ var t = ticketById_(id); if (t) list.push(t); });
  var rows = [];
  list.forEach(function(t, i){
    if (i) rows.push({ type:'separator', margin:'md' });
    var b = { type:'box', layout:'vertical', margin:'md', spacing:'xs', contents:[
      { type:'text', text: t.id + ' · ' + (C.st[t.status] || t.status), weight:'bold', size:'sm', color: C.closed[t.status] ? '#29914f' : '#d9822b', wrap:true },
      { type:'text', text: placeOf_(t, C) + ' · ' + String(t.category || '-'), size:'xs', color:'#777777', wrap:true } ] };
    var link = ticketLink_(t.id); if (link) b.action = { type:'uri', label:'เปิด', uri: link };
    rows.push(b);
  });
  lineReplyMsgs_(replyToken, [{ type:'flex', altText:'🧾 ใบที่คุณติดตาม ' + list.length + ' ใบ', contents:{ type:'bubble', size:'mega',
    header:{ type:'box', layout:'vertical', backgroundColor:'#12233b', paddingAll:'14px', contents:[{ type:'text', text:'🧾 ใบที่ฉันแจ้ง (' + list.length + ')', color:'#FFFFFF', weight:'bold', size:'lg' }] },
    body:{ type:'box', layout:'vertical', contents: rows.length ? rows : [{ type:'text', text:'ไม่พบข้อมูล', size:'sm' }] } } }]);
}
function trackFlex_(t, C, title, sub, color) {
  var rows = [['เลขใบงาน', t.id], ['สถานที่', placeOf_(t, C)], ['ประเภท', t.category], ['สถานะ', C.st[t.status] || t.status]];
  var bubble = { type:'bubble', size:'mega',
    header:{ type:'box', layout:'vertical', backgroundColor: color, paddingAll:'14px', contents:[
      { type:'text', text:title, color:'#FFFFFF', weight:'bold', size:'lg', wrap:true },
      { type:'text', text:sub, color:'#FFFFFFDD', size:'sm', wrap:true } ] },
    body:{ type:'box', layout:'vertical', spacing:'sm', contents: rows.map(function(kv){ return { type:'box', layout:'baseline', spacing:'sm', contents:[
      { type:'text', text:kv[0], color:'#888888', size:'sm', flex:2 },
      { type:'text', text:String(kv[1] || '-').substring(0, 200), wrap:true, color:'#333333', size:'sm', flex:5 } ] }; }) } };
  return { type:'flex', altText: title + ' — ' + t.id, contents: bubble };
}
// เรียกจาก updateTicket เมื่อสถานะเปลี่ยน
var TRACK_EVENTS = {
  assigned:  ['✅ รับเรื่องแล้ว', 'อนุมัติและมอบหมายช่างแล้ว', '#2b6cb0'],
  working:   ['🔧 ช่างเริ่มซ่อมแล้ว', 'ช่างกำลังดำเนินการ', '#d9822b'],
  done:      ['🎉 ซ่อมเสร็จแล้ว', 'ขอบคุณที่แจ้ง — ช่วยประเมินความพึงพอใจด้วยนะครับ', '#29914f'],
  cannot:    ['⚠️ ซ่อมไม่ได้', 'ดูรายละเอียด/เหตุผลในเว็บ', '#c0392b'],
  cancelled: ['🚫 ยกเลิกใบงาน', 'ใบงานนี้ถูกยกเลิก', '#777777']
};
function notifyFollowers_(id, newStatus, oldStatus) {
  if (!newStatus || newStatus === oldStatus || !TRACK_EVENTS[newStatus]) return 0;
  var uids = followersOf_(id); if (!uids.length) return 0;
  var t = ticketById_(id); if (!t) return 0;
  var C = mineCtx_(), ev = TRACK_EVENTS[newStatus];
  var msg = trackFlex_(t, C, ev[0], ev[1], ev[2]);
  var site = siteLink_('');
  if (newStatus === 'done' && site) msg.contents.footer = { type:'box', layout:'vertical', contents:[{ type:'button', style:'primary', color:'#29914f', height:'sm',
    action:{ type:'uri', label:'⭐ ประเมินความพึงพอใจ', uri: site + '?rate=' + encodeURIComponent(id) } }] };
  else { var link = ticketLink_(id); if (link) msg.contents.footer = { type:'box', layout:'vertical', contents:[{ type:'button', style:'secondary', height:'sm', action:{ type:'uri', label:'ดูรายละเอียด', uri: link } }] }; }
  var n = 0; uids.forEach(function(u){ if (linePush_(u, [msg])) n++; });
  return n;
}

// ═══════════════════════════════════════════════════════════════
//  v16.1: ปุ่ม "เริ่มซ่อม / เสร็จแล้ว" ในการ์ดงาน LINE (postback)
//  ตรวจว่า LINE นี้ผูกกับผู้ใช้ที่ "รับผิดชอบใบนั้น" (หรือวิศวกร) ก่อนแก้สถานะ
// ═══════════════════════════════════════════════════════════════
function jobButtons_(t) {
  var btn = function(label, act, style, color){ var b = { type:'button', height:'sm', style:style, flex:1,
    action:{ type:'postback', label:label, data:'act=' + act + '&id=' + t.id, displayText: label + ' ' + t.id } }; if (color) b.color = color; return b; };
  var c = [];
  if (t.status !== 'working') c.push(btn('▶ เริ่มซ่อม', 'start', 'secondary'));
  c.push(btn('✅ เสร็จแล้ว', 'done', 'primary', '#29914f'));
  return { type:'box', layout:'horizontal', spacing:'sm', margin:'sm', contents: c };
}
function parseQs_(s) { var o = {}; String(s || '').split('&').forEach(function(p){ var kv = p.split('='); if (kv[0]) o[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || ''); }); return o; }
function handleJobPostback_(ev, uid) {
  var q = parseQs_(ev.postback && ev.postback.data), id = String(q.id || '');
  if (!/^(start|done|doneok)$/.test(q.act || '') || !id) return;
  var users = allUserRows_().filter(function(r){ return String(r[11]) === String(uid); });
  if (!users.length) { lineReply_(ev.replyToken, 'บัญชี LINE นี้ยังไม่ได้ผูกกับผู้ใช้ในระบบ'); return; }
  var t = ticketById_(id); if (!t) { lineReply_(ev.replyToken, 'ไม่พบใบงาน ' + id); return; }
  var me = null;
  users.forEach(function(r){ if (!me && (isMine_(t, r[0]) || String(r[5]).toUpperCase() === 'TRUE')) me = r; });
  if (!me) { lineReply_(ev.replyToken, '⛔ ใบ ' + id + ' ไม่ได้อยู่ในความรับผิดชอบของคุณ'); return; }
  var C = mineCtx_(), name = String(me[3] || me[0]);
  if (C.closed[t.status]) { lineReply_(ev.replyToken, 'ใบ ' + id + ' ปิดแล้ว (' + (C.st[t.status] || t.status) + ')'); return; }
  if (q.act === 'done') {   // ขอยืนยันก่อนปิดงาน (กันกดพลาด)
    lineReplyMsgs_(ev.replyToken, [{ type:'text', text:'ยืนยันปิดงาน ' + id + '\n' + placeOf_(t, C) + ' ?',
      quickReply:{ items:[
        { type:'action', action:{ type:'postback', label:'✅ ยืนยันเสร็จแล้ว', data:'act=doneok&id=' + id, displayText:'ยืนยันปิดงาน ' + id } },
        { type:'action', action:{ type:'message', label:'ยกเลิก', text:'งานค้าง' } } ] } }]);
    return;
  }
  if (q.act === 'start' && t.status === 'working') { lineReply_(ev.replyToken, 'ใบ ' + id + ' อยู่ในสถานะกำลังซ่อมอยู่แล้ว'); return; }
  var lock = LockService.getScriptLock(); if (!lock.tryLock(20000)) { lineReply_(ev.replyToken, 'ระบบกำลังบันทึกข้อมูลอื่นอยู่ ลองกดใหม่อีกครั้ง'); return; }
  var now = new Date().toISOString(), st = q.act === 'start' ? 'working' : 'done';
  try {
    var f = { status: st }; if (st === 'done') f.completedAt = now;
    var r = updateTicket(id, f);
    if (r && r.error) { lineReply_(ev.replyToken, 'บันทึกไม่สำเร็จ: ' + r.error); return; }
    addHistory(id, { status: st, date: now, note: st === 'working' ? 'เริ่มซ่อม (กดจาก LINE)' : 'ซ่อมเสร็จ (กดจาก LINE)', by: name });
    invalidateCache_();
  } finally { lock.releaseLock(); }
  lineReply_(ev.replyToken, (st === 'working' ? '🔧 บันทึกแล้ว: เริ่มซ่อม ' : '✅ บันทึกแล้ว: ปิดงาน ') + id + '\n' + placeOf_(t, C) +
    (st === 'done' ? '\n\nถ้ามีค่าใช้จ่าย/รูปหลังซ่อม เพิ่มได้ในเว็บ' : '') + '\n💡 พิมพ์ "งานค้าง" เพื่อดูรายการล่าสุด');
}

// ═══════════════════════════════════════════════════════════════
//  v16.1: Rich Menu (เมนู 6 ปุ่มด้านล่างแชท LINE OA)
//  วิธีติดตั้ง: อัปโหลด richmenu.png ขึ้นเว็บ (GitHub) ก่อน → แอดมินกดปุ่ม "ติดตั้งเมนู LINE" ในหน้าจัดการระบบ
//  (หรือ Run setupRichMenu ในหน้านี้)
// ═══════════════════════════════════════════════════════════════
function setupRichMenu() {
  var token = lineOAToken_(); if (!token) return { error:'ยังไม่ได้ตั้งค่า LINE_OA_TOKEN' };
  var site = siteLink_(''); if (!site) return { error:'ยังไม่ได้ตั้งค่า SITE_URL' };
  var base = site.replace(/[^\/]*$/, '');
  var img = UrlFetchApp.fetch(base + 'richmenu.png?_v=' + Date.now(), { muteHttpExceptions:true });
  if (img.getResponseCode() !== 200) return { error:'ไม่พบไฟล์ ' + base + 'richmenu.png — อัปโหลดรูปเมนูขึ้นเว็บก่อน' };
  var W = 2500, H = 1686, w = Math.floor(W / 3), h = H / 2;
  var acts = [
    { type:'message', label:'งานที่ฉันรับผิดชอบ', text:'งานค้าง' },
    { type:'uri', label:'แจ้งซ่อม', uri: site + '?page=report' },
    { type:'uri', label:'ติดตามงาน', uri: site + '?page=status' },
    { type:'message', label:'ใบที่ฉันแจ้ง', text:'ใบของฉัน' },
    { type:'uri', label:'Dashboard', uri: site + '?page=dashboard' },
    { type:'uri', label:'วิธีใช้', uri: site + '?page=help' } ];
  var areas = acts.map(function(a, i){ var c = i % 3, r = Math.floor(i / 3);
    return { bounds:{ x: c * w, y: r * h, width: c === 2 ? W - 2 * w : w, height: h }, action: a }; });
  var H_ = { Authorization:'Bearer ' + token };
  var call = function(url, method, payload, ct){ var o = { method:method, headers:H_, muteHttpExceptions:true };
    if (payload !== undefined) { o.payload = payload; o.contentType = ct || 'application/json'; }
    var res = UrlFetchApp.fetch(url, o); return { code: res.getResponseCode(), body: res.getContentText() }; };
  // ลบเมนูเดิมที่ระบบนี้สร้างไว้ (ชื่อขึ้นต้น TTMED-)
  var old = call('https://api.line.me/v2/bot/richmenu/list', 'get');
  try { (JSON.parse(old.body).richmenus || []).forEach(function(m){ if (/^TTMED-/.test(m.name)) call('https://api.line.me/v2/bot/richmenu/' + m.richMenuId, 'delete'); }); } catch (e) {}
  var cr = call('https://api.line.me/v2/bot/richmenu', 'post', JSON.stringify({ size:{ width:W, height:H }, selected:true,
    name:'TTMED-' + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyyMMdd-HHmm'), chatBarText:'เมนูระบบแจ้งซ่อม', areas: areas }));
  if (cr.code !== 200) return { error:'สร้างเมนูไม่สำเร็จ (' + cr.code + '): ' + cr.body };
  var id = JSON.parse(cr.body).richMenuId;
  var up = call('https://api-data.line.me/v2/bot/richmenu/' + id + '/content', 'post', img.getBlob().getBytes(), 'image/png');
  if (up.code !== 200) return { error:'อัปโหลดรูปเมนูไม่สำเร็จ (' + up.code + '): ' + up.body };
  var df = call('https://api.line.me/v2/bot/user/all/richmenu/' + id, 'post');
  if (df.code !== 200) return { error:'ตั้งเป็นเมนูหลักไม่สำเร็จ (' + df.code + '): ' + df.body };
  return { ok:true, richMenuId:id, message:'ติดตั้งเมนู LINE แล้ว — ปิดแล้วเปิดแชท OA ใหม่เพื่อดูเมนู' };
}
// ข้อความ "วิธีใช้" ในแชท
function replyHelp_(replyToken) {
  lineReply_(replyToken, '❓ วิธีใช้ระบบแจ้งซ่อม\n\n' +
    '👤 ผู้แจ้ง\n• แจ้งซ่อมในเว็บ → กด "รับแจ้งเตือนทาง LINE" → กดส่งข้อความ\n• หรือพิมพ์: ติดตาม REP-XXXX 1234\n• พิมพ์ "ใบของฉัน" ดูสถานะทุกใบที่ติดตาม\n\n' +
    '👷 เจ้าหน้าที่\n• ผูกบัญชี: เว็บ → กดชื่อตัวเอง 🔔 → ขอรหัสผูก LINE → พิมพ์รหัส 6 หลักที่นี่\n• พิมพ์ "งานค้าง" ดูงานที่รับผิดชอบ + กด เริ่มซ่อม/เสร็จแล้ว ได้จากการ์ด' +
    (siteLink_('') ? '\n\n📖 คู่มือแบบมีภาพ: ' + siteLink_('help') : ''));
}


// ═══════════════════════════════════════════════════════════════
//  v16.2: รายงานสรุปรายเดือนเป็น PDF (แนบไปกับอีเมลสรุปวันที่ 1 + ดาวน์โหลดจากหน้าเว็บ)
//  เก็บสำเนาไว้ใน Google Drive โฟลเดอร์ "ระบบแจ้งซ่อม - รายงานรายเดือน"
// ═══════════════════════════════════════════════════════════════
var MONTHLY_PDF_FOLDER = 'ระบบแจ้งซ่อม - รายงานรายเดือน';
function monthlyPdfHtml_(st, mail) {
  var esc = function(t){ return String(t == null ? '' : t).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); };
  var th = 'padding:5px 6px;border:1px solid #bfb79c;background:#efe9d6;font-size:9.5pt';
  var td = 'padding:4px 6px;border:1px solid #d8d2bd;font-size:9.5pt;vertical-align:top';
  var rows = (st.doneList || []).map(function(t, i){
    return '<tr><td style="' + td + ';text-align:center">' + (i + 1) + '</td><td style="' + td + '">' + esc(t.id) + '</td><td style="' + td + ';white-space:nowrap">' + esc(thShortDate_(t.completedAt)) + '</td>'
      + '<td style="' + td + '">' + esc(t.place) + '</td><td style="' + td + '">' + esc(t.category) + '</td><td style="' + td + '">' + esc(t.who) + '</td>'
      + '<td style="' + td + ';text-align:right">' + (t.cost ? Number(t.cost).toLocaleString() : '-') + '</td><td style="' + td + ';text-align:center">' + (t.rating ? t.rating + '★' : '-') + '</td></tr>';
  }).join('');
  var made = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'd/M/') + (new Date().getFullYear() + 543) + ' ' + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'HH:mm');
  return '<html><head><meta charset="utf-8"><style>@page{size:A4;margin:14mm} body{font-family:Sarabun,"TH Sarabun New",Tahoma,sans-serif;color:#211d12;font-size:11pt} h1{font-size:16pt;margin:0} h2{font-size:12.5pt;margin:16px 0 6px;border-bottom:2px solid #c9a24d;padding-bottom:3px}</style></head><body>'
    + '<table style="width:100%;border-collapse:collapse;margin-bottom:8px"><tr><td><h1>รายงานสรุปงานซ่อมบำรุงประจำเดือน ' + esc(st.label) + '</h1>'
    + '<div style="color:#5e5844;font-size:10.5pt">งานอาคารสถานที่ คณะการแพทย์แผนไทย มหาวิทยาลัยสงขลานครินทร์ · ระบบแจ้งซ่อมออนไลน์</div></td>'
    + '<td style="text-align:right;font-size:9pt;color:#777;vertical-align:top">พิมพ์เมื่อ ' + made + '</td></tr></table>'
    + String(mail.body).replace(/<a [^>]*>[\s\S]*?<\/a>/g, '').replace(/<(div|p)[^>]*>[^<]*ส่งอัตโนมัติ[^<]*<\/(div|p)>/g, '')   // ตัดปุ่มลิงก์/ข้อความท้ายอีเมลออก
    + '<h2>รายการงานที่ซ่อมเสร็จในเดือน (' + (st.doneList || []).length + ' งาน)</h2>'
    + (rows ? '<table style="width:100%;border-collapse:collapse"><tr><th style="' + th + '">#</th><th style="' + th + '">เลขใบงาน</th><th style="' + th + '">วันที่เสร็จ</th><th style="' + th + '">สถานที่</th><th style="' + th + '">ประเภท</th><th style="' + th + '">ผู้รับผิดชอบ</th><th style="' + th + '">ค่าใช้จ่าย (บาท)</th><th style="' + th + '">ประเมิน</th></tr>' + rows + '</table>'
            : '<div style="color:#777">ไม่มีงานที่ปิดในเดือนนี้</div>')
    + '<table style="width:100%;margin-top:40px;font-size:10.5pt;text-align:center"><tr>'
    + '<td>ลงชื่อ ..................................................<br>ผู้จัดทำรายงาน<br>วันที่ ........./........./.........</td>'
    + '<td>ลงชื่อ ..................................................<br>หัวหน้างาน<br>วันที่ ........./........./.........</td></tr></table>'
    + '</body></html>';
}
function monthlyPdf_(st, mail) {
  mail = mail || monthlyMail_(st);
  var name = 'สรุปงานซ่อม_' + st.label.replace(/\s+/g, '_') + '.pdf';
  return Utilities.newBlob(monthlyPdfHtml_(st, mail), 'text/html', 'report.html').getAs('application/pdf').setName(name);
}
function saveMonthlyPdf_(pdf) {   // เก็บสำเนาใน Drive (ทับไฟล์ชื่อเดิม)
  try {
    var it = DriveApp.getFoldersByName(MONTHLY_PDF_FOLDER), f = it.hasNext() ? it.next() : DriveApp.createFolder(MONTHLY_PDF_FOLDER);
    var old = f.getFilesByName(pdf.getName()); while (old.hasNext()) old.next().setTrashed(true);
    return f.createFile(pdf).getUrl();
  } catch (e) { Logger.log('save monthly pdf: ' + e); return ''; }
}
// หน้าเว็บ: ดาวน์โหลด PDF ของเดือนที่เลือก (ym = 'yyyy-mm', ไม่ระบุ = เดือนที่แล้ว)
function monthlyPdfDownload_(ym) {
  var pm = prevMonth_(new Date());
  var m = String(ym || '').match(/^(\d{4})-(\d{1,2})$/); if (m) pm = { y: Number(m[1]), m: Number(m[2]) - 1 };
  var st = monthlyStats_(pm), pdf = monthlyPdf_(st);
  return { name: pdf.getName(), mimeType:'application/pdf', data: Utilities.base64Encode(pdf.getBytes()), label: st.label, url: saveMonthlyPdf_(pdf) };
}
