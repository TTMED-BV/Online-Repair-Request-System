// ระบบแจ้งซ่อมออนไลน์ — ui.js (v17.6) : โครงสร้าง UI กลาง
//   v17.0 เมนูตามบทบาท (เดสก์ท็อป: เมนูหลัก + "เพิ่มเติม" · มือถือ: แถบเมนูล่าง) · ธีม 3 สถานะ · skeleton
//   v17.2 event delegation (data-action) · วาดหน้าใหม่โดยคงตำแหน่งเลื่อน/โฟกัส · หน้าเสริม (EXTRA_PAGES)
// ═══════════════════════════════════════════

// ─── บทบาทหลักของผู้ใช้ (ใช้จัดเมนู) ───
function navRole(){
  if(!cu) return 'public';
  if(cu.isEngineer) return 'engineer';
  if(can('approve_ticket')) return 'approver';
  if(can('manage_tickets')) return 'tech';
  return 'staff';
}
// เมนูหลักที่เห็นทันทีตามบทบาท (ที่เหลือไปอยู่ใน "เพิ่มเติม")
const NAV_PRIMARY = {
  public:   ['report','status','dashboard','help'],
  staff:    ['report','mine','status','dashboard'],
  tech:     ['mywork','report','status','calendar'],
  approver: ['approve','manage','dashboard','report'],
  engineer: ['manage','approve','dashboard','mywork','pm'],
};
const NAV_ICON = Object.fromEntries(NAV_ITEMS.map(i=>[i.p,i.icon]));
const NAV_LABEL = Object.fromEntries(NAV_ITEMS.map(i=>[i.p,i.label]));
const TABBAR_LABEL = {mywork:'งานของฉัน', mine:'ใบที่ฉันแจ้ง', approve:'อนุมัติ', manage:'จัดการงาน', report:'แจ้งซ่อม', status:'ติดตาม', dashboard:'สถิติ', calendar:'ปฏิทิน', pm:'PM', help:'วิธีใช้'};
function navVisible(p){ const t=document.querySelector(`.ntab[data-p="${p}"]`); return !!t && t.style.display!=='none'; }

function arrangeNav(){
  const prim=NAV_PRIMARY[navRole()]||NAV_PRIMARY.public;
  const tabs=[...document.querySelectorAll('#navTabs > .ntab')];
  const extra=[];
  tabs.forEach(t=>{
    const p=t.dataset.p, vis=t.style.display!=='none';
    const isPrim=prim.includes(p) || p===curPage && false;
    t.classList.toggle('more-hidden', vis && !isPrim);
    if(vis && !isPrim) extra.push(p);
    t.setAttribute('aria-current', p===curPage?'page':'false');
  });
  // เรียงเมนูหลักตามลำดับความสำคัญของบทบาท
  const box=document.getElementById('navTabs');
  prim.forEach(p=>{ const t=box.querySelector(`.ntab[data-p="${p}"]`); if(t) box.insertBefore(t, box.querySelector('.nav-more')); });
  let more=box.querySelector('.nav-more');
  if(!more){ more=document.createElement('div'); more.className='nav-more';
    more.innerHTML='<button class="ntab" type="button" aria-haspopup="true" aria-expanded="false" data-action="nav-more">เพิ่มเติม <i class="ti ti-chevron-down" aria-hidden="true"></i></button><div class="nav-more-menu" role="menu"></div>';
    box.appendChild(more); }
  more.style.display=extra.length?'':'none';
  more.querySelector('.ntab').classList.toggle('on', extra.includes(curPage));
  more.querySelector('.nav-more-menu').innerHTML=extra.map(p=>`<button role="menuitem" data-action="go" data-p="${p}" ${p===curPage?'aria-current="page"':''}><i class="ti ${NAV_ICON[p]||'ti-point'}" aria-hidden="true"></i>${escHtml(NAV_LABEL[p]||p)}</button>`).join('')
    + (cu&&navAllowed('config')?`<button role="menuitem" data-action="go" data-p="config"><i class="ti ti-settings" aria-hidden="true"></i>ตั้งค่า</button>`:'')
    + (cu&&(cu.isEngineer||can('manage_config'))?`<button role="menuitem" data-action="go" data-p="roomqr"><i class="ti ti-qrcode" aria-hidden="true"></i>QR ประจำห้อง</button>`:'')
    + `<button role="menuitem" data-action="tv"><i class="ti ti-device-tv" aria-hidden="true"></i>โหมดจอทีวี</button>`
    + `<button role="menuitem" data-action="palette"><i class="ti ti-search" aria-hidden="true"></i>ค้นหาด่วน <kbd style="margin-left:auto;font-size:11px;opacity:.7">Ctrl K</kbd></button>`;
  const cfg=document.getElementById('nt-cfg'); if(cfg) cfg.classList.add('more-hidden');
}
function buildTabbar(){
  let bar=document.getElementById('tabbar');
  if(!bar){ bar=document.createElement('nav'); bar.id='tabbar'; bar.className='tabbar'; bar.setAttribute('aria-label','เมนูหลัก'); document.body.appendChild(bar); document.body.classList.add('has-tabbar'); }
  const prim=(NAV_PRIMARY[navRole()]||NAV_PRIMARY.public).filter(p=>p!=='help'&&(navVisible(p)||['report','status','dashboard'].includes(p))).slice(0,4);
  const apv=DB.tickets.filter(t=>t.status==='pending_approval').length, my=cu?myWorkCount():0;
  bar.innerHTML=prim.map(p=>{
    const n=p==='approve'?apv:p==='mywork'?my:0;
    return `<button type="button" data-action="go" data-p="${p}" ${p===curPage?'aria-current="page"':''}><i class="ti ${NAV_ICON[p]||'ti-point'}" aria-hidden="true"></i>${TABBAR_LABEL[p]||NAV_LABEL[p]}${n?`<span class="tb-n" aria-label="${n} รายการ">${n>99?'99+':n}</span>`:''}</button>`;
  }).join('') + `<button type="button" data-action="menu" ${prim.includes(curPage)?'':'aria-current="page"'}><i class="ti ti-menu-2" aria-hidden="true"></i>เมนู</button>`;
}
// ผูกกับ buildMobileMenu เดิม (ถูกเรียกทุกครั้งที่เปลี่ยนหน้า/ล็อกอิน)
const _buildMobileMenu0 = buildMobileMenu;
buildMobileMenu = function(){ _buildMobileMenu0(); try{ arrangeNav(); buildTabbar(); }catch(e){ console.warn('nav',e); } };

// ─── ธีม 3 สถานะ: อัตโนมัติ (ตามเครื่อง) → สว่าง → มืด ───
const _mq = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
function themeMode(){ try{ return localStorage.getItem('vr3_theme')||'auto'; }catch(e){ return 'auto'; } }
function applyThemeMode(){
  const m=themeMode(), t=m==='auto'?(_mq&&_mq.matches?'dark':'light'):m;
  applyTheme(t);
  const b=document.getElementById('themeBtn');
  if(b){ b.dataset.mode=m; b.textContent=m==='auto'?'🌓':t==='dark'?'🌙':'☀️'; b.title='โหมดสี: '+({auto:'อัตโนมัติตามเครื่อง',light:'สว่าง',dark:'มืด'}[m])+' (กดเพื่อเปลี่ยน)'; b.setAttribute('aria-label',b.title); }
}
function cycleThemeMode(){
  const order=['auto','light','dark'], m=order[(order.indexOf(themeMode())+1)%3];
  try{ localStorage.setItem('vr3_theme',m); }catch(e){}
  applyThemeMode(); showToast('โหมดสี: '+({auto:'อัตโนมัติตามเครื่อง',light:'สว่าง',dark:'มืด'}[m]));
}
if(_mq && _mq.addEventListener) _mq.addEventListener('change',()=>{ if(themeMode()==='auto') applyThemeMode(); });

// ชื่อชั้นสำหรับแสดงผล (ข้อมูลบางอาคารเก็บเป็น "ชั้น 3" อยู่แล้ว)
function flLabel(f){ f=String(f||'').trim(); return !f?'':/^(ชั้น|ดาดฟ้า|B)/.test(f)?f:'ชั้น '+f; }

// รหัสเครื่อง (สุ่มครั้งเดียว ใช้จำกัดจำนวนการแจ้งต่อชั่วโมง — ไม่ใช่ข้อมูลส่วนตัว)
function deviceId(){ try{ let d=localStorage.getItem('vr3_dev'); if(!d){ d=Math.random().toString(36).slice(2,10)+Date.now().toString(36).slice(-4); localStorage.setItem('vr3_dev',d); } return d; }catch(e){ return ''; } }

// ─── Skeleton ───
function skeletonCards(n=3){
  return Array.from({length:n},()=>`<div class="card sk-card" aria-hidden="true"><div class="sk" style="height:14px;width:38%"></div><div class="sk" style="height:12px;width:82%;margin-top:12px"></div><div class="sk" style="height:12px;width:64%;margin-top:8px"></div><div class="sk" style="height:26px;width:96px;margin-top:14px;border-radius:999px"></div></div>`).join('');
}

// ─── v17.2: หน้าเสริม + วาดใหม่โดยคงตำแหน่งเลื่อน/โฟกัส ───
const EXTRA_PAGES = {};      // { page: {render:()=>html, after:()=>{} , allow:()=>bool} }
const _rp0 = rp; let _lastPage=null;
rp = function(){
  const c=document.getElementById('pg'); if(!c) return;
  const same=_lastPage===curPage, y=window.scrollY;
  const ae=document.activeElement, fid=ae&&ae.id&&c.contains(ae)?ae.id:null;
  const sel=fid&&('selectionStart' in ae)?[ae.selectionStart,ae.selectionEnd]:null;
  c.classList.toggle('pg-enter', !same);
  const X=EXTRA_PAGES[curPage];
  if(X){ c.innerHTML=X.render(); X.after&&X.after(); } else _rp0();
  _lastPage=curPage;
  if(same){ window.scrollTo(0,y);
    if(fid){ const el=document.getElementById(fid); if(el){ el.focus({preventScroll:true}); try{ if(sel) el.setSelectionRange(sel[0],sel[1]); }catch(e){} } } }
  try{ RENDER_HOOKS.forEach(h=>h(curPage,c)); }catch(e){ console.warn(e); }
};
const RENDER_HOOKS=[];       // ฟังก์ชันที่เรียกหลังวาดหน้า (เช่น เติมปุ่ม Kanban / heatmap)
const _gp0 = gp;
gp = function(p){
  const X=EXTRA_PAGES[p];
  if(X){ if(X.allow && !X.allow()){ if(!cu){ pendingPage=p; oLogin(); } else showToast('บทบาทของคุณไม่มีสิทธิ์เข้าหน้านี้'); return; }
    curPage=p; document.querySelectorAll('.ntab').forEach(t=>t.classList.toggle('on',t.dataset.p===p)); buildMobileMenu(); rp(); window.scrollTo(0,0); return; }
  const prev=curPage; _gp0(p); if(prev!==curPage) window.scrollTo(0,0);
  closeNavMore();
};

// ─── v17.2: Event delegation — ปุ่มใหม่ทั้งหมดใช้ data-action แทน onclick ───
const ACTIONS = {
  'go':      el=>{ closeNavMore(); gp(el.dataset.p); },
  'menu':    ()=>toggleMenu(),
  'nav-more':el=>{ const m=el.parentElement.querySelector('.nav-more-menu'); const o=!m.classList.contains('open'); m.classList.toggle('open',o); el.setAttribute('aria-expanded',o); if(o) m.querySelector('button')?.focus(); },
  'tv':      ()=>{ closeNavMore(); openTV(); },
  'palette': ()=>{ closeNavMore(); openPalette(); },
  'open-ticket': el=>openDet(el.dataset.id),
};
function closeNavMore(){ document.querySelectorAll('.nav-more-menu.open').forEach(m=>{ m.classList.remove('open'); m.parentElement.querySelector('.ntab')?.setAttribute('aria-expanded','false'); }); }
document.addEventListener('click', e=>{
  const el=e.target.closest('[data-action]');
  if(!el){ if(!e.target.closest('.nav-more')) closeNavMore(); return; }
  const fn=ACTIONS[el.dataset.action]; if(fn){ e.preventDefault(); fn(el,e); }
});
document.addEventListener('keydown', e=>{ if(e.key==='Escape') closeNavMore(); });

// ─── v17.0 Accessibility: ปุ่มที่มีแต่ไอคอน/✕ ต้องมีชื่อให้โปรแกรมอ่านหน้าจอ ───
function a11yFix(root){
  (root||document).querySelectorAll('button:not([aria-label]),a.btn:not([aria-label])').forEach(b=>{
    const txt=b.textContent.replace(/\s+/g,'').trim();
    if(b.classList.contains('mc')||txt==='✕'||txt==='×') b.setAttribute('aria-label','ปิด');
    else if(!txt && b.title) b.setAttribute('aria-label',b.title);
  });
}
try{ new MutationObserver(ms=>{ for(const m of ms) m.addedNodes.forEach(n=>{ if(n.nodeType===1) a11yFix(n); }); }).observe(document.body,{childList:true,subtree:true}); }catch(e){}
document.addEventListener('DOMContentLoaded',()=>a11yFix());

// ─── v17.3: สี + ไอคอนประจำประเภทงาน (ใช้ทั้งระบบ: ฟอร์มแจ้งซ่อม · ป้ายในการ์ด · Kanban) ───
const CAT_STYLE_EXACT = {
  'ระบบไฟฟ้า':                  { ic:'bolt',             c:'#F5A300' },
  'ระบบประปา/สุขาภิบาล':         { ic:'droplet',          c:'#2F7FF0' },
  'ระบบปรับอากาศ':               { ic:'air-conditioning', c:'#06B6D4' },
  'งานโครงสร้างอาคาร':           { ic:'building',         c:'#F26B1D' },
  'ระบบสื่อสาร/เครือข่าย IT':     { ic:'network',          c:'#10B981' },
  'งานครุภัณฑ์/เฟอร์นิเจอร์':      { ic:'armchair',         c:'#F43F5E' },
  'คอมพิวเตอร์':                 { ic:'device-desktop',   c:'#6366F1' },
  'ระบบภาพและเสียงในห้องเรียน':   { ic:'device-tv+volume', c:'#D946EF' },
  'อื่นๆ':                       { ic:'dots',             c:'#64748B' },
};
// หมวดที่ตั้งชื่อใหม่ภายหลัง: เดาจากคำในชื่อก่อน แล้วค่อยใช้ชุดสำรอง (ไม่ซ้ำกับชุดหลัก)
const CAT_STYLE_WORDS = [[/ไฟฟ้า/,'ระบบไฟฟ้า'],[/ประปา|สุขา|น้ำ/,'ระบบประปา/สุขาภิบาล'],[/อากาศ|แอร์/,'ระบบปรับอากาศ'],[/โครงสร้าง|โยธา|อาคาร/,'งานโครงสร้างอาคาร'],
  [/เครือข่าย|สื่อสาร|อินเทอร์เน็ต|network/i,'ระบบสื่อสาร/เครือข่าย IT'],[/ครุภัณฑ์|เฟอร์นิเจอร์|โต๊ะ|เก้าอี้/,'งานครุภัณฑ์/เฟอร์นิเจอร์'],[/คอมพิวเตอร์|computer/i,'คอมพิวเตอร์'],[/ภาพ|เสียง|โปรเจก/,'ระบบภาพและเสียงในห้องเรียน'],[/^อื่น/,'อื่นๆ']];
const CAT_STYLE_SPARE = [ {ic:'tool',c:'#0EA5A0'},{ic:'flame',c:'#E11D48'},{ic:'trees',c:'#65A30D'},{ic:'lock',c:'#7C3AED'},{ic:'elevator',c:'#0284C7'},{ic:'recycle',c:'#16A34A'},{ic:'paint',c:'#DB2777'},{ic:'key',c:'#CA8A04'} ];
function catStyle(name){
  name=String(name||'').trim();
  if(CAT_STYLE_EXACT[name]) return CAT_STYLE_EXACT[name];
  const w=CAT_STYLE_WORDS.find(([re])=>re.test(name)); if(w) return CAT_STYLE_EXACT[w[1]];
  let h=0; for(const ch of name) h=(h*31+ch.charCodeAt(0))>>>0;
  return CAT_STYLE_SPARE[h%CAT_STYLE_SPARE.length];
}
function catIconHTML(name){ const s=catStyle(name); return s.ic.split('+').map(i=>`<i class="ti ti-${i}" aria-hidden="true"></i>`).join(''); }
// ป้ายประเภทงานสี (ใช้ในการ์ด/รายการ)
function catChip(name){ const s=catStyle(name); return `<span class="cat-chip" style="--c:${s.c}"><span class="cat-chip-ic">${catIconHTML(name).split('</i>')[0]}</i></span>${escHtml(name||'-')}</span>`; }
