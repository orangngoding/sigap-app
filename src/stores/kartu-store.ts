"use client";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { safeStorage } from "@/lib/storage/safe-storage";

export type UkuranKertas = "A4" | "A5";
export const NAMA_KELUARGA_MAKS = 40; // Blueprint 8.1

interface KartuState {
  namaKeluarga: string;
  ukuran: UkuranKertas;
  tampilkanCatatan: boolean;
  ubah: (patch: Partial<Pick<KartuState, "namaKeluarga" | "ukuran" | "tampilkanCatatan">>) => void;
  reset: () => void;
}

const AWAL = { namaKeluarga: "", ukuran: "A4" as UkuranKertas, tampilkanCatatan: false };

/** Pengaturan Kartu Siaga di perangkat, kunci `sigap:v1:kartu` (Blueprint 12.2). */
export const useKartuStore = create<KartuState>()(
  persist(
    (set) => ({
      ...AWAL,
      ubah: (patch) =>
        set((s) => ({
          ...s,
          ...patch,
          namaKeluarga: (patch.namaKeluarga ?? s.namaKeluarga).slice(0, NAMA_KELUARGA_MAKS),
        })),
      reset: () => set({ ...AWAL }),
    }),
    {
      name: "sigap:v1:kartu",
      version: 1,
      skipHydration: true,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ namaKeluarga: s.namaKeluarga, ukuran: s.ukuran, tampilkanCatatan: s.tampilkanCatatan }),
      migrate: (p) => p as typeof AWAL,
    },
  ),
);
