import { CloudSun, Newspaper, type LucideIcon } from "lucide-react";
import type { BeritaItem, HazardId } from "@/types";
import { HAZARD_BY_ID } from "@/lib/hazards/hazards";
import { IKON_BAHAYA } from "@/lib/hazards/ikon";

export type JenisBerita = NonNullable<BeritaItem["jenis"]>;

/** Label, ikon, dan warna kategori berita: 9 bahaya, "Cuaca & iklim" (Siaga Iklim), atau "Umum". */
export function metaJenis(j: JenisBerita): { label: string; Ikon: LucideIcon; colorClass: string; bgClass: string } {
  if (j === "iklim") return { label: "Cuaca & iklim", Ikon: CloudSun, colorClass: "text-amber-700", bgClass: "bg-amber-500/10" };
  if (j === "umum") return { label: "Umum", Ikon: Newspaper, colorClass: "text-muted-foreground", bgClass: "bg-muted" };
  const h = HAZARD_BY_ID[j as HazardId];
  return { label: h?.label ?? j, Ikon: IKON_BAHAYA[j as HazardId] ?? Newspaper, colorClass: h?.colorClass ?? "text-muted-foreground", bgClass: h?.bgClass ?? "bg-muted" };
}

export const jenisValid = (j: string | null): j is JenisBerita => j === "umum" || j === "iklim" || (j !== null && j in HAZARD_BY_ID);
