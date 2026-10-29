// HM26 — sürüme özel çevrimdışı uygulama kabuğu.
// Her build'in içerik karması ve dosya listesi tools/inject-sw-manifest.mjs tarafından doldurulur.
const CACHE_PREFIX = 'hm26-';
const BUILD_VERSION = '__BUILD_VERSION__';
const CACHE = `${CACHE_PREFIX}v015-${BUILD_VERSION}`;
const PRECACHE = __PRECACHE__;

self.addEventListener('install', (event) => {
  // Güncelleme, kullanıcı onaylayana kadar eski worker'dan ayrı bir cache'te bekler.
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE);
      await cache.addAll(PRECACHE.map((url) => new Request(url, { cache: 'reload' })));
    } catch (error) {
      // A failed installation must not leave partial release caches consuming storage.
      await caches.delete(CACHE);
      throw error;
    }
  })());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = (await caches.keys()).filter((name) => name.startsWith(CACHE_PREFIX));
    const index = names.indexOf(CACHE);
    // Keep the immediately preceding release for old tabs' lazy, hash-named bundles.
    // Never delete unrelated application caches or a newer worker's waiting cache.
    if (index > 1) await Promise.all(names.slice(0, index - 1).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    // A navigation must keep its own release's shell, online or offline, until update approval.
    if (event.request.mode === 'navigate') {
      const shell = await cache.match('/');
      if (shell) return shell;
      return fetch(event.request);
    }
    const cached = await cache.match(event.request);
    if (cached) return cached;

    // After another tab activates an update, an old page can still request its lazy JS/CSS.
    // These names are content-hashed; do not borrow mutable URLs from older caches.
    if (url.pathname.startsWith('/assets/') && /-[A-Za-z0-9_-]{8,}\.(?:js|css)$/.test(url.pathname)) {
      const names = (await caches.keys()).filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE).reverse();
      for (const name of names) {
        const old = await (await caches.open(name)).match(event.request);
        if (old) return old;
      }
    }
    const response = await fetch(event.request);
    if (response.ok) await cache.put(event.request, response.clone());
    return response;
  })());
});
