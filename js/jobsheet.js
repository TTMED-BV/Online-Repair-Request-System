// ระบบแจ้งซ่อมออนไลน์ — jobsheet.js (v17.3) : อัปเดตงานแบบ Bottom Sheet (v17.1)
//   หน้าต่าง "อัปเดตสถานะ" เดิม + ปุ่มสถานะใหญ่ที่ใช้บ่อย + แนบรูปหลังซ่อม — บนมือถือเลื่อนขึ้นจากด้านล่าง
// ═══════════════════════════════════════════
const QUICK_ST = [
  { id:'working', label:'กำลังซ่อม', icon:'ti-player-play', cls:'qs-work' },
  { id:'done',    label:'ซ่อมเสร็จ', icon:'ti-circle-check', cls:'qs-done' },
];
const _openStatusUpdate0 = openStatusUpdate;
openStatusUpdate = function(id){
  _openStatusUpdate0(id);
  const t=DB.tickets.find(x=>x.id===id), box=document.getElementById('statusContent'); if(!t||!box) return;
  const sel=document.getElementById('updSt'); if(!sel) return;
  document.getElementById('statusMd').classList.add('as-sheet');
  box.insertAdjacentHTML('afterbegin','<div class="sheet-grip" aria-hidden="true"></div>');
  const ff=sel.closest('.ff');
  const quick=QUICK_ST.filter(q=>[...sel.options].some(o=>o.value===q.id));
  ff.insertAdjacentHTML('beforebegin',`<div class="qs-grid" role="radiogroup" aria-label="สถานะที่ใช้บ่อย">${quick.map(q=>
    `<button type="button" role="radio" class="qs-btn ${q.cls}" data-action="qs-pick" data-s="${q.id}"><i class="ti ${q.icon}" aria-hidden="true"></i>${q.label}</button>`).join('')}
    <button type="button" class="qs-btn qs-more" data-action="qs-more"><i class="ti ti-dots" aria-hidden="true"></i>สถานะอื่น</button></div>`);
  ff.classList.add('qs-select'); ff.querySelector('label').textContent='เลือกสถานะ';
  ff.hidden = quick.some(q=>q.id===sel.value);
  // แนบรูปหลังซ่อม (ส่งผ่านคิวออฟไลน์)
  const note=document.getElementById('updNote')?.closest('.ff');
  if(note) note.insertAdjacentHTML('beforebegin',`<div class="ff"><label class="photo-drop"><i class="ti ti-camera" aria-hidden="true"></i><span>แนบรูปหลังซ่อม</span><small>ถ่ายรูปได้เลย — ไม่มีสัญญาณก็เก็บไว้ส่งทีหลัง</small>
    <input type="file" accept="image/*" capture="environment" multiple hidden onchange="onAddTicketPhoto(this,'${escAttr(id)}','after')"></label></div>`);
  syncQuick();
  sel.addEventListener('change',syncQuick);
  setTimeout(()=>box.querySelector('.qs-btn')?.focus(),50);
};
function syncQuick(){
  const sel=document.getElementById('updSt'); if(!sel) return;
  document.querySelectorAll('.qs-btn[data-s]').forEach(b=>{ const on=b.dataset.s===sel.value; b.classList.toggle('on',on); b.setAttribute('aria-checked',on); });
}
Object.assign(ACTIONS,{
  'qs-pick': el=>{ const sel=document.getElementById('updSt'); sel.value=el.dataset.s; sel.dispatchEvent(new Event('change')); },
  'qs-more': ()=>{ const ff=document.querySelector('.qs-select'); ff.hidden=false; ff.querySelector('select').focus(); },
});
