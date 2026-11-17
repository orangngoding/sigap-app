// Service worker sederhana: simpan halaman dan aset yang pernah dibuka, lalu pakai saat luring.
// Data pribadi tidak disentuh (tersimpan di localStorage, bukan di cache ini). API tidak di-cache.
const CACHE = "sigap-v1";
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.add("/darurat")).catch(() => {})); self.skipWaiting(); });
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const r = e.request;
  const url = new URL(r.url);
  if (r.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/api/")) return;
  e.respondWith(
    fetch(r).then((res) => {
      if (res.ok && (r.mode === "navigate" || url.pathname.startsWith("/_next/static/") || url.pathname === "/darurat")) {
        const salin = res.clone();
        caches.open(CACHE).then((c) => c.put(r, salin));
      }
      return res;
    }).catch(() => caches.match(r).then((m) => m || (r.mode === "navigate" ? caches.match("/darurat") : undefined))),
  );
});
