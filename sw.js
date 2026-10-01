/* ALP board service worker.
   The board and its record: newest from the network first, the last copy when
   offline (so the app opens on a plane). Icons: from the cache. Everything
   else on the site -- including any private page -- is never touched. */
const CACHE = "alp-v1";
const SHELL = ["./", "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png"];
const FRESH = /\/(index\.html|record\.json)?$/;            // the board itself and its record
const STATIC = /\/(manifest\.webmanifest|icon-[\w-]+\.png|apple-touch-icon\.png|og\.png)$/;

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if(req.method !== "GET" || url.origin !== location.origin) return;
  const scope = new URL(self.registration.scope).pathname;
  if(!url.pathname.startsWith(scope)) return;
  const path = "/" + url.pathname.slice(scope.length);
  if(FRESH.test(path)){
    e.respondWith(fetch(req, {cache: "no-store"}).then(res => {
      if(res.ok){ const copy = res.clone(); caches.open(CACHE).then(c => c.put(path === "/index.html" ? "./" : req, copy)); }
      return res;
    }).catch(() => caches.match(path === "/index.html" ? "./" : req, {ignoreSearch: true})));
  } else if(STATIC.test(path)){
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      if(res.ok){ const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; })));
  }
});
