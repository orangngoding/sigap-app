// Waktu memutuskan dan meter "keselamatan keluarga" di simulasi. Hanya umpan balik; tidak mengubah nilai.

/** Detik untuk memutuskan per langkah: cukup untuk membaca, cukup singkat untuk terasa mendesak. */
export const DETIK_KEPUTUSAN = 25;

/** Keadaan "keselamatan keluarga" 0-100 sesudah tiap jawaban: tepat +15, kurang tepat -5, berbahaya -20. */
export const AWAL_KESELAMATAN = 60;
export function meterKeselamatan(nilai: Array<0 | 1 | 2>): number[] {
  const hasil: number[] = [];
  let m = AWAL_KESELAMATAN;
  for (const n of nilai) {
    m = Math.max(0, Math.min(100, m + (n === 2 ? 15 : n === 1 ? -5 : -20)));
    hasil.push(m);
  }
  return hasil;
}
