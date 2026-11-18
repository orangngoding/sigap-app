"use client";
import type { HasilSkor } from "@/lib/preparedness/skor";
import { useAngkaHalus } from "@/hooks/use-angka-halus";

const WARNA: Record<HasilSkor["label"], string> = {
  "Baru mulai": "text-warning-foreground",
  "Cukup siap": "text-info-foreground",
  Siap: "text-primary",
  "Sangat siap": "text-success-foreground",
};

/** Cincin skor 0-100 (Blueprint 7.2 dan 16.3): angka besar, label teks selalu tampil, dan dibaca sebagai meter. */
export function SkorPanel({ hasil, catatan, tanpaLangkah = false }: { hasil: HasilSkor; catatan?: string; tanpaLangkah?: boolean }) {
  const R = 52;
  const K = 2 * Math.PI * R;
  const tampil = useAngkaHalus(hasil.skor);
  const isi = (tampil / 100) * K;
  return (
    <section aria-labelledby="judul-skor" className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <h2 id="judul-skor" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Skor kesiapsiagaan</h2>
      <div className="mt-4 flex flex-wrap items-center gap-6">
        <div
          role="meter" aria-label="Skor kesiapsiagaan" aria-valuemin={0} aria-valuemax={100} aria-valuenow={hasil.skor}
          aria-valuetext={`${hasil.skor} dari 100, ${hasil.label}`} className={`relative size-32 shrink-0 ${WARNA[hasil.label]}`}
        >
          <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden="true">
            <circle cx="60" cy="60" r={R} fill="none" strokeWidth="10" className="stroke-muted" />
            <circle
              cx="60" cy="60" r={R} fill="none" strokeWidth="10" strokeLinecap="round" stroke="currentColor"
              strokeDasharray={`${isi} ${K}`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold tabular-nums text-foreground">{tampil}</span>
            <span className="text-xs text-muted-foreground">dari 100</span>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xl font-bold text-foreground">{hasil.label}</p>
          <p className="mt-1 text-sm text-muted-foreground">{hasil.dicentang} dari {hasil.total} butir sudah dicentang.</p>
          {tanpaLangkah ? null : hasil.langkahBerikutnya ? (
            <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm text-foreground">
              <span className="font-semibold">Langkah berikutnya:</span> {hasil.langkahBerikutnya.judul}.
            </p>
          ) : (
            <p className="mt-3 rounded-lg bg-success px-3 py-2 text-sm font-medium text-success-foreground">Semua butir sudah dicentang.</p>
          )}
          {catatan && <p className="mt-3 text-xs text-muted-foreground">{catatan}</p>}
        </div>
      </div>
    </section>
  );
}
