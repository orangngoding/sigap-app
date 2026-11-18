"use client";
import { useEffect, useState } from "react";
import { animate, useReducedMotion } from "motion/react";
import { CloudSun, Eye, Sparkles } from "lucide-react";

const R = 34;
const K = 2 * Math.PI * R;
const SKOR = 72;

/** Cincin skor yang terisi sekali saat dimuat (angka ikut menghitung naik). */
function CincinSkor() {
  const diam = useReducedMotion();
  const [n, setN] = useState(0);
  useEffect(() => {
    const c = animate(0, SKOR, { duration: diam ? 0 : 1.4, delay: diam ? 0 : 0.7, ease: [0.2, 0, 0, 1], onUpdate: (v) => setN(Math.round(v)) });
    return () => c.stop();
  }, [diam]);
  return (
    <div className="relative size-20 shrink-0 text-primary" aria-hidden="true">
      <svg viewBox="0 0 80 80" className="size-full -rotate-90">
        <circle cx="40" cy="40" r={R} fill="none" strokeWidth="8" className="stroke-muted" />
        <circle cx="40" cy="40" r={R} fill="none" strokeWidth="8" strokeLinecap="round" stroke="currentColor" strokeDasharray={`${(n / 100) * K} ${K}`} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xl font-bold tabular-nums text-foreground">{n}</span>
    </div>
  );
}

/** Balon Asisten: titik mengetik dulu, lalu jawaban muncul (sekali, tidak berulang). */
function BalonAsisten() {
  const diam = useReducedMotion();
  const [siap, setSiap] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSiap(true), diam ? 0 : 2200);
    return () => clearTimeout(t);
  }, [diam]);
  return (
    <div className="min-h-[4.5rem] rounded-2xl rounded-bl-sm border border-border bg-background px-3 py-2.5 text-sm">
      {siap ? (
        <p className="text-foreground [animation:sigap-masuk_400ms_both]">Taruh obat rutin nenek dan senter di dekat pintu, lalu tentukan siapa yang mendampinginya.</p>
      ) : (
        <span className="titik-ketik inline-flex py-2 text-muted-foreground" aria-hidden="true"><span /><span /><span /></span>
      )}
    </div>
  );
}

/** Pratinjau produk di hero: tampilan SIGAP sungguhan (Briefing, skor, Asisten) dengan data contoh. */
export function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-lg" role="img" aria-label="Contoh tampilan SIGAP: Briefing Siaga Hari Ini, skor kesiapsiagaan 72, dan jawaban Asisten">
      <div className="absolute inset-x-0 -inset-y-6 rounded-[2.5rem] bg-primary/10 blur-3xl sm:-inset-6" aria-hidden="true" />
      <div className="relative space-y-3" aria-hidden="true">
        <div data-masuk style={{ "--tunda": "150ms" } as React.CSSProperties} className="rounded-3xl border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-1.5 text-sm font-bold text-foreground"><Sparkles className="size-4 text-primary" /> Briefing Siaga Hari Ini</p>
              <p className="text-xs text-muted-foreground">Cawang, Kramat Jati · Contoh</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-warning px-2.5 py-1 text-xs font-semibold text-warning-foreground"><Eye className="size-3.5" /> Perhatikan</span>
          </div>
          <p className="mt-3 flex items-start gap-2 rounded-xl border border-warning-foreground/20 bg-warning/40 p-2.5 text-xs text-foreground">
            <CloudSun className="mt-0.5 size-4 shrink-0 text-warning-foreground" /> Peringatan dini BMKG: hujan lebat disertai petir di provinsi Anda.
          </p>
          <ol className="mt-3 grid grid-cols-3 gap-2 text-xs">
            {["Bersihkan saluran air", "Siapkan obat nenek", "Isi daya ponsel"].map((t, i) => (
              <li key={t} className="rounded-xl border border-border bg-background p-2.5">
                <span className="mb-1 flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">{i + 1}</span>
                <span className="font-medium text-foreground">{t}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="grid grid-cols-[auto_1fr] gap-3">
          <div data-masuk style={{ "--tunda": "350ms" } as React.CSSProperties} className="flex items-center gap-3 rounded-3xl border border-border bg-surface p-4 shadow-sm">
            <CincinSkor />
            <div className="pr-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Skor</p>
              <p className="font-bold text-foreground">Siap</p>
            </div>
          </div>
          <div data-masuk style={{ "--tunda": "550ms" } as React.CSSProperties} className="rounded-3xl border border-border bg-surface p-4 shadow-sm">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><Sparkles className="size-3.5 text-primary" /> Asisten SIGAP</p>
            <BalonAsisten />
          </div>
        </div>
      </div>
    </div>
  );
}
