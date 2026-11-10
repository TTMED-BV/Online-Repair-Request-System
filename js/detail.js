// ระบบแจ้งซ่อมออนไลน์ — detail.js (v17.4) : รายละเอียดใบงาน · รูปภาพ · แก้ไข/ยกเลิก · ประเมิน
// โหลดตามลำดับใน index.html (classic script ใช้ตัวแปรร่วมกัน)
// ════════════════════════ DETAIL MODAL ════════════════════════

// ═══════════ ระบบแนบรูปภาพ ═══════════
let PHOTOS = {};          // { ticketId: [ {fileId, kind, name, by, at} ] } — โหลดเมื่อเปิดดู
let PHOTO_COUNTS = {};    // { ticketId: จำนวนรูป } มาพร้อมหน้าแรก (เล็ก)
let PHOTO_COUNTS_KNOWN = false;
const _photoLoading = {};
async function ensurePhotos(id){
  if (PHOTOS[id] !== undefined || _photoLoading[id] || !GAS_URL) return;
  if (PHOTO_COUNTS_KNOWN && !PHOTO_COUNTS[id]) { PHOTOS[id] = []; return; }   // รู้แล้วว่าใบนี้ไม่มีรูป → ไม่ต้องถามเซิร์ฟเวอร์
  _photoLoading[id] = true;
  try{ const r = await api('getTicketPhotos', { id }); PHOTOS[id] = (r && r.photos) || []; }
  catch(e){ PHOTOS[id] = []; }
  finally{ delete _photoLoading[id]; }
  const md=document.getElementById('detMd');
  if (md && md.style.display==='flex' && md.dataset.tid===id) openDet(id);   // รีเฟรชเฉพาะถ้ายังเปิดใบเดิมอยู่
}
let pendingPhotos = [];   // รูปที่เลือกไว้ในฟอร์มแจ้งซ่อม (ยังไม่ส่ง)
const MAX_PHOTOS = 5;

function thumbUrl(fileId){ return 'https://drive.google.com/thumbnail?id='+fileId+'&sz=w400'; }
function fullUrl(fileId){ return 'https://drive.google.com/file/d/'+fileId+'/view'; }

// ย่อรูปก่อนส่ง เพื่อลดขนาดไฟล์และเวลาอัปโหลด
function resizeImage(file, maxSide=1600, quality=0.82){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onerror=()=>reject(new Error('อ่านไฟล์ไม่สำเร็จ'));
    reader.onload=e=>{
      const img=new Image();
      img.onerror=()=>reject(new Error('ไฟล์รูปไม่ถูกต้อง'));
      img.onload=()=>{
        let {width:w,height:h}=img;
        if(Math.max(w,h)>maxSide){
          if(w>h){ h=Math.round(h*maxSide/w); w=maxSide; }
          else   { w=Math.round(w*maxSide/h); h=maxSide; }
        }
        const c=document.createElement('canvas'); c.width=w; c.height=h;
        c.getContext('2d').drawImage(img,0,0,w,h);
        const durl=c.toDataURL('image/jpeg',quality);
        resolve({ dataUrl:durl, base64:durl.split(',')[1], mimeType:'image/jpeg' });
      };
      img.src=e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// เลือกรูปในฟอร์มแจ้งซ่อม
async function onPickReportPhotos(input){
  const files=[...input.files];
  input.value='';
  for(const f of files){
    if(pendingPhotos.length>=MAX_PHOTOS){ showToast('แนบได้สูงสุด '+MAX_PHOTOS+' รูป'); break; }
    if(!f.type.startsWith('image/')){ showToast('รองรับเฉพาะไฟล์รูปภาพ'); continue; }
    try{
      const r=await resizeImage(f);
      pendingPhotos.push(r);
    }catch(e){ showToast('ไม่สามารถอ่านรูปได้: '+e.message); }
  }
  renderPendingPhotos();
}
function renderPendingPhotos(){
  const box=document.getElementById('photoPreview');
  if(!box) return;
  box.innerHTML = pendingPhotos.length
    ? pendingPhotos.map((p,i)=>`<div class="ph-thumb">
        <img src="${p.dataUrl}" alt="รูปที่ ${i+1}">
        <button type="button" class="ph-del" onclick="removePendingPhoto(${i})" title="ลบรูปนี้"><i class="ti ti-x"></i></button>
      </div>`).join('')
    : '';
  const c=document.getElementById('photoCount');
  if(c) c.textContent = pendingPhotos.length ? `เลือกแล้ว ${pendingPhotos.length}/${MAX_PHOTOS} รูป` : '';
}
function removePendingPhoto(i){ pendingPhotos.splice(i,1); renderPendingPhotos(); }

// ส่งรูปที่แนบไว้ขึ้นเซิร์ฟเวอร์
async function uploadPendingPhotos(ticketId, by, kind='report'){
  if(!GAS_URL || !pendingPhotos.length) return 0;
  // v16.2: เก็บลงคิวในเครื่องก่อน แล้วค่อยส่ง (ออฟไลน์/สัญญาณหายก็ไม่หาย) — คืนจำนวนที่ "ส่งถึงแล้ว"
  const q=await enqueuePhotos(ticketId, pendingPhotos, kind, by||'ผู้แจ้ง');
  if(q>=0){ const before=(PHOTOS[ticketId]||[]).length; await flushPhotos(); return (PHOTOS[ticketId]||[]).length-before; }
  // ส่งทุกรูปพร้อมกัน (ขนานกัน) แทนการรอทีละรูป
  const results = await Promise.all(pendingPhotos.map(p=>
    api('uploadPhoto',{photo:{ticketId,data:p.base64,mimeType:p.mimeType,kind,by:by||'ผู้แจ้ง'}})
      .catch(e=>{ console.warn('upload photo failed',e); return null; })
  ));
  let n=0;
  results.forEach(r=>{
    if(r && r.fileId){
      if(!PHOTOS[ticketId]) PHOTOS[ticketId]=[];
      PHOTO_COUNTS[ticketId]=(PHOTO_COUNTS[ticketId]||0)+1; PHOTOS[ticketId].push({fileId:r.fileId,kind:r.kind,name:r.name,by:by||'ผู้แจ้ง',at:new Date().toISOString()});
      n++;
    }
  });
  return n;
}

// ช่าง/วิศวกรแนบรูปเพิ่มในหน้ารายละเอียด
async function onAddTicketPhoto(input, ticketId, kind){
  const files=[...input.files].filter(f=>f.type.startsWith('image/')); input.value='';
  if(!files.length) return;
  if(!GAS_URL){ showToast('ยังไม่ได้เชื่อมต่อเซิร์ฟเวอร์'); return; }
  // v16.2: เก็บลงคิวก่อน — ออฟไลน์ก็ถ่ายรูปได้ ส่งให้เองเมื่อมีสัญญาณ
  if(window.indexedDB){
    showLoader(navigator.onLine?'กำลังอัปโหลดรูป...':'กำลังบันทึกรูปไว้ในเครื่อง...');
    const resized=(await Promise.all(files.map(f=>resizeImage(f).catch(()=>null)))).filter(Boolean);
    const q=await enqueuePhotos(ticketId, resized, kind, cu?cu.name:'-');
    if(q>=0){
      const before=(PHOTOS[ticketId]||[]).length; await flushPhotos(); hideLoader();
      const sent=(PHOTOS[ticketId]||[]).length-before;
      if(sent>=resized.length) showToast('อัปโหลด '+sent+' รูปแล้ว');
      else showToast((sent?'อัปโหลด '+sent+' รูป · ':'')+'เก็บไว้ในเครื่อง '+(resized.length-sent)+' รูป — จะส่งให้เมื่อมีสัญญาณ',3500);
      openDet(ticketId); return;
    }
    hideLoader();
  }
  showLoader('กำลังอัปโหลดรูป...');
  // ย่อขนาดทุกรูปพร้อมกัน แล้วอัปโหลดพร้อมกัน
  let n=0, errMsg='';
  try{
    const resized=await Promise.all(files.map(f=>resizeImage(f).catch(()=>null)));
    const results=await Promise.all(resized.map(r=>
      r ? api('uploadPhoto',{photo:{ticketId,data:r.base64,mimeType:r.mimeType,kind,by:cu?cu.name:'-'}}).catch(e=>({error:e.message})) : null
    ));
    results.forEach(res=>{
      if(res && res.fileId){
        if(!PHOTOS[ticketId]) PHOTOS[ticketId]=[];
        PHOTO_COUNTS[ticketId]=(PHOTO_COUNTS[ticketId]||0)+1; PHOTOS[ticketId].push({fileId:res.fileId,kind:res.kind,name:res.name,by:cu?cu.name:'-',at:new Date().toISOString()});
        n++;
      } else if(res && res.error){ errMsg=res.error; }
    });
  }catch(e){ errMsg=e.message; }
  hideLoader();
  if(n){ showToast('อัปโหลด '+n+' รูปแล้ว'); openDet(ticketId); }
  else if(errMsg){ showToast('อัปโหลดไม่สำเร็จ: '+errMsg); }
}

async function removeTicketPhoto(ticketId, fileId){
  if(!cu||!cu.isEngineer){ showToast('เฉพาะวิศวกรเท่านั้นที่ลบรูปได้'); return; }
  if(!confirm('ลบรูปนี้?')) return;
  showLoader('กำลังลบ...');
  try{
    await api('deletePhoto',{fileId,token:AUTH_TOKEN});
    PHOTOS[ticketId]=(PHOTOS[ticketId]||[]).filter(p=>p.fileId!==fileId); PHOTO_COUNTS[ticketId]=PHOTOS[ticketId].length;
    hideLoader(); openDet(ticketId); showToast('ลบรูปแล้ว');
  }catch(e){ hideLoader(); if(!handleAuthError(e)) showToast('ลบไม่สำเร็จ: '+e.message); }
}

// แสดงรูปในหน้ารายละเอียด
function renderTicketPhotos(t){
  const list=PHOTOS[t.id]||[];
  if (PHOTOS[t.id]===undefined && PHOTO_COUNTS[t.id]) return '<div style="font-size:12px;font-weight:600;color:var(--tx3);margin:14px 0 8px">รูปภาพประกอบ</div><div style="font-size:12px;color:var(--tx3);margin-bottom:8px"><i class="ti ti-loader-2"></i> กำลังโหลดรูป '+PHOTO_COUNTS[t.id]+' รูป…</div>';
  const groups=[
    {k:'report', label:'รูปจากผู้แจ้ง',  icon:'ti-camera'},
    {k:'before', label:'ก่อนซ่อม',       icon:'ti-photo'},
    {k:'after',  label:'หลังซ่อม',       icon:'ti-photo-check'},
  ];
  let html='<div style="font-size:12px;font-weight:600;color:var(--tx3);margin:14px 0 8px">รูปภาพประกอบ</div>';
  let any=false;
  groups.forEach(g=>{
    const items=list.filter(p=>p.kind===g.k);
    if(!items.length) return;
    any=true;
    html+=`<div style="margin-bottom:10px">
      <div style="font-size:12px;color:var(--tx3);margin-bottom:5px"><i class="ti ${g.icon}"></i> ${g.label} (${items.length})</div>
      <div class="ph-grid">${items.map(p=>`<div class="ph-thumb">
        <a href="${fullUrl(p.fileId)}" target="_blank" rel="noopener"><img src="${thumbUrl(p.fileId)}" alt="${g.label}" loading="lazy"></a>
        ${cu&&cu.isEngineer?`<button type="button" class="ph-del" onclick="removeTicketPhoto('${t.id}','${p.fileId}')" title="ลบรูป"><i class="ti ti-x"></i></button>`:''}
      </div>`).join('')}</div>
    </div>`;
  });
  if(!any) html+='<div style="font-size:12px;color:var(--tx3);margin-bottom:8px">ยังไม่มีรูปภาพ</div>';
  if(cu){
    html+=`<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px">
      <label class="btn btn-sm" style="cursor:pointer;margin:0">
        <i class="ti ti-camera-plus"></i> เพิ่มรูปก่อนซ่อม
        <input type="file" accept="image/*" multiple style="display:none" onchange="onAddTicketPhoto(this,'${t.id}','before')">
      </label>
      <label class="btn btn-sm" style="cursor:pointer;margin:0">
        <i class="ti ti-camera-check"></i> เพิ่มรูปหลังซ่อม
        <input type="file" accept="image/*" multiple style="display:none" onchange="onAddTicketPhoto(this,'${t.id}','after')">
      </label>
    </div>`;
  }
  return html;
}

function statusPipe(cur){
  if(cur==='cannot') return '<div class="notice n-red" style="margin-bottom:1rem"><i class="ti ti-ban ni"></i><div>งานนี้ไม่สามารถดำเนินการได้</div></div>';
  if(SLA_PAUSED.includes(cur)){
    const t=cur==='insurance'?'ส่งเรื่องประกันเคลม':'ส่งงานให้ผู้รับเหมาภายนอก';
    return `<div class="notice n-purple" style="margin-bottom:1rem"><i class="ti ti-clock-pause ni"></i><div><b>${t}</b> — อยู่ระหว่างประสานงานภายนอก (พัก SLA ชั่วคราว) โดยช่าง/วิศวกรผู้รับผิดชอบเป็นผู้ประสานงาน</div></div>`;
  }
  const flow=['pending_approval','assigned','survey','purchase','working','done'];
  const short={pending_approval:'รออนุมัติ',assigned:'มอบหมาย',survey:'สำรวจ',purchase:'จัดซื้อ',working:'ซ่อม',done:'เสร็จ'};
  const ci=flow.indexOf(cur);
  return `<div class="pipe">${flow.map((st,i)=>{
    const cls=i<ci?'done':i===ci?'now':'';
    const lineCls=i<ci?'done':'';
    return `<div class="pipe-step">
      ${i>0?`<div class="pipe-line ${i<=ci?'done':''}"></div>`:''}
      <div class="pipe-dot ${cls}">${i<ci?'<i class="ti ti-check" style="font-size:12px"></i>':i+1}</div>
      <div class="pipe-lbl ${i===ci?'act':''}">${short[st]}</div>
    </div>`;
  }).join('')}</div><div style="height:1px;background:var(--bd);margin:0 0 1rem"></div>`;
}
// ─── แก้ไข / ยกเลิกใบแจ้งซ่อม (เฉพาะวิศวกร) ───
function openEdit(id){
  if(!cu||!cu.isEngineer){ showToast('เฉพาะวิศวกรเท่านั้นที่แก้ไขได้'); return; }
  const t=DB.tickets.find(t=>t.id===id); if(!t) return;
  document.getElementById('editContent').innerHTML=`
    <div class="modal-title">แก้ไขใบแจ้งซ่อม <button class="mc" onclick="cm('editMd')"><i class="ti ti-x"></i></button></div>
    <div style="background:var(--surf2);border-radius:8px;padding:.6rem .75rem;margin-bottom:1rem;font-size:12px;color:var(--tx2)"><span class="mono">${t.id}</span></div>
    <div class="frow">
      <div class="ff" style="margin:0"><label>ชื่อ-นามสกุล</label><input id="edN" value="${escAttr(t.name)}"></div>
      <div class="ff" style="margin:0"><label>โทรศัพท์</label><input id="edP" value="${escAttr(t.phone)}"></div>
    </div>
    <div class="frow" style="margin-top:.75rem">
      <div class="ff" style="margin:0"><label>ตำแหน่ง/หน่วยงาน</label><input id="edD" value="${escAttr(t.dept)}"></div>
      <div class="ff" style="margin:0"><label>อีเมล</label><input id="edE" value="${escAttr(t.email)}"></div>
    </div>
    <div class="frow" style="margin-top:.75rem">
      <div class="ff" style="margin:0"><label>อาคาร</label>
        <select id="edB">${BUILDINGS.map(b=>`<option value="${b.id}" ${t.building===b.id?'selected':''}>${b.name}</option>`).join('')}</select>
      </div>
      <div class="ff" style="margin:0"><label>ห้อง / ชั้น</label><input id="edR" value="${escAttr(t.room)}"></div>
    </div>
    <div class="frow" style="margin-top:.75rem">
      <div class="ff" style="margin:0"><label>ประเภทงาน</label>
        <select id="edC">${CATS.map(c=>`<option ${t.category===c?'selected':''}>${c}</option>`).join('')}</select>
      </div>
      <div class="ff" style="margin:0"><label>ความเร่งด่วน</label>
        <select id="edPr"><option value="low" ${t.priority==='low'?'selected':''}>ปกติ</option><option value="med" ${t.priority==='med'?'selected':''}>ปานกลาง</option><option value="high" ${t.priority==='high'?'selected':''}>เร่งด่วน/ความปลอดภัย</option></select>
      </div>
    </div>
    <div class="ff" style="margin-top:.25rem"><label>ค่าใช้จ่ายประมาณการ (บาท)</label><input id="edCost" type="number" value="${t.estimatedCost||0}"></div>
    <div class="ff"><label>รายละเอียดปัญหา</label><textarea id="edDesc">${escHtml(t.desc)}</textarea></div>
    <button class="btn btn-p btn-block" onclick="saveEdit('${id}')"><i class="ti ti-device-floppy"></i> บันทึกการแก้ไข</button>`;
  document.getElementById('detMd').style.display='none';
  document.getElementById('editMd').style.display='flex';
}
const _ESC={'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'};
function escAttr(s){return (s==null?'':String(s)).replace(/[&<>"']/g,c=>_ESC[c]);}   // v15.11: escape ครบ 5 ตัว
function escHtml(s){return (s==null?'':String(s)).replace(/[&<>"']/g,c=>_ESC[c]);}

async function saveEdit(id){
  const t=DB.tickets.find(t=>t.id===id); if(!t) return;
  const fields={
    name:v('edN'), phone:v('edP'), dept:v('edD'), email:v('edE'),
    building:document.getElementById('edB').value, room:v('edR'),
    category:document.getElementById('edC').value, priority:document.getElementById('edPr').value,
    estimatedCost:parseFloat(document.getElementById('edCost').value)||0, desc:v('edDesc')
  };
  Object.assign(t, fields);
  const entry={status:t.status,date:now(),note:`วิศวกรแก้ไขข้อมูลใบแจ้งซ่อม`,by:cu.name};
  if(!t.history)t.history=[]; t.history.push(entry);
  await syncUpdate(id, fields, entry);
  hideLoader(); cm('editMd'); rp();
  showToast('บันทึกการแก้ไขแล้ว');
}

async function cancelTicket(id){
  if(!cu||!cu.isEngineer){ showToast('เฉพาะวิศวกรเท่านั้นที่ยกเลิกได้'); return; }
  const reason=prompt('เหตุผลที่ยกเลิกใบแจ้งซ่อมนี้:'); if(reason===null) return;
  const t=DB.tickets.find(t=>t.id===id); if(!t) return;
  t.status='cancelled';
  const entry={status:'cancelled',date:now(),note:'ยกเลิกใบแจ้ง: '+(reason||'-'),by:cu.name};
  if(!t.history)t.history=[]; t.history.push(entry);
  await syncUpdate(id,{status:'cancelled'},entry);
  hideLoader(); cm('detMd'); updApvCnt(); rp();
  showToast('ยกเลิกใบแจ้งซ่อมแล้ว');
}

// Timeline แนวนอน — จุดแต่ละสถานะ + ระยะเวลาที่ค้างในแต่ละขั้น (หาคอขวด)
function horizontalTimeline(t){
  const hist=(t.history||[]).slice().sort((a,b)=>new Date(a.date)-new Date(b.date));
  if(hist.length<1) return '';
  const now=Date.now();
  const segs=hist.map((h,i)=>{
    const start=new Date(h.date).getTime();
    const end = i<hist.length-1 ? new Date(hist[i+1].date).getTime() : (CLOSED_STATUS.includes(t.status)?start:now);
    const days=Math.max(0,Math.round((end-start)/86400000));
    const si=getSI(h.status);
    const isLast=i===hist.length-1;
    const colorMap={pending_approval:'#e0a94b',assigned:'#8b6ff0',survey:'#e0a94b',purchase:'#8b6ff0',working:'#3ba7d6',insurance:'#22c19a',contractor:'#22c19a',done:'#5cc93f',cannot:'#e35b5b',cancelled:'#a8a08a'};
    const col=colorMap[h.status]||'#888';
    // ค้างนานผิดปกติ (>7 วันในขั้นที่ยังไม่จบ) = เตือน
    const stuck = days>=7 && !CLOSED_STATUS.includes(h.status);
    return {label:si.label,days,col,isLast,stuck,ongoing:isLast&&!CLOSED_STATUS.includes(t.status)};
  });
  return `<div style="font-size:12px;font-weight:600;color:var(--tx3);margin:4px 0 10px">เส้นทางการดำเนินงาน</div>
  <div class="htl">
    ${segs.map((s,i)=>`<div class="htl-seg">
      <div class="htl-node" style="background:${s.col}${s.ongoing?';box-shadow:0 0 0 4px '+s.col+'33;animation:htlPulse 1.6s ease-in-out infinite':''}"></div>
      ${i<segs.length-1?`<div class="htl-line" style="background:linear-gradient(90deg,${s.col},${segs[i+1].col})"></div>`:''}
      <div class="htl-lbl">${s.label}</div>
      <div class="htl-days ${s.stuck?'htl-stuck':''}">${s.ongoing?'กำลังอยู่ขั้นนี้ ':''}${s.days} วัน${s.stuck?' ⚠️':''}</div>
    </div>`).join('')}
  </div>
  <div style="height:12px"></div>`;
}

// ─── ความพึงพอใจหลังปิดงาน (ดาว 1-5) ───
let pendingRating=0;
function starSVG(filled){
  return `<svg viewBox="0 0 24 24" width="28" height="28" style="display:block"><path d="M12 2l2.9 6.3 6.9.7-5.1 4.7 1.4 6.8L12 17.8 5.9 20.5l1.4-6.8L2.2 9l6.9-.7z" fill="${filled?'#f2b50c':'none'}" stroke="#f2b50c" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
}
function ratingBlock(t){
  // แสดงเฉพาะงานที่เสร็จแล้ว
  if(t.status!=='done') return '';
  applyLocalRating(t);   // v15.2: เคยประเมินจากเครื่องนี้แล้ว → ไม่แสดงฟอร์มซ้ำ แม้ข้อมูลเซิร์ฟเวอร์ยังไม่อัปเดต
  // ให้คะแนนแล้ว → โชว์ผล
  if(t.rating && t.rating>0){
    return `<div class="rate-box rated">
      <div style="font-size:12px;font-weight:600;color:var(--tx2);margin-bottom:6px">⭐ ความพึงพอใจ${t.ratedBy?` <span class="badge b-purple nodot" style="font-size:12px">ประเมินแทนโดย ${escHtml(t.ratedBy)}</span>`:'ของผู้แจ้ง'}</div>
      <div style="display:flex;align-items:center;gap:8px">
        <div style="display:flex;gap:2px">${[1,2,3,4,5].map(i=>`<span style="opacity:${i<=t.rating?1:.25}">${starSVG(i<=t.rating)}</span>`).join('')}</div>
        <span style="font-weight:700;font-size:16px;color:var(--gold)">${t.rating}.0</span>
      </div>
      ${t.ratingComment?`<div style="font-size:13px;color:var(--tx2);margin-top:8px;background:var(--surf2);border-radius:8px;padding:.6rem .8rem">“${escHtml(t.ratingComment)}”</div>`:''}
    </div>`;
  }
  // ยังไม่ให้คะแนน → ฟอร์มให้ดาว (ใครก็ให้ได้ ไม่ต้อง login)
  // v15.2: เก็บดาว/ความเห็นที่เลือกไว้ — หน้าต่างวาดใหม่ (เช่น รูปโหลดเสร็จ) แล้วค่าไม่หาย
  if(rateCurId!==t.id){ rateCurId=t.id; }
  const dr=rateDraft[t.id]||{};
  pendingRating=dr.n||0;
  const proxyOk = rateState(t)==='proxy';
  const dAt=doneAtOf(t), left=dAt?Math.max(0,Math.ceil((dAt.getTime()+RATE_PROXY_DAYS*86400000-Date.now())/86400000)):0;
  return `<div class="rate-box" id="rateForm">
    <div style="font-size:13px;font-weight:600;margin-bottom:4px">งานนี้เสร็จแล้ว — ให้คะแนนความพึงพอใจ</div>
    <div style="font-size:12px;color:var(--tx3);margin-bottom:8px">ความเห็นของท่านช่วยให้เราพัฒนาบริการ (ให้คะแนนได้ครั้งเดียว)</div>
    <div class="notice ${proxyOk?'n-amber':'n-info'}" style="margin:0 0 10px;font-size:12px;padding:.55rem .75rem"><i class="ti ti-info-circle ni"></i><div>
      ${proxyOk?`<b>เกิน ${RATE_PROXY_DAYS} วันแล้วยังไม่มีการประเมิน</b> — ผู้เกี่ยวข้องหรือผู้ปฏิบัติงานในชั้นนั้น (${escHtml(ticketFloor(t)||getBI(t.building).short)}) ประเมินแทนได้ เช่น งานที่ช่างหรือแม่บ้านแจ้งเอง หรือผู้แจ้งไม่สะดวกประเมิน`
      :`หมายเหตุ: หากผู้แจ้งไม่ประเมินภายใน ${RATE_PROXY_DAYS} วัน${left?` (อีก ${left} วัน)`:''} ผู้เกี่ยวข้องหรือผู้ปฏิบัติงานในชั้นนั้นจะประเมินแทนได้ เช่น งานที่ช่างหรือแม่บ้านแจ้งเอง`}
    </div></div>
    <div class="star-row emo-row" id="starRow" role="radiogroup" aria-label="ความพึงพอใจ">${RATE_EMO.map((e,k)=>{ const i=k+1; return `<button type="button" role="radio" aria-checked="${i===pendingRating}" aria-label="${i} — ${e[1]}" class="star-btn emo-btn ${i===pendingRating?'on':''}" data-v="${i}" onclick="setStars(${i})" onmouseover="hoverStars(${i})" onmouseout="hoverStars(0)"><span class="emo" aria-hidden="true">${e[0]}</span><small>${e[1]}</small></button>`; }).join('')}</div>
    <div id="starPicked" style="font-size:13px;color:var(--tx2);margin-top:4px">${pendingRating?`เลือก: ${RATE_EMO[pendingRating-1][1]} (${pendingRating}/5)`:'แตะหน้าที่ตรงกับความรู้สึกของคุณ'}</div>
    <textarea id="rateComment" placeholder="ความเห็นเพิ่มเติม (ไม่บังคับ)" style="margin-top:10px;min-height:60px" oninput="(rateDraft['${t.id}']=rateDraft['${t.id}']||{}).c=this.value">${escHtml(dr.c||'')}</textarea>
    ${proxyOk?`<label style="display:flex;align-items:center;gap:6px;font-size:12.5px;margin-top:8px;cursor:pointer"><input type="checkbox" id="rateProxy" style="width:auto" onchange="document.getElementById('rateProxyName').style.display=this.checked?'block':'none'"> ประเมินแทนผู้แจ้ง</label>
    <input id="rateProxyName" placeholder="ชื่อ-นามสกุล ผู้ประเมินแทน (เช่น ผู้ปฏิบัติงานชั้นนั้น)" style="display:none;margin-top:6px" value="${cu?escAttr(cu.name):''}">`:''}
    <div id="rateMsg" style="margin:8px 0"></div>
    <button class="btn btn-accent btn-sm" onclick="submitRating('${t.id}')"><i class="ti ti-send"></i> ส่งคะแนน</button>
  </div>`;
}
// v17.3: ประเมินแบบ Emoji (ยังเก็บเป็นคะแนน 1–5 เหมือนเดิม)
const RATE_EMO=[['😡','ไม่พอใจมาก'],['😕','ไม่พอใจ'],['😐','เฉย ๆ'],['🙂','พอใจ'],['😍','พอใจมาก']];
function paintStars(n){
  document.querySelectorAll('#starRow .emo-btn').forEach(b=>{ const on=+b.dataset.v===n; b.classList.toggle('on',on); b.classList.toggle('hov',+b.dataset.v===n&&n!==pendingRating); });
  // v15.5: เปลี่ยนแค่สีดาว ไม่วาดปุ่มใหม่ (การวาดใหม่ทำให้คลิกด้วยเมาส์ไม่ติด)
  document.querySelectorAll('#starRow .star-btn').forEach(b=>{
    const v=+b.dataset.v, path=b.querySelector('path');
    if(path) path.setAttribute('fill', v<=n ? '#f2b50c' : 'none');
  });
}
function hoverStars(n){ paintStars(n||pendingRating); }
function setStars(n){ pendingRating=n; if(rateCurId){ (rateDraft[rateCurId]=rateDraft[rateCurId]||{}).n=n; } paintStars(n); const p=document.getElementById('starPicked'); if(p) p.textContent='เลือก: '+RATE_EMO[n-1][1]+' ('+n+'/5)'; document.querySelectorAll('#starRow .emo-btn').forEach(b=>b.setAttribute('aria-checked',+b.dataset.v===n)); }
// ─── v15.2: จำการประเมินที่ส่งจากเครื่องนี้ (กันฟอร์มขึ้นซ้ำระหว่างรอข้อมูลเซิร์ฟเวอร์) ───
let rateDraft={}, rateCurId=null;
function ratedLocal(){ try{ return JSON.parse(localStorage.getItem('vr3_rated')||'{}'); }catch(e){ return {}; } }
function saveRatedLocal(m){ try{ localStorage.setItem('vr3_rated',JSON.stringify(m)); }catch(e){} }
function applyLocalRating(t){
  if(!t || t.rating>0) return;
  const r=ratedLocal()[t.id];
  if(r && r.r>0){ t.rating=r.r; t.ratingComment=r.c||''; t.ratedBy=r.by||''; t._lr=1; }   // _lr = ค่าจากเครื่องนี้ ยังไม่ใช่ของเซิร์ฟเวอร์
}
function syncRatedLocal(fresh){   // เซิร์ฟเวอร์บันทึกแล้ว → ล้างที่จำไว้ / ยังไม่บันทึก → ใช้ค่าที่จำไว้
  const m=ratedLocal(); let ch=false;
  Object.keys(m).forEach(id=>{ const t=DB.tickets.find(x=>x.id===id);
    if((fresh && t && t.rating>0 && !t._lr) || Date.now()-(m[id].at||0)>14*86400000){ delete m[id]; ch=true; } else if(t) applyLocalRating(t); });   // ลบเมื่อเซิร์ฟเวอร์ยืนยันแล้วเท่านั้น
  if(ch) saveRatedLocal(m);
}
async function submitRating(id){
  const msg=document.getElementById('rateMsg');
  if(!pendingRating){ msg.innerHTML='<div class="notice n-amber" style="margin:0;padding:.5rem .7rem">กรุณาเลือกดาวก่อน</div>'; return; }
  if(!GAS_URL){ msg.innerHTML='<div class="notice n-red" style="margin:0;padding:.5rem .7rem">ยังไม่ได้เชื่อมต่อเซิร์ฟเวอร์</div>'; return; }
  const comment=(document.getElementById('rateComment').value||'').trim();
  const isProxy=!!document.getElementById('rateProxy')?.checked;
  const ratedBy=isProxy?(document.getElementById('rateProxyName').value||'').trim():'';
  if(isProxy && !ratedBy){ msg.innerHTML='<div class="notice n-amber" style="margin:0;padding:.5rem .7rem">กรุณาใส่ชื่อผู้ประเมินแทน</div>'; return; }
  showLoader('กำลังส่งคะแนน...');
  try{
    try{ await api('rateTicket',{id,rating:pendingRating,comment,ratedBy}); }
    catch(e){ if(!/ให้คะแนนไปแล้ว/.test(e.message)) throw e; }   // เคยส่งสำเร็จแล้ว (เช่น กดซ้ำ) → ถือว่าเรียบร้อย
    const m=ratedLocal(); m[id]={r:pendingRating,c:comment,by:ratedBy,at:Date.now()}; saveRatedLocal(m); delete rateDraft[id];
    const t=DB.tickets.find(x=>x.id===id); if(t){ t.rating=pendingRating; t.ratingComment=comment; t.ratedBy=ratedBy; t._lr=1;
      (t.history=t.history||[]).push({status:'done',date:now(),note:(ratedBy?'ประเมินแทนโดย '+ratedBy:'ผู้แจ้งประเมิน')+' — '+pendingRating+' ดาว',by:ratedBy||'ผู้แจ้ง'}); }
    hideLoader(); const nStar=pendingRating; rp(); openDet(id); showToast('ขอบคุณสำหรับคะแนน '+nStar+' ดาว');   // rp: รีเฟรชรายการด้านหลัง (ป้ายสถานะประเมิน)
  }catch(e){ hideLoader(); msg.innerHTML='<div class="notice n-red" style="margin:0;padding:.5rem .7rem">ส่งไม่สำเร็จ: '+e.message+'</div>'; }
}

// ─── v12: แอดมินแก้วันคาดว่าเสร็จรายงาน (ต้องใส่เหตุผล บันทึกลงประวัติ) ───
function openDueEdit(id){
  const t=DB.tickets.find(x=>x.id===id); if(!t) return;
  if(!cu||!cu.isEngineer){ showToast('เฉพาะวิศวกร/แอดมิน'); return; }
  const cur=dueDate(t), auto=(()=>{ const c={...t,dueOverride:''}; return dueDate(c); })();
  document.getElementById('dueContent').innerHTML=`
    <div class="modal-title">📅 แก้วันคาดว่าเสร็จ <button class="mc" onclick="cm('dueMd')">✕</button></div>
    <div style="background:var(--surf2);border-radius:8px;padding:.7rem;margin-bottom:1rem;font-size:13px">
      <span class="mono">${t.id}</span><br><b>${getBI(t.building).name}</b> — ${escHtml(t.room)}
      <div style="font-size:12px;color:var(--tx3);margin-top:4px">ตอนนี้: <b>${cur?fdShort(cur):'—'}</b>${t.dueOverride?' (กำหนดเอง)':''} · ตาม SLA: ${auto?fdShort(auto):'ยังไม่อนุมัติ'}</div>
    </div>
    <div class="ff"><label>วันคาดว่าเสร็จใหม่</label><input id="dueNew" type="date" value="${cur?ymd(cur):''}"></div>
    <div class="ff"><label>เหตุผล<span class="req">*</span></label><textarea id="dueWhy" placeholder="เช่น รออะไหล่จากผู้ขาย / งานง่ายกว่าที่ประเมิน"></textarea></div>
    <div id="dueMsg"></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn btn-p" style="flex:1" onclick="saveDueEdit('${t.id}')">บันทึก</button>
      ${t.dueOverride?`<button class="btn" onclick="saveDueEdit('${t.id}',true)">กลับไปใช้ตาม SLA</button>`:''}
    </div>`;
  document.getElementById('dueMd').style.display='flex';
}
async function saveDueEdit(id, reset){
  const t=DB.tickets.find(x=>x.id===id); if(!t) return;
  const nd=reset?'':(document.getElementById('dueNew').value||'');
  const why=(document.getElementById('dueWhy').value||'').trim();
  const msg=document.getElementById('dueMsg');
  if(!reset && !nd){ msg.innerHTML='<div class="notice n-amber" style="margin:0 0 8px">กรุณาเลือกวันที่</div>'; return; }
  if(!why){ msg.innerHTML='<div class="notice n-amber" style="margin:0 0 8px">กรุณาใส่เหตุผล</div>'; return; }
  const old=dueDate(t);
  t.dueOverride=nd;
  const nw=dueDate(t);
  const entry={status:t.status,date:now(),by:cu.name,
    note:`📅 ${reset?'กลับไปใช้วันคาดว่าเสร็จตาม SLA':'เปลี่ยนวันคาดว่าเสร็จ'}: ${old?fdShort(old):'—'} → ${nw?fdShort(nw):'—'} — ${why}`};
  (t.history=t.history||[]).push(entry);
  await syncUpdate(id,{dueOverride:nd},entry);
  cm('dueMd'); openDet(id); rp(); showToast('บันทึกวันคาดว่าเสร็จแล้ว');
}

function openDet(id) {
  const t=DB.tickets.find(t=>t.id===id);if(!t)return;
  const s=getSI(t.status),b=getBI(t.building),pLbl={high:'เร่งด่วน',med:'ปานกลาง',low:'ปกติ'}[t.priority];
  const pCls=t.priority==='high'?'b-red':t.priority==='med'?'b-amber':'b-gray';
  document.getElementById('detContent').innerHTML=`
    <div class="modal-title"><span class="mono">${t.id}</span> <button class="mc" onclick="cm('detMd')"><i class="ti ti-x"></i></button></div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:1rem">
      <span class="badge ${s.cls}">${s.label}</span>
      <span class="badge ${pCls}">${pLbl}</span>
    </div>
    ${statusPipe(t.status)}
    ${(()=>{const h=cu?hotspotOf(t.building,t.room):null; return h?`<div class="notice n-red" style="margin-bottom:.8rem;font-size:12px"><i class="ti ti-flame ni"></i><div><b>จุดซ่อมซ้ำ</b> — ห้องนี้ถูกแจ้ง ${h.n} ครั้งใน ${OPS.hotMonths} เดือน (${Object.entries(h.cats).map(([c,n])=>escHtml(c)+' '+n).join(', ')}) ควรพิจารณาเปลี่ยนใหม่แทนการซ่อม</div></div>`:'';})()}
    <table style="width:100%;font-size:13px;border-collapse:collapse;margin-bottom:1rem">
    ${[['อาคาร',b.icon+' '+b.name],['ห้อง',escHtml(t.room)],['ประเภท',catChip(t.category)],['ผู้แจ้ง',escHtml(t.name)],
       ...(cu?[['โทร',escHtml(t.phone)]]:[]),['หน่วยงาน',escHtml(t.dept)],['วันที่แจ้ง',fd(t.createdAt)],
       ...(cu?[['วันที่อนุมัติ',t.approvedAt?fd(t.approvedAt):'ยังไม่อนุมัติ'],
              ['คาดว่าเสร็จ',(()=>{const di=dueInfo(t);return `<span class="badge ${di.cls}">${di.text}</span>${di.sub?` <span style="font-size:12px;color:var(--tx3)">${di.sub}</span>`:''}${cu.isEngineer&&!CLOSED_STATUS.includes(t.status)?` <button class="btn btn-sm" style="margin-left:4px;padding:2px 8px" onclick="openDueEdit('${t.id}')">📅 แก้วันคาดว่าเสร็จ</button>`:''}`;})()]]:[]),
       ['ผู้รับผิดชอบ',assigneeChips(t.assignees)],
       ['ประมาณการ',(t.estimatedCost||0).toLocaleString()+' บาท'],
       ['ค่าใช้จ่ายจริง',(t.actualCost||0).toLocaleString()+' บาท'],
       ...(t.status==='done'?[['คาร์บอนที่ประหยัด',(()=>{const c=carbonOf(t);return c.total?`<b>🌱 ${fmtKg(c.total)} kgCO2e</b><div style="font-size:12px;color:var(--tx3)">${carbonTip(c)}</div>`:'—';})()]]:[]),
    ].map(([l,v2])=>`<tr><td style="color:var(--tx3);padding:4px 0;width:110px;font-size:12px;vertical-align:top">${l}</td><td style="padding:4px 0">${v2}</td></tr>`).join('')}
    </table>
    ${!CLOSED_STATUS.includes(t.status)&&pinFor(t.id)?lineFollowBox(t.id,pinFor(t.id),true):''}
    <div style="font-size:12px;color:var(--tx3);margin-bottom:4px">รายละเอียด</div>
    <div style="font-size:13px;background:var(--surf2);border-radius:8px;padding:.75rem;margin-bottom:1rem;line-height:1.6;white-space:pre-wrap">${escHtml(t.desc)}</div>
    ${renderTicketPhotos(t)}
    <div style="height:12px"></div>
    ${ratingBlock(t)}
    ${cu&&cu.isEngineer&&t.status!=='cancelled'?`<div style="display:flex;gap:8px;margin-bottom:1rem;flex-wrap:wrap">
      <button class="btn btn-sm" onclick="openEdit('${t.id}')"><i class="ti ti-edit"></i> แก้ไขใบแจ้ง</button>
      <button class="btn btn-sm btn-red" onclick="cancelTicket('${t.id}')"><i class="ti ti-ban"></i> ยกเลิกใบแจ้ง</button>
    </div>`:''}
    ${t.status==='cancelled'?`<div class="notice n-red" style="margin-bottom:1rem"><i class="ti ti-ban ni"></i><div>ใบแจ้งซ่อมนี้ถูกยกเลิกแล้ว (เก็บไว้เป็นประวัติ)</div></div>`:''}
    ${horizontalTimeline(t)}
    <div style="font-size:12px;font-weight:600;color:var(--tx3);margin-bottom:8px">ประวัติดำเนินงาน</div>
    ${(t.history||[]).map((h,i,arr)=>{const si=getSI(h.status);return `<div class="tl-item">
      <div class="tl-rail">
        <div class="tl-dot"></div>
        ${i<arr.length-1?`<div class="tl-ln"></div>`:''}
      </div>
      <div style="padding-bottom:12px;flex:1">
        <span class="badge ${si.cls}" style="font-size:12px">${si.label}</span>
        ${h.note&&h.note!=='-'?`<div style="font-size:12px;color:var(--tx2);margin-top:3px">${escHtml(h.note)}</div>`:''}
        <div style="font-size:12px;color:var(--tx3);margin-top:2px">${fd(h.date)} — ${escHtml(h.by)}</div>
      </div>
    </div>`;}).join('')}`;
  const _md=document.getElementById('detMd'); _md.dataset.tid=id; _md.style.display='flex';
  ensurePhotos(id);
}

