"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Clock, Search } from "lucide-react";
import { HAZARD_BY_ID } from "@/lib/hazards/hazards";
import type { HazardId } from "@/types";

export interface ArtikelKartu {
  slug: string;
  title: string;
  ringkasan: string;
  hazards: string[];
  kategori: string;
  menit: number;
}

const KATEGORI = ["Bencana", "Iklim", "Keluarga", "Komunitas"];

const namaHazard = (h: string) => (h === "umum" ? "Umum" : (HAZARD_BY_ID[h as HazardId]?.label ?? h));
const norm = (s: string) => s.toLowerCase();

/** Daftar artikel dengan pencarian teks dan filter bahaya, seluruhnya di sisi klien (Blueprint 8.4). */
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
    `min-h-11 rounded-full border px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${aktif ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface"}`;

  return (
    <div>
      <div className="mt-6">
        <label htmlFor="cari-pustaka" className="block text-sm font-semibold">Cari artikel</label>
        <div className="relative mt-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            id="cari-pustaka"
            type="search"
            value={kata}
            onChange={(e) => setKata(e.target.value)}
            placeholder="Misalnya: tas siaga"
            className="min-h-11 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm"
          />
        </div>
      </div>

      <p className="mt-4 text-sm font-semibold">Kategori</p>
      <div role="group" aria-label="Filter kategori" className="mt-2 flex flex-wrap gap-2">
        {["semua", ...KATEGORI].map((k) => (
          <button key={k} type="button" aria-pressed={kategori === k} onClick={() => setKategori(k)} className={chip(kategori === k)}>
            {k === "semua" ? "Semua kategori" : k}
          </button>
        ))}
      </div>

      <p className="mt-4 text-sm font-semibold">Bahaya</p>
      <div role="group" aria-label="Filter bahaya" className="mt-2 flex flex-wrap gap-2">
        {["semua", ...opsi].map((h) => (
          <button key={h} type="button" aria-pressed={bahaya === h} onClick={() => setBahaya(h)} className={chip(bahaya === h)}>
            {h === "semua" ? "Semua bahaya" : namaHazard(h)}
          </button>
        ))}
      </div>

      <p role="status" className="mt-4 text-sm text-muted-foreground">{tampil.length} artikel ditemukan.</p>

      {tampil.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted-foreground">
          Belum ada artikel yang cocok. Coba kata lain atau pilih &ldquo;Semua&rdquo;.
        </p>
      ) : (
        <ul className="mt-4 space-y-4">
          {tampil.map((a) => (
            <li key={a.slug}>
              <Link href={`/pustaka/${a.slug}`} className="block rounded-2xl border border-border bg-surface p-5 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                <h2 className="text-lg font-bold">{a.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{a.ringkasan}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Clock className="size-3.5" aria-hidden="true" /> {a.menit} menit baca</span>
                  <span className="rounded-full border border-border px-2 py-0.5">{a.kategori}</span>
                  {a.hazards.map((h) => (
                    <span key={h} className="rounded-full bg-muted px-2 py-0.5">{namaHazard(h)}</span>
                  ))}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
