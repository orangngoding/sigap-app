import type { IklimResponse, IklimTahunan } from "@/types";
import { ApiError } from "@/lib/http/api-error";
import { fetchUpstreamJson } from "@/lib/http/fetch-upstream";
import { slope, snapGrid } from "./iklim-math";

export { slope, snapGrid };

/** ASUMSI awal (Blueprint 6.3): 50 mm/hari. Verifikasi klasifikasi resmi BMKG dan catat sumbernya. */
export const AMBANG_HUJAN_LEBAT_MM = 50;
export const AMBANG_HARI_KERING_MM = 1;
export const TAHUN_AWAL = 1991;
export const CATATAN_ERA5 =
  "Gambaran tren regional dari data model ERA5 (resolusi sekitar 25 km). Bukan pengukuran stasiun dan bukan prediksi.";

export interface OpenMeteoDaily {
  time: string[];
  precipitation_sum: Array<number | null>;
  temperature_2m_max: Array<number | null>;
}

const round1 = (v: number) => Math.round(v * 10) / 10;
const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

/**
 * Agregasi harian -> tahunan. Hari tanpa data (null) memutus deret kering beruntun
 * (konservatif: tidak menebak). Deret dihitung per tahun kalender.
 */
export function aggregateAnnual(daily: OpenMeteoDaily): IklimTahunan[] {
  const byYear = new Map<number, { heavy: number; streak: number; best: number; tmax: number[] }>();
  for (let i = 0; i < daily.time.length; i++) {
    const year = Number(daily.time[i].slice(0, 4));
    let y = byYear.get(year);
    if (!y) byYear.set(year, (y = { heavy: 0, streak: 0, best: 0, tmax: [] }));
    const p = daily.precipitation_sum[i];
    const t = daily.temperature_2m_max[i];
    if (typeof t === "number") y.tmax.push(t);
    if (typeof p === "number") {
      if (p > AMBANG_HUJAN_LEBAT_MM) y.heavy++;
      if (p < AMBANG_HARI_KERING_MM) {
        y.streak++;
        if (y.streak > y.best) y.best = y.streak;
      } else y.streak = 0;
    } else y.streak = 0;
  }
  return [...byYear.entries()]
    .sort(([a], [b]) => a - b)
    .map(([tahun, y]) => ({
      tahun,
      hariHujanLebat: y.heavy,
      hariKeringBeruntunMaks: y.best,
      suhuMaksRata: y.tmax.length ? round1(mean(y.tmax)) : null,
    }));
}

export function buildIklim(daily: OpenMeteoDaily, akhir: number, now = new Date()): IklimResponse {
  const tahunan = aggregateAnnual(daily);
  const heavy = tahunan.map((t) => t.hariHujanLebat);
  const perDekade = round1(slope(tahunan.map((t) => t.tahun), heavy) * 10);

  // Pembanding: 15 tahun pertama dan 15 tahun terakhir dari data yang tersedia
  const k = Math.min(15, Math.floor(tahunan.length / 2));
  const awal = tahunan.slice(0, k);
  const akh = tahunan.slice(-k);
  const label = (a: IklimTahunan[]) => (a.length ? `${a[0].tahun}-${a[a.length - 1].tahun}` : "-");

  return {
    sumber: {
      nama: "Open-Meteo (ERA5)",
      url: "https://open-meteo.com/",
      diambilPada: now.toISOString(),
      lisensi: "CC BY 4.0",
    },
    stale: false,
    periode: { awal: tahunan[0]?.tahun ?? TAHUN_AWAL, akhir },
    ambang: { hujanLebatMm: AMBANG_HUJAN_LEBAT_MM, hariKeringMm: AMBANG_HARI_KERING_MM },
    tahunan,
    tren: { hariHujanLebatPerDekade: perDekade },
    pembanding: {
      awal: { periode: label(awal), rataHariHujanLebat: round1(mean(awal.map((t) => t.hariHujanLebat))) },
      akhir: { periode: label(akh), rataHariHujanLebat: round1(mean(akh.map((t) => t.hariHujanLebat))) },
    },
    catatan: CATATAN_ERA5,
  };
}

export async function fetchIklim(lat: number, lon: number, now = new Date()): Promise<IklimResponse> {
  const akhir = now.getUTCFullYear() - 1; // tahun penuh terakhir
  const la = snapGrid(lat);
  const lo = snapGrid(lon);
  const url =
    `https://archive-api.open-meteo.com/v1/archive?latitude=${la}&longitude=${lo}` +
    `&start_date=${TAHUN_AWAL}-01-01&end_date=${akhir}-12-31` +
    `&daily=precipitation_sum,temperature_2m_max&timezone=auto`;
  // Respons ~13 ribu hari; hulu di-cache 7 hari oleh Next.js
  const raw = await fetchUpstreamJson<{ daily?: OpenMeteoDaily }>(url, {
    timeoutMs: 8000,
    revalidateSeconds: 7 * 24 * 3600,
  });
  if (!raw.daily?.time) throw new ApiError("SUMBER_GAGAL");
  return buildIklim(raw.daily, akhir, now);
}
