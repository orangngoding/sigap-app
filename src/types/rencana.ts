// src/types/rencana.ts — tipe tahap Profil dan Rencana (Blueprint 12.1).
// Berkas terpisah agar src/types/index.ts dari tahap Lokasi tidak perlu diubah.
import type { Group, HazardId, Phase, ProfilRumahTangga } from "./index";

export type Bangunan = ProfilRumahTangga["bangunan"];
export type JawabanPemicu = "ya" | "tidak" | "tidak_tahu";
export type JenisDisabilitas = ProfilRumahTangga["jenisDisabilitas"][number];
export type KontakDarurat = ProfilRumahTangga["kontakDarurat"][number];

/**
 * Isian wizard yang sedang berjalan. `bangunan` dan `punyaKendaraan` wajib diisi
 * (Blueprint 7.1), jadi sebelum dipilih nilainya `null`. Setelah lolos validasi,
 * `finalisasiProfil()` mengubahnya menjadi ProfilRumahTangga penuh.
 */
export type ProfilDraft = Omit<ProfilRumahTangga, "bangunan" | "punyaKendaraan"> & {
  bangunan: Bangunan | null;
  punyaKendaraan: boolean | null;
};

export type LangkahWizard = 1 | 2 | 3 | 4; // 4 = ringkasan
export type ErrorMap = Record<string, string>; // kunci: "jumlahAnggota", "kontakDarurat.0.nama", ...

export type KelompokTas =
  | "Air dan makanan"
  | "Kesehatan"
  | "Dokumen dan uang"
  | "Perlengkapan"
  | "Khusus keluarga";

export interface ItemTas {
  id: string;
  kelompok: KelompokTas;
  nama: string;
  jumlah: number;
  satuan: string;
  bobot: 1 | 2;
}

export type Prioritas = "tinggi" | "sedang" | "rendah";

export interface Tindakan {
  actionId: string; // `${hazard}:${phase}:${sourceIds[0]}`
  hazard: HazardId | "umum";
  phase: Phase;
  title: string;
  detail: string;
  priority: Prioritas;
  forGroups: Group[];
  sourceIds: string[];
}

export interface RencanaTersimpan {
  versi: 1;
  dibuatPada: string; // ISO 8601
  mode: "ai" | "cadangan" | "contoh";
  hashMasukan: string;
  lokasiAdm4: string;
  ringkasanRisiko: string;
  faktorKerentanan: string[];
  tindakan: Tindakan[];
  tas: ItemTas[];
  rekomendasiEdukasi: string[];
  catatanKeterbatasan: string;
  perluDiperbarui: boolean;
}

/** Kunci: actionId atau `tas:${itemId}`; nilai selalu true bila dicentang. */
export type Progres = Record<string, true>;
