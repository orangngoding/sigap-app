"use client";
// Tindakan adaptasi dari Siaga Iklim yang dimasukkan pengguna ke rencana keluarga. Centangnya memakai progres-store
// (kunci "iklim:<id>") agar sama dengan centang tindakan lain; skor kesiapsiagaan tidak berubah.
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { safeStorage } from "@/lib/storage/safe-storage";

export interface AksiIklim {
  id: string;
  judul: string;
  langkahPertama: string;
  /** Kalimat waktu, mis. "Selesaikan sebelum Agustus (9 bulan lagi)." */
  waktu: string | null;
  wilayah: string;
  ditambahPada: string;
}

interface State {
  aksi: AksiIklim[];
  tambah: (a: Omit<AksiIklim, "ditambahPada">) => void;
  hapus: (id: string) => void;
}

const MAKS = 10;

/** Terima hanya entri yang sah dari penyimpanan. */
export function bersihkanAksi(x: unknown): AksiIklim[] {
  if (!Array.isArray(x)) return [];
  const teks = (v: unknown, n: number) => (typeof v === "string" ? v.slice(0, n) : "");
  return x
    .filter((a): a is Record<string, unknown> => Boolean(a) && typeof a === "object" && typeof (a as { id?: unknown }).id === "string")
    .map((a) => ({ id: teks(a.id, 60), judul: teks(a.judul, 160), langkahPertama: teks(a.langkahPertama, 400), waktu: typeof a.waktu === "string" ? a.waktu.slice(0, 120) : null, wilayah: teks(a.wilayah, 120), ditambahPada: teks(a.ditambahPada, 40) }))
    .filter((a) => a.id && a.judul)
    .slice(0, MAKS);
}

export const useAksiIklimStore = create<State>()(
  persist(
    (set) => ({
      aksi: [],
      tambah: (a) =>
        set((s) => (s.aksi.some((x) => x.id === a.id) ? s : { aksi: [...s.aksi, { ...a, ditambahPada: new Date().toISOString() }].slice(-MAKS) })),
      hapus: (id) => set((s) => ({ aksi: s.aksi.filter((x) => x.id !== id) })),
    }),
    {
      name: "sigap:v1:aksiiklim",
      version: 1,
      skipHydration: true,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ aksi: s.aksi }),
      migrate: (p) => ({ aksi: bersihkanAksi((p as { aksi?: unknown })?.aksi) }),
      merge: (p, cur) => ({ ...cur, aksi: bersihkanAksi((p as { aksi?: unknown })?.aksi) }),
    },
  ),
);
