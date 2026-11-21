"use client";
// Uji pemahaman singkat (sebelum atau sesudah simulasi): satu soal per layar, TANPA umpan balik, agar mengukur
// pemahaman yang sebenarnya. Soal dari skenario bank yang ditulis tim, bukan dari AI.
import { useRef, useEffect, useState } from "react";
import { ArrowRight, ClipboardCheck } from "lucide-react";
import type { SoalUji } from "@/lib/simulasi/uji";

const TOMBOL = "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50";

export function UjiPemahaman({ soal, judul, keterangan, onSelesai }: { soal: SoalUji[]; judul: string; keterangan: string; onSelesai: (jawaban: Record<string, number>) => void }) {
  const [i, setI] = useState(0);
  const [jawaban, setJawaban] = useState<Record<string, number>>({});
  const judulRef = useRef<HTMLHeadingElement>(null);
  const q = soal[i];
  const dipilih = q ? jawaban[q.id] : undefined;
  const terakhir = i === soal.length - 1;

  useEffect(() => { judulRef.current?.focus(); }, [i]);

  if (!q) return null;
  return (
    <section aria-labelledby="judul-uji" className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
      <p className="flex items-center gap-2 text-sm font-semibold text-primary"><ClipboardCheck className="size-4" aria-hidden="true" /> {judul}</p>
      <p className="mt-1 text-sm text-muted-foreground">{keterangan}</p>
      <div className="mt-4 flex gap-1.5" aria-hidden="true">
        {soal.map((s, k) => <span key={s.id} className={`h-1.5 flex-1 rounded-full ${k < i ? "bg-primary" : k === i ? "bg-primary/60" : "bg-muted"}`} />)}
      </div>
      <h2 id="judul-uji" ref={judulRef} tabIndex={-1} className="mt-5 text-lg font-bold leading-snug text-foreground focus:outline-none">
        <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Soal {i + 1} dari {soal.length}</span>
        {q.situasi}
      </h2>
      {q.pesan.length > 0 && (
        <ul className="mt-3 space-y-2">
          {q.pesan.map((p) => (
            <li key={`${p.dari}-${p.jam}`} className="rounded-2xl border border-border bg-muted/50 p-3 text-sm">
              <span className="flex justify-between gap-2 text-xs font-semibold text-muted-foreground"><span>{p.dari}</span><span className="tabular-nums">{p.jam}</span></span>
              <span className={`mt-1 block text-foreground ${p.jenis === "medsos" ? "italic" : ""}`}>{p.teks}</span>
            </li>
          ))}
        </ul>
      )}
      <fieldset className="mt-4">
        <legend className="sr-only">Pilih tindakan terbaik</legend>
        <div className="grid gap-2">
          {q.pilihan.map((p, k) => (
            <label key={p.teks} className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border-2 p-3 text-sm font-medium transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary ${dipilih === k ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}>
              <input type="radio" name={`uji-${q.id}`} className="sr-only" checked={dipilih === k} onChange={() => setJawaban((j) => ({ ...j, [q.id]: k }))} />
              <span className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${dipilih === k ? "border-primary bg-primary text-primary-foreground" : "border-border"}`} aria-hidden="true">{String.fromCharCode(65 + k)}</span>
              {p.teks}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="mt-5 flex justify-end">
        <button type="button" disabled={dipilih === undefined} onClick={() => (terakhir ? onSelesai(jawaban) : setI((x) => x + 1))} className={TOMBOL}>
          {terakhir ? "Selesai" : "Soal berikutnya"} <ArrowRight className="size-4" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
