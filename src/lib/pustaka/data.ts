import indeks from "@/generated/pustaka-index.json";

export interface ButirArtikel {
  id: string;
  judul: string;
  isi: string;
  darurat: boolean;
}
export interface Artikel {
  slug: string;
  title: string;
  ringkasan: string;
  hazards: string[];
  intro: string;
  menit: number;
  bagian: Array<{ judul: string; butir: ButirArtikel[] }>;
  sumber: Array<{ judul: string; url: string }>;
}

/** Artikel Pustaka hasil `npm run build:content`; isinya disusun dari potongan KB terverifikasi. */
export const SEMUA_ARTIKEL = indeks as Artikel[];
export const ARTIKEL_BY_SLUG: Record<string, Artikel> = Object.fromEntries(SEMUA_ARTIKEL.map((a) => [a.slug, a]));
export const ARTIKEL_RINGKAS = SEMUA_ARTIKEL.map((a) => ({ slug: a.slug, hazards: a.hazards }));
