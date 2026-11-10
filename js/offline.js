// ระบบแจ้งซ่อมออนไลน์ — offline.js (v17.5) : โหมดออฟไลน์ — คิวรูปภาพ (IndexedDB) + ป้าย "รอส่ง N รายการ"
// แนวคิด: ทุกการบันทึก (แจ้งซ่อม/อัปเดตสถานะ = SYNC_Q ใน localStorage, รูปภาพ = PHOTO_Q ใน IndexedDB)
// เก็บในเครื่องก่อนเสมอ แล้วค่อยส่ง — สัญญาณหาย/ปิดแอปไปก่อน ข้อมูลไม่หาย และส่งให้อัตโนมัติเมื่อกลับมาออนไลน์
// ═══════════════════════════════════════════
const PQ_DB='ttmed-offline', PQ_STORE='photos';
let PHOTO_Q_N=0, photoFlushing=false;
function pqOpen(){
  return new Promise((ok,no)=>{
    if(!window.indexedDB) return no(new Error('no-idb'));
    const r=indexedDB.open(PQ_DB,1);
    r.onupgradeneeded=()=>{ const db=r.result; if(!db.objectStoreNames.contains(PQ_STORE)) db.createObjectStore(PQ_STORE,{keyPath:'qid',autoIncrement:true}); };
    r.onsuccess=()=>ok(r.result); r.onerror=()=>no(r.error);
  });
}
async function pqTx(mode, fn){
  const db=await pqOpen();
  return new Promise((ok,no)=>{ const tx=db.transaction(PQ_STORE,mode), st=tx.objectStore(PQ_STORE); let out; Promise.resolve(fn(st)).then(v=>out=v);
    tx.oncomplete=()=>{ db.close(); ok(out); }; tx.onerror=()=>{ db.close(); no(tx.error); }; });
}
function pqReq(req){ return new Promise((ok,no)=>{ req.onsuccess=()=>ok(req.result); req.onerror=()=>no(req.error); }); }
async function pqAll(){ try{ return await pqTx('readonly', st=>pqReq(st.getAll())); }catch(e){ return []; } }
async function pqCount(){ try{ PHOTO_Q_N=await pqTx('readonly', st=>pqReq(st.count())); }catch(e){ PHOTO_Q_N=0; } updSyncBadge(); return PHOTO_Q_N; }
async function pqDel(qid){ try{ await pqTx('readwrite', st=>pqReq(st.delete(qid))); }catch(e){} }
async function pqPut(rec){ return pqTx('readwrite', st=>pqReq(st.put(rec))); }
// เก็บรูปลงคิว (คืนจำนวนที่เก็บได้) — ถ้าเครื่องไม่รองรับ IndexedDB คืน -1 ให้ส่งตรงแบบเดิม
async function enqueuePhotos(ticketId, items, kind, by){
  try{
    for(const p of items) await pqPut({ ticketId, data:p.base64, mimeType:p.mimeType, kind, by:by||'-', at:new Date().toISOString(), tries:0, err:'' });
    await pqCount(); return items.length;
  }catch(e){ return -1; }
}
const isNetErr = e => /เชื่อมต่อ|ตอบช้า|Failed to fetch|NetworkError|network|abort/i.test(String(e&&e.message||e));
// ส่งรูปที่ค้างทั้งหมด — รอให้ "แจ้งซ่อมใหม่" ของใบนั้นถึงเซิร์ฟเวอร์ก่อน (ไม่งั้นเซิร์ฟเวอร์หาใบไม่เจอ)
async function flushPhotos(){
  if(photoFlushing || !GAS_URL || !navigator.onLine) return 0;
  photoFlushing=true; let sent=0;
  try{
    const list=await pqAll();
    for(const rec of list){
      if(SYNC_Q.some(j=>j.op==='add' && j.ticket.id===rec.ticketId)) continue;
      try{
        const r=await api('uploadPhoto',{photo:{ticketId:rec.ticketId,data:rec.data,mimeType:rec.mimeType,kind:rec.kind,by:rec.by},token:AUTH_TOKEN||''});
        if(r && r.fileId){
          if(!PHOTOS[rec.ticketId]) PHOTOS[rec.ticketId]=[];
          PHOTO_COUNTS[rec.ticketId]=(PHOTO_COUNTS[rec.ticketId]||0)+1;
          PHOTOS[rec.ticketId].push({fileId:r.fileId,kind:r.kind,name:r.name,by:rec.by,at:rec.at});
          await pqDel(rec.qid); sent++;
        } else { rec.tries++; rec.err='เซิร์ฟเวอร์ไม่รับรูป'; await pqPut(rec); }
      }catch(e){
        if(isNetErr(e)) break;                       // สัญญาณหาย → หยุดไว้ก่อน ค่อยส่งต่อเมื่อออนไลน์
        if(/AUTH_REQUIRED/.test(e.message||'') && !AUTH_TOKEN){ rec.tries++; rec.err='เกินเวลาที่ผู้แจ้งแนบรูปได้ (ให้ช่างแนบแทน หรือเอาออกจากคิว)'; await pqPut(rec); continue; }
        if(handleAuthError(e)) break;                // ต้องล็อกอินใหม่ → ส่งต่อหลังล็อกอิน
        rec.tries++; rec.err=String(e.message||e); await pqPut(rec);
      }
    }
  } finally { photoFlushing=false; await pqCount(); }
  if(sent && curPage!=='report') { try{ rp(); }catch(e){} }
  return sent;
}
// ส่งทุกคิว: ข้อมูลใบงานก่อน แล้วค่อยรูป
async function flushAll(){ await flushQ(); await flushPhotos(); }

// ─── ป้ายสถานะการส่ง (มุมขวาล่าง) ───
function updSyncBadge(){
  let el=document.getElementById('syncBadge');
  if(!el){ el=document.createElement('div'); el.id='syncBadge'; el.className='sync-badge'; document.body.appendChild(el); }
  const n=SYNC_Q.length+PHOTO_Q_N, off=!navigator.onLine;
  el.style.display=(n||off)?'flex':'none';
  el.onclick=openSyncPanel;
  const bad=SYNC_Q.some(j=>j.err&&!isNetErr(j.err));
  el.className='sync-badge'+(off?' off':bad?' bad':'');
  el.innerHTML = off
    ? `<i class="ti ti-wifi-off"></i> ออฟไลน์${n?` — รอส่ง <b>${n}</b> รายการ`:' — บันทึกไว้ในเครื่องได้'}`
    : (bad?'⚠️ ส่งไม่สำเร็จ ':'<i class="ti ti-cloud-upload"></i> กำลังส่ง ')+`<b>${n}</b> รายการ — กดดู`;
}
// ─── รายการที่ยังไม่ถึงเซิร์ฟเวอร์ ───
async function openSyncPanel(){
  const photos=await pqAll();
  const rows=SYNC_Q.map((j,i)=>{
    const id=j.op==='add'?j.ticket.id:j.id;
    const what=j.op==='add'?'แจ้งซ่อมใหม่':(j.fields&&j.fields.status?'เปลี่ยนสถานะ → '+statusLabel(j.fields.status):'อัปเดต '+Object.keys(j.fields||{}).join(', '));
    const err=j.err&&!isNetErr(j.err);
    return `<div class="sq-row"><div><span class="mono">${escHtml(id)}</span> · ${escHtml(what)}</div>
      <div class="sq-st ${err?'e':''}">${err?'ผิดพลาด: '+escHtml(j.err):(navigator.onLine?'รอส่ง':'รอสัญญาณ')}${j.tries?` · ลองแล้ว ${j.tries} ครั้ง`:''}</div>
      <button class="btn btn-sm btn-red" onclick="syncDrop(${i})">เอาออกจากคิว</button></div>`; }).join('')
   + photos.map(p=>`<div class="sq-row sq-ph"><img src="data:${escAttr(p.mimeType)};base64,${p.data}" alt=""><div style="flex:1;min-width:0"><div><span class="mono">${escHtml(p.ticketId)}</span> · รูป${p.kind==='after'?'หลังซ่อม':p.kind==='before'?'ก่อนซ่อม':''}</div>
      <div class="sq-st ${p.err?'e':''}">${p.err?'ผิดพลาด: '+escHtml(p.err):(navigator.onLine?'รอส่ง':'รอสัญญาณ')}</div>
      <button class="btn btn-sm btn-red" onclick="photoDrop(${p.qid})">ลบรูปนี้ออกจากคิว</button></div></div>`).join('');
  document.getElementById('dueContent').innerHTML=`<div class="modal-title">รายการที่ยังไม่ถึงเซิร์ฟเวอร์ <button class="mc" onclick="cm('dueMd')">✕</button></div>
    <div class="notice ${navigator.onLine?'n-blue':'n-amber'}" style="margin-bottom:10px"><i class="ti ${navigator.onLine?'ti-wifi':'ti-wifi-off'} ni"></i><div>${navigator.onLine?'ออนไลน์ — ระบบกำลังส่งให้อัตโนมัติ':'<b>ไม่มีสัญญาณอินเทอร์เน็ต</b> — ข้อมูลเก็บไว้ในเครื่องนี้แล้ว ไม่หายแม้ปิดแอป และจะส่งให้อัตโนมัติเมื่อกลับมาออนไลน์'}</div></div>
    ${rows||'<div class="empty-sub">ไม่มีรายการค้างส่ง</div>'}
    <button class="btn btn-p" style="width:100%" ${navigator.onLine?'':'disabled'} onclick="flushing=false;flushAll();cm('dueMd')">ลองส่งใหม่ตอนนี้</button>`;
  document.getElementById('dueMd').style.display='flex';
}
async function photoDrop(qid){ if(!confirm('ลบรูปนี้ออกจากคิว? (รูปจะไม่ถูกส่ง)')) return; await pqDel(qid); await pqCount(); openSyncPanel(); }
function statusLabel(s){ try{ return getSI(s).label; }catch(e){ return s; } }

window.addEventListener('online', ()=>{ updSyncBadge(); showToast('กลับมาออนไลน์แล้ว — กำลังส่งข้อมูลที่ค้าง'); flushing=false; flushAll(); });
window.addEventListener('offline', ()=>{ updSyncBadge(); showToast('ไม่มีสัญญาณ — ทำงานต่อได้ ระบบจะเก็บไว้แล้วส่งให้ภายหลัง',3500); });
document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='visible' && navigator.onLine) flushAll(); });
setTimeout(()=>{ pqCount().then(()=>flushPhotos()); }, 1500);
