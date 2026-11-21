// NASA POWER (Prediction Of Worldwide Energy Resources, NASA Langley Research Center): data harian pengamatan berbasis
// reanalisis MERRA-2 dan presipitasi terkoreksi satelit (PRECTOTCORR), grid sekitar 0,5° x 0,625°, dari 1981 sampai
// beberapa hari lalu. Gratis, tanpa kunci, tanpa kuota harian per IP. Dipakai SIGAP sebagai CADANGAN untuk
// data pengamatan Open-Meteo (ERA5) bila kuota gratis Open-Meteo habis, sehingga Siaga Iklim tetap tampil di semua lokasi.
// Satu permintaan 35 tahun untuk dua variabel sekitar 400 KB dan selesai dalam 1-3 detik.
import { fetchUpstreamJson } from "@/lib/http/fetch-upstream";
import { snapKasar } from "./iklim-math";
import type { DeretModel } from "./proyeksi";

export const SUMBER_POWER = {
  nama: "NASA POWER (MERRA-2 dan presipitasi terkoreksi satelit)",
  url: "https://power.larc.nasa.gov/",
  lisensi: "Data NASA, bebas digunakan dengan atribusi",
} as const;

/** Nilai isian NASA POWER untuk data yang belum tersedia (beberapa hari terakhir). */
const ISIAN = -999;

export interface RawPower {
  properties?: { parameter?: Record<string, Record<string, number>> };
}

/** "19910101" -> "1991-01-01" */
const tgl = (k: string) => `${k.slice(0, 4)}-${k.slice(4, 6)}-${k.slice(6, 8)}`;
const nilai = (v: number | undefined) => (typeof v === "number" && Number.isFinite(v) && v > ISIAN + 1 ? v : null);

/** Ubah respons harian NASA POWER menjadi deret (tanggal ISO, suhu maksimum, hujan); nilai isian -999 menjadi null. */
export function uraiPower(raw: RawPower): DeretModel {
  const p = raw.properties?.parameter;
  const hujan = p?.PRECTOTCORR;
  const tmax = p?.T2M_MAX;
  if (!hujan || !tmax) throw new Error("Respons NASA POWER tidak berisi PRECTOTCORR dan T2M_MAX");
  const kunci = Object.keys(hujan).sort();
  if (kunci.length === 0) throw new Error("Respons NASA POWER kosong");
  return { time: kunci.map(tgl), hujan: kunci.map((k) => nilai(hujan[k])), tmax: kunci.map((k) => nilai(tmax[k])) };
}

/** Potong deret ke rentang tahun [awal, akhir]. */
export function potongTahun(d: DeretModel, awal: number, akhir: number): DeretModel {
  const out: DeretModel = { time: [], tmax: [], hujan: [] };
  d.time.forEach((t, i) => {
    const th = Number(t.slice(0, 4));
    if (th < awal || th > akhir) return;
    out.time.push(t);
    out.tmax.push(d.tmax[i]);
    out.hujan.push(d.hujan[i]);
  });
  return out;
}

const ymd = (iso: string) => iso.replaceAll("-", "");

export function urlPower(lat: number, lon: number, mulai: string, akhir: string): string {
  const q = new URLSearchParams({
    parameters: "PRECTOTCORR,T2M_MAX",
    community: "AG",
    latitude: String(lat),
    longitude: String(lon),
    start: ymd(mulai),
    end: ymd(akhir),
    format: "JSON",
    "time-standard": "LST",
  });
  return `https://power.larc.nasa.gov/api/temporal/daily/point?${q}`;
}

/** Data harian NASA POWER untuk sel grid 0,5° di sekitar lokasi, rentang tanggal ISO [mulai, akhir]. */
export async function fetchPowerHarian(lat: number, lon: number, mulai: string, akhir: string, revalidateSeconds = 30 * 86_400): Promise<DeretModel> {
  const raw = await fetchUpstreamJson<RawPower>(urlPower(snapKasar(lat), snapKasar(lon), mulai, akhir), { timeoutMs: 25_000, revalidateSeconds, percobaan: 2 });
  return uraiPower(raw);
}
