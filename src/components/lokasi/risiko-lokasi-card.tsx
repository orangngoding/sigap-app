"use client";
import type { Lokasi } from "@/types";
import { useHydrate } from "@/hooks/use-hydrate";
import { tambahkanBahaya } from "@/lib/preparedness/saran-bahaya";
import { useProfilStore } from "@/stores/profil-store";
import { ProfilRisiko } from "@/components/risiko/profil-risiko";

/** Profil risiko di halaman Lokasi; bahaya yang disarankan data bisa langsung dimasukkan ke profil rencana. */
export function RisikoLokasiCard({ lokasi }: { lokasi: Lokasi }) {
  const siap = useHydrate(useProfilStore);
  const profil = useProfilStore((s) => s.profil);
  const ubah = useProfilStore((s) => s.ubah);
  return (
    <ProfilRisiko
      lokasi={lokasi}
      terpilih={siap ? profil.bahaya : undefined}
      onTambah={siap ? (ids, varian) => ubah(tambahkanBahaya(profil, ids, varian)) : undefined}
    />
  );
}
