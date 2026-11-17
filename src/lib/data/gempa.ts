import type { GempaItem, GempaResponse } from "@/types";
import { fetchUpstreamJson } from "@/lib/http/fetch-upstream";
import { haversineKm, jarakBulat10 } from "@/lib/geo/haversine";
import { toNumber, toPlainText } from "./sanitize";

// ASUMSI: jalur dan ekstensi .json diverifikasi hari 1 (Blueprint 15.3).
const BASE = "https://data.bmkg.go.id/DataMKG/TEWS";
type Raw = Record<string, unknown>;

/** Dukung "lat,lon" atau Lintang "6.12 LS" / Bujur "106.5 BT". LS -> negatif, BT -> positif. */
export function parseKoordinat(g: Raw): { lat: number | null; lon: number | null } {
  if (typeof g.Coordinates === "string") {
    const [a, b] = g.Coordinates.split(",");
    const lat = toNumber(a);
    const lon = toNumber(b);
    if (lat !== null && lon !== null) return { lat, lon };
  }
  const parse = (v: unknown, neg: string) => {
    if (typeof v !== "string") return null;
    const n = toNumber(v);
    if (n === null) return null;
    return new RegExp(`\\b${neg}\\b`, "i").test(v) ? -Math.abs(n) : Math.abs(n);
  };
  return { lat: parse(g.Lintang, "LS"), lon: parse(g.Bujur, "BB") ?? parse(g.Bujur, "BT") };
}

function parseKedalaman(v: unknown): number | null {
  return typeof v === "string" ? toNumber(v.replace(/km/i, "").trim()) : toNumber(v);
}

function shakemap(v: unknown): string | undefined {
  if (typeof v !== "string" || !v) return undefined;
  const url = v.startsWith("http") ? v : `https://static.bmkg.go.id/${v}`;
  return url.startsWith("https://static.bmkg.go.id/") ? url : undefined;
}

export function normalizeGempaItem(
  g: Raw,
  jenis: GempaItem["jenis"],
  ref?: { lat: number; lon: number },
): GempaItem | null {
  const mag = toNumber(g.Magnitude);
  const waktu = typeof g.DateTime === "string" ? g.DateTime : null;
  if (mag === null || !waktu) return null;
  const { lat, lon } = parseKoordinat(g);
  const item: GempaItem = {
    waktu,
    magnitudo: mag,
    kedalamanKm: parseKedalaman(g.Kedalaman),
    wilayah: toPlainText(g.Wilayah),
    lat,
    lon,
    jenis,
  };
  if (typeof g.Potensi === "string") item.potensi = toPlainText(g.Potensi);
  if (typeof g.Dirasakan === "string") item.dirasakan = toPlainText(g.Dirasakan);
  const sm = shakemap(g.Shakemap);
  if (sm) item.shakemapUrl = sm;
  if (ref && lat !== null && lon !== null) {
    item.jarakKm = jarakBulat10(haversineKm(ref.lat, ref.lon, lat, lon));
  }
  return item;
}

function listFrom(raw: unknown): Raw[] {
  const g = ((raw as Raw)?.Infogempa as Raw | undefined)?.gempa;
  return Array.isArray(g) ? (g as Raw[]) : g && typeof g === "object" ? [g as Raw] : [];
}

export function buildGempa(
  autogempa: unknown,
  terkini: unknown,
  dirasakan: unknown,
  ref?: { lat: number; lon: number },
  now = new Date(),
): GempaResponse {
  const terbaru = listFrom(autogempa)
    .map((g) => normalizeGempaItem(g, "terbaru", ref))
    .find(Boolean) ?? null;

  const m5 = listFrom(terkini).map((g) => normalizeGempaItem(g, "m5", ref));
  const rasa = listFrom(dirasakan).map((g) => normalizeGempaItem(g, "dirasakan", ref));
  // Satu gempa bisa muncul di beberapa berkas (mis. M7.1 ada di gempaterkini dan gempadirasakan, dan gempa
  // terbaru ada di autogempa dan gempadirasakan). Gabungkan per kejadian: kolom yang hanya ada di salah satu
  // berkas (Potensi, Dirasakan, Shakemap) tetap terbawa, dan gempa terbaru tidak diulang di daftar.
  const kunci = (x: GempaItem) => `${x.waktu}|${x.magnitudo}`;
  const gabung = new Map<string, GempaItem>();
  for (const x of [...m5, ...rasa]) {
    if (!x) continue;
    const ada = gabung.get(kunci(x));
    if (!ada) {
      gabung.set(kunci(x), { ...x });
      continue;
    }
    if (ada.potensi === undefined && x.potensi !== undefined) ada.potensi = x.potensi;
    if (ada.dirasakan === undefined && x.dirasakan !== undefined) ada.dirasakan = x.dirasakan;
    if (ada.shakemapUrl === undefined && x.shakemapUrl !== undefined) ada.shakemapUrl = x.shakemapUrl;
  }
  const daftar = [...gabung.values()]
    .filter((x) => !terbaru || kunci(x) !== kunci(terbaru))
    .sort((a, b) => Date.parse(b.waktu) - Date.parse(a.waktu))
    .slice(0, 5);

  // gempaDekat24j: M5.0+ dalam 24 jam terakhir, radius 300 km (hanya bila lokasi diberikan)
  const kandidat = [terbaru, ...daftar].filter((x): x is GempaItem => Boolean(x));
  const gempaDekat24j = Boolean(
    ref &&
      kandidat.some(
        (x) =>
          x.magnitudo >= 5 &&
          now.getTime() - Date.parse(x.waktu) <= 24 * 3600_000 &&
          x.jarakKm !== undefined &&
          x.jarakKm <= 300,
      ),
  );

  return {
    sumber: { nama: "BMKG", url: "https://data.bmkg.go.id/gempabumi", diambilPada: now.toISOString() },
    stale: false,
    terbaru,
    daftar,
    ringkasan: { gempaDekat24j },
  };
}

/** Data gempa sama untuk semua pengguna; jarak dihitung di atasnya (cache hulu dibagi). */
export async function fetchGempaRaw() {
  const opt = { revalidateSeconds: 120 };
  const [a, b, c] = await Promise.allSettled([
    fetchUpstreamJson(`${BASE}/autogempa.json`, opt),
    fetchUpstreamJson(`${BASE}/gempaterkini.json`, opt),
    fetchUpstreamJson(`${BASE}/gempadirasakan.json`, opt),
  ]);
  const ok = (r: PromiseSettledResult<unknown>) => (r.status === "fulfilled" ? r.value : null);
  if (a.status === "rejected" && b.status === "rejected" && c.status === "rejected") throw a.reason;
  return { autogempa: ok(a), terkini: ok(b), dirasakan: ok(c) };
}
