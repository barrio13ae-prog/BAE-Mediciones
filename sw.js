/* BAE Servicios de Instalaciones: abre aunque falle la conexión, usando la última versión guardada.
   Al publicar cambios, subir el número de CACHE: así la app avisa "Hay una versión nueva". */
const CACHE = 'bae-v63';
const CORE = ['./', './index.html', './srt.js', './logo.js', './nube.js', './presu.js', './informes.js', './clientes.js', './calc.js', './gas.js', './precios-ref.js', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
// librerías externas (PDF y ZIP): se guardan para poder generar informes sin conexión; si fallan no frenan la instalación
const CDN = ['https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE).then(() => c.addAll(CDN).catch(() => {}))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if(e.request.method !== 'GET') return;
  const u = new URL(e.request.url);
  const propio = u.origin === location.origin;
  // Google (ingreso y Drive) nunca pasa por la caché
  if(!propio && u.hostname !== 'cdnjs.cloudflare.com') return;
  // archivos propios: siempre se consulta al servidor si cambiaron (aunque no se haya subido el ?v=)
  const red = propio && e.request.mode !== 'navigate' ? fetch(e.request, { cache: 'no-cache' }) : fetch(e.request);
  // primero la red (siempre la versión nueva); si no hay conexión, lo guardado
  e.respondWith(red.then(r => { if(r.ok && (r.type === 'basic' || r.type === 'cors')){ const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); } return r; })
    .catch(() => caches.match(e.request)
      // sin conexión: "srt.js?v=20" también sirve si solo está guardado "srt.js"
      .then(m => m || (propio ? caches.match(e.request, { ignoreSearch: true }) : null))
      .then(m => m || (e.request.mode === 'navigate' ? caches.match('./index.html') : Response.error()))));
});
