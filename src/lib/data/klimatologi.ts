// Pola bulanan iklim "saat ini" dari PENGAMATAN (reanalisis ERA5, Open-Meteo Historical Weather API), bukan dari model.
// Periode 1991-2020 adalah periode normal standar WMO (30 tahun). Untuk pertanyaan "bulan mana yang rawan di
// wilayah saya", data nyata lebih tepat daripada simulasi model, dan permintaannya sekitar empat kali lebih ringan
// daripada proyeksi 60 tahun dua model (penting karena kuota gratis Open-Meteo dibagi semua pengguna).
// Definisi metrik SAMA dengan proyeksi (hari sangat panas = di atas persentil 95 suhu siang; hari hujan ekstrem = di atas
// persentil 99 hari hujan; bulan kering BMKG < 60 mm), agar perbandingan dengan proyeksi konsisten.
import type { ApiBase } from "@/types";
import { fetchUpstreamJson } from "@/lib/http/fetch-upstream";
import { snapGrid, snapKasar } from "./iklim-math";
import { SUMBER_POWER, potongTahun } from "./nasa-power";
import { AMBANG_BASAH_MM, bulanTahunan, persentil, r1, rata, tahunanModel, type DeretModel, type MetrikBulan } from "./proyeksi";

export const PERIODE_KLIMATOLOGI = { awal: 1991, akhir: 2020, label: "1991-2020" } as const;

export interface KlimatologiResponse extends ApiBase {
  grid: { lat: number; lon: number };
  periode: typeof PERIODE_KLIMATOLOGI;
  ambang: { sangatPanasC: number; hujanEkstremMm: number };
  /** Rata-rata per bulan kalender (indeks 0-11) selama 30 tahun. */
  bulanan: MetrikBulan[];
  /** Hari berturut-turut tanpa hujan (di bawah 1 mm) pada tahun terburuk dalam 30 tahun. */
  kemarauTerburuk: number;
  catatan: string;
}

interface RawArsip {
  daily?: { time?: string[]; temperature_2m_max?: Array<number | null>; precipitation_sum?: Array<number | null> };
}

export function hitungKlimatologi(raw: RawArsip, lat: number, lon: number, now = new Date()): KlimatologiResponse {
  const d = raw.daily;
  if (!d?.time?.length || !d.temperature_2m_max || !d.precipitation_sum) throw new Error("Data pengamatan tidak berisi kolom yang diharapkan");
  return hitungDariDeret({ time: d.time, tmax: d.temperature_2m_max, hujan: d.precipitation_sum }, {
    sumber: { nama: "Open-Meteo Historical Weather API (reanalisis ERA5)", url: "https://open-meteo.com/en/docs/historical-weather-api", diambilPada: now.toISOString(), lisensi: "CC BY 4.0" },
    grid: { lat: snapGrid(lat), lon: snapGrid(lon) },
    catatan: "Rata-rata pengamatan reanalisis ERA5 (resolusi sekitar 25 km, bukan stasiun) selama 30 tahun, periode normal standar WMO. Pola rata-rata, bukan ramalan tahun ini: tahun El Niño dan La Niña bisa jauh menyimpang.",
  });
}

/**
 * Cadangan tanpa kuota: pola bulanan yang sama dari NASA POWER 1991-2020. Grid lebih kasar (sekitar 50 km), jadi suhu
 * siang bisa sedikit lebih rendah daripada di stasiun kota; definisi metrik tidak berubah.
 */
export function klimatologiDariPower(d: DeretModel, lat: number, lon: number, now = new Date()): KlimatologiResponse {
  return hitungDariDeret(potongTahun(d, PERIODE_KLIMATOLOGI.awal, PERIODE_KLIMATOLOGI.akhir), {
    sumber: { ...SUMBER_POWER, diambilPada: now.toISOString() },
    grid: { lat: snapKasar(lat), lon: snapKasar(lon) },
    catatan: "Rata-rata pengamatan NASA POWER (MERRA-2 dan hujan terkoreksi satelit, resolusi sekitar 50 km, bukan stasiun) selama 30 tahun, periode normal standar WMO. Dipakai karena layanan ERA5 sedang penuh; polanya sejalan, tetapi suhu siang di grid kasar bisa 1-3°C di bawah suhu stasiun kota. Pola rata-rata, bukan ramalan tahun ini: tahun El Niño dan La Niña bisa jauh menyimpang.",
  });
}

function hitungDariDeret(deret: DeretModel, info: Pick<KlimatologiResponse, "sumber" | "grid" | "catatan">): KlimatologiResponse {
  const tahun = new Set(deret.time.map((t) => t.slice(0, 4)));
  if (tahun.size < 25) throw new Error("Data pengamatan kurang dari 25 tahun");

  const tmax = deret.tmax.filter((v): v is number => typeof v === "number");
  const basah = deret.hujan.filter((v): v is number => typeof v === "number" && v >= AMBANG_BASAH_MM);
  const sangatPanas = persentil(tmax, 95);
  const hujanEkstrem = persentil(basah, 99);

  const perTahun = bulanTahunan(deret, sangatPanas, hujanEkstrem);
  const tahunTerisi = [...perTahun.values()];
  const bulanan: MetrikBulan[] = Array.from({ length: 12 }, (_, b) => ({
    hariSangatPanas: r1(rata(tahunTerisi.map((v) => v[b].hariSangatPanas))),
    hariHujanEkstrem: r1(rata(tahunTerisi.map((v) => v[b].hariHujanEkstrem))),
    hujanMm: Math.round(rata(tahunTerisi.map((v) => v[b].hujanMm))),
  }));
  const kemarauTerburuk = Math.max(0, ...tahunanModel(deret, sangatPanas, hujanEkstrem).map((y) => y.keringTerpanjang));

  return {
    sumber: info.sumber,
    stale: false,
    grid: info.grid,
    periode: PERIODE_KLIMATOLOGI,
    ambang: { sangatPanasC: r1(sangatPanas), hujanEkstremMm: Math.round(hujanEkstrem) },
    bulanan,
    kemarauTerburuk,
    catatan: info.catatan,
  };
}

export async function fetchKlimatologi(lat: number, lon: number): Promise<KlimatologiResponse> {
  const q = new URLSearchParams({
    latitude: String(snapGrid(lat)),
    longitude: String(snapGrid(lon)),
    start_date: `${PERIODE_KLIMATOLOGI.awal}-01-01`,
    end_date: `${PERIODE_KLIMATOLOGI.akhir}-12-31`,
    daily: "temperature_2m_max,precipitation_sum",
    timezone: "Asia/Jakarta",
  });
  const raw = await fetchUpstreamJson<RawArsip>(`https://archive-api.open-meteo.com/v1/archive?${q}`, { timeoutMs: 30_000, revalidateSeconds: 30 * 86_400, percobaan: 1 });
  return hitungKlimatologi(raw, lat, lon);
}
