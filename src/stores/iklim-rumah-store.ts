"use client";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { safeStorage } from "@/lib/storage/safe-storage";
import type { Atap, GangguanAir, SumberAir } from "@/lib/iklim/ketahanan";

/** Jawaban Uji Ketahanan Rumah (Siaga Iklim). Hanya di perangkat (`sigap:v1:iklimrumah`); null = ikut profil keluarga. */
export interface JawabanRumah {
  anggota: number | null;
  adaRentan: boolean | null;
  /** null = belum dijawab. */
  litersTersimpan: number | null;
  /** null = belum dijawab (dihitung sebagai genteng, atap paling umum). */
  atap: Atap | null;
  sumberAir: SumberAir;
  /** null = belum dijawab (dipakai cadangan dasar, bukan tebakan). */
  gangguanAir: GangguanAir | null;
  pernahTergenang: boolean;
}

export const JAWABAN_AWAL: JawabanRumah = { anggota: null, adaRentan: null, litersTersimpan: null, atap: null, sumberAir: "pdam", gangguanAir: null, pernahTergenang: false };

/** Kedua soal air sudah dijawab pengguna sendiri. */
export const airDijawab = (j: JawabanRumah) => j.litersTersimpan !== null && j.gangguanAir !== null;
/** Tiga pertanyaan utama (air sulit, air simpanan, atap) sudah dijawab. */
export const rumahDijawab = (j: JawabanRumah) => airDijawab(j) && j.atap !== null;

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
    litersTersimpan: bil(o.litersTersimpan, 0, 50_000),
    atap: ATAP.includes(o.atap as Atap) ? (o.atap as Atap) : null,
    sumberAir: SUMBER.includes(o.sumberAir as SumberAir) ? (o.sumberAir as SumberAir) : JAWABAN_AWAL.sumberAir,
    gangguanAir: GANGGUAN.includes(o.gangguanAir as GangguanAir) ? (o.gangguanAir as GangguanAir) : null,
    pernahTergenang: o.pernahTergenang === true,
  };
}

/**
 * Versi 1 menyimpan isian bawaan (0 liter, "beberapa hari") seolah jawaban. Pasangan persis itu hampir pasti belum
 * pernah diubah, jadi dianggap belum dijawab; jawaban lain tetap dipakai.
 */
export function migrasiJawaban(x: unknown, versi: number): JawabanRumah {
  const j = bersihkanJawaban(x);
  if (versi < 2 && j.litersTersimpan === 0 && j.gangguanAir === "hari") return { ...j, litersTersimpan: null, gangguanAir: null, atap: j.atap === "genteng" ? null : j.atap };
  return j;
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
      version: 2,
      skipHydration: true,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ jawaban: s.jawaban }),
      migrate: (p, versi) => ({ jawaban: migrasiJawaban((p as { jawaban?: unknown } | undefined)?.jawaban, versi) }),
      merge: (p, cur) => ({ ...cur, jawaban: bersihkanJawaban((p as { jawaban?: unknown } | undefined)?.jawaban) }),
    },
  ),
);
