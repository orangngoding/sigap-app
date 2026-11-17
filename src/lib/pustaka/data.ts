import indeks from "@/generated/pustaka-index.json";

export interface ButirArtikel {
  id: string;
  judul: string;
  isi: string;
  darurat: boolean;
  /** Ada bila butir diturunkan dari panduan bahaya lain; wajib ditampilkan. */
  turunan?: string;
}
export type KategoriArtikel = "Bencana" | "Iklim" | "Keluarga" | "Komunitas";
export const KATEGORI_ARTIKEL: KategoriArtikel[] = ["Bencana", "Iklim", "Keluarga", "Komunitas"];
export interface Artikel {
  slug: string;
  title: string;
  ringkasan: string;
  hazards: string[];
  kategori: KategoriArtikel;
  intro: string;
  menit: number;
  bagian: Array<{ judul: string; butir: ButirArtikel[] }>;
  sumber: Array<{ judul: string; url: string }>;
}

/** Artikel Pustaka hasil `npm run build:content`; isinya disusun dari potongan KB terverifikasi. */
export const SEMUA_ARTIKEL = indeks as Artikel[];
export const ARTIKEL_BY_SLUG: Record<string, Artikel> = Object.fromEntries(SEMUA_ARTIKEL.map((a) => [a.slug, a]));
export const ARTIKEL_RINGKAS = SEMUA_ARTIKEL.map((a) => ({ slug: a.slug, hazards: a.hazards }));

/** Artikel terkait (Blueprint 8.4): bahaya yang sama dulu, lalu kategori yang sama; maksimal `n`. */
export function artikelTerkait(a: Artikel, n = 3): Artikel[] {
  const skor = (b: Artikel) => (b.hazards.some((h) => h !== "umum" && a.hazards.includes(h)) ? 2 : 0) + (b.kategori === a.kategori ? 1 : 0);
  return SEMUA_ARTIKEL.filter((b) => b.slug !== a.slug)
    .map((b, i) => ({ b, s: skor(b), i }))
    .sort((x, y) => y.s - x.s || x.i - y.i)
    .slice(0, n)
    .map((x) => x.b);
}
