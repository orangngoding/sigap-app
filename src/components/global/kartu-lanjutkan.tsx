"use client";
import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { useHydrate } from "@/hooks/use-hydrate";
import { bangunButir, hitungSkor } from "@/lib/preparedness/skor";
import { useLokasiStore } from "@/stores/lokasi-store";
import { useProgresStore } from "@/stores/progres-store";
import { useRencanaStore } from "@/stores/rencana-store";

/**
 * Kartu "Lanjutkan rencana Anda" di Beranda (Blueprint 5.2), hanya bila ada rencana tersimpan.
 * Hanya membaca penyimpanan lokal; tidak ada panggilan jaringan.
 */
export function KartuLanjutkan() {
  const siap = useHydrate(useLokasiStore, useProgresStore, useRencanaStore);
  const rencana = useRencanaStore((s) => s.rencana);
  const progres = useProgresStore((s) => s.progres);
  const lokasi = useLokasiStore((s) => s.lokasi);
  const hasil = useMemo(() => (rencana ? hitungSkor(bangunButir(rencana.tindakan, rencana.tas), progres) : null), [rencana, progres]);

  if (!siap || !rencana || !hasil || rencana.mode === "contoh") return null;
  return (
    <section aria-label="Lanjutkan rencana" className="border-b border-border bg-primary/5">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <p className="text-sm font-medium text-foreground">
          Lanjutkan rencana Anda{lokasi ? ` untuk ${lokasi.kelurahan}` : ""}: skor kesiapsiagaan{" "}
          <strong>{hasil.skor}</strong> ({hasil.label}).
        </p>
        <Link
          href="/rencana"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Buka rencana <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
