// L'app s'ouvre et fabrique des PDF même sans internet ; les nouvelles versions arrivent toutes seules.
// Stratégie « réseau d'abord » : avec internet on prend la dernière version, sans internet la copie gardée.
const CACHE = "baux-v1";
const FICHIERS = [
  "./", "index.html", "css/app.css",
  "js/app.js", "js/config.js", "js/gabarit.js", "js/montant.js", "js/pdf.js",
  "js/apercu.js", "vendor/jspdf.umd.min.js", "manifest.webmanifest",
  "assets/signature.png", "assets/paraphe.png",
  "icons/apple-touch-icon.png", "icons/icon-192.png", "icons/icon-512.png",
  ...Array.from({ length: 9 }, (_, i) => `assets/pages/page${i + 1}.jpg`),
];
const DELAI_RESEAU_MS = 4000;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(FICHIERS.map((f) => new Request(f, { cache: "reload" }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((cles) => Promise.all(cles.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function avecDelai(promesse, ms) {
  return new Promise((ok, ko) => {
    const t = setTimeout(() => ko(new Error("délai")), ms);
    promesse.then((r) => { clearTimeout(t); ok(r); }, (e) => { clearTimeout(t); ko(e); });
  });
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const copie = () => cache.match(req, { ignoreSearch: true })
      .then((r) => r || (req.mode === "navigate" ? cache.match("index.html") : undefined));
    try {
      const rep = await avecDelai(fetch(req, { cache: "no-cache" }), DELAI_RESEAU_MS);
      if (rep && rep.ok && rep.type === "basic") cache.put(req, rep.clone());
      return rep;
    } catch (e) {
      const r = await copie();
      if (r) return r;
      throw e;
    }
  })());
});
