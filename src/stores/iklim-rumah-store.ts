"use client";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { safeStorage } from "@/lib/storage/safe-storage";
import type { Atap, GangguanAir, SumberAir } from "@/lib/iklim/ketahanan";

/** Jawaban Uji Ketahanan Rumah (Siaga Iklim). Hanya di perangkat (`sigap:v1:iklimrumah`); null = ikut profil keluarga. */
export interface JawabanRumah {
  anggota: number | null;
  adaRentan: boolean | null;
  litersTersimpan: number;
  atap: Atap;
  sumberAir: SumberAir;
  gangguanAir: GangguanAir;
  pernahTergenang: boolean;
}

export const JAWABAN_AWAL: JawabanRumah = { anggota: null, adaRentan: null, litersTersimpan: 0, atap: "genteng", sumberAir: "pdam", gangguanAir: "hari", pernahTergenang: false };

interface State {
  jawaban: JawabanRumah;
  ubah: (b: Partial<JawabanRumah>) => void;
  reset: () => void;
}

const ATAP: Atap[] = ["seng", "genteng", "beton", "lainnya"];
const SUMBER: SumberAir[] = ["pdam", "sumur", "beli", "lainnya"];
const GANGGUAN: GangguanAir[] = ["jarang", "hari", "minggu", "kemarau"];

/** Terima hanya nilai yang sah dari penyimpanan (bisa berasal dari berkas cadangan buatan siapa saja). */
export function bersihkanJawaban(x: unknown): JawabanRumah {
  const o = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
  const bil = (v: unknown, min: number, max: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : null);
  return {
    anggota: bil(o.anggota, 1, 12),
    adaRentan: typeof o.adaRentan === "boolean" ? o.adaRentan : null,
    litersTersimpan: bil(o.litersTersimpan, 0, 50_000) ?? 0,
    atap: ATAP.includes(o.atap as Atap) ? (o.atap as Atap) : JAWABAN_AWAL.atap,
    sumberAir: SUMBER.includes(o.sumberAir as SumberAir) ? (o.sumberAir as SumberAir) : JAWABAN_AWAL.sumberAir,
    gangguanAir: GANGGUAN.includes(o.gangguanAir as GangguanAir) ? (o.gangguanAir as GangguanAir) : JAWABAN_AWAL.gangguanAir,
    pernahTergenang: o.pernahTergenang === true,
  };
}

export const useIklimRumahStore = create<State>()(
  persist(
    (set) => ({
      jawaban: JAWABAN_AWAL,
      ubah: (b) => set((s) => ({ jawaban: { ...s.jawaban, ...b } })),
      reset: () => set({ jawaban: JAWABAN_AWAL }),
    }),
    {
      name: "sigap:v1:iklimrumah",
      version: 1,
      skipHydration: true,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ jawaban: s.jawaban }),
      migrate: (p) => ({ jawaban: bersihkanJawaban((p as { jawaban?: unknown } | undefined)?.jawaban) }),
      merge: (p, cur) => ({ ...cur, jawaban: bersihkanJawaban((p as { jawaban?: unknown } | undefined)?.jawaban) }),
    },
  ),
);
