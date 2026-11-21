// Siaga Iklim (sebelumnya Mesin Waktu Iklim): proyeksi iklim harian 1991-2050 dari model CMIP6 resolusi tinggi (HighResMIP, Open-Meteo
// Climate API, dikoreksi bias terhadap ERA5), diringkas KODE menjadi metrik per periode. Bukan ramalan cuaca:
// angka adalah rata-rata per tahun dalam periode 20 tahun, dari dua model, dengan rentang antar-model.
import type { ApiBase } from "@/types";
import { fetchUpstreamJson } from "@/lib/http/fetch-upstream";
import { snapProyeksi } from "./iklim-math";

export const MODEL_PROYEKSI = ["EC_Earth3P_HR", "MRI_AGCM3_2_S"] as const;
export type ModelProyeksi = (typeof MODEL_PROYEKSI)[number];
export const NAMA_MODEL: Record<ModelProyeksi, string> = {
  EC_Earth3P_HR: "EC-Earth3P-HR (konsorsium Eropa)",
  MRI_AGCM3_2_S: "MRI-AGCM3-2-S (Badan Meteorologi Jepang)",
};

export const PERIODE = [
  { id: "dulu", label: "1990-an", awal: 1991, akhir: 2010 },
  { id: "kini", label: "Saat ini", awal: 2011, akhir: 2030 },
  { id: "2050", label: "10-25 tahun lagi", awal: 2031, akhir: 2050 },
] as const;
export type IdPeriode = (typeof PERIODE)[number]["id"];

/** Ambang mutlak hari panas; "sangat panas" relatif terhadap persentil 95 masa lalu di lokasi itu. */
export const AMBANG_PANAS_C = 35;
export const AMBANG_KERING_MM = 1;
export const AMBANG_BASAH_MM = 1;

export type KunciMetrik = "suhuMaksRata" | "hariPanas" | "hariSangatPanas" | "hujanTahunan" | "hariHujanEkstrem" | "keringTerpanjang";
export interface Nilai {
  rata: number;
  min: number;
  maks: number;
}

/** Rata-rata per bulan kalender (indeks 0 = Januari) dalam satu periode 20 tahun. */
export interface MetrikBulan {
  hariSangatPanas: number;
  hariHujanEkstrem: number;
  hujanMm: number;
}
export type Bulanan = Record<IdPeriode, MetrikBulan[]>;
/** Hari berturut-turut tanpa hujan pada tahun terburuk dalam periode itu (rata-rata antar-model). */
export type KemarauTerburuk = Record<IdPeriode, number>;

export interface ProyeksiResponse extends ApiBase {
  grid: { lat: number; lon: number };
  model: string[];
  ambang: { panasC: number; sangatPanasC: number; hujanEkstremMm: number };
  periode: Array<{ id: IdPeriode; label: string; awal: number; akhir: number; metrik: Record<KunciMetrik, Nilai> }>;
  /** Perubahan "Menuju 2050" dibanding "1990-an" (rata-rata ensemble). */
  perubahan: Record<KunciMetrik, number>;
  /** Pola per bulan untuk Kalender Risiko dan Uji Ketahanan Rumah. */
  bulanan: Bulanan;
  kemarauTerburuk: KemarauTerburuk;
  /** Deret tahunan rata-rata ensemble untuk grafik. */
  tahunan: Array<{ tahun: number; suhuMaks: number | null; hariSangatPanas: number; hujan: number }>;
  catatan: string;
  /** Bila diisi, data berasal dari kota bawaan terdekat (bukan dihitung untuk lokasi ini); antarmuka wajib menjelaskannya. */
  perkiraan?: { kota: string; km: number; alasan: "kota-terdekat" | "cadangan-kuota" };
  /**
   * Bila diisi, proyeksi dibuat dengan metode delta (pengamatan lokal NASA POWER + perubahan ansambel CMIP6 nasional),
   * bukan model resolusi tinggi; "kini" berisi pengamatan sampai `akhirAmati`. Antarmuka wajib menjelaskannya.
   */
  metode?: { id: "pengamatan-delta"; akhirAmati: number; perubahanSuhuC: number; perubahanHujanPersen: number };
}

type Raw = { daily?: Record<string, Array<number | string | null>> };

export const r1 = (v: number) => Math.round(v * 10) / 10;
export const rata = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

/** Persentil dengan interpolasi linear (p 0-100). */
export function persentil(nilai: number[], p: number): number {
  if (!nilai.length) return NaN;
  const a = [...nilai].sort((x, y) => x - y);
  const i = (p / 100) * (a.length - 1);
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return a[lo] + (a[hi] - a[lo]) * (i - lo);
}

export interface DeretModel {
  time: string[];
  tmax: Array<number | null>;
  hujan: Array<number | null>;
}

/** Kolom harian per model: kunci bersufiks nama model pada permintaan multi-model, tanpa sufiks bila satu model. */
export function deretDariRaw(raw: Raw, model: string, tunggal: boolean): DeretModel | null {
  const d = raw.daily;
  if (!d || !Array.isArray(d.time)) return null;
  const ambil = (v: string) => (d[`${v}_${model}`] ?? (tunggal ? d[v] : undefined)) as Array<number | null> | undefined;
  const tmax = ambil("temperature_2m_max");
  const hujan = ambil("precipitation_sum");
  if (!tmax || !hujan) return null;
  return { time: d.time as string[], tmax, hujan };
}

interface TahunModel {
  tahun: number;
  suhuMaks: number | null;
  hariPanas: number;
  hariSangatPanas: number;
  hujanTahunan: number;
  hariHujanEkstrem: number;
  keringTerpanjang: number;
}

export function tahunanModel(dm: DeretModel, sangatPanas: number, hujanEkstrem: number): TahunModel[] {
  const per = new Map<number, { t: number[]; panas: number; sangat: number; hujan: number; ekstrem: number; deret: number; terpanjang: number }>();
  for (let i = 0; i < dm.time.length; i++) {
    const tahun = Number(dm.time[i].slice(0, 4));
    let y = per.get(tahun);
    if (!y) per.set(tahun, (y = { t: [], panas: 0, sangat: 0, hujan: 0, ekstrem: 0, deret: 0, terpanjang: 0 }));
    const t = dm.tmax[i];
    const p = dm.hujan[i];
    if (typeof t === "number") {
      y.t.push(t);
      if (t >= AMBANG_PANAS_C) y.panas++;
      if (t > sangatPanas) y.sangat++;
    }
    if (typeof p === "number") {
      y.hujan += p;
      if (p > hujanEkstrem) y.ekstrem++;
      if (p < AMBANG_KERING_MM) {
        y.deret++;
        if (y.deret > y.terpanjang) y.terpanjang = y.deret;
      } else y.deret = 0;
    } else y.deret = 0; // data kosong memutus deret kering (konservatif)
  }
  return [...per.entries()].sort(([a], [b]) => a - b).map(([tahun, y]) => ({
    tahun,
    suhuMaks: y.t.length ? rata(y.t) : null,
    hariPanas: y.panas,
    hariSangatPanas: y.sangat,
    hujanTahunan: y.hujan,
    hariHujanEkstrem: y.ekstrem,
    keringTerpanjang: y.terpanjang,
  }));
}

/** Hitungan per bulan kalender untuk tiap tahun: hari sangat panas, hari hujan ekstrem, dan total hujan. */
export function bulanTahunan(dm: DeretModel, sangatPanas: number, hujanEkstrem: number): Map<number, MetrikBulan[]> {
  const per = new Map<number, MetrikBulan[]>();
  for (let i = 0; i < dm.time.length; i++) {
    const tahun = Number(dm.time[i].slice(0, 4));
    const bulan = Number(dm.time[i].slice(5, 7)) - 1;
    let y = per.get(tahun);
    if (!y) per.set(tahun, (y = Array.from({ length: 12 }, () => ({ hariSangatPanas: 0, hariHujanEkstrem: 0, hujanMm: 0 }))));
    const t = dm.tmax[i];
    const h = dm.hujan[i];
    if (typeof t === "number" && t > sangatPanas) y[bulan].hariSangatPanas++;
    if (typeof h === "number") {
      y[bulan].hujanMm += h;
      if (h > hujanEkstrem) y[bulan].hariHujanEkstrem++;
    }
  }
  return per;
}

const KUNCI: KunciMetrik[] = ["suhuMaksRata", "hariPanas", "hariSangatPanas", "hujanTahunan", "hariHujanEkstrem", "keringTerpanjang"];
const ambilMetrik = (y: TahunModel, k: KunciMetrik): number | null =>
  k === "suhuMaksRata" ? y.suhuMaks : k === "hujanTahunan" ? y.hujanTahunan : y[k];

/** Ringkas proyeksi beberapa model menjadi metrik per periode (rata-rata ensemble dan rentang antar-model). */
export function hitungProyeksi(raw: Raw, lat: number, lon: number, now = new Date()): ProyeksiResponse {
  const tunggal = (MODEL_PROYEKSI as readonly string[]).length === 1;
  const deret = MODEL_PROYEKSI.map((m) => ({ m, d: deretDariRaw(raw, m, tunggal) })).filter((x): x is { m: ModelProyeksi; d: DeretModel } => x.d !== null);
  if (deret.length === 0) throw new Error("Data proyeksi tidak berisi kolom yang diharapkan");
  return ringkasDeret(deret.map(({ m, d }) => ({ nama: NAMA_MODEL[m], d })), {
    sumber: { nama: "Open-Meteo Climate API (CMIP6 HighResMIP)", url: "https://open-meteo.com/en/docs/climate-api", diambilPada: now.toISOString(), lisensi: "CC BY 4.0" },
    grid: { lat: snapProyeksi(lat), lon: snapProyeksi(lon) },
    catatan:
      "Proyeksi model iklim global resolusi tinggi (sekitar 25 km) dengan skenario emisi tinggi, dikoreksi bias terhadap data ERA5. Angka adalah rata-rata per tahun dalam periode 20 tahun, bukan ramalan cuaca untuk hari atau tahun tertentu.",
  });
}

/**
 * Ringkas beberapa deret harian ("anggota": model iklim, atau skenario perubahan) menjadi metrik per periode: rata-rata
 * antar-anggota dan rentangnya. Ambang relatif dihitung dari 1991-2010 per anggota.
 */
export function ringkasDeret(
  deret: Array<{ nama: string; d: DeretModel }>,
  info: Pick<ProyeksiResponse, "sumber" | "grid" | "catatan"> & { periode?: Partial<Record<IdPeriode, { awal: number; akhir: number }>> },
): ProyeksiResponse {
  if (deret.length === 0) throw new Error("Tidak ada deret untuk diringkas");
  const rentang = PERIODE.map((pr) => ({ ...pr, ...info.periode?.[pr.id] }));

  // Ambang relatif dari masa lalu (1991-2010), dihitung per model lalu dirata-rata.
  const ambangModel = deret.map(({ d }) => {
    const t: number[] = [];
    const basah: number[] = [];
    for (let i = 0; i < d.time.length; i++) {
      const th = Number(d.time[i].slice(0, 4));
      if (th < rentang[0].awal || th > rentang[0].akhir) continue;
      if (typeof d.tmax[i] === "number") t.push(d.tmax[i] as number);
      if (typeof d.hujan[i] === "number" && (d.hujan[i] as number) >= AMBANG_BASAH_MM) basah.push(d.hujan[i] as number);
    }
    return { sangatPanas: persentil(t, 95), hujanEkstrem: persentil(basah, 99) };
  });
  const perModel = deret.map(({ d }, i) => tahunanModel(d, ambangModel[i].sangatPanas, ambangModel[i].hujanEkstrem));

  const periode = rentang.map((pr) => {
    const metrik = {} as Record<KunciMetrik, Nilai>;
    for (const k of KUNCI) {
      const perM = perModel.map((tahun) => rata(tahun.filter((y) => y.tahun >= pr.awal && y.tahun <= pr.akhir).map((y) => ambilMetrik(y, k)).filter((v): v is number => v !== null)));
      const bulat = k === "hujanTahunan" ? (v: number) => Math.round(v) : r1;
      metrik[k] = { rata: bulat(rata(perM)), min: bulat(Math.min(...perM)), maks: bulat(Math.max(...perM)) };
    }
    return { id: pr.id, label: pr.label, awal: pr.awal, akhir: pr.akhir, metrik };
  });

  const perubahan = {} as Record<KunciMetrik, number>;
  for (const k of KUNCI) {
    const d = periode[2].metrik[k].rata - periode[0].metrik[k].rata;
    perubahan[k] = k === "hujanTahunan" ? Math.round(d) : r1(d);
  }

  // Pola per bulan: rata-rata atas tahun dalam periode, lalu atas model.
  const bulanModel = deret.map(({ d }, i) => bulanTahunan(d, ambangModel[i].sangatPanas, ambangModel[i].hujanEkstrem));
  const bulanan = {} as Bulanan;
  const kemarauTerburuk = {} as KemarauTerburuk;
  for (const pr of rentang) {
    const perM = bulanModel.map((m) => {
      const tahunTerisi = [...m.entries()].filter(([t]) => t >= pr.awal && t <= pr.akhir).map(([, v]) => v);
      return Array.from({ length: 12 }, (_, b) => ({
        hariSangatPanas: rata(tahunTerisi.map((v) => v[b].hariSangatPanas)),
        hariHujanEkstrem: rata(tahunTerisi.map((v) => v[b].hariHujanEkstrem)),
        hujanMm: rata(tahunTerisi.map((v) => v[b].hujanMm)),
      }));
    });
    bulanan[pr.id] = Array.from({ length: 12 }, (_, b) => ({
      hariSangatPanas: r1(rata(perM.map((m) => m[b].hariSangatPanas))),
      hariHujanEkstrem: r1(rata(perM.map((m) => m[b].hariHujanEkstrem))),
      hujanMm: Math.round(rata(perM.map((m) => m[b].hujanMm))),
    }));
    kemarauTerburuk[pr.id] = Math.round(rata(perModel.map((tahun) => Math.max(0, ...tahun.filter((y) => y.tahun >= pr.awal && y.tahun <= pr.akhir).map((y) => y.keringTerpanjang)))));
  }

  const semuaTahun = [...new Set(perModel.flatMap((t) => t.map((y) => y.tahun)))].sort((a, b) => a - b);
  const tahunan = semuaTahun.map((tahun) => {
    const ys = perModel.map((t) => t.find((y) => y.tahun === tahun)).filter((y): y is TahunModel => Boolean(y));
    const sm = ys.map((y) => y.suhuMaks).filter((v): v is number => v !== null);
    return { tahun, suhuMaks: sm.length ? r1(rata(sm)) : null, hariSangatPanas: r1(rata(ys.map((y) => y.hariSangatPanas))), hujan: Math.round(rata(ys.map((y) => y.hujanTahunan))) };
  });

  return {
    sumber: info.sumber,
    stale: false,
    grid: info.grid,
    model: deret.map(({ nama }) => nama),
    ambang: {
      panasC: AMBANG_PANAS_C,
      sangatPanasC: r1(rata(ambangModel.map((a) => a.sangatPanas))),
      hujanEkstremMm: Math.round(rata(ambangModel.map((a) => a.hujanEkstrem))),
    },
    periode,
    perubahan,
    bulanan,
    kemarauTerburuk,
    tahunan,
    catatan: info.catatan,
  };
}

export async function fetchProyeksi(lat: number, lon: number): Promise<ProyeksiResponse> {
  const q = new URLSearchParams({
    latitude: String(snapProyeksi(lat)),
    longitude: String(snapProyeksi(lon)),
    start_date: `${PERIODE[0].awal}-01-01`,
    end_date: `${PERIODE[2].akhir}-12-31`,
    models: MODEL_PROYEKSI.join(","),
    daily: "temperature_2m_max,precipitation_sum",
    timezone: "Asia/Jakarta",
  });
  // Permintaan berat (sekitar 15-25 detik): satu percobaan, cache hulu 30 hari.
  const raw = await fetchUpstreamJson<Raw>(`https://climate-api.open-meteo.com/v1/climate?${q}`, { timeoutMs: 45_000, revalidateSeconds: 30 * 86_400, percobaan: 1 });
  return hitungProyeksi(raw, lat, lon);
}
