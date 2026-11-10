// ระบบแจ้งซ่อมออนไลน์ — insight.js (v17.4) : Kanban · แผนผังจุดซ่อม (Heatmap) · โหมดจอทีวี · ค้นหาด่วน (Ctrl+K)
// ═══════════════════════════════════════════

function isLate(t){ const di=dueInfo(t); return !CLOSED_STATUS.includes(t.status) && /เกิน/.test(di.sub||''); }
function dueMs(t){ const d=dueDate(t); return d?new Date(d).getTime():9e15; }
// ════════ 1) Kanban ในหน้าจัดการงาน ════════
let MG_VIEW = (()=>{ try{ return localStorage.getItem('vr3_mgview')||'list'; }catch(e){ return 'list'; } })();
const KB_COLS = [
  { key:'assigned', title:'มอบหมายแล้ว', ic:'ti-user-check', st:['assigned'],                                     drop:'assigned' },
  { key:'working',  title:'กำลังซ่อม',   ic:'ti-tool',       st:['working','survey'],                             drop:'working' },
  { key:'wait',     title:'รอของ / ภายนอก', ic:'ti-hourglass', st:['pending_purchase','purchase','insurance','contractor'], drop:'?' },
  { key:'done',     title:'เสร็จ (14 วัน)', ic:'ti-circle-check', st:['done','cannot'],                           drop:'done' },
];
function kbCard(t){
  const b=getBI(t.building), s=getSI(t.status), di=dueInfo(t), late=isLate(t);
  return `<article class="kb-card ${t.priority==='high'?'hi':''} ${late?'late':''}" draggable="${can('manage_tickets')}" data-id="${escAttr(t.id)}" tabindex="0" aria-label="${escAttr(t.id+' '+(b.short||b.name)+' '+t.room)}">
    <div class="kb-top"><span class="mono">${escHtml(t.id)}</span>${t.priority==='high'?'<span class="kb-hi">ด่วน</span>':''}</div>
    <div class="kb-room">${b.icon} ${escHtml(t.room||'-')}</div>
    <div class="kb-meta">${escHtml(b.short||b.name)}</div><div style="margin-top:5px">${catChip(t.category)}</div>
    <div class="kb-foot"><span class="badge ${s.cls}">${s.label}</span><span class="kb-due ${late?'late':''}">${escHtml(di.sub&&/เกิน|วันนี้/.test(di.sub)?di.sub:di.text||'')}</span></div>
    <div class="kb-who">${(t.assignees||[]).map(u=>`<span class="kb-av" title="${escAttr(USERS[u]?.name||u)}">${escHtml(((USERS[u]?.name||u)+'').trim().charAt(0))}</span>`).join('')}</div>
  </article>`;
}
function renderKanban(box){
  const all=manageFiltered(), cut=Date.now()-14*86400000;
  box.innerHTML=`<div class="kb-board" role="list">${KB_COLS.map(c=>{
    let list=all.filter(t=>c.st.includes(t.status));
    if(c.key==='done') list=list.filter(t=>new Date(t.completedAt||t.createdAt).getTime()>=cut);
    list.sort((a,b)=>(b.priority==='high')-(a.priority==='high') || new Date(a.createdAt)-new Date(b.createdAt));
    return `<section class="kb-col" role="listitem" data-col="${c.key}" aria-label="${c.title} ${list.length} งาน">
      <header><i class="ti ${c.ic}" aria-hidden="true"></i>${c.title}<span class="kb-n">${list.length}</span></header>
      <div class="kb-list">${list.length?list.slice(0,60).map(kbCard).join(''):'<div class="kb-empty">— ว่าง —</div>'}</div></section>`;
  }).join('')}</div>
  ${can('manage_tickets')?'<div class="kb-hint">💡 ลากการ์ดไปคอลัมน์อื่นเพื่อเปลี่ยนสถานะ (มือถือ: แตะการ์ดเพื่อเปิดใบ)</div>':''}`;
  // drag & drop (เดสก์ท็อป)
  box.querySelectorAll('.kb-card').forEach(el=>{
    el.addEventListener('click',()=>openDet(el.dataset.id));
    el.addEventListener('keydown',e=>{ if(e.key==='Enter') openDet(el.dataset.id); });
    el.addEventListener('dragstart',e=>{ e.dataTransfer.setData('text/plain',el.dataset.id); el.classList.add('drag'); });
    el.addEventListener('dragend',()=>el.classList.remove('drag'));
  });
  box.querySelectorAll('.kb-col').forEach(col=>{
    col.addEventListener('dragover',e=>{ if(!can('manage_tickets')) return; e.preventDefault(); col.classList.add('over'); });
    col.addEventListener('dragleave',()=>col.classList.remove('over'));
    col.addEventListener('drop',e=>{ e.preventDefault(); col.classList.remove('over'); kbDrop(e.dataTransfer.getData('text/plain'), col.dataset.col); });
  });
}
function kbDrop(id, colKey){
  const t=DB.tickets.find(x=>x.id===id), c=KB_COLS.find(x=>x.key===colKey); if(!t||!c||c.st.includes(t.status)) return;
  if(c.drop==='working' && t.status==='assigned') return quickStatus(id,'working');
  openStatusUpdate(id);   // เสร็จ/รอของ: ให้กรอกค่าใช้จ่าย/งบ/หมายเหตุให้ครบในหน้าต่างอัปเดต
  const sel=document.getElementById('updSt');
  if(sel && c.drop!=='?' && [...sel.options].some(o=>o.value===c.drop)){ sel.value=c.drop; sel.dispatchEvent(new Event('change')); }
  else if(sel){ const ff=document.querySelector('.qs-select'); if(ff) ff.hidden=false; }
}
const _renderManageList0 = renderManageList;
renderManageList = function(){
  const box=document.getElementById('mgList'); if(!box) return;
  let bar=document.getElementById('mgView');
  if(!bar){ box.insertAdjacentHTML('beforebegin',`<div id="mgView" class="seg" role="tablist" aria-label="มุมมอง">
    <button role="tab" data-action="mg-view" data-v="list"><i class="ti ti-list"></i> รายการ</button>
    <button role="tab" data-action="mg-view" data-v="kanban"><i class="ti ti-layout-kanban"></i> Kanban</button></div>`); bar=document.getElementById('mgView'); }
  bar.querySelectorAll('button').forEach(b=>b.setAttribute('aria-selected',b.dataset.v===MG_VIEW));
  if(MG_VIEW==='kanban') renderKanban(box); else _renderManageList0();
};
ACTIONS['mg-view']=el=>{ MG_VIEW=el.dataset.v; try{ localStorage.setItem('vr3_mgview',MG_VIEW); }catch(e){} renderManageList(); };

// ════════ 2) แผนผังจุดซ่อม (Heatmap ตามอาคาร/ชั้น/ห้อง) ════════
const HM={ b:'', m:6, room:null };
function splitRoom(room){ const p=String(room||'').split(' — '); return p.length>1?{fl:p[0].trim(),rm:p.slice(1).join(' — ').trim()}:{fl:'',rm:p[0].trim()}; }
function heatmapCard(){
  const b=HM.b||(BUILDINGS[0]&&BUILDINGS[0].id)||''; if(!b) return '';
  const since=new Date(); since.setMonth(since.getMonth()-HM.m);
  const T=DB.tickets.filter(t=>t.building===b && t.status!=='cancelled' && new Date(t.createdAt)>=since);
  const fls=floorsOf(b), grid={}; let max=0;
  T.forEach(t=>{ const {fl,rm}=splitRoom(t.room); const f=fl||'?'; const k=rm.toLowerCase(); grid[f]=grid[f]||{}; const g=grid[f][k]=grid[f][k]||{rm,n:0,open:0,ids:[]}; g.n++; if(!CLOSED_STATUS.includes(t.status)) g.open++; g.ids.push(t.id); max=Math.max(max,g.n); });
  const order=[...fls].reverse().concat(Object.keys(grid).filter(f=>!fls.includes(f)));
  const lvl=n=>n<=0?0:Math.min(5,Math.ceil(n/Math.max(1,max)*5));
  const rows=order.filter(f=>grid[f]||fls.includes(f)).map(f=>{
    const cells=Object.values(grid[f]||{}).sort((a,b)=>b.n-a.n);
    return `<div class="hm-row"><div class="hm-fl">${f==='?'?'ไม่ระบุ':escHtml(flLabel(f))}</div><div class="hm-cells">${cells.length?cells.map(c=>
      `<button type="button" class="hm-cell l${lvl(c.n)}" data-action="hm-room" data-ids="${escAttr(c.ids.join(','))}" data-label="${escAttr((f==='?'?'':flLabel(f)+' · ')+c.rm)}" title="${escAttr(c.rm)}: ${c.n} ครั้ง${c.open?' · ค้าง '+c.open:''}">
        <span class="hm-rm">${escHtml(c.rm)}</span><b>${c.n}</b>${c.open?`<i class="hm-open" aria-label="ค้าง ${c.open}"></i>`:''}</button>`).join(''):'<span class="hm-none">ไม่มีงาน</span>'}</div></div>`;
  }).join('');
  return `<div class="card hm-card" id="hmCard">
    <div class="ctitle" style="justify-content:space-between;flex-wrap:wrap;gap:8px"><span>🗺️ แผนผังจุดซ่อม</span>
      <span style="display:flex;gap:6px;flex-wrap:wrap">
        <select aria-label="อาคาร" data-hm="b" style="width:auto;padding:4px 8px">${BUILDINGS.map(x=>`<option value="${escAttr(x.id)}" ${x.id===b?'selected':''}>${escHtml(x.icon+' '+(x.short||x.name))}</option>`).join('')}</select>
        <select aria-label="ช่วงเวลา" data-hm="m" style="width:auto;padding:4px 8px">${[3,6,12,24].map(m=>`<option value="${m}" ${m===HM.m?'selected':''}>${m} เดือนล่าสุด</option>`).join('')}</select></span></div>
    <div class="hm-legend"><span>น้อย</span>${[1,2,3,4,5].map(i=>`<i class="hm-cell l${i}"></i>`).join('')}<span>มาก</span><span style="margin-left:auto">● = มีงานค้าง · ${T.length} งาน</span></div>
    <div class="hm-grid">${rows||'<div class="empty-sub">ยังไม่มีข้อมูล</div>'}</div>
    <div id="hmList"></div></div>`;
}
RENDER_HOOKS.push((p,root)=>{
  if(p!=='dashboard') return;
  root.insertAdjacentHTML('beforeend',heatmapCard());
  root.querySelectorAll('[data-hm]').forEach(s=>s.addEventListener('change',()=>{ HM[s.dataset.hm]=s.dataset.hm==='m'?+s.value:s.value; const c=document.getElementById('hmCard'); c.outerHTML=heatmapCard(); rebindHM(); }));
});
function rebindHM(){ document.querySelectorAll('#hmCard [data-hm]').forEach(s=>s.addEventListener('change',()=>{ HM[s.dataset.hm]=s.dataset.hm==='m'?+s.value:s.value; document.getElementById('hmCard').outerHTML=heatmapCard(); rebindHM(); })); }
ACTIONS['hm-room']=el=>{
  const ids=el.dataset.ids.split(','), L=document.getElementById('hmList');
  document.querySelectorAll('.hm-cell.sel').forEach(x=>x.classList.remove('sel')); el.classList.add('sel');
  L.innerHTML=`<div class="hm-detail"><b>${escHtml(el.dataset.label)}</b> — ${ids.length} ครั้ง${ids.length>=OPS.hotCount?' <span class="chip" style="background:var(--red-bg);color:var(--red-tx)">จุดซ่อมซ้ำ</span>':''}
    <ul>${ids.map(id=>DB.tickets.find(t=>t.id===id)).filter(Boolean).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).map(t=>`<li><button type="button" class="linkish" data-action="open-ticket" data-id="${escAttr(t.id)}">${fd(t.createdAt)} · ${escHtml(t.category)} · ${escHtml(String(t.desc||'').slice(0,60))}</button> <span class="badge ${getSI(t.status).cls}">${getSI(t.status).label}</span></li>`).join('')}</ul></div>`;
};

// ════════ 3) โหมดจอทีวี (?tv=1) ════════
let _tvTimer=null;
function tvHTML(){
  const open=DB.tickets.filter(t=>!CLOSED_STATUS.includes(t.status)&&t.status!=='pending_approval'&&t.status!=='cancelled');
  const over=open.filter(isLate);
  const today=new Date().toDateString();
  const doneToday=DB.tickets.filter(t=>t.status==='done'&&t.completedAt&&new Date(t.completedAt).toDateString()===today).length;
  const pend=DB.tickets.filter(t=>t.status==='pending_approval').length;
  const list=open.slice().sort((a,b)=>(b.priority==='high')-(a.priority==='high')||(dueMs(a)-dueMs(b))).slice(0,12);
  const d=new Date();
  return `<div class="tv-head"><div><b>ระบบแจ้งซ่อม</b> · งานอาคารสถานที่ คณะการแพทย์แผนไทย</div><div class="tv-clock">${d.toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'})}<small>${d.toLocaleDateString('th-TH',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</small></div><button class="tv-x" data-action="tv-close" aria-label="ออกจากโหมดจอทีวี">✕</button></div>
  <div class="tv-kpi"><div><span>กำลังดำเนินการ</span><b>${open.length}</b></div><div class="r"><span>เกินกำหนด</span><b>${over.length}</b></div><div class="a"><span>รออนุมัติ</span><b>${pend}</b></div><div class="g"><span>เสร็จวันนี้</span><b>${doneToday}</b></div></div>
  <div class="tv-list">${list.map(t=>{ const b=getBI(t.building), s=getSI(t.status), di=dueInfo(t); return `<div class="tv-row ${isLate(t)?'late':''}"><span class="mono">${escHtml(t.id)}</span><span class="tv-pl">${b.icon} ${escHtml((b.short||b.name)+' · '+(t.room||''))}<small>${escHtml(t.category)}${t.priority==='high'?' · 🔴 ด่วน':''}</small></span><span class="badge ${s.cls}">${s.label}</span><span class="tv-who">${escHtml((t.assignees||[]).map(u=>USERS[u]?.name||u).join(', ')||'-')}</span><span class="tv-due">${escHtml(di.text||'')}${di.sub?`<small>${escHtml(di.sub)}</small>`:''}</span></div>`; }).join('')||'<div class="tv-empty">🎉 ไม่มีงานค้าง</div>'}</div>
  <div class="tv-foot">อัปเดตอัตโนมัติทุก 1 นาที · ล่าสุด ${d.toLocaleTimeString('th-TH')}</div>`;
}
function openTV(){
  let el=document.getElementById('tvMode'); if(!el){ el=document.createElement('div'); el.id='tvMode'; el.className='tv-mode'; el.setAttribute('role','dialog'); el.setAttribute('aria-label','โหมดจอทีวี'); document.body.appendChild(el); }
  el.innerHTML=tvHTML(); el.hidden=false; document.body.classList.add('tv-on');
  try{ document.documentElement.requestFullscreen&&document.documentElement.requestFullscreen().catch(()=>{}); }catch(e){}
  clearInterval(_tvTimer); _tvTimer=setInterval(async()=>{ try{ await loadAll({silent:true}); }catch(e){} const x=document.getElementById('tvMode'); if(x&&!x.hidden) x.innerHTML=tvHTML(); },60000);
}
function closeTV(){ const el=document.getElementById('tvMode'); if(el) el.hidden=true; document.body.classList.remove('tv-on'); clearInterval(_tvTimer); try{ document.fullscreenElement&&document.exitFullscreen(); }catch(e){} }
ACTIONS['tv-close']=closeTV;
document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&document.body.classList.contains('tv-on')) closeTV(); });
try{ if(new URLSearchParams(location.search).get('tv')==='1') window.addEventListener('load',()=>setTimeout(openTV,1200)); }catch(e){}

// ════════ 4) ค้นหาด่วน (Ctrl+K หรือ /) ════════
let PAL={ q:'', i:0, items:[] };
function palItems(q){
  q=q.trim().toLowerCase(); const out=[];
  const pages=NAV_ITEMS.filter(it=>it.pub||(cu&&navAllowed(it.p))).map(it=>({kind:'หน้า',icon:it.icon,label:it.label,run:()=>gp(it.p)}));
  const acts=[{kind:'คำสั่ง',icon:'ti-plus',label:'แจ้งซ่อมใหม่',run:()=>gp('report')},{kind:'คำสั่ง',icon:'ti-device-tv',label:'โหมดจอทีวี',run:openTV},{kind:'คำสั่ง',icon:'ti-contrast-2',label:'สลับโหมดสี',run:toggleTheme}];
  if(cu&&(cu.isEngineer||can('manage_config'))) acts.push({kind:'คำสั่ง',icon:'ti-qrcode',label:'QR ประจำห้อง',run:()=>gp('roomqr')});
  const match=s=>!q||String(s).toLowerCase().includes(q);
  out.push(...pages.filter(x=>match(x.label)), ...acts.filter(x=>match(x.label)));
  if(q.length>=2){
    DB.tickets.filter(t=>[t.id,t.room,t.desc,t.category,t.name,getBI(t.building).name].some(match)).slice(0,8)
      .forEach(t=>out.unshift({kind:'ใบงาน',icon:'ti-file-text',label:`${t.id} · ${getBI(t.building).short||''} ${t.room||''}`,sub:`${t.category} · ${getSI(t.status).label}`,run:()=>openDet(t.id)}));
  }
  return out.slice(0,12);
}
function openPalette(){
  let d=document.getElementById('palDlg');
  if(!d){ d=document.createElement('dialog'); d.id='palDlg'; d.className='pal-dlg'; d.setAttribute('aria-label','ค้นหาด่วน');
    d.innerHTML=`<div class="pal-in"><i class="ti ti-search" aria-hidden="true"></i><input id="palQ" placeholder="ค้นหาใบงาน ห้อง หรือคำสั่ง..." autocomplete="off" role="combobox" aria-expanded="true" aria-controls="palList"><kbd>Esc</kbd></div><ul id="palList" role="listbox"></ul>`;
    document.body.appendChild(d);
    const inp=d.querySelector('#palQ');
    inp.addEventListener('input',()=>{ PAL.q=inp.value; PAL.i=0; palPaint(); });
    inp.addEventListener('keydown',e=>{
      if(e.key==='ArrowDown'){ PAL.i=Math.min(PAL.items.length-1,PAL.i+1); palPaint(); e.preventDefault(); }
      else if(e.key==='ArrowUp'){ PAL.i=Math.max(0,PAL.i-1); palPaint(); e.preventDefault(); }
      else if(e.key==='Enter'){ palRun(PAL.i); e.preventDefault(); } });
    d.addEventListener('click',e=>{ if(e.target===d) d.close(); });
  }
  PAL={q:'',i:0,items:[]}; d.querySelector('#palQ').value=''; palPaint();
  d.showModal(); d.querySelector('#palQ').focus();
}
function palPaint(){
  PAL.items=palItems(PAL.q);
  document.getElementById('palList').innerHTML=PAL.items.map((x,k)=>`<li role="option" aria-selected="${k===PAL.i}" data-action="pal-run" data-k="${k}"><i class="ti ${x.icon}" aria-hidden="true"></i><span>${escHtml(x.label)}${x.sub?`<small>${escHtml(x.sub)}</small>`:''}</span><em>${x.kind}</em></li>`).join('')||'<li class="pal-none">ไม่พบ</li>';
  document.querySelector('#palList [aria-selected="true"]')?.scrollIntoView({block:'nearest'});
}
function palRun(k){ const x=PAL.items[k]; if(!x) return; document.getElementById('palDlg').close(); x.run(); }
ACTIONS['pal-run']=el=>palRun(+el.dataset.k);
document.addEventListener('keydown',e=>{
  const typing=/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName||'');
  if(((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k') || (e.key==='/'&&!typing)){ e.preventDefault(); openPalette(); }
});
