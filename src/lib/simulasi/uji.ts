// Uji pemahaman sebelum dan sesudah Simulator Bencana AI. Soal TIDAK dibuat AI: diambil dari skenario bank yang
// ditulis tim dan tervalidasi (tiap pilihan bernilai dan bersumber panduan resmi), sehingga pengukuran tidak ikut
// berubah-ubah bersama keluaran AI. Uji awal dan akhir memakai soal yang sama dengan urutan pilihan berbeda
// (desain pretest-posttest), lalu peningkatan dihitung sebagai selisih dan normalized gain (Hake, 1998).
import type { HazardId } from "@/types";
import { skenarioUntuk } from "@/lib/latihan/mesin";
import { PESAN, type Pesan } from "@/lib/latihan/pesan";

export type Putaran = "awal" | "akhir";

export interface SoalUji {
  /** Id langkah skenario bank. */
  id: string;
  situasi: string;
  pesan: Pesan[];
  /** Pilihan yang sudah diacak; `asli` = indeks di skenario bank. */
  pilihan: Array<{ teks: string; nilai: 0 | 1 | 2; asli: number }>;
  /** Id potongan panduan untuk jawaban terbaik (dipakai untuk fokus simulasi). */
  sumberTerbaik: string;
  teksTerbaik: string;
}

/** Hash string sederhana (FNV-1a) untuk pengacakan yang deterministik: sama di server, klien, dan tes. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Acak urutan dengan benih tetap; uji akhir memakai benih lain sehingga posisi jawaban tidak bisa dihafal. */
export function acak<T>(arr: T[], benih: string): T[] {
  const a = [...arr];
  let x = hash(benih) || 1;
  for (let i = a.length - 1; i > 0; i--) {
    x = (Math.imul(x, 1103515245) + 12345) >>> 0;
    const j = x % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Soal uji untuk satu bahaya (langkah utama skenario bank). Kosong bila bahaya belum punya skenario. */
export function soalUji(hazard: HazardId, putaran: Putaran): SoalUji[] {
  const s = skenarioUntuk(hazard);
  if (!s) return [];
  return s.langkah.map((l) => {
    const dengan = l.pilihan.map((p, i) => ({ teks: p.teks, nilai: p.nilai, asli: i }));
    let pilihan = acak(dengan, `${l.id}:${putaran}`);
    // Pastikan posisi jawaban terbaik berbeda antara uji awal dan akhir.
    if (putaran === "akhir") {
      const posAwal = acak(dengan, `${l.id}:awal`).findIndex((p) => p.nilai === 2);
      const posAkhir = pilihan.findIndex((p) => p.nilai === 2);
      if (posAwal === posAkhir) pilihan = [...pilihan.slice(1), pilihan[0]];
    }
    const terbaik = l.pilihan.find((p) => p.nilai === 2)!;
    return { id: l.id, situasi: l.situasi, pesan: PESAN[l.id] ?? [], pilihan, sumberTerbaik: terbaik.sumber, teksTerbaik: terbaik.teks };
  });
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

/**
 * Peningkatan pemahaman: selisih poin persen dan normalized gain g = (akhir - awal) / (100 - awal).
 * g dipakai luas dalam riset pendidikan; awal 100 tidak bisa naik lagi, jadi g = null.
 */
export function peningkatan(awal: number, akhir: number): { selisih: number; g: number | null; kategori: "tinggi" | "sedang" | "rendah" | "turun" | "sempurna" } {
  const selisih = akhir - awal;
  if (awal >= 100) return { selisih, g: null, kategori: akhir >= 100 ? "sempurna" : "turun" };
  const g = Math.round(((akhir - awal) / (100 - awal)) * 100) / 100;
  const kategori = g < 0 ? "turun" : g >= 0.7 ? "tinggi" : g >= 0.3 ? "sedang" : "rendah";
  return { selisih, g, kategori };
}

/** Konsep yang terlewat di uji awal: tindakan terbaik dan sumbernya, untuk difokuskan oleh simulasi AI. */
export function fokusDari(soal: SoalUji[], salah: string[]): Array<{ teks: string; sumber: string }> {
  return soal.filter((q) => salah.includes(q.id)).map((q) => ({ teks: q.teksTerbaik, sumber: q.sumberTerbaik }));
}

/** Soal uji untuk mode beruntun: semua soal bencana pertama ditambah dua soal pertama bencana kedua. */
export function soalUjiGabungan(hazard: HazardId, kedua: HazardId | null, putaran: Putaran): SoalUji[] {
  const utama = soalUji(hazard, putaran);
  if (!kedua || kedua === hazard) return utama;
  return [...utama, ...soalUji(kedua, putaran).slice(0, 2)];
}
