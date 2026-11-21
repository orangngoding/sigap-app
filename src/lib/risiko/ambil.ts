// Pengambil Profil Risiko Lokasi (server). Data statis (gunung api, tsunami, garis pantai) dibaca dari berkas bawaan;
// data langsung (USGS gempa, OpenTopoData ketinggian) di-cache 30 hari per sel kecil karena berubah sangat lambat.
// Setiap sumber berdiri sendiri: satu gagal tidak menggagalkan yang lain (bahaya itu ditandai "belum diketahui").
import { cachedWithStale } from "@/lib/http/server-cache";
import { fetchUpstreamJson } from "@/lib/http/fetch-upstream";
import { ambilKlimatologi, ambilTitikPanas } from "@/lib/data/ambil";
import { rawanKarhutla } from "@/lib/iklim/pekan";
import dataGunung from "./data/gunung-api.json";
import dataTsunami from "./data/tsunami-runup.json";
import dataPantai from "./data/pantai.json";
import { cariGunungApi, cariTsunami, hitungRelief, jarakKm, jarakPantaiKm, nilaiRisiko, type FaktaLokasi, type GunungApi, type NilaiBahaya, type TitikTsunami } from "./nilai";

export const SUMBER_RISIKO = [
  { nama: "Smithsonian Global Volcanism Program (gunung api)", url: "https://volcano.si.edu/" },
  { nama: "USGS Earthquake Catalog (gempa M5+ sejak 1976)", url: "https://earthquake.usgs.gov/earthquakes/search/" },
  { nama: "NOAA NCEI Global Historical Tsunami Database", url: "https://www.ngdc.noaa.gov/hazard/tsu_db.shtml" },
  { nama: "Natural Earth (garis pantai)", url: "https://www.naturalearthdata.com/" },
  { nama: "SRTM 90 m melalui OpenTopoData (ketinggian dan lereng)", url: "https://www.opentopodata.org/" },
  { nama: "NASA FIRMS (titik panas) dan pola iklim 1991-2020", url: "https://firms.modaps.eosdis.nasa.gov/" },
] as const;

export interface RisikoLokasiResponse {
  stale: boolean;
  diambilPada: string;
  nilai: NilaiBahaya[];
  fakta: FaktaLokasi;
  sumber: typeof SUMBER_RISIKO;
  catatan: string;
}

const CATATAN =
  "Profil ini dihitung dari data terbuka untuk titik lokasi Anda dan bersifat saran persiapan, bukan peta risiko resmi. Kondisi tepat di sekitar rumah (sungai kecil, tebing, saluran) tidak terlihat oleh data ini. Peta resmi: InaRISK BNPB dan peta Kawasan Rawan Bencana PVMBG.";

const sel = (v: number, langkah: number) => Math.round(v / langkah) * langkah;

interface UsgsFitur {
  properties?: { mag?: number; time?: number; place?: string };
  geometry?: { coordinates?: number[] };
}

/** Gempa dari katalog USGS: jumlah M5+ dalam 150 km sejak 1976, gempa terkuat, dan ada tidaknya M7+ dalam 300 km sejak 1900. */
async function gempaUsgs(lat: number, lon: number): Promise<FaktaLokasi["gempa"]> {
  const la = sel(lat, 0.1);
  const lo = sel(lon, 0.1);
  const r = await cachedWithStale(`risiko:usgs:${la}:${lo}`, 30 * 86_400_000, async () => {
    const q = (o: Record<string, string>) => new URLSearchParams({ format: "geojson", latitude: la.toFixed(1), longitude: lo.toFixed(1), ...o });
    const dasar = "https://earthquake.usgs.gov/fdsnws/event/1";
    const opsi = { timeoutMs: 15_000, revalidateSeconds: 7 * 86_400 };
    const [hitung, kuat, m7] = await Promise.all([
      fetchUpstreamJson<{ count: number }>(`${dasar}/count?${q({ maxradiuskm: "150", minmagnitude: "5", starttime: "1976-01-01" })}`, opsi),
      fetchUpstreamJson<{ features: UsgsFitur[] }>(`${dasar}/query?${q({ maxradiuskm: "150", minmagnitude: "5", starttime: "1976-01-01", orderby: "magnitude", limit: "1" })}`, opsi),
      fetchUpstreamJson<{ count: number }>(`${dasar}/count?${q({ maxradiuskm: "300", minmagnitude: "7", starttime: "1900-01-01" })}`, opsi),
    ]);
    return { stale: false, hitung: hitung.count, kuat: kuat.features?.[0] ?? null, m7: m7.count };
  });
  const k = r.kuat;
  const c = k?.geometry?.coordinates;
  const terkuat =
    k && typeof k.properties?.mag === "number" && typeof k.properties.time === "number" && c && c.length >= 2
      ? { mag: k.properties.mag, tahun: new Date(k.properties.time).getUTCFullYear(), tempat: k.properties.place ?? "", lat: c[1], lon: c[0], km: jarakKm(lat, lon, c[1], c[0]) }
      : null;
  return { jumlahM5: r.hitung, radiusKm: 150, sejak: 1976, terkuat, adaM7Laut300km: r.m7 > 0 };
}

/** Ketinggian titik tengah dan delapan titik sekitar 600 m darinya (SRTM 90 m, OpenTopoData). */
async function reliefSrtm(lat: number, lon: number): Promise<FaktaLokasi["relief"]> {
  const la = sel(lat, 0.005);
  const lo = sel(lon, 0.005);
  const r = await cachedWithStale(`risiko:srtm:${la.toFixed(3)}:${lo.toFixed(3)}`, 30 * 86_400_000, async () => {
    const dLat = 0.0054;
    const dLon = 0.0054 / Math.cos((la * Math.PI) / 180);
    const titik: Array<[number, number]> = [[la, lo]];
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) titik.push([la + a * dLat, lo + b * dLon]);
    const lokasi = titik.map(([a, b]) => `${a.toFixed(5)},${b.toFixed(5)}`).join("|");
    const d = await fetchUpstreamJson<{ results?: Array<{ elevation: number | null }> }>(`https://api.opentopodata.org/v1/srtm90m?locations=${encodeURIComponent(lokasi)}`, { timeoutMs: 12_000, revalidateSeconds: 30 * 86_400, percobaan: 1 });
    return { stale: false, elevasi: (d.results ?? []).map((x) => (typeof x.elevation === "number" ? x.elevation : null)) };
  });
  return hitungRelief(r.elevasi);
}

async function iklimLokasi(lat: number, lon: number): Promise<FaktaLokasi["iklim"]> {
  const k = await ambilKlimatologi(lat, lon);
  const bulanKering = k.bulanan.filter((b) => b.hujanMm < 60).length;
  const ekstrem = k.bulanan.reduce((a, b) => a + b.hariHujanEkstrem, 0);
  return { bulanKering, kemarauTerburuk: k.kemarauTerburuk, hariHujanEkstrem: Math.round(ekstrem * 10) / 10, sumber: k.sumber.nama.startsWith("NASA") ? "NASA POWER" : "ERA5" };
}

const nilaiAtauNull = async <T>(p: Promise<T>): Promise<T | null> => {
  try {
    return await p;
  } catch {
    return null;
  }
};

/** Profil risiko untuk satu titik. `provinsi` dipakai untuk daftar provinsi prioritas karhutla. */
export async function ambilRisikoLokasi(lat: number, lon: number, provinsi: string): Promise<RisikoLokasiResponse> {
  const [gempa, relief, iklim, panas] = await Promise.all([
    nilaiAtauNull(gempaUsgs(lat, lon)),
    nilaiAtauNull(reliefSrtm(lat, lon)),
    nilaiAtauNull(iklimLokasi(lat, lon)),
    nilaiAtauNull(ambilTitikPanas(lat, lon, 50)),
  ]);
  const fakta: FaktaLokasi = {
    gunungApi: cariGunungApi(dataGunung.daftar as GunungApi[], lat, lon),
    gempa,
    pantaiKm: jarakPantaiKm(dataPantai.titik, dataPantai.skala, lat, lon),
    tsunami: cariTsunami(dataTsunami.titik as TitikTsunami[], lat, lon),
    relief,
    iklim,
    titikPanas7h: panas ? panas.dalam7h : null,
    provinsiRawanKarhutla: rawanKarhutla(provinsi),
  };
  return { stale: false, diambilPada: new Date().toISOString(), nilai: nilaiRisiko(fakta), fakta, sumber: SUMBER_RISIKO, catatan: CATATAN };
}
