/** Alamat produksi SIGAP. Dipakai untuk kode QR Kartu Siaga, teks bagikan, dan metadata (og:image, canonical). */
export const URL_PRODUKSI = "https://sigap-app-itrush.vercel.app";

const lokal = (host: string) => host === "localhost" || host === "127.0.0.1" || host.endsWith(".local");

/**
 * Rapikan URL dari env: selalu https (kecuali localhost), tanpa garis miring akhir. Alamat *.vercel.app selain domain
 * produksi (domain lama atau pratinjau) diganti domain produksi agar QR dan pratinjau tautan tidak menunjuk alamat mati.
 */
export function rapikanUrlSitus(nilai: string | undefined): string | null {
  const t = nilai?.trim();
  if (!t) return null;
  let u: URL;
  try {
    u = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`);
  } catch {
    return null;
  }
  if (u.hostname.endsWith(".vercel.app") && u.origin !== URL_PRODUKSI) return URL_PRODUKSI;
  if (!lokal(u.hostname)) u.protocol = "https:";
  return `${u.origin}${u.pathname}`.replace(/\/+$/, "");
}

/** URL publik situs tanpa garis miring akhir. */
export const URL_SITUS =
  rapikanUrlSitus(process.env.NEXT_PUBLIC_SITE_URL) ?? (process.env.NODE_ENV === "production" ? URL_PRODUKSI : "http://localhost:3000");

/** Alamat Mode Darurat untuk QR dan teks bagikan. */
export const URL_DARURAT = `${URL_SITUS}/darurat`;
