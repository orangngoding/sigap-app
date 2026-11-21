// Cadangan "Minggu ini" bila Open-Meteo menolak (kuota) atau gagal: prakiraan MET Norway Locationforecast (institut
// meteorologi Norwegia, model global ECMWF, sekitar 9-10 hari, gratis dengan User-Agent yang jelas) dan hujan 30 hari
// terakhir dari NASA POWER. Keduanya diubah ke bentuk harian yang SAMA dengan Open-Meteo, sehingga sinyal dihitung
// oleh kode yang sama (hitungSiagaPekan). Murni (tanpa jaringan) agar bisa diuji.
import type { DeretModel } from "@/lib/data/proyeksi";
import { tanggalWib, type RawPrakiraan } from "./pekan";

export const SUMBER_CADANGAN_PEKAN = {
  nama: "MET Norway Locationforecast (prakiraan) + NASA POWER (hujan 30 hari terakhir)",
  url: "https://api.met.no/weatherapi/locationforecast/2.0/documentation",
  lisensi: "MET Norway CC BY 4.0; data NASA dengan atribusi",
} as const;

export const CATATAN_CADANGAN_PEKAN =
  "Layanan prakiraan utama sedang penuh, jadi SIGAP memakai prakiraan MET Norway (sekitar 9 hari, model global ECMWF) dan hujan 30 hari terakhir dari NASA POWER (beberapa hari terakhir bisa belum tersedia). Kualitas udara PM2.5 tidak tersedia pada mode ini. Makin jauh harinya, makin tidak pasti. BMKG belum menetapkan kategori panas resmi, jadi ambang suhu terasa 41°C (acuan Heat Advisory NWS/NOAA) adalah indikator SIGAP. Ini bukan peringatan resmi: ikuti peringatan dini BMKG dan arahan BPBD.";

interface Detail {
  air_temperature?: number;
  apparent_air_temperature?: number;
  relative_humidity?: number;
  wind_speed?: number;
  air_temperature_max?: number;
  precipitation_amount?: number;
  probability_of_precipitation?: number;
}
export interface RawMetNo {
  properties?: {
    timeseries?: Array<{
      time: string;
      data?: { instant?: { details?: Detail }; next_1_hours?: { details?: Detail }; next_6_hours?: { details?: Detail } };
    }>;
  };
}

const ok = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

interface Hari {
  tmax: number | null;
  terasa: number | null;
  hujan: number;
  jamHujan: number;
  peluang: number | null;
  rhMin: number | null;
  angin: number | null;
}
const maks = (a: number | null, b: number | undefined) => (ok(b) ? (a === null ? b : Math.max(a, b)) : a);
const min = (a: number | null, b: number | undefined) => (ok(b) ? (a === null ? b : Math.min(a, b)) : a);

/**
 * Ringkas deret per jam/6 jam MET Norway menjadi harian (tanggal WIB). Hujan dijumlah dari selang yang tidak tumpang
 * tindih (1 jam selama tersedia, lalu 6 jam). Hari yang selangnya kurang dari 18 jam dibuang, kecuali hari ini.
 */
export function harianMetNo(met: RawMetNo, now: Date): Map<string, Hari> {
  const ts = [...(met.properties?.timeseries ?? [])].sort((a, b) => a.time.localeCompare(b.time));
  const hariIni = tanggalWib(now);
  const per = new Map<string, Hari>();
  ts.forEach((e, i) => {
    const t = Date.parse(e.time);
    if (!Number.isFinite(t)) return;
    const tanggal = tanggalWib(new Date(t));
    let h = per.get(tanggal);
    if (!h) per.set(tanggal, (h = { tmax: null, terasa: null, hujan: 0, jamHujan: 0, peluang: null, rhMin: null, angin: null }));
    const ins = e.data?.instant?.details ?? {};
    h.tmax = maks(h.tmax, ins.air_temperature);
    h.terasa = maks(h.terasa, ins.apparent_air_temperature);
    h.rhMin = min(h.rhMin, ins.relative_humidity);
    h.angin = ok(ins.wind_speed) ? maks(h.angin, ins.wind_speed * 3.6) : h.angin; // m/s -> km/jam
    const berikut = ts[i + 1] ? Date.parse(ts[i + 1].time) : NaN;
    const selangJam = Number.isFinite(berikut) ? Math.round((berikut - t) / 3_600_000) : 0;
    const satu = e.data?.next_1_hours?.details;
    const enam = e.data?.next_6_hours?.details;
    h.tmax = maks(h.tmax, enam?.air_temperature_max);
    if (selangJam === 1 && ok(satu?.precipitation_amount)) {
      h.hujan += satu.precipitation_amount;
      h.jamHujan += 1;
      h.peluang = maks(h.peluang, satu.probability_of_precipitation);
    } else if (selangJam >= 6 && ok(enam?.precipitation_amount)) {
      h.hujan += enam.precipitation_amount;
      h.jamHujan += 6;
      h.peluang = maks(h.peluang, enam.probability_of_precipitation);
    }
  });
  for (const [tanggal, h] of per) if (tanggal !== hariIni && (h.jamHujan < 18 || tanggal < hariIni)) per.delete(tanggal);
  return per;
}

/** Gabungkan hujan 30 hari terakhir (NASA POWER) dan prakiraan MET Norway menjadi bentuk harian Open-Meteo. */
export function rawDariCadangan(met: RawMetNo, lampau: DeretModel | null, now: Date): RawPrakiraan {
  const depan = harianMetNo(met, now);
  if (depan.size === 0) throw new Error("Prakiraan MET Norway kosong");
  const hariIni = tanggalWib(now);
  const time: string[] = [];
  const kol = { tmax: [] as Array<number | null>, terasa: [] as Array<number | null>, hujan: [] as Array<number | null>, peluang: [] as Array<number | null>, rh: [] as Array<number | null>, angin: [] as Array<number | null> };
  // 30 hari sebelum hari ini: hanya hujan (dan suhu bila ada) dari NASA POWER; tanggal tanpa data = null.
  const peta = new Map<string, { h: number | null; t: number | null }>();
  lampau?.time.forEach((t, i) => peta.set(t, { h: lampau.hujan[i], t: lampau.tmax[i] }));
  const awal = Date.parse(`${hariIni}T00:00:00Z`);
  for (let k = 30; k >= 1; k--) {
    const tgl = new Date(awal - k * 86_400_000).toISOString().slice(0, 10);
    const v = peta.get(tgl);
    time.push(tgl);
    kol.tmax.push(v?.t ?? null);
    kol.terasa.push(null);
    kol.hujan.push(v?.h ?? null);
    kol.peluang.push(null);
    kol.rh.push(null);
    kol.angin.push(null);
  }
  for (const [tgl, h] of [...depan.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    time.push(tgl);
    kol.tmax.push(h.tmax === null ? null : Math.round(h.tmax * 10) / 10);
    kol.terasa.push(h.terasa === null ? null : Math.round(h.terasa * 10) / 10);
    kol.hujan.push(Math.round(h.hujan * 10) / 10);
    kol.peluang.push(h.peluang);
    kol.rh.push(h.rhMin);
    kol.angin.push(h.angin === null ? null : Math.round(h.angin * 10) / 10);
  }
  return {
    daily: {
      time,
      temperature_2m_max: kol.tmax,
      apparent_temperature_max: kol.terasa,
      precipitation_sum: kol.hujan,
      precipitation_probability_max: kol.peluang,
      relative_humidity_2m_min: kol.rh,
      wind_speed_10m_max: kol.angin,
    },
  };
}
