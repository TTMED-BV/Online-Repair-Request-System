// ระบบแจ้งซ่อมออนไลน์ — workflow.js (v17.4) : หน้าอนุมัติ · หน้าจัดการงาน
// โหลดตามลำดับใน index.html (classic script ใช้ตัวแปรร่วมกัน)
// ════════════════════════ PAGE: APPROVE ════════════════════════
function pgApprove() {
  if (!cu) return `<div class="empty">กรุณาเข้าสู่ระบบ</div>`;
  const showTicket = true, showPurchase = true;   // v15.11: ทุกบทบาทเห็นคิว — ปุ่มขึ้นตามสิทธิ์
  const canT = can('approve_ticket'), canP = can('approve_purchase');
  const pending=(showTicket?DB.tickets.filter(t=>t.status==='pending_approval'&&(!canT||canApproveCat(t.category))):[]).sort((a,b)=>{
    if(a.priority==='high'&&b.priority!=='high') return -1;
    if(b.priority==='high'&&a.priority!=='high') return 1;
    return new Date(a.createdAt)-new Date(b.createdAt);
  });
  const purchaseQ=(showPurchase?DB.tickets.filter(t=>t.status==='pending_purchase'):[]).sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt));
  const purchaseCard = showPurchase ? `
    <div style="font-size:14px;font-weight:700;margin:.25rem 0 .6rem;display:flex;align-items:center;gap:6px">💰 รออนุมัติจัดซื้อ (บริหาร) <span class="badge b-amber">${purchaseQ.length}</span></div>
    ${!purchaseQ.length?`<div class="notice n-info" style="margin-bottom:1rem">ไม่มีงานรออนุมัติจัดซื้อ</div>`:`<div style="display:flex;flex-direction:column;gap:.6rem;margin-bottom:1.5rem">${purchaseQ.map(t=>{
      const b=getBI(t.building);
      return `<div class="card card-sm" style="border-left:3px solid #e0a94b">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:.5rem">
          <div style="flex:1">
            <div style="margin-bottom:3px"><span class="mono">${t.id}</span></div>
            <div style="font-weight:600">${b.icon} ${escHtml(b.name)} — ${escHtml(t.room)}</div>
            <div style="font-size:12px;color:var(--tx2)">${catChip(t.category)} · ประมาณการ <b>${(t.approvedBudget||t.estimatedCost||0).toLocaleString()}</b> บาท</div>
            <div style="font-size:12px;color:var(--tx2);margin-top:2px">ผู้รับผิดชอบ: ${assigneeChips(t.assignees)}</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:5px">
            ${canP?`<button class="btn btn-sm btn-green" onclick="doApprovePurchase('${t.id}')">✓ อนุมัติจัดซื้อ</button>`:''}
            <button class="btn btn-sm" onclick="openDet('${t.id}')">ดูรายละเอียด</button>
          </div>
        </div>
      </div>`;
    }).join('')}</div>`}` : '';
  return `<div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem">
      <div><div style="font-size:16px;font-weight:700">คิวอนุมัติ</div>
      <div style="font-size:12px;color:var(--tx3)">${showTicket?('ใบแจ้งซ่อม '+pending.length):''}${showTicket&&showPurchase?' · ':''}${showPurchase?('จัดซื้อ '+purchaseQ.length):''}</div></div>
      <button class="btn btn-sm" onclick="loadAll().then(rp)">🔄 รีเฟรช</button>
    </div>
    ${!canT&&!canP?viewOnlyNote('อนุมัติ'):''}
    ${purchaseCard}
    ${showTicket?`<div style="font-size:14px;font-weight:700;margin:.25rem 0 .6rem;display:flex;align-items:center;gap:6px">📝 รออนุมัติใบแจ้งซ่อม <span class="badge b-amber">${pending.length}</span></div>`:''}
    ${showTicket&&!pending.length?`<div class="empty" style="padding:2rem"><div class="empty-ic" style="color:var(--green)"><i class="ti ti-circle-check"></i></div><div class="empty-ttl">เคลียร์คิวหมดแล้ว</div><div class="empty-sub">ไม่มีใบแจ้งซ่อมรออนุมัติในขณะนี้</div></div>`:''}
    <div style="display:flex;flex-direction:column;gap:.75rem">
    ${pending.map(t=>{
      const b=getBI(t.building),pCls=t.priority==='high'?'b-red':t.priority==='med'?'b-amber':'b-gray';
      const pLbl={high:'เร่งด่วน',med:'ปานกลาง',low:'ปกติ'}[t.priority];
      const suggested=suggestAssignees(t.category);
      return `<div class="card card-sm" style="${t.priority==='high'?'border-left:3px solid #e35b5b':'border-left:3px solid #3ba7d6'}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:.5rem">
          <div style="flex:1">
            <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:5px">
              <span class="mono">${t.id}</span><span class="badge ${pCls}">${pLbl}</span>
              ${t._local?'<span class="badge b-red nodot" style="cursor:pointer" onclick="openSyncPanel()">⚠️ ยังไม่ถึงเซิร์ฟเวอร์ — กดดู</span>':''}
            </div>
            <div style="font-weight:600;margin-bottom:3px">${b.icon} ${escHtml(b.name)} — ${escHtml(t.room)}</div>
            <div style="font-size:12px;color:var(--tx2)">${catChip(t.category)} · ผู้แจ้ง: ${escHtml(t.name)} (${escHtml(t.dept)})</div>
            <div style="font-size:12px;color:var(--tx2);margin:2px 0">${escHtml(String(t.desc||'').substring(0,90))}${String(t.desc||'').length>90?'...':''}</div>
            ${t.estimatedCost?`<div style="font-size:12px">ประมาณการ: <b>${t.estimatedCost.toLocaleString()} บาท</b></div>`:''}
            <div style="font-size:12px;background:var(--teal-bg);color:var(--teal-tx);padding:4px 8px;border-radius:6px;margin-top:6px;display:inline-block">
              ระบบแนะนำ: <b>${suggested.map(u=>getUserName(u).split(' ')[0]).join(', ')}</b>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:5px">
            ${canT?`<button class="btn btn-sm btn-green" onclick="openAssign('${t.id}')">✓ อนุมัติ + มอบหมาย</button>`:''}
            <button class="btn btn-sm" onclick="openDet('${t.id}')">ดูรายละเอียด</button>
            ${canT?`<button class="btn btn-sm btn-red" onclick="doReject('${t.id}')">✕ ส่งกลับ</button>`:''}
          </div>
        </div>
      </div>`;
    }).join('')}
    </div>
  </div>`;
}

function openAssign(id) {
  const t=DB.tickets.find(t=>t.id===id); if(!t) return;
  const suggested=suggestAssignees(t.category);
  const active=DB.tickets.filter(x=>!CLOSED_STATUS.includes(x.status));
  const techList=assignableEntries().map(([u,usr])=>{
    const wl=active.filter(x=>(x.assignees||[]).includes(u)).length;
    const isSugg=suggested.indexOf(u);
    const sugg=isSugg===0?'⭐ แนะนำ':isSugg===1?'✓ รอง':'';
    return `<div class="cb-item ${(t.assignees||[]).includes(u)?'selected':''}" onclick="toggleCb(this,'${u}')">
      <input type="checkbox" id="cb_${u}" ${(t.assignees||[]).includes(u)?'checked':''} style="pointer-events:none">
      <div class="tech-av" style="background:${usr.color}22;color:${usr.color};width:28px;height:28px;font-size:12px">${usr.initials}</div>
      <div class="cb-label"><b>${escHtml(usr.name)}</b>${sugg?` <span class="badge b-teal" style="font-size:12px">${sugg}</span>`:''}</div>
      <div class="cb-sub">งานคงค้าง: ${wl}</div>
    </div>`;
  }).join('');
  document.getElementById('assignContent').innerHTML=`
    <div class="modal-title">อนุมัติและมอบหมายงาน <button class="mc" onclick="cm('assignMd')">✕</button></div>
    <div style="background:var(--surf2);border-radius:8px;padding:.75rem;margin-bottom:1rem;font-size:13px">
      <b>${escHtml(getBI(t.building).name)}</b> — ${escHtml(t.room)}<br><span style="color:var(--tx2)">${escHtml(t.category)}</span>
    </div>
    <div class="ff">
      <label>เลือกผู้รับผิดชอบ (เลือกได้ 1–3 คน ทำงานพร้อมกันได้)</label>
      <div class="checkbox-group" id="assignees-group">${techList}</div>
    </div>
    <div class="ff"><label>หมายเหตุจากผู้อนุมัติ</label><textarea id="asNote" placeholder="คำแนะนำสำหรับช่าง..."></textarea></div>
    <div class="ff"><label>งบประมาณที่อนุมัติ (บาท)</label><input id="asBudget" type="number" value="${t.estimatedCost||0}"></div>
    <div class="ff"><label>วันคาดว่าเสร็จ (ไม่บังคับ — เว้นว่าง = ตาม SLA ${getSLA(t.category)} วันทำการ)</label><input id="asDue" type="date" value="${t.dueOverride||''}"></div>
    <label class="cb-item" style="cursor:pointer"><input type="checkbox" id="asNeedBuy" ${t.needsPurchase?'checked':''} style="width:auto"> <span class="cb-label">งานนี้ต้องจัดซื้อ/ใช้เงิน (ต้องให้บริหารอนุมัติก่อนจัดซื้อ)</span></label>
    <button class="btn btn-p" style="width:100%;margin-top:.75rem" onclick="confirmAssign('${id}')">ยืนยันอนุมัติและมอบหมาย</button>`;
  document.getElementById('assignMd').style.display='flex';
}

function toggleCb(el, u) {
  el.classList.toggle('selected');
  const cb=document.getElementById('cb_'+u);
  if(cb) cb.checked=!cb.checked;
}

async function confirmAssign(id) {
  const selected=[...document.querySelectorAll('#assignees-group .cb-item.selected')].map(el=>{
    const cb=el.querySelector('input[type=checkbox]'); return cb?.id.replace('cb_','');
  }).filter(Boolean);
  if(!selected.length){alert('กรุณาเลือกผู้รับผิดชอบอย่างน้อย 1 คน');return;}
  const note=v('asNote'),budget=parseFloat(document.getElementById('asBudget').value)||0;
  const needBuy=!!document.getElementById('asNeedBuy')?.checked;
  const due=(document.getElementById('asDue')?.value||'').trim();
  const t=DB.tickets.find(t=>t.id===id);if(!t)return;
  t.status='assigned'; t.assignees=selected; t.approvedAt=now(); t.approvedBy=cu.username; t.approvedBudget=budget; t.needsPurchase=needBuy;
  if(due) t.dueOverride=due;
  const entry={status:'assigned',date:now(),note:`อนุมัติโดย ${cu.name} → มอบหมาย: ${selected.map(getUserName).join(', ')}${needBuy?' (ต้องจัดซื้อ)':''}${due?' · กำหนดเสร็จ '+fdShort(parseYmd(due)):''}${note?' — '+note:''}`,by:cu.name};
  if(!t.history)t.history=[];
  t.history.push(entry);
  const f={status:'assigned',assignees:selected,approvedAt:t.approvedAt,approvedBy:t.approvedBy,approvedBudget:budget,needsPurchase:needBuy};
  if(due) f.dueOverride=due;
  await syncUpdate(id,f,entry);
  hideLoader(); cm('assignMd'); updApvCnt(); rp();
  showToast(`มอบหมายงานให้ ${selected.map(u=>getUserName(u).split(' ')[0]).join(' + ')} แล้ว`);
}

async function doReject(id) {
  const reason=prompt('เหตุผลที่ส่งกลับ:'); if(reason===null) return;
  const t=DB.tickets.find(t=>t.id===id);if(!t)return;
  t.status='cannot';
  const entry={status:'cannot',date:now(),note:'ส่งกลับ: '+reason,by:cu.name};
  if(!t.history)t.history=[];
  t.history.push(entry);
  await syncUpdate(id,{status:'cannot'},entry);
  hideLoader(); updApvCnt(); rp();
}

// ข้อ 6: บริหารอนุมัติจัดซื้อ → ปลดล็อกให้เริ่มจัดซื้อได้
async function doApprovePurchase(id){
  const note=prompt('อนุมัติจัดซื้อ (ใส่หมายเหตุได้ หรือเว้นว่าง):'); if(note===null) return;
  showLoader('กำลังอนุมัติจัดซื้อ...');
  try{
    await api('approvePurchase',{id,note,token:AUTH_TOKEN});
    const t=DB.tickets.find(x=>x.id===id);
    if(t){ t.status='purchase'; t.purchaseApprovedBy=cu.username; t.purchaseApprovedAt=now();
      (t.history=t.history||[]).push({status:'purchase',date:now(),note:'อนุมัติจัดซื้อโดย '+cu.name+(note?' — '+note:''),by:cu.name}); }
    hideLoader(); updApvCnt(); rp(); showToast('อนุมัติจัดซื้อแล้ว — เริ่มจัดซื้อได้');
  }catch(e){ hideLoader(); showToast('ไม่สำเร็จ: '+e.message,3000); }
}

// ════════════════════════ PAGE: MANAGE ════════════════════════
// v12: ฟิลเตอร์หน้าจัดการงาน (จำไว้ในเครื่อง)
let MF=(()=>{ try{ return JSON.parse(localStorage.getItem('vr3_mf')||'{}'); }catch(e){ return {}; } })();
function mfSave(){ try{ localStorage.setItem('vr3_mf',JSON.stringify(MF)); }catch(e){} }
function mfSet(k,val){ MF[k]=val; if(k==='bld') MF.floor=''; mfSave(); if(k==='bld'){ rp(); return; } renderManageList(); }
function mfClear(){ MF={}; mfSave(); rp(); }
// ชั้นของใบงาน: ใช้ช่อง floor ถ้ามี ไม่งั้นดูจากข้อความห้อง "ชั้น X — ..."
function ticketFloor(t){ if(t.floor) return t.floor; const p=String(t.room||'').split(' — ')[0]; return FLOORS.some(f=>f.floor===p)?p:''; }
function manageFiltered(){
  let arr=DB.tickets.filter(t=>t.status!=='cancelled').slice().sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  const q=(MF.q||'').toLowerCase().trim();
  if(MF.who==='me') arr=arr.filter(t=>(t.assignees||[]).includes(cu.username));
  else if(MF.who==='none') arr=arr.filter(t=>!(t.assignees||[]).length);
  else if(MF.who) arr=arr.filter(t=>(t.assignees||[]).includes(MF.who));
  if(MF.st) arr=arr.filter(t=>t.status===MF.st);
  if(MF.over) arr=arr.filter(t=>isOverSLA(t));
  if(MF.bld) arr=arr.filter(t=>t.building===MF.bld);
  if(MF.floor) arr=arr.filter(t=>ticketFloor(t)===MF.floor);
  if(MF.cat) arr=arr.filter(t=>t.category===MF.cat);
  if(MF.pri) arr=arr.filter(t=>t.priority===MF.pri);
  if(MF.from){ const f=parseYmd(MF.from); arr=arr.filter(t=>new Date(t.createdAt)>=f); }
  if(MF.to){ const e=parseYmd(MF.to); e.setDate(e.getDate()+1); arr=arr.filter(t=>new Date(t.createdAt)<e); }
  if(q) arr=arr.filter(t=>[t.id,t.name,t.room,t.desc,t.dept].some(x=>String(x||'').toLowerCase().includes(q)));
  return arr;
}
function manageCard(t){
  const s=getSI(t.status),b=getBI(t.building),el=effElapsed(t),pd=pausedDays(t),sla=getSLA(t.category),over=isOverSLA(t);
  const di=dueInfo(t);
  return `<div class="card card-sm" style="${over?'border-left:3px solid #e35b5b':''}">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:.5rem">
      <div style="flex:1;min-width:0">
        <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:3px">
          <span class="mono">${t.id}</span>
          <span class="badge ${s.cls}">${s.label}</span>
          ${t.priority==='high'?'<span class="badge b-red nodot">เร่งด่วน</span>':''}
          ${t.source==='PM'?'<span class="badge b-teal nodot">🛠 PM</span>':''}
          ${over?'<span class="badge b-red">เกิน SLA</span>':''}
        </div>
        <div style="font-weight:600;font-size:13px">${b.icon} ${b.name} — ${escHtml(t.room)}</div>
        <div style="font-size:12px;color:var(--tx2)">${catChip(t.category)} · ${escHtml(t.name)} | นับ SLA ${el} วัน / ${sla} วัน${pd>0?` <span style="color:var(--purple-tx)">(พัก ${pd} วัน)</span>`:''}</div>
        ${timelineStrip(t)}
        <div style="margin-top:4px">${assigneeChips(t.assignees)}</div>
      </div>
      <div style="display:flex;gap:5px">
        <button class="btn btn-sm" onclick="openDet('${t.id}')">ดู</button>
        ${CLOSED_STATUS.includes(t.status)||!can('manage_tickets')?'':`<button class="btn btn-sm btn-p" onclick="openStatusUpdate('${t.id}')">อัปเดต</button>`}
      </div>
    </div>
  </div>`;
}
function renderManageList(){
  const box=document.getElementById('mgList'); if(!box) return;
  const all=manageFiltered();
  const active=all.filter(t=>!CLOSED_STATUS.includes(t.status)&&t.status!=='pending_approval');
  const done=all.filter(t=>CLOSED_STATUS.includes(t.status));
  const total=DB.tickets.filter(t=>!['cancelled','pending_approval'].includes(t.status)).length;
  const nOn=['who','st','over','bld','floor','cat','pri','from','to','q'].filter(k=>MF[k]).length;
  const cnt=document.getElementById('mgCount');
  if(cnt) cnt.textContent = nOn ? `พบ ${active.length+done.length} จาก ${total} รายการ · ใช้ตัวกรอง ${nOn} อย่าง` : `ทั้งหมด ${total} รายการ`;
  box.innerHTML=`
    <div style="font-size:13px;font-weight:600;margin-bottom:.75rem">กำลังดำเนินการ (${active.length})</div>
    <div style="display:flex;flex-direction:column;gap:.5rem;margin-bottom:1.5rem">
      ${active.length?active.map(manageCard).join(''):`<div class="empty" style="padding:2rem"><div class="empty-ic"><i class="ti ti-checklist"></i></div><div class="empty-ttl">ไม่มีงานที่ตรงกับตัวกรอง</div><div class="empty-sub">ลองล้างตัวกรอง หรือเลือกเงื่อนไขอื่น</div></div>`}
    </div>
    <div style="font-size:13px;font-weight:600;margin-bottom:.75rem;color:var(--tx2)">งานสิ้นสุด (${done.length})${done.length>20?' — แสดง 20 รายการล่าสุด':''}</div>
    <div style="display:flex;flex-direction:column;gap:.5rem;opacity:.8">${done.slice(0,20).map(manageCard).join('')}</div>`;
}
function pgManage() {
  if (!cu) return `<div class="empty">กรุณาเข้าสู่ระบบ</div>`;
  if(MF.who && MF.who!=='me' && MF.who!=='none' && !USERS[MF.who]) MF.who='';
  const sel=(k,val)=>MF[k]===val?'selected':'';
  const fls=MF.bld?floorsOf(MF.bld):Array.from(new Set(FLOORS.map(f=>f.floor)));
  setTimeout(renderManageList,0);
  return `<div>
    ${can('manage_tickets')?'':viewOnlyNote('อัปเดตงาน')}
    <div class="card" style="margin-bottom:1rem">
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <input placeholder="🔍 ค้นหารหัส / ผู้แจ้ง / ห้อง / รายละเอียด" value="${escAttr(MF.q||'')}" oninput="mfSet('q',this.value)" style="flex:1;min-width:200px">
        <button class="btn btn-sm" onclick="loadAll().then(rp)">🔄 รีเฟรช</button>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px">
        <select style="width:auto" onchange="mfSet('who',this.value)">
          <option value="">👷 ทุกผู้รับผิดชอบ</option>
          <option value="me" ${sel('who','me')}>⭐ งานที่ฉันรับผิดชอบ</option>
          <option value="none" ${sel('who','none')}>ยังไม่มอบหมาย</option>
          ${assignableEntries().map(([u,usr])=>`<option value="${u}" ${sel('who',u)}>${escHtml(usr.name)}</option>`).join('')}
        </select>
        <select style="width:auto" onchange="mfSet('st',this.value)">
          <option value="">📋 ทุกสถานะ</option>${STATUSES.filter(x=>!['pending_approval','cancelled'].includes(x.id)).map(x=>`<option value="${x.id}" ${sel('st',x.id)}>${x.label}</option>`).join('')}
        </select>
        <label style="font-size:12.5px;display:inline-flex;align-items:center;gap:5px;cursor:pointer"><input type="checkbox" style="width:auto" ${MF.over?'checked':''} onchange="mfSet('over',this.checked)"> เฉพาะเกิน SLA</label>
        <select style="width:auto" onchange="mfSet('bld',this.value)">
          <option value="">🏢 ทุกอาคาร</option>${BUILDINGS.map(b=>`<option value="${b.id}" ${sel('bld',b.id)}>${b.icon} ${b.short}</option>`).join('')}
        </select>
        <select style="width:auto" onchange="mfSet('floor',this.value)">
          <option value="">ทุกชั้น</option>${fls.map(f=>`<option value="${escAttr(f)}" ${sel('floor',f)}>${escHtml(f)}</option>`).join('')}
        </select>
        <select style="width:auto" onchange="mfSet('cat',this.value)">
          <option value="">🔧 ทุกประเภท</option>${CATS.map(c=>`<option value="${escAttr(c)}" ${sel('cat',c)}>${c}</option>`).join('')}
        </select>
        <select style="width:auto" onchange="mfSet('pri',this.value)">
          <option value="">⚡ ทุกความเร่งด่วน</option>
          <option value="high" ${sel('pri','high')}>🔴 เร่งด่วน</option>
          <option value="med" ${sel('pri','med')}>🟡 ปานกลาง</option>
          <option value="low" ${sel('pri','low')}>🟢 ปกติ</option>
        </select>
        <span style="font-size:12.5px;display:inline-flex;align-items:center;gap:4px">แจ้งตั้งแต่ <input type="date" style="width:auto" value="${MF.from||''}" onchange="mfSet('from',this.value)"> ถึง <input type="date" style="width:auto" value="${MF.to||''}" onchange="mfSet('to',this.value)"></span>
        <button class="btn btn-sm" onclick="mfClear()" style="margin-left:auto">✕ ล้างตัวกรอง</button>
      </div>
      <div id="mgCount" style="font-size:12px;color:var(--tx3);margin-top:8px"></div>
    </div>
    <div id="mgList"></div>
  </div>`;
}

function openStatusUpdate(id) {
  const t=DB.tickets.find(t=>t.id===id);if(!t)return;
  const avail=STATUSES.filter(s=>!['pending_approval'].includes(s.id));
  document.getElementById('statusContent').innerHTML=`
    <div class="modal-title">อัปเดตสถานะ <button class="mc" onclick="cm('statusMd')">✕</button></div>
    <div style="background:var(--surf2);padding:.75rem;border-radius:8px;margin-bottom:1rem;font-size:13px">
      <b>${escHtml(getBI(t.building).name)}</b> — ${escHtml(t.room)}<br>${escHtml(t.category)}
    </div>
    ${t.needsPurchase?`<div class="notice ${t.purchaseApprovedBy?'n-green':'n-warn'}" style="margin-bottom:1rem;font-size:12px"><i class="ti ti-shopping-cart ni"></i><div>${t.purchaseApprovedBy?'บริหารอนุมัติจัดซื้อแล้ว — เริ่มจัดซื้อได้':'งานนี้ต้องจัดซื้อ — ต้องให้บริหารอนุมัติก่อน (เลือก “รออนุมัติจัดซื้อ” เพื่อส่งให้บริหาร)'}</div></div>`:''}
    <div class="ff"><label>สถานะใหม่</label>
      <select id="updSt" onchange="document.getElementById('carbonFlagsBox').style.display=this.value==='done'?'block':'none';document.getElementById('buyBox').style.display=['pending_purchase','purchase'].includes(this.value)?'block':'none'">${avail.map(s=>`<option value="${s.id}" ${t.status===s.id?'selected':''}>${s.label}</option>`).join('')}</select>
    </div>
    <div id="buyBox" style="display:${['pending_purchase','purchase'].includes(t.status)?'block':'none'};background:var(--amber-bg);border-radius:8px;padding:.6rem .75rem;margin-bottom:.9rem">
      <div class="ff" style="margin:0"><label>💰 งบประมาณจัดซื้อ (บาท)<span class="req">*</span></label><input id="updBudget" type="number" min="0" value="${t.approvedBudget||t.estimatedCost||''}" placeholder="ราคาประเมินจากช่าง/ใบเสนอราคา">
      <div style="font-size:12px;color:var(--tx2);margin-top:3px">ใช้เสนอบริหารอนุมัติจัดซื้อ — ใส่ตามราคาที่สำรวจหรือใบเสนอราคา</div></div>
    </div>
    <div class="ff"><label>ค่าใช้จ่ายจริง (บาท)</label><input id="updCost" type="number" value="${t.actualCost||0}"></div>
    ${FLAGS.inventory&&(INVENTORY||[]).filter(x=>!x.hidden).length?`<div class="fsec">เบิกอุปกรณ์ (ตัดสต็อก)</div>
      <div id="wdBox">${INVENTORY.filter(x=>!x.hidden).map(it=>`<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <span style="flex:1;font-size:13px">${escAttr(it.name)} <span style="color:${invLow(it)?'var(--red-tx)':'var(--tx3)'}">(เหลือ ${it.stock} ${escAttr(it.unit)}${invLow(it)?' · ใกล้หมด':''})</span></span>
        <input type="number" min="0" max="${it.stock}" value="0" data-inv="${escAttr(it.id)}" style="width:72px">
      </div>`).join('')}</div>`:''}
    <div id="carbonFlagsBox" style="display:${t.status==='done'?'block':'none'};background:var(--surf2);border-radius:8px;padding:.6rem .75rem;margin-bottom:.9rem;font-size:12.5px">
      <div style="font-weight:600;margin-bottom:4px">🌱 ข้อมูลคาร์บอน (ถ้ามี)</div>
      <label style="display:flex;gap:6px;align-items:center;cursor:pointer"><input type="checkbox" id="cfRefrig" style="width:auto" ${(t.carbonFlags||[]).includes('refrig')?'checked':''}> ซ่อมรอยรั่วน้ำยาแอร์ (กันน้ำยารั่ว ~${CARBON.refrigKg} กก.)</label>
      <label style="display:flex;gap:6px;align-items:center;cursor:pointer;margin-top:3px"><input type="checkbox" id="cfReplace" style="width:auto" ${(t.carbonFlags||[]).includes('replace')?'checked':''}> ซ่อมแทนการซื้อของใหม่</label>
    </div>
    <div class="ff"><label>หมายเหตุ</label><textarea id="updNote" placeholder="รายละเอียดการดำเนินงาน..."></textarea></div>
    <button class="btn btn-p" style="width:100%" onclick="saveStatusUpdate('${id}')">บันทึก</button>`;
  document.getElementById('statusMd').style.display='flex';
}

async function saveStatusUpdate(id) {
  const ns=document.getElementById('updSt').value;
  const note=v('updNote'), cost=parseFloat(document.getElementById('updCost').value)||0;
  const t=DB.tickets.find(t=>t.id===id);if(!t)return;
  // ข้อ 6: งานที่ต้องจัดซื้อ ต้องให้บริหารอนุมัติก่อนถึงจะเป็น "อยู่ระหว่างจัดซื้อ" ได้
  if(ns==='purchase' && t.needsPurchase && !t.purchaseApprovedBy){
    showToast('งานนี้ต้องให้บริหารอนุมัติจัดซื้อก่อน — กรุณาเลือกสถานะ "รออนุมัติจัดซื้อ"',3500);
    return;
  }
  let budgetF={};
  if(['pending_purchase','purchase'].includes(ns)){
    const bud=parseFloat(document.getElementById('updBudget').value)||0;
    if(ns==='pending_purchase' && !(bud>0)){ showToast('กรุณาใส่งบประมาณจัดซื้อ เพื่อเสนอบริหารอนุมัติ',3500); document.getElementById('updBudget').focus(); return; }
    if(bud>0){ t.approvedBudget=bud; t.estimatedCost=bud; budgetF={approvedBudget:bud,estimatedCost:bud}; }
  }
  t.status=ns; t.actualCost=cost;
  let cflags=null;
  if(ns==='done'){ t.completedAt=now(); cflags=[document.getElementById('cfRefrig')?.checked&&'refrig',document.getElementById('cfReplace')?.checked&&'replace'].filter(Boolean); t.carbonFlags=cflags; }
  const entry={status:ns,date:now(),note:note||'-',by:cu.name};
  if(!t.history)t.history=[];
  t.history.push(entry);
  await syncUpdate(id,{status:ns,actualCost:cost,...budgetF,...(ns==='done'?{completedAt:t.completedAt,carbonFlags:cflags}:{})},entry);
  // ข้อ 3: เบิกอุปกรณ์ (ถ้าเปิดระบบและมีการกรอกจำนวน)
  if(FLAGS.inventory){
    const items=[...document.querySelectorAll('#wdBox input[data-inv]')].map(el=>({id:el.getAttribute('data-inv'),qty:Number(el.value)||0})).filter(x=>x.qty>0);
    if(items.length){
      showLoader('กำลังเบิกอุปกรณ์...');
      try{ const r=await api('withdrawItems',{ticketId:id,items,by:cu.name,token:AUTH_TOKEN}); if(r&&r.inventory) INVENTORY=r.inventory; showToast('เบิกอุปกรณ์แล้ว '+items.length+' รายการ'); }
      catch(e){ showToast('เบิกอุปกรณ์ไม่สำเร็จ: '+e.message,3000); }
    }
  }
  hideLoader(); cm('statusMd'); rp();
  showToast('อัปเดตสถานะแล้ว');
}

