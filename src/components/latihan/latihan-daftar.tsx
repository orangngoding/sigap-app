"use client";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import type { HazardId } from "@/types";
import { HAZARD_BY_ID } from "@/lib/hazards/hazards";
import { AMBANG_LULUS } from "@/lib/latihan/mesin";
import { SKENARIO } from "@/lib/latihan/skenario";
import { useHydrate } from "@/hooks/use-hydrate";
import { useLatihanStore } from "@/stores/latihan-store";
import { useProfilStore } from "@/stores/profil-store";
import { fotoBahaya } from "@/lib/gambar";
import { Foto } from "@/components/global/foto";

/** Daftar skenario; bahaya yang dipilih keluarga ditampilkan lebih dulu. */
export function LatihanDaftar({ hanya }: { hanya?: HazardId[] }) {
  const siap = useHydrate(useLatihanStore, useProfilStore);
  const hasil = useLatihanStore((s) => s.hasil);
  const bahaya = useProfilStore((s) => s.profil.bahaya);
  const daftar = SKENARIO.filter((s) => !hanya || hanya.includes(s.hazard)).sort(
    (a, b) => Number(siap && bahaya.includes(b.hazard)) - Number(siap && bahaya.includes(a.hazard)),
  );

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {daftar.map((s) => {
        const h = HAZARD_BY_ID[s.hazard];
        const c = siap ? hasil[s.id] : undefined;
        const lulus = (c?.terbaik ?? 0) >= AMBANG_LULUS;
        return (
          <li key={s.id}>
            <Link
              href={`/latihan/${s.id}`}
              className="angkat group flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-surface hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <span className="relative block">
                <Foto foto={fotoBahaya(s.hazard)} hias zoom sizes="(min-width: 640px) 50vw, 100vw" className="aspect-[16/9]" />
                <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-foreground shadow-sm backdrop-blur">{h.label}</span>
                {lulus && <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-success px-3 py-1 text-xs font-bold text-success-foreground shadow-sm"><CheckCircle2 className="size-3.5" aria-hidden="true" /> Lulus</span>}
              </span>
              <span className="flex flex-1 flex-col p-5">
              <span className="text-lg font-bold text-foreground group-hover:text-primary">{s.judul}</span>
              <span className="mt-1 flex-1 text-sm text-muted-foreground">{s.ringkas}</span>
              <span className="mt-4 flex items-center justify-between gap-2 text-sm">
                {c ? (
                  <span className={`inline-flex items-center gap-1 font-medium ${lulus ? "text-success-foreground" : "text-muted-foreground"}`}>
                    {lulus && <CheckCircle2 className="size-4" aria-hidden="true" />} Nilai terbaik {c.terbaik}
                  </span>
                ) : (
                  <span className="text-muted-foreground">{s.langkah.length} keputusan · sekitar 2 menit</span>
                )}
                <span className="inline-flex items-center gap-1 font-semibold text-primary">
                  {c ? "Ulangi" : "Mulai"} <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
                </span>
              </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
