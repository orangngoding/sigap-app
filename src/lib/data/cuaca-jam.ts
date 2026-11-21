// Cuaca PER JAM untuk titik kelurahan (Lokasi): melengkapi prakiraan resmi BMKG yang dirilis per 3 jam.
// Sumber utama Open-Meteo (model cuaca global, mis. ECMWF dan ICON, dipilih otomatis per lokasi), cadangan MET Norway
// bila Open-Meteo menolak. Murni (tanpa jaringan) agar bisa diuji; waktu ditulis dalam zona waktu lokasi (WIB/WITA/WIT).
export const ZONA = ["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura"] as const;
export type Zona = (typeof ZONA)[number];
export const OFFSET_ZONA: Record<Zona, number> = { "Asia/Jakarta": 7, "Asia/Makassar": 8, "Asia/Jayapura": 9 };
export const SINGKATAN_ZONA: Record<Zona, string> = { "Asia/Jakarta": "WIB", "Asia/Makassar": "WITA", "Asia/Jayapura": "WIT" };

export type IkonCuaca = "cerah" | "cerah-berawan" | "berawan" | "kabut" | "gerimis" | "hujan" | "hujan-lebat" | "petir";

export interface JamCuaca {
  /** "YYYY-MM-DDTHH:00" waktu lokal lokasi. */
  waktu: string;
  suhu: number | null;
  terasa: number | null;
  kondisi: string;
  ikon: IkonCuaca;
  siang: boolean;
  /** Peluang hujan (%), null bila sumber tidak menyediakan. */
  peluangHujan: number | null;
  hujanMm: number | null;
  kelembapan: number | null;
  anginKmj: number | null;
  /** Arah angin dari mana bertiup (derajat). */
  arahAngin: number | null;
  uv: number | null;
}

export interface HariCuaca {
  tanggal: string;
  min: number | null;
  maks: number | null;
  kondisi: string;
  ikon: IkonCuaca;
  peluangHujan: number | null;
  hujanMm: number | null;
  terbit: string | null;
  terbenam: string | null;
  uvMaks: number | null;
}

export interface CuacaJamResponse {
  sumber: { nama: string; url: string; diambilPada: string; lisensi: string };
  stale: boolean;
  zona: Zona;
  jam: JamCuaca[];
  hari: HariCuaca[];
  catatan: string;
}

/** Kode cuaca WMO (dipakai Open-Meteo) ke kalimat dan ikon. */
export function dariKodeWmo(kode: number | null | undefined): { kondisi: string; ikon: IkonCuaca } {
  switch (kode) {
    case 0: return { kondisi: "Cerah", ikon: "cerah" };
    case 1: return { kondisi: "Cerah berawan", ikon: "cerah-berawan" };
    case 2: return { kondisi: "Berawan sebagian", ikon: "cerah-berawan" };
    case 3: return { kondisi: "Berawan", ikon: "berawan" };
    case 45: case 48: return { kondisi: "Berkabut", ikon: "kabut" };
    case 51: case 53: case 55: case 56: case 57: return { kondisi: "Gerimis", ikon: "gerimis" };
    case 61: case 80: return { kondisi: "Hujan ringan", ikon: "hujan" };
    case 63: case 81: return { kondisi: "Hujan sedang", ikon: "hujan" };
    case 65: case 82: case 66: case 67: return { kondisi: "Hujan lebat", ikon: "hujan-lebat" };
    case 95: case 96: case 99: return { kondisi: "Hujan petir", ikon: "petir" };
    default: return { kondisi: "Berawan", ikon: "berawan" };
  }
}

/** Simbol MET Norway ("lightrain_showers_day", "partlycloudy_night") ke kalimat dan ikon. */
export function dariSimbolMet(simbol: string | null | undefined): { kondisi: string; ikon: IkonCuaca } {
  const s = (simbol ?? "").replace(/_(day|night|polartwilight)$/, "");
  if (s.includes("thunder")) return { kondisi: "Hujan petir", ikon: "petir" };
  if (s.startsWith("heavyrain")) return { kondisi: "Hujan lebat", ikon: "hujan-lebat" };
  if (s.startsWith("lightrain")) return { kondisi: "Hujan ringan", ikon: "hujan" };
  if (s.startsWith("rain")) return { kondisi: "Hujan sedang", ikon: "hujan" };
  if (s.includes("sleet") || s.includes("snow")) return { kondisi: "Hujan", ikon: "hujan" };
  if (s === "fog") return { kondisi: "Berkabut", ikon: "kabut" };
  if (s === "cloudy") return { kondisi: "Berawan", ikon: "berawan" };
  if (s === "partlycloudy" || s === "fair") return { kondisi: s === "fair" ? "Cerah berawan" : "Berawan sebagian", ikon: "cerah-berawan" };
  if (s === "clearsky") return { kondisi: "Cerah", ikon: "cerah" };
  return { kondisi: "Berawan", ikon: "berawan" };
}

const angka = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? Math.round(v * 10) / 10 : null);
const bulat = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? Math.round(v) : null);

type Deret = Array<number | null | undefined>;
export interface RawOpenMeteoJam {
  hourly?: {
    time?: string[];
    temperature_2m?: Deret; apparent_temperature?: Deret; precipitation_probability?: Deret; precipitation?: Deret;
    weather_code?: Deret; wind_speed_10m?: Deret; wind_direction_10m?: Deret; relative_humidity_2m?: Deret; uv_index?: Deret; is_day?: Deret;
  };
  daily?: {
    time?: string[];
    weather_code?: Deret; temperature_2m_max?: Deret; temperature_2m_min?: Deret; precipitation_probability_max?: Deret;
    precipitation_sum?: Deret; sunrise?: Array<string | null>; sunset?: Array<string | null>; uv_index_max?: Deret;
  };
}

export const SUMBER_OPEN_METEO_JAM = { nama: "Open-Meteo (model cuaca global)", url: "https://open-meteo.com/en/docs", lisensi: "CC BY 4.0" } as const;
export const SUMBER_MET_JAM = { nama: "MET Norway Locationforecast", url: "https://api.met.no/weatherapi/locationforecast/2.0/documentation", lisensi: "CC BY 4.0" } as const;
const CATATAN =
  "Prakiraan per jam dari model cuaca global untuk titik kelurahan Anda (resolusi beberapa kilometer). Untuk keputusan penting dan peringatan dini, acuan resminya tetap BMKG.";

export function uraiOpenMeteoJam(raw: RawOpenMeteoJam, zona: Zona, now = new Date()): CuacaJamResponse {
  const h = raw.hourly;
  if (!h?.time?.length) throw new Error("Prakiraan per jam kosong");
  const jam: JamCuaca[] = h.time.map((t, i) => {
    const k = dariKodeWmo(bulat(h.weather_code?.[i]));
    return {
      waktu: t,
      suhu: angka(h.temperature_2m?.[i]),
      terasa: angka(h.apparent_temperature?.[i]),
      ...k,
      siang: h.is_day?.[i] !== 0,
      peluangHujan: bulat(h.precipitation_probability?.[i]),
      hujanMm: angka(h.precipitation?.[i]),
      kelembapan: bulat(h.relative_humidity_2m?.[i]),
      anginKmj: bulat(h.wind_speed_10m?.[i]),
      arahAngin: bulat(h.wind_direction_10m?.[i]),
      uv: angka(h.uv_index?.[i]),
    };
  });
  const d = raw.daily;
  const hari: HariCuaca[] = (d?.time ?? []).map((t, i) => {
    const k = dariKodeWmo(bulat(d?.weather_code?.[i]));
    return {
      tanggal: t,
      min: angka(d?.temperature_2m_min?.[i]),
      maks: angka(d?.temperature_2m_max?.[i]),
      ...k,
      peluangHujan: bulat(d?.precipitation_probability_max?.[i]),
      hujanMm: angka(d?.precipitation_sum?.[i]),
      terbit: d?.sunrise?.[i]?.slice(11, 16) ?? null,
      terbenam: d?.sunset?.[i]?.slice(11, 16) ?? null,
      uvMaks: angka(d?.uv_index_max?.[i]),
    };
  });
  return { sumber: { ...SUMBER_OPEN_METEO_JAM, diambilPada: now.toISOString() }, stale: false, zona, jam, hari, catatan: CATATAN };
}

interface DetailMet {
  air_temperature?: number; relative_humidity?: number; wind_speed?: number; wind_from_direction?: number;
  precipitation_amount?: number; probability_of_precipitation?: number; ultraviolet_index_clear_sky?: number; air_temperature_max?: number; air_temperature_min?: number;
}
export interface RawMetJam {
  properties?: { timeseries?: Array<{ time: string; data?: { instant?: { details?: DetailMet }; next_1_hours?: { summary?: { symbol_code?: string }; details?: DetailMet }; next_6_hours?: { summary?: { symbol_code?: string }; details?: DetailMet } } }> };
}

/** "YYYY-MM-DDTHH:00" waktu lokal dari ISO UTC. */
export const waktuLokal = (isoUtc: string, zona: Zona) => new Date(Date.parse(isoUtc) + OFFSET_ZONA[zona] * 3_600_000).toISOString().slice(0, 13) + ":00";

/** Cadangan MET Norway: hanya bagian per jam (sekitar 2,5 hari pertama); ringkasan harian dihitung dari jam. */
export function uraiMetJam(raw: RawMetJam, zona: Zona, now = new Date()): CuacaJamResponse {
  const ts = raw.properties?.timeseries ?? [];
  const jam: JamCuaca[] = [];
  for (const e of ts) {
    const satu = e.data?.next_1_hours;
    if (!satu) continue; // bagian 6-jaman tidak dipakai untuk tampilan per jam
    const ins = e.data?.instant?.details ?? {};
    const simbol = satu.summary?.symbol_code ?? null;
    const k = dariSimbolMet(simbol);
    jam.push({
      waktu: waktuLokal(e.time, zona),
      suhu: angka(ins.air_temperature),
      terasa: null,
      ...k,
      siang: !(simbol ?? "").endsWith("_night"),
      peluangHujan: bulat(satu.details?.probability_of_precipitation),
      hujanMm: angka(satu.details?.precipitation_amount),
      kelembapan: bulat(ins.relative_humidity),
      anginKmj: typeof ins.wind_speed === "number" ? Math.round(ins.wind_speed * 3.6) : null,
      arahAngin: bulat(ins.wind_from_direction),
      uv: angka(ins.ultraviolet_index_clear_sky),
    });
  }
  if (jam.length === 0) throw new Error("Prakiraan MET Norway per jam kosong");
  const perHari = new Map<string, JamCuaca[]>();
  for (const j of jam) perHari.set(j.waktu.slice(0, 10), [...(perHari.get(j.waktu.slice(0, 10)) ?? []), j]);
  const urutIkon: IkonCuaca[] = ["cerah", "cerah-berawan", "berawan", "kabut", "gerimis", "hujan", "hujan-lebat", "petir"];
  const hari: HariCuaca[] = [...perHari.entries()].map(([tanggal, js]) => {
    const suhu = js.map((j) => j.suhu).filter((v): v is number => v !== null);
    const terburuk = js.reduce((a, b) => (urutIkon.indexOf(b.ikon) > urutIkon.indexOf(a.ikon) ? b : a));
    const peluang = js.map((j) => j.peluangHujan).filter((v): v is number => v !== null);
    return {
      tanggal,
      min: suhu.length ? Math.min(...suhu) : null,
      maks: suhu.length ? Math.max(...suhu) : null,
      kondisi: terburuk.kondisi,
      ikon: terburuk.ikon,
      peluangHujan: peluang.length ? Math.max(...peluang) : null,
      hujanMm: Math.round(js.reduce((a, j) => a + (j.hujanMm ?? 0), 0) * 10) / 10,
      terbit: null,
      terbenam: null,
      uvMaks: null,
    };
  });
  return { sumber: { ...SUMBER_MET_JAM, diambilPada: now.toISOString() }, stale: false, zona, jam, hari, catatan: `${CATATAN} Sumber utama sedang penuh, jadi dipakai MET Norway (tanpa suhu terasa).` };
}

/** Jam saat ini dan sesudahnya (jam berjalan dihitung "sekarang"). */
export function jamMulaiSekarang(jam: JamCuaca[], zona: Zona, now = new Date()): JamCuaca[] {
  const kini = waktuLokal(now.toISOString(), zona).slice(0, 13);
  return jam.filter((j) => j.waktu.slice(0, 13) >= kini);
}

export function arahMataAngin(derajat: number | null): string {
  if (derajat === null) return "";
  const arah = ["utara", "timur laut", "timur", "tenggara", "selatan", "barat daya", "barat", "barat laut"];
  return arah[Math.round(((derajat % 360) + 360) % 360 / 45) % 8];
}

/** Kategori UV (WHO). */
export function kategoriUv(uv: number | null): string | null {
  if (uv === null) return null;
  return uv < 3 ? "rendah" : uv < 6 ? "sedang" : uv < 8 ? "tinggi" : uv < 11 ? "sangat tinggi" : "ekstrem";
}

/** WIB/WITA/WIT dari nama provinsi (Indonesia: tiga zona waktu). */
export function zonaUntukProvinsi(provinsi: string): Zona {
  const p = provinsi.toUpperCase();
  if (/MALUKU|PAPUA/.test(p)) return "Asia/Jayapura";
  if (/BALI|NUSA TENGGARA|SULAWESI|GORONTALO|KALIMANTAN (SELATAN|TIMUR|UTARA)/.test(p)) return "Asia/Makassar";
  return "Asia/Jakarta";
}
