import type { HazardId } from "@/types";

export type HazardLevel = "A" | "B" | "C";

export interface HazardMeta {
  id: HazardId;
  label: string;
  level: HazardLevel; // kedalaman konten (Blueprint 2.4)
  /** Nama token warna di globals.css, mis. text-hazard-flood */
  colorClass: string;
  bgClass: string;
}

// Status aktif/segera ditentukan dari hazard pack di content/hazards/ (Blueprint 18.2).
// Sampai pemuat hazard pack ada, daftar ini hanya metadata tampilan.
export const HAZARDS: HazardMeta[] = [
  { id: "banjir", label: "Banjir", level: "A", colorClass: "text-hazard-flood", bgClass: "bg-hazard-flood/10" },
  { id: "longsor", label: "Tanah Longsor", level: "A", colorClass: "text-hazard-landslide", bgClass: "bg-hazard-landslide/10" },
  { id: "gempa", label: "Gempa Bumi", level: "A", colorClass: "text-hazard-earthquake", bgClass: "bg-hazard-earthquake/10" },
  { id: "cuaca_ekstrem", label: "Cuaca Ekstrem", level: "A", colorClass: "text-hazard-extreme-weather", bgClass: "bg-hazard-extreme-weather/10" },
  { id: "tsunami", label: "Tsunami", level: "B", colorClass: "text-hazard-tsunami", bgClass: "bg-hazard-tsunami/10" },
  { id: "kekeringan", label: "Kekeringan", level: "B", colorClass: "text-hazard-drought", bgClass: "bg-hazard-drought/10" },
  { id: "karhutla", label: "Kebakaran Hutan dan Lahan", level: "B", colorClass: "text-hazard-wildfire", bgClass: "bg-hazard-wildfire/10" },
  { id: "gunung_api", label: "Gunung Api", level: "C", colorClass: "text-hazard-volcano", bgClass: "bg-hazard-volcano/10" },
  { id: "gelombang_abrasi", label: "Gelombang Tinggi dan Abrasi", level: "C", colorClass: "text-hazard-coastal", bgClass: "bg-hazard-coastal/10" },
];

export const HAZARD_BY_ID = Object.fromEntries(HAZARDS.map((h) => [h.id, h])) as Record<HazardId, HazardMeta>;
