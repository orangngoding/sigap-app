// Berita bencana terkini untuk halaman Pustaka. Sumber: umpan RSS Google Berita (pencarian kata kunci bencana),
// yang menghimpun judul dari media Indonesia. Kami hanya menampilkan judul, nama media, waktu, dan tautan keluar;
// isi berita tidak disalin. Kegagalan apa pun berujung `tersedia: false`, tidak pernah daftar kosong yang menyesatkan.
import type { BeritaItem, BeritaResponse } from "@/types";
import { fetchUpstreamText } from "@/lib/http/fetch-upstream";
import { ambilTag } from "./peringatan";

const KATA_KUNCI = '(BNPB OR BMKG OR banjir OR "gempa bumi" OR longsor OR erupsi OR tsunami OR "puting beliung" OR "kebakaran hutan" OR kekeringan OR "cuaca ekstrem") when:3d';
export const URL_UMPAN = `https://news.google.com/rss/search?q=${encodeURIComponent(KATA_KUNCI)}&hl=id&gl=ID&ceid=ID:id`;
export const URL_SUMBER = "https://news.google.com/home?hl=id&gl=ID&ceid=ID:id";
const AWAL_TAUTAN = "https://news.google.com/";
const MAKS = 12;
const MAKS_SUMBER_SAMA = 3; // cegah satu media memenuhi daftar

const normal = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
const potong = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

// Pencarian kata kunci membawa banyak berita yang hanya kebetulan menyebut kata bencana (riset kampus, pupuk
// "anti kekeringan", kasus hukum). Berita dipertahankan hanya bila judulnya memuat peristiwa/lembaga kebencanaan
// DAN tidak memuat topik yang jelas bukan peristiwa bencana. Pencocokan per awalan kata pada judul yang dinormalkan.
const TOPIK_BENCANA = [
  "banjir", "gempa", "longsor", "erupsi", "meletus", "gunung api", "tsunami", "puting beliung", "angin kencang",
  "karhutla", "kebakaran hutan", "kebakaran lahan", "kekeringan", "cuaca ekstrem", "hujan lebat", "siklon", "abrasi",
  "bencana", "darurat", "siaga", "evakuasi", "pengungsi", "korban", "bnpb", "bpbd", "bmkg", "basarnas", "magnitudo",
];
const BUKAN_PERISTIWA = [
  "riset", "penelitian", "mahasiswa", "dosen", "kampus", "universitas", "skripsi", "wisuda", "beasiswa", "seminar", "webinar", "lomba", "juara",
  "pupuk", "maggot", "inovasi", "kembangkan", "startup", "saham", "harga", "promo", "wisata", "resep",
  "korupsi", "tersangka", "diperiksa", "kpk", "kejaksaan", "sidang", "pilkada", "partai",
];
const memuat = (teks: string, kata: string[]) => kata.some((k) => ` ${teks}`.includes(` ${k}`));

/** True bila judul berita tampak melaporkan peristiwa atau kesiapsiagaan bencana. */
export function relevan(judul: string): boolean {
  const t = normal(judul);
  return memuat(t, TOPIK_BENCANA) && !memuat(t, BUKAN_PERISTIWA);
}

/** Judul Google Berita berbentuk "<Judul> - <Media>"; buang akhiran media agar tidak dobel. */
export function pisahJudul(judul: string, sumber: string | null): { judul: string; sumber: string } {
  const akhiran = sumber ? ` - ${sumber}` : null;
  if (akhiran && judul.endsWith(akhiran)) return { judul: judul.slice(0, -akhiran.length).trim(), sumber: sumber as string };
  const idx = judul.lastIndexOf(" - ");
  if (!sumber && idx > 0) return { judul: judul.slice(0, idx).trim(), sumber: judul.slice(idx + 3).trim() };
  return { judul, sumber: sumber ?? "Media daring" };
}

export function uraiBerita(xml: string, sekarang = new Date()): BeritaItem[] {
  const blok = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map((m) => m[1]);
  const lihat = new Set<string>();
  const perSumber = new Map<string, number>();
  const batas = sekarang.getTime() + 60 * 60_000; // abaikan tanggal yang jauh di masa depan
  const hasil: BeritaItem[] = [];
  for (const b of blok) {
    const link = ambilTag(b, "link") ?? "";
    if (!link.startsWith(AWAL_TAUTAN)) continue; // hanya tautan https dari host umpan
    const mentah = ambilTag(b, "title") ?? "";
    const { judul, sumber } = pisahJudul(mentah, ambilTag(b, "source"));
    if (judul.length < 8 || !relevan(judul)) continue;
    const t = Date.parse(ambilTag(b, "pubDate") ?? "");
    if (Number.isNaN(t) || t > batas) continue;
    const kunci = normal(judul);
    if (lihat.has(kunci)) continue;
    const n = perSumber.get(sumber) ?? 0;
    if (n >= MAKS_SUMBER_SAMA) continue;
    lihat.add(kunci);
    perSumber.set(sumber, n + 1);
    hasil.push({ id: ambilTag(b, "guid") ?? link, judul: potong(judul, 180), sumber: potong(sumber, 60), waktu: new Date(t).toISOString(), url: link });
  }
  return hasil.sort((a, c) => Date.parse(c.waktu) - Date.parse(a.waktu)).slice(0, MAKS);
}

/** Tidak melempar: kegagalan = tersedia:false. */
export async function fetchBerita(sekarang = new Date()): Promise<BeritaResponse> {
  const dasar = { sumber: { nama: "Google Berita (media Indonesia)", url: URL_SUMBER, diambilPada: sekarang.toISOString() }, stale: false };
  try {
    const xml = await fetchUpstreamText(URL_UMPAN, { revalidateSeconds: 600 });
    if (!/<rss|<channel/i.test(xml)) throw new Error("bukan umpan RSS");
    return { ...dasar, tersedia: true, daftar: uraiBerita(xml, sekarang) };
  } catch {
    return { ...dasar, tersedia: false, daftar: [] };
  }
}
