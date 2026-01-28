const CACHE_NAME = 'voice-analytics-v1';
const ASSETS = [
    'index.html',
    'index.css',
    'script.js',
    'user_background.jpg',
    'icon.png',
    'manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
