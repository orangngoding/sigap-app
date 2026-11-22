"use client";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { RencanaTersimpan } from "@/types/rencana";
import { safeStorage } from "@/lib/storage/safe-storage";
import { sanitasiRencana } from "@/lib/storage/sanitasi";

interface RencanaState {
  rencana: RencanaTersimpan | null;
  setRencana: (r: RencanaTersimpan) => void;
  tandaiUsang: (usang: boolean) => void;
  reset: () => void;
}

export const useRencanaStore = create<RencanaState>()(
  persist(
    (set) => ({
      rencana: null,
      setRencana: (rencana) => set({ rencana }),
      tandaiUsang: (usang) => set((s) => (s.rencana ? { rencana: { ...s.rencana, perluDiperbarui: usang } } : s)),
      reset: () => set({ rencana: null }),
    }),
    {
      name: "sigap:v1:rencana",
      version: 1,
      skipHydration: true,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ rencana: s.rencana }),
      migrate: (p) => p as { rencana: RencanaTersimpan | null },
      // Rencana yang bentuknya salah (berkas cadangan rusak atau diedit) dibuang agar halaman tidak gagal dimuat;
      // pengguna menyusun ulang dari profil yang tersimpan.
      merge: (persisted, current) => ({
        ...current,
        rencana: sanitasiRencana<RencanaTersimpan>((persisted as { rencana?: unknown } | null)?.rencana),
      }),
    },
  ),
);
