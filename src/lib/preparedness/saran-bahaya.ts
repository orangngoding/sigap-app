import type { HazardId, VarianBanjir } from "@/types";
import type { JawabanPemicu } from "@/types/rencana";
import { HAZARDS } from "@/lib/hazards/hazards";
import { isHazardAktif } from "@/lib/hazards/pack-status";
import { ALASAN_SELALU, PERTANYAAN_PEMICU, SELALU_DISARANKAN } from "@/lib/hazards/pertanyaan";

export interface SaranBahaya {
  id: HazardId;
  alasan: string[]; // tiap alasan: "rumah dekat sungai ..." (diawali "Disarankan karena" di UI)
}

type Jawaban = Record<string, JawabanPemicu>;

const urutanHazard = (ids: Iterable<HazardId>): HazardId[] => {
  const s = new Set(ids);
  return HAZARDS.map((h) => h.id).filter((id) => s.has(id));
};

/** Saran bahaya dari jawaban (Blueprint 2.3). Saran bukan peta risiko resmi. */
export function sarankanBahaya(jawaban: Jawaban): SaranBahaya[] {
  const peta = new Map<HazardId, string[]>();
  for (const id of SELALU_DISARANKAN) peta.set(id, [ALASAN_SELALU]);
  for (const q of PERTANYAAN_PEMICU) {
    if (jawaban[q.id] !== "ya") continue;
    for (const id of q.menyarankan) peta.set(id, [...(peta.get(id) ?? []), q.alasan]);
  }
  return urutanHazard(peta.keys()).map((id) => ({ id, alasan: peta.get(id) ?? [] }));
}

export function varianDisarankan(jawaban: Jawaban): VarianBanjir[] {
  const s = new Set<VarianBanjir>();
  for (const q of PERTANYAAN_PEMICU) if (jawaban[q.id] === "ya") q.varianAktif.forEach((v) => s.add(v));
  return [...s];
}

const idSaran = (j: Jawaban) => new Set(sarankanBahaya(j).map((s) => s.id));

/**
 * Terapkan HANYA selisih saran ketika sebuah jawaban berubah: bahaya yang baru disarankan
 * ditambahkan (bila aktif), bahaya yang tidak lagi disarankan dilepas. Pilihan manual
 * pengguna yang tidak terkait perubahan itu tidak disentuh.
 */
export function terapkanPerubahanJawaban(
  saat: { bahaya: HazardId[]; varianBanjir: VarianBanjir[]; jawabanPemicu: Jawaban },
  jawabanBaru: Jawaban,
): { bahaya: HazardId[]; varianBanjir: VarianBanjir[] } {
  const lama = idSaran(saat.jawabanPemicu);
  const baru = idSaran(jawabanBaru);
  const bahaya = new Set(saat.bahaya);
  for (const id of baru) if (!lama.has(id) && isHazardAktif(id)) bahaya.add(id);
  for (const id of lama) if (!baru.has(id)) bahaya.delete(id);

  const vLama = new Set(varianDisarankan(saat.jawabanPemicu));
  const vBaru = new Set(varianDisarankan(jawabanBaru));
  const varian = new Set(saat.varianBanjir);
  for (const v of vBaru) if (!vLama.has(v)) varian.add(v);
  for (const v of vLama) if (!vBaru.has(v)) varian.delete(v);

  return { bahaya: urutanHazard(bahaya), varianBanjir: [...varian] };
}
