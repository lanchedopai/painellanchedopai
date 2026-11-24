/* APP DO GARÇOM — permite instalar; sempre busca a versão nova (sem cache de dados) */
const VERSAO = 'loja-garcom-v1';
self.addEventListener('install', (e) => { e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(['./garcom.html', './config.js']).catch(() => {})).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('loja-garcom-') && k !== VERSAO).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url); if (url.origin !== self.location.origin) return;
  e.respondWith(fetch(req).then((r) => { if (r.ok) { const c = r.clone(); caches.open(VERSAO).then((k) => k.put(req, c)); } return r; }).catch(() => caches.match(req, { ignoreSearch: true })));
});
