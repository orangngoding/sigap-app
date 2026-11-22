import type { HazardId } from "@/types";
import { FOTO, type Foto, type KunciFoto } from "./foto";

export { FOTO, SEMUA_FOTO, type Foto, type KunciFoto } from "./foto";

/** Foto utama per bahaya (kartu bahaya, Pustaka, Latihan). "umum" memakai lanskap Indonesia. */
export const FOTO_BAHAYA: Record<HazardId | "umum", KunciFoto> = {
  banjir: "banjir",
  longsor: "longsor",
  gempa: "gempa",
  cuaca_ekstrem: "cuaca_ekstrem",
  tsunami: "tsunami_gelombang",
  kekeringan: "kekeringan",
  karhutla: "karhutla",
  gunung_api: "gunung_api",
  gelombang_abrasi: "gelombang_abrasi",
  umum: "lanskap",
};

/** Foto sampul artikel Pustaka; artikel umum punya foto sendiri yang sesuai isinya. */
const FOTO_ARTIKEL: Record<string, KunciFoto> = {
  "tas-siaga-keluarga": "tas_siaga",
  "melindungi-anggota-keluarga-rentan": "bantuan",
  "tsunami-dan-evakuasi-ke-tempat-tinggi": "tsunami",
};

export function fotoBahaya(h: string): Foto {
  return FOTO[FOTO_BAHAYA[h as HazardId] ?? "lanskap"];
}

export function fotoArtikel(slug: string, hazards: string[]): Foto {
  const k = FOTO_ARTIKEL[slug];
  return k ? FOTO[k] : fotoBahaya(hazards.find((h) => h !== "umum") ?? "umum");
}
