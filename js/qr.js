// ระบบแจ้งซ่อมออนไลน์ — qr.js (v17.6) : QR ประจำห้อง (v17.1)
//   สร้าง QR ทีละห้อง → พิมพ์ติดหน้าห้อง → สแกนแล้วฟอร์มแจ้งซ่อมกรอก อาคาร/ชั้น/ห้อง ให้อัตโนมัติ
// ═══════════════════════════════════════════
const QR_LIB='https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js';
const QRS={ b:'', f:'', rooms:'' };
function siteBase(){ return location.origin+location.pathname.replace(/index\.html$/,''); }
function roomUrl(b,f,r){ const q=new URLSearchParams({page:'report',b}); if(f) q.set('f',f); if(r) q.set('r',r); return siteBase()+'?'+q.toString(); }
// ห้องที่เคยแจ้งในอาคาร/ชั้นนี้ (ใช้เป็นค่าเริ่มต้น)
function knownRooms(b,f){
  const set=new Map();
  DB.tickets.filter(t=>t.building===b).forEach(t=>{
    const m=String(t.room||'').split(' — '); const fl=m.length>1?m[0].trim():'', rm=(m.length>1?m.slice(1).join(' — '):m[0]).trim();
    if(!rm || (f && fl!==f)) return; const k=rm.toLowerCase(); if(!set.has(k)) set.set(k,{rm,fl});
  });
  return [...set.values()].sort((a,b)=>a.fl.localeCompare(b.fl,'th',{numeric:true})||a.rm.localeCompare(b.rm,'th',{numeric:true}));
}
EXTRA_PAGES.roomqr = {
  allow: ()=>!!cu && (cu.isEngineer||can('manage_config')),
  render(){
    const bs=BUILDINGS, b=QRS.b||(bs[0]&&bs[0].id)||'';
    const fls=b?floorsOf(b):[];
    return `<div class="card no-print" style="max-width:860px;margin:0 auto 1rem">
      <div class="ctitle"><i class="ti ti-qrcode" style="color:var(--accent)"></i> QR ประจำห้อง</div>
      <p style="margin:0 0 12px;color:var(--tx2);font-size:var(--fs-sm)">พิมพ์ติดหน้าห้อง/จุดสำคัญ ผู้แจ้งสแกนแล้วฟอร์มจะกรอก <b>อาคาร ชั้น ห้อง</b> ให้ทันที — ข้อมูลห้องตรงกันทุกครั้ง ทำให้สถิติจุดซ่อมซ้ำแม่นยำ</p>
      <div class="frow">
        <div class="ff" style="margin:0"><label for="qrB">อาคาร</label><select id="qrB" onchange="QRS.b=this.value;QRS.f='';QRS.rooms='';rp()">${bs.map(x=>`<option value="${escAttr(x.id)}" ${x.id===b?'selected':''}>${escHtml(x.icon+' '+x.name)}</option>`).join('')}</select></div>
        <div class="ff" style="margin:0"><label for="qrF">ชั้น</label><select id="qrF" onchange="QRS.f=this.value;QRS.rooms='';rp()"><option value="">ทุกชั้น</option>${fls.map(f=>`<option ${f===QRS.f?'selected':''}>${escHtml(f)}</option>`).join('')}</select></div>
      </div>
      <div class="ff" style="margin-top:12px"><label for="qrRooms">รายการห้อง (บรรทัดละ 1 ห้อง · รูปแบบ <span class="mono">ชั้น | ห้อง</span> หรือแค่ชื่อห้อง)</label>
        <textarea id="qrRooms" rows="6" placeholder="เช่น&#10;3 | ห้อง 305&#10;3 | ห้องน้ำชาย">${escHtml(QRS.rooms||knownRooms(b,QRS.f).map(x=>(x.fl?x.fl+' | ':'')+x.rm).join('\n'))}</textarea>
        <small style="color:var(--tx3)">ระบบเติมห้องที่เคยถูกแจ้งซ่อมในอาคารนี้ให้ก่อน — แก้/เพิ่มได้ · เว้นว่างไว้ = QR ระดับอาคาร (ผู้แจ้งเลือกห้องเอง)</small></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-p" data-action="qr-make"><i class="ti ti-qrcode"></i> สร้าง QR</button>
        <button class="btn" data-action="qr-print"><i class="ti ti-printer"></i> พิมพ์ / บันทึก PDF</button>
      </div></div>
      <div id="qrSheet" class="qr-sheet" aria-live="polite"></div>`;
  },
  after(){ makeRoomQR(); }
};
async function makeRoomQR(){
  const box=document.getElementById('qrSheet'); if(!box) return;
  QRS.rooms=document.getElementById('qrRooms').value;
  const b=document.getElementById('qrB').value, bi=getBI(b), fsel=document.getElementById('qrF').value;
  let rows=QRS.rooms.split('\n').map(s=>s.trim()).filter(Boolean).map(s=>{ const p=s.split('|'); return p.length>1?{fl:p[0].trim(),rm:p.slice(1).join('|').trim()}:{fl:fsel,rm:s}; });
  if(!rows.length) rows=[{fl:fsel,rm:''}];
  box.innerHTML='<div class="sk" style="height:180px"></div>';
  try{ await loadScript(QR_LIB); }catch(e){ box.innerHTML='<div class="notice n-red">โหลดตัวสร้าง QR ไม่สำเร็จ — ตรวจอินเทอร์เน็ตแล้วลองใหม่</div>'; return; }
  box.innerHTML=rows.slice(0,120).map(x=>{
    const url=roomUrl(b,x.fl,x.rm), q=qrcode(0,'M'); q.addData(url); q.make();
    return `<figure class="qr-card"><div class="qr-top">แจ้งซ่อม · สแกนเลย</div>${q.createSvgTag({cellSize:4,margin:2,scalable:true})}
      <figcaption><b>${escHtml(x.rm||'(ทุกห้อง)')}</b><span>${escHtml(bi.short||bi.name)}${x.fl?' · '+escHtml(flLabel(x.fl)):''}</span></figcaption>
      <div class="qr-ft">งานอาคารสถานที่ คณะการแพทย์แผนไทย</div></figure>`;
  }).join('');
}
Object.assign(ACTIONS,{ 'qr-make': ()=>makeRoomQR(), 'qr-print': ()=>window.print() });
