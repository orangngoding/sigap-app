"use client";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { HazardId } from "@/types";
import { safeStorage } from "@/lib/storage/safe-storage";

export interface CatatanSimulasi {
  waktu: string;
  hazard: HazardId;
  /** Persen benar uji awal (5 soal acak dari bank soal). */
  awal: number;
  /** Hanya pada catatan lama (sebelum uji akhir dihapus). */
  akhir?: number;
  /** Nilai keputusan di simulasi (persen). */
  simulasi: number;
  mode: "ai" | "cadangan";
}

/** Banyak id soal terakhir yang diingat per bahaya, agar sesi berikutnya memakai soal lain. */
const INGAT_SOAL = 10;

interface SimulasiState {
  riwayat: CatatanSimulasi[];
  /** Nomor variasi berikutnya per bahaya, agar "Simulasi lagi" memberi skenario baru. */
  varian: Partial<Record<HazardId, number>>;
  /** Id soal uji awal yang baru saja muncul, per bahaya. */
  soalTerakhir: Partial<Record<HazardId, string[]>>;
  catat: (c: CatatanSimulasi) => void;
  naikkanVarian: (h: HazardId) => void;
  ingatSoal: (h: HazardId, ids: string[]) => void;
  reset: () => void;
}

/** Riwayat Simulator Bencana AI di perangkat, kunci `sigap:v1:simulasi` (maksimal 50 catatan). */
export const useSimulasiStore = create<SimulasiState>()(
  persist(
    (set) => ({
      riwayat: [],
      varian: {},
      soalTerakhir: {},
      catat: (c) => set((s) => ({ riwayat: [...s.riwayat, c].slice(-50) })),
      naikkanVarian: (h) => set((s) => ({ varian: { ...s.varian, [h]: ((s.varian[h] ?? 0) + 1) % 20 } })),
      ingatSoal: (h, ids) =>
        set((s) => ({ soalTerakhir: { ...s.soalTerakhir, [h]: [...ids, ...(s.soalTerakhir[h] ?? []).filter((x) => !ids.includes(x))].slice(0, INGAT_SOAL) } })),
      reset: () => set({ riwayat: [], varian: {}, soalTerakhir: {} }),
    }),
    {
      name: "sigap:v1:simulasi",
      version: 1,
      skipHydration: true,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ riwayat: s.riwayat, varian: s.varian, soalTerakhir: s.soalTerakhir }),
      migrate: (p) => p as { riwayat: CatatanSimulasi[]; varian: Partial<Record<HazardId, number>>; soalTerakhir: Partial<Record<HazardId, string[]>> },
    },
  ),
);

/** Ringkasan dari riwayat: rata-rata uji awal dan keputusan simulasi, jumlah sesi. */
export function ringkasDampak(r: CatatanSimulasi[]): { sesi: number; awal: number; simulasi: number } | null {
  if (r.length === 0) return null;
  const rata = (k: "awal" | "simulasi") => Math.round(r.reduce((a, c) => a + c[k], 0) / r.length);
  return { sesi: r.length, awal: rata("awal"), simulasi: rata("simulasi") };
}
