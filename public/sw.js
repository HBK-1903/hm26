// HM26 Aşama 0 — app-shell service worker (offline PWA çekirdeği)
// v0.9.13 match-console-wave3: hash'li build varlıkları + tüm statik paket INSTALL anında önbelleğe alınır.
// PRECACHE dizisi "npm run build" sonunda tools/inject-sw-manifest.mjs tarafından dist envanteriyle doldurulur.
const CACHE = 'hm26-v013-match-screen';
const PRECACHE = __PRECACHE__;

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  // /assets/** : sürüm hash'li veya sürüm-döngüsüyle eşlenen statikler → önbellek öncelikli (immutable varsayımı)
  if (url.pathname.startsWith('/assets/')) {
    e.respondWith(
      caches.match(e.request).then((m) => m || fetch(e.request).then((res) => {
        if (res.ok) { const cp = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, cp)); }
        return res;
      }))
    );
    return;
  }

  // Navigasyon ve geri kalan her şey: ağ öncelikli; çevrimdışıysa önbellek, son çare app-shell
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
        return res;
      })
      .catch(() => caches.match(e.request).then((m) => m || caches.match('/')))
  );
});
