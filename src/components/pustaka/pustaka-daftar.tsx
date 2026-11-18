"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, Clock, Search, X } from "lucide-react";
import { HAZARD_BY_ID } from "@/lib/hazards/hazards";
import type { Foto as DataFoto } from "@/lib/gambar";
import { Foto } from "@/components/global/foto";
import type { HazardId } from "@/types";

export interface ArtikelKartu {
  slug: string;
  title: string;
  ringkasan: string;
  hazards: string[];
  kategori: string;
  menit: number;
  foto: DataFoto;
}

const KATEGORI = ["Bencana", "Iklim", "Keluarga", "Komunitas"];

const namaHazard = (h: string) => (h === "umum" ? "Umum" : (HAZARD_BY_ID[h as HazardId]?.label ?? h));
const norm = (s: string) => s.toLowerCase();

/** Daftar artikel bersampul foto, dengan pencarian dan filter di sisi klien (Blueprint 8.4). */
export function PustakaDaftar({ artikel }: { artikel: ArtikelKartu[] }) {
  const [kata, setKata] = useState("");
  const [bahaya, setBahaya] = useState<string>("semua");
  const [kategori, setKategori] = useState<string>("semua");

  const opsi = useMemo(() => Array.from(new Set(artikel.flatMap((a) => a.hazards))), [artikel]);
  const tampil = useMemo(() => {
    const q = norm(kata.trim());
    return artikel.filter(
      (a) =>
        (bahaya === "semua" || a.hazards.includes(bahaya)) &&
        (kategori === "semua" || a.kategori === kategori) &&
        (!q || norm(`${a.title} ${a.ringkasan}`).includes(q)),
    );
  }, [artikel, kata, bahaya, kategori]);

  const chip = (aktif: boolean) =>
    `relative min-h-10 rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${aktif ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`;
  const adaFilter = kata || bahaya !== "semua" || kategori !== "semua";

  return (
    <div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div role="group" aria-label="Filter kategori" className="flex flex-wrap gap-1 rounded-full border border-border bg-surface p-1">
          {["semua", ...KATEGORI].map((k) => (
            <button key={k} type="button" aria-pressed={kategori === k} onClick={() => setKategori(k)} className={chip(kategori === k)}>
              {kategori === k && <motion.span layoutId="kategori-aktif" className="absolute inset-0 -z-0 rounded-full bg-primary" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
              <span className="relative">{k === "semua" ? "Semua" : k}</span>
            </button>
          ))}
        </div>
        <div className="relative w-full lg:max-w-sm">
          <label htmlFor="cari-pustaka" className="sr-only">Cari artikel</label>
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            id="cari-pustaka" type="search" value={kata} onChange={(e) => setKata(e.target.value)}
            placeholder="Cari, misalnya: tas siaga"
            className="min-h-12 w-full rounded-full border border-border bg-surface pl-11 pr-4 text-sm shadow-sm focus-visible:outline-2 focus-visible:outline-primary"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <label htmlFor="filter-bahaya" className="text-sm font-semibold text-foreground">Bahaya</label>
        <select
          id="filter-bahaya" value={bahaya} onChange={(e) => setBahaya(e.target.value)}
          className="min-h-10 rounded-full border border-border bg-surface px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-primary"
        >
          <option value="semua">Semua bahaya</option>
          {opsi.map((h) => <option key={h} value={h}>{namaHazard(h)}</option>)}
        </select>
        <p role="status" className="text-sm text-muted-foreground">{tampil.length} artikel</p>
        {adaFilter && (
          <button type="button" onClick={() => { setKata(""); setBahaya("semua"); setKategori("semua"); }} className="inline-flex min-h-10 items-center gap-1 rounded-full px-3 text-sm font-medium text-primary hover:bg-primary/5">
            <X className="size-4" aria-hidden="true" /> Hapus filter
          </button>
        )}
      </div>

      {tampil.length === 0 ? (
        <p className="mt-8 rounded-3xl border border-dashed border-border bg-surface p-10 text-center text-sm text-muted-foreground">
          Belum ada artikel yang cocok. Coba kata lain atau hapus filter.
        </p>
      ) : (
        <motion.ul layout className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence initial={false}>
            {tampil.map((a, i) => (
              <motion.li
                key={a.slug} layout
                initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.25 }}
                className={i === 0 && !adaFilter ? "sm:col-span-2" : ""}
              >
                <Link
                  href={`/pustaka/${a.slug}`}
                  className="angkat group flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <div className="relative">
                    <Foto foto={a.foto} hias zoom sizes={i === 0 && !adaFilter ? "(min-width: 1024px) 66vw, 100vw" : "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"} className={i === 0 && !adaFilter ? "aspect-[16/8]" : "aspect-[16/10]"} />
                    <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-foreground shadow-sm backdrop-blur">{a.kategori}</span>
                    <span className="absolute right-4 top-4 flex size-9 items-center justify-center rounded-full bg-white/90 text-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                      <ArrowUpRight className="size-4" aria-hidden="true" />
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <h2 className="text-lg font-bold leading-snug text-foreground group-hover:text-primary">{a.title}</h2>
                    <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground">{a.ringkasan}</p>
                    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Clock className="size-3.5" aria-hidden="true" /> {a.menit} menit baca</span>
                      {a.hazards.map((h) => <span key={h} className="rounded-full bg-muted px-2.5 py-0.5">{namaHazard(h)}</span>)}
                    </div>
                  </div>
                </Link>
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      )}
    </div>
  );
}
