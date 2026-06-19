// LUT Demo — Service Worker
// Caches all .cube files on first visit, serves from cache thereafter.
// Enables offline use and instant LUT switching.

const CACHE_NAME = 'lut-cache-v2';

// Build list of all .cube files from lut-list.json categories
const CUBE_FILES = [
    // fuji
    'fuji/NC.cube',
    'fuji/NC2.cube',
    'fuji/NN.cube',
    // kodak
    'kodak/Ektar 100.cube',
    'kodak/Gold 100.cube',
    'kodak/Gold 200.cube',
    'kodak/Portra 400.cube',
    'kodak/Portra 800.cube',
    // negative
    'negative/classic warm.cube',
    'negative/cool blue.cube',
    'negative/faded vintage.cube',
    'negative/high contrast.cube',
    'negative/soft pastel.cube',
    // live
    'live/Vivid.cube',
    'live/TFT.cube',
    'live/丹橘.cube',
    'live/复古美食.cube',
    'live/复古胶片.cube',
    'live/9.ms-fugumeishi.cube',
    // new
    'new/姜黄.cube',
    'new/Florida.cube',
    'new/复古暖棕.cube',
    'new/新鲜美食.cube',
    'new/青蓝夜景.cube',
    'new/经典夜景.cube',
    'new/经典人像.cube',
    'new/复古棕.cube',
    'new/Olympus.cube',
    'new/深蓝色风格.cube',
    'new/滋味.cube',
    // device
    'device/zink.cube',
    'device/led.cube',
];

// Install: pre-cache all cube files
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Caching all LUT files...');
            return Promise.allSettled(
                CUBE_FILES.map((path) =>
                    cache.add(path).catch((err) => {
                        console.warn('[SW] Failed to cache:', path, err);
                    })
                )
            );
        })
    );
    // Activate immediately — don't wait for old tabs to close
    self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            )
        )
    );
    // Take control of all clients immediately
    self.clients.claim();
});

// Fetch: serve from cache, fallback to network (and cache the response)
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Only handle .cube files
    if (!url.pathname.endsWith('.cube') && !url.pathname.endsWith('.CUBE')) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) {
                return cached;
            }
            return fetch(event.request).then((response) => {
                if (!response || response.status !== 200) {
                    return response;
                }
                const clone = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, clone);
                });
                return response;
            });
        })
    );
});

// Listen for "preload-complete" message from main page to notify user
self.addEventListener('message', (event) => {
    if (event.data === 'cache-status') {
        caches.open(CACHE_NAME).then((cache) => {
            Promise.allSettled(
                CUBE_FILES.map((path) => cache.match(path))
            ).then((results) => {
                const cached = results.filter((r) => r.status === 'fulfilled' && r.value).length;
                event.source.postMessage({
                    type: 'cache-status',
                    cached: cached,
                    total: CUBE_FILES.length,
                });
            });
        });
    }
});
