// Cleanup-only service worker.
// This file exists solely to undo the previous offline/caching service worker.
// It caches nothing, intercepts no requests, and never needs to change.
// On activate it deletes all old house-cal-* caches, unregisters itself,
// then reloads open tabs once so they run clean without a service worker.

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', evt => {
    evt.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.filter(k => k.startsWith('house-cal')).map(k => caches.delete(k))
            ))
            .then(() => self.registration.unregister())
            .then(() => self.clients.matchAll({ type: 'window' }))
            .then(clients => clients.forEach(client => client.navigate(client.url)))
    );
});
