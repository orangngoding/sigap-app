"use client";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Lokasi } from "@/types";
import { safeStorage } from "@/lib/storage/safe-storage";

interface LokasiState {
  lokasi: Lokasi | null;
  setLokasi: (l: Lokasi) => void;
  clearLokasi: () => void;
}

export const useLokasiStore = create<LokasiState>()(
  persist(
    (set) => ({
      lokasi: null,
      setLokasi: (lokasi) => set({ lokasi }),
      clearLokasi: () => set({ lokasi: null }),
    }),
    {
      name: "sigap:v1:lokasi",
      version: 1,
      skipHydration: true, // dipulihkan lewat useHydrate() agar HTML server dan klien sama
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ lokasi: s.lokasi }),
      migrate: (persisted) => persisted as { lokasi: Lokasi | null }, // titik migrasi skema berikutnya
    },
  ),
);
