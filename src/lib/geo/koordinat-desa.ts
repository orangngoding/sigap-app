// Koordinat kelurahan/desa yang presisi. Data wilayah SIGAP hanya memuat koordinat pusat kabupaten/kota, sedangkan
// prakiraan cuaca BMKG per kelurahan (adm4) menyertakan koordinat desa itu sendiri (data wilayah Kemendagri yang
// dipakai BMKG). Koordinat diambil dari rute SIGAP /api/cuaca (sudah di-cache), lalu diperiksa kewajarannya.
import { jarakKm } from "@/lib/data/titik-panas";

/** Desa harus berada di Indonesia dan dalam jarak wajar dari pusat kab/kota (kab/kota terluas pun < 300 km). */
export const BATAS_JARAK_KM = 300;

export function koordinatWajar(desa: { lat: number | null; lon: number | null }, pusat: { lat: number; lon: number }): desa is { lat: number; lon: number } {
  const { lat, lon } = desa;
  if (typeof lat !== "number" || typeof lon !== "number" || !Number.isFinite(lat) || !Number.isFinite(lon)) return false;
  if (lat < -12 || lat > 7 || lon < 94 || lon > 142) return false;
  return jarakKm(lat, lon, pusat.lat, pusat.lon) <= BATAS_JARAK_KM;
}

/** Ambil koordinat desa untuk kode adm4; null bila BMKG tidak terjangkau atau koordinatnya tidak wajar. */
export async function ambilKoordinatDesa(adm4: string, pusat: { lat: number; lon: number }, signal?: AbortSignal): Promise<{ lat: number; lon: number } | null> {
  try {
    const res = await fetch(`/api/cuaca?adm4=${encodeURIComponent(adm4)}`, { signal });
    if (!res.ok) return null;
    const d = (await res.json()) as { lokasi?: { lat: number | null; lon: number | null } };
    const k = d.lokasi ?? { lat: null, lon: null };
    return koordinatWajar(k, pusat) ? { lat: Math.round(k.lat * 1e5) / 1e5, lon: Math.round(k.lon * 1e5) / 1e5 } : null;
  } catch {
    return null;
  }
}
