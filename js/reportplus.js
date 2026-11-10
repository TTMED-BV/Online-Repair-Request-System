// ระบบแจ้งซ่อมออนไลน์ — reportplus.js (v17.5) : UX หน้าแจ้งซ่อม (v17.1)
//   ฟอร์ม 3 ขั้น (ที่ไหน → เสียอะไร → ผู้แจ้ง) · ปุ่มประเภทงานแบบไอคอน · พิมพ์ด้วยเสียง
//   QR ประจำห้อง (?b=&f=&r= กรอกสถานที่ให้) · หน้าจอ "ส่งสำเร็จ" เต็มจอ
// ═══════════════════════════════════════════
const STEP_DEF = [
  { key:'place',  title:'ที่ไหน',    icon:'ti-map-pin',      fields:['fB','fFloor','fR'] },
  { key:'detail', title:'เสียอะไร',  icon:'ti-tool',         fields:['fC','fDesc'] },
  { key:'who',    title:'ผู้แจ้ง',    icon:'ti-user',         fields:['fN','fP','fD'] },
];
let STEP_I = 0;
// ไอคอนประเภทงาน (จับคำในชื่อประเภท)
const CAT_ICON = [[/ไฟฟ้า/,'⚡'],[/ประปา|สุขา|น้ำ/,'🚿'],[/อากาศ|แอร์/,'❄️'],[/ประตู|หน้าต่าง|กุญแจ/,'🚪'],[/โยธา|อาคาร|ผนัง|หลังคา|พื้น/,'🧱'],[/ไอที|คอม|เครือข่าย|อินเทอร์เน็ต/,'💻'],
  [/โทรศัพท์|สื่อสาร/,'☎️'],[/เฟอร์นิเจอร์|โต๊ะ|เก้าอี้/,'🪑'],[/ลิฟต์/,'🛗'],[/ดับเพลิง|อัคคี/,'🧯'],[/สวน|ภูมิทัศน์|ต้นไม้/,'🌳'],[/ทำความสะอาด|แม่บ้าน/,'🧹'],[/เครื่องมือ|ครุภัณฑ์/,'🔬']];
const catIcon = c => (CAT_ICON.find(([re])=>re.test(c))||[0,'🛠️'])[1];

// QR ประจำห้อง: อ่านพารามิเตอร์ครั้งเดียวตอนเปิดเว็บ
const QR_PREFILL = (()=>{ try{ const q=new URLSearchParams(location.search); const b=q.get('b'); if(!b) return null; return { b, f:q.get('f')||'', r:q.get('r')||'' }; }catch(e){ return null; } })();
let QR_USED=false;

function enhanceReport(root){
  const card=root.querySelector('.card'); if(!card || card.dataset.v17) return;
  card.dataset.v17='1';
  // 1) แบ่งเนื้อหาตามหัวข้อ .fsec → กล่องขั้นตอน
  const groups={}; let cur=null; const tail=[];
  [...card.children].forEach(n=>{
    if(n.classList.contains('ctitle')) return;
    if(n.classList.contains('fsec')){ const t=n.textContent; cur=/ผู้แจ้ง/.test(t)?'who':/สถานที่/.test(t)?'place':'detail'; groups[cur]=groups[cur]||[]; return n.remove(); }
    if(n.id==='rmsg' || (n.tagName==='BUTTON' && /submitR/.test(n.getAttribute('onclick')||''))){ tail.push(n); return; }
    if(cur) groups[cur].push(n);
  });
  const head=document.createElement('ol'); head.className='stepper'; head.setAttribute('aria-label','ขั้นตอนแจ้งซ่อม');
  head.innerHTML=STEP_DEF.map((s,i)=>`<li><button type="button" class="st-dot" data-action="step-go" data-i="${i}"><span class="st-n">${i+1}</span><i class="ti ${s.icon}" aria-hidden="true"></i><span class="st-t">${s.title}</span></button></li>`).join('');
  card.querySelector('.ctitle').after(head);
  STEP_DEF.forEach((s,i)=>{
    const box=document.createElement('section'); box.className='step-pane'; box.dataset.i=i; box.setAttribute('aria-label','ขั้นที่ '+(i+1)+' '+s.title);
    box.innerHTML=`<h3 class="step-h">${i+1}. ${s.title}${s.key==='who'&&ME.n?' <span class="chip" style="background:var(--green-bg);color:var(--green-tx)">จำข้อมูลไว้แล้ว</span>':''}</h3>`;
    (groups[s.key]||[]).forEach(n=>box.appendChild(n));
    const nav=document.createElement('div'); nav.className='step-nav';
    nav.innerHTML=(i?`<button type="button" class="btn" data-action="step-prev"><i class="ti ti-arrow-left"></i> ย้อนกลับ</button>`:'<span></span>')
      +(i<STEP_DEF.length-1?`<button type="button" class="btn btn-p" data-action="step-next">ถัดไป <i class="ti ti-arrow-right"></i></button>`:'');
    box.appendChild(nav);
    if(i===STEP_DEF.length-1) tail.forEach(n=>box.insertBefore(n,nav.nextSibling));
    card.appendChild(box);
  });
  tail.forEach(n=>{ if(n.tagName==='BUTTON'){ n.classList.add('step-submit'); } });
  // 2) ปุ่มประเภทงานแบบไอคอน (ยังเก็บค่าใน select เดิม)
  const sel=card.querySelector('#fC');
  if(sel){ const g=document.createElement('div'); g.className='cat-grid'; g.setAttribute('role','radiogroup'); g.setAttribute('aria-label','ประเภทงาน');
    g.innerHTML=CATS.map(c=>{ const st=catStyle(c); return `<button type="button" role="radio" aria-checked="false" class="cat-btn" style="--c:${st.c}" data-action="pick-cat" data-c="${escAttr(c)}"><span class="cat-ic${st.ic.includes('+')?' duo':''}">${catIconHTML(c)}</span>${escHtml(c)}</button>`; }).join('');
    sel.before(g); sel.classList.add('sr-sel'); sel.addEventListener('change',syncCatBtns);
    // v17.4: ประเภทงานใช้ความกว้างเต็มแถว (เดิมถูกบีบอยู่ครึ่งซ้าย ทำให้เรียงเป็นแถวยาว)
    const ff=sel.closest('.ff'), row=ff&&ff.parentElement; if(row&&row.classList.contains('frow')){ row.before(ff); ff.style.margin='0 0 .75rem'; } }
  // 3) ไมค์ — พิมพ์ด้วยเสียง (ถ้าเบราว์เซอร์รองรับ)
  const ta=card.querySelector('#fDesc');
  if(ta && (window.SpeechRecognition||window.webkitSpeechRecognition)){
    const w=document.createElement('div'); w.className='voice-wrap'; ta.before(w); w.appendChild(ta);
    w.insertAdjacentHTML('beforeend','<button type="button" class="voice-btn" data-action="voice" aria-label="พูดเพื่อพิมพ์รายละเอียด" title="พูดเพื่อพิมพ์ (ภาษาไทย)"><i class="ti ti-microphone"></i></button>');
  }
  // ช่องดักบอท (คนมองไม่เห็น — บอทกรอก → เซิร์ฟเวอร์ไม่บันทึก)
  card.insertAdjacentHTML('beforeend','<div class="hp-trap" aria-hidden="true"><label>เว็บไซต์<input id="fHp" tabindex="-1" autocomplete="off"></label></div>');
  // 4) QR ประจำห้อง → กรอกสถานที่ให้ แล้วข้ามไปขั้น "เสียอะไร"
  let start=0;
  if(QR_PREFILL && !QR_USED){ QR_USED=true;
    const b=card.querySelector('#fB'); if(b && [...b.options].some(o=>o.value===QR_PREFILL.b)){ b.value=QR_PREFILL.b; updFloorOptions(QR_PREFILL.f);
      const r=card.querySelector('#fR'); if(r && QR_PREFILL.r) r.value=QR_PREFILL.r;
      const bn=(BUILDINGS.find(x=>x.id===QR_PREFILL.b)||{}).name||QR_PREFILL.b;
      head.insertAdjacentHTML('afterend',`<div class="qr-banner"><i class="ti ti-qrcode"></i><div><b>สถานที่จาก QR ประจำห้อง</b><br>${escHtml(bn)}${QR_PREFILL.f?' · '+escHtml(flLabel(QR_PREFILL.f)):''}${QR_PREFILL.r?' · '+escHtml(QR_PREFILL.r):''}</div><button type="button" class="btn btn-sm" data-action="step-go" data-i="0">แก้ไข</button></div>`);
      start=1; } }
  stepGo(start, true);
}
function syncCatBtns(){ const v=document.getElementById('fC')?.value; document.querySelectorAll('.cat-btn').forEach(b=>{ const on=b.dataset.c===v; b.classList.toggle('on',on); b.setAttribute('aria-checked',on); }); }
function stepValid(i, show){
  let bad=null;
  STEP_DEF[i].fields.forEach(id=>{ const val=id==='fD'?deptVal():v(id); const el=document.getElementById(id), er=document.getElementById('e_'+id);
    if(!val){ if(show){ el&&el.classList.add('err'); er&&er.classList.add('show'); } bad=bad||el; } });
  if(bad && show){ bad.focus({preventScroll:false}); }
  return !bad;
}
function stepGo(i, silent){
  STEP_I=Math.max(0,Math.min(STEP_DEF.length-1,i));
  document.querySelectorAll('.step-pane').forEach(p=>{ const on=+p.dataset.i===STEP_I; p.hidden=!on; if(on&&!silent) p.classList.add('step-in'); });
  document.querySelectorAll('.stepper li').forEach((li,k)=>{ li.className=k<STEP_I?'done':k===STEP_I?'cur':''; const b=li.querySelector('button'); if(k===STEP_I) b.setAttribute('aria-current','step'); else b.removeAttribute('aria-current'); });
  if(!silent){ const c=document.querySelector('.stepper'); c&&c.scrollIntoView({block:'nearest',behavior:'smooth'}); }
}
function stepShowFor(el){ const pane=el&&el.closest('.step-pane'); if(pane) stepGo(+pane.dataset.i); }
Object.assign(ACTIONS,{
  'step-next': ()=>{ if(stepValid(STEP_I,true)) stepGo(STEP_I+1); },
  'step-prev': ()=>stepGo(STEP_I-1),
  'step-go':   el=>{ const t=+el.dataset.i; for(let k=0;k<t;k++) if(!stepValid(k,t>STEP_I)) return stepGo(k); stepGo(t); },
  'pick-cat':  el=>{ const s=document.getElementById('fC'); s.value=el.dataset.c; s.dispatchEvent(new Event('change')); clrErr('fC'); checkDuplicate(); },
  'voice':     el=>toggleVoice(el),
});
RENDER_HOOKS.push((p,root)=>{ if(p==='report') enhanceReport(root); });

// ─── พิมพ์ด้วยเสียง (Web Speech API ภาษาไทย) ───
let _rec=null;
function toggleVoice(btn){
  if(_rec){ _rec.stop(); return; }
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition; if(!SR) return;
  const ta=document.getElementById('fDesc'); const base=ta.value?ta.value.replace(/\s*$/,' '):'';
  _rec=new SR(); _rec.lang='th-TH'; _rec.interimResults=true; _rec.continuous=true;
  btn.classList.add('rec'); btn.setAttribute('aria-pressed','true');
  _rec.onresult=e=>{ let t=''; for(let i=0;i<e.results.length;i++) t+=e.results[i][0].transcript; ta.value=base+t; clrErr('fDesc'); };
  _rec.onerror=e=>{ if(e.error==='not-allowed') showToast('ยังไม่ได้อนุญาตให้ใช้ไมโครโฟน'); };
  _rec.onend=()=>{ btn.classList.remove('rec'); btn.setAttribute('aria-pressed','false'); _rec=null; };
  _rec.start(); showToast('🎙 พูดได้เลย — กดไมค์อีกครั้งเพื่อหยุด');
}

// ─── หน้าจอ "ส่งสำเร็จ" เต็มจอ ───
function showSubmitSuccess(t, offline){
  let d=document.getElementById('okDlg');
  if(!d){ d=document.createElement('dialog'); d.id='okDlg'; d.className='ok-dlg'; document.body.appendChild(d); }
  d.innerHTML=`<div class="ok-burst" aria-hidden="true"><i class="ti ti-check"></i></div>
    <h2>${offline?'บันทึกไว้ในเครื่องแล้ว':'ส่งแจ้งซ่อมสำเร็จ'}</h2>
    <p class="ok-sub">${offline?'ยังไม่มีสัญญาณ — ระบบจะส่งให้อัตโนมัติเมื่อกลับมาออนไลน์':'งานอาคารสถานที่ได้รับเรื่องแล้ว จะแจ้งผลเมื่ออนุมัติ'}</p>
    <div class="ok-id"><span>เลขใบงาน</span><b class="mono">${escHtml(t.id)}</b></div>
    ${lineFollowBox(t.id, t.trackPin, true)}
    <div class="ok-btns"><button class="btn" data-action="ok-close" data-to="status">🔎 ไปหน้าติดตามงาน</button><button class="btn btn-p" data-action="ok-close" data-to="report">📝 แจ้งเรื่องอื่นต่อ</button></div>`;
  try{ d.showModal(); }catch(e){ d.setAttribute('open',''); }
  setTimeout(()=>d.querySelector('.btn-line')?.focus(),60);
}
ACTIONS['ok-close']=el=>{ const d=document.getElementById('okDlg'); d.close?d.close():d.removeAttribute('open'); const to=el.dataset.to; if(to==='report'){ STEP_I=0; gp('report'); } else gp(to); };
