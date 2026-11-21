import { ApiError } from "./api-error";

// Allowlist host keluar (Blueprint 13.1). Tidak ada URL dari masukan pengguna.
const ALLOWED_HOSTS = new Set([
  "api.bmkg.go.id",
  "data.bmkg.go.id",
  "archive-api.open-meteo.com",
  "climate-api.open-meteo.com", // proyeksi iklim CMIP6 (Mesin Waktu Iklim)
  "api.open-meteo.com", // prakiraan 16 hari (Siaga Iklim, Minggu ini)
  "air-quality-api.open-meteo.com", // kualitas udara PM2.5 CAMS (asap karhutla, polusi)
  "www.bmkg.go.id", // umpan peringatan dini (RSS/CAP)
  "news.google.com", // umpan RSS berita bencana (Pustaka)
  "www.antaranews.com", // RSS ANTARA, kantor berita resmi (Pustaka > Berita)
  "www.gdacs.org", // peringatan bencana global PBB dan Komisi Eropa (Pustaka > Berita)
  "www.cpc.ncep.noaa.gov", // indeks ONI (El Niño/La Niña) NOAA CPC (Siaga Iklim)
  "psl.noaa.gov", // indeks Niño 3.4 dan DMI (IOD) NOAA PSL (Siaga Iklim)
  "firms.modaps.eosdis.nasa.gov", // titik panas satelit VIIRS NASA FIRMS (karhutla)
  "power.larc.nasa.gov", // NASA POWER: data harian pengamatan 1991-sekarang (cadangan tanpa kuota, Siaga Iklim)
  "earthquake.usgs.gov", // katalog gempa USGS (Profil Risiko Lokasi)
  "api.opentopodata.org", // ketinggian SRTM 90 m (Profil Risiko Lokasi: lereng dan dataran rendah)
  "api.met.no", // MET Norway Locationforecast: cadangan prakiraan 9 hari bila Open-Meteo menolak
]);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface UpstreamOptions {
  timeoutMs?: number; // default 8 detik
  revalidateSeconds?: number; // cache fetch Next.js
  /** Jumlah percobaan (bawaan 2). Permintaan lambat seperti proyeksi iklim memakai 1 agar tidak melewati batas durasi. */
  percobaan?: number;
  /** Header tambahan (mis. User-Agent yang diwajibkan MET Norway). */
  headers?: Record<string, string>;
}

/**
 * GET JSON dari hulu: timeout 8 dtk, satu kali ulang (jeda 300 ms) untuk 5xx / waktu habis.
 * Melempar ApiError(SUMBER_TIMEOUT | SUMBER_GAGAL).
 */
export async function fetchUpstreamJson<T = unknown>(url: string, opsi: UpstreamOptions = {}): Promise<T> {
  return fetchUpstream<T>(url, "json", opsi);
}

/** GET teks (mis. RSS/CAP XML) dengan aturan yang sama seperti fetchUpstreamJson. */
export async function fetchUpstreamText(url: string, opsi: UpstreamOptions = {}): Promise<string> {
  return fetchUpstream<string>(url, "text", opsi);
}

async function fetchUpstream<T>(
  url: string,
  jenis: "json" | "text",
  { timeoutMs = 8000, revalidateSeconds = 0, percobaan = 2, headers }: UpstreamOptions,
): Promise<T> {
  const host = new URL(url).hostname;
  if (!ALLOWED_HOSTS.has(host)) throw new ApiError("GALAT_INTERNAL");

  let lastTimeout = false;
  for (let attempt = 0; attempt < percobaan; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: { Accept: jenis === "json" ? "application/json" : "application/xml, text/xml, application/rss+xml, */*", ...headers },
        next: { revalidate: revalidateSeconds },
      });
      if (res.ok) return (jenis === "json" ? await res.json() : await res.text()) as T;
      lastTimeout = false;
      if (res.status === 429) throw new ApiError("BATAS_HULU"); // kuota penyedia habis: bukan galat server kami, jangan diulang
      if (res.status < 500) throw new ApiError("SUMBER_GAGAL"); // 4xx: tidak diulang
    } catch (e) {
      if (e instanceof ApiError) throw e;
      lastTimeout = e instanceof Error && e.name === "AbortError";
    } finally {
      clearTimeout(timer);
    }
    if (attempt < percobaan - 1) await sleep(300);
  }
  throw new ApiError(lastTimeout ? "SUMBER_TIMEOUT" : "SUMBER_GAGAL");
}
