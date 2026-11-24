/* =====================================================================
 * PAINEL DA LOJA ADMIN — SERVICE WORKER
 * - Abre o painel mesmo com internet instável (arquivos guardados no aparelho)
 * - Os DADOS (Supabase) nunca são guardados em cache: sempre vêm atualizados
 * - Mostra notificações de novos pedidos e abre o painel ao tocar nelas
 *
 * Ao publicar uma nova versão do painel, aumente o número abaixo.
 * ===================================================================== */
const VERSAO = 'loja-admin-v1';
const CACHE_APP = VERSAO + '-app';
const CACHE_CDN = VERSAO + '-cdn';

const ARQUIVOS_APP = [
  './admin.html',
  './manifest-admin.json',
  './admin-icone-192.png', './admin-icone-512.png'
];
// Arquivos opcionais (se não existirem no servidor, a instalação continua)
const ARQUIVOS_OPCIONAIS = ['./campainha.wav', './som-sino.wav', './som-alerta.wav', './som-buzina.wav', './som-melodia.wav', './config.js'];

const CDNS = ['cdn.tailwindcss.com', 'cdn.jsdelivr.net', 'cdnjs.cloudflare.com', 'db.onlinewebfonts.com'];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_APP);
    await cache.addAll(ARQUIVOS_APP);
    await Promise.all(ARQUIVOS_OPCIONAIS.map((url) => cache.add(url).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const nomes = await caches.keys();
    await Promise.all(nomes.filter((n) => n.startsWith('loja-admin-') && !n.startsWith(VERSAO)).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Supabase (dados, login, tempo real): sempre direto na internet
  if (url.hostname.endsWith('supabase.co') || url.hostname.endsWith('supabase.in')) return;

  // Bibliotecas externas: usa a cópia guardada e atualiza em segundo plano
  if (CDNS.includes(url.hostname)) {
    event.respondWith(cacheAtualizandoEmSegundoPlano(event, req));
    return;
  }

  // Arquivos do próprio painel: tenta a internet primeiro (pega versão nova), cai para o cache se offline
  if (url.origin === self.location.origin) {
    event.respondWith(redePrimeiro(req));
  }
});

async function redePrimeiro(req) {
  const cache = await caches.open(CACHE_APP);
  try {
    const resp = await fetch(req);
    if (resp && resp.ok) cache.put(req, resp.clone());
    return resp;
  } catch (e) {
    const guardado = await cache.match(req, { ignoreSearch: true });
    if (guardado) return guardado;
    if (req.mode === 'navigate') {
      const pagina = await cache.match('./admin.html');
      if (pagina) return pagina;
    }
    return new Response('Sem conexão', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
}

async function cacheAtualizandoEmSegundoPlano(event, req) {
  const cache = await caches.open(CACHE_CDN);
  const guardado = await cache.match(req);
  const buscar = fetch(req).then((resp) => {
    if (resp && (resp.ok || resp.type === 'opaque')) cache.put(req, resp.clone());
    return resp;
  }).catch(() => guardado);
  if (guardado) { event.waitUntil(buscar); return guardado; }
  return buscar;
}

// Tocar na notificação abre (ou traz para frente) o painel na aba Pedidos
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const destino = (event.notification.data && event.notification.data.url) || './admin.html#pedidos';
  event.waitUntil((async () => {
    const janelas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of janelas) {
      if (c.url.includes('admin.html')) {
        c.postMessage({ tipo: 'abrir-aba', aba: 'pedidos' });
        return c.focus();
      }
    }
    return self.clients.openWindow(destino);
  })());
});

// Notificação push vinda do servidor (novo pedido), mesmo com o painel fechado
self.addEventListener('push', (event) => {
  let dados = {};
  try { dados = event.data ? event.data.json() : {}; } catch (e) { dados = { titulo: event.data && event.data.text() }; }
  event.waitUntil((async () => {
    await self.registration.showNotification(dados.titulo || '🔔 Novo pedido!', {
      body: dados.corpo || 'Abra o painel para aceitar.',
      icon: 'admin-icone-192.png',
      badge: 'admin-icone-192.png',
      tag: dados.tag || 'pedido',
      renotify: true,
      requireInteraction: true,           // fica na tela até você tocar
      silent: false,
      vibrate: [500, 200, 500, 200, 500, 200, 800],
      timestamp: Date.now(),
      data: { url: './admin.html#pedidos' }
    });
    // se o painel estiver aberto, atualiza a lista e toca a campainha na hora
    const janelas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    janelas.forEach((c) => c.postMessage({ tipo: 'novo-pedido' }));
  })());
});
