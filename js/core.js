// ระบบแจ้งซ่อมออนไลน์ — core.js (v16.0) : ค่าตั้งต้น · สถานะ · API · คาร์บอน · สิทธิ์ · คิวบันทึก · ตัวช่วย · ล็อกอิน · เราเตอร์
// โหลดตามลำดับใน index.html (classic script ใช้ตัวแปรร่วมกัน)
// ═══════════════════════════════════════════
// CONFIG — แก้ GAS_URL หลัง Deploy Apps Script
// ═══════════════════════════════════════════
// URL ของ Google Apps Script ฝังไว้ในโปรแกรม (แก้ได้ที่หน้า ⚙ ตั้งค่า)
// ─── เวอร์ชันโปรแกรม (อัปเดตทุกครั้งที่ออกเวอร์ชันใหม่ — ต้องตรงกับ Code.gs) ───
// APP_VERSION อยู่ใน index.html (ให้ตัวตรวจเวอร์ชันใหม่อ่านได้จากไฟล์เดียว)
const SERVER_REQUIRED = 'v16.0';   // เวอร์ชัน Code.gs ที่หน้าเว็บนี้ต้องใช้
const APP_BUILD   = '2026-11-09';
let SERVER_VERSION = '';   // อ่านจาก Code.gs ตอนเปิดเว็บ
const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbyOsSEC8KI1bmWJpWoCXC18XEWRqNTyzN4sRQwc4UV_GAWOUlvnzTzaUCwVId-FmaY2/exec';
// ถ้า URL ที่ฝังมาใหม่ไม่ตรงกับที่เคยบันทึกไว้ ให้ยึดตัวใหม่ (กันเครื่องเก่าค้าง URL เดิม)
(function(){
  const savedDefault = localStorage.getItem('gas_default');
  if (savedDefault !== DEFAULT_GAS_URL) {
    localStorage.removeItem('gas_url');           // ล้างค่าที่ผู้ใช้เคยบันทึกไว้
    localStorage.setItem('gas_default', DEFAULT_GAS_URL);
  }
})();
let GAS_URL = localStorage.getItem('gas_url') || DEFAULT_GAS_URL;

// ข้อมูลผู้ใช้สำหรับ "แสดงผล" เท่านั้น (ชื่อ สี อักษรย่อ ความเชี่ยวชาญ)
// ไม่มีรหัสผ่านในไฟล์นี้ — การตรวจรหัสผ่านทำที่ Google Apps Script ฝั่งเซิร์ฟเวอร์
// ค่าด้านล่างเป็นค่าสำรอง จะถูกแทนที่ด้วยข้อมูลจริงจากแท็บ Users เมื่อโหลดสำเร็จ
let USERS = {
  admin: { name:'ผู้ดูแลระบบ', role:'admin', isEngineer:true, color:'#7ecbb4', initials:'A' },
  tech1: { name:'ผู้ใช้งาน 1',   role:'admin', color:'#b5d4f4', initials:'U1', specialty:['ระบบไฟฟ้า','ระบบสื่อสาร/เครือข่าย IT'] },
  tech2: { name:'ผู้ใช้งาน 2', role:'admin', color:'#f5c4b3', initials:'U2', specialty:['ระบบประปา/สุขาภิบาล','ระบบปรับอากาศ'] },
};
let AUTH_TOKEN = localStorage.getItem('vr3_token') || '';
let BUILDINGS = [
  {id:'b1',name:'อาคารสหเวชศาสตร์',icon:'🏛',short:'สหเวชศาสตร์',budget:150000},
];
let FLOORS = [
  {building:'b1',floor:'ชั้น B',hidden:false},
  {building:'b1',floor:'ชั้น 1',hidden:false},{building:'b1',floor:'ชั้น 2',hidden:false},
  {building:'b1',floor:'ชั้น 3',hidden:false},{building:'b1',floor:'ชั้น 4',hidden:false},
  {building:'b1',floor:'ชั้น 5',hidden:false},{building:'b1',floor:'ชั้น 6',hidden:false},
  {building:'b1',floor:'ชั้น 7',hidden:false},{building:'b1',floor:'ชั้นดาดฟ้า',hidden:false},
];
let PM_LIST = [];  // รายการ PM (ซ่อมบำรุงเชิงป้องกัน)
let CATS = ['ระบบไฟฟ้า','ระบบประปา/สุขาภิบาล','ระบบปรับอากาศ','งานโครงสร้างอาคาร','ระบบสื่อสาร/เครือข่าย IT','งานครุภัณฑ์/เฟอร์นิเจอร์','อื่นๆ'];
let STATUSES = [
  {id:'pending_approval',label:'รอวิศวกรอนุมัติ',   cls:'b-amber'},
  {id:'assigned',        label:'มอบหมายแล้ว',       cls:'b-purple'},
  {id:'survey',          label:'กำลังสำรวจหน้างาน', cls:'b-amber'},
  {id:'purchase',        label:'อยู่ระหว่างจัดซื้อ', cls:'b-purple'},
  {id:'working',         label:'กำลังดำเนินการซ่อม', cls:'b-blue'},
  {id:'insurance',       label:'ส่งประกันเคลม',      cls:'b-teal'},
  {id:'contractor',      label:'ส่งผู้รับเหมา',       cls:'b-teal'},
  {id:'done',            label:'เสร็จเรียบร้อย',     cls:'b-green'},
  {id:'cannot',          label:'ซ่อมไม่ได้',         cls:'b-red'},
  {id:'cancelled',       label:'ยกเลิกใบแจ้ง',       cls:'b-gray'},
];
// สถานะที่ส่งงานออกภายนอก — หยุดนับ SLA ชั่วคราว แต่ยังไม่ถือว่าจบงาน
let SLA_PAUSED = ['insurance','contractor'];
let CLOSED_STATUS = ['done','cannot','cancelled'];
let SLA = {'ระบบไฟฟ้า':5,'ระบบประปา/สุขาภิบาล':5,'ระบบปรับอากาศ':7,'งานโครงสร้างอาคาร':30,'ระบบสื่อสาร/เครือข่าย IT':7,'งานครุภัณฑ์/เฟอร์นิเจอร์':14,'อื่นๆ':14};

// ─── STATE ───
let cu = null, curPage = 'report';
let DB = { tickets: [], history: {} }; // local cache
let CFG_RAW = null; // เก็บ config ดิบไว้แก้ในหน้าจัดการระบบ
let HOLIDAYS = []; // วันหยุดราชการ รูปแบบ 'YYYY-MM-DD'
// นำ config จาก Sheet มาแทนค่าเริ่มต้น (กรองรายการที่ซ่อนออกจากการใช้งานทั่วไป)
function applyConfig(cfg){
  CFG_RAW = cfg;
  if (cfg.buildings && cfg.buildings.length)
    BUILDINGS = cfg.buildings.filter(b=>!b.hidden).map(b=>({id:b.id,name:b.name,short:b.short||b.name,icon:b.icon||'🏢',budget:Number(b.budget)||0}));
  if (cfg.statuses && cfg.statuses.length){
    STATUSES = cfg.statuses.filter(s=>!s.hidden).map(s=>({id:s.id,label:s.label,cls:s.cls||'b-gray'}));
    SLA_PAUSED = cfg.statuses.filter(s=>s.paused).map(s=>s.id);
    CLOSED_STATUS = cfg.statuses.filter(s=>s.closed).map(s=>s.id);
  }
  if (cfg.categories && cfg.categories.length){
    cfg.categories.forEach(c=>{ c.name=String(c.name||'').trim(); });   // v12.1: กันช่องว่างท้ายชื่อประเภท (ทำให้กติกาวิ่งงาน/SLA ไม่ตรง)
    CATS = cfg.categories.filter(c=>!c.hidden).map(c=>c.name);
    SLA = {}; cfg.categories.forEach(c=>{ SLA[c.name]=Number(c.sla)||14; });
  }
  HOLIDAYS = (cfg.holidays||[]).map(h=>h.date).filter(Boolean);
  applyCarbonCfg(cfg.carbon);
  FLOORS = (cfg.floors||[]).filter(f=>!f.hidden);
  OPS = Object.assign({}, OPS_DEFAULT, cfg.ops||{});
}
// v15: ตั้งค่างานปฏิบัติการ (จุดซ่อมซ้ำ / เป้า KPI / สรุปรายเดือน)
const OPS_DEFAULT = { hotCount:3, hotMonths:6, kpiOnTime:80, kpiRating:4, kpiDone:90, monthly:true };
let OPS = Object.assign({}, OPS_DEFAULT);
// ชั้นของอาคารที่เลือก (ไว้ทำ dropdown ตาม)
function floorsOf(buildingId){ return FLOORS.filter(f=>f.building===buildingId).map(f=>f.floor); }

// ─── API ───
async function api(action, body={}) {
  if (!GAS_URL) throw new Error('ยังไม่ได้ตั้งค่า URL ของ Apps Script');
  const ctrl = new AbortController();
  const timer = setTimeout(()=>ctrl.abort(), 45000);   // เกิน 45 วิ ถือว่าล้มเหลว (ไม่รอค้าง)
  let res;
  try{
    res = await fetch(GAS_URL, { method:'POST', body: JSON.stringify({ action, ...body }), signal: ctrl.signal });
  }catch(e){
    throw new Error(e.name==='AbortError' ? 'เซิร์ฟเวอร์ตอบช้าเกินไป ลองใหม่อีกครั้ง' : 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้');
  }finally{ clearTimeout(timer); }
  let json;
  try{ json = await res.json(); }catch(e){ throw new Error('เซิร์ฟเวอร์ตอบกลับไม่ถูกต้อง (ตรวจสอบ URL/การ Deploy)'); }
  if (!json.ok) throw new Error(json.error || 'API error');
  return json.data;
}

// ═══ v13: คาร์บอนที่ประหยัดได้ (คำนวณอัตโนมัติจากค่ามาตรฐาน) ═══
// EF: ไฟฟ้า 0.4750 kgCO2e/kWh (อบก. มีผล 1 ม.ค. 2569) · กระดาษ A4 2.1020 kgCO2e/kg (อบก.) · R-32 GWP 677 (IPCC AR5)
// ค่า kWh / ลบ.ม. / คาร์บอนของใหม่ ต่อใบงาน = ค่าตั้งต้นโดยประมาณ แอดมินแก้ได้ที่หน้าตั้งค่า
const CARBON_DEFAULT={
  efElec:0.4750, efPaper:2.1020, efWater:0, sheetsPerTicket:2, gramsPerSheet:5,
  refrigKg:0.5, refrigGwp:677, treeKgYear:9.5,
  cats:{
    'ระบบไฟฟ้า':{kwh:10,pmKwh:10,water:0,replaceKg:5},
    'ระบบประปา/สุขาภิบาล':{kwh:0,pmKwh:0,water:3,replaceKg:10},
    'ระบบปรับอากาศ':{kwh:30,pmKwh:50,water:0,replaceKg:200},
    'งานโครงสร้างอาคาร':{kwh:0,pmKwh:0,water:0,replaceKg:0},
    'ระบบสื่อสาร/เครือข่าย IT':{kwh:0,pmKwh:0,water:0,replaceKg:150},
    'งานครุภัณฑ์/เฟอร์นิเจอร์':{kwh:0,pmKwh:0,water:0,replaceKg:30},
    'แก้ไขปัญหาโปรแกรมในคอมพิวเตอร์':{kwh:0,pmKwh:0,water:0,replaceKg:150},
    'อื่นๆ':{kwh:0,pmKwh:0,water:0,replaceKg:0},
  }
};
let CARBON=JSON.parse(JSON.stringify(CARBON_DEFAULT));
function applyCarbonCfg(c){
  CARBON=JSON.parse(JSON.stringify(CARBON_DEFAULT));
  if(c&&typeof c==='object'){ Object.keys(c).forEach(k=>{ if(k!=='cats') CARBON[k]=c[k]; });
    if(c.cats) Object.keys(c.cats).forEach(n=>{ CARBON.cats[String(n).trim()]=Object.assign({kwh:0,pmKwh:0,water:0,replaceKg:0},c.cats[n]); }); }
}
function carbonCat(cat){ return CARBON.cats[String(cat||'').trim()]||{kwh:0,pmKwh:0,water:0,replaceKg:0}; }
// คาร์บอนที่ประหยัดของใบงาน (เฉพาะใบที่เสร็จ) → {paper,elec,water,refrig,replace,total,kwh,m3}
function carbonOf(t){
  const z={paper:0,elec:0,water:0,refrig:0,replace:0,total:0,kwh:0,m3:0};
  if(!t||t.status!=='done') return z;
  const c=carbonCat(t.category), C=CARBON, fl=t.carbonFlags||[];
  if(t.source!=='PM') z.paper=(+C.sheetsPerTicket||0)*(+C.gramsPerSheet||0)/1000*(+C.efPaper||0);
  z.kwh=+(t.source==='PM'?c.pmKwh:c.kwh)||0; z.elec=z.kwh*(+C.efElec||0);
  z.m3=+c.water||0; z.water=z.m3*(+C.efWater||0);
  if(fl.includes('refrig')) z.refrig=(+C.refrigKg||0)*(+C.refrigGwp||0);
  if(fl.includes('replace')) z.replace=+c.replaceKg||0;
  z.total=z.paper+z.elec+z.water+z.refrig+z.replace;
  return z;
}
function fmtKg(x){ return x>=100?Math.round(x).toLocaleString():x>=10?x.toFixed(1):x.toFixed(2); }
function carbonBadge(t){ const c=carbonOf(t); return c.total>0?`<span class="badge b-green nodot" title="${escAttr(carbonTip(c))}">🌱 ${fmtKg(c.total)} kgCO2e</span>`:''; }
function carbonTip(c){ return [c.paper&&`กระดาษ ${fmtKg(c.paper)}`,c.elec&&`ไฟฟ้า ${c.kwh} kWh = ${fmtKg(c.elec)}`,c.m3&&`น้ำ ${c.m3} ลบ.ม.${c.water?' = '+fmtKg(c.water):''}`,c.refrig&&`น้ำยาแอร์ ${fmtKg(c.refrig)}`,c.replace&&`ซ่อมแทนซื้อใหม่ ${fmtKg(c.replace)}`].filter(Boolean).join(' · ')+' kgCO2e'; }
// สรุปรายเดือน (ตามเดือนที่ปิดงาน) ย้อนหลัง n เดือน
function carbonMonthly(n){
  const now=new Date(), out=[];
  for(let i=n-1;i>=0;i--){ const d=new Date(now.getFullYear(),now.getMonth()-i,1); out.push({y:d.getFullYear(),m:d.getMonth(),paper:0,elec:0,water:0,refrig:0,replace:0,total:0,kwh:0,m3:0,n:0}); }
  DB.tickets.forEach(t=>{
    if(t.status!=='done') return; const dt=doneAtOf(t); if(!dt) return;
    const b=out.find(o=>o.y===dt.getFullYear()&&o.m===dt.getMonth()); if(!b) return;
    const c=carbonOf(t); ['paper','elec','water','refrig','replace','total','kwh','m3'].forEach(k=>b[k]+=c[k]); b.n++;
  });
  return out;
}
function carbonCard(){
  const TH=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  const data=carbonMonthly(12), cur=data[11], prev=data[10];
  const yearTotal=data.reduce((a,b)=>a+b.total,0);
  const diff=prev.total?Math.round((cur.total-prev.total)/prev.total*100):null;
  const COL={elec:'#e0a94b',water:'#3ba7d6',refrig:'#9b7be0',replace:'#5cc93f',paper:'#a8a29e'};
  const LBL={elec:'ไฟฟ้า',water:'น้ำ',refrig:'น้ำยาแอร์',replace:'ซ่อมแทนซื้อใหม่',paper:'กระดาษ'};
  const maxV=Math.max(1,...data.map(d=>d.total));
  const bars=data.map(d=>{
    const segs=Object.keys(COL).map(k=>d[k]>0?`<div title="${LBL[k]} ${fmtKg(d[k])} kgCO2e" style="height:${d[k]/maxV*100}%;background:${COL[k]}"></div>`:'').join('');
    return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;min-width:0">
      <div style="font-size:10px;color:var(--tx3)">${d.total?fmtKg(d.total):''}</div>
      <div style="height:120px;width:70%;max-width:28px;display:flex;flex-direction:column-reverse;border-radius:4px;overflow:hidden;background:var(--surf2)">${segs}</div>
      <div style="font-size:10px;color:var(--tx3);white-space:nowrap">${TH[d.m]}</div></div>`;
  }).join('');
  const trees=CARBON.treeKgYear?Math.round(cur.total/(+CARBON.treeKgYear)*12):0;
  return `<div class="card" style="margin-bottom:1rem">
    <div class="ctitle" style="justify-content:space-between;flex-wrap:wrap;gap:8px">
      <span>🌱 คาร์บอนที่ประหยัดได้ (รายเดือน)</span>
      <span style="display:flex;gap:10px;flex-wrap:wrap;font-size:11.5px;font-weight:400">${Object.keys(COL).map(k=>`<span style="display:flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:3px;background:${COL[k]};display:inline-block"></span>${LBL[k]}</span>`).join('')}</span>
    </div>
    <div style="display:flex;gap:18px;flex-wrap:wrap;align-items:flex-end;margin-bottom:12px">
      <div><div style="font-size:12px;color:var(--tx3)">เดือนนี้ (${TH[cur.m]})</div><div style="font-size:28px;font-weight:700;color:var(--green-tx,#2f7d32)">${fmtKg(cur.total)} <span style="font-size:13px;font-weight:500">kgCO2e</span></div>
        <div style="font-size:12px;color:var(--tx3)">${diff===null?'':(diff>=0?'▲ ':'▼ ')+Math.abs(diff)+'% จากเดือนก่อน · '}${cur.n} งาน${trees?` · เท่ากับต้นไม้ ~${trees} ต้นดูดซับใน 1 เดือน`:''}</div></div>
      <div style="font-size:12px;color:var(--tx2);line-height:1.7">ไฟฟ้า ${Math.round(cur.kwh)} kWh · น้ำ ${Math.round(cur.m3)} ลบ.ม.<br>รวม 12 เดือน <b>${fmtKg(yearTotal)}</b> kgCO2e</div>
    </div>
    <div style="display:flex;gap:4px;align-items:flex-end">${bars}</div>
    <div style="font-size:10.5px;color:var(--tx3);margin-top:8px">คำนวณอัตโนมัติจากใบที่ "เสร็จเรียบร้อย" ตามเดือนที่ปิดงาน · EF ไฟฟ้า ${CARBON.efElec} kgCO2e/kWh, กระดาษ ${CARBON.efPaper} kgCO2e/kg (อบก.)${CARBON.efWater?'':' · ยังไม่ได้ตั้งค่า EF น้ำ (แสดงเป็น ลบ.ม.)'} · ค่ามาตรฐานต่อใบเป็นค่าประมาณ แก้ได้ที่หน้าตั้งค่า</div>
  </div>`;
}

// v12.1: ใบที่รหัสซ้ำในชีต (เกิดจากการส่งซ้ำตอนเน็ตช้า) → แสดงใบเดียว ใช้แถวที่สถานะ "คืบหน้าที่สุด"
function dedupeTickets(arr){
  const m=new Map();
  const rank=t=>t.status==='pending_approval'?0:1;
  arr.forEach(t=>{ const o=m.get(t.id); if(!o || rank(t)>rank(o)) m.set(t.id,t); });
  return [...m.values()];
}
// นำข้อมูลชุดหนึ่ง (จาก bootstrap หรือจากแคช) มาใส่ใน state
function applyBundle(d, fresh){   // fresh = ข้อมูลสดจากเซิร์ฟเวอร์ (ไม่ใช่แคชในเครื่อง)
  if(d.tickets){ d.tickets = dedupeTickets(d.tickets); }
  if(d.tickets){ d.tickets.forEach(t=>{ ['id','name','phone','dept','email','room','floor','category','desc','ratedBy','ratingComment','note'].forEach(k=>{ if(t[k]!=null && typeof t[k]!=='string') t[k]=String(t[k]); }); });   // v15.9: กันข้อความที่ชีตแปลงเป็นตัวเลข
    DB.tickets = d.tickets; DB.history = d.history||{}; DB.tickets.forEach(t=>{ t.history = DB.history[t.id] || t.history || []; if(!t.assignees) t.assignees=[]; }); }
  if(d.tickets) replayQ();
  if(d.tickets) syncRatedLocal(!!fresh);
  if(d.config) applyConfig(d.config);
  if(d.photos) PHOTOS = d.photos;
  if(d.photoCounts){ PHOTO_COUNTS = d.photoCounts; PHOTO_COUNTS_KNOWN = true; }
  if(d.users && d.users.length){ const m={}; d.users.filter(u=>u.active!==false).forEach(u=>{ m[u.username]=u; }); USERS=m; }
  if(d.users) ALL_USERS = d.users;   // รวมที่ปิดใช้งาน ไว้หน้าจัดการผู้ใช้
  if(d.roles) ROLES = d.roles;
  if(d.routing) ROUTING = d.routing;
  if(d.inventory) INVENTORY = d.inventory;
  if(d.flags) FLAGS = Object.assign(FLAGS, d.flags);
  if(d.pm) PM_LIST = d.pm;
  updApvCnt();
}
let ROUTING = [];     // ข้อ 5 [{category,autoAssign,approverRoles:[]}]
let INVENTORY = [];   // ข้อ 3 [{id,name,unit,stock,hidden}]
let FLAGS = { inventory:true };  // ธงเปิด/ปิดฟีเจอร์ (v15: คลังเปิดเป็นค่าเริ่มต้น)
function routeOf(cat){ const k=String(cat||'').trim(); return ROUTING.find(r=>String(r.category||'').trim()===k) || null; }

// ─── บทบาท/สิทธิ์ (ข้อ 4) ───
let ROLES = [];        // [{role,label,isEngineer,caps:[]}]
let ALL_USERS = [];    // รายชื่อผู้ใช้ทั้งหมด (รวมที่ปิดใช้งาน) จาก bootstrap
const CAP_LABELS = {
  dashboard:'ดู Dashboard/รายงาน', approve_ticket:'อนุมัติใบแจ้งซ่อม', approve_purchase:'อนุมัติจัดซื้อ/ใช้เงิน',
  manage_tickets:'จัดการ/อัปเดตงาน', assignable:'รับมอบหมายงานได้', manage_pm:'จัดการแผน PM',
  manage_config:'ตั้งค่าระบบ', manage_users:'จัดการผู้ใช้', manage_routing:'ตั้งกติกาการวิ่งงาน', manage_inventory:'ระบบเบิกอุปกรณ์'
};
const ALL_CAPS_FE = Object.keys(CAP_LABELS);
function roleOf(roleId){ return ROLES.find(r=>r.role===roleId) || null; }
function roleLabel(roleId){ const r=roleOf(roleId); return r?r.label:(roleId||'-'); }
// สิทธิ์ของผู้ใช้ปัจจุบัน — วิศวกร (isEngineer) ได้ทุกสิทธิ์เสมอ
function can(cap){
  if(!cu) return false;
  if(cu.isEngineer) return true;
  const r=roleOf(cu.role);
  if(r) return (r.caps||[]).includes(cap);
  return false;
}
// เก็บแคชรวมไว้แสดงทันทีรอบหน้า (stale-while-revalidate)
function cacheBundle(d){
  try{
    localStorage.setItem('vr3_t', JSON.stringify(d.tickets||[]));
    localStorage.setItem('vr3_hist', JSON.stringify(d.history||{}));
    if(d.config) localStorage.setItem('vr3_cfg', JSON.stringify(d.config));
    if(d.photos) localStorage.setItem('vr3_photos', JSON.stringify(d.photos));
    if(d.users)  localStorage.setItem('vr3_users', JSON.stringify(d.users));
    if(d.pm)     localStorage.setItem('vr3_pm', JSON.stringify(d.pm));
    if(d.photoCounts) localStorage.setItem('vr3_pc', JSON.stringify(d.photoCounts));
    localStorage.setItem('vr3_cache_at', String(Date.now()));
  }catch{}
}
// อ่านแคชรวมกลับมา (คืน null ถ้าไม่มี)
function readCache(){
  try{
    const t=JSON.parse(localStorage.getItem('vr3_t')||'null');
    if(!t) return null;
    return {
      tickets:t,
      history:JSON.parse(localStorage.getItem('vr3_hist')||'{}'),
      config:JSON.parse(localStorage.getItem('vr3_cfg')||'null')||undefined,
      photos:JSON.parse(localStorage.getItem('vr3_photos')||'{}'),
      users:JSON.parse(localStorage.getItem('vr3_users')||'null')||undefined,
      pm:JSON.parse(localStorage.getItem('vr3_pm')||'[]'),
      photoCounts:JSON.parse(localStorage.getItem('vr3_pc')||'null')||undefined,
    };
  }catch{ return null; }
}

let bootstrapped=false;  // โหลดจากเซิร์ฟเวอร์สำเร็จแล้วอย่างน้อยหนึ่งครั้ง
// v15.8: ล้างแคชในเครื่อง (ไม่ลบข้อมูลจริง) แล้วโหลดใหม่จากเซิร์ฟเวอร์
async function clearLocalCache(){
  ['vr3_t','vr3_rated'].forEach(k=>{ try{ localStorage.removeItem(k); }catch(e){} });
  rateDraft={};
  if(GAS_URL){ showLoader('กำลังโหลดข้อมูลใหม่...'); try{ await loadAll({silent:true}); }catch(e){} hideLoader(); }
  rp(); showToast('ล้างแคชในเครื่องแล้ว — ข้อมูลที่เห็นตอนนี้มาจาก Google Sheets');
}
// v15.8: ล้างใบงานทั้งหมดในชีต (ต้องพิมพ์ยืนยัน · เซิร์ฟเวอร์สำรองเป็นแท็บซ่อนก่อนลบ)
async function resetAllTickets(){
  if(!cu||!cu.isEngineer) return;
  const n=DB.tickets.length;
  const v=prompt('จะลบใบงานทั้งหมด '+n+' ใบ (พร้อมประวัติและรายการรูป) ออกจาก Google Sheets\nระบบจะสำรองไว้เป็นแท็บซ่อนก่อนลบ\n\nพิมพ์คำว่า  ลบทั้งหมด  เพื่อยืนยัน');
  if(v===null) return;
  if(v.trim()!=='ลบทั้งหมด'){ showToast('ข้อความยืนยันไม่ตรง — ยกเลิกแล้ว',3000); return; }
  showLoader('กำลังสำรองและล้างใบงาน...');
  try{
    const r=await api('resetTickets',{token:AUTH_TOKEN,confirm:'ลบทั้งหมด'});
    ['vr3_t','vr3_rated','vr3_mine'].forEach(k=>{ try{ localStorage.removeItem(k); }catch(e){} });
    rateDraft={}; DB.tickets=[]; DB.history={};
    await loadAll({silent:true}); hideLoader(); rp();
    const d=(r&&r.deleted)||{};
    showToast('ล้างแล้ว: ใบงาน '+(d.Tickets||0)+' · ประวัติ '+(d.History||0)+' · รูป '+(d.Photos||0)+' รายการ'+((r&&r.backup&&r.backup.length)?' — สำรองไว้ที่ '+r.backup[0]:''),6000);
  }catch(e){ hideLoader(); if(!handleAuthError(e)) showToast(/Unknown action/.test(e.message)?'ต้อง Deploy Code.gs v15.1 ก่อน':'ล้างไม่สำเร็จ: '+e.message,4000); }
}
async function loadAll(opts={}){
  const silent=opts.silent;   // ไม่โชว์ loader (ใช้ตอน revalidate เบื้องหลัง)
  if(!silent) showLoader('กำลังโหลดข้อมูล...');
  try{
    // เรียกครั้งเดียวได้ครบ (tickets+config+photos+users)
    const d = await api('bootstrap',{token:AUTH_TOKEN||''});   // v15.3: ล็อกอิน = ข้อมูลเต็ม · ไม่ล็อกอิน = ข้อมูลสาธารณะ
    applyBundle(d, true);
    cacheBundle(d);
    bootstrapped=true;
  }catch(e){
    console.warn('bootstrap ไม่สำเร็จ ใช้แคช/ค่าเริ่มต้น:', e.message);
    try{ const c=readCache(); if(c) applyBundle(c); }catch(e2){ console.warn(e2); }   // มีแคช → ใช้ของเก่าไปก่อน
    if(!silent) showToast('โหลดข้อมูลล่าสุดไม่สำเร็จ: '+e.message, 3500);
  }finally{
    if(!silent) hideLoader();
  }
}

function saveLocal() {
  localStorage.setItem('vr3_t', JSON.stringify(DB.tickets));
}

// ═══ คิวบันทึกเบื้องหลัง (ข้อ 4–5) ═══
// กดบันทึกแล้วหน้าจอเปลี่ยนทันที — ระบบส่งข้อมูลไปเซิร์ฟเวอร์อยู่เบื้องหลัง
// ถ้าเน็ตหลุด/ล้มเหลว จะเก็บไว้ในเครื่องและลองส่งใหม่อัตโนมัติ (ไม่หาย แม้ปิดหน้าเว็บ)
let SYNC_Q = (()=>{ try{ return JSON.parse(localStorage.getItem('vr3_q')||'[]'); }catch{ return []; } })();
let flushing = false;
function qSave(){ try{ localStorage.setItem('vr3_q', JSON.stringify(SYNC_Q)); }catch{} updSyncBadge(); }
function updSyncBadge(){
  let el=document.getElementById('syncBadge');
  if(!el){ el=document.createElement('div'); el.id='syncBadge';
    el.style.cssText='position:fixed;right:14px;bottom:14px;z-index:650;background:var(--surf);border:.5px solid var(--bd2);box-shadow:var(--sh2);border-radius:20px;padding:6px 12px;font-size:12px;color:var(--tx2);display:none';
    document.body.appendChild(el); }
  el.style.display = SYNC_Q.length ? 'block' : 'none';
  el.style.cursor='pointer'; el.onclick=openSyncPanel;
  const bad=SYNC_Q.some(j=>j.err);
  el.style.borderColor = bad ? '#e35b5b' : '';
  el.innerHTML = (bad?'⚠️ ส่งไม่สำเร็จ ':'<i class="ti ti-cloud-upload" style="vertical-align:-2px"></i> กำลังบันทึก ')+SYNC_Q.length+' รายการ — กดดู';
}
// v12.1: ดูงานที่ค้างส่ง + สาเหตุ / ส่งใหม่ / เอาออกจากคิว
function openSyncPanel(){
  const rows=SYNC_Q.map((j,i)=>{
    const id=j.op==='add'?j.ticket.id:j.id;
    const what=j.op==='add'?'แจ้งซ่อมใหม่':('อัปเดต '+Object.keys(j.fields||{}).join(', '));
    return `<div style="border:.5px solid var(--bd);border-radius:8px;padding:8px 10px;margin-bottom:8px;font-size:12.5px">
      <div><span class="mono">${escHtml(id)}</span> · ${escHtml(what)}</div>
      <div style="color:${j.err?'var(--red-tx)':'var(--tx3)'};margin-top:3px">${j.err?'ผิดพลาด: '+escHtml(j.err):'รอส่ง'}${j.tries?` · ลองแล้ว ${j.tries} ครั้ง`:''}</div>
      <button class="btn btn-sm btn-red" style="margin-top:6px" onclick="syncDrop(${i})">เอาออกจากคิว</button>
    </div>`;}).join('')||'<div class="empty-sub">ไม่มีงานค้างส่ง</div>';
  document.getElementById('dueContent').innerHTML=`<div class="modal-title">งานที่ยังไม่ถึงเซิร์ฟเวอร์ <button class="mc" onclick="cm('dueMd')">✕</button></div>
    <div style="font-size:12px;color:var(--tx3);margin-bottom:10px">ข้อมูลเหล่านี้อยู่ในเครื่องนี้เท่านั้น คนอื่นยังไม่เห็น ระบบจะลองส่งใหม่อัตโนมัติ</div>
    ${rows}<button class="btn btn-p" style="width:100%" onclick="flushing=false;flushQ();cm('dueMd')">ลองส่งใหม่ตอนนี้</button>`;
  document.getElementById('dueMd').style.display='flex';
}
function syncDrop(i){
  const j=SYNC_Q[i]; if(!j) return;
  if(!confirm('เอารายการนี้ออกจากคิว? ข้อมูลที่ยังไม่ถึงเซิร์ฟเวอร์จะหายไป')) return;
  SYNC_Q.splice(i,1); qSave();
  if(j.op==='add'){ DB.tickets=DB.tickets.filter(t=>t.id!==j.ticket.id); saveLocal(); }
  openSyncPanel(); rp();
}
async function syncAdd(ticket) {
  saveLocal();
  if (!GAS_URL) return;
  SYNC_Q.push({ op:'add', ticket, entry:(ticket.history||[])[0]||null }); qSave(); flushQ();
}
async function syncUpdate(id, fields, histEntry) {
  saveLocal();
  if (!GAS_URL) return;
  SYNC_Q.push({ op:'upd', id, fields, entry:histEntry||null }); qSave(); flushQ();
}
let LEGACY_API=false;
async function legacyUpd(j){
  await api('update', { id:j.id, fields:j.fields, token:AUTH_TOKEN });
  if (j.entry) await api('addHistory', { ticketId:j.id, entry:j.entry });
}
async function flushQ(){
  if (flushing || !SYNC_Q.length || !GAS_URL) return;
  flushing = true;
  try{
    while (SYNC_Q.length){
      const j = SYNC_Q[0];
      try{
        if (j.op==='add'){
          await api('add', { ticket:j.ticket, entry:j.entry });
          if (LEGACY_API && j.entry) { try{ await api('addHistory', { ticketId:j.ticket.id, entry:j.entry }); }catch(_){} }
        } else if (LEGACY_API) {
          await legacyUpd(j);
        } else {
          try{ await api('updateWithHistory', { id:j.id, fields:j.fields, entry:j.entry, token:AUTH_TOKEN }); }
          catch(e1){
            // เซิร์ฟเวอร์ (Code.gs) รุ่นเก่ายังไม่รู้จักคำสั่งรวม → ส่งแบบเดิม 2 ครั้งแทน ข้อมูลไม่หาย
            if (/Unknown action/i.test(e1.message||'')){ LEGACY_API=true; await legacyUpd(j); }
            else throw e1;
          }
        }
        SYNC_Q.shift(); qSave();
      }catch(e){
        j.err=String(e.message||e); j.tries=(j.tries||0)+1; qSave();
        if (handleAuthError(e)) break;                                   // รอล็อกอินใหม่แล้วค่อยส่งต่อ
        if (/not found/i.test(e.message||'')){ SYNC_Q.shift(); qSave(); showToast('⚠ '+e.message,3000); continue; }
        showToast('⚠ บันทึกยังไม่สำเร็จ — ระบบจะลองใหม่อัตโนมัติ', 2500);
        setTimeout(flushQ, 8000); break;
      }
    }
  } finally { flushing = false; }
}
// นำงานที่ยังส่งไม่สำเร็จมาทับข้อมูลจากเซิร์ฟเวอร์ (กันหน้าจอย้อนกลับ)
function replayQ(){
  SYNC_Q.forEach(j=>{
    if (j.op==='add'){ const ex=DB.tickets.find(t=>t.id===j.ticket.id); if(!ex){ DB.tickets.push(j.ticket); j.ticket._local=true; } }
    else { const t=DB.tickets.find(x=>x.id===j.id); if(t){ Object.assign(t, j.fields); if(j.entry && !(t.history||[]).some(h=>h.date===j.entry.date&&h.note===j.entry.note)) (t.history=t.history||[]).push(j.entry); } }
  });
}
window.addEventListener('online', ()=>flushQ());
window.addEventListener('beforeunload', e=>{ if(SYNC_Q.length){ e.preventDefault(); e.returnValue=''; } });
// session หมดอายุ → ให้ล็อกอินใหม่
function handleAuthError(e){
  if(e && /AUTH_REQUIRED|session/i.test(e.message||'')){
    cu=null; AUTH_TOKEN='';
    localStorage.removeItem('vr3_token'); localStorage.removeItem('vr3_user');
    updAuthUI(); rp();
    showToast('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่', 3500);
    oLogin();
    return true;
  }
  return false;
}

// ─── HELPERS ───
function genId() { return 'REP-'+Date.now().toString(36).toUpperCase()+Math.random().toString(36).substr(2,4).toUpperCase(); }
function now() { return new Date().toISOString(); }
function fd(iso) { if(!iso) return '-'; return new Date(iso).toLocaleDateString('th-TH',{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}); }
// ป้ายสถานะครบทุกตัว (ไม่ถูกกรอง) เผื่อ config ซ่อนบางสถานะแต่ใบเก่ายังใช้อยู่
const STATUS_FALLBACK={pending_approval:'รอวิศวกรอนุมัติ',assigned:'มอบหมายแล้ว',survey:'กำลังสำรวจหน้างาน',purchase:'อยู่ระหว่างจัดซื้อ',working:'กำลังดำเนินการซ่อม',insurance:'ส่งประกันเคลม',contractor:'ส่งผู้รับเหมา',done:'เสร็จเรียบร้อย',cannot:'ซ่อมไม่ได้',cancelled:'ยกเลิกใบแจ้ง'};
function getSI(id) { return STATUSES.find(s=>s.id===id) || {id,label:STATUS_FALLBACK[id]||id,cls:'b-gray'}; }
function getBI(id) { return BUILDINGS.find(b=>b.id===id)||BUILDINGS[0]; }
function elapsed(iso) { return Math.floor((Date.now()-new Date(iso))/86400000); }
function getSLA(cat) { return SLA[String(cat||'').trim()]||14; }
// จำนวนวันที่งานถูกพัก (ส่งประกัน/ผู้รับเหมา) — คำนวณจากช่วงเวลาในประวัติ
function pausedDays(t){
  const h=(t.history||[]).slice().sort((a,b)=>new Date(a.date)-new Date(b.date));
  let ms=0;
  for(let i=0;i<h.length;i++){
    if(SLA_PAUSED.includes(h[i].status)){
      const start=new Date(h[i].date);
      const end=(i+1<h.length)?new Date(h[i+1].date):new Date(); // ถ้ายังพักอยู่ นับถึงตอนนี้
      ms+=Math.max(0,end-start);
    }
  }
  return Math.floor(ms/86400000);
}
// จำนวนวันที่นับ SLA จริง = วันทั้งหมด - วันที่พัก
function effElapsed(t){ return Math.max(0, elapsed(t.createdAt) - pausedDays(t)); }
function isOverSLA(t){
  if(CLOSED_STATUS.includes(t.status)||SLA_PAUSED.includes(t.status)) return false;
  if(t.dueOverride){ const d=parseYmd(t.dueOverride); if(d){ const td=new Date(); td.setHours(0,0,0,0); return td>d; } }   // v12: แอดมินกำหนดวันเอง
  return effElapsed(t)>getSLA(t.category);
}
// 'YYYY-MM-DD' → Date (เวลาท้องถิ่น 00:00)
function parseYmd(v){ if(!v) return null; const m=String(v).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); return m?new Date(+m[1],+m[2]-1,+m[3]):null; }
function escHtml(s){ return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
// ─── v16: html`` — เทมเพลตที่ escape ค่าทุกตัวอัตโนมัติ (กัน XSS) ───
//   html`<b>${t.name}</b>`            → ชื่อถูก escape
//   html`<div>${raw(htmlChunk)}</div>` → ใส่ HTML ที่สร้างเองแล้ว (ไว้ใจได้) โดยไม่ escape ซ้ำ
//   ค่าเป็น array จะต่อกันให้ (แต่ละตัว escape หรือ raw ตามชนิด)
class RawHtml { constructor(s){ this.s=String(s==null?'':s); } toString(){ return this.s; } }
function raw(s){ return s instanceof RawHtml ? s : new RawHtml(s); }
function _hv(v){ if(v==null||v===false) return ''; if(v instanceof RawHtml) return v.s; if(Array.isArray(v)) return v.map(_hv).join(''); return escHtml(v); }
function html(strings,...vals){ let o=strings[0]; for(let i=0;i<vals.length;i++) o+=_hv(vals[i])+strings[i+1]; return new RawHtml(o); }

// ─── วันที่คาดว่าจะเสร็จ ───
// แปลงวันที่เป็น 'YYYY-MM-DD' ตามเวลาท้องถิ่น (กัน off-by-one จาก timezone)
function ymd(d){ return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2); }
function isHoliday(d){ return HOLIDAYS.includes(ymd(d)); }
// บวกวันทำการ (ข้ามเสาร์-อาทิตย์ และวันหยุดราชการ)
function addWorkingDays(date, n){
  const d = new Date(date);
  let left = Math.max(0, Math.round(n));
  while (left > 0){
    d.setDate(d.getDate()+1);
    const w = d.getDay();
    if (w !== 0 && w !== 6 && !isHoliday(d)) left--;   // 0=อาทิตย์ 6=เสาร์
  }
  return d;
}
// วันที่คาดว่าจะเสร็จ = วันอนุมัติ + SLA (วันทำการ) + วันที่พัก
function dueDate(t){
  if(t && t.dueOverride){ const o=parseYmd(t.dueOverride); if(o) return o; }   // v12: วันที่แอดมินกำหนดเอง มาก่อนเสมอ
  if(!t || !t.approvedAt) return null;              // ยังไม่อนุมัติ = คาดการณ์ไม่ได้
  const base = addWorkingDays(new Date(t.approvedAt), getSLA(t.category));
  const pd = pausedDays(t);
  return pd > 0 ? addWorkingDays(base, pd) : base;  // เลื่อนออกตามวันที่พักจริง
}
function fdShort(d){ if(!d) return '-'; return new Date(d).toLocaleDateString('th-TH',{year:'2-digit',month:'short',day:'numeric'}); }
// ข้อมูลสำหรับแสดงผล { text, sub, cls }
function dueInfo(t){
  if(t.status==='cancelled') return {text:'—', sub:'', cls:'b-gray'};
  if(t.status==='done')   return {text:t.completedAt?fdShort(t.completedAt):'เสร็จแล้ว', sub:'เสร็จจริง', cls:'b-green'};
  if(t.status==='cannot') return {text:'—', sub:'ซ่อมไม่ได้', cls:'b-red'};
  const d = dueDate(t);
  if(!d) return {text:'รออนุมัติ', sub:'', cls:'b-amber'};
  const r = dueInfoRaw(t,d);
  if(t.dueOverride) r.sub = (r.sub?r.sub+' · ':'')+'📌 กำหนดเอง';
  return r;
}
function dueInfoRaw(t,d){
  const td=new Date(); td.setHours(0,0,0,0);
  const dd=new Date(d); dd.setHours(0,0,0,0);
  const diff = Math.round((dd - td)/86400000);
  if(SLA_PAUSED.includes(t.status)) return {text:fdShort(d), sub:'พักชั่วคราว', cls:'b-teal'};
  if(diff < 0)  return {text:fdShort(d), sub:`เกิน ${Math.abs(diff)} วัน`, cls:'b-red'};
  if(diff === 0)return {text:fdShort(d), sub:'ครบกำหนดวันนี้', cls:'b-red'};
  if(diff <= 3) return {text:fdShort(d), sub:`เหลือ ${diff} วัน`, cls:'b-amber'};
  return {text:fdShort(d), sub:`เหลือ ${diff} วัน`, cls:'b-green'};
}
function getUserColor(u) { return USERS[u]?.color||'#ccc'; }
function getUserInitials(u) { return USERS[u]?.initials||'?'; }
function getUserName(u) { return USERS[u]?.name||u||'—'; }

function assigneeChips(assignees) {
  if (!assignees || !assignees.length) return '<span style="color:var(--tx3);font-size:12px">ยังไม่มอบหมาย</span>';
  return assignees.map(u => {
    const usr = USERS[u];
    if (!usr) return '';
    return `<span class="av-chip" style="background:${usr.color}22;color:${usr.color}">${usr.initials} ${usr.name.split(' ')[0]}</span>`;
  }).join('');
}

// v12: เฉพาะคนที่ "รับงานซ่อมได้" (บริหารที่ไม่ได้ซ่อมจะไม่ขึ้นในรายชื่อมอบหมาย/ภาระงาน)
function isAssignableUser(usr){
  if(!usr) return false;
  if(usr.isEngineer) return true;
  const r=roleOf(usr.role);
  if(r) return (r.caps||[]).includes('assignable');
  return usr.role!=='manager';
}
function assignableEntries(){ return Object.entries(USERS).filter(([u,usr])=>isAssignableUser(usr)); }
function suggestAssignees(cat) {
  const active = DB.tickets.filter(t=>!CLOSED_STATUS.includes(t.status));
  let list = assignableEntries()
    .map(([u,v]) => {
      const wl = active.filter(t=>(t.assignees||[]).includes(u)).length;
      const sp = v.specialty||[];
      const match = sp.some(s=>cat.includes(s.replace('งาน',''))||s.includes(cat.replace('งาน','')))?0:2;
      return { u, score: wl+match, wl };
    })
    .sort((a,b)=>a.score-b.score)
    .map(x=>x.u);
  // ข้อ 5: ถ้ามีกติกาวิ่งงานตามประเภท ให้ช่างที่กำหนดขึ้นเป็นอันดับแรก (ออโต้ แก้ไขได้)
  const rule = routeOf(cat);
  const au = rule && rule.autoAssign ? Object.keys(USERS).find(u=>u.toLowerCase()===String(rule.autoAssign).trim().toLowerCase()) : null;
  if(au) list = [au, ...list.filter(u=>u!==au)];
  return list;
}
// ข้อ 5: ผู้ใช้ปัจจุบันมีสิทธิ์อนุมัติใบประเภทนี้ไหม (ตามกติกา approverRoles)
function canApproveCat(cat){
  if(!can('approve_ticket')) return false;
  if(cu && cu.isEngineer) return true;
  const rule = routeOf(cat);
  if(!rule || !rule.approverRoles || !rule.approverRoles.length) return true; // ไม่ได้จำกัด = ใครมีสิทธิ์อนุมัติก็ได้
  return rule.approverRoles.includes(cu && cu.role);
}

// ─── UI HELPERS ───
function showLoader(msg='') { document.getElementById('loader').style.display='flex'; document.getElementById('loaderMsg').textContent=msg||'กำลังโหลด...'; }
function hideLoader() { document.getElementById('loader').style.display='none'; }
let toastTimer;
function showToast(msg, ms=2500) {
  const t=document.getElementById('toast'); t.textContent=msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.classList.remove('show'),ms);
}
function cm(id) { document.getElementById(id).style.display='none'; }
window.addEventListener('click', e => {
  ['loginMd','detMd','assignMd','statusMd','editMd','userMd'].forEach(id=>{ const el=document.getElementById(id); if(el&&e.target===el) el.style.display='none'; });
});
function updMyCnt(){ const el=document.getElementById('myCnt'); if(!el) return; const n=cu?myWorkCount():0; el.textContent=n; el.style.display=n?'':'none'; }
function updApvCnt() { updMyCnt(); const c=DB.tickets.filter(t=>t.status==='pending_approval').length; const el=document.getElementById('apv-cnt'); if(el) el.textContent=c; }

// ─── AUTH ───
async function doIn() {
  const u=document.getElementById('lu').value.trim(), p=document.getElementById('lp').value;
  const err=document.getElementById('lerr');
  err.style.display='none';
  if(!u||!p){ err.style.display='block'; err.textContent='กรุณากรอกชื่อผู้ใช้และรหัสผ่าน'; return; }
  if(!GAS_URL){ err.style.display='block'; err.textContent='ยังไม่ได้เชื่อมต่อเซิร์ฟเวอร์ ไม่สามารถเข้าสู่ระบบได้'; return; }
  showLoader('กำลังตรวจสอบ...');
  try{
    const r = await api('login',{username:u,password:p});
    hideLoader();
    if(!r || !r.token){ err.style.display='block'; err.textContent=(r&&r.error)||'เข้าสู่ระบบไม่สำเร็จ'; return; }
    AUTH_TOKEN = r.token;
    localStorage.setItem('vr3_token', AUTH_TOKEN);
    localStorage.setItem('vr3_user', JSON.stringify(r.user));
    cu = r.user;
    if(USERS[cu.username]) USERS[cu.username] = {...USERS[cu.username], ...cu};
    document.getElementById('lp').value='';
    cm('loginMd'); updAuthUI();
    if(pendingPage){ const pp=pendingPage; pendingPage=null; gp(pp); }
    else if(isMobile() && ['report','status','mine'].includes(curPage)) gp('mywork');   // v15: มือถือ → เปิด "งานของฉันวันนี้"
    else rp();
    showToast('เข้าสู่ระบบสำเร็จ');
  }catch(e){
    hideLoader();
    err.style.display='block';
    err.textContent = e.message || 'เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ';
  }
}
function doOut() {
  if(['mine','mywork'].includes(curPage)) curPage='report';
  const t=AUTH_TOKEN;
  cu=null; AUTH_TOKEN='';
  localStorage.removeItem('vr3_token'); localStorage.removeItem('vr3_user');
  if(t && GAS_URL){ api('logout',{token:t}).catch(()=>{}); }
  updAuthUI(); gp('report');
}
function oLogin() { document.getElementById('loginMd').style.display='flex'; }
function updAuthUI() {
  const b=document.getElementById('ubadge');
  document.getElementById('lbtn').style.display=cu?'none':'';
  document.getElementById('lobtn').style.display=cu?'':'none';
  ['nt-approve','nt-manage','nt-pm','nt-cfg','nt-my','nt-mine'].forEach(id=>document.getElementById(id).style.display='none');
  if (cu) {
    b.style.display='inline-block'; b.textContent=cu.name+' 🔔'; b.style.cursor='pointer'; b.title='การแจ้งเตือนของฉัน'; b.onclick=openMyNotify;
    b.className='ubadge '+(cu.isEngineer?'ua':'ut');
    // แสดงเมนูตามสิทธิ์ของบทบาท (วิศวกรเห็นทุกเมนู)
    // v15.11: ทุกคนที่เข้าสู่ระบบเห็นเมนูครบ (ทำได้ตามสิทธิ์ — หน้าที่ไม่มีสิทธิ์เป็นแบบดูอย่างเดียว) ยกเว้น "ตั้งค่า"
    ['nt-approve','nt-manage','nt-pm','nt-cal'].forEach(id=>document.getElementById(id).style.display='');
    if(can('manage_config')||can('manage_users')||can('manage_routing')) document.getElementById('nt-cfg').style.display='';
    document.getElementById('nt-my').style.display='';
    document.getElementById('nt-mine').style.display='';
    updApvCnt();
  } else { b.style.display='none'; }
  buildMobileMenu();
}

// ─── MOBILE MENU ───
const NAV_ITEMS = [
  {p:'report',   label:'แจ้งซ่อม',    icon:'ti-clipboard-plus', pub:true},
  {p:'status',   label:'ติดตามงาน',   icon:'ti-list-search',    pub:true},
  {p:'mine',     label:'ใบที่ฉันแจ้ง',     icon:'ti-file-text',      pub:false},
  {p:'mywork',   label:'งานที่ฉันรับผิดชอบ', icon:'ti-briefcase',    pub:false},
  {p:'approve',  label:'อนุมัติ',      icon:'ti-circle-check',   pub:false},
  {p:'manage',   label:'จัดการงาน',    icon:'ti-tool',           pub:false},
  {p:'pm',       label:'PM ซ่อมบำรุง',  icon:'ti-calendar-cog',   pub:false},
  {p:'calendar', label:'ปฏิทินงาน',    icon:'ti-calendar-event', pub:false},
  {p:'dashboard',label:'Dashboard',   icon:'ti-chart-bar',      pub:true},
  {p:'config',   label:'ตั้งค่า',      icon:'ti-settings',       pub:false},
];
function buildMobileMenu() {
  const box=document.getElementById('mnavItems'); if(!box) return;
  const apv=DB.tickets.filter(t=>t.status==='pending_approval').length;
  let html='';
  NAV_ITEMS.forEach(it=>{
    if(!it.pub && !cu) return;
    if(!it.pub && cu && !navAllowed(it.p)) return;   // กรองตามสิทธิ์
    const myN=it.p==='mywork'?myWorkCount():0;
    const badge=(it.p==='approve'&&apv>0)?`<span class="badge-n">${apv}</span>`:(myN?`<span class="badge-n">${myN}</span>`:'');
    html+=`<button class="mnav-item ${curPage===it.p?'on':''}" onclick="mNav('${it.p}')"><i class="ti ${it.icon} mi"></i> ${it.label} ${badge}</button>`;
  });
  html+='<div class="mnav-sep"></div>';
  html+=`<button class="mnav-item" onclick="cycleSeason()"><span class="mi" style="width:18px;text-align:center">${SEASONS[curSeason()].icon}</span> ธีม: ${SEASONS[curSeason()].label}${seasonPref()==='auto'?' (อัตโนมัติ)':''}</button>`;
  html+=`<button class="mnav-item" onclick="toggleTheme();buildMobileMenu()"><span class="mi" style="width:18px;text-align:center">${document.documentElement.getAttribute('data-theme')==='dark'?'☀️':'🌙'}</span> ${document.documentElement.getAttribute('data-theme')==='dark'?'โหมดสว่าง':'โหมดมืด'}</button>`;
  html+='<div class="mnav-sep"></div>';
  if(cu) html+=`<button class="mnav-item" onclick="openMyNotify();toggleMenu()"><i class="ti ti-bell mi"></i> การแจ้งเตือนของฉัน</button>`;
  if(cu) html+=`<button class="mnav-item" onclick="doOut();toggleMenu()"><i class="ti ti-logout mi"></i> ออกจากระบบ</button>`;
  else   html+=`<button class="mnav-item" onclick="toggleMenu();oLogin()"><i class="ti ti-login mi"></i> เข้าสู่ระบบ</button>`;
  box.innerHTML=html;
  const u=document.getElementById('mnav-user');
  if(u) u.innerHTML = cu ? `<i class="ti ti-user-circle" style="vertical-align:-2px;color:#6fd6b6"></i> ${cu.name}` : 'เมนู';
}
function toggleMenu() {
  const bd=document.getElementById('mnavBd'), mn=document.getElementById('mnav');
  const open=mn.classList.contains('open');
  if(open){ mn.classList.remove('open'); bd.classList.remove('open'); }
  else{ buildMobileMenu(); mn.classList.add('open'); bd.classList.add('open'); }
}
function mNav(p){ toggleMenu(); gp(p); }

// สิทธิ์เข้าหน้าแต่ละเมนู (ตามบทบาท)
// v15.11: ป้าย "ดูอย่างเดียว" สำหรับหน้าที่บทบาทไม่มีสิทธิ์แก้ไข
function viewOnlyNote(what){ return `<div class="viewonly"><i class="ti ti-eye"></i><div><b>ดูอย่างเดียว</b> — บทบาทของคุณ (${escHtml(roleLabel(cu&&cu.role))}) ไม่มีสิทธิ์${what} · ขอสิทธิ์ได้จากผู้ดูแลระบบ</div></div>`; }
function navAllowed(p){
  if(['approve','manage','pm','calendar','mywork','mine'].includes(p)) return !!cu;   // v15.11: เปิดดูได้ทุกบทบาท
  if(p==='config')  return can('manage_config')||can('manage_users')||can('manage_routing');
  return true;
}
// ─── ROUTER ───
const PRIVATE_PAGES=['approve','manage','pm','calendar','config','mywork','mine'];
function gp(p) {
  if (PRIVATE_PAGES.includes(p) && !cu) { pendingPage=p; oLogin(); return; }
  if (PRIVATE_PAGES.includes(p) && cu && !navAllowed(p)) { showToast('บทบาทของคุณไม่มีสิทธิ์เข้าหน้านี้'); return; }
  curPage=p;
  document.querySelectorAll('.ntab').forEach(t=>t.classList.toggle('on', t.dataset.p===p));
  buildMobileMenu();
  rp();
}
function rp() {
  const c=document.getElementById('pg');
  if(curPage==='report')    c.innerHTML=pgReport();
  else if(curPage==='status')    c.innerHTML=pgStatus();
  else if(curPage==='mine')      c.innerHTML=pgMine();
  else if(curPage==='mywork')    c.innerHTML=pgMyWork();
  else if(curPage==='approve')   c.innerHTML=pgApprove();
  else if(curPage==='manage')    c.innerHTML=pgManage();
  else if(curPage==='pm')        c.innerHTML=pgPM();
  else if(curPage==='calendar')  c.innerHTML=pgCalendar();
  else if(curPage==='dashboard') { c.innerHTML=pgDashboard(); setTimeout(runCountUp,60); }
  else if(curPage==='config')    c.innerHTML=pgConfig();
}
// ตัวเลขนับขึ้น (count-up) สำหรับการ์ดสถิติ Dashboard
function runCountUp(){
  document.querySelectorAll('.dash-stats .stat-n').forEach(el=>{
    if(el.dataset.n===undefined) el.dataset.n=(el.textContent||'').trim();   // v15.9: จำค่าจริงไว้ กันเรนเดอร์ซ้อนแล้วค้างที่ 0
    const raw=el.dataset.n;
    if(!/^\d+$/.test(raw)) return;   // นับเฉพาะจำนวนเต็ม (ข้ามค่าทศนิยม เช่น พึงพอใจ 4.6 และ "—")
    const target=parseInt(raw,10);
    const dur=650, t0=performance.now();
    function step(t){
      const p=Math.min(1,(t-t0)/dur);
      const val=Math.round(target*(1-Math.pow(1-p,3)));  // ease-out cubic
      el.textContent=val;
      if(p<1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  });
}

