// Service worker — ระบบแจ้งซ่อมออนไลน์ (v15.4)
// หน้าเว็บ: ถามเซิร์ฟเวอร์ทุกครั้งว่ามีไฟล์ใหม่ไหม (ไม่ใช้แคชเบราว์เซอร์ค้าง) ถ้าออฟไลน์ใช้ฉบับที่เก็บไว้
// ข้อมูลจาก Google Apps Script ไม่ผ่าน service worker (ไม่แคช)
const CACHE = 'repair-v15-4';
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname.endsWith('google.com') || url.hostname.endsWith('googleusercontent.com')) return;   // API / รูปใน Drive
  if (req.mode === 'navigate' || url.origin === location.origin) {
    e.respondWith(fetch(req, { cache: 'no-cache' }).then(res => {   // no-cache = ตรวจกับเซิร์ฟเวอร์ทุกครั้ง (ได้ไฟล์ล่าสุดทันทีที่อัปโหลด)
      if (res.ok && !url.search.includes('_v=')) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('./index.html'))));
    return;
  }
  if (/fonts\.(googleapis|gstatic)\.com|cdnjs\.cloudflare\.com/.test(url.hostname)) {
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return res; })));
  }
});
