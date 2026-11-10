// ระบบแจ้งซ่อมออนไลน์ — init.js (v17.5) : เริ่มต้นโปรแกรม · ธีม · ตรวจเวอร์ชันใหม่
// โหลดตามลำดับใน index.html (classic script ใช้ตัวแปรร่วมกัน)
// ════════════════════════ INIT ════════════════════════
// กู้คืน session เดิม (ถ้ามี) — เซิร์ฟเวอร์จะปฏิเสธเองถ้า token หมดอายุ
// ─── ล้างข้อมูลเก่าครั้งเดียว เมื่อเปลี่ยนมาเป็นคณะการแพทย์แผนไทย ───
(function migrateData(){
  const DATA_VERSION='sahavej-2026';   // เปลี่ยนค่านี้เมื่อต้องการล้างแคชผู้ใช้ทุกคนอีกครั้ง
  if(localStorage.getItem('vr3_dataver')!==DATA_VERSION){
    // ล้างแคชข้อมูลเก่าทั้งหมด (อาคารเดิม/รายการซ่อม/รูป/ผู้ใช้)
    ['vr3_t','vr3_hist','vr3_cfg','vr3_photos','vr3_users','vr3_cache_at'].forEach(k=>localStorage.removeItem(k));
    localStorage.setItem('vr3_dataver',DATA_VERSION);
  }
})();

// ─── โหมดมืด/สว่าง ───
function applyTheme(t){
  document.documentElement.setAttribute('data-theme', t);
  const btn=document.getElementById('themeBtn');
  if(btn) btn.textContent = t==='dark' ? '☀️' : '🌙';
}
function toggleTheme(){ cycleThemeMode(); }   // v17: อัตโนมัติ → สว่าง → มืด (js/ui.js)

// ══ v15.3: ธีมเทศกาล ══
const SEASONS={ normal:{label:'ปกติ (ไทย)',icon:'🌿'}, halloween:{label:'ฮาโลวีน',icon:'🎃'}, xmas:{label:'คริสต์มาส',icon:'🎄'} };
function seasonPref(){ try{ return localStorage.getItem('vr3_season')||'auto'; }catch(e){ return 'auto'; } }
function seasonFx(){ try{ return localStorage.getItem('vr3_seasonfx')!=='off'; }catch(e){ return true; } }
function autoSeason(d){ d=d||new Date(); const m=d.getMonth(), dd=d.getDate();
  if(m===9 && dd>=20) return 'halloween';   // 20–31 ต.ค.
  if(m===11) return 'xmas';                  // 1–31 ธ.ค.
  return 'normal'; }
function curSeason(){ const p=seasonPref(); return SEASONS[p]?p:autoSeason(); }
function applySeason(){
  const s=curSeason(), root=document.documentElement;
  if(s==='normal') root.removeAttribute('data-season'); else root.setAttribute('data-season',s);
  const b=document.getElementById('seasonBtn'); if(b) b.textContent=SEASONS[s].icon;
  const tc=document.querySelector('meta[name=theme-color]'); if(tc) tc.setAttribute('content', s==='halloween'?'#2b1240':s==='xmas'?'#7c1420':'#1d4632');
  // แถบประดับ
  const deco=document.getElementById('seasonDeco');
  if(deco){ let h='';
    if(s==='xmas'){ const cols=['#e53935','#fdd835','#43a047','#1e88e5','#fb8c00'];
      for(let i=0;i<40;i++) h+=`<i style="left:${i*2.5+0.8}%;color:${cols[i%5]};background:${cols[i%5]};animation-delay:${(i%5)*.3}s"></i>`; }
    else if(s==='halloween'){ for(let i=0;i<26;i++) h+=`<i style="left:${i*3.85+1}%;background:${i%3===2?'#58207a':'#f08a24'};animation-delay:${(i%4)*.4}s"></i>`; }
    deco.innerHTML=h; }
  // ของร่วงเบา ๆ
  const fall=document.getElementById('seasonFall');
  if(fall){ let h='';
    if(s!=='normal' && seasonFx()){
      const items = s==='xmas' ? ['❄','❅','❆','❄'] : ['🍂','🦇','🍁','🍂'];
      const n = window.innerWidth<700 ? 10 : 18;
      for(let i=0;i<n;i++){ const dur=12+Math.random()*12, sz=s==='xmas'?(10+Math.random()*12):(14+Math.random()*10);
        h+=`<span style="left:${Math.random()*100}%;font-size:${sz}px;color:${s==='xmas'?'#9ecbe8':'inherit'};animation-duration:${dur}s;animation-delay:${-Math.random()*dur}s;--dx:${(Math.random()*120-60).toFixed(0)}px;--rot:${(Math.random()*360).toFixed(0)}deg;opacity:${s==='xmas'?.75:.6}">${items[i%items.length]}</span>`; }
    }
    fall.innerHTML=h; }
  renderSeasonMenu();
}
function setSeason(p){ try{ localStorage.setItem('vr3_season',p); }catch(e){} applySeason(); buildMobileMenu(); }
function setSeasonFx(on){ try{ localStorage.setItem('vr3_seasonfx',on?'on':'off'); }catch(e){} applySeason(); }
function cycleSeason(){ const order=['auto','normal','halloween','xmas']; const i=order.indexOf(seasonPref()); setSeason(order[(i+1)%order.length]); showToast('ธีม: '+SEASONS[curSeason()].label+(seasonPref()==='auto'?' (อัตโนมัติ)':'')); }
function renderSeasonMenu(){
  const m=document.getElementById('seasonMenu'); if(!m) return;
  const p=seasonPref(), a=autoSeason();
  m.innerHTML=`<button class="${p==='auto'?'on':''}" onclick="setSeason('auto')">🗓️ อัตโนมัติตามเทศกาล <span style="margin-left:auto;font-size:12px;color:var(--tx3)">ตอนนี้: ${SEASONS[a].icon}</span></button>
    <div class="sm-sep"></div>
    ${Object.entries(SEASONS).map(([k,v])=>`<button class="${p===k?'on':''}" onclick="setSeason('${k}')">${v.icon} ${v.label}</button>`).join('')}
    <div class="sm-sep"></div>
    <button onclick="setSeasonFx(${seasonFx()?'false':'true'})">${seasonFx()?'✅':'⬜'} ของร่วง (หิมะ/ใบไม้)</button>
    <div class="sm-note">อัตโนมัติ: ฮาโลวีน 20–31 ต.ค. · คริสต์มาส 1–31 ธ.ค.<br>โหมดสว่าง/มืดใช้ปุ่ม 🌙 ข้าง ๆ</div>`;
}
function toggleSeasonMenu(ev){ ev&&ev.stopPropagation(); const m=document.getElementById('seasonMenu'); if(!m) return; renderSeasonMenu(); m.classList.toggle('open'); }
document.addEventListener('click',()=>{ const m=document.getElementById('seasonMenu'); if(m) m.classList.remove('open'); });
applySeason();

(function initTheme(){
  const saved=localStorage.getItem('vr3_theme');
  const prefers=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyThemeMode();   // v17: อัตโนมัติ / สว่าง / มืด (js/ui.js)
})();

(function restoreSession(){
  try{
    const t=localStorage.getItem('vr3_token'), u=localStorage.getItem('vr3_user');
    if(t&&u){ AUTH_TOKEN=t; cu=JSON.parse(u); }
  }catch{}
})();
updAuthUI();

// เลือกอาคาร/ชั้นจาก QR param หลังหน้า report พร้อม
let rateLinkDone=false, pageLinkDone=false, pendingPage=null;
const LINK_PAGES=['report','status','mine','dashboard','mywork','approve','manage','pm','calendar','help'];
function applyQrParams(){
  const params=new URLSearchParams(window.location.search);
  // v15: ?page=report|status|mine|mywork|dashboard … (ใช้กับ Rich menu ของ LINE OA / ลิงก์ในอีเมล)
  const pg=params.get('page');
  if(!pageLinkDone){
    pageLinkDone=true;
    if(pg==='mine' && !cu) gp('status');   // v15.1: ใบของฉันเฉพาะผู้ที่ล็อกอิน → คนทั่วไปไปหน้าติดตามงาน
    else if(pg && LINK_PAGES.includes(pg)) { if(curPage!==pg) gp(pg); }
    else if(!pg && !params.get('id') && !params.get('rate') && !params.get('b') && cu && isMobile() && curPage==='report') gp('mywork');
  }
  // v12: ลิงก์ประเมินจากอีเมล ?rate=REP-xxx → เปิดใบนั้นพร้อมฟอร์มให้ดาว
  const oid=params.get('id');
  if(oid && !rateLinkDone && DB.tickets.find(t=>t.id===oid)){ rateLinkDone=true; setTimeout(()=>openDet(oid),60); }
  const rid=params.get('rate');
  if(rid && !rateLinkDone && DB.tickets.find(t=>t.id===rid)){
    rateLinkDone=true; gp('status'); setTimeout(()=>{ openDet(rid); const f=document.getElementById('rateForm'); if(f) f.scrollIntoView({behavior:'smooth',block:'center'}); },60);
  }
  const bParam=params.get('b'), fParam=params.get('f');
  if(bParam){ const el=document.getElementById('fB'); if(el){ el.value=bParam; updFloorOptions(fParam||undefined); } }
}

// เปิดเว็บ: ถ้ามีแคช แสดงทันที (instant) แล้วค่อยดึงใหม่เบื้องหลัง — ถ้าไม่มีแคชค่อยโหลดแบบปกติ
// เช็กเวอร์ชันเซิร์ฟเวอร์ (GET /exec) — ถ้าไม่ตรง แจ้งวิศวกรที่ป้ายเวอร์ชัน
async function checkServerVersion(){
  try{
    if(!GAS_URL) return;
    const r=await fetch(GAS_URL); const j=await r.json();
    SERVER_VERSION=(j&&j.data&&j.data.version)||'';
    const tag=document.getElementById('verTag');
    const bad=SERVER_VERSION&&SERVER_VERSION!==SERVER_REQUIRED;
    if(tag){ tag.textContent=APP_VERSION+(bad?' ⚠':''); if(bad) tag.style.background='rgba(227,91,91,.75)';
      tag.title=`หน้าเว็บ ${APP_VERSION} · เซิร์ฟเวอร์ ${SERVER_VERSION||'?'}${bad?' — ต้อง Deploy Code.gs '+SERVER_REQUIRED:''}`; }
  }catch(e){}
}
setTimeout(checkServerVersion,2500);
(function boot(){
  const cached=readCache();
  if(cached){
    applyBundle(cached);        // แสดงของเก่าทันที ไม่ต้องรอเซิร์ฟเวอร์
    rp(); applyQrParams();
    loadAll({silent:true}).then(()=>{ rp(); applyQrParams(); });  // อัปเดตเบื้องหลัง
  }else{
    loadAll().then(()=>{ rp(); applyQrParams(); });
  }
})();
updSyncBadge(); setTimeout(flushQ, 1500);   // มีงานค้างส่งจากครั้งก่อน → ส่งต่อให้อัตโนมัติ
// v15: PWA — ติดตั้งเป็นแอปบนมือถือได้ (ทำงานเฉพาะบน https เช่น GitHub Pages)
if('serviceWorker' in navigator && location.protocol==='https:'){ window.addEventListener('load',()=>{ navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).then(r=>{ try{ r.update(); }catch(e){} }).catch(()=>{}); }); }
// v15.4: ตรวจว่ามีหน้าเว็บเวอร์ชันใหม่บนเซิร์ฟเวอร์ไหม (ข้ามแคชเบราว์เซอร์) → แสดงแถบให้กดอัปเดต
async function checkWebUpdate(){
  if(location.protocol!=='https:') return;
  try{
    const r=await fetch(location.pathname+'?_v='+Date.now(),{cache:'no-store'}); if(!r.ok) return;
    const m=(await r.text()).match(/const APP_VERSION = '([^']+)'/);
    if(m && m[1]!==APP_VERSION) showUpdateBar(m[1]);
  }catch(e){}
}
function showUpdateBar(v){
  if(document.getElementById('updBar')) return;
  const d=document.createElement('div'); d.id='updBar';
  d.style.cssText='position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:600;background:var(--navy);color:#fff;border:1px solid var(--gold);border-radius:12px;padding:10px 14px;box-shadow:var(--sh3);display:flex;gap:10px;align-items:center;font-size:13.5px;max-width:92vw';
  d.innerHTML=`<span>🔄 มีหน้าเว็บเวอร์ชันใหม่ <b>${v}</b> (ตอนนี้ ${APP_VERSION})</span><button class="btn btn-sm" style="background:var(--gold);color:var(--navy);border:none;font-weight:700" onclick="hardReload()">อัปเดตเลย</button>`;
  document.body.appendChild(d);
}
async function hardReload(){
  try{ if(window.caches){ const ks=await caches.keys(); await Promise.all(ks.map(k=>caches.delete(k))); } }catch(e){}
  try{ const regs=await navigator.serviceWorker?.getRegistrations?.(); if(regs) await Promise.all(regs.map(r=>r.update().catch(()=>{}))); }catch(e){}
  location.replace(location.pathname+'?_v='+Date.now()+(location.search?'&'+location.search.slice(1):''));
}
setTimeout(checkWebUpdate,4000); setInterval(checkWebUpdate,30*60000);
