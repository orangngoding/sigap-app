"use client";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { LangkahWizard, ProfilDraft } from "@/types/rencana";
import { safeStorage } from "@/lib/storage/safe-storage";
import { buatProfilAwal, rapikanProfil } from "@/lib/preparedness/profil-awal";
import { sanitasiProfil } from "@/lib/storage/sanitasi";

interface ProfilState {
  profil: ProfilDraft;
  langkah: LangkahWizard;
  ubah: (patch: Partial<ProfilDraft>) => void;
  setLangkah: (l: LangkahWizard) => void;
  reset: () => void;
}

/**
 * Isian wizard tersimpan otomatis tiap perubahan (Blueprint 7.1) di `sigap:v1:profil`.
 * `skipHydration` + `useHydrate()` menjaga HTML server dan klien tetap sama (aman untuk SSR).
 */
export const useProfilStore = create<ProfilState>()(
  persist(
    (set) => ({
      profil: buatProfilAwal(),
      langkah: 1,
      ubah: (patch) => set((s) => ({ profil: rapikanProfil({ ...s.profil, ...patch }) })),
      setLangkah: (langkah) => set({ langkah }),
      reset: () => set({ profil: buatProfilAwal(), langkah: 1 }),
    }),
    {
      name: "sigap:v1:profil",
      version: 1,
      skipHydration: true,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ profil: s.profil, langkah: s.langkah }),
      migrate: (persisted) => persisted as { profil: ProfilDraft; langkah: LangkahWizard }, // titik migrasi skema berikutnya
      // Gabungkan dengan nilai awal supaya field baru di versi berikutnya tidak undefined. Kolom yang bentuknya salah
      // (berkas cadangan rusak atau diedit) diganti nilai awal, agar Mode Darurat dan halaman lain tetap terbuka.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as { profil?: unknown; langkah?: unknown };
        const langkah = p.langkah === 1 || p.langkah === 2 || p.langkah === 3 || p.langkah === 4 ? p.langkah : current.langkah;
        return {
          ...current,
          langkah,
          profil: rapikanProfil({ ...current.profil, ...sanitasiProfil(p.profil) }),
        };
      },
    },
  ),
);
