"use client";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Progres } from "@/types/rencana";
import { safeStorage } from "@/lib/storage/safe-storage";

interface ProgresState {
  progres: Progres;
  toggle: (key: string) => void;
  reset: () => void;
}

/** Terpisah dari rencana agar centang tetap berlaku ketika rencana disusun ulang (Blueprint 12.2). */
export const useProgresStore = create<ProgresState>()(
  persist(
    (set) => ({
      progres: {},
      toggle: (key) =>
        set((s) => {
          const next = { ...s.progres };
          if (next[key]) delete next[key];
          else next[key] = true;
          return { progres: next };
        }),
      reset: () => set({ progres: {} }),
    }),
    {
      name: "sigap:v1:progres",
      version: 1,
      skipHydration: true,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ progres: s.progres }),
      migrate: (persisted) => persisted as { progres: Progres },
    },
  ),
);
