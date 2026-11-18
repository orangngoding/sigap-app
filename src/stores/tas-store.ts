"use client";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { safeStorage } from "@/lib/storage/safe-storage";
import { tanggalValid, type PetaKedaluwarsa } from "@/lib/rencana/pengingat";

interface TasState {
  kedaluwarsa: PetaKedaluwarsa;
  setKedaluwarsa: (id: string, tanggal: string) => void;
  reset: () => void;
}

/** Tanggal kedaluwarsa isi tas siaga, hanya di perangkat (`sigap:v1:tas`). */
export const useTasStore = create<TasState>()(
  persist(
    (set) => ({
      kedaluwarsa: {},
      reset: () => set({ kedaluwarsa: {} }),
      setKedaluwarsa: (id, tanggal) =>
        set((s) => {
          const next = { ...s.kedaluwarsa };
          if (tanggalValid(tanggal)) next[id] = tanggal;
          else delete next[id];
          return { kedaluwarsa: next };
        }),
    }),
    {
      name: "sigap:v1:tas",
      version: 1,
      skipHydration: true,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ kedaluwarsa: s.kedaluwarsa }),
      migrate: (p) => p as { kedaluwarsa: PetaKedaluwarsa },
    },
  ),
);
