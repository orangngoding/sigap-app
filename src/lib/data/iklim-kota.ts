// Proyeksi iklim bawaan untuk kota-kota utama: dihitung SEKALI (npm run bangun:iklim-kota) lalu disimpan di repositori.
// Alasan: proyeksi 60 tahun dua model adalah permintaan yang sangat berat bagi kuota gratis Open-Meteo (hanya belasan
// lokasi baru per hari untuk SEMUA pengguna), sehingga lokasi baru sering gagal (429/502) dan lambat (15-30 detik).
// Dengan data bawaan, lokasi di sekitar kota utama tampil seketika tanpa memanggil penyedia; lokasi lain tetap dihitung
// langsung, dan bila penyedia menolak, kota bawaan terdekat dipakai sebagai cadangan dengan label yang jelas.
import type { ProyeksiResponse } from "./proyeksi";
import { jarakKm } from "./titik-panas";

export interface KotaBawaan {
  nama: string;
  lat: number;
  lon: number;
}
export interface ProyeksiKota extends KotaBawaan {
  data: ProyeksiResponse;
}
export interface BerkasProyeksiKota {
  versi: 1;
  dibuat: string | null;
  kota: ProyeksiKota[];
}

/** Lokasi dalam jarak ini dari kota bawaan memakai data bawaan tanpa menghubungi penyedia. */
export const JARAK_LANGSUNG_KM = 40;
/** Bila penyedia menolak, kota bawaan sampai jarak ini dipakai sebagai perkiraan (dengan label). */
export const JARAK_CADANGAN_KM = 250;

/**
 * Urutan prioritas pembuatan data: ibu kota provinsi dan kota besar yang paling mungkin dipilih pengguna,
 * tersebar agar tiap wilayah iklim (khatulistiwa, monsun, kering) terwakili lebih dulu.
 */
export const KOTA_PRIORITAS: KotaBawaan[] = [
  { nama: "Jakarta", lat: -6.2, lon: 106.85 },
  { nama: "Surabaya", lat: -7.25, lon: 112.75 },
  { nama: "Medan", lat: 3.59, lon: 98.67 },
  { nama: "Makassar", lat: -5.15, lon: 119.43 },
  { nama: "Palangka Raya", lat: -2.21, lon: 113.92 },
  { nama: "Kupang", lat: -10.17, lon: 123.6 },
  { nama: "Jayapura", lat: -2.53, lon: 140.7 },
  { nama: "Bandung", lat: -6.91, lon: 107.61 },
  { nama: "Palembang", lat: -2.98, lon: 104.75 },
  { nama: "Pontianak", lat: -0.03, lon: 109.33 },
  { nama: "Denpasar", lat: -8.65, lon: 115.22 },
  { nama: "Padang", lat: -0.95, lon: 100.35 },
  { nama: "Semarang", lat: -6.97, lon: 110.42 },
  { nama: "Banjarmasin", lat: -3.32, lon: 114.59 },
  { nama: "Manado", lat: 1.47, lon: 124.84 },
  { nama: "Banda Aceh", lat: 5.55, lon: 95.32 },
  { nama: "Pekanbaru", lat: 0.51, lon: 101.45 },
  { nama: "Yogyakarta", lat: -7.8, lon: 110.36 },
  { nama: "Balikpapan", lat: -1.27, lon: 116.83 },
  { nama: "Mataram", lat: -8.58, lon: 116.12 },
  { nama: "Bandar Lampung", lat: -5.43, lon: 105.26 },
  { nama: "Ambon", lat: -3.7, lon: 128.18 },
  { nama: "Merauke", lat: -8.5, lon: 140.4 },
  { nama: "Jambi", lat: -1.6, lon: 103.61 },
  { nama: "Palu", lat: -0.9, lon: 119.87 },
  { nama: "Kendari", lat: -3.97, lon: 122.51 },
  { nama: "Sorong", lat: -0.88, lon: 131.26 },
  { nama: "Bengkulu", lat: -3.8, lon: 102.26 },
  { nama: "Ternate", lat: 0.79, lon: 127.38 },
  { nama: "Samarinda", lat: -0.5, lon: 117.15 },
];

export function cariKotaTerdekat(daftar: ProyeksiKota[], lat: number, lon: number): { kota: ProyeksiKota; km: number } | null {
  let terbaik: { kota: ProyeksiKota; km: number } | null = null;
  for (const kota of daftar) {
    const km = jarakKm(lat, lon, kota.lat, kota.lon);
    if (!terbaik || km < terbaik.km) terbaik = { kota, km };
  }
  return terbaik;
}

/** Data kota bawaan untuk dipakai di lokasi pengguna, ditandai agar antarmuka menjelaskan asalnya. */
export function dariKota(k: ProyeksiKota, km: number, alasan: "kota-terdekat" | "cadangan-kuota"): ProyeksiResponse {
  return { ...k.data, stale: false, perkiraan: { kota: k.nama, km: Math.round(km), alasan } };
}

/**
 * Pilih sumber proyeksi: kota bawaan terdekat bila dekat sekali; selain itu hitung langsung. Bila gagal: (1) cadangan
 * lokal tanpa kuota bila diberikan (metode delta dari pengamatan lokasi ini), (2) kota bawaan yang cukup dekat sebagai
 * perkiraan berlabel. Galat asli dilempar ulang bila semuanya tidak tersedia.
 */
export async function pilihProyeksi(
  daftar: ProyeksiKota[],
  lat: number,
  lon: number,
  langsung: () => Promise<ProyeksiResponse>,
  lokal?: () => Promise<ProyeksiResponse>,
): Promise<ProyeksiResponse> {
  const dekat = cariKotaTerdekat(daftar, lat, lon);
  if (dekat && dekat.km <= JARAK_LANGSUNG_KM) return dariKota(dekat.kota, dekat.km, "kota-terdekat");
  try {
    return await langsung();
  } catch (e) {
    if (lokal) {
      try {
        return await lokal();
      } catch {
        // lanjut ke kota bawaan
      }
    }
    if (dekat && dekat.km <= JARAK_CADANGAN_KM) return dariKota(dekat.kota, dekat.km, "cadangan-kuota");
    throw e;
  }
}
