// Bangun data statis Profil Risiko Lokasi dari sumber resmi (jalankan: npm run bangun:data-risiko).
// Hasil disimpan di src/lib/risiko/data/ dan di-commit, sehingga aplikasi tidak bergantung pada layanan ini saat berjalan.
//  - Gunung api: Smithsonian Institution Global Volcanism Program, Volcanoes of the World (WFS resmi GVP).
//  - Tsunami: NOAA NCEI Global Historical Tsunami Database, titik runup (ketinggian air di darat) di Indonesia.
//  - Garis pantai: Natural Earth 1:10m coastline (domain publik), dipangkas ke wilayah Indonesia dan dijarangkan.
// Bila jaringan Node bermasalah, unduh dengan curl lalu jalankan dengan --lokal <folder> (berisi gvp.json, run1.json..., ne10.geojson).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const KELUAR = join(process.cwd(), "src", "lib", "risiko", "data");
const KOTAK = { lonMin: 93, lonMaks: 142.5, latMin: -12.5, latMaks: 7.5 };
const dalam = (lon: number, lat: number) => lon > KOTAK.lonMin && lon < KOTAK.lonMaks && lat > KOTAK.latMin && lat < KOTAK.latMaks;

const iLokal = process.argv.indexOf("--lokal");
const LOKAL = iLokal > 0 ? process.argv[iLokal + 1] : null;
function berkasLokal(url: string): string | null {
  if (!LOKAL) return null;
  if (url.includes("volcano.si.edu")) return join(LOKAL, "gvp.json");
  if (url.includes("ne_10m_coastline")) return join(LOKAL, "ne10.geojson");
  const hal = url.match(/[?&]page=(\d+)/)?.[1];
  return hal ? join(LOKAL, `run${hal}.json`) : null;
}

async function json<T>(url: string, ms = 600_000): Promise<T> {
  const f = berkasLokal(url);
  if (f) {
    if (!existsSync(f)) throw new Error(`berkas lokal tidak ada: ${f}`);
    return JSON.parse(readFileSync(f, "utf-8")) as T;
  }
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": "SIGAP/1.0 pembangun data risiko" } });
    if (!r.ok) throw new Error(`${r.status} ${url}`);
    return (await r.json()) as T;
  } finally {
    clearTimeout(t);
  }
}

async function gunungApi() {
  type F = { properties: { Volcano_Name: string; Last_Eruption_Year: number | null; Evidence_Category: string; Latitude: number; Longitude: number; Elevation: number } };
  const url = "https://webservices.volcano.si.edu/geoserver/GVP-VOTW/ows?service=WFS&version=2.0.0&request=GetFeature&typeName=GVP-VOTW:Smithsonian_VOTW_Holocene_Volcanoes&outputFormat=application/json&CQL_FILTER=Country%3D%27Indonesia%27";
  const d = await json<{ features: F[] }>(url);
  const daftar = d.features
    .map((f) => f.properties)
    .map((p) => ({ nama: p.Volcano_Name, lat: p.Latitude, lon: p.Longitude, erupsiTerakhir: p.Last_Eruption_Year ?? null, tinggiM: p.Elevation }))
    .sort((a, b) => a.nama.localeCompare(b.nama));
  return { sumber: "Global Volcanism Program, Smithsonian Institution. Volcanoes of the World (Holocene). https://volcano.si.edu/", diambil: new Date().toISOString().slice(0, 10), daftar };
}

async function tsunami() {
  type R = { year: number; latitude?: number; longitude?: number; runupHt?: number; deaths?: number; locationName?: string; doubtful?: string };
  const semua: R[] = [];
  for (let hal = 1; hal <= 40; hal++) {
    const d = await json<{ items: R[]; totalPages: number }>(`https://www.ngdc.noaa.gov/hazel/hazard-service/api/v1/tsunamis/runups?country=INDONESIA&minYear=1800&itemsPerPage=200&page=${hal}`);
    semua.push(...d.items);
    if (hal >= d.totalPages) break;
  }
  // Satu titik per sel 0,05° (sekitar 5 km): tinggi maksimum, tahun terakhir, dan nama lokasi kejadian tertinggi.
  const sel = new Map<string, { lat: number; lon: number; tahun: number; tinggiM: number | null; nama: string }>();
  for (const r of semua) {
    if (r.doubtful === "y" || typeof r.latitude !== "number" || typeof r.longitude !== "number") continue;
    const k = `${Math.round(r.latitude * 20)}:${Math.round(r.longitude * 20)}`;
    const ada = sel.get(k);
    const t = typeof r.runupHt === "number" ? r.runupHt : null;
    if (!ada) sel.set(k, { lat: +r.latitude.toFixed(3), lon: +r.longitude.toFixed(3), tahun: r.year, tinggiM: t, nama: r.locationName ?? "" });
    else {
      if (t !== null && (ada.tinggiM === null || t > ada.tinggiM)) {
        ada.tinggiM = t;
        ada.nama = r.locationName ?? ada.nama;
        ada.tahun = r.year;
      }
    }
  }
  return { sumber: "NOAA National Centers for Environmental Information (NCEI), Global Historical Tsunami Database. doi:10.7289/V5PN93H7", diambil: new Date().toISOString().slice(0, 10), titik: [...sel.values()] };
}

async function pantai() {
  type G = { geometry: { type: "LineString" | "MultiLineString"; coordinates: number[][] | number[][][] } };
  const d = await json<{ features: G[] }>("https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_coastline.geojson");
  const titik: number[] = [];
  for (const f of d.features) {
    const garis = (f.geometry.type === "LineString" ? [f.geometry.coordinates] : f.geometry.coordinates) as number[][][];
    for (const g of garis) {
      let akhir: [number, number] | null = null;
      for (const [lon, lat] of g) {
        if (!dalam(lon, lat)) continue;
        // Jarangkan: titik berurutan minimal sekitar 2 km agar berkas kecil (ketelitian jarak sekitar 1 km).
        if (akhir && Math.abs(lon - akhir[0]) + Math.abs(lat - akhir[1]) < 0.02) continue;
        titik.push(Math.round(lon * 1000), Math.round(lat * 1000));
        akhir = [lon, lat];
      }
    }
  }
  return { sumber: "Natural Earth 1:10m Coastline (domain publik). https://www.naturalearthdata.com/", skala: 1000, titik };
}

(async () => {
  mkdirSync(KELUAR, { recursive: true });
  const [g, t, p] = await Promise.all([gunungApi(), tsunami(), pantai()]);
  writeFileSync(join(KELUAR, "gunung-api.json"), JSON.stringify(g));
  writeFileSync(join(KELUAR, "tsunami-runup.json"), JSON.stringify(t));
  writeFileSync(join(KELUAR, "pantai.json"), JSON.stringify(p));
  console.log(`gunung api ${g.daftar.length}, titik tsunami ${t.titik.length}, titik pantai ${p.titik.length / 2}`);
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
