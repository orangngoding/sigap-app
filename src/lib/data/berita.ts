// Berita bencana terkini untuk Pustaka > Berita bencana. Tiga umpan, semuanya hanya judul, penerbit, waktu, dan
// tautan keluar (isi berita tidak disalin):
//  1. Google Berita (RSS pencarian): beberapa pencarian per kelompok bencana agar daftar banyak dan merata.
//  2. ANTARA (kantor berita resmi negara, RSS "terkini"): disaring dengan aturan relevansi yang sama; foto ikut tampil.
//  3. GDACS (Global Disaster Alert and Coordination System, PBB dan Komisi Eropa): peringatan resmi untuk Indonesia.
//     Judul berbahasa Inggris berformat tetap diterjemahkan oleh KODE (bukan AI) agar tidak ada salah terjemah.
// Kegagalan satu umpan tidak menggagalkan yang lain; bila semua gagal, `tersedia: false` (tidak pernah daftar kosong
// yang menyesatkan).
import type { BeritaItem, BeritaResponse, HazardId, PeringatanGlobal } from "@/types";
import { fetchUpstreamText } from "@/lib/http/fetch-upstream";
import { ambilTag } from "./peringatan";

const AWAL_TAUTAN = "https://news.google.com/";
export const URL_SUMBER = "https://news.google.com/home?hl=id&gl=ID&ceid=ID:id";
export const URL_ANTARA = "https://www.antaranews.com/rss/terkini.xml";
export const URL_GDACS = "https://www.gdacs.org/xml/rss.xml";
const MAKS = 60;
const MAKS_SUMBER_SAMA = 6; // cegah satu media memenuhi daftar

/** Pencarian Google Berita per kelompok bencana (7 hari terakhir). */
export const PENCARIAN: Array<{ id: string; q: string }> = [
  { id: "banjir", q: '(banjir OR "banjir bandang" OR "banjir rob") (BPBD OR warga OR rumah OR terendam)' },
  { id: "gempa", q: '("gempa bumi" OR gempa OR tsunami) (BMKG OR magnitudo OR guncangan)' },
  { id: "longsor", q: "(longsor OR \"tanah longsor\" OR \"pergerakan tanah\")" },
  { id: "gunung", q: '(erupsi OR "gunung api" OR "awan panas" OR "abu vulkanik" OR PVMBG)' },
  { id: "cuaca", q: '("puting beliung" OR "angin kencang" OR "cuaca ekstrem" OR "hujan lebat" OR "gelombang tinggi" OR siklon)' },
  { id: "karhutla", q: '(karhutla OR "kebakaran hutan" OR "kebakaran lahan" OR "titik panas" OR kekeringan OR "krisis air")' },
  { id: "lembaga", q: "(BNPB OR BPBD OR Basarnas) (bencana OR siaga OR evakuasi OR pengungsi)" },
];
export const urlPencarian = (q: string) => `https://news.google.com/rss/search?q=${encodeURIComponent(`${q} when:7d`)}&hl=id&gl=ID&ceid=ID:id`;

const normal = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
const potong = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

// Pencarian kata kunci membawa banyak berita yang hanya kebetulan menyebut kata bencana (riset kampus, pupuk
// "anti kekeringan", kasus hukum). Berita dipertahankan hanya bila judulnya memuat peristiwa/lembaga kebencanaan
// DAN tidak memuat topik yang jelas bukan peristiwa bencana. Pencocokan per awalan kata pada judul yang dinormalkan.
const TOPIK_BENCANA = [
  "banjir", "gempa", "longsor", "erupsi", "meletus", "gunung api", "tsunami", "puting beliung", "angin kencang",
  "karhutla", "kebakaran hutan", "kebakaran lahan", "kekeringan", "cuaca ekstrem", "hujan lebat", "siklon", "abrasi",
  "bencana", "darurat", "siaga", "evakuasi", "pengungsi", "korban", "bnpb", "bpbd", "bmkg", "basarnas", "magnitudo",
  "gelombang tinggi", "awan panas", "abu vulkanik", "rob", "titik panas", "krisis air",
];
const BUKAN_PERISTIWA = [
  "riset", "penelitian", "mahasiswa", "dosen", "kampus", "universitas", "skripsi", "wisuda", "beasiswa", "seminar", "webinar", "lomba", "juara",
  "pupuk", "maggot", "inovasi", "kembangkan", "startup", "saham", "harga", "promo", "wisata", "resep", "mitos",
  "korupsi", "tersangka", "diperiksa", "kpk", "kejaksaan", "sidang", "pilkada", "partai", "sepak bola", "liga", "timnas",
  // Pengungsian akibat konflik bersenjata bukan bencana alam.
  "israel", "gaza", "palestina", "ukraina", "rusia", "perang", "militer", "serangan", "rudal", "tentara",
];
const memuat = (teks: string, kata: string[]) => kata.some((k) => ` ${teks}`.includes(` ${k}`));

/** True bila judul berita tampak melaporkan peristiwa atau kesiapsiagaan bencana. */
export function relevan(judul: string): boolean {
  const t = normal(judul);
  return memuat(t, TOPIK_BENCANA) && !memuat(t, BUKAN_PERISTIWA);
}

/** Jenis bencana dari judul (urutan penting: yang lebih spesifik dulu). */
const JENIS: Array<[HazardId, string[]]> = [
  ["tsunami", ["tsunami"]],
  ["gunung_api", ["erupsi", "meletus", "gunung api", "awan panas", "abu vulkanik", "pvmbg", "lava", "lahar"]],
  ["gempa", ["gempa", "magnitudo", "guncangan"]],
  ["karhutla", ["karhutla", "kebakaran hutan", "kebakaran lahan", "titik panas", "hotspot", "kabut asap"]],
  ["kekeringan", ["kekeringan", "kemarau", "krisis air", "kesulitan air bersih"]],
  ["longsor", ["longsor", "pergerakan tanah", "tanah bergerak"]],
  ["gelombang_abrasi", ["gelombang tinggi", "abrasi", "rob"]],
  ["banjir", ["banjir", "genangan", "terendam", "luapan"]],
  ["cuaca_ekstrem", ["puting beliung", "angin kencang", "cuaca ekstrem", "hujan lebat", "siklon", "petir", "hujan es"]],
];
export function jenisBerita(judul: string): HazardId | "umum" {
  const t = normal(judul);
  for (const [j, kata] of JENIS) if (memuat(t, kata)) return j;
  return "umum";
}

/** Judul Google Berita berbentuk "<Judul> - <Media>"; buang akhiran media agar tidak dobel. */
export function pisahJudul(judul: string, sumber: string | null): { judul: string; sumber: string } {
  const akhiran = sumber ? ` - ${sumber}` : null;
  if (akhiran && judul.endsWith(akhiran)) return { judul: judul.slice(0, -akhiran.length).trim(), sumber: sumber as string };
  const idx = judul.lastIndexOf(" - ");
  if (!sumber && idx > 0) return { judul: judul.slice(0, idx).trim(), sumber: judul.slice(idx + 3).trim() };
  return { judul, sumber: sumber ?? "Media daring" };
}

const blokItem = (xml: string) => [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map((m) => m[1]);
const atribut = (blok: string, tag: string, attr: string) => blok.match(new RegExp(`<${tag}\\s[^>]*${attr}="([^"]+)"`, "i"))?.[1] ?? null;

/** Situs partai politik bukan media berita yang netral. */
const SUMBER_DITOLAK = /\b(partai|dpp|dpw|dpd)\b/i;
/** Buang ekor nama domain yang kadang tertinggal di judul ("... - kumparan.com"). */
export const rapikanJudul = (j: string) => j.replace(/\s+[-–|]\s+[a-z0-9-]+(\.[a-z0-9-]+)+\s*$/i, "").trim();

/** Item Google Berita yang relevan (belum digabung, belum dibatasi). */
export function uraiBerita(xml: string, sekarang = new Date()): BeritaItem[] {
  const batas = sekarang.getTime() + 60 * 60_000; // abaikan tanggal yang jauh di masa depan
  const hasil: BeritaItem[] = [];
  for (const b of blokItem(xml)) {
    const link = ambilTag(b, "link") ?? "";
    if (!link.startsWith(AWAL_TAUTAN)) continue; // hanya tautan https dari host umpan
    const pisah = pisahJudul(ambilTag(b, "title") ?? "", ambilTag(b, "source"));
    const judul = rapikanJudul(pisah.judul);
    const sumber = pisah.sumber;
    if (judul.length < 8 || !relevan(judul) || SUMBER_DITOLAK.test(sumber)) continue;
    const t = Date.parse(ambilTag(b, "pubDate") ?? "");
    if (Number.isNaN(t) || t > batas) continue;
    hasil.push({ id: ambilTag(b, "guid") ?? link, judul: potong(judul, 180), sumber: potong(sumber, 60), waktu: new Date(t).toISOString(), url: link, jenis: jenisBerita(judul) });
  }
  return hasil;
}

/** Item ANTARA yang relevan, dengan foto bila ada (hanya https dari domain antaranews.com). */
export function uraiAntara(xml: string, sekarang = new Date()): BeritaItem[] {
  const batas = sekarang.getTime() + 60 * 60_000;
  const hasil: BeritaItem[] = [];
  for (const b of blokItem(xml)) {
    const link = ambilTag(b, "link") ?? "";
    if (!/^https:\/\/(www\.)?antaranews\.com\//.test(link)) continue;
    const judul = ambilTag(b, "title") ?? "";
    if (judul.length < 8 || !relevan(judul)) continue;
    const t = Date.parse(ambilTag(b, "pubDate") ?? "");
    if (Number.isNaN(t) || t > batas) continue;
    const gambar = atribut(b, "enclosure", "url") ?? atribut(b, "media:content", "url");
    hasil.push({
      id: ambilTag(b, "guid") ?? link, judul: potong(judul, 180), sumber: "ANTARA", waktu: new Date(t).toISOString(), url: link, jenis: jenisBerita(judul),
      ...(gambar && /^https:\/\/img\.antaranews\.com\//.test(gambar) ? { gambar } : {}),
    });
  }
  return hasil;
}

const JENIS_GDACS: Record<string, PeringatanGlobal["jenis"]> = { EQ: "gempa", FL: "banjir", DR: "kekeringan", TC: "siklon", VO: "gunung_api", WF: "kebakaran", TS: "tsunami" };
const LEVEL_GDACS: Record<string, PeringatanGlobal["level"]> = { green: "hijau", orange: "oranye", red: "merah" };
const NAMA_JENIS: Record<PeringatanGlobal["jenis"], string> = { gempa: "Gempa", banjir: "Banjir", kekeringan: "Kekeringan", siklon: "Siklon tropis", gunung_api: "Erupsi gunung api", kebakaran: "Kebakaran hutan", tsunami: "Tsunami", lainnya: "Kejadian" };

/** Terjemahan kode untuk judul GDACS berformat tetap; bila formatnya tak dikenal, pakai nama jenis saja. */
export function judulGdacs(judulEn: string, jenis: PeringatanGlobal["jenis"]): string {
  const m = judulEn.match(/Magnitude\s+([\d.]+)M,\s*Depth:\s*([\d.]+)\s*km/i);
  if (jenis === "gempa" && m) return `Gempa M${m[1].replace(".", ",")} (kedalaman ${m[2].replace(".", ",")} km) di Indonesia`;
  if (jenis === "kekeringan") return "Kekeringan berlangsung di Indonesia dan negara sekitar";
  return `${NAMA_JENIS[jenis]} di Indonesia`;
}

/** Peringatan GDACS yang menyebut Indonesia, 30 hari terakhir, terbaru dulu. */
export function uraiGdacs(xml: string, sekarang = new Date()): PeringatanGlobal[] {
  const awal = sekarang.getTime() - 30 * 86_400_000;
  const hasil: PeringatanGlobal[] = [];
  for (const b of blokItem(xml)) {
    if (!/Indonesia/i.test(ambilTag(b, "title") ?? "") && !/Indonesia/i.test(ambilTag(b, "gdacs:country") ?? "")) continue;
    const t = Date.parse(ambilTag(b, "pubDate") ?? "");
    if (Number.isNaN(t) || t < awal || t > sekarang.getTime() + 3_600_000) continue;
    const link = (ambilTag(b, "link") ?? "").replace(/^http:\/\//, "https://");
    if (!/^https:\/\/(www\.)?gdacs\.org\//.test(link)) continue;
    const jenis = JENIS_GDACS[(ambilTag(b, "gdacs:eventtype") ?? "").toUpperCase()] ?? "lainnya";
    hasil.push({
      id: ambilTag(b, "guid") ?? link,
      jenis,
      judul: judulGdacs(ambilTag(b, "title") ?? "", jenis),
      level: LEVEL_GDACS[(ambilTag(b, "gdacs:alertlevel") ?? "").toLowerCase()] ?? "hijau",
      waktu: new Date(t).toISOString(),
      url: link,
    });
  }
  return hasil.sort((a, c) => Date.parse(c.waktu) - Date.parse(a.waktu)).slice(0, 8);
}

/** Gabungkan, buang judul kembar (juga yang nyaris sama), batasi per media, urutkan terbaru dulu. */
export function gabungBerita(kelompok: BeritaItem[][]): BeritaItem[] {
  const semua = kelompok.flat().sort((a, c) => Date.parse(c.waktu) - Date.parse(a.waktu));
  const lihat = new Set<string>();
  const perSumber = new Map<string, number>();
  const hasil: BeritaItem[] = [];
  for (const b of semua) {
    const kunci = normal(b.judul).slice(0, 70);
    if (lihat.has(kunci)) continue;
    const n = perSumber.get(b.sumber) ?? 0;
    if (n >= MAKS_SUMBER_SAMA) continue;
    lihat.add(kunci);
    perSumber.set(b.sumber, n + 1);
    hasil.push(b);
    if (hasil.length >= MAKS) break;
  }
  return hasil;
}

/** Tidak melempar: tiap umpan boleh gagal sendiri; bila semua umpan berita gagal, tersedia:false. */
export async function fetchBerita(sekarang = new Date()): Promise<BeritaResponse> {
  const dasar = { sumber: { nama: "Google Berita, ANTARA, dan GDACS", url: URL_SUMBER, diambilPada: sekarang.toISOString() }, stale: false };
  const rss = async (url: string) => {
    const xml = await fetchUpstreamText(url, { revalidateSeconds: 600, timeoutMs: 7_000, percobaan: 1 });
    if (!/<rss|<channel/i.test(xml)) throw new Error("bukan umpan RSS");
    return xml;
  };
  const [google, antara, gdacs] = await Promise.all([
    Promise.allSettled(PENCARIAN.map((p) => rss(urlPencarian(p.q)).then((x) => uraiBerita(x, sekarang)))),
    rss(URL_ANTARA).then((x) => uraiAntara(x, sekarang)).catch(() => null),
    rss(URL_GDACS).then((x) => uraiGdacs(x, sekarang)).catch(() => null),
  ]);
  const googleOk = google.filter((r): r is PromiseFulfilledResult<BeritaItem[]> => r.status === "fulfilled").map((r) => r.value);
  const umpan = [...(googleOk.length ? ["Google Berita"] : []), ...(antara ? ["ANTARA"] : []), ...(gdacs ? ["GDACS"] : [])];
  if (!googleOk.length && !antara) return { ...dasar, tersedia: false, daftar: [], resmi: gdacs ?? [], umpan };
  return { ...dasar, tersedia: true, daftar: gabungBerita([...(antara ? [antara] : []), ...googleOk]), resmi: gdacs ?? [], umpan };
}
