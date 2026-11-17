import { haversineKm } from "./haversine";

export interface KabKotaRingkas {
  kode: string;
  nama: string;
  prov: string;
  lat: number;
  lon: number;
}

/** Batas jarak: lebih jauh dari ini dianggap di luar Indonesia (km dari pusat kab/kota terdekat). */
export const BATAS_JARAK_KM = 250;

/**
 * Kab/kota dengan pusat terdekat dari koordinat, atau null bila tidak ada yang dalam BATAS_JARAK_KM
 * (mis. pengguna di luar Indonesia). Dataset wilayah hanya memuat koordinat tingkat kab/kota.
 */
export function kabKotaTerdekat(lat: number, lon: number, daftar: KabKotaRingkas[]): { kabKota: KabKotaRingkas; jarakKm: number } | null {
  let terbaik: { kabKota: KabKotaRingkas; jarakKm: number } | null = null;
  for (const k of daftar) {
    const d = haversineKm(lat, lon, k.lat, k.lon);
    if (!terbaik || d < terbaik.jarakKm) terbaik = { kabKota: k, jarakKm: d };
  }
  return terbaik && terbaik.jarakKm <= BATAS_JARAK_KM ? terbaik : null;
}
