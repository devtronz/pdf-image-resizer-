const CACHE = "photo-tools-v1";

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      c.addAll([
        "/",
        "/index.html",
        "/image-resizer.html",
        "/style.css",
        "/pdf.js",
        "/resizer.js",
        "/jspdf.umd.min.js",
        "/manifest.json",
        "/icon-192.png",
        "/icon-512.png"
      ])
    )
  );
  self.skipWaiting();
});

self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});