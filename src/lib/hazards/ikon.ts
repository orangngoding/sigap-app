import { Activity, CloudLightning, Droplets, Flame, Mountain, MountainSnow, Sun, Waves, Wind, type LucideIcon } from "lucide-react";
import type { HazardId } from "@/types";

/** Ikon per bahaya, dipakai bersama oleh Mode Darurat dan Berita bencana. */
export const IKON_BAHAYA: Record<HazardId, LucideIcon> = {
  banjir: Droplets,
  longsor: Mountain,
  gempa: Activity,
  cuaca_ekstrem: CloudLightning,
  tsunami: Waves,
  kekeringan: Sun,
  karhutla: Flame,
  gunung_api: MountainSnow,
  gelombang_abrasi: Wind,
};
