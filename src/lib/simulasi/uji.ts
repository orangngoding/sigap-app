// Uji awal Simulator Bencana AI: 5 soal acak dari bank soal tim (bank-soal.ts), bukan dari AI, sehingga pengukuran
// tidak ikut berubah-ubah bersama keluaran AI. Soal yang muncul di sesi sebelumnya didahulukan untuk tidak diulang.
// Konsep yang keliru dikirim ke AI agar simulasi menyasarnya; kunci jawaban tampil di rapor.
import type { HazardId } from "@/types";
import { BANK_SOAL, type SoalBank } from "./bank-soal";

/** Jumlah soal uji awal per sesi. */
export const JUMLAH_SOAL = 5;

export interface SoalUji {
  /** Id soal bank. */
  id: string;
  situasi: string;
  /** Pilihan yang sudah diacak. */
  pilihan: Array<{ teks: string; nilai: 0 | 1 | 2 }>;
  /** Id potongan panduan untuk jawaban terbaik (dipakai untuk fokus simulasi). */
  sumberTerbaik: string;
  teksTerbaik: string;
}

/** Hash string sederhana (FNV-1a) untuk pengacakan deterministik (dipakai validasi simulasi AI). */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Sumber acak berbenih: sama di server, klien, dan tes. */
function berbenih(benih: string): () => number {
  let x = hash(benih) || 1;
  return () => {
    x = (Math.imul(x, 1103515245) + 12345) >>> 0;
    return x / 4294967296;
  };
}

/**
 * Acak urutan (Fisher-Yates). `sumber` berupa string = benih tetap (deterministik), berupa fungsi = sumber acak
 * (bawaan Math.random, agar soal uji berganti tiap sesi).
 */
export function acak<T>(arr: T[], sumber: string | (() => number) = Math.random): T[] {
  const rnd = typeof sumber === "string" ? berbenih(sumber) : sumber;
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function keSoalUji(s: SoalBank, rnd: () => number = Math.random): SoalUji {
  const pilihan = acak([{ teks: s.tepat.teks, nilai: 2 as const }, ...s.lain], rnd);
  return { id: s.id, situasi: s.situasi, pilihan, sumberTerbaik: s.tepat.sumber, teksTerbaik: s.tepat.teks };
}

export interface OpsiSoal {
  jumlah?: number;
  /** Id soal yang baru saja muncul; dipakai paling akhir. */
  hindari?: readonly string[];
  rnd?: () => number;
}

/** `jumlah` soal acak untuk satu bahaya; soal di `hindari` hanya dipakai bila soal lain tidak cukup. */
export function soalUji(hazard: HazardId, o: OpsiSoal = {}): SoalUji[] {
  const { jumlah = JUMLAH_SOAL, hindari = [], rnd = Math.random } = o;
  const lewat = new Set(hindari);
  const kumpulan = acak(BANK_SOAL.filter((s) => s.hazard === hazard), rnd);
  const urut = [...kumpulan.filter((s) => !lewat.has(s.id)), ...kumpulan.filter((s) => lewat.has(s.id))];
  return urut.slice(0, jumlah).map((s) => keSoalUji(s, rnd));
}

/** Mode beruntun: 3 soal bencana pertama dan 2 soal bencana kedua, tetap 5 soal. */
export function soalUjiGabungan(hazard: HazardId, kedua: HazardId | null, o: OpsiSoal = {}): SoalUji[] {
  if (!kedua || kedua === hazard) return soalUji(hazard, o);
  const n = o.jumlah ?? JUMLAH_SOAL;
  const dua = Math.min(2, Math.floor(n / 2));
  return [...soalUji(hazard, { ...o, jumlah: n - dua }), ...soalUji(kedua, { ...o, jumlah: dua })];
}

export interface HasilUji {
  benar: number;
  total: number;
  persen: number;
  /** Id soal yang belum dijawab dengan tindakan terbaik. */
  salah: string[];
}

/** Nilai uji: benar = memilih tindakan terbaik (nilai 2). `jawaban` = indeks pilihan pada urutan yang ditampilkan. */
export function nilaiUji(soal: SoalUji[], jawaban: Record<string, number>): HasilUji {
  const salah = soal.filter((q) => q.pilihan[jawaban[q.id]]?.nilai !== 2).map((q) => q.id);
  const benar = soal.length - salah.length;
  return { benar, total: soal.length, persen: soal.length ? Math.round((100 * benar) / soal.length) : 0, salah };
}

/** Konsep yang terlewat di uji awal: tindakan terbaik dan sumbernya, untuk difokuskan oleh simulasi AI. */
export function fokusDari(soal: SoalUji[], salah: string[]): Array<{ teks: string; sumber: string }> {
  return soal.filter((q) => salah.includes(q.id)).map((q) => ({ teks: q.teksTerbaik, sumber: q.sumberTerbaik }));
}
