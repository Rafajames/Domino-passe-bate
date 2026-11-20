/* Service worker: app shell offline. Navegação: rede primeiro; assets com hash: cache primeiro.
 * Gerado no build a partir de pwa/sw-template.js: o marcador de versão muda a cada publicação,
 * o que faz o navegador instalar o service worker novo (atualização). */
const CACHE = 'dpb-__BUILD__';
// Caminhos relativos ao escopo: funciona na raiz (Vercel) e em /<repo>/ (GitHub Pages).
const ROOT = new URL('./', self.registration.scope).href;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll([ROOT, ROOT + 'manifest.webmanifest', ROOT + 'icon.svg'])));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  // Verificação de atualização: sempre da rede.
  if (url.pathname.endsWith('/version.json')) return;
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(ROOT, copy));
          return res;
        })
        .catch(() => caches.match(ROOT)),
    );
    return;
  }
  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});

// A página pede para o service worker novo assumir já.
self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});
