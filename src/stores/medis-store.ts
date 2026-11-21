"use client";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { safeStorage } from "@/lib/storage/safe-storage";

export const GOLONGAN_DARAH = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Tidak tahu"] as const;
export type GolonganDarah = (typeof GOLONGAN_DARAH)[number];
export const MEDIS_TEKS_MAKS = 120;

export interface InfoMedis {
  /** Nama panggilan pemilik ponsel (opsional), agar penolong bisa memanggil. */
  nama: string;
  golonganDarah: GolonganDarah | "";
  alergi: string;
  /** Penyakit atau kondisi penting dan obat rutin, misalnya "diabetes, insulin" atau "asma". */
  kondisi: string;
  /** Hal lain yang perlu diketahui penolong, misalnya "tuli, gunakan tulisan" atau "hamil 7 bulan". */
  catatan: string;
}

interface MedisState extends InfoMedis {
  ubah: (patch: Partial<InfoMedis>) => void;
  reset: () => void;
}

const AWAL: InfoMedis = { nama: "", golonganDarah: "", alergi: "", kondisi: "", catatan: "" };
const potong = (v: string | undefined, maks = MEDIS_TEKS_MAKS) => (v ?? "").slice(0, maks);

export const adaInfoMedis = (m: InfoMedis) => Boolean(m.golonganDarah || m.alergi.trim() || m.kondisi.trim() || m.catatan.trim());

/**
 * Info medis darurat untuk ditunjukkan ke penolong (seperti "Medical ID" di ponsel), kunci `sigap:v1:medis`.
 * Hanya di perangkat ini: tidak dikirim ke server, tidak masuk pesan SMS, dan terhapus oleh "Hapus semua".
 */
export const useMedisStore = create<MedisState>()(
  persist(
    (set) => ({
      ...AWAL,
      ubah: (patch) =>
        set((s) => ({
          nama: potong(patch.nama ?? s.nama, 40),
          golonganDarah: patch.golonganDarah ?? s.golonganDarah,
          alergi: potong(patch.alergi ?? s.alergi),
          kondisi: potong(patch.kondisi ?? s.kondisi),
          catatan: potong(patch.catatan ?? s.catatan),
        })),
      reset: () => set({ ...AWAL }),
    }),
    {
      name: "sigap:v1:medis",
      version: 1,
      skipHydration: true,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ nama: s.nama, golonganDarah: s.golonganDarah, alergi: s.alergi, kondisi: s.kondisi, catatan: s.catatan }),
      migrate: (p) => p as InfoMedis,
    },
  ),
);
