const CACHE_NAME = 'wmm-audio-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/login.html',
  '/oyente.html',
  '/transmision.html',
  '/monitor.html',
  '/css/style.css',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png'
];

// Instalación: Cachear archivos estáticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activación: Limpiar caches antiguos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Interceptación de peticiones: Cache-first para estáticos, Network-only para Socket/WebRTC
self.addEventListener('fetch', (event) => {
  // No cachear peticiones de WebRTC o Sockets
  if (event.request.url.includes('/socket.io') || event.request.url.includes('webrtc')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
