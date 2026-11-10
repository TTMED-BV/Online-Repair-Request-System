// ระบบแจ้งซ่อมออนไลน์ — admin.js (v17.3) : ตั้งค่า · ผู้ใช้/บทบาท · แจ้งเตือน · กติกาวิ่งงาน · คลัง · จัดการระบบ
// โหลดตามลำดับใน index.html (classic script ใช้ตัวแปรร่วมกัน)
// ════════════════════════ PAGE: CONFIG ════════════════════════
function pgConfig() {
  return `<div style="max-width:640px;margin:0 auto">
    <div class="card" style="margin-bottom:1rem">
      <div class="ctitle">⚙ ตั้งค่าเชื่อมต่อ Google Apps Script</div>
      <div class="notice n-info" style="margin-bottom:1rem;font-size:12px">
        <b>วิธีตั้งค่า:</b><br>
        1. เปิด Google Sheet ใหม่ → Extensions → Apps Script<br>
        2. วาง Code จาก <code>Code.gs</code> แล้วกด Save<br>
        3. Deploy → New Deployment → Web App<br>
        4. Execute as: <b>Me</b> | Who has access: <b>Anyone</b><br>
        5. Copy URL แล้ววางด้านล่าง<br>
        6. กด "เริ่มใช้งาน" เพื่อสร้าง Sheet อัตโนมัติ
      </div>
      <div class="ff">
        <label>Google Apps Script Web App URL</label>
        <input id="gasUrl" placeholder="https://script.google.com/macros/s/xxxxxxx/exec" value="${GAS_URL}">
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-p" onclick="saveGasUrl()">💾 บันทึก URL</button>
        <button class="btn btn-green" onclick="initSheet()">🚀 เริ่มใช้งาน (สร้าง Sheet)</button>
        <button class="btn" onclick="testConnection()">🔗 ทดสอบการเชื่อมต่อ</button>
      </div>
      <div id="cfgMsg" style="margin-top:.75rem"></div>
    </div>
    ${cu&&cu.isEngineer?renderUserManage():''}
    ${cu&&(cu.isEngineer||can('manage_routing'))?renderRouting():''}
    ${cu&&cu.isEngineer?renderOpsConfig():''}
    ${cu&&cu.isEngineer?renderInventoryConfig():''}
    ${cu&&cu.isEngineer?renderAdminManage():`<div class="notice n-info" style="margin-bottom:1rem"><i class="ti ti-lock ni"></i><div>การจัดการอาคาร/สถานะ/ประเภทงาน สงวนสำหรับวิศวกรเท่านั้น</div></div>`}
    <div class="card">
      <div class="ctitle">ข้อมูลระบบ</div>
      <div style="font-size:13px;color:var(--tx2);line-height:2">
        งานในระบบ: <b>${DB.tickets.length}</b><br>
        สำเนาในเครื่องนี้ (แคช): <b>${JSON.parse(localStorage.getItem('vr3_t')||'[]').length}</b> รายการ<br>
        URL ปัจจุบัน: <span class="mono" style="font-size:12px;word-break:break-all">${GAS_URL||'ยังไม่ได้ตั้งค่า'}</span><br>
        เวอร์ชันหน้าเว็บ: <b>${APP_VERSION}</b> (${APP_BUILD}) · เวอร์ชันเซิร์ฟเวอร์ (Code.gs): <b>${SERVER_VERSION||'—'}</b>
        ${SERVER_VERSION&&SERVER_VERSION!==SERVER_REQUIRED?`<div class="notice n-amber" style="margin:6px 0 0;font-size:12px">เวอร์ชันไม่ตรงกัน — ให้ Deploy Code.gs ${SERVER_REQUIRED} (Edit → New version)</div>`:''}
      </div>
      <hr class="divider">
      <button class="btn btn-sm" onclick="clearLocalCache()">🧹 ล้างแคชในเครื่องนี้</button>
      <div style="font-size:12px;color:var(--tx3);margin-top:6px">ล้างเฉพาะสำเนาที่เก็บในเบราว์เซอร์นี้ แล้วโหลดข้อมูลใหม่จาก Google Sheets — ใช้เมื่อหน้าเว็บแสดงข้อมูลไม่ตรง (ใบงานจริงไม่ถูกลบ)</div>
    </div>
    ${cu&&cu.isEngineer?`<div class="card" style="border:1.5px solid var(--red-tx)">
      <div class="ctitle" style="color:var(--red-tx)">⚠️ ล้างใบงานทั้งหมด (ก่อนเริ่มใช้งานจริง)</div>
      <div style="font-size:13px;color:var(--tx2);line-height:1.7">
        ลบใบแจ้งซ่อม ประวัติ และรายการรูปภาพ<b>ทุกใบ</b>ใน Google Sheets เพื่อเริ่มนับใหม่ — ใช้ครั้งเดียวก่อนเปิดใช้งานจริง<br>
        • ระบบ<b>สำรองข้อมูลก่อนลบเสมอ</b> เป็นแท็บซ่อนชื่อ <span class="mono">BK_Tickets_วันเวลา</span> ใน Google Sheets<br>
        • ไม่กระทบ: ผู้ใช้ การตั้งค่า อาคาร/สถานะ เส้นทางงาน คลังอุปกรณ์ PM การแจ้งเตือน
      </div>
      <button class="btn btn-sm btn-red" style="margin-top:.6rem" onclick="resetAllTickets()">🗑 ล้างใบงานทั้งหมด…</button>
    </div>`:''}
  </div>`;
}

// ═══════════ ข้อ 4: จัดการผู้ใช้ + บทบาท/สิทธิ์ (เฉพาะวิศวกร) ═══════════
function usersForManage(){
  if(ALL_USERS && ALL_USERS.length) return ALL_USERS.slice();
  return Object.values(USERS);
}
function renderUserManage(){
  const users = usersForManage();
  const roleOpts = ROLES.length ? ROLES : [{role:'admin',label:'วิศวกร/แอดมิน'}];
  const uRows = users.map(u=>{
    const act = u.active!==false;
    return `<tr>
      <td><span class="av-chip" style="background:${(u.color||'#ccc')}22;color:${u.color||'#777'}">${u.initials||'?'}</span> <b>${escAttr(u.name||u.username)}</b></td>
      <td class="mono" style="font-size:12px">${escAttr(u.username)}</td>
      <td><span class="badge ${u.isEngineer?'b-teal':'b-gray'} nodot">${roleLabel(u.role)}</span></td>
      <td style="white-space:nowrap;font-size:12px" title="ช่องทางแจ้งเตือน">${notifyIcons(u)}</td>
      <td style="text-align:center"><span class="badge ${act?'b-green':'b-red'} nodot">${act?'ใช้งาน':'ปิด'}</span></td>
      <td style="text-align:right;white-space:nowrap">
        <button class="btn btn-sm" onclick="openUserForm('${escAttr(u.username)}')"><i class="ti ti-edit"></i></button>
        <button class="btn btn-sm" title="รีเซ็ตรหัสผ่าน" onclick="resetUserPw('${escAttr(u.username)}')"><i class="ti ti-key"></i></button>
        <button class="btn btn-sm" title="${act?'ปิดการใช้งาน':'เปิดใช้งาน'}" onclick="toggleUserActive('${escAttr(u.username)}',${act?'false':'true'})"><i class="ti ti-${act?'user-off':'user-check'}"></i></button>
        <button class="btn btn-sm btn-red" onclick="delUser('${escAttr(u.username)}')"><i class="ti ti-trash"></i></button>
      </td>
    </tr>`;
  }).join('');
  return `<div class="card" style="margin-bottom:1rem">
    <div class="ctitle" style="justify-content:space-between;flex-wrap:wrap;gap:8px">
      <span>👥 จัดการผู้ใช้</span>
      <button class="btn btn-sm btn-accent" onclick="openUserForm()"><i class="ti ti-user-plus"></i> เพิ่มผู้ใช้</button>
    </div>
    <div style="overflow-x:auto"><table class="tbl" style="min-width:520px">
      <thead><tr><th>ชื่อ</th><th>Username</th><th>บทบาท</th><th>แจ้งเตือน</th><th style="text-align:center">สถานะ</th><th></th></tr></thead>
      <tbody>${uRows||'<tr><td colspan="5" style="text-align:center;color:var(--tx3);padding:14px">ยังไม่มีผู้ใช้</td></tr>'}</tbody>
    </table></div>
    <div id="userMsg" style="margin-top:.6rem"></div>
  </div>
  <div class="card" style="margin-bottom:1rem">
    <div class="ctitle" style="justify-content:space-between;flex-wrap:wrap;gap:8px">
      <span>🔑 บทบาทและสิทธิ์</span>
      <span style="font-size:12px;color:var(--tx3)">ติ๊กเพื่อเปิด/ปิดสิทธิ์ของแต่ละบทบาท</span>
    </div>
    <div id="roleMatrixBox">${renderRoleMatrix()}</div>
  </div>`;
}

let roleDraft=null;
function ensureRoleDraft(){ if(!roleDraft) roleDraft=JSON.parse(JSON.stringify(ROLES.length?ROLES:[])); return roleDraft; }
function renderRoleMatrix(){
  const roles=ensureRoleDraft();
  if(!roles.length) return '<div style="color:var(--tx3);font-size:13px">ยังไม่มีข้อมูลบทบาท (จะถูกสร้างอัตโนมัติเมื่อเชื่อมต่อเซิร์ฟเวอร์)</div>';
  const head=`<th style="text-align:left">สิทธิ์ \\ บทบาท</th>`+roles.map(r=>`<th style="text-align:center;font-size:12px">${escAttr(r.label)}${r.isEngineer?' ★':''}</th>`).join('');
  const rows=ALL_CAPS_FE.map(cap=>`<tr>
    <td style="font-size:12.5px;color:var(--tx2)">${CAP_LABELS[cap]}</td>
    ${roles.map((r,ri)=>{
      const on=(r.caps||[]).includes(cap);
      const locked=r.isEngineer; // วิศวกรได้ทุกสิทธิ์เสมอ
      return `<td style="text-align:center"><input type="checkbox" ${on||locked?'checked':''} ${locked?'disabled':''} style="width:auto;accent-color:var(--accent)" onchange="toggleCap(${ri},'${cap}',this.checked)"></td>`;
    }).join('')}
  </tr>`).join('');
  return `<div style="overflow-x:auto"><table class="tbl" style="min-width:${120+roles.length*90}px">
    <thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>
    <div style="font-size:12px;color:var(--tx3);margin:8px 0">★ = บทบาทวิศวกร/แอดมิน (ได้ทุกสิทธิ์โดยอัตโนมัติ)</div>
    <button class="btn btn-accent btn-sm" onclick="saveRoleMatrix()"><i class="ti ti-device-floppy"></i> บันทึกสิทธิ์</button>`;
}
function toggleCap(ri,cap,on){
  const roles=ensureRoleDraft(); const r=roles[ri]; if(!r) return;
  r.caps=r.caps||[];
  if(on){ if(!r.caps.includes(cap)) r.caps.push(cap); }
  else  { r.caps=r.caps.filter(c=>c!==cap); }
}
async function saveRoleMatrix(){
  const roles=ensureRoleDraft();
  showLoader('กำลังบันทึกสิทธิ์...');
  try{
    await api('saveRoles',{roles,token:AUTH_TOKEN});
    ROLES=JSON.parse(JSON.stringify(roles)); roleDraft=null;
    hideLoader(); showToast('บันทึกสิทธิ์แล้ว'); updAuthUI(); rp();
  }catch(e){ hideLoader(); showToast('บันทึกไม่สำเร็จ: '+e.message,3000); }
}

// ═══ v14: การแจ้งเตือนรายคน (LINE OA / อีเมล) ═══
const NOTIFY_LBL={both:'LINE + อีเมล',line:'LINE',email:'อีเมล',none:'ไม่รับ'};
const NOTIFY_EVT={new:'มีใบแจ้งซ่อมใหม่ (เฉพาะที่ตนเกี่ยวข้อง)',assigned:'ถูกมอบหมายงาน',purchase:'มีงานรออนุมัติจัดซื้อ (บริหาร)',stock:'อุปกรณ์ใกล้หมด (วิศวกร/บริหาร)',monthly:'สรุปงานรายเดือน ทุกวันที่ 1 (วิศวกร/บริหาร)',daily:'งานที่ฉันรับผิดชอบ (ค้าง + เสร็จเดือนนี้) ทุกเช้าวันทำการ 08:00'};
function notifyIcons(u){
  if(u.notify==='none') return '<span class="badge b-gray nodot">ไม่รับ</span>';
  const l=(u.notify!=='email')?(u.hasLine?'<span class="badge b-green nodot">LINE ✓</span>':'<span class="badge b-amber nodot" title="ยังไม่ผูก LINE">LINE —</span>'):'';
  const e=(u.notify!=='line')?(u.hasEmail?'<span class="badge b-blue nodot">อีเมล ✓</span>':'<span class="badge b-amber nodot" title="ยังไม่ใส่อีเมล">อีเมล —</span>'):'';
  return l+' '+e;
}
function notifyFormHtml(info,prefix){
  return `<div class="ff"><label>อีเมลสำหรับรับแจ้งเตือน</label><input id="${prefix}Email" type="email" value="${escAttr(info.email||'')}" placeholder="name@psu.ac.th"></div>
    <div class="ff"><label>รับแจ้งเตือนทาง</label><select id="${prefix}Ch">${Object.entries(NOTIFY_LBL).map(([k,l])=>`<option value="${k}" ${(info.notify||'both')===k?'selected':''}>${l}</option>`).join('')}</select>
      <div style="font-size:12px;color:var(--tx3);margin-top:3px">ถ้าเลือก LINE แต่ส่งไม่ได้ (ยังไม่ผูก/เกินโควตาเดือนนี้) ระบบส่งทางอีเมลแทน</div></div>
    <div class="ff"><label>แจ้งเมื่อ</label>${Object.entries(NOTIFY_EVT).map(([k,l])=>`<label style="display:flex;gap:6px;align-items:center;font-size:13px;cursor:pointer;margin:3px 0"><input type="checkbox" class="${prefix}Evt" value="${k}" style="width:auto" ${(info.events||Object.keys(NOTIFY_EVT)).includes(k)?'checked':''}> ${l}</label>`).join('')}</div>`;
}
function readNotifyForm(prefix){
  return { email:(document.getElementById(prefix+'Email').value||'').trim(), notify:document.getElementById(prefix+'Ch').value,
           events:[...document.querySelectorAll('.'+prefix+'Evt:checked')].map(x=>x.value) };
}
async function openMyNotify(extra){
  if(!cu) return;
  showLoader('กำลังโหลด...');
  let info;
  try{ info=await api('myNotify',{token:AUTH_TOKEN,fields:extra||null}); }
  catch(e){ hideLoader(); if(!handleAuthError(e)) showToast(/Unknown action/.test(e.message)?'ต้อง Deploy Code.gs เวอร์ชัน v14 ก่อน':'โหลดไม่สำเร็จ: '+e.message,3500); return; }
  hideLoader();
  const ln=info.line||{};
  document.getElementById('userContent').innerHTML=`
    <div class="modal-title">🔔 การแจ้งเตือนของฉัน <button class="mc" onclick="cm('userMd')"><i class="ti ti-x"></i></button></div>
    ${notifyFormHtml(info,'my')}
    <div style="background:var(--surf2);border-radius:8px;padding:.7rem .8rem;margin-bottom:.9rem;font-size:13px">
      <div style="font-weight:600;margin-bottom:4px">LINE: ${info.hasLine?'<span class="badge b-green nodot">ผูกแล้ว ✓</span>':'<span class="badge b-amber nodot">ยังไม่ผูก</span>'}</div>
      ${!ln.ready?'<div style="color:var(--tx3);font-size:12px">ผู้ดูแลยังไม่ได้ตั้งค่า LINE OA ในระบบ</div>':
        info.linkCode?`<div>1) เพิ่มเพื่อน LINE OA ของระบบแจ้งซ่อม<br>2) พิมพ์รหัสนี้ส่งในแชท OA (ใช้ได้ 15 นาที)</div><div style="font-size:30px;font-weight:700;letter-spacing:6px;text-align:center;margin:8px 0" class="mono">${info.linkCode}</div>`:
        `<button class="btn btn-sm" onclick="openMyNotify({newCode:true})">${info.hasLine?'ผูกใหม่ (เปลี่ยนบัญชี LINE)':'ขอรหัสผูก LINE'}</button>
         ${info.hasLine?`<button class="btn btn-sm btn-red" onclick="if(confirm('ยกเลิกการผูก LINE?'))openMyNotify({unlinkLine:true})">ยกเลิกการผูก</button>`:''}`}
      ${cu.isEngineer&&ln.ready?`<div style="font-size:12px;color:var(--tx3);margin-top:6px">โควตา LINE เดือนนี้: ${ln.used} / ${ln.limit} ข้อความ</div>`:''}
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn btn-accent" style="flex:1" onclick="saveMyNotify()"><i class="ti ti-device-floppy"></i> บันทึก</button>
      <button class="btn" onclick="testMyNotify()">ส่งทดสอบ</button>
      <button class="btn" onclick="sendMineNow()" title="ส่งรายการงานค้างและงานที่เสร็จเดือนนี้ของคุณเข้า LINE ตอนนี้">📋 ส่งงานที่ฉันรับผิดชอบเข้า LINE</button>
    </div>`;
  document.getElementById('userMd').style.display='flex';
}
async function saveMyNotify(){
  const f=readNotifyForm('my');
  showLoader('กำลังบันทึก...');
  try{ await api('myNotify',{token:AUTH_TOKEN,fields:f}); hideLoader(); showToast('บันทึกการแจ้งเตือนแล้ว'); cm('userMd'); loadAll({silent:true}).then(rp); }
  catch(e){ hideLoader(); showToast('ไม่สำเร็จ: '+e.message,3000); }
}
// v15.10: ส่งรายการงานของฉัน (ค้าง + เสร็จเดือนนี้) เข้า LINE ตอนนี้
async function sendMineNow(){
  showLoader('กำลังส่งงานที่ฉันรับผิดชอบ...');
  try{ const r=await api('mineNow',{token:AUTH_TOKEN}); hideLoader();
    const m={line:'ส่งเข้า LINE แล้ว',email:'ส่งทางอีเมลแล้ว (ยังไม่ได้ผูก LINE หรือโควตาเต็ม)',empty:'ไม่มีงานค้างและงานที่เสร็จเดือนนี้ — ไม่ได้ส่ง',none:'ส่งไม่ได้ — ยังไม่ได้ผูก LINE และไม่มีอีเมล',off:'บัญชีถูกปิดใช้งาน'};
    showToast((m[r.result]||r.result)+` · ค้าง ${r.open} · เสร็จเดือนนี้ ${r.done}`,5000);
  }catch(e){ hideLoader(); if(!handleAuthError(e)) showToast(/Unknown action/.test(e.message)?'ต้อง Deploy Code.gs v15.2 ก่อน':'ส่งไม่สำเร็จ: '+e.message,4000); }
}
async function testMyNotify(){
  await saveMyNotify();
  showLoader('กำลังส่งทดสอบ...');
  try{ const r=await api('testNotify',{token:AUTH_TOKEN}); hideLoader();
    showToast(r.line||r.email?`ส่งแล้ว: ${[r.line&&'LINE',r.email&&'อีเมล'].filter(Boolean).join(' + ')}`:'ส่งไม่ได้ — ตรวจว่าผูก LINE หรือใส่อีเมลแล้ว',3500); }
  catch(e){ hideLoader(); showToast('ไม่สำเร็จ: '+e.message,3000); }
}
let NOTIFY_ALL=null;
async function loadNotifyAll(){ try{ NOTIFY_ALL=await api('getNotifyAll',{token:AUTH_TOKEN}); }catch(e){ NOTIFY_ALL=null; } return NOTIFY_ALL; }

function openUserForm(username){
  const isEdit=!!username;
  const u=isEdit?(usersForManage().find(x=>x.username===username)||{}):{};
  const roleOpts=(ROLES.length?ROLES:[{role:'admin',label:'วิศวกร/แอดมิน'}]).map(r=>`<option value="${r.role}" ${u.role===r.role?'selected':''}>${escAttr(r.label)}</option>`).join('');
  document.getElementById('userContent').innerHTML=`
    <div class="modal-title">${isEdit?'แก้ไขผู้ใช้':'เพิ่มผู้ใช้'} <button class="mc" onclick="cm('userMd')"><i class="ti ti-x"></i></button></div>
    <div class="frow"><div class="ff" style="margin:0"><label>Username${isEdit?'':' *'}</label>
      <input id="uUser" value="${escAttr(u.username||'')}" ${isEdit?'disabled':''} placeholder="เช่น tech2"></div>
      <div class="ff" style="margin:0"><label>ชื่อ-สกุล</label><input id="uName" value="${escAttr(u.name||'')}" placeholder="นาย..."></div>
    </div>
    ${isEdit?'':`<div class="ff" style="margin-top:.6rem"><label>รหัสผ่านเริ่มต้น *</label><input id="uPass" placeholder="อย่างน้อย 4 ตัว"></div>`}
    <div class="frow" style="margin-top:.6rem">
      <div class="ff" style="margin:0"><label>บทบาท</label><select id="uRole">${roleOpts}</select></div>
      <div class="ff" style="margin:0"><label>ความเชี่ยวชาญ (คั่นด้วย ,)</label><input id="uSpec" value="${escAttr(Array.isArray(u.specialty)?u.specialty.join(', '):(u.specialty||''))}" placeholder="ระบบไฟฟ้า, ปรับอากาศ"></div>
    </div>
    <div class="frow" style="margin-top:.6rem">
      <div class="ff" style="margin:0"><label>สีประจำตัว</label><input id="uColor" type="color" value="${escAttr(u.color||'#9fb4cc')}" style="height:38px;padding:3px"></div>
      <div class="ff" style="margin:0"><label>อักษรย่อ</label><input id="uInit" value="${escAttr(u.initials||'')}" maxlength="3" placeholder="เช่น ธร"></div>
    </div>
    <div style="font-weight:600;font-size:13px;margin:.9rem 0 .4rem">🔔 การแจ้งเตือน</div>
    <div id="uNotifyBox"><div style="font-size:12px;color:var(--tx3)">กำลังโหลด...</div></div>
    <div id="uErr" style="color:var(--red-tx);font-size:12px;margin:.5rem 0;display:none"></div>
    <button class="btn btn-accent" style="width:100%;margin-top:.5rem" onclick="saveUser(${isEdit?`'${escAttr(username)}'`:'null'})"><i class="ti ti-device-floppy"></i> บันทึก</button>`;
  document.getElementById('userMd').style.display='flex';
  (async()=>{ const all=isEdit?await loadNotifyAll():null; const box=document.getElementById('uNotifyBox'); if(!box) return;
    const info=(all&&all.users&&all.users[username])||{notify:'both'};
    box.innerHTML=notifyFormHtml(info,'u')+(isEdit?`<div style="font-size:12px;color:var(--tx3)">LINE: ${info.hasLine?'ผูกแล้ว ✓ (ผู้ใช้ผูกเองที่เมนูชื่อผู้ใช้ → การแจ้งเตือนของฉัน)':'ยังไม่ผูก — ให้ผู้ใช้ผูกเองที่เมนูชื่อผู้ใช้มุมขวาบน'}</div>`:''); })();
}
async function saveUser(username){
  const isEdit=!!username;
  const err=document.getElementById('uErr');
  const spec=(v('uSpec')||'').split(',').map(s=>s.trim()).filter(Boolean);
  const base={ name:v('uName'), role:v('uRole'), specialty:spec, color:v('uColor'), initials:v('uInit') };
  showLoader('กำลังบันทึก...');
  try{
    const nf=document.getElementById('uEmail')?readNotifyForm('u'):null;
    if(isEdit){
      await api('updateUser',{username,fields:base,token:AUTH_TOKEN});
      if(nf) try{ await api('setUserNotify',{username,fields:nf,token:AUTH_TOKEN}); }catch(e2){ if(!/Unknown action/.test(e2.message)) throw e2; }
    }else{
      const uname=v('uUser'), pass=document.getElementById('uPass').value;
      if(!uname||!pass){ hideLoader(); err.style.display='block'; err.textContent='กรุณากรอก Username และรหัสผ่าน'; return; }
      await api('addUser',{user:{...base,username:uname,password:pass},token:AUTH_TOKEN});
      if(nf) try{ await api('setUserNotify',{username:uname,fields:nf,token:AUTH_TOKEN}); }catch(e2){ if(!/Unknown action/.test(e2.message)) throw e2; }
    }
    await loadAll({silent:true});
    hideLoader(); cm('userMd'); rp(); showToast(isEdit?'บันทึกผู้ใช้แล้ว':'เพิ่มผู้ใช้แล้ว');
  }catch(e){ hideLoader(); err.style.display='block'; err.textContent=e.message; }
}
async function resetUserPw(username){
  const np=prompt('ตั้งรหัสผ่านใหม่ให้ '+username+' (อย่างน้อย 4 ตัว):'); if(np===null) return;
  if((np||'').length<4){ showToast('รหัสผ่านสั้นเกินไป'); return; }
  showLoader('กำลังตั้งรหัสผ่าน...');
  try{ await api('setPassword',{username,password:np,token:AUTH_TOKEN}); hideLoader(); showToast('ตั้งรหัสผ่านใหม่แล้ว'); }
  catch(e){ hideLoader(); showToast('ไม่สำเร็จ: '+e.message,3000); }
}
async function toggleUserActive(username,active){
  showLoader('กำลังบันทึก...');
  try{ await api('updateUser',{username,fields:{active:!!active},token:AUTH_TOKEN}); await loadAll({silent:true}); hideLoader(); rp(); showToast(active?'เปิดใช้งานแล้ว':'ปิดการใช้งานแล้ว'); }
  catch(e){ hideLoader(); showToast('ไม่สำเร็จ: '+e.message,3000); }
}
async function delUser(username){
  if(!confirm('ลบผู้ใช้ '+username+' ?')) return;
  showLoader('กำลังลบ...');
  try{ await api('deleteUser',{username,token:AUTH_TOKEN}); await loadAll({silent:true}); hideLoader(); rp(); showToast('ลบผู้ใช้แล้ว'); }
  catch(e){ hideLoader(); showToast('ไม่สำเร็จ: '+e.message,3000); }
}

// ═══════════ ข้อ 5: กติกาการวิ่งงาน (Routing) ═══════════
let routingDraft=null;
function ensureRoutingDraft(){
  if(!routingDraft){
    routingDraft = CATS.map(cat=>{ const r=routeOf(cat); return { category:cat, autoAssign:r?r.autoAssign:'', approverRoles:r?(r.approverRoles||[]).slice():[] }; });
  }
  return routingDraft;
}
function renderRouting(){
  const rows=ensureRoutingDraft();
  const assignable=Object.values(USERS).filter(u=>u.active!==false);  // ทุกคนเลือกได้ (ช่าง/ไอที/นักวิทย์)
  const roleChips=ROLES.filter(r=>!r.isEngineer);
  const body=rows.map((r,i)=>`<tr>
    <td style="font-size:12.5px">${escAttr(r.category)}</td>
    <td><select onchange="routeEdit(${i},'autoAssign',this.value)" style="min-width:150px">
      <option value="">— ไม่ออโต้ (รอมอบหมาย) —</option>
      ${assignable.map(u=>`<option value="${u.username}" ${r.autoAssign===u.username?'selected':''}>${escAttr(u.name)}</option>`).join('')}
    </select></td>
    <td><div style="display:flex;gap:5px;flex-wrap:wrap">${roleChips.map(rc=>`<label class="pill ${r.approverRoles.includes(rc.role)?'on':''}" style="cursor:pointer;font-size:12px"><input type="checkbox" ${r.approverRoles.includes(rc.role)?'checked':''} onchange="routeApprover(${i},'${rc.role}',this.checked)" style="display:none">${escAttr(rc.label)}</label>`).join('')||'<span style="color:var(--tx3);font-size:12px">—</span>'}</div></td>
  </tr>`).join('');
  return `<div class="card" style="margin-bottom:1rem">
    <div class="ctitle">🔀 กติกาการวิ่งงาน (อัตโนมัติ)</div>
    <div class="notice n-info" style="margin-bottom:.8rem;font-size:12px">กำหนดว่างานแต่ละประเภท <b>วิ่งไปหาใคร</b> โดยอัตโนมัติ (ระบบจะเลือกให้ตอนอนุมัติ แก้ไขได้) และ <b>บทบาทใดมีสิทธิ์อนุมัติ</b> ใบประเภทนั้น (ไม่เลือก = ใครมีสิทธิ์อนุมัติก็ได้)</div>
    <div style="overflow-x:auto"><table class="tbl" style="min-width:560px">
      <thead><tr><th>ประเภทงาน</th><th>วิ่งไปหา (ออโต้)</th><th>บทบาทที่อนุมัติได้</th></tr></thead>
      <tbody>${body}</tbody>
    </table></div>
    <button class="btn btn-accent btn-sm" style="margin-top:.7rem" onclick="saveRouting()"><i class="ti ti-device-floppy"></i> บันทึกกติกา</button>
  </div>`;
}
function routeEdit(i,k,v2){ const d=ensureRoutingDraft(); if(d[i]) d[i][k]=v2; }
function routeApprover(i,role,on){ const d=ensureRoutingDraft(); const r=d[i]; if(!r) return; r.approverRoles=r.approverRoles||[]; if(on){ if(!r.approverRoles.includes(role)) r.approverRoles.push(role);} else { r.approverRoles=r.approverRoles.filter(x=>x!==role);} const lbl=event&&event.target&&event.target.closest('label'); if(lbl) lbl.classList.toggle('on',on); }
async function saveRouting(){
  const d=ensureRoutingDraft();
  showLoader('กำลังบันทึกกติกา...');
  try{ await api('saveRouting',{routing:d,token:AUTH_TOKEN}); ROUTING=JSON.parse(JSON.stringify(d)); routingDraft=null; hideLoader(); showToast('บันทึกกติกาการวิ่งงานแล้ว'); rp(); }
  catch(e){ hideLoader(); showToast('ไม่สำเร็จ: '+e.message,3000); }
}

// ═══════════ ข้อ 3: คลังอุปกรณ์ (ซ่อนไว้จนกว่าจะเปิด) ═══════════
let invDraft=null;
function ensureInvDraft(){ if(!invDraft) invDraft=JSON.parse(JSON.stringify(INVENTORY||[])); return invDraft; }
function renderInventoryConfig(){
  const on=!!FLAGS.inventory;
  const items=ensureInvDraft();
  const rows=items.map((it,i)=>`<tr class="${invLow(it)?'inv-low':''}">
    <td><input value="${escAttr(it.name||'')}" placeholder="เช่น หลอด LED 18W" onchange="invEdit(${i},'name',this.value)" style="min-width:150px"></td>
    <td><input value="${escAttr(it.unit||'ชิ้น')}" style="width:70px" onchange="invEdit(${i},'unit',this.value)"></td>
    <td><input type="number" value="${it.stock||0}" min="0" style="width:80px" onchange="invEdit(${i},'stock',this.value)"></td>
    <td><input type="number" value="${it.min||0}" min="0" style="width:80px" title="เหลือเท่านี้หรือน้อยกว่า = ใกล้หมด แจ้งเตือนผู้เกี่ยวข้อง" onchange="invEdit(${i},'min',this.value)"></td>
    <td style="white-space:nowrap"><button class="btn btn-sm" title="รับเข้า" onclick="invReceive(${i})"><i class="ti ti-plus"></i> รับเข้า</button> <button class="btn btn-sm btn-red" onclick="invRemove(${i})"><i class="ti ti-trash"></i></button></td>
  </tr>`).join('');
  return `<div class="card" style="margin-bottom:1rem">
    <div class="ctitle" style="justify-content:space-between;flex-wrap:wrap;gap:8px">
      <span>📦 ระบบเบิกอุปกรณ์ ${on?'<span class="badge b-green nodot">เปิดใช้</span>':'<span class="badge b-gray nodot">ปิดอยู่</span>'}</span>
      <button class="btn btn-sm ${on?'btn-red':'btn-green'}" onclick="toggleInventory(${on?'false':'true'})">${on?'ปิดระบบนี้':'เปิดใช้ระบบนี้'}</button>
    </div>
    <div class="notice n-info" style="margin-bottom:.8rem;font-size:12px">กำหนดรายการอุปกรณ์ จำนวนคงเหลือ และ <b>จุดสั่งซื้อ</b> — ช่างเบิกอุปกรณ์เข้าใบงานได้ตอนอัปเดตสถานะ (ตัดสต็อกอัตโนมัติ) เมื่อคงเหลือ ≤ จุดสั่งซื้อ ระบบแจ้งเตือนวิศวกรและผู้อนุมัติจัดซื้อ (แถวสีเหลือง = ใกล้หมด) — ขณะนี้${on?'เปิดอยู่':'ปิดอยู่'}</div>
    <div style="overflow-x:auto"><table class="tbl" style="min-width:560px">
      <thead><tr><th>ชื่ออุปกรณ์</th><th>หน่วย</th><th>คงเหลือ</th><th>จุดสั่งซื้อ</th><th></th></tr></thead>
      <tbody>${rows||'<tr><td colspan="5" style="text-align:center;color:var(--tx3);padding:12px">ยังไม่มีอุปกรณ์</td></tr>'}</tbody>
    </table></div>
    <div style="display:flex;gap:8px;margin-top:.7rem;flex-wrap:wrap">
      <button class="btn btn-sm" onclick="invAdd()"><i class="ti ti-plus"></i> เพิ่มอุปกรณ์</button>
      <button class="btn btn-accent btn-sm" onclick="saveInventory()"><i class="ti ti-device-floppy"></i> บันทึกคลัง</button>
      <button class="btn btn-sm" onclick="showInvLog()"><i class="ti ti-history"></i> ประวัติเคลื่อนไหว</button>
    </div>
    <div id="invLogBox"></div>
  </div>`;
}
function invEdit(i,k,v2){ const d=ensureInvDraft(); if(!d[i]) return; d[i][k]=(k==='stock'||k==='min')?Math.max(0,Number(v2)||0):v2; }
function invAdd(){ ensureInvDraft().push({id:'',name:'',unit:'ชิ้น',stock:0,min:0,hidden:false}); rp(); }
function invReceive(i){ const d=ensureInvDraft(); if(!d[i]) return; const n=Number(prompt('รับเข้า "'+(d[i].name||'')+'" จำนวน ('+(d[i].unit||'ชิ้น')+')','')); if(!(n>0)) return; d[i].stock=(Number(d[i].stock)||0)+n; rp(); showToast('เพิ่มแล้ว — กด "บันทึกคลัง" เพื่อยืนยัน'); }
async function showInvLog(){
  const box=document.getElementById('invLogBox'); if(!box) return;
  box.innerHTML='<div style="font-size:12px;color:var(--tx3);margin-top:8px">กำลังโหลด...</div>';
  try{ const r=await api('getInvLog',{limit:60,token:AUTH_TOKEN}); const L=(r&&r.log)||[];
    box.innerHTML=`<div style="overflow-x:auto;margin-top:10px"><table class="tbl" style="min-width:520px;font-size:12px"><thead><tr><th>วันที่</th><th>อุปกรณ์</th><th>จำนวน</th><th>คงเหลือ</th><th>ใบงาน / หมายเหตุ</th><th>โดย</th></tr></thead><tbody>
      ${L.length?L.map(x=>`<tr><td>${fdShort(x.date)}</td><td>${escHtml(x.name)}</td><td style="color:${x.qty<0?'var(--red-tx)':'var(--green-tx)'}">${x.qty>0?'+':''}${x.qty}</td><td>${x.balance}</td><td>${x.ticketId?`<a href="#" onclick="openDet('${escAttr(x.ticketId)}');return false" class="mono">${escHtml(x.ticketId)}</a>`:escHtml(x.note)}</td><td>${escHtml(x.by)}</td></tr>`).join(''):'<tr><td colspan="6" style="text-align:center;color:var(--tx3)">ยังไม่มีประวัติ</td></tr>'}</tbody></table></div>`;
  }catch(e){ box.innerHTML='<div class="notice n-red" style="margin-top:8px;font-size:12px">โหลดไม่สำเร็จ: '+escHtml(e.message)+' (ต้องใช้ Code.gs v15)</div>'; }
}
function invRemove(i){ ensureInvDraft().splice(i,1); rp(); }
async function saveInventory(){
  const d=ensureInvDraft().filter(it=>(it.name||'').trim());
  showLoader('กำลังบันทึกคลัง...');
  try{ const r=await api('saveInventory',{inventory:d,token:AUTH_TOKEN}); await loadAll({silent:true}); invDraft=null; hideLoader(); const lowN=(INVENTORY||[]).filter(invLow).length; showToast('บันทึกคลังอุปกรณ์แล้ว'+(lowN?' · ใกล้หมด '+lowN+' รายการ':'')); rp(); }
  catch(e){ hideLoader(); showToast('ไม่สำเร็จ: '+e.message,3000); }
}
async function toggleInventory(on){
  showLoader('กำลังบันทึก...');
  try{ await api('setFlag',{key:'inventory',value:!!on,token:AUTH_TOKEN}); FLAGS.inventory=!!on; hideLoader(); showToast(on?'เปิดใช้ระบบเบิกอุปกรณ์แล้ว':'ปิดระบบเบิกอุปกรณ์แล้ว'); rp(); }
  catch(e){ hideLoader(); showToast('ไม่สำเร็จ: '+e.message,3000); }
}

// ─── v15: ตั้งค่างานปฏิบัติการ ───
function renderOpsConfig(){
  const o=OPS;
  const num=(k,lbl,min,max,step,unit)=>`<div class="ff" style="margin:0"><label>${lbl}</label><div style="display:flex;align-items:center;gap:6px"><input id="ops_${k}" type="number" min="${min}" max="${max}" step="${step||1}" value="${o[k]}" style="width:100px"> <span style="font-size:12px;color:var(--tx3)">${unit||''}</span></div></div>`;
  return `<div class="card" style="margin-bottom:1rem">
    <div class="ctitle">📊 KPI · จุดซ่อมซ้ำ · สรุปรายเดือน</div>
    <div class="fsec" style="margin-top:0">จุดซ่อมซ้ำ (แนะนำให้เปลี่ยนใหม่)</div>
    <div class="frow">${num('hotCount','ห้องเดียวกันถูกแจ้งตั้งแต่',2,50,1,'ครั้ง')}${num('hotMonths','ภายใน',1,36,1,'เดือนล่าสุด')}</div>
    <div class="fsec">เป้าหมาย KPI (ใช้ในรายงานปีงบประมาณ)</div>
    <div class="frow">${num('kpiOnTime','เสร็จทันกำหนด ≥',0,100,1,'%')}${num('kpiRating','ความพึงพอใจ ≥',1,5,0.1,'/ 5')}</div>
    <div class="frow" style="margin-top:.6rem">${num('kpiDone','ซ่อมสำเร็จ ≥',0,100,1,'%')}<div></div></div>
    <div class="fsec">สรุปรายเดือนอัตโนมัติ</div>
    <label style="display:flex;gap:8px;align-items:center;font-size:13px;cursor:pointer"><input type="checkbox" id="ops_monthly" style="width:auto" ${o.monthly?'checked':''}> ส่งสรุปเดือนก่อนทางอีเมลให้วิศวกร + ผู้บริหาร ทุกวันที่ 1 เวลา 08:00</label>
    <div style="font-size:12px;color:var(--tx3);margin:4px 0 0 26px">ผู้รับเลือกเปิด/ปิดเองได้ที่ "การแจ้งเตือนของฉัน" · ผู้ที่ไม่มีอีเมลแต่ผูก LINE จะได้สรุปย่อทาง LINE</div>
    <div style="display:flex;gap:8px;margin-top:.9rem;flex-wrap:wrap">
      <button class="btn btn-accent btn-sm" onclick="saveOps()"><i class="ti ti-device-floppy"></i> บันทึก</button>
      <button class="btn btn-sm" onclick="testMonthly()"><i class="ti ti-mail"></i> ส่งสรุปรายเดือนทดสอบ (ถึงฉัน)</button>
      <button class="btn btn-sm" onclick="installRichMenu()" title="ต้องอัปโหลด richmenu.png ขึ้นเว็บก่อน"><i class="ti ti-layout-grid"></i> ติดตั้งเมนู LINE (Rich Menu)</button>
    </div>
  </div>`;
}
async function saveOps(){
  const g=k=>Number(document.getElementById('ops_'+k).value);
  const ops={hotCount:g('hotCount'),hotMonths:g('hotMonths'),kpiOnTime:g('kpiOnTime'),kpiRating:g('kpiRating'),kpiDone:g('kpiDone'),monthly:document.getElementById('ops_monthly').checked};
  showLoader('กำลังบันทึก...');
  try{ await api('saveConfig',{config:{ops},token:AUTH_TOKEN}); OPS=Object.assign({},OPS_DEFAULT,ops); _hsCache=null; await loadAll({silent:true}); hideLoader(); showToast('บันทึกการตั้งค่าแล้ว'); rp(); }
  catch(e){ hideLoader(); showToast('ไม่สำเร็จ: '+e.message,3000); }
}
async function installRichMenu(){
  if(!confirm('ติดตั้งเมนู 6 ปุ่มด้านล่างแชท LINE OA ให้ทุกคน?\n(ต้องอัปโหลดไฟล์ richmenu.png ขึ้นเว็บแล้ว)')) return;
  showLoader('กำลังติดตั้งเมนู LINE...');
  try{ const r=await api('setupRichMenu',{token:AUTH_TOKEN}); hideLoader(); showToast(r&&r.message?r.message:'ติดตั้งแล้ว',4000); }
  catch(e){ hideLoader(); showToast('ไม่สำเร็จ: '+e.message,5000); }
}
// v16.2: ดาวน์โหลดรายงานสรุปรายเดือน (PDF จากเซิร์ฟเวอร์ — ไฟล์เดียวกับที่แนบอีเมล)
function prevYm(back=1){ const d=new Date(); d.setDate(1); d.setMonth(d.getMonth()-back); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'); }
async function downloadMonthlyPdf(ym){
  if(!navigator.onLine){ showToast('ต้องออนไลน์เพื่อสร้างรายงาน'); return; }
  showLoader('กำลังสร้างรายงาน PDF...');
  try{
    const r=await api('monthlyPdf',{ym:ym||prevYm(),token:AUTH_TOKEN}); hideLoader();
    const bin=atob(r.data), u8=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u8[i]=bin.charCodeAt(i);
    const url=URL.createObjectURL(new Blob([u8],{type:'application/pdf'}));
    const a=document.createElement('a'); a.href=url; a.download=r.name||'monthly.pdf'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),60000);
    showToast('ดาวน์โหลดรายงาน '+r.label+' แล้ว'+(r.url?' (เก็บสำเนาใน Google Drive ด้วย)':''),3500);
  }catch(e){ hideLoader(); if(!handleAuthError(e)) showToast('สร้างรายงานไม่สำเร็จ: '+e.message+(/Unknown action/.test(e.message)?' (ต้อง Deploy Code.gs v16.2)':''),4000); }
}
async function testMonthly(){
  showLoader('กำลังส่งสรุปรายเดือน...');
  try{ const r=await api('monthlyTest',{token:AUTH_TOKEN}); hideLoader();
    showToast(r&&r.sent&&r.sent.length?('ส่งแล้ว: '+r.sent.join(', ')+' — สรุปเดือน '+r.month):('ส่งไม่ได้: '+((r&&r.skipped||[]).join(', ')||'ไม่มีอีเมล/LINE')),5000); }
  catch(e){ hideLoader(); showToast('ไม่สำเร็จ: '+e.message+' (ต้องใช้ Code.gs v15)',4000); }
}

// ─── หน้าจัดการระบบ (เฉพาะวิศวกร) ───
function renderAdminManage(){
  const cfg = CFG_RAW || {
    buildings: BUILDINGS.map(b=>({...b,hidden:false})),
    statuses:  STATUSES.map(s=>({...s,paused:SLA_PAUSED.includes(s.id),closed:CLOSED_STATUS.includes(s.id),hidden:false})),
    categories:CATS.map(c=>({name:c,sla:SLA[c]||14,hidden:false})),
  };
  // นับการใช้งานจริงเพื่อกันลบของที่ถูกใช้
  const usedB={},usedS={},usedC={};
  DB.tickets.forEach(t=>{usedB[t.building]=1;usedS[t.status]=1;usedC[t.category]=1;});

  const bRows = cfg.buildings.map((b,i)=>`<tr>
    <td><input value="${escAttr(b.icon||'')}" style="width:42px;text-align:center" onchange="cfgEdit('buildings',${i},'icon',this.value)"></td>
    <td><input value="${escAttr(b.name)}" onchange="cfgEdit('buildings',${i},'name',this.value)"></td>
    <td><input value="${escAttr(b.short||'')}" style="width:80px" onchange="cfgEdit('buildings',${i},'short',this.value)"></td>
    <td><input type="number" value="${b.budget||0}" style="width:90px" onchange="cfgEdit('buildings',${i},'budget',this.value)"></td>
    <td style="text-align:center">${cfgToggle('buildings',i,'hidden',b.hidden,usedB[b.id])}</td>
  </tr>`).join('');

  const sRows = cfg.statuses.map((s,i)=>`<tr>
    <td><input value="${escAttr(s.label)}" onchange="cfgEdit('statuses',${i},'label',this.value)"></td>
    <td>${cfgClsSelect('statuses',i,s.cls)}</td>
    <td style="text-align:center">${cfgToggle('statuses',i,'paused',s.paused)}</td>
    <td style="text-align:center">${cfgToggle('statuses',i,'closed',s.closed)}</td>
    <td style="text-align:center">${cfgToggle('statuses',i,'hidden',s.hidden,usedS[s.id])}</td>
  </tr>`).join('');

  const cRows = cfg.categories.map((c,i)=>`<tr>
    <td><input value="${escAttr(c.name)}" onchange="cfgEdit('categories',${i},'name',this.value)"></td>
    <td><input type="number" value="${c.sla||14}" style="width:70px" onchange="cfgEdit('categories',${i},'sla',this.value)"> วัน</td>
    <td style="text-align:center">${cfgToggle('categories',i,'hidden',c.hidden,usedC[c.name])}</td>
  </tr>`).join('');

  const hol = (cfg.holidays||[]).slice().sort((a,b)=>(a.date||'').localeCompare(b.date||''));
  const hRows = hol.length ? hol.map((h)=>{
    const realIdx = (cfg.holidays||[]).indexOf(h);
    return `<tr>
    <td><input type="date" value="${escAttr(h.date||'')}" onchange="cfgEdit('holidays',${realIdx},'date',this.value)"></td>
    <td><input value="${escAttr(h.name||'')}" placeholder="เช่น วันสงกรานต์" onchange="cfgEdit('holidays',${realIdx},'name',this.value)"></td>
    <td style="text-align:center"><button class="btn btn-sm btn-red" onclick="cfgRemove('holidays',${realIdx})"><i class="ti ti-trash"></i></button></td>
  </tr>`;}).join('') : `<tr><td colspan="3" style="text-align:center;color:var(--tx3);padding:12px">ยังไม่มีวันหยุด — กด “เพิ่มวันหยุด”</td></tr>`;

  return `<div class="card" style="margin-bottom:1rem">
    <div class="ctitle" style="justify-content:space-between;flex-wrap:wrap;gap:8px">
      <span><i class="ti ti-building-cog" style="color:var(--accent)"></i> จัดการอาคาร</span>
      <button class="btn btn-sm" onclick="cfgAdd('buildings')"><i class="ti ti-plus"></i> เพิ่มอาคาร</button>
    </div>
    <div style="overflow-x:auto"><table class="tbl xls"><thead><tr><th>ไอคอน</th><th>ชื่ออาคาร</th><th>ชื่อย่อ</th><th>งบ/ปี</th><th>ซ่อน</th></tr></thead><tbody>${bRows}</tbody></table></div>
    <div style="font-size:12px;color:var(--tx3);margin-top:6px">* อาคารที่มีงานใช้อยู่จะซ่อนได้อย่างเดียว ลบไม่ได้ (กันข้อมูลเก่าเพี้ยน)</div>
  </div>
  ${floorManageCard(cfg)}
  <div class="card" style="margin-bottom:1rem">
    <div class="ctitle" style="justify-content:space-between;flex-wrap:wrap;gap:8px">
      <span><i class="ti ti-list-check" style="color:var(--accent)"></i> จัดการสถานะงาน</span>
      <button class="btn btn-sm" onclick="cfgAdd('statuses')"><i class="ti ti-plus"></i> เพิ่มสถานะ</button>
    </div>
    <div style="overflow-x:auto"><table class="tbl xls"><thead><tr><th>ชื่อสถานะ</th><th>สี</th><th>พัก SLA</th><th>จบงาน</th><th>ซ่อน</th></tr></thead><tbody>${sRows}</tbody></table></div>
    <div style="font-size:12px;color:var(--tx3);margin-top:6px">* "พัก SLA" = หยุดนับเวลา (เช่น ประกัน/ผู้รับเหมา) · "จบงาน" = นับเป็นงานสิ้นสุด</div>
  </div>
  <div class="card" style="margin-bottom:1rem">
    <div class="ctitle" style="justify-content:space-between;flex-wrap:wrap;gap:8px">
      <span><i class="ti ti-category" style="color:var(--accent)"></i> จัดการประเภทงาน + SLA</span>
      <button class="btn btn-sm" onclick="cfgAdd('categories')"><i class="ti ti-plus"></i> เพิ่มประเภท</button>
    </div>
    <div style="overflow-x:auto"><table class="tbl xls"><thead><tr><th>ประเภทงาน</th><th>SLA</th><th>ซ่อน</th></tr></thead><tbody>${cRows}</tbody></table></div>
  </div>
  <div class="card" style="margin-bottom:1rem">
    <div class="ctitle" style="justify-content:space-between;flex-wrap:wrap;gap:8px">
      <span><i class="ti ti-calendar-off" style="color:var(--accent)"></i> วันหยุดราชการ (ใช้คำนวณวันคาดว่าเสร็จ)</span>
      <button class="btn btn-sm" onclick="cfgAdd('holidays')"><i class="ti ti-plus"></i> เพิ่มวันหยุด</button>
    </div>
    <div style="overflow-x:auto"><table class="tbl xls"><thead><tr><th>วันที่</th><th>ชื่อวันหยุด</th><th>ลบ</th></tr></thead><tbody>${hRows}</tbody></table></div>
    <div style="font-size:12px;color:var(--tx3);margin-top:6px">* ระบบจะข้ามเสาร์–อาทิตย์ให้อยู่แล้ว ใส่เฉพาะวันหยุดนักขัตฤกษ์/วันหยุดพิเศษ · รูปแบบวันที่ ปปปป-ดด-วว (ค.ศ.)</div>
  </div>
  ${carbonCfgCard()}
  <div class="card" style="margin-bottom:1rem">
    <div class="ctitle"><span><i class="ti ti-mail" style="color:var(--accent)"></i> ลิงก์เว็บระบบ (ใช้ในอีเมลขอประเมินความพึงพอใจ)</span></div>
    <input value="${escAttr(ensureDraft().siteUrl||'')}" placeholder="${escAttr(location.origin+location.pathname)}" onchange="ensureDraft().siteUrl=this.value.trim()">
    <div style="display:flex;gap:8px;align-items:center;margin-top:6px;flex-wrap:wrap">
      <button class="btn btn-sm" onclick="(()=>{const d=ensureDraft();d.siteUrl=location.origin+location.pathname;rp();})()">ใช้ลิงก์หน้านี้</button>
      <span style="font-size:12px;color:var(--tx3)">เมื่อปิดงานเป็น "เสร็จเรียบร้อย" ระบบจะส่งอีเมลลิงก์ประเมินถึงผู้แจ้งที่กรอกอีเมลไว้ · ว่าง = ไม่ส่งอีเมล</span>
    </div>
  </div>
  <div class="card" style="margin-bottom:1rem;text-align:center">
    <button class="btn btn-accent" onclick="saveAdminConfig()"><i class="ti ti-device-floppy"></i> บันทึกการตั้งค่าทั้งหมด</button>
    <div id="admCfgMsg" style="margin-top:.6rem"></div>
    <div style="font-size:12px;color:var(--tx3);margin-top:6px">การเปลี่ยนแปลงจะมีผลกับทุกคนหลังบันทึกและรีเฟรช</div>
  </div>`;
}

// ── การ์ดจัดการชั้น (แยกตามอาคาร) ──
let floorMgBuilding = null;  // อาคารที่กำลังจัดการชั้นอยู่
function floorManageCard(cfg){
  const blds = (cfg.buildings||[]).filter(b=>!b.hidden);
  if(!blds.length) return `<div class="card" style="margin-bottom:1rem"><div class="ctitle"><i class="ti ti-stack-2" style="color:var(--accent)"></i> จัดการชั้น</div><div style="font-size:12px;color:var(--tx3)">เพิ่มอาคารก่อน แล้วจึงกำหนดชั้นได้</div></div>`;
  if(!floorMgBuilding || !blds.find(b=>b.id===floorMgBuilding)) floorMgBuilding = blds[0].id;
  const floors=(cfg.floors||[]);
  const rows = floors.map((f,i)=>({f,i})).filter(x=>x.f.building===floorMgBuilding);
  const body = rows.length ? rows.map(({f,i})=>`<tr>
    <td><input value="${escAttr(f.floor)}" placeholder="เช่น ชั้น 3" onchange="cfgEdit('floors',${i},'floor',this.value)"></td>
    <td style="text-align:center"><button class="btn btn-sm btn-red" onclick="cfgRemove('floors',${i})"><i class="ti ti-trash"></i></button></td>
  </tr>`).join('') : `<tr><td colspan="2" style="text-align:center;color:var(--tx3);padding:12px">อาคารนี้ยังไม่มีชั้น — กด “เพิ่มชั้น”</td></tr>`;
  return `<div class="card" style="margin-bottom:1rem">
    <div class="ctitle" style="justify-content:space-between;flex-wrap:wrap;gap:8px">
      <span><i class="ti ti-stack-2" style="color:var(--accent)"></i> จัดการชั้นในอาคาร</span>
      <button class="btn btn-sm" onclick="cfgAddFloor()"><i class="ti ti-plus"></i> เพิ่มชั้น</button>
    </div>
    <div class="ff" style="margin-bottom:.75rem"><label>เลือกอาคารที่จะกำหนดชั้น</label>
      <select onchange="floorMgBuilding=this.value;rp()">${blds.map(b=>`<option value="${b.id}" ${b.id===floorMgBuilding?'selected':''}>${b.icon||'🏢'} ${b.name}</option>`).join('')}</select>
    </div>
    <div style="overflow-x:auto"><table class="tbl xls"><thead><tr><th>ชื่อชั้น</th><th>ลบ</th></tr></thead><tbody>${body}</tbody></table></div>
    <div style="font-size:12px;color:var(--tx3);margin-top:6px">* ชั้นที่กำหนดจะไปแสดงเป็นตัวเลือกในฟอร์มแจ้งซ่อม เมื่อผู้แจ้งเลือกอาคารนี้</div>
  </div>`;
}
function cfgAddFloor(){
  const d=ensureDraft();
  if(!d.floors) d.floors=[];
  d.floors.push({building:floorMgBuilding, floor:'', hidden:false});
  CFG_RAW = d; rp();
}

// working copy สำหรับแก้ก่อนบันทึก
let cfgDraft=null;
// v13: ตั้งค่าคาร์บอน
function cbSet(path,val){ const c=ensureDraft().carbon; if(path.length===1) c[path[0]]=Number(val)||0; else { c.cats[path[1]]=c.cats[path[1]]||{kwh:0,pmKwh:0,water:0,replaceKg:0}; c.cats[path[1]][path[2]]=Number(val)||0; } }
function carbonCfgCard(){
  const c=ensureDraft().carbon;
  const num=(path,val,w)=>`<input type="number" step="any" min="0" value="${val}" style="width:${w||80}px" onchange='cbSet(${JSON.stringify(path)},this.value)'>`;
  const rows=CATS.map(n=>{ const x=c.cats[n]||{kwh:0,pmKwh:0,water:0,replaceKg:0};
    return `<tr><td>${escHtml(n)}</td><td>${num(['cats',n,'kwh'],x.kwh)}</td><td>${num(['cats',n,'pmKwh'],x.pmKwh)}</td><td>${num(['cats',n,'water'],x.water)}</td><td>${num(['cats',n,'replaceKg'],x.replaceKg)}</td></tr>`; }).join('');
  return `<div class="card" style="margin-bottom:1rem">
    <div class="ctitle"><span>🌱 ค่ามาตรฐานคาร์บอน (คำนวณอัตโนมัติเมื่อปิดงาน)</span></div>
    <div style="display:flex;gap:14px;flex-wrap:wrap;font-size:12.5px;margin-bottom:10px">
      <label>EF ไฟฟ้า ${num(['efElec'],c.efElec)} kgCO2e/kWh</label>
      <label>EF กระดาษ ${num(['efPaper'],c.efPaper)} kgCO2e/kg</label>
      <label>EF น้ำประปา ${num(['efWater'],c.efWater)} kgCO2e/ลบ.ม.</label>
      <label>กระดาษต่อใบ ${num(['sheetsPerTicket'],c.sheetsPerTicket,60)} แผ่น × ${num(['gramsPerSheet'],c.gramsPerSheet,60)} กรัม</label>
      <label>น้ำยาแอร์ที่กันรั่ว ${num(['refrigKg'],c.refrigKg,60)} กก. × GWP ${num(['refrigGwp'],c.refrigGwp,70)}</label>
      <label>ต้นไม้ 1 ต้นดูดซับ ${num(['treeKgYear'],c.treeKgYear,60)} kgCO2e/ปี</label>
    </div>
    <div style="overflow-x:auto"><table class="tbl xls"><thead><tr><th>ประเภทงาน</th><th>ไฟฟ้าที่ประหยัด (kWh/ใบ)</th><th>งาน PM (kWh/ใบ)</th><th>น้ำที่ประหยัด (ลบ.ม./ใบ)</th><th>ซ่อมแทนซื้อใหม่ (kgCO2e)</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div style="font-size:12px;color:var(--tx3);margin-top:6px">EF ไฟฟ้า 0.4750 (อบก. มีผล 1 ม.ค. 2569) · EF กระดาษ A4 2.1020 (อบก.) · R-32 GWP 677 (IPCC AR5) · ค่า kWh/ลบ.ม./ซ่อมแทนซื้อใหม่ เป็นค่าประมาณตั้งต้น ควรปรับตามหน้างานจริง · "ซ่อมแทนซื้อใหม่" และ "น้ำยาแอร์" นับเฉพาะใบที่ช่างติ๊กตอนปิดงาน</div>
  </div>`;
}
function ensureDraft(){
  if(!cfgDraft){
    const src = CFG_RAW || {
      buildings: BUILDINGS.map(b=>({...b,hidden:false})),
      floors:    FLOORS.map(f=>({...f})),
      statuses:  STATUSES.map(s=>({...s,paused:SLA_PAUSED.includes(s.id),closed:CLOSED_STATUS.includes(s.id),hidden:false})),
      categories:CATS.map(c=>({name:c,sla:SLA[c]||14,hidden:false})),
      holidays:  HOLIDAYS.map(d=>({date:d,name:''})),
    };
    cfgDraft = JSON.parse(JSON.stringify(src));
    if(!cfgDraft.holidays) cfgDraft.holidays=[];
    cfgDraft.carbon=JSON.parse(JSON.stringify(CARBON));   // v13: ค่าคาร์บอนปัจจุบัน (รวมค่าเริ่มต้น)
    if(!cfgDraft.floors) cfgDraft.floors=[];
  }
  return cfgDraft;
}
function cfgEdit(kind,i,field,val){
  const d=ensureDraft();
  if(field==='budget'||field==='sla') val=Number(val)||0;
  d[kind][i][field]=val;
}
function cfgRemove(kind,i){
  const d=ensureDraft();
  d[kind].splice(i,1);
  CFG_RAW = d; rp();
}
function cfgToggle(kind,i,field,cur,used){
  const dis = (field==='hidden'&&used)?'':''; // ซ่อนได้เสมอ
  return `<label style="cursor:pointer"><input type="checkbox" ${cur?'checked':''} onchange="cfgEdit('${kind}',${i},'${field}',this.checked)" style="width:auto;accent-color:var(--accent)"></label>`;
}
function cfgClsSelect(kind,i,cur){
  const opts=[['b-blue','ฟ้า'],['b-green','เขียว'],['b-amber','เหลือง'],['b-red','แดง'],['b-purple','ม่วง'],['b-teal','เขียวน้ำทะเล'],['b-gray','เทา']];
  return `<select onchange="cfgEdit('${kind}',${i},'cls',this.value)" style="width:120px">${opts.map(o=>`<option value="${o[0]}" ${cur===o[0]?'selected':''}>${o[1]}</option>`).join('')}</select>`;
}
function cfgAdd(kind){
  const d=ensureDraft();
  if(kind==='buildings') d.buildings.push({id:'b'+Date.now().toString(36),name:'อาคารใหม่',short:'ใหม่',icon:'🏢',budget:0,hidden:false});
  else if(kind==='statuses') d.statuses.push({id:'st'+Date.now().toString(36),label:'สถานะใหม่',cls:'b-gray',paused:false,closed:false,hidden:false});
  else if(kind==='holidays') d.holidays.push({date:'',name:''});
  else d.categories.push({name:'ประเภทใหม่',sla:14,hidden:false});
  CFG_RAW = d; rp();
}
async function saveAdminConfig(){
  const d=ensureDraft();
  const msg=document.getElementById('admCfgMsg');
  // validation เบื้องต้น
  for(const b of d.buildings){ if(!b.name.trim()){ msg.innerHTML='<div class="notice n-red" style="margin:0">ชื่ออาคารห้ามว่าง</div>'; return; } }
  for(const s of d.statuses){ if(!s.label.trim()){ msg.innerHTML='<div class="notice n-red" style="margin:0">ชื่อสถานะห้ามว่าง</div>'; return; } }
  for(const c of d.categories){ if(!c.name.trim()){ msg.innerHTML='<div class="notice n-red" style="margin:0">ชื่อประเภทห้ามว่าง</div>'; return; } }
  // เอาวันหยุดที่ยังไม่กรอกวันที่ออก
  if(d.holidays) d.holidays = d.holidays.filter(h=>h.date && /^\d{4}-\d{2}-\d{2}$/.test(h.date));
  // เอาชั้นที่ยังไม่กรอกชื่อออก
  if(d.floors) d.floors = d.floors.filter(f=>f.building && String(f.floor).trim());
  showLoader('กำลังบันทึกการตั้งค่า...');
  try{
    if(GAS_URL) await api('saveConfig',{config:d,token:AUTH_TOKEN});
    localStorage.setItem('vr3_cfg',JSON.stringify(d));
    applyConfig(d);
    cfgDraft=null;
    hideLoader();
    msg.innerHTML='<div class="notice n-green" style="margin:0">บันทึกสำเร็จ — มีผลกับทุกคนแล้ว</div>';
    showToast('บันทึกการตั้งค่าแล้ว');
  }catch(e){
    hideLoader();
    if(handleAuthError(e)) return;
    msg.innerHTML=`<div class="notice n-red" style="margin:0">บันทึกไม่สำเร็จ: ${e.message}</div>`;
  }
}

function saveGasUrl() {
  GAS_URL=document.getElementById('gasUrl').value.trim();
  localStorage.setItem('gas_url',GAS_URL);
  document.getElementById('cfgMsg').innerHTML='<div class="notice n-green" style="margin:0">✅ บันทึก URL แล้ว</div>';
  showToast('บันทึก URL แล้ว');
}

async function initSheet() {
  GAS_URL=document.getElementById('gasUrl').value.trim();
  localStorage.setItem('gas_url',GAS_URL);
  showLoader('กำลังสร้าง Google Sheet...');
  try {
    await api('init',{token:AUTH_TOKEN});
    hideLoader();
    document.getElementById('cfgMsg').innerHTML='<div class="notice n-green" style="margin:0">✅ สร้าง Sheet สำเร็จ! พร้อมใช้งานแล้ว</div>';
    showToast('สร้าง Sheet สำเร็จ');
    await loadAll();
  } catch(e) {
    hideLoader();
    document.getElementById('cfgMsg').innerHTML=`<div class="notice n-red" style="margin:0">❌ เกิดข้อผิดพลาด: ${e.message}</div>`;
  }
}

async function testConnection() {
  GAS_URL=document.getElementById('gasUrl').value.trim();
  showLoader('กำลังทดสอบ...');
  try {
    await api('getAll');
    hideLoader();
    document.getElementById('cfgMsg').innerHTML='<div class="notice n-green" style="margin:0">✅ เชื่อมต่อสำเร็จ! Google Sheet พร้อมใช้งาน</div>';
    showToast('เชื่อมต่อสำเร็จ');
  } catch(e) {
    hideLoader();
    document.getElementById('cfgMsg').innerHTML=`<div class="notice n-red" style="margin:0">❌ เชื่อมต่อไม่ได้: ${e.message}</div>`;
  }
}

