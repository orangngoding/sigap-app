"use client";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { safeStorage } from "@/lib/storage/safe-storage";

export interface CatatanLatihan {
  terbaik: number; // persen
  terakhir: number;
  kali: number;
  waktu: string; // ISO, latihan terakhir
}

interface LatihanState {
  hasil: Record<string, CatatanLatihan>;
  catat: (skenarioId: string, persen: number) => void;
  reset: () => void;
}

/** Riwayat Latihan Siaga di perangkat, kunci `sigap:v1:latihan`. */
export const useLatihanStore = create<LatihanState>()(
  persist(
    (set) => ({
      hasil: {},
      reset: () => set({ hasil: {} }),
      catat: (id, persen) =>
        set((s) => {
          const lama = s.hasil[id];
          return {
            hasil: {
              ...s.hasil,
              [id]: { terbaik: Math.max(lama?.terbaik ?? 0, persen), terakhir: persen, kali: (lama?.kali ?? 0) + 1, waktu: new Date().toISOString() },
            },
          };
        }),
    }),
    {
      name: "sigap:v1:latihan",
      version: 1,
      skipHydration: true,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ hasil: s.hasil }),
      migrate: (p) => p as { hasil: Record<string, CatatanLatihan> },
    },
  ),
);
