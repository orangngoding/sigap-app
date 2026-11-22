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
const MAKS_CUACA = 40;
const MAKS_SUMBER_SAMA = 6;
const KATA_SEPELE = new Set(["yang", "dan", "di", "ke", "dari", "pada", "untuk", "dengan", "ini", "itu", "hari", "akan", "hingga", "sampai", "dalam", "jadi", "usai", "saat", "kembali", "terjadi", "warga", "lebih", "meter", "ratusan", "berita", "terkini", "video", "breaking", "news", "waspada"]);
/** Kata inti judul (untuk mengenali berita yang sama dengan kalimat berbeda). */
const SINONIM: Record<string, string> = { meletus: "erupsi", letusan: "erupsi", erupsinya: "erupsi", mengguncang: "guncang", diguncang: "guncang", sumbar: "sumatera", jaksel: "jakarta", pajeten: "pejaten" };
export const kataInti = (judul: string) => new Set(normal(judul).split(" ").map((w) => SINONIM[w] ?? w).filter((w) => w.length > 2 && !KATA_SEPELE.has(w)));
/** Dua judul dianggap kejadian yang sama bila sebagian besar kata inti yang lebih pendek ada di yang lain. */
export function mirip(a: Set<string>, b: Set<string>): boolean {
  const [kecil, besar] = a.size <= b.size ? [a, b] : [b, a];
  if (kecil.size < 3) return false;
  let sama = 0;
  for (const w of kecil) if (besar.has(w)) sama++;
  return sama >= 3 && sama / kecil.size >= 0.5;
} // cegah satu media memenuhi daftar

/** Pencarian Google Berita per kelompok bencana (7 hari terakhir). */
export const PENCARIAN: Array<{ id: string; q: string }> = [
  { id: "banjir", q: '(banjir OR "banjir bandang" OR "banjir rob") (BPBD OR warga OR rumah OR terendam)' },
  { id: "gempa", q: '("gempa bumi" OR gempa OR tsunami) (BMKG OR magnitudo OR guncangan)' },
  { id: "longsor", q: "(longsor OR \"tanah longsor\" OR \"pergerakan tanah\")" },
  { id: "gunung", q: '(erupsi OR "gunung api" OR "awan panas" OR "abu vulkanik" OR PVMBG)' },
  { id: "cuaca", q: '("puting beliung" OR "angin kencang" OR "cuaca ekstrem" OR "hujan lebat" OR "gelombang tinggi" OR siklon)' },
  { id: "karhutla", q: '(karhutla OR "kebakaran hutan" OR "kebakaran lahan" OR "titik panas" OR kekeringan OR "krisis air")' },
  { id: "lembaga", q: "(BNPB OR BPBD OR Basarnas) (bencana OR siaga OR evakuasi OR pengungsi)" },
  // Cuaca dan iklim (Siaga Iklim): prakiraan dan peringatan BMKG, musim, El Niño/La Niña, panas, kualitas udara.
  { id: "cuaca-bmkg", q: '("prakiraan cuaca" OR "peringatan dini cuaca" OR "potensi hujan" OR "cuaca hari ini") BMKG' },
  { id: "iklim", q: '("El Nino" OR "La Nina" OR "musim hujan" OR "musim kemarau" OR "suhu panas" OR "gelombang panas" OR "perubahan iklim" OR "kualitas udara") (BMKG OR Indonesia OR warga)' },
];
export const urlPencarian = (q: string) => `https://news.google.com/rss/search?q=${encodeURIComponent(`${q} when:7d`)}&hl=id&gl=ID&ceid=ID:id`;

const normal = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
const potong = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

// Pencarian kata kunci membawa banyak berita yang hanya kebetulan menyebut kata bencana (riset kampus, pupuk
// "anti kekeringan", kasus hukum, "robot" yang berawalan "rob", "iklim usaha", "banjir pujian"). Berita dipertahankan
// hanya bila judulnya memuat peristiwa/lembaga kebencanaan atau cuaca-iklim DAN tidak memuat topik/kiasan yang jelas
// bukan peristiwa alam. Pencocokan per awalan kata pada judul yang dinormalkan ("banjir" cocok dengan "banjirnya");
// kata yang diakhiri "=" harus utuh ("rob=" cocok dengan "rob", tidak dengan "robot").
const BAHAYA_KATA = [
  "banjir", "gempa", "longsor", "erupsi", "meletus", "gunung api", "tsunami", "puting beliung", "angin kencang",
  "karhutla", "kebakaran hutan", "kebakaran lahan", "kekeringan", "cuaca ekstrem", "hujan lebat", "siklon", "abrasi",
  "bencana", "darurat", "siaga", "evakuasi", "pengungsi", "korban", "bnpb", "bpbd", "bmkg", "basarnas", "magnitudo",
  "gelombang tinggi", "awan panas", "abu vulkanik", "rob=", "titik panas", "krisis air", "hujan deras", "petir",
];
/** Cuaca dan iklim: hanya frasa yang jelas tentang atmosfer, bukan "iklim usaha" atau "musim mudik". */
const KATA_IKLIM = [
  "cuaca", "prakiraan cuaca", "curah hujan", "potensi hujan", "berpotensi hujan", "diguyur hujan", "hujan ringan",
  "hujan sedang", "hujan ekstrem", "hujan petir", "perubahan iklim", "krisis iklim", "anomali iklim", "iklim ekstrem", "adaptasi iklim",
  "pemanasan global", "el nino", "la nina", "musim hujan", "musim kemarau", "pancaroba", "peralihan musim",
  "suhu udara", "suhu panas", "suhu tinggi", "suhu maksimum", "suhu ekstrem", "cuaca panas", "gelombang panas",
  "panas ekstrem", "kualitas udara", "polusi udara", "ispu=", "bmkg",
];
const TOPIK_BENCANA = [...BAHAYA_KATA, ...KATA_IKLIM];
const BUKAN_PERISTIWA = [
  "riset", "penelitian", "peneliti", "ekspedisi", "buku", "puisi", "novel", "mahasiswa", "dosen", "kampus", "universitas", "skripsi", "wisuda", "beasiswa", "seminar", "webinar", "lomba", "juara",
  "pupuk", "maggot", "inovasi", "kembangkan", "startup", "saham", "harga", "promo", "wisata", "resep", "mitos",
  "korupsi", "tersangka", "diperiksa", "kpk", "kejaksaan", "sidang", "pilkada", "partai", "sepak bola", "liga", "timnas",
  "robot", "humanoid", "kecerdasan buatan", "ponsel", "smartphone", "film", "sinetron", "drakor", "album", "game=", "gim=",
  // Pengungsian akibat konflik bersenjata bukan bencana alam.
  "israel", "gaza", "palestina", "ukraina", "rusia", "perang", "militer", "serangan", "rudal", "tentara",
  // Kiasan: kata bencana/cuaca dipakai untuk hal lain.
  "iklim usaha", "iklim investasi", "iklim bisnis", "iklim politik", "iklim demokrasi", "iklim kerja", "iklim ekonomi", "cuaca politik",
  "banjir pujian", "banjir kritik", "banjir hujatan", "banjir order", "banjir pesanan", "banjir diskon", "banjir promo", "banjir peminat",
  "banjir penonton", "banjir komentar", "banjir dukungan", "banjir ucapan", "banjir karangan", "banjir air mata", "banjir investor",
  "hujan gol", "hujan kritik", "hujan pujian", "hujan hadiah", "hujan bonus", "hujan diskon", "hujan uang", "hujan kartu", "hujan meteor",
  "gempa politik", "tsunami informasi", "tsunami pengunduran", "tsunami phk", "badai phk", "ban meletus", "balon meletus",
  // Kejadian di luar negeri: SIGAP untuk keluarga di Indonesia (peringatan internasional sudah ada lewat GDACS).
  "brasil", "brazil", "peru=", "chile", "meksiko", "amerika", "as=", "kanada", "alaska", "hawaii", "china", "tiongkok", "qinghai",
  "jepang", "korea", "taiwan", "filipina", "vietnam", "thailand", "myanmar", "india", "pakistan", "bangladesh", "nepal",
  "afghanistan", "iran", "turki", "italia", "spanyol", "prancis", "jerman", "inggris", "eropa", "australia", "selandia baru",
];
const cocok = (teks: string, k: string) => (k.endsWith("=") ? ` ${teks} `.includes(` ${k.slice(0, -1)} `) : ` ${teks}`.includes(` ${k}`));
const memuat = (teks: string, kata: string[]) => kata.some((k) => cocok(teks, k));

/** True bila judul berita tampak melaporkan peristiwa, kesiapsiagaan bencana, atau cuaca-iklim. */
export function relevan(judul: string): boolean {
  const t = normal(judul);
  return memuat(t, TOPIK_BENCANA) && !memuat(t, BUKAN_PERISTIWA);
}

/** Jenis bencana dari judul (urutan penting: yang lebih spesifik dulu). */
const JENIS: Array<[HazardId, string[]]> = [
  ["tsunami", ["tsunami"]],
  ["gunung_api", ["erupsi", "meletus", "gunung api", "awan panas", "abu vulkanik", "pvmbg", "lava=", "lahar", "pos pga", "pga=", "gempa embusan", "gempa vulkanik", "gempa letusan"]],
  ["gempa", ["gempa", "magnitudo", "guncangan gempa"]],
  ["karhutla", ["karhutla", "kebakaran hutan", "kebakaran lahan", "titik panas", "titik api", "kabut asap"]],
  ["kekeringan", ["kekeringan", "kemarau", "krisis air", "kesulitan air bersih"]],
  ["longsor", ["longsor", "pergerakan tanah", "tanah bergerak"]],
  ["gelombang_abrasi", ["gelombang tinggi", "abrasi", "rob="]],
  ["banjir", ["banjir", "genangan", "terendam", "luapan sungai", "luapan air"]],
  ["cuaca_ekstrem", ["puting beliung", "angin kencang", "cuaca ekstrem", "hujan lebat", "hujan deras", "siklon", "petir", "hujan es"]],
];
/** Berita cuaca dan iklim yang bukan bahaya spesifik (dicek sesudah 9 bahaya, jadi "hujan lebat" tetap cuaca ekstrem). */
export function jenisBerita(judul: string): HazardId | "umum" | "iklim" {
  const t = normal(judul);
  for (const [j, kata] of JENIS) if (memuat(t, kata)) return j;
  if (memuat(t, KATA_IKLIM)) return "iklim";
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

/** Domain situs media (tanpa "www.") dari URL http(s), untuk ikon medianya; null bila tidak valid. */
export function domainSitus(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.trim());
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    return u.hostname.replace(/^www\./, "").toLowerCase() || null;
  } catch {
    return null;
  }
}

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
    const situs = domainSitus(atribut(b, "source", "url"));
    hasil.push({ id: ambilTag(b, "guid") ?? link, judul: potong(judul, 180), sumber: potong(sumber, 60), waktu: new Date(t).toISOString(), url: link, jenis: jenisBerita(judul), ...(situs ? { situs } : {}) });
  }
  return hasil;
}

/** Umpan RSS media yang menyertakan foto. Tautan dan foto hanya diterima dari domain penerbitnya sendiri (https). */
export interface UmpanMedia {
  nama: string;
  url: string;
  tautan: RegExp;
  gambar: RegExp;
}
export const UMPAN_MEDIA: UmpanMedia[] = [
  { nama: "ANTARA", url: URL_ANTARA, tautan: /^https:\/\/(www\.)?antaranews\.com\//, gambar: /^https:\/\/img\.antaranews\.com\// },
  { nama: "Tempo", url: "https://rss.tempo.co/nasional", tautan: /^https:\/\/([a-z]+\.)?tempo\.co\//, gambar: /^https:\/\/statik\.tempo\.co\// },
  { nama: "Okezone", url: "https://sindikasi.okezone.com/index.php/rss/1/RSS2.0", tautan: /^https:\/\/([a-z]+\.)?okezone\.com\//, gambar: /^https:\/\/img\.okezone\.com\// },
  { nama: "JPNN", url: "https://www.jpnn.com/index.php?mib=rss", tautan: /^https:\/\/([a-z]+\.)?jpnn\.com\//, gambar: /^https:\/\/cloud\.jpnn\.com\// },
  { nama: "VIVA", url: "https://www.viva.co.id/get/all", tautan: /^https:\/\/([a-z]+\.)?viva\.co\.id\//, gambar: /^https:\/\/thumb\.viva\.co\.id\// },
  { nama: "iNews", url: "https://www.inews.id/feed", tautan: /^https:\/\/([a-z]+\.)?inews\.id\//, gambar: /^https:\/\/img\.inews\.id\// },
  { nama: "iNews", url: "https://www.inews.id/feed/news", tautan: /^https:\/\/([a-z]+\.)?inews\.id\//, gambar: /^https:\/\/img\.inews\.id\// },
  { nama: "ANTARA", url: "https://www.antaranews.com/rss/humaniora", tautan: /^https:\/\/(www\.)?antaranews\.com\//, gambar: /^https:\/\/img\.antaranews\.com\// },
  { nama: "Okezone", url: "https://sindikasi.okezone.com/index.php/rss/337/RSS2.0", tautan: /^https:\/\/([a-z]+\.)?okezone\.com\//, gambar: /^https:\/\/img\.okezone\.com\// },
  { nama: "detikcom", url: "https://news.detik.com/berita/rss", tautan: /^https:\/\/([a-z]+\.)?detik\.com\//, gambar: /^https:\/\/akcdn\.detik\.net\.id\// },
  { nama: "Liputan6", url: "https://feed.liputan6.com/rss/news", tautan: /^https:\/\/(www\.)?liputan6\.com\//, gambar: /^https:\/\/cdn[0-9]*-production-images-kly\.akamaized\.net\// },
  { nama: "SINDOnews", url: "https://nasional.sindonews.com/rss", tautan: /^https:\/\/([a-z]+\.)?sindonews\.com\//, gambar: /^https:\/\/pict\.sindonews\.com\// },
  { nama: "kumparan", url: "https://lapi.kumparan.com/v2.0/rss/", tautan: /^https:\/\/kumparan\.com\//, gambar: /^https:\/\/blue\.kumparan\.com\// },
];

const pulihkan = (s: string) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");

/** Foto item RSS dari bentuk yang lazim: enclosure, media:content/thumbnail, elemen <img>URL</img>, atau <img src> di deskripsi. */
export function gambarItem(blok: string): string | null {
  const b = pulihkan(blok);
  const kandidat =
    atribut(b, "enclosure", "url") ??
    atribut(b, "media:content", "url") ??
    atribut(b, "media:thumbnail", "url") ??
    b.match(/<img>\s*(https:\/\/[^<\s]+)\s*<\/img>/i)?.[1] ??
    b.match(/<img\s[^>]*src="(https:\/\/[^"]+)"/i)?.[1] ??
    null;
  return kandidat ? pulihkan(kandidat).trim() : null;
}

/** Item relevan dari satu umpan media, dengan foto bila ada dan berasal dari domain penerbit. */
export function uraiMedia(xml: string, u: Pick<UmpanMedia, "nama" | "tautan" | "gambar">, sekarang = new Date()): BeritaItem[] {
  const batas = sekarang.getTime() + 60 * 60_000;
  const hasil: BeritaItem[] = [];
  for (const b of blokItem(xml)) {
    const link = (ambilTag(b, "link") ?? "").trim();
    if (!u.tautan.test(link)) continue;
    const judul = rapikanJudul((ambilTag(b, "title") ?? "").trim());
    if (judul.length < 8 || !relevan(judul)) continue;
    const t = Date.parse(ambilTag(b, "pubDate") ?? "");
    if (Number.isNaN(t) || t > batas) continue;
    const gambar = gambarItem(b);
    const situs = domainSitus(link);
    hasil.push({
      id: ambilTag(b, "guid") ?? link, judul: potong(judul, 180), sumber: u.nama, waktu: new Date(t).toISOString(), url: link, jenis: jenisBerita(judul),
      ...(gambar && u.gambar.test(gambar) ? { gambar } : {}),
      ...(situs ? { situs } : {}),
    });
  }
  return hasil;
}

/** Item ANTARA yang relevan, dengan foto bila ada (hanya https dari domain antaranews.com). */
export const uraiAntara = (xml: string, sekarang = new Date()) => uraiMedia(xml, UMPAN_MEDIA[0], sekarang);

const JENIS_GDACS: Record<string, PeringatanGlobal["jenis"]> = { EQ: "gempa", FL: "banjir", DR: "kekeringan", TC: "siklon", VO: "gunung_api", WF: "kebakaran", TS: "tsunami" };
const LEVEL_GDACS: Record<string, PeringatanGlobal["level"]> = { green: "hijau", orange: "oranye", red: "merah" };
const NAMA_JENIS: Record<PeringatanGlobal["jenis"], string> = { gempa: "Gempa", banjir: "Banjir", kekeringan: "Kekeringan", siklon: "Siklon tropis", gunung_api: "Erupsi gunung api", kebakaran: "Kebakaran hutan", tsunami: "Tsunami", lainnya: "Kejadian" };

/** Terjemahan kode untuk judul GDACS berformat tetap; bila formatnya tak dikenal, pakai nama jenis saja. */
export function judulGdacs(judulEn: string, jenis: PeringatanGlobal["jenis"]): string {
  const m = judulEn.match(/Magnitude\s+([\d.]+)M,\s*Depth:\s*([\d.]+)\s*km/i);
  if (jenis === "gempa" && m) return `Gempa M${m[1].replace(".", ",")} (kedalaman ${Math.round(Number(m[2]))} km) di Indonesia`;
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

/**
 * Gabungkan, buang judul kembar (juga yang nyaris sama), batasi per media, urutkan terbaru dulu.
 * Saat memilih, berita berfoto didahulukan (agar daftar tidak didominasi judul tanpa foto dari Google Berita, dan
 * bila ada judul kembar yang dipakai adalah versi berfoto); hasil akhirnya tetap diurutkan menurut waktu.
 */
export function gabungBerita(kelompok: BeritaItem[][]): BeritaItem[] {
  const waktu = (a: BeritaItem, c: BeritaItem) => Date.parse(c.waktu) - Date.parse(a.waktu);
  const semua = kelompok.flat().sort((a, c) => Number(Boolean(c.gambar)) - Number(Boolean(a.gambar)) || waktu(a, c));
  const lihat = new Set<string>();
  const perSumber = new Map<string, number>();
  const hasil: BeritaItem[] = [];
  const perKunci = new Map<string, BeritaItem>();
  const inti: Array<[Set<string>, BeritaItem]> = [];
  for (const b of semua) {
    const kunci = normal(b.judul).slice(0, 70);
    const kata = kataInti(b.judul);
    // Judul sama persis, atau kejadian sama dengan kalimat berbeda ("Semeru dan Ibu erupsi..." dari 10 media).
    const ada = lihat.has(kunci) ? perKunci.get(kunci) : inti.find(([k, x]) => x.jenis === b.jenis && mirip(k, kata))?.[1];
    if (ada) {
      // Berita kembar dari umpan lain kadang membawa foto: pinjam fotonya untuk item yang sudah tampil.
      if (!ada.gambar && b.gambar) ada.gambar = b.gambar;
      continue;
    }
    const n = perSumber.get(b.sumber) ?? 0;
    if (n >= MAKS_SUMBER_SAMA) continue;
    lihat.add(kunci);
    perSumber.set(b.sumber, n + 1);
    const salin = { ...b };
    perKunci.set(kunci, salin);
    inti.push([kata, salin]);
    hasil.push(salin);
    if (hasil.length >= MAKS) break;
  }
  return hasil.sort(waktu);
}

/** Tidak melempar: tiap umpan boleh gagal sendiri; bila semua umpan berita gagal, tersedia:false. */
export async function fetchBerita(sekarang = new Date()): Promise<BeritaResponse> {
  const dasar = { sumber: { nama: "Google Berita, media nasional, dan GDACS", url: URL_SUMBER, diambilPada: sekarang.toISOString() }, stale: false };
  const rss = async (url: string) => {
    const xml = await fetchUpstreamText(url, { revalidateSeconds: 600, timeoutMs: 7_000, percobaan: 1 });
    if (!/<rss|<channel/i.test(xml)) throw new Error("bukan umpan RSS");
    return xml;
  };
  const [google, media, gdacs] = await Promise.all([
    Promise.allSettled(PENCARIAN.map((p) => rss(urlPencarian(p.q)).then((x) => uraiBerita(x, sekarang)))),
    Promise.all(UMPAN_MEDIA.map((u) => rss(u.url).then((x) => ({ nama: u.nama, isi: uraiMedia(x, u, sekarang) })).catch(() => null))),
    rss(URL_GDACS).then((x) => uraiGdacs(x, sekarang)).catch(() => null),
  ]);
  const googleOk = google.filter((r): r is PromiseFulfilledResult<BeritaItem[]> => r.status === "fulfilled").map((r) => r.value);
  const mediaOk = media.filter((m): m is { nama: string; isi: BeritaItem[] } => m !== null);
  const umpan = [...new Set([...(googleOk.length ? ["Google Berita"] : []), ...mediaOk.map((m) => m.nama), ...(gdacs ? ["GDACS"] : [])])];
  if (!googleOk.length && !mediaOk.length) return { ...dasar, tersedia: false, daftar: [], cuaca: [], resmi: gdacs ?? [], umpan };
  // Judul kembar antarumpan digabung; foto dari umpan media dipinjam bila versi yang tampil tidak berfoto.
  // Dua daftar terpisah, masing-masing dengan jatahnya sendiri:
  //  - daftar (Berita bencana): hanya yang jelas menyangkut salah satu dari 9 jenis bencana. Berita "umum" (lolos kata
  //    kunci seperti "korban" atau "siaga" tapi bukan peristiwa bencana alam) tidak ditampilkan.
  //  - cuaca (Berita cuaca & iklim, Siaga Iklim): prakiraan dan peringatan BMKG, musim, El Niño/La Niña, panas, udara,
  //    ditambah cuaca ekstrem.
  const semua = [...mediaOk.map((m) => m.isi), ...googleOk];
  const ambil = (cocok: (j: BeritaItem["jenis"]) => boolean) => semua.map((d) => d.filter((b) => cocok(b.jenis)));
  const daftar = gabungBerita(ambil((j) => !!j && j !== "umum" && j !== "iklim"));
  const cuaca = gabungBerita(ambil((j) => j === "iklim" || j === "cuaca_ekstrem")).slice(0, MAKS_CUACA);
  return { ...dasar, tersedia: true, daftar, cuaca, resmi: gdacs ?? [], umpan };
}
