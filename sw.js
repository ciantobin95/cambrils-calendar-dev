const CACHE_NAME = 'house-cal-v40'; 
const assets = [
  './',
  './index.html',
  './weather.html',
  './style.css',
  './app.js',
  './weather.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './cambrils-header.jpg'
];

self.addEventListener('install', evt => {
  // Forces the waiting service worker to become the active service worker
  self.skipWaiting(); 
  evt.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(assets);
    })
  );
});

self.addEventListener('activate', evt => {
  evt.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', evt => {
  if (evt.request.method !== 'GET') return;

  const requestUrl = new URL(evt.request.url);
  const isLocalRequest = requestUrl.origin === self.location.origin;

  if (isLocalRequest) {
    evt.respondWith(
      fetch(evt.request).then(networkRes => {
        const responseClone = networkRes.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(evt.request, responseClone));
        return networkRes;
      }).catch(() => caches.match(evt.request))
    );
    return;
  }

  evt.respondWith(
    caches.match(evt.request).then(cacheRes => {
      return cacheRes || fetch(evt.request);
    })
  );
});