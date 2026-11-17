// Toast (Blueprint 5.1 dan 16.3): umpan balik singkat, hilang dalam 4 detik, tidak memuat informasi penting
// yang hanya muncul sekali. Antrean disimpan di sessionStorage agar toast tetap tampil setelah pindah halaman.

export interface PesanToast {
  id: number;
  teks: string;
}

const KUNCI = "sigap:v1:toast-antre";
type Pendengar = (p: PesanToast) => void;
const pendengar = new Set<Pendengar>();
let urut = 0;

export const DURASI_TOAST_MS = 4000;

export function toast(teks: string) {
  const p = { id: Date.now() + urut++, teks };
  if (pendengar.size > 0) {
    pendengar.forEach((f) => f(p));
    return;
  }
  // Belum ada penampil (mis. sedang pindah halaman): titipkan untuk ditampilkan saat penampil terpasang.
  try {
    const antre = JSON.parse(sessionStorage.getItem(KUNCI) ?? "[]") as PesanToast[];
    sessionStorage.setItem(KUNCI, JSON.stringify([...antre, p].slice(-3)));
  } catch {
    /* penyimpanan tidak tersedia: toast diabaikan */
  }
}

/** Dipakai penampil toast. Mengembalikan fungsi berhenti berlangganan. */
export function dengarkanToast(f: Pendengar): () => void {
  pendengar.add(f);
  try {
    const antre = JSON.parse(sessionStorage.getItem(KUNCI) ?? "[]") as PesanToast[];
    sessionStorage.removeItem(KUNCI);
    antre.forEach(f);
  } catch {
    /* abaikan */
  }
  return () => pendengar.delete(f);
}
