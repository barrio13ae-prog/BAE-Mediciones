/* BAE Mediciones: abre aunque falle la conexión, usando la última versión guardada */
const CACHE = 'bae-v3';
const CORE = ['./', './index.html', './srt.js', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if(e.request.method !== 'GET') return;
  // primero la red (siempre la versión nueva); si no hay conexión, lo guardado
  e.respondWith(fetch(e.request).then(r => { if(r.ok && (r.type === 'basic' || r.type === 'cors')){ const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); } return r; })
    .catch(() => caches.match(e.request).then(m => m || caches.match('./index.html'))));
});
