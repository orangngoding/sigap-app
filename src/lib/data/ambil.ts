// Pengambil data BMKG ber-cache yang dipakai bersama oleh rute data (/api/cuaca, /api/gempa, /api/peringatan)
// dan Briefing Siaga. Kunci cache sama, jadi Briefing tidak menambah panggilan ke hulu.
import type { BeritaResponse, CuacaResponse, GempaResponse, IklimResponse, PeringatanResponse } from "@/types";
import { fetchIklim, iklimDariPower } from "./iklim";
import { cachedWithStale } from "@/lib/http/server-cache";
import { fetchCuaca } from "./cuaca";
import { buildGempa, fetchGempaRaw } from "./gempa";
import { fetchBerita } from "./berita";
import { fetchPeringatan, type LokasiCocok } from "./peringatan";
import { fetchProyeksi, type ProyeksiResponse } from "./proyeksi";
import { snapGrid, snapKasar, snapProyeksi } from "./iklim-math";
import proyeksiKota from "./proyeksi-kota.json";
import { pilihProyeksi, type BerkasProyeksiKota } from "./iklim-kota";
import { fetchKlimatologi, type KlimatologiResponse } from "./klimatologi";
import { hitungKondisiGlobal, URL_DMI, URL_NINO34_BULANAN, URL_ONI, type KondisiGlobal } from "./iklim-global";
import { fetchTitikPanas, ringkasTitikPanas, type RingkasTitikPanas, type Titik } from "./titik-panas";
import { fetchUpstreamJson, fetchUpstreamText } from "@/lib/http/fetch-upstream";
import { ApiError } from "@/lib/http/api-error";
import { tanggalWib, type RawPrakiraan, type RawUdara } from "@/lib/iklim/pekan";
import { rawDariCadangan, type RawMetNo } from "@/lib/iklim/pekan-cadangan";
import { fetchPowerHarian } from "./nasa-power";
import { proyeksiDariPengamatan } from "./proyeksi-delta";
import { klimatologiDariPower } from "./klimatologi";
import type { DeretModel } from "./proyeksi";
import { uraiMetJam, uraiOpenMeteoJam, type CuacaJamResponse, type RawMetJam, type RawOpenMeteoJam, type Zona } from "./cuaca-jam";

// ---------- Pemutus sementara per penyedia ----------
// Bila penyedia menjawab "kuota habis" (BATAS_HULU), penyedia itu tidak dihubungi lagi selama JEDA_KUOTA_MS: pengguna
// langsung mendapat sumber cadangan tanpa menunggu penolakan berikutnya, dan kuota tidak makin terkuras.
const JEDA_KUOTA_MS = 30 * 60_000;
const tahan = new Map<string, number>();
async function lewatPemutus<T>(penyedia: string, fn: () => Promise<T>): Promise<T> {
  if ((tahan.get(penyedia) ?? 0) > Date.now()) throw new ApiError("BATAS_HULU");
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ApiError && e.code === "BATAS_HULU") tahan.set(penyedia, Date.now() + JEDA_KUOTA_MS);
    throw e;
  }
}

/**
 * Pengamatan harian NASA POWER 1991 sampai akhir tahun lalu per sel 0,5° (sekitar 400 KB, 1-3 detik, tanpa kuota harian),
 * di-cache 30 hari. Satu unduhan dipakai bersama oleh cadangan pola bulanan (Musim ini) dan proyeksi metode delta.
 */
function ambilPowerPanjang(lat: number, lon: number): Promise<{ stale: boolean; d: DeretModel }> {
  const akhir = new Date().getUTCFullYear() - 1;
  return cachedWithStale(`power:v1:${snapKasar(lat)}:${snapKasar(lon)}:${akhir}`, 30 * 86_400_000, async () => ({
    stale: false,
    d: await fetchPowerHarian(lat, lon, "1991-01-01", `${akhir}-12-31`),
  }));
}

export function ambilCuaca(adm4: string): Promise<CuacaResponse> {
  return cachedWithStale(`cuaca:${adm4}`, 10 * 60_000, () => fetchCuaca(adm4));
}

export async function ambilGempa(ref?: { lat: number; lon: number }): Promise<GempaResponse> {
  // Cache berkas mentah (sama untuk semua pengguna); jarak dihitung per permintaan.
  const raw = await cachedWithStale("gempa:raw", 2 * 60_000, async () => ({
    stale: false,
    fetchedAt: new Date().toISOString(),
    ...(await fetchGempaRaw()),
  }));
  const data = buildGempa(raw.autogempa, raw.terkini, raw.dirasakan, ref, new Date(raw.fetchedAt));
  data.stale = raw.stale;
  return data;
}

export function ambilPeringatan(l: LokasiCocok): Promise<PeringatanResponse> {
  return cachedWithStale(`peringatan:${l.provinsi.toLowerCase()}:${l.kabKota ?? ""}:${l.kecamatan ?? ""}`, 2 * 60_000, () => fetchPeringatan(l));
}

export function ambilBerita(): Promise<BeritaResponse> {
  return cachedWithStale("berita", 10 * 60_000, () => fetchBerita());
}

/**
 * Proyeksi iklim 1991-2050. Urutan: (1) data bawaan kota utama terdekat (seketika, tanpa penyedia); (2) hitung langsung
 * per grid 0,5° (permintaan sangat berat: belasan lokasi baru per hari untuk kuota gratis, jadi di-cache 30 hari dan
 * dibagi lokasi berdekatan); (3) bila penyedia menolak atau gagal, kota bawaan terdekat sebagai cadangan berlabel.
 */
export function ambilProyeksi(lat: number, lon: number): Promise<ProyeksiResponse> {
  const berkas = proyeksiKota as unknown as BerkasProyeksiKota;
  return pilihProyeksi(
    berkas.kota,
    lat,
    lon,
    () => cachedWithStale(`proyeksi:v4:${snapProyeksi(lat)}:${snapProyeksi(lon)}`, 30 * 86_400_000, () => lewatPemutus("open-meteo-iklim", () => fetchProyeksi(lat, lon))),
    // Cadangan untuk SEMUA lokasi: pengamatan NASA POWER di lokasi ini + perubahan ansambel CMIP6 (metode delta).
    async () => {
      const p = await ambilPowerPanjang(lat, lon);
      return { ...proyeksiDariPengamatan(p.d, lat, lon), stale: p.stale };
    },
  );
}

const UA_MET = `SIGAP/1.0 aplikasi kesiapsiagaan bencana (${process.env.NEXT_PUBLIC_SITE_URL ?? "https://github.com"})`;

/** Cadangan prakiraan: MET Norway (sekitar 9 hari) + hujan 30 hari terakhir NASA POWER (pelengkap; gagal = null). */
async function prakiraanCadangan(la: number, lo: number): Promise<RawPrakiraan> {
  const now = new Date();
  const hariIni = tanggalWib(now);
  const mulai = new Date(Date.parse(`${hariIni}T00:00:00Z`) - 31 * 86_400_000).toISOString().slice(0, 10);
  const kemarin = new Date(Date.parse(`${hariIni}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
  const [met, lampau] = await Promise.all([
    fetchUpstreamJson<RawMetNo>(`https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=${la}&lon=${lo}`, { timeoutMs: 12_000, revalidateSeconds: 3600, headers: { "User-Agent": UA_MET } }),
    fetchPowerHarian(la, lo, mulai, kemarin, 6 * 3600).catch(() => null),
  ]);
  return rawDariCadangan(met, lampau, now);
}

/**
 * Siaga Iklim "Minggu ini": prakiraan 16 hari + 30 hari terakhir dan kualitas udara 5 hari per grid 0,25°,
 * di-cache 1 jam (data mentah; sinyal dihitung per permintaan karena bergantung pada provinsi dan bahaya pilihan).
 */
export function ambilPrakiraanPekan(lat: number, lon: number) {
  const la = snapGrid(lat);
  const lo = snapGrid(lon);
  return cachedWithStale(`pekan:${la}:${lo}`, 60 * 60_000, async () => {
    const q = (o: Record<string, string>) => new URLSearchParams({ latitude: String(la), longitude: String(lo), timezone: "Asia/Jakarta", ...o });
    const [utama, udara] = await Promise.all([
      lewatPemutus("open-meteo-prakiraan", () =>
        fetchUpstreamJson<RawPrakiraan>(
          `https://api.open-meteo.com/v1/forecast?${q({ daily: "temperature_2m_max,apparent_temperature_max,precipitation_sum,precipitation_probability_max,relative_humidity_2m_min,wind_speed_10m_max", past_days: "30", forecast_days: "16" })}`,
          { timeoutMs: 12_000, revalidateSeconds: 3600 },
        ),
      ).catch(() => null),
      // Kualitas udara bersifat pelengkap: bila gagal, sinyal lain tetap tampil.
      lewatPemutus("open-meteo-udara", () => fetchUpstreamJson<RawUdara>(`https://air-quality-api.open-meteo.com/v1/air-quality?${q({ hourly: "pm2_5", forecast_days: "5" })}`, { timeoutMs: 12_000, revalidateSeconds: 3600 })).catch(() => null),
    ]);
    // Open-Meteo menolak atau gagal: MET Norway + NASA POWER (galatnya diteruskan bila cadangan juga gagal).
    const prakiraan = utama ?? (await prakiraanCadangan(la, lo));
    return { stale: false, lat: la, lon: lo, prakiraan, udara, cadangan: utama === null, diambilPada: new Date().toISOString() };
  });
}

/** Status El Niño/La Niña dan IOD (data bulanan NOAA): berubah sebulan sekali, cukup di-cache 12 jam. */
export function ambilKondisiGlobal(): Promise<KondisiGlobal> {
  return cachedWithStale("iklim-global", 12 * 3_600_000, async () => {
    const ambil = (url: string) => fetchUpstreamText(url, { timeoutMs: 15_000, revalidateSeconds: 6 * 3600, percobaan: 2 });
    const [oni, nino, dmi] = await Promise.all([ambil(URL_ONI), ambil(URL_NINO34_BULANAN).catch(() => null), ambil(URL_DMI).catch(() => null)]);
    return hitungKondisiGlobal(oni, nino, dmi);
  });
}

/** Titik panas seluruh Indonesia 7 hari (sama untuk semua pengguna), di-cache 1 jam; ringkasan per lokasi dihitung per permintaan. */
export async function ambilTitikPanas(lat: number, lon: number, radiusKm = 50): Promise<RingkasTitikPanas> {
  const raw = await cachedWithStale<{ stale: boolean; titik: Titik[]; diambilPada: string }>("titik-panas", 60 * 60_000, async () => ({ stale: false, titik: await fetchTitikPanas(), diambilPada: new Date().toISOString() }));
  const r = ringkasTitikPanas(raw.titik, lat, lon, new Date(), radiusKm);
  r.stale = raw.stale;
  r.sumber.diambilPada = raw.diambilPada;
  return r;
}

/**
 * Pola bulanan iklim dari pengamatan ERA5 1991-2020 per grid 0,25°: ringan dibanding proyeksi dan berubah sangat
 * lambat, jadi di-cache 30 hari dan dibagi lokasi yang berdekatan.
 */
export async function ambilKlimatologi(lat: number, lon: number): Promise<KlimatologiResponse> {
  try {
    return await cachedWithStale(`klimatologi:v1:${snapGrid(lat)}:${snapGrid(lon)}`, 30 * 86_400_000, () => lewatPemutus("open-meteo-arsip", () => fetchKlimatologi(lat, lon)));
  } catch (e) {
    // Cadangan tanpa kuota: pola yang sama dari NASA POWER (tidak di-cache di kunci ERA5, agar ERA5 dipakai lagi saat pulih).
    try {
      const p = await ambilPowerPanjang(lat, lon);
      return { ...klimatologiDariPower(p.d, lat, lon), stale: p.stale };
    } catch {
      throw e;
    }
  }
}

/** Data pengamatan tahunan (Lokasi, "Yang sudah terjadi"): ERA5 Open-Meteo, cadangan NASA POWER dengan definisi yang sama. */
export async function ambilIklimTahunan(lat: number, lon: number): Promise<IklimResponse> {
  try {
    return await cachedWithStale(`iklim:${snapGrid(lat)}:${snapGrid(lon)}`, 7 * 24 * 3600_000, () => lewatPemutus("open-meteo-arsip", () => fetchIklim(lat, lon)));
  } catch (e) {
    try {
      const p = await ambilPowerPanjang(lat, lon);
      return iklimDariPower(p.d);
    } catch {
      throw e;
    }
  }
}

/**
 * Cuaca per jam untuk titik kelurahan (Lokasi). Cache 30 menit per sel 0,01° (sekitar 1 km); Open-Meteo lebih dulu,
 * cadangan MET Norway bila menolak. Melengkapi prakiraan resmi BMKG yang per 3 jam.
 */
export function ambilCuacaJam(lat: number, lon: number, zona: Zona): Promise<CuacaJamResponse> {
  const la = Math.round(lat * 100) / 100;
  const lo = Math.round(lon * 100) / 100;
  return cachedWithStale(`cuaca-jam:${la}:${lo}:${zona}`, 30 * 60_000, async () => {
    try {
      const q = new URLSearchParams({
        latitude: String(la),
        longitude: String(lo),
        hourly: "temperature_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_direction_10m,relative_humidity_2m,uv_index,is_day",
        daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,sunrise,sunset,uv_index_max",
        forecast_days: "3",
        timezone: zona,
      });
      const raw = await lewatPemutus("open-meteo-prakiraan", () => fetchUpstreamJson<RawOpenMeteoJam>(`https://api.open-meteo.com/v1/forecast?${q}`, { timeoutMs: 10_000, revalidateSeconds: 1800 }));
      return uraiOpenMeteoJam(raw, zona);
    } catch {
      const met = await fetchUpstreamJson<RawMetJam>(`https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=${la}&lon=${lo}`, { timeoutMs: 12_000, revalidateSeconds: 1800, headers: { "User-Agent": UA_MET } });
      return uraiMetJam(met, zona);
    }
  });
}
