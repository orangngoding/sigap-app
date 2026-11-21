"use client";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { HazardId } from "@/types";
import { safeStorage } from "@/lib/storage/safe-storage";

export interface CatatanSimulasi {
  waktu: string;
  hazard: HazardId;
  /** Persen benar uji awal dan uji akhir (soal sama, urutan pilihan berbeda). */
  awal: number;
  akhir: number;
  /** Nilai keputusan di simulasi (persen). */
  simulasi: number;
  mode: "ai" | "cadangan";
}

interface SimulasiState {
  riwayat: CatatanSimulasi[];
  /** Nomor variasi berikutnya per bahaya, agar "Simulasi lagi" memberi skenario baru. */
  varian: Partial<Record<HazardId, number>>;
  catat: (c: CatatanSimulasi) => void;
  naikkanVarian: (h: HazardId) => void;
  reset: () => void;
}

/** Riwayat Simulator Bencana AI di perangkat, kunci `sigap:v1:simulasi` (maksimal 50 catatan). */
export const useSimulasiStore = create<SimulasiState>()(
  persist(
    (set) => ({
      riwayat: [],
      varian: {},
      catat: (c) => set((s) => ({ riwayat: [...s.riwayat, c].slice(-50) })),
      naikkanVarian: (h) => set((s) => ({ varian: { ...s.varian, [h]: ((s.varian[h] ?? 0) + 1) % 20 } })),
      reset: () => set({ riwayat: [], varian: {} }),
    }),
    {
      name: "sigap:v1:simulasi",
      version: 1,
      skipHydration: true,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ riwayat: s.riwayat, varian: s.varian }),
      migrate: (p) => p as { riwayat: CatatanSimulasi[]; varian: Partial<Record<HazardId, number>> },
    },
  ),
);

/** Ringkasan dampak dari riwayat: rata-rata uji awal dan akhir, jumlah sesi. */
export function ringkasDampak(r: CatatanSimulasi[]): { sesi: number; awal: number; akhir: number } | null {
  if (r.length === 0) return null;
  const rata = (k: "awal" | "akhir") => Math.round(r.reduce((a, c) => a + c[k], 0) / r.length);
  return { sesi: r.length, awal: rata("awal"), akhir: rata("akhir") };
}
