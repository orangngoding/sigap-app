// Sesi percakapan Asisten SIGAP: tipe, judul otomatis, batas, pengelompokan waktu, dan migrasi data lama.
// Murni (tanpa React/zustand) agar bisa diuji.
import type { HasilTanya } from "@/lib/ai/tanya";

export interface PesanChat {
  id: string;
  peran: "pengguna" | "asisten";
  teks: string;
  waktu: string;
  /** Hanya untuk pesan asisten: sumber, dasar jawaban, saran lanjutan. */
  hasil?: Omit<HasilTanya, "jawaban">;
}

export interface SesiChat {
  id: string;
  judul: string;
  dibuat: string;
  diubah: string;
  pesan: PesanChat[];
  /** true bila pengguna mengganti nama sendiri: judul tidak lagi diperbarui otomatis. */
  judulManual?: boolean;
}

/** Blueprint 8.3: 20 pertanyaan terakhir per sesi (= 40 pesan). */
export const MAKS_PESAN = 40;
/** Sesi terlama dibuang setelah batas ini agar penyimpanan perangkat tidak penuh. */
export const MAKS_SESI = 30;

/** Judul dari pertanyaan pertama: satu baris, tanpa tanda format, maksimal 60 karakter. */
export function judulSesi(teks: string): string {
  const satu = teks.replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
  if (!satu) return "Percakapan baru";
  return satu.length > 60 ? `${satu.slice(0, 57).trimEnd()}…` : satu;
}

export const potongSesi = (sesi: SesiChat[]): SesiChat[] => sesi.slice(0, MAKS_SESI);

export type KelompokWaktu = "Hari ini" | "Kemarin" | "7 hari terakhir" | "Lebih lama";

/** Kelompokkan sesi menurut waktu terakhir diubah (zona waktu perangkat), urutan tetap. */
export function kelompokkanSesi(sesi: SesiChat[], now = new Date()): Array<{ judul: KelompokWaktu; sesi: SesiChat[] }> {
  const hari = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const h0 = hari(now);
  const urutan: KelompokWaktu[] = ["Hari ini", "Kemarin", "7 hari terakhir", "Lebih lama"];
  const peta = new Map<KelompokWaktu, SesiChat[]>(urutan.map((k) => [k, []]));
  for (const s of sesi) {
    const selisih = Math.round((h0 - hari(new Date(s.diubah))) / 86_400_000);
    const k: KelompokWaktu = selisih <= 0 ? "Hari ini" : selisih === 1 ? "Kemarin" : selisih <= 7 ? "7 hari terakhir" : "Lebih lama";
    peta.get(k)!.push(s);
  }
  return urutan.map((judul) => ({ judul, sesi: peta.get(judul)! })).filter((g) => g.sesi.length > 0);
}

/** Cari sesi berdasarkan judul atau isi pesan. */
export function cariSesi(sesi: SesiChat[], kata: string): SesiChat[] {
  const q = kata.trim().toLowerCase();
  if (!q) return sesi;
  return sesi.filter((s) => s.judul.toLowerCase().includes(q) || s.pesan.some((p) => p.teks.toLowerCase().includes(q)));
}

/** v1 `{ pesan }` (satu percakapan) -> v2 `{ sesi, aktif }`. Data rusak menjadi kosong, tidak melempar. */
export function migrasiTanya(p: unknown, versi: number): { sesi: SesiChat[]; aktif: string | null } {
  const o = (p ?? {}) as { pesan?: unknown; sesi?: unknown; aktif?: unknown };
  if (versi >= 2) {
    return { sesi: Array.isArray(o.sesi) ? (o.sesi as SesiChat[]) : [], aktif: typeof o.aktif === "string" ? o.aktif : null };
  }
  const pesan = Array.isArray(o.pesan) ? (o.pesan as PesanChat[]).filter((m) => m && typeof m.teks === "string") : [];
  if (pesan.length === 0) return { sesi: [], aktif: null };
  const pertama = pesan.find((m) => m.peran === "pengguna")?.teks ?? pesan[0].teks;
  const s: SesiChat = {
    id: "sesi-lama",
    judul: judulSesi(pertama),
    dibuat: pesan[0].waktu,
    diubah: pesan[pesan.length - 1].waktu,
    pesan: pesan.slice(-MAKS_PESAN),
  };
  return { sesi: [s], aktif: s.id };
}
