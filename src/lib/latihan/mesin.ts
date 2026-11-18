// Mesin Latihan Siaga: navigasi langkah (termasuk cabang) dan penilaian. Murni kode, diuji.
import type { HazardId } from "@/types";
import type { Tindakan } from "@/types/rencana";
import { SKENARIO, type Langkah, type Skenario } from "./skenario";

/** Nilai minimal (persen) agar latihan dianggap lulus dan ikut dihitung di skor kesiapsiagaan. */
export const AMBANG_LULUS = 70;

export interface Jawaban {
  langkahId: string;
  pilihan: number;
}

export interface HasilLatihan {
  poin: number;
  maks: number;
  persen: number;
  lulus: boolean;
}

export const kunciLatihan = (h: HazardId) => `latihan:${h}`;

export function cariLangkah(s: Skenario, id: string): Langkah | undefined {
  return s.langkah.find((l) => l.id === id) ?? s.cabang?.find((l) => l.id === id);
}

/** Id langkah berikutnya, atau null bila latihan selesai. */
export function langkahSesudah(s: Skenario, langkahId: string, pilihan: number): string | null {
  const l = cariLangkah(s, langkahId);
  const p = l?.pilihan[pilihan];
  if (!l || !p) return null;
  if (p.lanjut) return p.lanjut;
  const i = s.langkah.findIndex((x) => x.id === langkahId);
  return i >= 0 && i + 1 < s.langkah.length ? s.langkah[i + 1].id : null;
}

export function hitungHasil(s: Skenario, jawaban: Jawaban[]): HasilLatihan {
  let poin = 0;
  for (const j of jawaban) poin += cariLangkah(s, j.langkahId)?.pilihan[j.pilihan]?.nilai ?? 0;
  const maks = jawaban.length * 2;
  const persen = maks === 0 ? 0 : Math.round((100 * poin) / maks);
  return { poin, maks, persen, lulus: persen >= AMBANG_LULUS };
}

/** Bahaya dalam rencana yang punya skenario latihan (urut sesuai rencana). */
export function hazardLatihan(tindakan: Pick<Tindakan, "hazard">[]): HazardId[] {
  const ada = new Set(SKENARIO.map((s) => s.hazard));
  return [...new Set(tindakan.map((t) => t.hazard))].filter((h): h is HazardId => h !== "umum" && ada.has(h));
}

export const skenarioUntuk = (h: HazardId): Skenario | undefined => SKENARIO.find((s) => s.hazard === h);
