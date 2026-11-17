import type { HazardId } from "@/types";
import type { Chunk } from "@/lib/kb/schema";

export interface LangkahDarurat {
  id: string;
  teks: string;
  /** Catatan bila langkah diturunkan dari panduan bahaya lain; wajib ditampilkan. */
  turunan?: string;
}

export interface PaketDarurat {
  saat: LangkahDarurat[];
  sesudah: LangkahDarurat[];
}

const BOBOT = { tinggi: 3, sedang: 2, rendah: 1 } as const;

/** Urutkan: prioritas tertinggi dulu, lalu urutan di KB (stabil). */
function urut(chunks: Chunk[]): Chunk[] {
  return chunks
    .map((c, i) => ({ c, i }))
    .sort((a, b) => BOBOT[b.c.priority] - BOBOT[a.c.priority] || a.i - b.i)
    .map((x) => x.c);
}

/**
 * Langkah Mode Darurat untuk satu bahaya (Blueprint 8.2): 5-7 langkah "Saat kejadian" dan
 * 3 langkah "Sesudah kejadian", murni dari potongan KB (tanpa rencana, tanpa jaringan).
 * Potongan bertanda `darurat: true` didahulukan. Teks langkah = judul potongan (kalimat perintah pendek).
 */
export function langkahDaruratBahaya(kb: Chunk[], hazard: HazardId, maksSaat = 7, maksSesudah = 3): PaketDarurat {
  const dari = (phase: Chunk["phase"]) => kb.filter((c) => c.hazard === hazard && c.phase === phase);
  const saat = dari("saat");
  const pilihSaat = [...urut(saat.filter((c) => c.darurat)), ...urut(saat.filter((c) => !c.darurat))].slice(0, maksSaat);
  const pilihSesudah = urut(dari("sesudah")).slice(0, maksSesudah);
  const peta = (c: Chunk): LangkahDarurat => ({ id: c.id, teks: c.title, ...(c.turunan ? { turunan: c.turunan } : {}) });
  return { saat: pilihSaat.map(peta), sesudah: pilihSesudah.map(peta) };
}

/** Jumlah kata maksimum per langkah di Mode Darurat (Blueprint 8.2). */
export const MAKS_KATA_LANGKAH = 12;
