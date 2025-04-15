// Increment version to force update on change
const CACHE_NAME = 'fashn-cache-v2';
const OFFLINE_URL = '/design/noInternet/sorryPage.html'; // Define offline page URL

// List assets to cache on install
const CORE_ASSETS = [
    '/', // Root path (often serves index.html)
    '/index.html',
    '/main.html',
    '/login.js',
    '/main.js',
    '/design/login/login.css',
    '/design/palette.css',
    '/main.css',
    '/manifest.json',
    '/icons/icon1_pwa.png', // Cache essential icons
    '/icons/icon1square_pwa.png',
    'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600&display=swap', // Cache fonts
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css', // Cache FontAwesome CSS
    // Add FontAwesome font files if needed and allowed by CDN policy
    OFFLINE_URL, // Cache the offline page itself
    '/design/noInternet/sorryPage.css',
    '/design/noInternet/sorryPage.js'
];


self.addEventListener('install', event => {
    console.log('[SW] Install event');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] Caching core assets');
                return cache.addAll(CORE_ASSETS);
            })
            .catch(error => {
                console.error('[SW] Failed to cache core assets:', error);
                // Decide if install should fail if caching fails
            })
            .then(() => {
                 console.log('[SW] Installation complete, activating immediately.');
                 return self.skipWaiting(); // Activate the new SW immediately
            })
    );
});

self.addEventListener('activate', event => {
    console.log('[SW] Activate event');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.filter(cacheName => {
                    // Delete caches that are not the current one
                    return cacheName.startsWith('fashn-cache-') && cacheName !== CACHE_NAME;
                }).map(cacheName => {
                    console.log('[SW] Deleting old cache:', cacheName);
                    return caches.delete(cacheName);
                })
            );
        }).then(() => {
             console.log('[SW] Claiming clients.');
             return self.clients.claim(); // Take control of uncontrolled clients
        })
    );
});

self.addEventListener('fetch', event => {
    const request = event.request;

    // --- Navigation Requests ---
    // Use Network-first for HTML pages to get latest content, fallback to cache/offline
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then(networkResponse => {
                    // Check if response is valid
                     if (!networkResponse || networkResponse.status !== 200) {
                        // If network fails, try cache, then offline page
                         return caches.match(request)
                             .then(cachedResponse => cachedResponse || caches.match(OFFLINE_URL));
                    }
                    // Cache the valid network response for future offline use
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(request, responseToCache));
                    return networkResponse;
                })
                .catch(error => {
                    console.warn('[SW] Network fetch failed for navigation, trying cache/offline:', error);
                    // Network error: try cache, then offline page
                    return caches.match(request)
                        .then(cachedResponse => cachedResponse || caches.match(OFFLINE_URL))
                        .catch(() => caches.match(OFFLINE_URL)); // Ensure offline page is returned if cache also fails
                })
        );
        return; // Stop processing for navigation requests
    }

    // --- Non-Navigation Requests (CSS, JS, Images, Fonts, etc.) ---
    // Use Cache-first strategy
    if (request.method === 'GET') {
         event.respondWith(
            caches.match(request)
                .then(cachedResponse => {
                    // Cache hit - return response
                    if (cachedResponse) {
                        // console.log('[SW] Serving from cache:', request.url);
                        return cachedResponse;
                    }

                    // Not in cache - fetch from network
                    return fetch(request).then(
                        networkResponse => {
                            // Check if valid response received
                            if (!networkResponse || networkResponse.status !== 200 /* Consider allowing other 2xx? */) {
                                // console.log('[SW] Invalid network response:', request.url, networkResponse.status);
                                return networkResponse; // Return invalid response as is
                            }

                            // Cache the valid network response
                             const responseToCache = networkResponse.clone();
                             caches.open(CACHE_NAME)
                                 .then(cache => {
                                      // console.log('[SW] Caching new resource:', request.url);
                                      cache.put(request, responseToCache);
                                 })
                                 .catch(cacheError => console.error('[SW] Failed to cache resource:', request.url, cacheError));

                            return networkResponse;
                        }
                    ).catch(error => {
                        console.warn('[SW] Network fetch failed for asset:', request.url, error);
                        // For assets (CSS, JS, images), returning an error or nothing might be better
                        // than showing the offline page, unless it's a critical image/asset.
                        // Return a simple error response
                         return new Response(`Network error fetching ${request.url}`, {
                           status: 408, // Request Timeout
                           headers: { 'Content-Type': 'text/plain' }
                         });
                    });
                })
        );
    }
    // Ignore non-GET requests (like POST to API) - let them go directly to network
});