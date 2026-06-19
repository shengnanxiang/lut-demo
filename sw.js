// LUT Demo — Service Worker
// Caches all .cube files on first visit, serves from cache thereafter.
// Enables offline use and instant LUT switching.

const CACHE_NAME = 'lut-cache-v1';

// Build list of all .cube files from lut-list.json categories
const CUBE_FILES = [
    // fuji
    'fuji/fujiNC2-Portrait.cube',
    'fuji/fujiNC2.cube',
    'fuji/fujiNN.cube',
    // kodak
    'kodak/Ektar 100.cube',
    'kodak/Gold 100.cube',
    'kodak/Gold 200.cube',
    'kodak/Portra 400.cube',
    'kodak/Portra 800.cube',
    // negative
    'negative/negative_classic_warm.cube',
    'negative/negative_cool_blue.cube',
    'negative/negative_faded_vintage.cube',
    'negative/negative_high_contrast.cube',
    'negative/negative_soft_pastel.cube',
    // live
    'live/10.fj-xianyan.cube',
    'live/12.TFTzi.cube',
    'live/4.ms-danju.cube',
    'live/5.ms-fugumeishi.cube',
    'live/9.jp-fugujiaopian.cube',
    'live/9.ms-fugumeishi.cube',
    // new
    'new/20260125姜黄.cube',
    'new/7.Florida2.cube',
    'new/fugu-nuanzon.cube',
    'new/meishi-xinxian.cube',
    'new/yejing-qinglansediao.cube',
    'new/yejing11.CUBE',
    'new/双lut叠加-人像.cube',
    'new/复古棕.cube',
    'new/奥林巴斯U2.cube',
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
