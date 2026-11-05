// Senda: guarda la app en el celular para que abra rápido, con o sin internet.
const CACHE = "senda-v27";
const FILES = ["./", "index.html", "manifest.webmanifest", "icons/icon-app-192.png", "icons/icon-app-512.png", "icons/icon-180.png", "fonts/dm-sans-400.woff2", "fonts/dm-sans-500.woff2", "fonts/dm-sans-600.woff2", "fonts/dm-sans-700.woff2"];
const WAIT = 2500; // si la red tarda más que esto (datos móviles lentos), se abre la copia guardada

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(FILES.map(f => c.add(f).catch(() => {})))));
  self.skipWaiting();
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

function fromNetwork(req) {
  return fetch(req.mode === "navigate" ? req.url : req, { cache: "no-cache" }).then(r => {
    if (r && r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return r;
  });
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  if (new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const cached = (await caches.match(req)) || (req.mode === "navigate" ? await caches.match("index.html") : null);
    const net = fromNetwork(req);
    if (!cached) return net.catch(() => new Response("Sin conexión", { status: 503 }));
    // Con copia guardada: usa la red si responde rápido; si no, abre la copia y actualiza en segundo plano.
    const timeout = new Promise(res => setTimeout(() => res(null), WAIT));
    const winner = await Promise.race([net.catch(() => null), timeout]);
    if (winner && winner.ok) return winner;
    net.catch(() => {});
    return cached;
  })());
});
