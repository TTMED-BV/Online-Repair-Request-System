// ระบบแจ้งซ่อมออนไลน์ — status.js (v16.2) : หน้าติดตามงาน · ส่งออก Excel/PDF
// โหลดตามลำดับใน index.html (classic script ใช้ตัวแปรร่วมกัน)
// ════════════════════════ PAGE: STATUS ════════════════════════
// ─── Export Excel / PDF ───
function exportRows(){
  const pLbl={high:'เร่งด่วน',med:'ปานกลาง',low:'ปกติ'};
  return DB.tickets.filter(t=>t.status!=='cancelled')
    .slice().sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt))
    .map(t=>({
      'รหัส':t.id,
      'วันที่แจ้ง':fd(t.createdAt),
      'อาคาร':getBI(t.building).name,
      'ห้อง/ชั้น':t.room,
      'ประเภทงาน':t.category,
      'ความเร่งด่วน':pLbl[t.priority]||t.priority,
      'สถานะ':getSI(t.status).label,
      'ผู้แจ้ง':t.name,
      'โทรศัพท์':t.phone,
      'หน่วยงาน':t.dept,
      'รายละเอียด':t.desc,
      'ผู้รับผิดชอบ':(t.assignees||[]).map(getUserName).join(', '),
      'ประมาณการ(บาท)':t.estimatedCost||0,
      'ค่าใช้จ่ายจริง(บาท)':t.actualCost||0,
      'นับ SLA(วัน)':CLOSED_STATUS.includes(t.status)?'-':effElapsed(t),
      'SLA(วัน)':getSLA(t.category),
      'วันที่อนุมัติ':t.approvedAt?fd(t.approvedAt):'',
      'คาดว่าเสร็จ':(()=>{const d=dueDate(t);return d?fdShort(d):'รออนุมัติ';})(),
      'สถานะกำหนดส่ง':dueInfo(t).sub||'',
      'เกิน SLA':isOverSLA(t)?'เกิน':'',
      'วันเสร็จจริง':t.completedAt?fd(t.completedAt):''
    }));
}
async function exportExcel(){
  if(typeof XLSX==='undefined'){
    showLoader('กำลังเตรียมไฟล์ Excel...');
    try{ await loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'); }
    catch(e){ hideLoader(); showToast(e.message); return; }
    hideLoader();
  }
  const rows=exportRows();
  if(!rows.length){ showToast('ไม่มีข้อมูลให้ส่งออก'); return; }
  const ws=XLSX.utils.json_to_sheet(rows);
  ws['!cols']=Object.keys(rows[0]).map(k=>({wch:k==='รายละเอียด'?40:k==='อาคาร'?24:14}));
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'รายงานแจ้งซ่อม');
  const d=new Date().toISOString().slice(0,10);
  XLSX.writeFile(wb,`รายงานแจ้งซ่อม_${d}.xlsx`);
  showToast('ดาวน์โหลด Excel แล้ว');
}
function exportPDF(){
  const rows=exportRows();
  if(!rows.length){ showToast('ไม่มีข้อมูลให้ส่งออก'); return; }
  const cols=Object.keys(rows[0]).filter(c=>!['โทรศัพท์','หน่วยงาน','อีเมล','วันที่อนุมัติ','สถานะกำหนดส่ง','นับ SLA(วัน)'].includes(c));
  const d=new Date().toLocaleDateString('th-TH',{year:'numeric',month:'long',day:'numeric'});
  const head=cols.map(c=>`<th>${c}</th>`).join('');
  const body=rows.map(r=>`<tr>${cols.map(c=>`<td>${escHtml(r[c]===0?'0':(r[c]||''))}</td>`).join('')}</tr>`).join('');
  const w=window.open('','_blank');
  w.document.write(`<html><head><meta charset="utf-8"><title>รายงานแจ้งซ่อม</title>
  <style>
    @page{size:A4 landscape;margin:12mm}
    body{font-family:'Sarabun','TH SarabunPSK',sans-serif;font-size:11px;color:#111}
    h2{margin:0 0 2px} .sub{color:#666;font-size:12px;margin-bottom:12px}
    table{width:100%;border-collapse:collapse}
    th,td{border:0.5px solid #999;padding:4px 6px;text-align:left;vertical-align:top}
    th{background:#12233b;color:#fff;font-size:10px}
    tr:nth-child(even) td{background:#f4f4f0}
  </style></head><body>
  <h2>รายงานการแจ้งซ่อม — คณะการแพทย์แผนไทย มหาวิทยาลัยสงขลานครินทร์</h2>
  <div class="sub">พิมพ์เมื่อ ${d} · รวม ${rows.length} รายการ</div>
  <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
  <script>window.onload=function(){window.print();}<\/script>
  </body></html>`);
  w.document.close();
  showToast('เปิดหน้าพิมพ์ — เลือก "บันทึกเป็น PDF"');
}

function pgStatus() {
  const tickets=DB.tickets.filter(t=>t.status!=='cancelled').slice().sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  return `<div>
    <div class="card" style="margin-bottom:1rem">
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <input id="sq" placeholder="🔍 ค้นหารหัส / ชื่อ / อาคาร / ห้อง / รายละเอียด..." style="flex:1;min-width:200px" oninput="filterStatus()">
        <button class="btn btn-sm" onclick="loadAll().then(rp)">🔄 รีเฟรช</button>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px">
        <select id="sbld" onchange="filterStatus()" style="width:auto">
          <option value="">🏢 ทุกอาคาร</option>${BUILDINGS.map(b=>`<option value="${b.id}">${b.icon} ${b.short}</option>`).join('')}
        </select>
        <select id="ssta" onchange="filterStatus()" style="width:auto">
          <option value="">📋 ทุกสถานะ</option>${STATUSES.map(s=>`<option value="${s.id}">${s.label}</option>`).join('')}
        </select>
        <select id="scat" onchange="filterStatus()" style="width:auto">
          <option value="">🔧 ทุกประเภท</option>${CATS.map(c=>`<option value="${c}">${c}</option>`).join('')}
        </select>
        <select id="spri" onchange="filterStatus()" style="width:auto">
          <option value="">⚡ ทุกความเร่งด่วน</option>
          <option value="high">🔴 เร่งด่วน</option>
          <option value="med">🟡 ปานกลาง</option>
          <option value="low">🟢 ปกติ</option>
        </select>
        <select id="srate" onchange="filterStatus()" style="width:auto">
          <option value="">⭐ การประเมินทั้งหมด</option>
          <option value="unrated">ยังไม่ประเมิน (ทั้งหมด)</option>
          <option value="proxy">รอประเมินแทน (เกิน ${RATE_PROXY_DAYS} วัน)</option>
          <option value="rated">ประเมินแล้ว</option>
        </select>
        ${cu?`<select id="sover" onchange="filterStatus()" style="width:auto">
          <option value="">⏱ ทั้งหมด (SLA)</option>
          <option value="over">เกิน SLA เท่านั้น</option>
        </select>`:''}
        <button class="btn btn-sm" onclick="clearFilters()" style="margin-left:auto">✕ ล้างตัวกรอง</button>
      </div>
      <div id="filterCount" style="font-size:11.5px;color:var(--tx3);margin-top:8px"></div>
    </div>
    <div id="stlist">${renderStatusList(tickets)}</div>
    <div class="card" style="margin-top:1.25rem">
      <div class="ctitle" style="justify-content:space-between;flex-wrap:wrap;gap:8px">
        <span><i class="ti ti-table" style="color:var(--accent)"></i> ตารางสรุปสถานะ (คลิกหัวคอลัมน์เพื่อเรียง)</span>
        <span style="display:flex;gap:6px;align-items:center">
          ${cu?`<button class="btn btn-sm btn-green" onclick="exportExcel()"><i class="ti ti-file-spreadsheet"></i> Excel</button>
          <button class="btn btn-sm" onclick="exportPDF()"><i class="ti ti-file-type-pdf"></i> PDF</button>`:''}
          <span style="font-size:11px;font-weight:400;color:var(--tx3)">${tickets.length} รายการ</span>
        </span>
      </div>
      <div style="overflow-x:auto" id="sttable">${renderStatusTable(tickets)}</div>
    </div>
  </div>`;
}

let tblSort={key:'createdAt',dir:-1};
function renderStatusTable(tickets){
  if(!tickets.length) return `<div class="empty" style="padding:1.5rem"><div class="empty-sub">ไม่มีข้อมูล</div></div>`;
  const cols=[
    {k:'id',       label:'รหัส',      w:'110px'},
    {k:'createdAt',label:'วันที่แจ้ง', w:'130px'},
    {k:'building', label:'อาคาร',      w:'150px'},
    {k:'room',     label:'ห้อง',       w:'150px'},
    {k:'category', label:'ประเภท',     w:'150px'},
    {k:'priority', label:'เร่งด่วน',    w:'90px'},
    {k:'status',   label:'สถานะ',      w:'150px'},
  ];
  if(cu) cols.push({k:'due', label:'คาดว่าเสร็จ', w:'150px'});   // เฉพาะเจ้าหน้าที่
  const prioRank={high:3,med:2,low:1};
  const arr=tickets.slice().sort((a,b)=>{
    let x,y; const k=tblSort.key;
    if(k==='due'){x=dueDate(a)?new Date(dueDate(a)).getTime():Infinity;y=dueDate(b)?new Date(dueDate(b)).getTime():Infinity;}
    else if(k==='priority'){x=prioRank[a.priority]||0;y=prioRank[b.priority]||0;}
    else if(k==='createdAt'){x=new Date(a.createdAt);y=new Date(b.createdAt);}
    else if(k==='building'){x=getBI(a.building).short;y=getBI(b.building).short;}
    else if(k==='status'){x=STATUSES.findIndex(s=>s.id===a.status);y=STATUSES.findIndex(s=>s.id===b.status);}
    else{x=(a[k]||'').toString();y=(b[k]||'').toString();}
    if(x<y)return -1*tblSort.dir; if(x>y)return 1*tblSort.dir; return 0;
  });
  const arrow=k=>tblSort.key===k?(tblSort.dir===1?' ▲':' ▼'):'';
  const pLbl={high:'เร่งด่วน',med:'ปานกลาง',low:'ปกติ'};
  const pCls={high:'b-red',med:'b-amber',low:'b-gray'};
  return `<table class="tbl xls">
    <thead><tr>${cols.map(c=>`<th style="min-width:${c.w};cursor:pointer;user-select:none" onclick="sortTable('${c.k}')">${c.label}${arrow(c.k)}</th>`).join('')}</tr></thead>
    <tbody>${arr.map(t=>{
      const s=getSI(t.status),b=getBI(t.building),over=isOverSLA(t);
      return `<tr onclick="openDet('${t.id}')" style="cursor:pointer">
        <td class="mono">${t.id}</td>
        <td style="white-space:nowrap">${fd(t.createdAt)}</td>
        <td>${b.icon} ${b.short}</td>
        <td>${escHtml(t.room)}</td>
        <td>${escHtml(t.category)}</td>
        <td><span class="badge ${pCls[t.priority]} nodot">${pLbl[t.priority]}</span></td>
        <td><span class="badge ${s.cls}">${s.label}</span>${over?' <span class="badge b-red">เกิน SLA</span>':''}</td>
        ${cu?(()=>{const di=dueInfo(t);return `<td style="white-space:nowrap"><span class="badge ${di.cls}">${di.text}</span>${di.sub?`<div style="font-size:10.5px;color:var(--tx3);margin-top:2px">${di.sub}</div>`:''}</td>`;})():''}
      </tr>`;
    }).join('')}</tbody>
  </table>`;
}
function sortTable(k){
  if(tblSort.key===k) tblSort.dir*=-1; else { tblSort.key=k; tblSort.dir=1; }
  // re-render using current filter set
  filterStatus();
}
// v12: สถานะการประเมิน — null (ยังไม่เสร็จ) | rated | waiting (ภายใน 3 วัน) | proxy (เกิน 3 วัน เปิดให้ประเมินแทน)
const RATE_PROXY_DAYS=3;
function doneAtOf(t){ if(t.completedAt) return new Date(t.completedAt); const h=(t.history||[]).filter(x=>x.status==='done'); return h.length?new Date(h[0].date):null; }
function rateState(t){
  if(t.status!=='done') return null;
  if(t.rating>0) return 'rated';
  const d=doneAtOf(t);
  return d && (Date.now()-d)>=RATE_PROXY_DAYS*86400000 ? 'proxy' : 'waiting';
}
function rateBadge(t){
  const r=rateState(t);
  if(r==='rated') return `<span class="badge b-amber nodot">⭐ ${t.rating}${t.ratedBy?' · ประเมินแทน':''}</span>`;
  if(r==='waiting') return '<span class="badge b-gray nodot">⭐ ยังไม่ประเมิน</span>';
  if(r==='proxy') return '<span class="badge b-red nodot">⭐ รอประเมินแทน</span>';
  return '';
}
function lastNote(t){
  const h=(t.history||[]).slice().reverse().find(x=>x.note && x.note!=='-' && x.note!=='รับแจ้งซ่อมเข้าระบบ');
  return h||null;
}
// v15.11: แถบไทม์ไลน์ แจ้ง → อนุมัติ → เสร็จจริง/คาดว่าเสร็จ (ใช้ร่วมหน้า ใบที่ฉันแจ้ง / ติดตามงาน / จัดการงาน / งานที่ฉันรับผิดชอบ)
function timelineStrip(t){
  const di=dueInfo(t), doneAt=t.status==='done'?doneAtOf(t):null, closed=CLOSED_STATUS.includes(t.status);
  const step=(lbl,val,on)=>`<span class="tl-step"><span class="tl-l">${lbl}</span><span class="tl-v" style="font-weight:${on?600:400};color:${on?'var(--tx)':'var(--tx3)'}">${val}</span></span>`;
  const last = doneAt ? step('เสร็จจริง',fdShort(doneAt),true)
    : closed ? step(escHtml(getSI(t.status).label),t.completedAt?fdShort(t.completedAt):'-',true)
    : !t.approvedAt ? step('คาดว่าเสร็จ','หลังอนุมัติ',false)
    : step('คาดว่าเสร็จ',`<span class="badge ${di.cls}" style="font-size:10.5px">${di.text}${di.sub?' · '+di.sub:''}</span>`,true);
  return `<div class="tl-strip">${step('แจ้ง',fdShort(t.createdAt),true)}<span class="tl-ar">→</span>${step('อนุมัติ',t.approvedAt?fdShort(t.approvedAt):'รออนุมัติ',!!t.approvedAt)}<span class="tl-ar">→</span>${last}</div>`;
}
function renderStatusList(tickets) {
  if (!tickets.length) return `<div class="empty"><div class="empty-ic"><i class="ti ti-clipboard-search"></i></div><div class="empty-ttl">ไม่พบรายการ</div><div class="empty-sub">ลองเปลี่ยนตัวกรอง — เมื่อมีการแจ้งซ่อมเข้ามา รายการจะแสดงที่นี่</div></div>`;
  return `<div style="display:flex;flex-direction:column;gap:.6rem">${tickets.map(t=>{
    const s=getSI(t.status),b=getBI(t.building);
    const pCls=t.priority==='high'?'b-red':t.priority==='med'?'b-amber':'b-gray';
    const pLbl={high:'เร่งด่วน',med:'ปานกลาง',low:'ปกติ'}[t.priority];
    const over=isOverSLA(t);
    const peCls=over?'pe-over':t.priority==='high'?'pe-high':t.priority==='med'?'pe-med':'pe-low';
    const di=dueInfo(t), ln=lastNote(t);

    return `<div class="rowc ${peCls}" style="align-items:flex-start">
        <div style="flex:1;min-width:0">
          <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:6px;align-items:center">
            <span class="mono">${t.id}</span>
            <span class="badge ${s.cls}">${s.label}</span>
            <span class="badge ${pCls} nodot">${pLbl}</span>
            ${t.source==='PM'?'<span class="badge b-teal nodot">🛠 PM</span>':''}
            ${over?'<span class="badge b-red">เกิน SLA</span>':''}
            ${rateBadge(t)}
            ${carbonBadge(t)}
          </div>
          <div style="font-weight:700;font-size:15.5px;line-height:1.35;margin-bottom:3px">${b.icon} ${escHtml(t.room)}</div>
          <div style="font-size:12px;color:var(--tx3);margin-bottom:6px">${b.name} · ${escHtml(t.category)}</div>
          <div style="font-size:13px;margin-bottom:4px"><i class="ti ti-user" style="color:var(--tx3)"></i> <b>${escHtml(t.name)}</b>${t.dept?` <span style="color:var(--tx2)">· ${escHtml(t.dept)}</span>`:''}${cu&&t.phone&&t.phone!=='-'?` <span style="color:var(--tx2)">· <i class="ti ti-phone"></i> ${escHtml(t.phone)}</span>`:''}</div>
          ${t.desc?`<div style="font-size:12.5px;color:var(--tx2);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin-bottom:6px">${escHtml(t.desc)}</div>`:''}
          ${timelineStrip(t)}
          ${ln?`<div style="font-size:12px;color:var(--tx2);margin-bottom:5px"><i class="ti ti-message-2" style="color:var(--tx3)"></i> ล่าสุด: ${escHtml(ln.note)} <span style="color:var(--tx3)">— ${escHtml(ln.by||'')} · ${fdShort(ln.date)}</span></div>`:''}
          <div style="font-size:12px">${assigneeChips(t.assignees)}</div>
        </div>
        <button class="btn btn-sm" onclick="openDet('${t.id}')"><i class="ti ti-eye"></i> ${rateState(t)&&rateState(t)!=='rated'?'ประเมิน':'รายละเอียด'}</button>
    </div>`;
  }).join('')}</div>`;
}
function filterStatus() {
  const q=(v('sq')||'').toLowerCase(),bl=v('sbld')||'',st2=v('ssta')||'',cat=v('scat')||'',pri=v('spri')||'',over=v('sover')||'',rate=v('srate')||'';
  let t=DB.tickets.slice().sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  if(st2!=='cancelled') t=t.filter(x=>x.status!=='cancelled'); // ซ่อนใบยกเลิก เว้นแต่เลือกกรองดูโดยตรง
  if(q) t=t.filter(x=>x.id.toLowerCase().includes(q)||(x.name||'').toLowerCase().includes(q)||getBI(x.building).name.toLowerCase().includes(q)||(x.room||'').toLowerCase().includes(q)||(x.desc||'').toLowerCase().includes(q));
  if(bl) t=t.filter(x=>x.building===bl);
  if(st2) t=t.filter(x=>x.status===st2);
  if(cat) t=t.filter(x=>x.category===cat);
  if(pri) t=t.filter(x=>x.priority===pri);
  if(over==='over') t=t.filter(x=>isOverSLA(x));
  if(rate==='unrated') t=t.filter(x=>['waiting','proxy'].includes(rateState(x)));
  else if(rate) t=t.filter(x=>rateState(x)===rate);
  document.getElementById('stlist').innerHTML=renderStatusList(t);
  const tbl=document.getElementById('sttable'); if(tbl) tbl.innerHTML=renderStatusTable(t);
  const fc=document.getElementById('filterCount');
  if(fc){ const active=[q&&'คำค้น',bl&&'อาคาร',st2&&'สถานะ',cat&&'ประเภท',pri&&'ความเร่งด่วน',over&&'SLA',rate&&'การประเมิน'].filter(Boolean);
    fc.textContent = active.length ? `พบ ${t.length} รายการ · กรองด้วย: ${active.join(', ')}` : `แสดงทั้งหมด ${t.length} รายการ`; }
}
function clearFilters(){
  ['sq','sbld','ssta','scat','spri','sover','srate'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
  filterStatus();
}

// v15.7: เอาหน้า QR Code ออกแล้ว (ใช้ป้าย QR ที่พิมพ์แยกแทน) — ลิงก์ ?b= เดิมยังใช้ได้
const _scripts={};
function loadScript(src){ if(_scripts[src]) return _scripts[src];
  return _scripts[src]=new Promise((ok,ng)=>{ const s=document.createElement('script'); s.src=src; s.onload=ok; s.onerror=()=>{ delete _scripts[src]; ng(new Error('โหลดไลบรารีไม่สำเร็จ')); }; document.head.appendChild(s); }); }

