
const P = 'cuder-bizflow-';
const C = P + 'v7';

const F = [
  './',
  './index.html',
  '../../assets/logo.svg',
  '../../assets/app-i18n.js',
  './cloud.js',
  '../../assets/cuder-auth.js',
  '../../js/config.js',
  '../../assets/cuder-gate.js'
];

const STATIC = new Set(
  F.map(path => new URL(path, self.registration.scope).href)
);

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(C)
      .then(cache => cache.addAll(F))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key.startsWith(P) && key !== C)
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const request = e.request;
  const url = new URL(request.url);

  if (
    request.method !== 'GET' ||
    url.origin !== location.origin
  ) return;

  // Static files: use cache first to avoid unnecessary network delays.
  if (STATIC.has(url.href)) {
    e.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;

        return fetch(request).then(response => {
          if (response.ok && response.type === 'basic') {
            const copy = response.clone();
            caches.open(C).then(cache => cache.put(request, copy));
          }
          return response;
        });
      })
    );
    return;
  }

  // Dynamic requests: keep network-first behavior.
  e.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok && response.type === 'basic') {
          const copy = response.clone();
          caches.open(C).then(cache => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
