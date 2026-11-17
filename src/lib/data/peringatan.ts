// Peringatan dini cuaca BMKG (Blueprint 15.2): daftar RSS -> berkas CAP XML per peringatan.
// Struktur nyata belum terverifikasi, jadi pengurai ini sengaja toleran dan setiap kegagalan berujung
// pada `tersedia: false` (UI mengarahkan ke kanal resmi), TIDAK PERNAH pada klaim "tidak ada peringatan".
import type { PeringatanItem, PeringatanResponse } from "@/types";
import { fetchUpstreamText } from "@/lib/http/fetch-upstream";

export const URL_RSS = "https://www.bmkg.go.id/alerts/nowcast/id";
export const URL_RESMI = "https://www.bmkg.go.id/peringatan-dini";
const AWAL_CAP = "https://www.bmkg.go.id/alerts/nowcast/";
const MAKS_DETAIL = 5;

// ---------- Pengurai XML minimal ----------
const ENTITAS: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'", "&#39;": "'" };
const bukaEntitas = (s: string) => s.replace(/&(?:amp|lt|gt|quot|apos|#39);/g, (m) => ENTITAS[m] ?? m);

/** Teks aman: buka CDATA, buang tag, urai entitas, buang tag yang muncul dari entitas, rapikan spasi. Dirender sebagai teks biasa. */
export function bersihXml(s: string): string {
  const tanpaTag = (x: string) => x.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]*>/g, " ");
  return tanpaTag(bukaEntitas(tanpaTag(s))).replace(/\s+/g, " ").trim();
}

export function ambilTag(xml: string, tag: string): string | null {
  const m = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i"));
  return m ? bersihXml(m[1]) : null;
}

const semuaBlok = (xml: string, tag: string): string[] =>
  [...xml.matchAll(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "gi"))].map((m) => m[1]);

// ---------- RSS ----------
export interface ItemRss {
  id: string;
  judul: string;
  link: string;
  tanggal: string | null;
  deskripsi: string;
}

export function uraiRss(xml: string): ItemRss[] {
  return semuaBlok(xml, "item").map((b) => {
    const link = ambilTag(b, "link") ?? "";
    return {
      id: ambilTag(b, "guid") ?? link,
      judul: ambilTag(b, "title") ?? "",
      link,
      tanggal: ambilTag(b, "pubDate"),
      deskripsi: ambilTag(b, "description") ?? "",
    };
  });
}

const normal = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
/** "DKI Jakarta" -> "jakarta", "Provinsi Jawa Barat" -> "jawa barat": kecocokan nama provinsi yang longgar. */
const inti = (provinsi: string) => normal(provinsi).replace(/^(provinsi|dki|di|daerah khusus ibukota|daerah istimewa)\s+/, "");

export function cocokProvinsi(i: ItemRss, provinsi: string): boolean {
  const p = inti(provinsi);
  return p.length > 2 && normal(`${i.judul} ${i.deskripsi}`).includes(p);
}

// ---------- CAP ----------
export interface InfoCap {
  headline: string | null;
  event: string | null;
  sent: string | null;
  effective: string | null;
  expires: string | null;
  deskripsi: string | null;
  wilayah: string | null;
  web: string | null;
}

export function uraiCap(xml: string): InfoCap | null {
  const infos = semuaBlok(xml, "info");
  // Utamakan blok berbahasa Indonesia; bila tidak ada, pakai blok pertama.
  const info = infos.find((b) => /<language>\s*id/i.test(b)) ?? infos[0];
  if (!info) return null;
  return {
    headline: ambilTag(info, "headline"),
    event: ambilTag(info, "event"),
    sent: ambilTag(xml.replace(/<info[\s\S]*<\/info>/gi, ""), "sent"),
    effective: ambilTag(info, "effective"),
    expires: ambilTag(info, "expires"),
    deskripsi: ambilTag(info, "description"),
    wilayah: semuaBlok(info, "areaDesc").map(bersihXml).join("; ") || null,
    web: ambilTag(info, "web"),
  };
}

const waktu = (s: string | null): number | null => {
  if (!s) return null;
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : t;
};
const iso = (s: string | null): string | null => {
  const t = waktu(s);
  return t === null ? null : new Date(t).toISOString();
};
const potong = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
const urlAman = (u: string | null | undefined, fallback: string) => (u && /^https:\/\//i.test(u) ? u : fallback);

export interface LokasiCocok {
  provinsi: string;
  kabKota?: string;
  kecamatan?: string;
}

/** "lokasi" hanya bila nama kecamatan atau kab/kota pengguna benar-benar disebut; selain itu tingkat provinsi. */
export function cakupanUntuk(teks: string, l: LokasiCocok): PeringatanItem["cakupan"] {
  const t = normal(teks);
  const nama = (s?: string) => (s ? normal(s).replace(/^(kota administrasi|kabupaten administrasi|kota|kabupaten|kab|kec|kecamatan)\s+/, "") : "");
  const kec = nama(l.kecamatan);
  const kab = nama(l.kabKota);
  return (kec.length > 2 && t.includes(kec)) || (kab.length > 2 && t.includes(kab)) ? "lokasi" : "provinsi";
}

export function gabungkan(rss: ItemRss, cap: InfoCap | null, lokasi: LokasiCocok): PeringatanItem {
  const teks = cap?.deskripsi ?? rss.deskripsi;
  const wilayah = cap?.wilayah ?? rss.judul;
  return {
    id: rss.id || rss.link,
    judul: potong(cap?.headline ?? cap?.event ?? (rss.judul || "Peringatan dini cuaca"), 160),
    waktuTerbit: iso(cap?.effective ?? cap?.sent ?? rss.tanggal),
    berlakuSampai: iso(cap?.expires ?? null),
    wilayah: potong(wilayah, 300),
    ringkasan: potong(teks, 220),
    teks: potong(teks, 2000),
    url: urlAman(cap?.web ?? rss.link, URL_RESMI),
    cakupan: cakupanUntuk(`${wilayah} ${teks}`, lokasi),
  };
}

/** Ambil peringatan aktif untuk provinsi pengguna. Tidak melempar: kegagalan = tersedia:false. */
export async function fetchPeringatan(lokasi: LokasiCocok, sekarang = new Date()): Promise<PeringatanResponse> {
  const dasar = { sumber: { nama: "BMKG", url: URL_RESMI, diambilPada: sekarang.toISOString() }, stale: false, tautanResmi: URL_RESMI };
  try {
    const rssXml = await fetchUpstreamText(URL_RSS, { revalidateSeconds: 120 });
    const item = uraiRss(rssXml);
    if (item.length === 0 && !/<rss|<feed|<channel/i.test(rssXml)) throw new Error("bukan umpan RSS");

    const cocok = item.filter((i) => cocokProvinsi(i, lokasi.provinsi)).slice(0, MAKS_DETAIL);
    const detail = await Promise.all(
      cocok.map(async (i) => {
        // Hanya berkas CAP di host dan jalur BMKG yang diizinkan diambil (cegah SSRF dari isi umpan).
        if (!i.link.startsWith(AWAL_CAP) || !i.link.endsWith(".xml")) return null;
        try {
          return uraiCap(await fetchUpstreamText(i.link, { revalidateSeconds: 120 }));
        } catch {
          return null;
        }
      }),
    );
    const daftar = cocok
      .map((i, k) => ({ i, cap: detail[k] }))
      .filter(({ cap }) => {
        const habis = waktu(cap?.expires ?? null);
        return habis === null || habis > sekarang.getTime(); // buang peringatan yang sudah lewat
      })
      .map(({ i, cap }) => gabungkan(i, cap, lokasi))
      // peringatan yang menyebut lokasi pengguna lebih dulu
      .sort((a, b) => Number(b.cakupan === "lokasi") - Number(a.cakupan === "lokasi"));
    return { ...dasar, tersedia: true, daftar };
  } catch {
    return { ...dasar, tersedia: false, daftar: [] };
  }
}
