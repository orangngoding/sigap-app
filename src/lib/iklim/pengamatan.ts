// Siaga Iklim, "yang sudah terjadi": kemarau terpanjang yang benar-benar tercatat di wilayah pengguna dalam beberapa
// tahun terakhir (reanalisis ERA5, /api/iklim). Pelengkap proyeksi: kejadian nyata lebih mudah dibayangkan daripada
// rata-rata model, dan sekaligus menjadi pembanding apakah proyeksi "saat ini" masuk akal. Tidak mengubah hitungan.
import type { IklimResponse } from "@/types";

export const TAHUN_PENGAMATAN = 5;

export interface KemarauTerjadi {
  tahunAwal: number;
  tahunAkhir: number;
  /** Kemarau terpanjang (hari berturut-turut dengan hujan < 1 mm) dan tahun terjadinya. */
  hari: number;
  tahun: number;
  /** Proyeksi tahun terburuk saat ini (2011-2030); dipakai untuk membandingkan. */
  proyeksiKini: number;
  /** "lebih": kejadian nyata lebih panjang dari proyeksi (angka di layar sebaiknya dianggap batas bawah). */
  banding: "lebih" | "sekitar" | "kurang";
}

export function kemarauTerjadi(d: IklimResponse | undefined, proyeksiKini: number, n = TAHUN_PENGAMATAN): KemarauTerjadi | null {
  const akhir = (d?.tahunan ?? []).filter((t) => Number.isFinite(t.hariKeringBeruntunMaks)).slice(-n);
  if (akhir.length === 0) return null;
  // Tahun terbaru menang bila sama panjang: lebih mudah diingat.
  const puncak = akhir.reduce((a, b) => (b.hariKeringBeruntunMaks >= a.hariKeringBeruntunMaks ? b : a));
  const hari = puncak.hariKeringBeruntunMaks;
  // "Sekitar" bila selisihnya dalam 15% (paling sedikit 3 hari): model dan pengamatan tidak pernah persis sama.
  const toleransi = Math.max(3, proyeksiKini * 0.15);
  const banding = hari > proyeksiKini + toleransi ? "lebih" : hari < proyeksiKini - toleransi ? "kurang" : "sekitar";
  return { tahunAwal: akhir[0].tahun, tahunAkhir: akhir[akhir.length - 1].tahun, hari, tahun: puncak.tahun, proyeksiKini, banding };
}
