import { HAZARD_BY_ID } from "@/lib/hazards/hazards";
import type { NilaiBahaya } from "@/lib/risiko/nilai";
import type { HazardId } from "@/types";
import type { ItemTas, Tindakan } from "@/types/rencana";
import { langkahSaat } from "@/lib/rencana/ringkas-saat";

/** Batas isi Kartu Siaga agar muat satu halaman (Blueprint 8.1). */
export const BATAS_KARTU = { langkahPerBahaya: 2, langkahTotal: 10, itemTas: 10 } as const;

const BOBOT = { tinggi: 3, sedang: 2, rendah: 1 } as const;

/**
 * Dua langkah teratas per bahaya, maksimal 10 langkah. Bila lebih, langkah berprioritas
 * rendah dipangkas lebih dulu (bukan dipecah ke halaman kedua).
 */
export function langkahKunciKartu(tindakan: Tindakan[], bahaya: HazardId[]) {
  const grup = langkahSaat(tindakan, bahaya, BATAS_KARTU.langkahPerBahaya);
  const semua = grup.flatMap((g, gi) => g.langkah.map((t, i) => ({ gi, i, t })));
  if (semua.length <= BATAS_KARTU.langkahTotal) return grup;
  const dipertahankan = new Set(
    [...semua]
      .sort((a, b) => BOBOT[b.t.priority] - BOBOT[a.t.priority] || a.i - b.i || a.gi - b.gi)
      .slice(0, BATAS_KARTU.langkahTotal)
      .map((x) => x.t.actionId),
  );
  return grup
    .map((g) => ({ ...g, langkah: g.langkah.filter((t) => dipertahankan.has(t.actionId)) }))
    .filter((g) => g.langkah.length > 0);
}

/** Sepuluh item tas teratas: kelompok berbobot tinggi dulu, urutan kalkulator dipertahankan. */
export function tasRingkasKartu(tas: ItemTas[]): ItemTas[] {
  return tas
    .map((t, i) => ({ t, i }))
    .sort((a, b) => b.t.bobot - a.t.bobot || a.i - b.i)
    .slice(0, BATAS_KARTU.itemTas)
    .map((x) => x.t);
}

/** Fakta risiko tinggi untuk bahaya yang disiapkan (Profil Risiko Lokasi): "Gunung Api: Gunung api terdekat: Merapi, ...". */
export function faktaRisikoKartu(nilai: NilaiBahaya[] | undefined, bahaya: HazardId[], maks = 3): string[] {
  return (nilai ?? [])
    .filter((n) => n.tingkat === "tinggi" && bahaya.includes(n.id) && n.alasan[0])
    .slice(0, maks)
    .map((n) => `${HAZARD_BY_ID[n.id].label}: ${n.alasan[0]}`);
}
