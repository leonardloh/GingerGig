const CACHE = 'gingergig-v2';

const PRECACHE = [
  '/',
  '/index.html',
  '/logo.png',
  '/manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

// Network-first for API calls; cache-first for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin requests
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // For JS/CSS/fonts — cache first, fall back to network (images use network-first below)
  if (
    url.pathname.match(/\.(js|css|woff2?|svg|ico)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => cached ?? fetch(request).then((res) => {
        const clone = res.clone();
        caches.open(CACHE).then((cache) => cache.put(request, clone));
        return res;
      })),
    );
    return;
  }

  // For images — network first, fall back to cache
  if (url.pathname.match(/\.(png|jpg|jpeg|webp|gif)$/)) {
    event.respondWith(
      fetch(request).then((res) => {
        const clone = res.clone();
        caches.open(CACHE).then((cache) => cache.put(request, clone));
        return res;
      }).catch(() => caches.match(request)),
    );
    return;
  }

  // For HTML navigation — network first, fall back to cached index
  event.respondWith(
    fetch(request).catch(() => caches.match('/index.html')),
  );
});
