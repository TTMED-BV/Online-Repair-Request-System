// ระบบแจ้งซ่อมออนไลน์ — dashboard.js (v16.1) : Dashboard · PM · ปฏิทิน · ตัวกรอง
// โหลดตามลำดับใน index.html (classic script ใช้ตัวแปรร่วมกัน)
// ════════════════════════ PAGE: DASHBOARD ════════════════════════
// สร้าง donut chart เป็น SVG (ไล่สีตามสถานะ)
function donutSVG(segments, total){
  const R=52, C=2*Math.PI*R, cx=64, cy=64;
  let offset=0;
  const arcs=segments.map(s=>{
    const frac=s.count/total;
    const len=frac*C;
    const dash=`${len} ${C-len}`;
    const el=`<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${s.color}" stroke-width="20" stroke-dasharray="${dash}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${cx} ${cy})"><title>${s.label}: ${s.count}</title></circle>`;
    offset+=len;
    return el;
  }).join('');
  return `<svg viewBox="0 0 128 128" class="donut-svg" width="150" height="150">
    ${arcs}
    <text x="64" y="60" text-anchor="middle" font-size="26" font-weight="700" fill="var(--tx)">${total}</text>
    <text x="64" y="78" text-anchor="middle" font-size="11" fill="var(--tx3)">รายการ</text>
  </svg>`;
}

// การ์ดสรุปรายเดือน — กราฟแท่งงานเข้า/เสร็จ 6 เดือนล่าสุด
// ════════════════════════ PAGE: PM (ซ่อมบำรุงเชิงป้องกัน) ════════════════════════
let pmDraft=null;
function ensurePMDraft(){ if(!pmDraft) pmDraft=JSON.parse(JSON.stringify(PM_LIST||[])); return pmDraft; }
// v12: หารอบ PM ถัดไป — ต้องตรงกับ pmNextOcc_ ใน Code.gs
function pmNextOcc(p, nowD){
  const now=nowD||new Date();
  const today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  const last=p.lastDone?new Date(p.lastDone):null;
  const sc=p.schedule||{};
  const after=d=> last ? d>last : d>=today;
  const dt=(y,m,d)=>{ const mx=new Date(y,m+1,0).getDate(); return new Date(y,m,Math.min(d,mx)); };
  const mode=p.mode||'interval';
  if(mode==='interval'){
    if(!last) return {start:today,end:null};
    return {start:new Date(last.getTime()+(Number(p.intervalDays)||180)*86400000),end:null};
  }
  if(mode==='dates'){
    const ds=(sc.dates||[]).map(parseYmd).filter(Boolean).sort((a,b)=>a-b);
    for(const d of ds) if(after(d)) return {start:d,end:null};
    return null;
  }
  const y0=last?Math.min(last.getFullYear(),today.getFullYear()):today.getFullYear();
  if(mode==='monthly'){
    const day=Number(sc.day)||1, m0=last?last.getMonth():today.getMonth();
    for(let n=0;n<40;n++){ const c=dt(y0,m0+n,day); if(after(c)) return {start:c,end:null}; }
    return null;
  }
  if(mode==='yearly'){
    for(let y=y0;y<y0+3;y++){ const c=dt(y,(Number(sc.month)||1)-1,Number(sc.day)||1); if(after(c)) return {start:c,end:null}; }
    return null;
  }
  if(mode==='range'){
    const a=parseYmd(sc.start), b=parseYmd(sc.end);
    if(!a||!b) return null;
    if(!sc.yearly){
      if(last && last>=a) return null;
      if(b<today) return null;
      return {start:a,end:b};
    }
    for(let yy=y0-1;yy<y0+3;yy++){
      const sa=dt(yy,a.getMonth(),a.getDate());
      const sb=new Date(sa.getTime()+Math.max(0,Math.round((b-a)/86400000))*86400000);
      if(sb<today) continue;
      if(last && last>=sa) continue;
      return {start:sa,end:sb};
    }
    return null;
  }
  return null;
}
function pmDue(p){
  if(p.active===false) return null;
  const occ=pmNextOcc(p);
  if(!occ) return {due:false,days:null,none:true};
  const td=new Date(); td.setHours(0,0,0,0);
  const days=Math.round((occ.start-td)/86400000);
  return {due:days<=0, days, occ};
}
const PM_MODES={interval:'ตามรอบวัน',dates:'ระบุวันที่',range:'ช่วงวันที่',monthly:'รายเดือน',yearly:'รายปี'};
const TH_MONTHS=['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
function pmSchedCell(p,i){
  const sc=p.schedule||{}, mode=p.mode||'interval';
  const sel=`<select onchange="pmEdit(${i},'mode',this.value)" style="margin-bottom:5px">${Object.entries(PM_MODES).map(([k,l])=>`<option value="${k}" ${mode===k?'selected':''}>${l}</option>`).join('')}</select>`;
  let body='';
  if(mode==='interval') body=`ทุก <input type="number" value="${p.intervalDays||180}" min="1" style="width:70px" onchange="pmEdit(${i},'intervalDays',this.value)"> วัน`;
  else if(mode==='dates') body=`<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:4px">${(sc.dates||[]).slice().sort().map((d,k)=>`<span class="badge b-blue nodot">${fdShort(parseYmd(d))} <a href="javascript:void 0" onclick="pmDateDel(${i},'${d}')" style="color:inherit;text-decoration:none;margin-left:3px">✕</a></span>`).join('')||'<span style="font-size:11px;color:var(--tx3)">ยังไม่มีวันที่</span>'}</div>
      <input type="date" id="pmdt_${i}" style="width:auto"> <button class="btn btn-sm" onclick="pmDateAdd(${i})">+ เพิ่มวัน</button>`;
  else if(mode==='range') body=`<input type="date" value="${sc.start||''}" style="width:auto" onchange="pmSched(${i},'start',this.value)"> ถึง <input type="date" value="${sc.end||''}" style="width:auto" onchange="pmSched(${i},'end',this.value)">
      <label style="font-size:12px;display:inline-flex;align-items:center;gap:4px;margin-left:4px;cursor:pointer"><input type="checkbox" ${sc.yearly?'checked':''} style="width:auto" onchange="pmSched(${i},'yearly',this.checked)"> ทำซ้ำทุกปี</label>`;
  else if(mode==='monthly') body=`ทุกวันที่ <input type="number" min="1" max="31" value="${sc.day||1}" style="width:60px" onchange="pmSched(${i},'day',Number(this.value)||1)"> ของเดือน`;
  else if(mode==='yearly') body=`ทุกปี วันที่ <input type="number" min="1" max="31" value="${sc.day||1}" style="width:60px" onchange="pmSched(${i},'day',Number(this.value)||1)"> <select style="width:auto" onchange="pmSched(${i},'month',Number(this.value))">${TH_MONTHS.map((m,k)=>`<option value="${k+1}" ${(Number(sc.month)||1)===k+1?'selected':''}>${m}</option>`).join('')}</select>`;
  return `<div style="min-width:230px;font-size:12.5px">${sel}<div>${body}</div></div>`;
}
function pmSched(i,key,val){ const d=ensurePMDraft(); d[i].schedule=d[i].schedule||{}; d[i].schedule[key]=val; rp(); }
function pmDateAdd(i){ const el=document.getElementById('pmdt_'+i); const v2=el&&el.value; if(!v2) return; const d=ensurePMDraft(); const sc=d[i].schedule=d[i].schedule||{}; sc.dates=Array.from(new Set([...(sc.dates||[]),v2])); rp(); }
function pmDateDel(i,dv){ const d=ensurePMDraft(); const sc=d[i].schedule||{}; sc.dates=(sc.dates||[]).filter(x=>x!==dv); rp(); }
function pgPM(){
  if(!cu) return `<div class="empty">กรุณาเข้าสู่ระบบ</div>`;
  const d=ensurePMDraft();
  const catOpts=CATS.map(c=>`<option value="${c}">${c}</option>`).join('');
  const rows=d.map((p,i)=>{
    const st=pmDue(p);
    const occTxt = st&&st.occ ? (st.occ.end?`${fdShort(st.occ.start)} – ${fdShort(st.occ.end)}`:fdShort(st.occ.start)) : '';
    const statusBadge = p.active===false ? '<span class="badge b-gray">ปิดอยู่</span>'
      : st&&st.none ? '<span class="badge b-gray">ไม่มีรอบถัดไป</span>'
      : st&&st.due ? `<span class="badge b-red">ถึงรอบแล้ว</span><div style="font-size:10.5px;color:var(--tx3);margin-top:3px">${occTxt}</div>`
      : `<span class="badge b-green">อีก ${st.days} วัน</span><div style="font-size:10.5px;color:var(--tx3);margin-top:3px">${occTxt}</div>`;
    const fls=floorsOf(p.building);
    return `<tr>
      <td><input value="${escAttr(p.name||'')}" placeholder="เช่น ล้างแอร์ชั้น 3" onchange="pmEdit(${i},'name',this.value)" style="min-width:150px"></td>
      <td><select onchange="pmFloorPick(${i},this.value)">${pmFloorOptions(p)}</select></td>
      <td><select onchange="pmEdit(${i},'category',this.value)">${CATS.map(c=>`<option value="${c}" ${p.category===c?'selected':''}>${c}</option>`).join('')}</select></td>
      <td>${pmSchedCell(p,i)}</td>
      <td style="font-size:12px;white-space:nowrap">${p.lastDone?fdShort(p.lastDone):'—'}</td>
      <td style="text-align:center">${statusBadge}</td>
      <td style="text-align:center"><label style="cursor:pointer"><input type="checkbox" ${p.active!==false?'checked':''} onchange="pmEdit(${i},'active',this.checked)" style="width:auto;accent-color:var(--accent)"></label></td>
      <td style="text-align:center"><button class="btn btn-sm btn-red" onclick="pmRemove(${i})"><i class="ti ti-trash"></i></button></td>
    </tr>`;
  }).join('');
  const dueCount=d.filter(p=>{const s=pmDue(p);return s&&s.due;}).length;
  return `<div>
    <div class="ph" style="margin-bottom:1rem">
      <div class="ph-title">🛠 แผนซ่อมบำรุงเชิงป้องกัน (PM)</div>
      <div class="ph-sub">ตั้งงานบำรุงรักษาได้ 5 แบบ: ตามรอบวัน · ระบุวันที่ · ช่วงวันที่ · รายเดือน · รายปี — ถึงกำหนดแล้วระบบสร้างใบแจ้งซ่อมให้อัตโนมัติทุกเช้า 06:00 น.</div>
    </div>
    <div class="notice n-info" style="margin-bottom:1rem"><i class="ti ti-info-circle ni"></i><div><b>ตามรอบวัน</b> นับจากวันทำล่าสุด (ยังไม่เคยทำ = ถึงรอบทันที) · <b>ระบุวันที่</b> ใส่ได้หลายวัน · <b>ช่วงวันที่</b> สร้างใบวันแรกของช่วง และกำหนดเสร็จเป็นวันสุดท้ายของช่วง (ติ๊กทำซ้ำทุกปีได้) · <b>รายเดือน/รายปี</b> วันที่คงที่ · สร้างใบแล้วระบบอัปเดตวันทำล่าสุดให้เอง</div></div>
    ${dueCount?`<div class="notice n-amber" style="margin-bottom:1rem"><i class="ti ti-bell ni"></i><div>มี <b>${dueCount}</b> รายการถึงรอบแล้ว — จะสร้างใบแจ้งซ่อมอัตโนมัติเมื่อบันทึก/เปิดเว็บครั้งถัดไป</div></div>`:''}
    <div class="card">
      <div class="ctitle" style="justify-content:space-between;flex-wrap:wrap;gap:8px">
        <span>รายการ PM (${d.length})</span>
        ${can('manage_pm')?`<button class="btn btn-sm" onclick="pmAdd()"><i class="ti ti-plus"></i> เพิ่มรายการ</button>`:''}
      </div>
      ${can('manage_pm')?'':viewOnlyNote('แก้ไขแผน PM')}
      <fieldset ${can('manage_pm')?'':'disabled'} style="border:0;padding:0;margin:0;min-width:0"><div style="overflow-x:auto"><table class="tbl xls">
        <thead><tr><th>ชื่องาน</th><th>ชั้น</th><th>ประเภท</th><th>กำหนดวัน</th><th>ทำล่าสุด</th><th>รอบถัดไป</th><th>เปิด</th><th>ลบ</th></tr></thead>
        <tbody>${rows||'<tr><td colspan="8" style="text-align:center;color:var(--tx3);padding:16px">ยังไม่มีรายการ PM — กด “เพิ่มรายการ”</td></tr>'}</tbody>
      </table></div></fieldset>
      <div id="pmMsg" style="margin-top:.9rem"></div>
      ${can('manage_pm')?`<button class="btn btn-accent" style="margin-top:.5rem" onclick="savePMList()"><i class="ti ti-device-floppy"></i> บันทึกแผน PM</button>`:''}
    </div>
  </div>`;
}
function pmAdd(){
  const d=ensurePMDraft();
  d.push({id:'',name:'',building:BUILDINGS[0]?BUILDINGS[0].id:'b1',floor:(floorsOf(BUILDINGS[0]?BUILDINGS[0].id:'b1')[0]||''),category:CATS[0]||'อื่นๆ',priority:'low',intervalDays:180,lastDone:'',desc:'',active:true,mode:'interval',schedule:{}});
  rp();
}
function pmEdit(i,field,val){
  const d=ensurePMDraft();
  if(field==='intervalDays') val=Number(val)||180;
  d[i][field]=val; 
  // แก้ชั้น/สถานะ ต้องวาดใหม่เพื่ออัปเดต badge
  if(field==='mode'){ d[i].schedule=d[i].schedule||{}; }
  if(field==='active'||field==='intervalDays'||field==='mode') rp();
}
// v15.9: ชั้นของ PM — รวมชั้นทุกอาคารเป็นรายการเดียว เรียง B → 1 … 7 → ดาดฟ้า และเลือกอาคารให้อัตโนมัติ
function floorRank(f){ const x=String(f||'').replace(/^ชั้น\s*/,'').trim(); if(/^B\d*$/i.test(x)) return -10+(parseInt(x.slice(1))||0)*-1; const n=parseFloat(x); if(!isNaN(n)) return n; if(/ดาดฟ้า/.test(x)) return 999; return 500; }
function pmFloorList(){
  const vis=FLOORS.filter(f=>!f.hidden && BUILDINGS.some(b=>b.id===f.building&&!b.hidden));
  const dup={}; vis.forEach(f=>dup[f.floor]=(dup[f.floor]||0)+1);
  return vis.map(f=>({b:f.building,f:f.floor,lbl:f.floor+(dup[f.floor]>1?' ('+(getBI(f.building).short||getBI(f.building).name)+')':'')}))
    .sort((a,c)=>floorRank(a.f)-floorRank(c.f));
}
function pmFloorOptions(p){
  const L=pmFloorList(); if(!L.length) return '<option value="">-</option>';
  const has=L.some(x=>x.b===p.building&&x.f===p.floor);
  return (has?'':`<option value="" selected>-- เลือกชั้น --</option>`)+L.map(x=>`<option value="${escAttr(x.b+'|'+x.f)}" ${x.b===p.building&&x.f===p.floor?'selected':''}>${escHtml(x.lbl)}</option>`).join('');
}
function pmFloorPick(i,val){ const d=ensurePMDraft(); const k=String(val).indexOf('|'); if(k<0) return; d[i].building=val.slice(0,k); d[i].floor=val.slice(k+1); }
function pmRemove(i){ const d=ensurePMDraft(); d.splice(i,1); rp(); }
async function savePMList(){
  const d=ensurePMDraft();
  const msg=document.getElementById('pmMsg');
  for(const p of d){ if(!p.name||!p.name.trim()){ msg.innerHTML='<div class="notice n-red" style="margin:0">ชื่องาน PM ห้ามว่าง</div>'; return; }
    const sc=p.schedule||{}, m=p.mode||'interval';
    if(m==='dates'&&!(sc.dates||[]).length){ msg.innerHTML=`<div class="notice n-red" style="margin:0">“${escHtml(p.name)}” ยังไม่ได้ใส่วันที่</div>`; return; }
    if(m==='range'&&(!sc.start||!sc.end||sc.end<sc.start)){ msg.innerHTML=`<div class="notice n-red" style="margin:0">“${escHtml(p.name)}” ช่วงวันที่ไม่ถูกต้อง</div>`; return; } }
  showLoader('กำลังบันทึกแผน PM...');
  try{
    if(GAS_URL) await api('savePM',{list:d,token:AUTH_TOKEN});
    PM_LIST=JSON.parse(JSON.stringify(d));
    localStorage.setItem('vr3_pm',JSON.stringify(PM_LIST));
    pmDraft=null;
    // bootstrap รอบถัดไปจะ runDuePM ให้ — ดึงใหม่เพื่อเห็นใบที่อาจถูกสร้าง
    await loadAll({silent:true});
    pmDraft=null;
    hideLoader(); rp(); showToast('บันทึกแผน PM แล้ว');
  }catch(e){ hideLoader(); if(!handleAuthError(e)) document.getElementById('pmMsg').innerHTML='<div class="notice n-red" style="margin:0">บันทึกไม่สำเร็จ: '+e.message+'</div>'; }
}

function monthlyTrendCard(allTickets){
  const TH=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  const now=new Date();
  const months=[];
  for(let i=5;i>=0;i--){ const d=new Date(now.getFullYear(),now.getMonth()-i,1); months.push({y:d.getFullYear(),m:d.getMonth()}); }
  const data=months.map(mo=>{
    const created=allTickets.filter(t=>{const d=new Date(t.createdAt);return d.getFullYear()===mo.y&&d.getMonth()===mo.m;}).length;
    const done=allTickets.filter(t=>t.completedAt&&(()=>{const d=new Date(t.completedAt);return d.getFullYear()===mo.y&&d.getMonth()===mo.m;})()).length;
    return {label:TH[mo.m]+' '+String((mo.y+543)%100).padStart(2,'0'),created,done};
  });
  const maxV=Math.max(1,...data.map(d=>Math.max(d.created,d.done)));
  const bars=data.map(d=>{
    const hc=Math.round(d.created/maxV*100), hd=Math.round(d.done/maxV*100);
    return `<div class="mt-col">
      <div class="mt-bars">
        <div class="mt-bar mt-bar-in" style="--h:${hc}%" title="งานเข้า ${d.created}"><span class="mt-val">${d.created||''}</span></div>
        <div class="mt-bar mt-bar-done" style="--h:${hd}%" title="เสร็จ ${d.done}"><span class="mt-val">${d.done||''}</span></div>
      </div>
      <div class="mt-lbl">${d.label}</div>
    </div>`;
  }).join('');
  return `<div class="card" style="margin-bottom:1rem">
    <div class="ctitle" style="justify-content:space-between;flex-wrap:wrap;gap:8px">
      <span>📈 แนวโน้มรายเดือน (6 เดือนล่าสุด)</span>
      <span style="display:flex;gap:14px;font-size:11.5px;font-weight:400">
        <span style="display:flex;align-items:center;gap:5px"><span style="width:11px;height:11px;border-radius:3px;background:#3ba7d6;display:inline-block"></span>งานเข้า</span>
        <span style="display:flex;align-items:center;gap:5px"><span style="width:11px;height:11px;border-radius:3px;background:#5cc93f;display:inline-block"></span>เสร็จ</span>
      </span>
    </div>
    <div class="mt-chart">${bars}</div>
  </div>`;
}

// ════════════════════════ PAGE: CALENDAR (ข้อ 2) ════════════════════════
let calCursor = null;  // {y,m} เดือนที่กำลังดู
function dkey(d){ const x=new Date(d); return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0'); }
function pmNextDue(p){
  const iv=Number(p.intervalDays)||180;
  if(!p.lastDone) return new Date();                 // ยังไม่เคยทำ = ถึงรอบแล้ว
  return new Date(new Date(p.lastDone).getTime()+iv*86400000);
}
function calShift(n){ const c=calCursor||(()=>{const d=new Date();return{y:d.getFullYear(),m:d.getMonth()};})(); let m=c.m+n,y=c.y; if(m<0){m=11;y--;} if(m>11){m=0;y++;} calCursor={y,m}; rp(); }
function calToday(){ calCursor=null; rp(); }
function pgCalendar(){
  const today=new Date(); today.setHours(0,0,0,0); const tkey=dkey(today);
  const cur = calCursor || {y:today.getFullYear(), m:today.getMonth()};
  const first=new Date(cur.y,cur.m,1), last=new Date(cur.y,cur.m+1,0);
  const THm=['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
  const day0=d=>{ const x=new Date(d); x.setHours(0,0,0,0); return x; };
  const addD=(d,n)=>new Date(d.getFullYear(),d.getMonth(),d.getDate()+n);
  const BG={tk:'var(--blue-bg)',high:'#fbe7d6',pend:'var(--amber-bg)',pm:'var(--teal-bg)',over:'rgba(227,91,91,.38)'};

  // v12: แต่ละงาน = แถบจากวันแจ้ง → วันคาดว่าเสร็จ (ยังไม่อนุมัติ = ถึงวันนี้, เลยกำหนด = ส่วนเกินเป็นสีแดง)
  const items=[]; let overdue=[];
  DB.tickets.filter(t=>!CLOSED_STATUS.includes(t.status)).forEach(t=>{
    const b=getBI(t.building), st=day0(t.createdAt), dd=dueDate(t), over=isOverSLA(t);
    let type = t.status==='pending_approval' && !t.dueOverride ? 'pend' : (t.priority==='high'?'high':'tk');
    let end = dd ? day0(dd) : today, overFrom=null;
    if(!dd) end = today;
    if(over && dd){ overFrom=addD(day0(dd),1); end=today; overdue.push({t,dd}); }
    if(end<st) end=st;
    const di=dueInfo(t);
    items.push({kind:'t', id:t.id, start:st, end, overFrom, type,
      label:`${t.status==='pending_approval'?'⏳ ':''}${b.icon} ${t.room||b.short}`,
      tip:`${t.id} · ${getSI(t.status).label}\n${b.name} — ${t.room}\nแจ้ง ${fdShort(st)} → คาดว่าเสร็จ ${dd?fdShort(dd):'(รออนุมัติ)'}${di.sub?' · '+di.sub:''}`});
  });
  (PM_LIST||[]).filter(p=>p.active!==false).forEach(p=>{
    const o=pmNextOcc(p); if(!o) return;
    items.push({kind:'pm', start:day0(o.start), end:day0(o.end||o.start), type:'pm', label:'🛠 '+(p.name||'PM'),
      tip:`PM: ${p.name}\n${o.end?fdShort(o.start)+' – '+fdShort(o.end):fdShort(o.start)}`});
  });
  items.sort((a,b)=>a.start-b.start || (b.end-b.start)-(a.end-a.start));

  // สร้างแถวสัปดาห์ที่ครอบคลุมเดือนนี้
  let ws=addD(first,-first.getDay());
  const weeks=[];
  while(ws<=last){ weeks.push(ws); ws=addD(ws,7); }
  const MAXL=8;
  const weekHtml=weeks.map(w0=>{
    const w6=addD(w0,6);
    const bg=Array.from({length:7},(_,k)=>{ const d=addD(w0,k); const out=d.getMonth()!==cur.m; const isT=dkey(d)===tkey;
      return `<div class="${out?'out':''} ${isT?'today':''}"><div class="cal-dnum">${d.getDate()}</div></div>`; }).join('');
    const lanes=[]; let hidden=0;
    const bars=items.filter(it=>it.end>=w0 && it.start<=w6).map(it=>{
      const s=it.start<w0?w0:it.start, e=it.end>w6?w6:it.end;
      const c1=Math.round((s-w0)/86400000)+1, c2=Math.round((e-w0)/86400000)+1;
      let lane=lanes.findIndex(le=>le<c1); if(lane<0){ lane=lanes.length; lanes.push(0); } lanes[lane]=c2;
      if(lane>=MAXL){ hidden++; return ''; }
      const isS=it.start>=w0, isE=it.end<=w6;
      let bgc=BG[it.type];
      if(it.overFrom && it.overFrom<=e){
        const of=it.overFrom<s?s:it.overFrom;
        const pct=Math.round((Math.round((of-s)/86400000))/(c2-c1+1)*100);
        bgc=pct<=0?BG.over:`linear-gradient(90deg, ${BG[it.type]} 0 ${pct}%, ${BG.over} ${pct}% 100%)`;
      }
      const cls=`cw-bar ev-${it.type==='tk'?'tk':it.type} ${isS?'s':'cont'} ${isE?'e':''}`;
      const click=it.kind==='t'?`onclick="openDet('${it.id}')"`:`onclick="gp('pm')"`;
      return `<div class="${cls}" ${click} title="${escAttr(it.tip)}" style="grid-column:${c1}/${c2+1};grid-row:${lane+1};background:${bgc}">${isS||c1===1?escHtml(it.label):''}</div>`;
    }).join('');
    return `<div class="cw"><div class="cw-bg">${bg}</div><div class="cw-bars">${bars}</div>${hidden?`<div class="cw-more">+${hidden} รายการ</div>`:''}</div>`;
  }).join('');

  const overCard = overdue.length ? `<div class="notice n-red" style="margin-bottom:1rem"><i class="ti ti-alert-triangle ni"></i>
    <div><b>งานเกินกำหนด ${overdue.length} รายการ</b> — ${overdue.slice(0,6).map(o=>`<span class="mono" style="cursor:pointer;text-decoration:underline" onclick="openDet('${o.t.id}')">${o.t.id}</span>`).join(' · ')}${overdue.length>6?' …':''}</div></div>` : '';

  return `<div>
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:1rem">
      <div class="ph-title" style="font-size:18px">📅 ปฏิทินงานค้าง + PM</div>
      <div style="display:flex;align-items:center;gap:6px">
        <button class="btn btn-sm" onclick="calShift(-1)"><i class="ti ti-chevron-left"></i></button>
        <span style="font-weight:700;min-width:140px;text-align:center">${THm[cur.m]} ${cur.y+543}</span>
        <button class="btn btn-sm" onclick="calShift(1)"><i class="ti ti-chevron-right"></i></button>
        <button class="btn btn-sm btn-accent" onclick="calToday()">วันนี้</button>
      </div>
    </div>
    ${overCard}
    <div style="display:flex;gap:14px;flex-wrap:wrap;font-size:11.5px;margin-bottom:.7rem">
      <span><span class="cal-dot ev-tk"></span> งานค้าง</span>
      <span><span class="cal-dot ev-high"></span> เร่งด่วน</span>
      <span><span class="cal-dot ev-pend"></span> รออนุมัติ (ถึงวันนี้)</span>
      <span><span class="cal-dot ev-over"></span> ส่วนที่เลยกำหนด</span>
      <span><span class="cal-dot ev-pm"></span> PM</span>
      <span style="color:var(--tx3)">แถบ = วันแจ้ง → วันคาดว่าเสร็จ · กดที่แถบเพื่อดูรายละเอียด</span>
    </div>
    <div class="card" style="padding:.6rem">
      <div class="cal-grid cal-head">${['อา','จ','อ','พ','พฤ','ศ','ส'].map(d=>`<div class="cal-dow">${d}</div>`).join('')}</div>
      ${weekHtml}
    </div>
  </div>`;
}

// ─── v15.9: ตัวกรอง Dashboard (ประเภทงาน · ผู้รับผิดชอบ · อาคาร · ช่วงเวลา · ความเร่งด่วน) ───
const DF_DEF={cat:'',user:'',bld:'',pri:'',period:'all',from:'',to:''};
let DF=(()=>{ try{ return Object.assign({},DF_DEF,JSON.parse(localStorage.getItem('vr3_dashf')||'{}')); }catch(e){ return Object.assign({},DF_DEF); } })();
function dfSave(){ try{ localStorage.setItem('vr3_dashf',JSON.stringify(DF)); }catch(e){} }
function dfSet(k,v){ DF[k]=v; if(k==='period'&&v!=='custom'){ DF.from=''; DF.to=''; } _hsCache=null; dfSave(); rp(); }
function dfClear(k){ if(k){ DF[k]=DF_DEF[k]; if(k==='period'){DF.from='';DF.to='';} } else DF=Object.assign({},DF_DEF); _hsCache=null; dfSave(); rp(); }
const DF_PRI={high:'🔴 เร่งด่วน',med:'🟠 ปานกลาง',low:'⚪ ปกติ'};
const DF_PER={all:'ทั้งหมด',month:'เดือนนี้',lastmonth:'เดือนที่แล้ว',quarter:'ไตรมาสนี้ (ปีงบ)',fy:'ปีงบนี้',lastfy:'ปีงบที่แล้ว',custom:'กำหนดช่วงเอง'};
function dfUserOn(){ return !!cu && !!DF.user; }          // ตัวกรองรายคน — เฉพาะผู้ที่เข้าสู่ระบบ
function dfRange(){
  const n=new Date(), y=n.getFullYear(), m=n.getMonth();
  switch(DF.period){
    case 'month': return {s:new Date(y,m,1), e:new Date(y,m+1,1)};
    case 'lastmonth': return {s:new Date(y,m-1,1), e:new Date(y,m,1)};
    case 'quarter': { const qs=Math.floor(((m+3)%12)/3)*3; const s=new Date(y,m,1); s.setMonth(m-(((m+3)%12)-qs)); const e=new Date(s); e.setMonth(e.getMonth()+3); return {s,e}; }
    case 'fy': { const r=fyRange(fyOf(n)); return {s:r.start,e:r.end}; }
    case 'lastfy': { const r=fyRange(fyOf(n)-1); return {s:r.start,e:r.end}; }
    case 'custom': { const s=DF.from?new Date(DF.from+'T00:00:00'):null, e=DF.to?new Date(DF.to+'T00:00:00'):null; if(e) e.setDate(e.getDate()+1); return (s||e)?{s,e}:null; }
    default: return null;
  }
}
// เงื่อนไขที่ไม่ใช่ช่วงเวลา — ใช้กับทุกการ์ดรวมถึง KPI ปีงบ
function dfMatch(t){
  if(DF.cat && String(t.category||'').trim()!==DF.cat) return false;
  if(DF.bld && t.building!==DF.bld) return false;
  if(DF.pri && (t.priority||'low')!==DF.pri) return false;
  if(dfUserOn() && !(t.assignees||[]).includes(DF.user)) return false;
  return true;
}
function dfInPeriod(t){ const r=dfRange(); if(!r) return true; const d=new Date(t.createdAt); return (!r.s||d>=r.s)&&(!r.e||d<r.e); }
function dfActive(){ return !!(DF.cat||DF.bld||DF.pri||dfUserOn()||(DF.period!=='all'&&dfRange())); }
function dfLabel(withPeriod){
  const a=[];
  if(DF.cat) a.push('ประเภท: '+DF.cat);
  if(DF.bld) a.push('อาคาร: '+getBI(DF.bld).name);
  if(DF.pri) a.push('ความเร่งด่วน: '+DF_PRI[DF.pri].replace(/^\S+ /,''));
  if(dfUserOn()) a.push('ผู้รับผิดชอบ: '+((USERS[DF.user]||{}).name||DF.user));
  if(withPeriod && DF.period!=='all' && dfRange()) a.push('ช่วง: '+dfPeriodText());
  return a.join(' · ');
}
function dfPeriodText(){ const r=dfRange(); if(!r) return 'ทั้งหมด'; const f=d=>d.toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'2-digit'});
  const e=r.e?new Date(r.e.getTime()-86400000):null; return (r.s?f(r.s):'…')+' – '+(e?f(e):'…'); }
function dfBar(){
  const cats=[...new Set(CATS.concat(DB.tickets.map(t=>String(t.category||'').trim()).filter(Boolean)))];
  const opt=(v,l,cur)=>`<option value="${escAttr(v)}" ${v===cur?'selected':''}>${escHtml(l)}</option>`;
  const chips=[];
  if(DF.cat) chips.push(['cat','📂 '+DF.cat]);
  if(DF.bld) chips.push(['bld',getBI(DF.bld).icon+' '+(getBI(DF.bld).short||getBI(DF.bld).name)]);
  if(DF.pri) chips.push(['pri',DF_PRI[DF.pri]]);
  if(dfUserOn()) chips.push(['user','👷 '+((USERS[DF.user]||{}).name||DF.user)]);
  if(DF.period!=='all'&&dfRange()) chips.push(['period','📅 '+DF_PER[DF.period]+' ('+dfPeriodText()+')']);
  return `<div class="card card-sm" style="margin-bottom:1rem">
    <div class="dfbar">
      <div class="dff"><label>📅 ช่วงเวลา (วันที่แจ้ง)</label><select onchange="dfSet('period',this.value)">${Object.entries(DF_PER).map(([k,l])=>opt(k,l,DF.period)).join('')}</select></div>
      ${DF.period==='custom'?`<div class="dff" style="min-width:130px"><label>ตั้งแต่</label><input type="date" value="${escAttr(DF.from)}" onchange="dfSet('from',this.value)"></div>
      <div class="dff" style="min-width:130px"><label>ถึง</label><input type="date" value="${escAttr(DF.to)}" onchange="dfSet('to',this.value)"></div>`:''}
      <div class="dff"><label>📂 ประเภทงาน</label><select onchange="dfSet('cat',this.value)">${opt('','ทุกประเภท',DF.cat)}${cats.map(c=>opt(c,c,DF.cat)).join('')}</select></div>
      <div class="dff"><label>🏢 อาคาร</label><select onchange="dfSet('bld',this.value)">${opt('','ทุกอาคาร',DF.bld)}${BUILDINGS.filter(b=>!b.hidden||DB.tickets.some(t=>t.building===b.id)).map(b=>opt(b.id,b.icon+' '+b.name,DF.bld)).join('')}</select></div>
      <div class="dff"><label>⚡ ความเร่งด่วน</label><select onchange="dfSet('pri',this.value)">${opt('','ทุกระดับ',DF.pri)}${Object.entries(DF_PRI).map(([k,l])=>opt(k,l,DF.pri)).join('')}</select></div>
      ${cu?`<div class="dff"><label>👷 ผู้รับผิดชอบ</label><select onchange="dfSet('user',this.value)">${opt('','ทุกคน',DF.user)}${assignableEntries().map(([u,v])=>opt(u,v.name,DF.user)).join('')}</select></div>`:''}
    </div>
    ${chips.length?`<div class="dfchips"><span style="color:var(--tx3)">กำลังกรอง:</span>${chips.map(([k,l])=>`<span class="dfchip">${escHtml(l)}<button title="เอาออก" onclick="dfClear('${k}')">✕</button></span>`).join('')}
      <button class="btn btn-sm" style="padding:3px 10px" onclick="dfClear()">ล้างตัวกรอง</button></div>`:''}
  </div>`;
}
// แสดง Dashboard ด้วยชุดข้อมูลที่ผ่านตัวกรอง (คืนค่า DB.tickets เดิมเสมอ)
function dfWith(fn){ const all=DB.tickets; DB.tickets=all.filter(dfMatch); try{ return fn(); } finally{ DB.tickets=all; } }
function pgDashboard(){ return dfWith(pgDashboardInner); }
function pgDashboardInner() {
  const pub=!cu;  // คนทั่วไป (ไม่ login) เห็นเฉพาะภาพรวม ซ่อนงบ/ชื่อช่าง
  const tickets=DB.tickets.filter(t=>t.status!=='cancelled'&&dfInPeriod(t));  // ไม่นับใบที่ยกเลิก · v15.9 ผ่านตัวกรองแล้ว
  const ticketsAllTime=DB.tickets.filter(t=>t.status!=='cancelled');   // สำหรับกราฟแนวโน้ม 6 เดือน (มีช่วงของตัวเอง)
  const active=tickets.filter(t=>!CLOSED_STATUS.includes(t.status));
  const done=tickets.filter(t=>t.status==='done');
  const pending=tickets.filter(t=>t.status==='pending_approval');
  const overSLA=active.filter(t=>isOverSLA(t));
  // ความพึงพอใจเฉลี่ย (จากงานที่ให้คะแนนแล้ว)
  const rated=tickets.filter(t=>t.rating&&t.rating>0);
  const avgRating=rated.length?(rated.reduce((s,t)=>s+t.rating,0)/rated.length):0;
  const budgetData=BUILDINGS.map(b=>{
    const bt=tickets.filter(t=>t.building===b.id);
    const spent=bt.reduce((s,t)=>s+(t.actualCost||0),0);
    return{...b,spent,pct:Math.min(100,Math.round(spent/b.budget*100))};
  });
  const totalBudget=BUILDINGS.reduce((s,b)=>s+b.budget,0);
  const totalSpent=budgetData.reduce((s,b)=>s+b.spent,0);
  const hotspot=BUILDINGS.map(b=>({...b,count:tickets.filter(t=>t.building===b.id).length,active:tickets.filter(t=>t.building===b.id&&!CLOSED_STATUS.includes(t.status)).length}));
  const maxHs=Math.max(...hotspot.map(h=>h.count),1);
  // v12: เฉพาะคนที่รับงานซ่อมได้ (บริหารไม่ขึ้น) + วิศวกรมีภาระงานบริหารจัดการแยกป้าย
  const pmDueN=(PM_LIST||[]).filter(p=>{const s=pmDue(p);return s&&s.due;}).length;
  const techLoad=assignableEntries().filter(([u])=>!dfUserOn()||u===DF.user).map(([u,v2])=>{
    const tw=tickets.filter(t=>(t.assignees||[]).includes(u));
    const own=tw.filter(t=>!CLOSED_STATUS.includes(t.status)).length;
    const r={u,v:v2,own,active:own,done:tw.filter(t=>t.status==='done').length,overSla:tw.filter(t=>isOverSLA(t)).length,adm:null};
    if(v2.isEngineer){
      const mine=tickets.filter(t=>t.approvedBy===u);
      r.adm={pending:pending.length, assigned:mine.length, oversee:mine.filter(t=>!CLOSED_STATUS.includes(t.status)).length, pm:pmDueN};
      r.active=own+r.adm.pending+r.adm.oversee+r.adm.pm;
    }
    return r;
  });
  const maxLoad=Math.max(...techLoad.map(t=>t.active),1);
  const catData=CATS.map(c=>({name:c,count:tickets.filter(t=>t.category===c).length})).sort((a,b)=>b.count-a.count);
  const maxCat=Math.max(...catData.map(c=>c.count),1);
  const recurring=[];
  BUILDINGS.forEach(b=>{CATS.forEach(c=>{const cnt=tickets.filter(t=>t.building===b.id&&t.category===c).length;if(cnt>=2)recurring.push({building:b,cat:c,count:cnt});});});
  recurring.sort((a,b)=>b.count-a.count);

  // สัดส่วนตามสถานะ (สำหรับ donut chart)
  const statusColorMap={pending_approval:'#e0a94b',assigned:'#8b6ff0',survey:'#e0a94b',purchase:'#8b6ff0',working:'#3ba7d6',insurance:'#22c19a',contractor:'#22c19a',done:'#5cc93f',cannot:'#e35b5b',cancelled:'#a8a08a'};
  const statusCounts=STATUSES.map(s=>({...s,count:tickets.filter(t=>t.status===s.id).length,color:statusColorMap[s.id]||'#888'})).filter(s=>s.count>0);
  const totalForDonut=statusCounts.reduce((a,s)=>a+s.count,0)||1;

  return `<div>
    ${dfBar()}
    ${dfActive()&&!tickets.length?`<div class="notice n-amber" style="margin-bottom:1rem"><i class="ti ti-filter ni"></i><div>ไม่มีใบงานที่ตรงกับตัวกรอง — ลองเปลี่ยนหรือกด “ล้างตัวกรอง”</div></div>`:''}
    ${pub?`<div class="notice n-info" style="margin-bottom:1rem"><i class="ti ti-info-circle ni"></i><div>ภาพรวมสถิติการแจ้งซ่อม (ข้อมูลสาธารณะ) — เจ้าหน้าที่เข้าสู่ระบบเพื่อดูงบประมาณและรายละเอียดเพิ่มเติม</div></div>`:''}
    <div class="g5 dash-stats" style="margin-bottom:1rem">
      <div class="stat stat-grad-a"><div class="stat-ic">📋</div><div class="stat-lbl">งานทั้งหมด</div><div class="stat-n">${tickets.length}</div></div>
      <div class="stat stat-grad-b"><div class="stat-ic">🔧</div><div class="stat-lbl">กำลังดำเนินการ</div><div class="stat-n">${active.length}</div><div class="stat-sub">รออนุมัติ ${pending.length}</div></div>
      <div class="stat stat-grad-c"><div class="stat-ic">✅</div><div class="stat-lbl">เสร็จสิ้น</div><div class="stat-n">${done.length}</div><div class="stat-sub">${tickets.length?Math.round(done.length/tickets.length*100):0}%</div></div>
      <div class="stat stat-grad-e"><div class="stat-ic">⭐</div><div class="stat-lbl">พึงพอใจเฉลี่ย</div><div class="stat-n">${avgRating?avgRating.toFixed(1):'—'}</div><div class="stat-sub">${rated.length?'จาก '+rated.length+' ความเห็น · ผู้แจ้ง '+rated.filter(t=>!t.ratedBy).length+' / แทน '+rated.filter(t=>t.ratedBy).length:'ยังไม่มีคะแนน'}</div></div>
      <div class="stat stat-grad-d"><div class="stat-ic">⏰</div><div class="stat-lbl">เกิน SLA</div><div class="stat-n">${overSLA.length}</div></div>
    </div>
    ${statusCounts.length?`<div class="card" style="margin-bottom:1rem">
      <div class="ctitle">🍩 สัดส่วนงานตามสถานะ</div>
      <div class="donut-wrap">
        ${donutSVG(statusCounts,totalForDonut)}
        <div class="donut-legend">
          ${statusCounts.map(s=>`<div class="donut-leg-item">
            <span class="donut-dot" style="background:${s.color}"></span>
            <span class="donut-leg-lbl">${s.label}</span>
            <span class="donut-leg-val">${s.count} <span style="color:var(--tx3)">(${Math.round(s.count/totalForDonut*100)}%)</span></span>
          </div>`).join('')}
        </div>
      </div>
    </div>`:''}
    ${pub?'':lowStockCard()}
    ${pub?'':kpiCard()}
    ${pub?'':carbonCard()}
    ${monthlyTrendCard(ticketsAllTime)}
    ${pub?'':hotspotCard()}
    <div class="${pub?'':'g2'}" style="margin-bottom:1rem">
      ${pub?'':`<div class="card">
        <div class="ctitle">💰 งบประมาณรายอาคาร</div>
        <div class="stat" style="margin-bottom:.75rem">
          <div class="stat-lbl">ใช้จ่ายรวม</div>
          <div class="stat-n">${totalSpent.toLocaleString()} <span style="font-size:14px;font-weight:400;color:var(--tx2)">/ ${totalBudget.toLocaleString()} บาท</span></div>
          <div style="height:6px;background:var(--surf3);border-radius:3px;margin-top:8px">
            <div style="height:100%;border-radius:3px;background:${totalSpent/totalBudget>.8?'#e35b5b':'#5cc93f'};width:${Math.min(100,Math.round(totalSpent/totalBudget*100))}%"></div>
          </div>
        </div>
        <div class="bar-wrap">${budgetData.map(b=>`<div class="bar-row">
          <div class="bar-lbl">${b.icon} ${b.short}</div>
          <div><div class="bar-track"><div class="bar-fill" style="width:${b.pct}%;background:${b.pct>80?'#e35b5b':b.pct>50?'#e0a94b':'#5cc93f'}"></div></div>
          <div style="font-size:10px;color:var(--tx3);margin-top:2px">${b.spent.toLocaleString()} / ${b.budget.toLocaleString()} บาท</div></div>
          <div class="bar-val">${b.pct}%</div>
        </div>`).join('')}</div>
      </div>`}
      <div class="card">
        <div class="ctitle">🔥 Hotspot รายอาคาร</div>
        <div class="hs-grid" style="margin-bottom:.75rem">${hotspot.map(h=>{
          const pct=Math.round(h.count/maxHs*100),col=pct>75?'#e35b5b':pct>50?'#e0a94b':pct>25?'#3ba7d6':'#5cc93f';
          return `<div class="hs-card"><div class="hs-icon">${h.icon}</div><div class="hs-name">${h.short}</div>
            <div class="hs-count" style="color:${col}">${h.count}</div>
            <div class="hs-bar" style="background:${col}33"><div style="height:100%;border-radius:2px;background:${col};width:${pct}%"></div></div>
            <div style="font-size:11px;color:var(--tx3)">คงค้าง ${h.active}</div></div>`;
        }).join('')}</div>
        ${recurring.length?`<div style="font-size:12px;font-weight:600;color:var(--tx2);margin-bottom:6px">ปัญหาซ้ำซาก</div>${recurring.slice(0,3).map(r=>`<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:.5px solid var(--bd);font-size:12px"><span>${r.building.icon} ${r.building.short} — ${r.cat}</span><span class="badge b-red">${r.count} ครั้ง</span></div>`).join('')}`:''}
      </div>
    </div>
    <div class="${pub?'':'g2'}">
      ${pub?'':`<div class="card">
        <div class="ctitle">👷 ภาระงานแต่ละคน</div>
        ${techLoad.map(t=>{
          const pct=maxLoad?Math.round(t.active/maxLoad*100):0,wlColor=pct>80?'#e35b5b':pct>50?'#e0a94b':'#5cc93f';
          return `<div class="tech-card">
            <div class="tech-av" style="background:${t.v.color}33;color:${t.v.color}">${t.v.initials}</div>
            <div class="tech-info">
              <div class="tech-name">${t.v.name}</div>
              <div style="font-size:11px;color:var(--tx3)">${(t.v.specialty||[]).join(' · ')}</div>
              <div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:4px">
                <span class="badge b-blue">งานซ่อมคงค้าง ${t.own}</span>
                <span class="badge b-green">เสร็จ ${t.done}</span>
                ${t.overSla?`<span class="badge b-red">เกิน SLA ${t.overSla}</span>`:''}
              </div>
              ${t.adm?`<div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:4px" title="ภาระงานบริหารจัดการ">
                <span class="badge b-amber">รออนุมัติ ${t.adm.pending}</span>
                <span class="badge b-purple">มอบหมายแล้ว ${t.adm.assigned}</span>
                <span class="badge b-teal">กำกับดูแล ${t.adm.oversee}</span>
                <span class="badge b-gray">PM ถึงรอบ ${t.adm.pm}</span>
              </div>`:''}
              <div class="wl-track"><div class="wl-fill" style="width:${pct}%;background:${wlColor}"></div></div>
            </div>
            <div style="font-size:20px;font-weight:700;color:${wlColor};font-family:var(--mono);min-width:28px;text-align:right">${t.active}</div>
          </div>`;
        }).join('')}
      </div>`}
      <div class="card">
        <div class="ctitle">📊 งานแยกตามประเภท</div>
        <div class="bar-wrap">${catData.map(c=>{const pct=Math.round(c.count/maxCat*100);return `<div class="bar-row"><div class="bar-lbl">${c.name.replace('งาน','').replace('ระบบ','')}</div><div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:#3ba7d6"></div></div><div class="bar-val">${c.count}</div></div>`;}).join('')}</div>
        <hr class="divider" style="margin:.875rem 0">
        <div style="font-size:13px;font-weight:600;margin-bottom:6px">ภาระงานรายอาคาร</div>
        ${hotspot.map(h=>{const ratio=tickets.length?Math.round(h.count/tickets.length*100):0,cls=ratio>35?'b-red':ratio>20?'b-amber':'b-green',msg=ratio>35?'ภาระสูง':ratio>20?'ปานกลาง':'ต่ำ';
          return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:.5px solid var(--bd);font-size:12px"><span>${h.icon} ${h.name}</span><span class="badge ${cls}">${ratio}% — ${msg}</span></div>`;
        }).join('')}
      </div>
    </div>
  </div>`;
}

