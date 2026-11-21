// Titik panas (hotspot) satelit untuk karhutla: deteksi anomali panas VIIRS 375 m dari NASA FIRMS (NOAA-20 dan NOAA-21),
// umpan CSV 7 hari untuk Asia Tenggara tanpa kunci. Titik panas adalah INDIKASI, bukan kepastian kebakaran dan bukan
// luas lahan terbakar (bisa juga panas industri atau pembakaran terkendali); deteksi berkepercayaan "low" dibuang.
// Penyaringan, penghitungan jarak, dan pembuangan deteksi ganda dilakukan kode.
import { fetchUpstreamText } from "@/lib/http/fetch-upstream";

const DASAR = "https://firms.modaps.eosdis.nasa.gov/data/active_fire";
export const URL_FIRMS = [
  `${DASAR}/noaa-20-viirs-c2/csv/J1_VIIRS_C2_SouthEast_Asia_7d.csv`,
  `${DASAR}/noaa-21-viirs-c2/csv/J2_VIIRS_C2_SouthEast_Asia_7d.csv`,
];
export const URL_FIRMS_BERANDA = "https://firms.modaps.eosdis.nasa.gov/map/";

export interface Titik {
  lat: number;
  lon: number;
  /** Waktu deteksi (ms, UTC). */
  t: number;
}
export interface RingkasTitikPanas {
  sumber: { nama: string; url: string; diambilPada: string; lisensi: string };
  stale: boolean;
  /** Radius pencarian dalam km. */
  radiusKm: number;
  dalam24j: number;
  dalam7h: number;
  /** Jarak titik terdekat (km) dan arah mata angin dari lokasi, bila ada dalam 7 hari. */
  terdekat: { km: number; arah: string } | null;
  /** Total titik panas 7 hari di seluruh Indonesia dan per pulau besar (gambaran nasional). */
  nasional: { total: number; perWilayah: Array<{ wilayah: string; jumlah: number }> };
  catatan: string;
}

const KOTAK_INDONESIA = { latMin: -11.5, latMax: 6.5, lonMin: 95, lonMax: 141.5 };
const WILAYAH: Array<[string, number, number, number, number]> = [
  ["Sumatra", -6, 6, 95, 106.5], ["Kalimantan", -4.5, 4.5, 108, 119], ["Jawa", -8.9, -5.8, 105, 115], ["Bali dan Nusa Tenggara", -11, -8, 114.5, 125],
  ["Sulawesi", -6, 2, 118, 125.5], ["Maluku", -8.5, 3, 125.5, 135], ["Papua", -9.5, 0.5, 131, 141.5],
];

/** Baris CSV FIRMS -> titik. Kolom: latitude,longitude,...,acq_date,acq_time,satellite,confidence,... */
export function uraiFirms(csv: string): Titik[] {
  const baris = csv.split(/\r?\n/);
  const kepala = baris[0]?.split(",") ?? [];
  const i = { lat: kepala.indexOf("latitude"), lon: kepala.indexOf("longitude"), tgl: kepala.indexOf("acq_date"), jam: kepala.indexOf("acq_time"), yakin: kepala.indexOf("confidence") };
  if (Object.values(i).some((x) => x < 0)) return [];
  const hasil: Titik[] = [];
  for (let n = 1; n < baris.length; n++) {
    const c = baris[n].split(",");
    if (c.length <= i.yakin) continue;
    const yakin = c[i.yakin].trim().toLowerCase();
    if (yakin === "low" || yakin === "l") continue;
    const lat = Number(c[i.lat]);
    const lon = Number(c[i.lon]);
    if (!(lat >= KOTAK_INDONESIA.latMin && lat <= KOTAK_INDONESIA.latMax && lon >= KOTAK_INDONESIA.lonMin && lon <= KOTAK_INDONESIA.lonMax)) continue;
    const jam = c[i.jam].padStart(4, "0");
    const t = Date.parse(`${c[i.tgl]}T${jam.slice(0, 2)}:${jam.slice(2)}:00Z`);
    if (Number.isFinite(t)) hasil.push({ lat, lon, t });
  }
  return hasil;
}

/** Dua satelit bisa melihat api yang sama: buang deteksi yang jatuh pada sel 0,01 derajat (sekitar 1 km) yang sama di hari yang sama. */
export function buangGanda(titik: Titik[]): Titik[] {
  const lihat = new Set<string>();
  const hasil: Titik[] = [];
  for (const p of titik) {
    const kunci = `${Math.round(p.lat * 100)}:${Math.round(p.lon * 100)}:${Math.floor(p.t / 86_400_000)}`;
    if (lihat.has(kunci)) continue;
    lihat.add(kunci);
    hasil.push(p);
  }
  return hasil;
}

export function jarakKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = Math.PI / 180;
  const a = Math.sin(((lat2 - lat1) * r) / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(((lon2 - lon1) * r) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}
const ARAH = ["utara", "timur laut", "timur", "tenggara", "selatan", "barat daya", "barat", "barat laut"];
export function arahMataAngin(lat1: number, lon1: number, lat2: number, lon2: number): string {
  const r = Math.PI / 180;
  const y = Math.sin((lon2 - lon1) * r) * Math.cos(lat2 * r);
  const x = Math.cos(lat1 * r) * Math.sin(lat2 * r) - Math.sin(lat1 * r) * Math.cos(lat2 * r) * Math.cos((lon2 - lon1) * r);
  const derajat = ((Math.atan2(y, x) / r) + 360) % 360;
  return ARAH[Math.round(derajat / 45) % 8];
}

export function ringkasTitikPanas(titik: Titik[], lat: number, lon: number, now = new Date(), radiusKm = 50): RingkasTitikPanas {
  const tujuhHari = now.getTime() - 7 * 86_400_000;
  const duaEmpat = now.getTime() - 24 * 3_600_000;
  const segar = titik.filter((p) => p.t >= tujuhHari && p.t <= now.getTime() + 3_600_000);
  let dalam24j = 0;
  let dalam7h = 0;
  let terdekat: { km: number; arah: string } | null = null;
  for (const p of segar) {
    const km = jarakKm(lat, lon, p.lat, p.lon);
    if (km <= radiusKm) {
      dalam7h++;
      if (p.t >= duaEmpat) dalam24j++;
    }
    if (km <= 150 && (!terdekat || km < terdekat.km)) terdekat = { km: Math.round(km), arah: arahMataAngin(lat, lon, p.lat, p.lon) };
  }
  const perWilayah = WILAYAH.map(([wilayah, a, b, c, d]) => ({ wilayah, jumlah: segar.filter((p) => p.lat >= a && p.lat <= b && p.lon >= c && p.lon <= d).length })).sort((x, y) => y.jumlah - x.jumlah);
  return {
    sumber: { nama: "NASA FIRMS (VIIRS NOAA-20 dan NOAA-21)", url: URL_FIRMS_BERANDA, diambilPada: now.toISOString(), lisensi: "Data terbuka NASA" },
    stale: false,
    radiusKm,
    dalam24j,
    dalam7h,
    terdekat,
    nasional: { total: segar.length, perWilayah },
    catatan: "Titik panas adalah deteksi anomali panas oleh satelit, bukan kepastian kebakaran dan bukan luas lahan terbakar. Cek SiPongi KLHK dan BPBD untuk status resmi.",
  };
}

export async function fetchTitikPanas(): Promise<Titik[]> {
  const berkas = await Promise.allSettled(URL_FIRMS.map((u) => fetchUpstreamText(u, { timeoutMs: 20_000, revalidateSeconds: 3600, percobaan: 2 })));
  const ok = berkas.filter((b): b is PromiseFulfilledResult<string> => b.status === "fulfilled").map((b) => uraiFirms(b.value));
  if (ok.length === 0) throw new Error("Umpan titik panas tidak terbaca");
  return buangGanda(ok.flat());
}
