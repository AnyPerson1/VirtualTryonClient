const CACHE_NAME = 'fashn-cache-v1';

// Install event - when the service worker is first installed
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                // Add essential files to cache here if needed
                console.log('Opened cache');
                // Daha fazla dosyayı önbelleğe almayı düşünebilirsiniz
                return cache.addAll([
                    '/', // Ana dizin
                    '/index.html',
                    '/main.html', // Eğer bu da başlangıçta gerekliyse
                    '/design/login/login.css',
                    '/design/palette.css',
                    '/design/noInternet/sorryPage.html',
                    '/design/noInternet/sorryPage.css',
                    '/design/noInternet/sorryPage.js',
                    // '/icons/icon1_pwa.png', // İkonları da ekleyebilirsiniz
                    // '/icons/icon1square_pwa.png'
                ]);
            })
    );
    self.skipWaiting(); // Yeni service worker'ın hemen aktifleşmesini sağlar
});

// Activate event - when new service worker takes over
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.filter(cacheName => {
                    // Eski önbellekleri sil
                    return cacheName.startsWith('fashn-cache-') && cacheName !== CACHE_NAME;
                }).map(cacheName => {
                    console.log('Deleting old cache:', cacheName);
                    return caches.delete(cacheName);
                })
            );
        }).then(() => self.clients.claim()) // Aktifleşince kontrolü ele alır
    );
});

// Fetch event - handles network requests
self.addEventListener('fetch', event => {
    // Sadece GET isteklerini önbellekten sunmayı tercih edebiliriz
    if (event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Cache hit - return response
                if (response) {
                    return response;
                }

                // Önbellekte yoksa ağı dene
                return fetch(event.request).then(
                    networkResponse => {
                        // Yanıt geçerliyse önbelleğe ekle
                        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                            return networkResponse;
                        }

                        // Önbelleğe eklemeden önce yanıtı klonla
                        const responseToCache = networkResponse.clone();

                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });

                        return networkResponse;
                    }
                ).catch(error => {
                     // Ağ hatası durumunda (ve önbellekte yoksa) çevrimdışı sayfasını göster
                     console.log('Fetch failed; returning offline page instead.', error);
                     // Eğer çevrimdışı için özel bir sayfa varsa onu döndür
                     return caches.match('/design/noInternet/sorryPage.html');
                     // Veya sadece bir hata yanıtı döndür:
                     // return new Response('Network error occurred', { status: 408, headers: { 'Content-Type': 'text/plain' } });
                });
            })
    );
});
// Buradaki fazladan '}' kaldırıldı.

