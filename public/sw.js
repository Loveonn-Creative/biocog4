// Offline games only. This worker keeps one page, /play/ (Chai Break Arcade),
// and serves it when a page visit fails because there is no internet. It never
// caches or serves the app's own files, so it cannot hold back a new build.
const CACHE = 'chai-break-v1';
const PAGE = '/play/';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.add(new Request(PAGE, { cache: 'reload' }))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith('chai-break-') && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.mode !== 'navigate' || req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith(fetch(req).then((res) => {
    // Refresh the saved copy whenever the games page itself is visited online.
    if (url.pathname === PAGE && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(PAGE, copy)); }
    return res;
  }).catch(() => caches.match(PAGE).then((hit) => hit || Response.error())));
});
