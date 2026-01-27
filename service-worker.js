// service-worker.js
const CACHE_NAME = 'photo-tools-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
  // ────────────────────────────────────────────────
  // Add ALL your important files here!
  // Example if you have CSS/JS:
  // '/styles.css',
  // '/script.js',
  // '/images/photo1.jpg',
  // etc.
  // ────────────────────────────────────────────────
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache opened');
        return cache.addAll(urlsToCache);
      })
      .catch(err => console.error('Cache addAll failed:', err))
  );
  // Skip waiting so new SW activates immediately
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
  );
  // Take control of the page immediately
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return from cache if found
        if (response) {
          return response;
        }
        // Otherwise fetch from network
        return fetch(event.request).catch(() => {
          // Optional: fallback for offline (e.g. show offline page)
          // return caches.match('/offline.html');
        });
      })
  );
});
