// Service worker — ระบบแจ้งซ่อมออนไลน์ v15
// หน้าเว็บ: ดึงจากเน็ตก่อน (ได้เวอร์ชันล่าสุดเสมอ) ถ้าออฟไลน์ใช้ฉบับที่เก็บไว้
// ข้อมูลจาก Google Apps Script ไม่ผ่าน service worker (ไม่แคช)
const CACHE = 'repair-v15';
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname.endsWith('google.com') || url.hostname.endsWith('googleusercontent.com')) return;   // API / รูปใน Drive
  if (req.mode === 'navigate' || url.origin === location.origin) {
    e.respondWith(fetch(req).then(res => {
      if (res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); }
      return res;
    }).catch(() => caches.match(req).then(r => r || caches.match('./index.html'))));
    return;
  }
  // ฟอนต์/ไอคอนจาก CDN: ใช้ของในแคชก่อน
  if (/fonts\.(googleapis|gstatic)\.com|cdnjs\.cloudflare\.com/.test(url.hostname)) {
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return res; })));
  }
});
