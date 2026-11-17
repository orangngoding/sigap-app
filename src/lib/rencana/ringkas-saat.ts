import type { Tindakan } from "@/types/rencana";

/** Ambil langkah "Saat" paling penting per bahaya untuk Kartu Siaga dan Mode Darurat. */
export function langkahSaat(tindakan: Tindakan[], hazardUrut: Array<Tindakan["hazard"]>, perBahaya = 3): Array<{ hazard: Tindakan["hazard"]; langkah: Tindakan[] }> {
  const bobot = { tinggi: 3, sedang: 2, rendah: 1 } as const;
  return hazardUrut
    .filter((h) => h !== "umum")
    .map((h) => ({
      hazard: h,
      langkah: tindakan
        .filter((t) => t.hazard === h && t.phase === "saat")
        .map((t, i) => ({ t, i }))
        .sort((a, b) => bobot[b.t.priority] - bobot[a.t.priority] || a.i - b.i)
        .slice(0, perBahaya)
        .map((x) => x.t),
    }))
    .filter((x) => x.langkah.length > 0);
}
