const CACHE_NAME = 'geologia-vr-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles/main.css',
  '/js/scenes.js',
  '/js/connections.js',
  '/js/utils.js',
  '/manifest.json',
  // imagenes 360°
  '/images/1.jpg',
  '/images/2.jpg',
  '/images/3.jpg',
  '/images/4.jpg',
];

// Instalar el service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache abierto');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch - servir archivos desde cache
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Devolver desde cache si existe
        if (response) {
          return response;
        }
        
        // Si no está en cache, buscar en red
        return fetch(event.request).then((response) => {
          // Verificar que la respuesta sea válida
          if(!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clonar respuesta
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
  );
});

// Limpiar caches antiguos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Eliminando cache antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});