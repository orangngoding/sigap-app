// Konstanta aturan deterministik (Blueprint 9). Ditampilkan juga di halaman Metodologi.

/** Angka per orang adalah ASUMSI AWAL: tim wajib memverifikasinya ke BNPB/PMI/Kemenkes (Blueprint 9.1). */
export const ASUMSI = {
  airLiterPerOrangHari: 3,
  porsiPerOrangHari: 3,
  popokPerBalitaHari: 6,
  maskerPerOrang: 3,
  minHariObatRutin: 7,
  pakaianSetPerOrang: 2,
} as const;

export const BOBOT_PRIORITAS = { tinggi: 3, sedang: 2, rendah: 1 } as const;

/** Batas bawah tiap tingkat, urut naik (Blueprint 7.2 dan 9.2). */
export const TINGKAT_SKOR = [
  { min: 0, label: "Baru mulai" },
  { min: 40, label: "Cukup siap" },
  { min: 70, label: "Siap" },
  { min: 90, label: "Sangat siap" },
] as const;

export const BATAS_PROFIL = {
  anggotaMin: 1,
  anggotaMaks: 12,
  lantaiMin: 1,
  lantaiMaks: 60,
  kontakMaks: 3,
  namaKontakMaks: 30,
  teleponMin: 6,
  teleponMaks: 16,
  titikKumpulMaks: 80,
  catatanMaks: 200,
} as const;

export const FAKTOR = {
  keluargaBesarMin: 6,
  lantaiTinggiMin: 3,
  maksDikirim: 6,
} as const;
