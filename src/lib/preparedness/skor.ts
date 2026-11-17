import type { Phase } from "@/types";
import type { ItemTas, Progres, Tindakan } from "@/types/rencana";
import { BOBOT_PRIORITAS, TINGKAT_SKOR } from "./constants";

/** Satu butir yang dapat dicentang dan dihitung skor (Blueprint 9.2). */
export interface ButirSkor {
  key: string; // actionId atau `tas:${id}`
  judul: string;
  bobot: number;
  phase: Phase | "tas";
  urutan: number; // urutan tampil, dipakai sebagai pemutus seri
}

export interface HasilSkor {
  skor: number; // 0-100
  label: (typeof TINGKAT_SKOR)[number]["label"];
  langkahBerikutnya: ButirSkor | null;
  dicentang: number;
  total: number;
}

/**
 * Bangun butir skor: tindakan fase Sebelum dan Saat + semua item tas.
 * Fase Sesudah tidak dihitung karena belum dapat dilakukan sebelum kejadian.
 */
export function bangunButir(tindakan: Tindakan[], tas: ItemTas[]): ButirSkor[] {
  const butir: ButirSkor[] = [];
  for (const t of tindakan) {
    if (t.phase === "sesudah") continue;
    butir.push({ key: t.actionId, judul: t.title, bobot: BOBOT_PRIORITAS[t.priority], phase: t.phase, urutan: butir.length });
  }
  for (const i of tas) {
    butir.push({ key: `tas:${i.id}`, judul: `Siapkan ${i.nama.toLowerCase()}`, bobot: i.bobot, phase: "tas", urutan: butir.length });
  }
  return butir;
}

export function labelTingkat(skor: number): HasilSkor["label"] {
  let label: HasilSkor["label"] = TINGKAT_SKOR[0].label;
  for (const t of TINGKAT_SKOR) if (skor >= t.min) label = t.label;
  return label;
}

const peringkatFase = (p: ButirSkor["phase"]) => (p === "saat" ? 1 : 0); // Sebelum dan tas lebih dulu dari Saat

export function hitungSkor(butir: ButirSkor[], progres: Progres): HasilSkor {
  let total = 0;
  let dapat = 0;
  let dicentang = 0;
  for (const b of butir) {
    total += b.bobot;
    if (progres[b.key]) {
      dapat += b.bobot;
      dicentang += 1;
    }
  }
  const skor = total === 0 ? 0 : Math.round((100 * dapat) / total);

  const belum = butir.filter((b) => !progres[b.key]);
  belum.sort(
    (a, b) => b.bobot - a.bobot || peringkatFase(a.phase) - peringkatFase(b.phase) || a.urutan - b.urutan,
  );

  return { skor, label: labelTingkat(skor), langkahBerikutnya: belum[0] ?? null, dicentang, total: butir.length };
}
