/* Service worker for Roach to Jantar Mantar.
 *
 * Network-first so a redeploy is picked up immediately when online (the old
 * cache-first worker served stale HTML that pointed at a deleted JS bundle,
 * making the site look "unreachable"). Falls back to cache only when offline.
 * Bump VERSION on any change so clients update. */
const VERSION = 'r2jm-v2';

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(['./', './index.html']).catch(() => {})));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;

  // Page navigations: always try the network (revalidated) so the freshest
  // index.html — and therefore the current asset bundle — is served.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req, { cache: 'no-cache' })
        .then((res) => {
          const clone = res.clone();
          caches.open(VERSION).then((c) => c.put('./index.html', clone));
          return res;
        })
        .catch(() => caches.match('./index.html').then((hit) => hit || caches.match(req)))
    );
    return;
  }

  // Hashed assets are immutable — cache-first for speed, fall back to network.
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res && res.ok) {
        const clone = res.clone();
        caches.open(VERSION).then((c) => c.put(req, clone));
      }
      return res;
    }))
  );
});
