// Service worker SIGAP (Blueprint 8.2 dan 17.3).
// - Saat dipasang: simpan halaman inti offline (Mode Darurat, Kartu Siaga, Beranda) BESERTA berkas JS/CSS yang
//   dirujuk HTML-nya, agar Mode Darurat tetap berfungsi dalam mode pesawat setelah satu kali kunjungan online.
//   Langkah darurat semua bahaya dan daftar nomor penting ikut terkemas di berkas JS itu.
// - Halaman lain: jaringan dulu, simpan salinan, pakai salinan saat offline.
// - API dan data pribadi tidak pernah disimpan di cache ini (data pengguna ada di localStorage).
// Ganti VERSI tiap rilis agar cache lama dibersihkan.
const VERSI = "sigap-v5";
const HALAMAN_INTI = ["/darurat", "/rencana/kartu", "/"];
const POLA_ASET = /\/_next\/static\/[^"'\s)\\]+/g;

async function simpanHalaman(cache, path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) return;
  const html = await res.clone().text();
  await cache.put(path, res);
  const aset = [...new Set(html.match(POLA_ASET) ?? [])];
  await Promise.allSettled(aset.map((a) => cache.add(a)));
}

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(VERSI)
      .then((c) => Promise.allSettled(HALAMAN_INTI.map((p) => simpanHalaman(c, p))))
      .finally(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== VERSI).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const r = e.request;
  const url = new URL(r.url);
  if (r.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/api/")) return;

  // Aset build berversi (nama berkas memuat hash): ambil dari cache dulu.
  if (url.pathname.startsWith("/_next/static/")) {
    e.respondWith(
      caches.match(r).then(
        (m) =>
          m ||
          fetch(r).then((res) => {
            if (res.ok) {
              const salin = res.clone();
              caches.open(VERSI).then((c) => c.put(r, salin));
            }
            return res;
          }),
      ),
    );
    return;
  }

  // Halaman dan berkas publik lain: jaringan dulu, salinan saat offline. Navigasi yang belum pernah disimpan
  // dialihkan (redirect) ke Mode Darurat (Blueprint 8.7: halaman offline menautkan Mode Darurat dan Kartu Siaga).
  e.respondWith(
    fetch(r)
      .then((res) => {
        if (res.ok && (r.mode === "navigate" || url.pathname.startsWith("/data/"))) {
          const salin = res.clone();
          caches.open(VERSI).then((c) => c.put(r, salin));
        }
        return res;
      })
      .catch(() =>
        caches
          .match(r, { ignoreSearch: r.mode === "navigate" })
          .then(async (m) => {
            if (m || r.mode !== "navigate") return m;
            // Halaman belum tersimpan: ARAHKAN ke Mode Darurat (bukan menyajikan isinya di alamat lain, yang membuat
            // JavaScript halaman asal bentrok dengan HTML Mode Darurat). Bila Mode Darurat juga belum tersimpan, galat biasa.
            return (await caches.match("/darurat")) ? Response.redirect(new URL("/darurat", self.location.origin).href, 302) : undefined;
          }),
      ),
  );
});
