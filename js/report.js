// ระบบแจ้งซ่อมออนไลน์ — report.js (v17.6) : หน้าแจ้งซ่อม · ใบที่ฉันแจ้ง · งานที่ฉันรับผิดชอบ · จุดซ่อมซ้ำ · รายงาน KPI
// โหลดตามลำดับใน index.html (classic script ใช้ตัวแปรร่วมกัน)
// ════════════════════════ PAGE: REPORT ════════════════════════
function pgReport() {
  return `
  <div style="max-width:640px;margin:0 auto">
    <div class="notice n-warn" style="margin-bottom:1rem;font-size:12px">
      <b>เงื่อนไข SLA:</b> ระยะเวลาดำเนินการเริ่มนับหลังวิศวกร<b>อนุมัติ</b>เท่านั้น ไม่ใช่วันที่แจ้ง
    </div>
    <div class="card">
      <div class="ctitle"><i class="ti ti-clipboard-plus" style="color:var(--accent)"></i> แบบฟอร์มแจ้งซ่อม</div>
      <div class="fsec">ข้อมูลผู้แจ้ง</div>
      <div class="frow">
        <div class="ff" style="margin:0"><label>ชื่อ-นามสกุล<span class="req">*</span></label><input id="fN" placeholder="ชื่อ นามสกุล" value="${escAttr(ME.n||'')}" oninput="clrErr('fN')"><div class="fld-err" id="e_fN">กรุณากรอกชื่อ</div></div>
        <div class="ff" style="margin:0"><label>โทรศัพท์<span class="req">*</span></label><input id="fP" type="tel" placeholder="08x-xxx-xxxx" value="${escAttr(ME.ph||'')}" oninput="clrErr('fP')"><div class="fld-err" id="e_fP">กรุณากรอกเบอร์โทร</div></div>
      </div>
      <div class="frow" style="margin-top:.75rem">
        <div class="ff" style="margin:0"><label>ตำแหน่ง<span class="req">*</span></label>${deptField(ME.d||'')}<div class="fld-err" id="e_fD">กรุณาเลือกตำแหน่ง (ถ้าเลือก “อื่นๆ” ให้ระบุ)</div></div>
        <div class="ff" style="margin:0"><label>อีเมล</label><input id="fE" type="email" placeholder="@psu.ac.th" value="${escAttr(ME.e||'')}"></div>
      </div>
      <label class="remember"><input type="checkbox" id="fRemember" style="width:auto" ${ME.off?'':'checked'}> จำข้อมูลผู้แจ้งไว้ในเครื่องนี้ (ครั้งหน้าไม่ต้องกรอกใหม่)${ME.n?` · <a href="#" onclick="forgetMe();return false" style="color:var(--tx3)">ล้างข้อมูลที่จำไว้</a>`:''}</label>
      <div class="fsec">สถานที่</div>
      <div class="frow">
        <div class="ff" style="margin:0"><label>อาคาร<span class="req">*</span></label>
          <select id="fB" onchange="clrErr('fB');updFloorOptions()"><option value="">-- เลือกอาคาร --</option>${BUILDINGS.map(b=>`<option value="${b.id}">${b.icon} ${b.name}</option>`).join('')}</select>
          <div class="fld-err" id="e_fB">กรุณาเลือกอาคาร</div>
        </div>
        <div class="ff" style="margin:0"><label>ชั้น<span class="req">*</span></label>
          <select id="fFloor" onchange="clrErr('fFloor');checkDuplicate()" disabled><option value="">-- เลือกอาคารก่อน --</option></select>
          <div class="fld-err" id="e_fFloor">กรุณาเลือกชั้น</div>
        </div>
      </div>
      <div class="ff"><label>ห้อง / จุดที่ต้องการซ่อม<span class="req">*</span></label><input id="fR" placeholder="เช่น ห้อง 201 ห้องปฏิบัติการนวด หน้าลิฟต์" oninput="clrErr('fR');checkDuplicate()"><div class="fld-err" id="e_fR">กรุณาระบุห้องหรือจุดที่ต้องการซ่อม</div></div>
      <div id="dupWarn"></div>
      <div class="fsec">รายละเอียดงาน</div>
      <div class="frow">
        <div class="ff" style="margin:0"><label>ประเภทงาน<span class="req">*</span></label>
          <select id="fC" onchange="clrErr('fC');checkDuplicate()"><option value="">-- เลือกประเภท --</option>${CATS.map(c=>`<option>${c}</option>`).join('')}</select>
          <div class="fld-err" id="e_fC">กรุณาเลือกประเภท</div>
        </div>
        <div class="ff" style="margin:0"><label>ความเร่งด่วน<span class="req">*</span></label>
          <select id="fPr"><option value="low">ปกติ — ไม่เร่งด่วน</option><option value="med">ปานกลาง — กระทบการทำงาน</option><option value="high">เร่งด่วน — กระทบความปลอดภัย</option></select>
        </div>
      </div>
      <div class="ff"><label>รายละเอียดปัญหา<span class="req">*</span></label><textarea id="fDesc" placeholder="อธิบายปัญหาให้ละเอียด เช่น ไฟดับ ท่อรั่ว แอร์ไม่เย็น เพื่อให้วิศวกรอนุมัติได้รวดเร็ว" oninput="clrErr('fDesc')"></textarea><div class="fld-err" id="e_fDesc">กรุณากรอกรายละเอียด</div></div>
      <div class="ff">
        <label>แนบรูปภาพ (ไม่บังคับ — ช่วยให้ช่างประเมินได้เร็วขึ้น)</label>
        <div class="ph-pick">
          <label class="btn btn-sm" style="cursor:pointer;margin:0">
            <i class="ti ti-camera"></i> เลือกรูป / ถ่ายภาพ
            <input type="file" accept="image/*" multiple style="display:none" onchange="onPickReportPhotos(this)">
          </label>
          <span id="photoCount" style="font-size:12px;color:var(--tx3)"></span>
        </div>
        <div id="photoPreview" class="ph-grid" style="margin-top:8px"></div>
      </div>
      <div id="rmsg" style="margin-bottom:.75rem"></div>
      <button class="btn btn-accent btn-block" onclick="submitR()"><i class="ti ti-send"></i> ส่งแจ้งซ่อม</button>
    </div>
  </div>`;
}

async function submitR() {
  const n=v('fN'),ph=v('fP'),d=deptVal(),b=v('fB'),fl=v('fFloor'),r=v('fR'),c=v('fC'),desc=v('fDesc');
  const msg=document.getElementById('rmsg');
  const checks=[['fN',n],['fP',ph],['fD',d],['fB',b],['fFloor',fl],['fR',r],['fC',c],['fDesc',desc]];
  let firstBad=null;
  checks.forEach(([id,val])=>{
    const el=document.getElementById(id), er=document.getElementById('e_'+id);
    if(!val){ el.classList.add('err'); if(er)er.classList.add('show'); if(!firstBad)firstBad=el; }
    else { el.classList.remove('err'); if(er)er.classList.remove('show'); }
  });
  if(firstBad && typeof stepShowFor==='function') stepShowFor(firstBad);   // v17.1 ข้ามไปขั้นที่ยังกรอกไม่ครบ
  if(firstBad){ msg.innerHTML='<div class="notice n-red" style="margin:0"><i class="ti ti-alert-circle ni"></i><div>ยังกรอกข้อมูลไม่ครบ กรุณาตรวจช่องที่ทำเครื่องหมายสีแดง</div></div>'; firstBad.focus(); firstBad.scrollIntoView({behavior:'smooth',block:'center'}); return; }
  const roomFull = fl ? (fl + ' — ' + r) : r;   // รวมชั้น + ห้องเข้าด้วยกัน
  const ticket = {
    id:genId(), createdAt:now(), name:n, phone:ph, dept:d,
    email:v('fE'), building:b, room:roomFull, floor:fl, category:c,
    priority:v('fPr'), estimatedCost:0,   // v15.1: ผู้แจ้งไม่ต้องประมาณราคา — ช่างใส่งบตอนส่งขออนุมัติจัดซื้อ
    actualCost:0, desc, status:'pending_approval',
    assignees:[], approvedAt:null, approvedBy:null, approvedBudget:0,
    history:[{status:'pending_approval',date:now(),note:'รับแจ้งซ่อมเข้าระบบ',by:'ระบบ'}],
    hp:(document.getElementById('fHp')||{}).value||'', dev:deviceId(),   // v17.2 กันสแปม (ช่องดักบอท + รหัสเครื่อง)
    trackPin:genPin()   // v16.1 รหัสติดตามทาง LINE (เซิร์ฟเวอร์เก็บแยก ไม่แสดงสาธารณะ)
  };
  savePinLocal(ticket.id, ticket.trackPin);
  DB.tickets.push(ticket);
  showLoader(pendingPhotos.length ? 'กำลังบันทึกและอัปโหลดรูป...' : 'กำลังบันทึก...');
  await syncAdd(ticket);
  let photoN = 0, photoWait = 0;
  if (pendingPhotos.length) {
    photoWait = pendingPhotos.length;
    photoN = await uploadPendingPhotos(ticket.id, n, 'report');
    photoWait = Math.max(0, photoWait - photoN);
    pendingPhotos = []; renderPendingPhotos();
  }
  hideLoader(); updApvCnt();
  msg.innerHTML=`<div class="notice n-green" style="margin:0"><i class="ti ti-circle-check ni"></i><div><b>ส่งแจ้งซ่อมสำเร็จ</b><br>รหัสใบแจ้งซ่อม: <span class="mono">${ticket.id}</span> — จดรหัสนี้ไว้ติดตามสถานะ<br>สถานะ: รอวิศวกรตรวจสอบและอนุมัติ${photoN?`<br>แนบรูปแล้ว ${photoN} รูป`:''}</div></div>`;
  if(!navigator.onLine || SYNC_Q.some(j=>j.op==='add'&&j.ticket.id===ticket.id) || photoWait)   // v16.2 ยังไม่ถึงเซิร์ฟเวอร์
    msg.innerHTML+=`<div class="notice n-amber" style="margin:8px 0 0"><i class="ti ti-wifi-off ni"></i><div><b>บันทึกไว้ในเครื่องนี้แล้ว</b>${photoWait?` (รวมรูป ${photoWait} รูป)`:''} — ยังไม่ถึงเซิร์ฟเวอร์เพราะไม่มีสัญญาณ ระบบจะส่งให้อัตโนมัติเมื่อกลับมาออนไลน์ <b>อย่าล้างข้อมูลเบราว์เซอร์</b> จนกว่าป้ายมุมขวาล่างจะหายไป</div></div>`;
  msg.innerHTML+=lineFollowBox(ticket.id, ticket.trackPin);   // v16.1
  rememberRequester({n,ph,d,e:v('fE')}, document.getElementById('fRemember')?.checked);
  if(typeof showSubmitSuccess==='function') showSubmitSuccess(ticket, !navigator.onLine || SYNC_Q.some(j=>j.op==='add'&&j.ticket.id===ticket.id));   // v17.1
  addMine(ticket.id);
  if(cu) msg.innerHTML+=`<div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-sm" onclick="gp('mine')"><i class="ti ti-file-text"></i> ดูใบที่ฉันแจ้ง</button></div>`;
  ['fR','fDesc'].concat(ME.n?[]:['fN','fP','fD','fE','fDo']).forEach(f=>{const el=document.getElementById(f);if(el)el.value='';}); if(!ME.n) deptToggle();
  document.getElementById('dupWarn').innerHTML='';
  document.getElementById('fB').value=''; document.getElementById('fC').value='';
  updFloorOptions();
  showToast(navigator.onLine&&!SYNC_Q.some(j=>j.op==='add'&&j.ticket.id===ticket.id)?'บันทึกลง Google Sheet แล้ว':'บันทึกไว้ในเครื่องแล้ว — จะส่งให้เมื่อมีสัญญาณ',3000);
}
function v(id) { const el=document.getElementById(id); return el?el.value.trim():''; }
// v15.9: ตำแหน่งผู้แจ้ง — เลือก อาจารย์ / บุคลากร / นักศึกษา / อื่นๆ (กรอกเอง)
const DEPT_OPTS=['อาจารย์','บุคลากร','นักศึกษา'];
function deptField(cur){
  cur=String(cur||'').trim(); if(cur==='เจ้าหน้าที่') cur='บุคลากร'; const other=!!cur && !DEPT_OPTS.includes(cur);
  return `<select id="fD" onchange="deptToggle();clrErr('fD')"><option value="">-- เลือกตำแหน่ง --</option>${DEPT_OPTS.map(o=>`<option ${o===cur?'selected':''}>${o}</option>`).join('')}<option value="__other" ${other?'selected':''}>อื่นๆ (ระบุ)</option></select>
    <input id="fDo" placeholder="ระบุ เช่น ผู้รับบริการ / ผู้รับเหมา / หน่วยงานภายนอก" value="${other?escAttr(cur):''}" oninput="clrErr('fD')" style="margin-top:6px;${other?'':'display:none'}">`;
}
function deptToggle(){ const s=document.getElementById('fD'), o=document.getElementById('fDo'); if(!s||!o) return; const on=s.value==='__other'; o.style.display=on?'':'none'; if(on) setTimeout(()=>o.focus(),0); }
function deptVal(){ const s=document.getElementById('fD'); if(!s) return ''; if(s.value==='__other'){ const o=document.getElementById('fDo'); return o?o.value.trim():''; } return s.value; }
function clrErr(id){ const el=document.getElementById(id),er=document.getElementById('e_'+id); if(el)el.classList.remove('err'); if(er)er.classList.remove('show'); }
// อัปเดต dropdown ชั้นตามอาคารที่เลือก
function updFloorOptions(preselect){
  const bSel=document.getElementById('fB'), fSel=document.getElementById('fFloor');
  if(!bSel||!fSel) return;
  const fls=floorsOf(bSel.value);
  if(!bSel.value){ fSel.innerHTML='<option value="">-- เลือกอาคารก่อน --</option>'; fSel.disabled=true; return; }
  if(!fls.length){ fSel.innerHTML='<option value="">(อาคารนี้ยังไม่ได้กำหนดชั้น)</option>'; fSel.disabled=true; return; }
  fSel.disabled=false;
  fSel.innerHTML='<option value="">-- เลือกชั้น --</option>'+fls.map(f=>`<option value="${f}" ${preselect===f?'selected':''}>${f}</option>`).join('');
  checkDuplicate();
}

// v15: เตือนแจ้งซ้ำ — ใบที่ยังไม่ปิดในอาคาร+ชั้นเดียวกัน (เน้นห้อง/ประเภทเดียวกัน) + จุดซ่อมซ้ำ
function checkDuplicate(){
  const box=document.getElementById('dupWarn');
  if(!box) return;
  box.innerHTML=''; return;   // v15.1: ไม่แสดงใบอื่นในฟอร์มแจ้งซ่อม (ผู้แจ้งสับสน)
  const b=document.getElementById('fB').value;
  const fl=document.getElementById('fFloor').value;
  const room=(document.getElementById('fR').value||'').trim().toLowerCase();
  const cat=(document.getElementById('fC')?.value||'').trim();
  if(!b || !fl){ box.innerHTML=''; return; }
  const openOnes=DB.tickets.filter(t=>t.building===b && (t.floor===fl || (t.room||'').includes(fl)) && !CLOSED_STATUS.includes(t.status));
  // ให้คะแนนความน่าจะซ้ำ: ห้องตรง +2, ประเภทตรง +1
  const scored=openOnes.map(t=>{ let sc=0; const rm=(t.room||'').toLowerCase();
    if(room && room.length>=2 && rm.includes(room)) sc+=2;
    if(cat && String(t.category||'').trim()===cat) sc+=1;
    return {t,sc}; }).sort((a,b2)=>b2.sc-a.sc);
  const strong=scored.filter(x=>x.sc>=2);
  const hs=room?hotspotOf(b, (fl?fl+' — ':'')+room):null;
  if(!openOnes.length && !hs){ box.innerHTML=''; return; }
  const list=scored.slice(0,5);
  const cls=strong.length?'n-red':'n-amber';
  box.innerHTML=`${openOnes.length?`<div class="notice ${cls}" style="margin-bottom:.9rem">
    <i class="ti ti-alert-triangle ni"></i>
    <div style="flex:1;min-width:0">
      <b>${strong.length?'⚠️ น่าจะแจ้งซ้ำ — จุดนี้มีใบเรื่องเดียวกันที่ยังดำเนินการอยู่':'⚠️ ชั้นนี้มีใบที่ยังดำเนินการอยู่ '+openOnes.length+' ใบ'}</b> — ตรวจก่อนว่าเป็นเรื่องเดียวกันไหม
      <div style="margin-top:6px;display:flex;flex-direction:column;gap:6px">
        ${list.map(({t,sc})=>{const s=getSI(t.status);return `<div style="font-size:12px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;${sc>=2?'font-weight:600':''}">
          <span class="mono">${t.id}</span><span class="badge ${s.cls}" style="font-size:12px">${s.label}</span>
          <span style="color:var(--tx2)">${escHtml(t.room||'')} · ${catChip(t.category)} · แจ้ง ${fdShort(t.createdAt)}</span>
          <button class="btn btn-sm" style="padding:2px 8px" onclick="openDet('${t.id}')">ดู</button>
          <button class="btn btn-sm" style="padding:2px 8px" onclick="followTicket('${t.id}')">ติดตามใบนี้แทน</button></div>`;}).join('')}
      </div>
      <div style="font-size:12px;color:var(--tx3);margin-top:6px">ถ้าเป็นคนละปัญหา แจ้งต่อได้ตามปกติ · กด "ติดตามใบนี้แทน" เพื่อเก็บไว้ในหน้า "ใบที่ฉันแจ้ง" โดยไม่ต้องแจ้งใหม่</div>
    </div></div>`:''}
  ${hs?`<div class="notice n-info" style="margin-bottom:.9rem;font-size:12px"><i class="ti ti-flame ni"></i><div>จุดนี้ถูกแจ้งซ่อม <b>${hs.n} ครั้ง</b> ใน ${OPS.hotMonths} เดือนล่าสุด — ถ้าเป็นอาการเดิม ระบุในรายละเอียดว่า <b>"เสียซ้ำ"</b> เพื่อให้ช่างพิจารณาเปลี่ยนใหม่</div></div>`:''}`;
}
function followTicket(id){ addMine(id); showToast('เก็บใบ '+id+' ไว้ใน "ใบที่ฉันแจ้ง" แล้ว'); }

// ─── v15: จำข้อมูลผู้แจ้ง + ใบของฉัน (เก็บในเครื่องนี้เท่านั้น) ───
function lsGet(k,d){ try{ const v2=localStorage.getItem(k); return v2?JSON.parse(v2):d; }catch(e){ return d; } }
function lsSet(k,v2){ try{ localStorage.setItem(k,JSON.stringify(v2)); }catch(e){} }
let ME = lsGet('vr3_me', {});
function rememberRequester(info, on){
  if(on){ ME={n:info.n,ph:info.ph,d:info.d,e:info.e}; }
  else { ME={off:true}; }
  lsSet('vr3_me', ME);
}
function forgetMe(){ ME={off:true}; lsSet('vr3_me',ME); ['fN','fP','fD','fE','fDo'].forEach(f=>{const el=document.getElementById(f);if(el)el.value='';}); deptToggle(); const r=document.getElementById('fRemember'); if(r) r.checked=false; showToast('ล้างข้อมูลที่จำไว้แล้ว'); }
function addMine(id){ const m=lsGet('vr3_mine',[]); if(!m.includes(id)) m.unshift(id); lsSet('vr3_mine', m.slice(0,100)); }
function removeMine(id){ lsSet('vr3_mine', lsGet('vr3_mine',[]).filter(x=>x!==id)); rp(); }
function digits(x){ return String(x||'').replace(/\D/g,''); }
let mineQuery='';
function myTickets(){
  const ids=lsGet('vr3_mine',[]), ph=digits(mineQuery||ME.ph);
  const byPhone=ph.length>=9 ? DB.tickets.filter(t=>digits(t.phone)===ph) : [];
  const set=new Map();
  ids.forEach(id=>{ const t=DB.tickets.find(x=>x.id===id); if(t) set.set(id,t); });
  byPhone.forEach(t=>set.set(t.id,t));
  return [...set.values()].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
}

// ════════════════════════ PAGE: ใบของฉัน (v15) ════════════════════════
function pgMine(){
  const list=myTickets();
  const waitRate=list.filter(t=>rateState(t)&&rateState(t)!=='rated');
  const openN=list.filter(t=>!CLOSED_STATUS.includes(t.status)).length;
  return `<div style="max-width:760px;margin:0 auto">
    <div class="card" style="margin-bottom:1rem">
      <div class="ctitle"><i class="ti ti-file-text" style="color:var(--accent)"></i> ใบที่ฉันแจ้ง</div>
      <div style="font-size:12.5px;color:var(--tx2);margin-bottom:.7rem">แสดงใบที่แจ้งจากเครื่องนี้ และใบที่ใช้เบอร์โทรเดียวกัน — ไม่ต้องจำรหัสใบ</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <input id="mineQ" type="tel" placeholder="ค้นด้วยเบอร์โทรที่ใช้แจ้ง" value="${escAttr(mineQuery||ME.ph||'')}" style="flex:1;min-width:180px" onkeydown="if(event.key==='Enter'){mineQuery=this.value;rp();}">
        <button class="btn btn-p" onclick="mineQuery=document.getElementById('mineQ').value;rp()"><i class="ti ti-search"></i> ค้นหา</button>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:.8rem;font-size:12.5px">
        <span class="badge b-blue nodot">ทั้งหมด ${list.length} ใบ</span>
        <span class="badge b-amber nodot">กำลังดำเนินการ ${openN}</span>
        ${waitRate.length?`<span class="badge b-red nodot">⭐ รอประเมิน ${waitRate.length}</span>`:''}
      </div>
    </div>
    ${waitRate.length?`<div class="notice n-amber" style="margin-bottom:1rem"><i class="ti ti-star ni"></i><div>มีงานซ่อมเสร็จแล้ว <b>${waitRate.length} ใบ</b> ที่ยังไม่ได้ประเมินความพึงพอใจ — กด "ประเมิน" ที่ใบนั้น (ใช้เวลาไม่ถึง 1 นาที)</div></div>`:''}
    ${list.length?renderStatusList(list):`<div class="empty"><div class="empty-ic"><i class="ti ti-file-search"></i></div><div class="empty-ttl">ยังไม่มีใบของคุณในเครื่องนี้</div><div class="empty-sub">แจ้งซ่อมจากเครื่องนี้ หรือค้นด้วยเบอร์โทรที่ใช้แจ้ง</div><button class="btn btn-accent" style="margin-top:12px" onclick="gp('report')"><i class="ti ti-clipboard-plus"></i> แจ้งซ่อม</button></div>`}
  </div>`;
}

// ════════════════════════ PAGE: งานของฉันวันนี้ (v15, ออกแบบสำหรับมือถือ) ════════════════════════
let mwFilter='todo';
function isMobile(){ return window.matchMedia && window.matchMedia('(max-width: 760px)').matches; }
function myAssigned(){ return cu ? DB.tickets.filter(t=>(t.assignees||[]).includes(cu.username) && !CLOSED_STATUS.includes(t.status)) : []; }
function dueDiff(t){ const d=dueDate(t); if(!d) return null; const td=new Date(); td.setHours(0,0,0,0); const dd=new Date(d); dd.setHours(0,0,0,0); return Math.round((dd-td)/86400000); }
function myWorkCount(){ return myAssigned().filter(t=>{ const x=dueDiff(t); return t.priority==='high' || (x!==null && x<=0); }).length; }
function pgMyWork(){
  if(!cu) return '';
  const mine=myAssigned().map(t=>({t,dd:dueDiff(t)}));
  const urgent=mine.filter(x=>x.t.priority==='high' || (x.dd!==null && x.dd<=0));
  const soon=mine.filter(x=>!urgent.includes(x) && x.dd!==null && x.dd<=3);
  const rest=mine.filter(x=>!urgent.includes(x) && !soon.includes(x));
  const sortF=(a,b)=>(a.dd??999)-(b.dd??999);
  [urgent,soon,rest].forEach(a=>a.sort(sortF));
  const pmDueList=(can('manage_pm')||cu.isEngineer)?(PM_LIST||[]).filter(p=>{const s2=pmDue(p);return s2&&s2.due;}):[];
  const apv=(can('approve_ticket'))?DB.tickets.filter(t=>t.status==='pending_approval'&&canApproveCat(t.category)).length:0;
  const pur=(can('approve_purchase'))?DB.tickets.filter(t=>t.status==='pending_purchase').length:0;
  const lowInv=(FLAGS.inventory&&cu.isEngineer)?(INVENTORY||[]).filter(it=>!it.hidden&&invLow(it)):[];
  const doneToday=DB.tickets.filter(t=>(t.assignees||[]).includes(cu.username)&&t.status==='done'&&t.completedAt&&ymd(new Date(t.completedAt))===ymd(new Date())).length;
  const today=new Date().toLocaleDateString('th-TH',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const chip=(k,lbl,n)=>`<button class="mw-chip ${mwFilter===k?'on':''}" onclick="mwFilter='${k}';rp()">${lbl}<b>${n}</b></button>`;
  let shown = mwFilter==='todo' ? [['🔴 ด่วน / ครบกำหนดวันนี้',urgent],['🟡 ใกล้ครบกำหนด (≤ 3 วัน)',soon],['🟢 งานอื่นที่รับผิดชอบ',rest]]
            : mwFilter==='urgent' ? [['🔴 ด่วน / ครบกำหนดวันนี้',urgent]]
            : [['งานทั้งหมดที่รับผิดชอบ',[...urgent,...soon,...rest]]];
  return `<div style="max-width:720px;margin:0 auto">
    <div class="mw-head">
      <div><div style="font-size:19px;font-weight:700">สวัสดี ${escHtml((cu.name||'').split(' ')[0])} 👋</div><div style="font-size:12.5px;color:var(--tx3)">${today}</div></div>
      <button class="btn btn-sm" onclick="loadAll({silent:true}).then(rp);showToast('กำลังรีเฟรช...')"><i class="ti ti-refresh"></i> รีเฟรช</button>
    </div>
    <div class="mw-stats dash-stats">
      <div class="stat stat-grad-d"><div class="stat-lbl">ด่วน/ครบกำหนด</div><div class="stat-n">${urgent.length}</div></div>
      <div class="stat stat-grad-b"><div class="stat-lbl">ที่ฉันรับผิดชอบทั้งหมด</div><div class="stat-n">${mine.length}</div></div>
      <div class="stat stat-grad-c"><div class="stat-lbl">เสร็จวันนี้</div><div class="stat-n">${doneToday}</div></div>
      <div class="stat stat-grad-e"><div class="stat-lbl">PM ถึงรอบ</div><div class="stat-n">${pmDueList.length}</div></div>
    </div>
    ${apv||pur?`<div class="notice n-warn" style="margin-bottom:.9rem;cursor:pointer" onclick="gp('approve')"><i class="ti ti-circle-check ni"></i><div>${apv?`มีใบรออนุมัติ <b>${apv}</b> ใบ`:''}${apv&&pur?' · ':''}${pur?`รออนุมัติจัดซื้อ <b>${pur}</b> ใบ`:''} — แตะเพื่อไปหน้าอนุมัติ</div></div>`:''}
    ${lowInv.length?`<div class="notice n-amber" style="margin-bottom:.9rem;cursor:pointer" onclick="gp('config')"><i class="ti ti-package ni"></i><div>อุปกรณ์ใกล้หมด <b>${lowInv.length}</b> รายการ: ${lowInv.slice(0,4).map(it=>escHtml(it.name)+' ('+it.stock+')').join(', ')}${lowInv.length>4?' …':''}</div></div>`:''}
    <div class="mw-chips">${chip('todo','ต้องทำ',mine.length)}${chip('urgent','ด่วน',urgent.length)}${chip('all','ทั้งหมด',mine.length)}</div>
    ${mine.length?shown.map(([ttl,arr])=>arr.length?`<div class="mw-sec">${ttl} <span class="badge b-gray nodot">${arr.length}</span></div>${arr.map(x=>myWorkCard(x.t,x.dd)).join('')}`:'').join(''):`<div class="mw-empty">🎉 ไม่มีงานค้างที่มอบหมายให้คุณ</div>`}
    ${pmDueList.length?`<div class="mw-sec">🛠 PM ถึงรอบ <span class="badge b-gray nodot">${pmDueList.length}</span></div>
      ${pmDueList.slice(0,8).map(p=>{const b=getBI(p.building);return `<div class="mw-card pm"><div class="mw-title">${escHtml(p.name)}</div><div class="mw-meta">${b.icon} ${b.short||b.name}${p.floor?' · '+escHtml(p.floor):''} · ${escHtml(p.category||'')}</div><div class="mw-acts" style="grid-template-columns:1fr"><button class="btn" onclick="gp('pm')"><i class="ti ti-calendar-cog"></i> ไปหน้า PM</button></div></div>`;}).join('')}`:''}
    <div style="font-size:12px;color:var(--tx3);text-align:center;margin:1.2rem 0">💡 เพิ่มหน้านี้ลงหน้าจอโฮม: เมนูเบราว์เซอร์ → "เพิ่มลงในหน้าจอหลัก" จะเปิดได้เหมือนแอป</div>
  </div>`;
}
function myWorkCard(t,dd){
  const b=getBI(t.building), s=getSI(t.status), di=dueInfo(t);
  const cls=(t.priority==='high'||(dd!==null&&dd<=0))?'urg':(dd!==null&&dd<=3)?'soon':'ok';
  const tel=digits(t.phone);
  const nextSt=t.status==='assigned'?'working':null;
  return `<div class="mw-card ${cls}">
    <div style="display:flex;gap:5px;flex-wrap:wrap;align-items:center">
      <span class="badge ${s.cls}">${s.label}</span>
      ${t.priority==='high'?'<span class="badge b-red nodot">เร่งด่วน</span>':''}
      ${t.source==='PM'?'<span class="badge b-teal nodot">🛠 PM</span>':''}
      <span class="badge ${di.cls}" style="margin-left:auto">${di.text}${di.sub?' · '+di.sub:''}</span>
    </div>
    <div class="mw-title">${b.icon} ${escHtml(t.room||'')}</div>
    <div class="mw-meta">${escHtml(b.short||b.name)} · ${catChip(t.category)} · <span class="mono" style="font-size:12px">${t.id}</span></div>
    ${t.desc?`<div style="font-size:13.5px;margin-top:6px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden">${escHtml(t.desc)}</div>`:''}
    <div class="mw-meta" style="margin-top:6px"><i class="ti ti-user"></i> ${escHtml(t.name||'-')}${t.dept?' · '+escHtml(t.dept):''}</div>
    ${timelineStrip(t)}
    ${hotspotOf(t.building,t.room)?`<div style="font-size:12px;color:var(--red-tx);margin-top:4px">🔥 จุดซ่อมซ้ำ — พิจารณาเปลี่ยนใหม่</div>`:''}
    <div class="mw-acts">
      ${tel.length>=9?`<a class="btn" href="tel:${tel}"><i class="ti ti-phone"></i> โทร</a>`:`<button class="btn" disabled><i class="ti ti-phone-off"></i> ไม่มีเบอร์</button>`}
      <button class="btn" onclick="openDet('${t.id}')"><i class="ti ti-eye"></i> ดูใบ</button>
      ${!can('manage_tickets')?'':nextSt?`<button class="btn btn-p" onclick="quickStatus('${t.id}','working')"><i class="ti ti-player-play"></i> เริ่มซ่อม</button>`:`<button class="btn btn-p" onclick="openStatusUpdate('${t.id}')"><i class="ti ti-checklist"></i> อัปเดต/ปิดงาน</button>`}
    </div>
  </div>`;
}
async function quickStatus(id, ns){
  const t=DB.tickets.find(x=>x.id===id); if(!t||!cu) return;
  t.status=ns;
  const entry={status:ns,date:now(),note:'เริ่มดำเนินการซ่อม (จากหน้างานที่ฉันรับผิดชอบ)',by:cu.name};
  (t.history=t.history||[]).push(entry);
  rp(); showToast('อัปเดตเป็น "'+getSI(ns).label+'" แล้ว');
  await syncUpdate(id,{status:ns},entry);
}

// ─── v15: จุดซ่อมซ้ำ (ห้องเดียวกันถูกแจ้ง ≥ N ครั้งใน M เดือน) ───
function roomKey(room){ return String(room||'').toLowerCase().replace(/\s+/g,' ').replace(/\s*[—-]\s*/g,'-').trim(); }
let _hsCache=null;
function hotspots(){
  const key=DB.tickets.length+'|'+OPS.hotCount+'|'+OPS.hotMonths+'|'+JSON.stringify(DF);
  if(_hsCache&&_hsCache.key===key) return _hsCache.list;
  const since=new Date(); since.setMonth(since.getMonth()-OPS.hotMonths);
  const m={};
  DB.tickets.forEach(t=>{
    if(t.status==='cancelled' || new Date(t.createdAt)<since) return;
    const k=t.building+'|'+roomKey(t.room);
    if(!m[k]) m[k]={k,building:t.building,room:t.room,n:0,cats:{},cost:0,last:t.createdAt,ids:[]};
    const h=m[k]; h.n++; h.ids.push(t.id); h.cost+=Number(t.actualCost)||0;
    const c=String(t.category||'-').trim(); h.cats[c]=(h.cats[c]||0)+1;
    if(new Date(t.createdAt)>new Date(h.last)) h.last=t.createdAt;
  });
  const list=Object.values(m).filter(h=>h.n>=OPS.hotCount).sort((a,b)=>b.n-a.n);
  _hsCache={key,list}; return list;
}
function hotspotOf(building, room){ const k=building+'|'+roomKey(room); return hotspots().find(h=>h.k===k)||null; }
function hotspotCard(){
  const list=hotspots();
  return `<div class="card" style="margin-bottom:1rem">
    <div class="ctitle" style="justify-content:space-between;flex-wrap:wrap;gap:8px"><span>🔥 จุดซ่อมซ้ำ — ควรพิจารณาเปลี่ยนใหม่</span>
      <span style="font-size:12px;font-weight:400;color:var(--tx3)">ห้องเดียวกัน ≥ ${OPS.hotCount} ครั้ง ใน ${OPS.hotMonths} เดือน</span></div>
    ${list.length?list.slice(0,10).map(h=>{const b=getBI(h.building);const top=Object.entries(h.cats).sort((a,c)=>c[1]-a[1]);
      const sug=top[0][1]>=OPS.hotCount?`แนะนำ: ประเมินเปลี่ยน<b>${escHtml(top[0][0])}</b>ใหม่ทั้งชุด แทนการซ่อมซ้ำ`:'แนะนำ: สำรวจหน้างานหาสาเหตุร่วม';
      return `<div class="hs-row"><div class="hs-n">${h.n}<small>ครั้ง</small></div><div style="flex:1;min-width:0">
        <div style="font-weight:600">${b.icon} ${escHtml(b.short||b.name)} — ${escHtml(h.room||'-')}</div>
        <div style="font-size:12px;color:var(--tx2)">${top.map(([c,n])=>escHtml(c)+' '+n).join(' · ')}${h.cost?` · ค่าซ่อมรวม ${h.cost.toLocaleString()} บาท`:''} · ล่าสุด ${fdShort(h.last)}</div>
        <div style="font-size:12px;margin-top:2px">${sug}</div></div></div>`;}).join('')
      :'<div style="font-size:13px;color:var(--tx3);padding:6px 0">ยังไม่มีจุดที่ซ่อมซ้ำถึงเกณฑ์ 👍</div>'}
  </div>`;
}

// ─── v15: รายงาน KPI ตามปีงบประมาณ (ต.ค.–ก.ย.) ───
function fyOf(d){ d=new Date(d); return d.getMonth()>=9 ? d.getFullYear()+544 : d.getFullYear()+543; }   // ปีงบ พ.ศ.
let kpiFY=null;
function fyRange(fy){ const y=fy-543; return {start:new Date(y-1,9,1), end:new Date(y,9,1)}; }
function onTimeOf(t){ const d=dueDate(t), c=doneAtOf(t); if(!d||!c) return null; const e=new Date(d); e.setHours(23,59,59,999); return c<=e; }
function kpiCalc(start,end){
  const T=DB.tickets.filter(t=>t.status!=='cancelled');
  const inR=iso=>{ if(!iso) return false; const d=new Date(iso); return d>=start&&d<end; };
  const created=T.filter(t=>inR(t.createdAt));
  const closed=T.filter(t=>t.status==='done'&&inR(doneAtOf(t)));
  const cannot=created.filter(t=>t.status==='cannot').length;
  const judged=closed.map(onTimeOf).filter(x=>x!==null);
  const onTime=judged.filter(Boolean).length;
  const days=closed.filter(t=>t.approvedAt).map(t=>(doneAtOf(t)-new Date(t.approvedAt))/86400000);
  const rated=closed.filter(t=>t.rating>0);
  const doneOfCreated=created.filter(t=>t.status==='done').length;
  return { created:created.length, done:closed.length, cannot,
    donePct: (doneOfCreated+cannot)?Math.round(doneOfCreated/(doneOfCreated+cannot)*100):null,   // ซ่อมสำเร็จ = เสร็จ ÷ (เสร็จ + ซ่อมไม่ได้) ของใบที่ปิดแล้ว
    onTimePct: judged.length?Math.round(onTime/judged.length*100):null, judged:judged.length,
    avgDays: days.length?Math.round(days.reduce((a,b)=>a+b,0)/days.length*10)/10:null,
    rating: rated.length?Math.round(rated.reduce((a,t)=>a+t.rating,0)/rated.length*100)/100:null, rated:rated.length,
    cost: closed.reduce((a,t)=>a+(Number(t.actualCost)||0),0),
    pm: created.filter(t=>t.source==='PM').length,
    carbon: closed.reduce((a,t)=>a+(carbonOf(t).total||0),0), created_list:created };
}
function kpiData(fy){
  const {start,end}=fyRange(fy);
  const q=[0,1,2,3].map(i=>{ const s2=new Date(start); s2.setMonth(s2.getMonth()+i*3); const e=new Date(s2); e.setMonth(e.getMonth()+3); return kpiCalc(s2,e); });
  return { fy, start, end, q, y:kpiCalc(start,end) };
}
function kpiYears(){ const ys=new Set([fyOf(new Date())]); DB.tickets.forEach(t=>ys.add(fyOf(t.createdAt))); return [...ys].sort((a,b)=>b-a); }
function kpiCls(v2,target,lowerBetter){ if(v2==null) return ''; return (lowerBetter? v2<=target : v2>=target)?'pass':'fail'; }
function kpiCard(){
  const fy=kpiFY||fyOf(new Date()), K=kpiData(fy), y=K.y, o=OPS;
  const fmt=(v2,u)=>v2==null?'—':(v2+(u||''));
  const QL=['Q1 ต.ค.–ธ.ค.','Q2 ม.ค.–มี.ค.','Q3 เม.ย.–มิ.ย.','Q4 ก.ค.–ก.ย.'];
  const row=(lbl,fn,u)=>`<tr><td>${lbl}</td>${K.q.map(q=>`<td>${fmt(fn(q),u)}</td>`).join('')}<td><b>${fmt(fn(y),u)}</b></td></tr>`;
  return `<div class="card" style="margin-bottom:1rem">
    <div class="ctitle" style="justify-content:space-between;flex-wrap:wrap;gap:8px"><span>📑 รายงาน KPI ปีงบประมาณ</span>
      <span style="display:flex;gap:6px;align-items:center"><select onchange="kpiFY=+this.value;rp()" style="width:auto;padding:4px 8px">${kpiYears().map(x=>`<option value="${x}" ${x===fy?'selected':''}>ปีงบ ${x}</option>`).join('')}</select>
      <button class="btn btn-sm btn-p" onclick="printKPI(${fy})"><i class="ti ti-printer"></i> พิมพ์ / PDF</button>
      ${cu?`<input type="month" id="mpdfM" value="${prevYm()}" max="${prevYm(0)}" style="width:auto;padding:3px 6px" title="เลือกเดือน"><button class="btn btn-sm" onclick="downloadMonthlyPdf(document.getElementById('mpdfM').value)" title="รายงานสรุปรายเดือน (ไฟล์เดียวกับที่แนบอีเมลวันที่ 1)"><i class="ti ti-file-type-pdf"></i> สรุปรายเดือน PDF</button>`:''}</span></div>
    <div style="font-size:12px;color:var(--tx3)">1 ต.ค. ${fy-1} – 30 ก.ย. ${fy} · นับเฉพาะใบที่ไม่ถูกยกเลิก${dfLabel(false)?` · <b style="color:var(--tx2)">ตัวกรอง: ${escHtml(dfLabel(false))}</b> (ตัวกรองช่วงเวลาไม่ใช้กับส่วนนี้ — ใช้ปีงบด้านขวาแทน)`:''}</div>
    <div class="kpi-grid">
      <div class="kpi-box ${kpiCls(y.onTimePct,o.kpiOnTime)}"><div class="kl">เสร็จทันกำหนด</div><div class="kv">${fmt(y.onTimePct,'%')}</div><div class="kt">เป้า ≥ ${o.kpiOnTime}%</div></div>
      <div class="kpi-box ${kpiCls(y.rating,o.kpiRating)}"><div class="kl">ความพึงพอใจ</div><div class="kv">${fmt(y.rating)}</div><div class="kt">เป้า ≥ ${o.kpiRating} / 5</div></div>
      <div class="kpi-box ${kpiCls(y.donePct,o.kpiDone)}"><div class="kl">ซ่อมสำเร็จ</div><div class="kv">${fmt(y.donePct,'%')}</div><div class="kt">เป้า ≥ ${o.kpiDone}%</div></div>
      <div class="kpi-box"><div class="kl">เวลาซ่อมเฉลี่ย</div><div class="kv">${fmt(y.avgDays)}</div><div class="kt">วัน (อนุมัติ→เสร็จ)</div></div>
    </div>
    <div style="overflow-x:auto"><table class="tbl-kpi" style="min-width:560px">
      <thead><tr><th>ตัวชี้วัด</th>${QL.map(x=>`<th>${x}</th>`).join('')}<th>ทั้งปี</th></tr></thead>
      <tbody>
        ${row('ใบแจ้งซ่อมเข้า (ใบ)',q=>q.created)}
        ${row('ซ่อมเสร็จ (ใบ)',q=>q.done)}
        ${row('ซ่อมสำเร็จ (%)',q=>q.donePct,'%')}
        ${row('เสร็จทันกำหนด (%)',q=>q.onTimePct,'%')}
        ${row('เวลาซ่อมเฉลี่ย (วัน)',q=>q.avgDays)}
        ${row('ความพึงพอใจเฉลี่ย (เต็ม 5)',q=>q.rating)}
        ${row('จำนวนผู้ประเมิน (ใบ)',q=>q.rated)}
        ${row('ใบ PM (ใบ)',q=>q.pm)}
        ${row('ค่าใช้จ่ายจริง (บาท)',q=>q.cost.toLocaleString())}
        ${row('คาร์บอนที่ประหยัด (kgCO2e)',q=>fmtKg(q.carbon))}
      </tbody></table></div>
  </div>`;
}
function printKPI(fy){ return dfWith(()=>printKPIInner(fy)); }
function printKPIInner(fy){
  const K=kpiData(fy), y=K.y, o=OPS;
  const fl=dfLabel(false);
  const fmt=(v2,u)=>v2==null?'—':(v2+(u||''));
  const QL=['ไตรมาส 1<br>ต.ค.–ธ.ค.','ไตรมาส 2<br>ม.ค.–มี.ค.','ไตรมาส 3<br>เม.ย.–มิ.ย.','ไตรมาส 4<br>ก.ค.–ก.ย.'];
  const row=(lbl,fn,u)=>`<tr><td class="l">${lbl}</td>${K.q.map(q=>`<td>${fmt(fn(q),u)}</td>`).join('')}<td><b>${fmt(fn(y),u)}</b></td></tr>`;
  const pass=(v2,t)=>v2==null?'—':(v2>=t?'✔ ผ่าน':'✘ ไม่ผ่าน');
  const cats={}, blds={};
  y.created_list.forEach(t=>{ const c=String(t.category||'-').trim(); cats[c]=(cats[c]||0)+1; const b=getBI(t.building).name; blds[b]=(blds[b]||0)+1; });
  const top=(m)=>Object.entries(m).sort((a,b)=>b[1]-a[1]).map(([k,n])=>`<tr><td class="l">${escHtml(k)}</td><td>${n}</td><td>${y.created?Math.round(n/y.created*100):0}%</td></tr>`).join('');
  const hs=hotspots();
  const d=new Date().toLocaleDateString('th-TH',{year:'numeric',month:'long',day:'numeric'});
  const w=window.open('','_blank'); if(!w){ showToast('เบราว์เซอร์บล็อกหน้าต่างใหม่ — กรุณาอนุญาต pop-up'); return; }
  w.document.write(`<html><head><meta charset="utf-8"><title>รายงาน KPI ปีงบประมาณ ${fy}</title>
  <style>@page{size:A4;margin:14mm} body{font-family:'Sarabun','TH SarabunPSK',sans-serif;font-size:13px;color:#111}
  h1{font-size:19px;margin:0} h2{font-size:15px;margin:18px 0 6px;border-bottom:2px solid #1d4632;padding-bottom:3px}
  .sub{color:#555;margin:2px 0 10px} table{width:100%;border-collapse:collapse;margin-bottom:6px}
  th,td{border:.6px solid #999;padding:5px 7px;text-align:center} th{background:#1d4632;color:#fff;font-weight:600}
  td.l{text-align:left} tr:nth-child(even) td{background:#f5f3ec} .sign{margin-top:40px;display:flex;justify-content:space-around;text-align:center}</style></head><body>
  <h1>รายงานผลการดำเนินงานซ่อมบำรุง ปีงบประมาณ พ.ศ. ${fy}</h1>
  <div class="sub">คณะการแพทย์แผนไทย มหาวิทยาลัยสงขลานครินทร์ · ช่วง 1 ตุลาคม ${fy-1} – 30 กันยายน ${fy} · พิมพ์เมื่อ ${d}</div>${fl?`<div class="sub"><b>ตัวกรอง:</b> ${escHtml(fl)}</div>`:''}
  <h2>1. ตัวชี้วัดหลักเทียบเป้าหมาย</h2>
  <table><thead><tr><th>ตัวชี้วัด</th><th>เป้าหมาย</th><th>ผลทั้งปี</th><th>ผลการประเมิน</th></tr></thead><tbody>
    <tr><td class="l">ร้อยละงานซ่อมที่เสร็จทันกำหนด</td><td>≥ ${o.kpiOnTime}%</td><td>${fmt(y.onTimePct,'%')}</td><td>${pass(y.onTimePct,o.kpiOnTime)}</td></tr>
    <tr><td class="l">ความพึงพอใจของผู้รับบริการ (เต็ม 5)</td><td>≥ ${o.kpiRating}</td><td>${fmt(y.rating)}</td><td>${pass(y.rating,o.kpiRating)}</td></tr>
    <tr><td class="l">ร้อยละงานซ่อมที่ดำเนินการสำเร็จ</td><td>≥ ${o.kpiDone}%</td><td>${fmt(y.donePct,'%')}</td><td>${pass(y.donePct,o.kpiDone)}</td></tr>
  </tbody></table>
  <h2>2. ผลรายไตรมาส</h2>
  <table><thead><tr><th>ตัวชี้วัด</th>${QL.map(x=>`<th>${x}</th>`).join('')}<th>ทั้งปี</th></tr></thead><tbody>
    ${row('ใบแจ้งซ่อมเข้า (ใบ)',q=>q.created)}${row('ซ่อมเสร็จ (ใบ)',q=>q.done)}${row('ซ่อมไม่ได้ (ใบ)',q=>q.cannot)}
    ${row('ซ่อมสำเร็จ (%)',q=>q.donePct,'%')}${row('เสร็จทันกำหนด (%)',q=>q.onTimePct,'%')}${row('เวลาซ่อมเฉลี่ย (วัน)',q=>q.avgDays)}
    ${row('ความพึงพอใจเฉลี่ย',q=>q.rating)}${row('จำนวนผู้ประเมิน (ใบ)',q=>q.rated)}${row('ใบ PM (ใบ)',q=>q.pm)}
    ${row('ค่าใช้จ่ายจริง (บาท)',q=>q.cost.toLocaleString())}${row('คาร์บอนที่ประหยัด (kgCO2e)',q=>fmtKg(q.carbon))}
  </tbody></table>
  <h2>3. จำแนกตามประเภทงาน</h2><table><thead><tr><th>ประเภทงาน</th><th>จำนวน (ใบ)</th><th>สัดส่วน</th></tr></thead><tbody>${top(cats)||'<tr><td colspan="3">—</td></tr>'}</tbody></table>
  <h2>4. จำแนกตามอาคาร</h2><table><thead><tr><th>อาคาร</th><th>จำนวน (ใบ)</th><th>สัดส่วน</th></tr></thead><tbody>${top(blds)||'<tr><td colspan="3">—</td></tr>'}</tbody></table>
  <h2>5. จุดซ่อมซ้ำ (≥ ${o.hotCount} ครั้งใน ${o.hotMonths} เดือนล่าสุด)</h2>
  <table><thead><tr><th>สถานที่</th><th>จำนวนครั้ง</th><th>ประเภท</th><th>ค่าซ่อมรวม (บาท)</th></tr></thead><tbody>
  ${hs.length?hs.map(h=>`<tr><td class="l">${escHtml(getBI(h.building).name)} — ${escHtml(h.room||'')}</td><td>${h.n}</td><td class="l">${Object.entries(h.cats).map(([c,n])=>escHtml(c)+' '+n).join(', ')}</td><td>${h.cost.toLocaleString()}</td></tr>`).join(''):'<tr><td colspan="4">ไม่มี</td></tr>'}</tbody></table>
  <div style="font-size:12px;color:#666;margin-top:8px">หมายเหตุ: "ซ่อมสำเร็จ" = ใบที่เสร็จ ÷ (เสร็จ + ซ่อมไม่ได้) ไม่นับใบที่ยังดำเนินการ · "ทันกำหนด" = เสร็จภายในวันคาดว่าเสร็จ (วันอนุมัติ + SLA วันทำการ + วันที่พักงาน หรือวันที่วิศวกรกำหนดเอง) · เวลาซ่อมเฉลี่ยนับจากวันอนุมัติถึงวันเสร็จ</div>
  <div class="sign"><div>ลงชื่อ ...................................<br>( ................................... )<br>ผู้จัดทำรายงาน</div><div>ลงชื่อ ...................................<br>( ................................... )<br>ผู้บริหาร</div></div>
  <script>window.onload=function(){window.print();}<\/script></body></html>`);
  w.document.close();
}
function lowStockCard(){
  if(!FLAGS.inventory) return '';
  const low=(INVENTORY||[]).filter(it=>!it.hidden&&invLow(it));
  if(!low.length) return '';
  return `<div class="card" style="margin-bottom:1rem;border-left:4px solid #e0a94b">
    <div class="ctitle">📦 อุปกรณ์ใกล้หมด ควรสั่งซื้อ (${low.length})</div>
    ${low.map(it=>`<div style="display:flex;justify-content:space-between;gap:8px;font-size:13px;padding:5px 0;border-bottom:1px dashed var(--bd)"><span>${escHtml(it.name)}</span><span>เหลือ <b style="color:var(--red-tx)">${it.stock}</b> ${escHtml(it.unit)} <span style="color:var(--tx3)">/ จุดสั่งซื้อ ${it.min}</span></span></div>`).join('')}
    ${cu&&cu.isEngineer?`<button class="btn btn-sm" style="margin-top:8px" onclick="gp('config')"><i class="ti ti-package"></i> ไปจัดการคลัง</button>`:''}
  </div>`;
}
function invLow(it){ return Number(it.min)>0 && Number(it.stock)<=Number(it.min); }

