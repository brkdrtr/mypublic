/* Offline icin onbellek. Surum degisince eski onbellek silinir. */
const CACHE = 'dutch-a2-v10';
const FILES = ['./', 'index.html', 'style.css', 'app.js', 'vocab.js', 'vocab-ex.js', 'grammar.js', 'content.js', 'knm.js', 'knm-visual.js', 'a1.js', 'audio/index.js', 'lexicon.js', 'lexicon-en.js', 'en-vocab.js', 'en-content.js', 'i18n-en.js', 'vendor/anthropic-sdk-0.127.0.mjs', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
