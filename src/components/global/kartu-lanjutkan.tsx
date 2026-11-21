"use client";
import Link from "next/link";
import { useMemo } from "react";
import { motion } from "motion/react";
import { ArrowRight, CalendarClock } from "lucide-react";
import { useHydrate } from "@/hooks/use-hydrate";
import { useAngkaHalus } from "@/hooks/use-angka-halus";
import { bangunButir, hitungSkor } from "@/lib/preparedness/skor";
import { hazardLatihan } from "@/lib/latihan/mesin";
import { ringkasPengingat } from "@/lib/rencana/pengingat";
import { useLokasiStore } from "@/stores/lokasi-store";
import { useProgresStore } from "@/stores/progres-store";
import { useRencanaStore } from "@/stores/rencana-store";
import { useTasStore } from "@/stores/tas-store";
import { usePihak } from "@/components/rencana/teks-pihak";

const R = 20;
const K = 2 * Math.PI * R;

/**
 * Kartu "Rencana keluarga Anda" di hero Beranda (Blueprint 5.2), hanya bila ada rencana tersimpan.
 * Hanya membaca penyimpanan lokal; tidak ada panggilan jaringan.
 */
export function KartuLanjutkan() {
  const siap = useHydrate(useLokasiStore, useProgresStore, useRencanaStore, useTasStore);
  const rencana = useRencanaStore((s) => s.rencana);
  const progres = useProgresStore((s) => s.progres);
  const lokasi = useLokasiStore((s) => s.lokasi);
  const kedaluwarsa = useTasStore((s) => s.kedaluwarsa);
  const hasil = useMemo(
    () => (rencana ? hitungSkor(bangunButir(rencana.tindakan, rencana.tas, hazardLatihan(rencana.tindakan)), progres) : null),
    [rencana, progres],
  );
  const skor = useAngkaHalus(hasil?.skor ?? 0, { tunda: 0.3 });
  const judul = usePihak().s("Rencana keluarga Anda");

  if (!siap || !rencana || !hasil || rencana.mode === "contoh") return null;
  const p = ringkasPengingat(rencana.tas, kedaluwarsa);
  const perlu = p.lewat.length + p.segera.length;

  return (
    <motion.section
      aria-label={judul}
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.3 }}
      className="kaca-gelap mt-6 flex max-w-xl flex-wrap items-center gap-4 rounded-2xl border border-white/15 p-4"
    >
      <div className="relative size-14 shrink-0 text-emerald-300" role="meter" aria-label="Skor kesiapsiagaan" aria-valuemin={0} aria-valuemax={100} aria-valuenow={hasil.skor}>
        <svg viewBox="0 0 48 48" className="size-full -rotate-90" aria-hidden="true">
          <circle cx="24" cy="24" r={R} fill="none" strokeWidth="5" className="stroke-white/15" />
          <circle cx="24" cy="24" r={R} fill="none" strokeWidth="5" strokeLinecap="round" stroke="currentColor" strokeDasharray={`${(skor / 100) * K} ${K}`} />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-bold tabular-nums text-white">{skor}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white">{judul}{lokasi ? ` · ${lokasi.kelurahan}` : ""}</p>
        <p className="text-sm text-white/70">
          Skor {hasil.label.toLowerCase()} · {hasil.dicentang} dari {hasil.total} butir siap
        </p>
        {perlu > 0 && (
          <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-amber-300">
            <CalendarClock className="size-3.5" aria-hidden="true" /> {perlu} isi tas siaga perlu diganti
          </p>
        )}
      </div>
      <Link
        href="/rencana"
        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-ink hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        Buka rencana <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </motion.section>
  );
}
