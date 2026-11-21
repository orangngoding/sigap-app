"use client";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { useHydrate } from "@/hooks/use-hydrate";
import { HAZARD_BY_ID } from "@/lib/hazards/hazards";
import { HAZARD_DESKRIPSI } from "@/lib/hazards/pack-status";
import { KANAL_DIVERIFIKASI, KANAL_RESMI, URL_INARISK_RESMI } from "@/lib/hazards/kanal";
import { useProfilStore } from "@/stores/profil-store";

/**
 * Kartu Bahaya Terpilih (Blueprint 6.2): satu baris per bahaya terpilih dengan ringkasan dan kanal resmi.
 * Hanya tampil setelah pengguna melewati langkah pilih bahaya di wizard.
 */
export function BahayaTerpilihCard() {
  const siap = useHydrate(useProfilStore);
  const bahaya = useProfilStore((s) => s.profil.bahaya);
  const sudahMemilih = useProfilStore((s) => s.langkah > 1);

  return (
    <section aria-labelledby="judul-bahaya-terpilih" className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <h2 id="judul-bahaya-terpilih" className="text-lg font-bold text-foreground">Bahaya terpilih</h2>
      {!siap ? (
        <div className="mt-3 h-16 animate-pulse rounded-lg bg-muted" aria-busy="true" />
      ) : !sudahMemilih ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Anda memilih bahaya pada langkah berikutnya.{" "}
          <Link href="/rencana/profil" className="font-semibold text-primary underline-offset-2 hover:underline">Isi profil keluarga</Link>
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {bahaya.map((id) => (
            <li key={id} className="py-3">
              <p className="flex items-center gap-2 font-semibold text-foreground">
                <span className={`size-2.5 rounded-full bg-current ${HAZARD_BY_ID[id].colorClass}`} aria-hidden="true" />
                {HAZARD_BY_ID[id].label}
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">{HAZARD_DESKRIPSI[id]}</p>
              <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {KANAL_RESMI[id].map((k) => (
                  <li key={k.url}>
                    <a href={k.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline">
                      {k.label} <ExternalLink className="size-3" aria-hidden="true" />
                      <span className="sr-only">(buka di tab baru)</span>
                    </a>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        Saran bahaya berasal dari data lokasi dan jawaban Anda, bukan peta risiko resmi.{" "}
        <a href={URL_INARISK_RESMI} target="_blank" rel="noopener noreferrer" className="underline">Cek peta risiko resmi di InaRISK (BNPB)</a>. Tautan diperiksa {KANAL_DIVERIFIKASI}.
      </p>
    </section>
  );
}
