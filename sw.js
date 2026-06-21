const CACHE_NAME = 'house-cal-v41';

// App shell: all same-origin assets that must work offline
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './weather.html',
  './style.css',
  './app.js',
  './weather.js',
  './manifest.json',
  './fullcalendar.min.js',
  './icon-192.png',
  './icon-512.png',
  './cambrils-header.jpg'
];

// Precache app shell on install
self.addEventListener('install', evt => {
  self.skipWaiting();
  evt.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_ASSETS))
  );
});

// Remove old caches on activate
self.addEventListener('activate', evt => {
  evt.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', evt => {
  if (evt.request.method !== 'GET') return;

  const url = new URL(evt.request.url);

  // Google Fonts: stale-while-revalidate (cache first, refresh in background)
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    evt.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(evt.request).then(cached => {
          const networkFetch = fetch(evt.request).then(response => {
            cache.put(evt.request, response.clone());
            return response;
          });
          return cached || networkFetch;
        })
      )
    );
    return;
  }

  // Same-origin app shell: cache-first (fast loads, works fully offline)
  if (url.origin === self.location.origin) {
    evt.respondWith(
      caches.match(evt.request).then(cached => {
        if (cached) return cached;
        // Not in cache yet (e.g. first load race): fetch and cache it
        return fetch(evt.request).then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(evt.request, clone));
          return response;
        });
      })
    );
    return;
  }

  // Everything else (Firebase, APIs): network-only; no caching of live data
  evt.respondWith(fetch(evt.request));
});
