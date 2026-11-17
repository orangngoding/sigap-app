import type { HazardId } from "@/types";
import packStatus from "@/generated/pack-status.json";

export type HazardStatus = "aktif" | "segera";

/**
 * Status hazard pack (Blueprint 2.4 dan 18.2), diturunkan dari jumlah potongan KB hasil
 * `npm run build:content`: "aktif" bila jumlah potongan memenuhi minimum. Gerbang peninjau
 * (dua peninjau per potongan) dijaga terpisah oleh `npm run validate:content:strict` di CI rilis.
 */
const JUMLAH = packStatus as Record<string, { jumlah: number; minimum: number }>;

export const HAZARD_STATUS = Object.fromEntries(
  (["banjir", "longsor", "gempa", "cuaca_ekstrem", "tsunami", "kekeringan", "karhutla", "gunung_api", "gelombang_abrasi"] as const).map((id) => {
    const p = JUMLAH[id];
    return [id, p && p.jumlah >= p.minimum ? "aktif" : "segera"];
  }),
) as Record<HazardId, HazardStatus>;

export const isHazardAktif = (id: HazardId): boolean => HAZARD_STATUS[id] === "aktif";

export const HAZARD_DESKRIPSI: Record<HazardId, string> = {
  banjir: "Genangan atau luapan air yang merendam rumah dan jalan.",
  longsor: "Tanah atau batuan bergerak turun di lereng dan menimpa permukiman.",
  gempa: "Guncangan tanah yang dapat merusak bangunan dan disusul gempa susulan.",
  cuaca_ekstrem: "Hujan lebat, angin kencang, puting beliung, dan petir.",
  tsunami: "Gelombang laut besar akibat gempa di pesisir.",
  kekeringan: "Kesulitan air bersih saat kemarau panjang.",
  karhutla: "Kebakaran lahan atau hutan dan kabut asap yang menyertainya.",
  gunung_api: "Awan panas, lahar, dan abu vulkanik dari gunung api aktif.",
  gelombang_abrasi: "Gelombang tinggi, banjir rob, dan pengikisan pantai.",
};
