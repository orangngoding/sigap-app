"use client";
import { useEffect, useState } from "react";
import { animate, useReducedMotion } from "motion/react";
import { CheckCircle2, CloudRain, Eye, Info, Sparkles } from "lucide-react";

const R = 34;
const K = 2 * Math.PI * R;
/** Skor ilustrasi: dua dari tiga tindakan hari ini dicentang. Skor asli pengguna tampil di kartu "Rencana keluarga Anda". */
const SKOR_CONTOH = 64;
const TINDAKAN = ["Bersihkan saluran air", "Isi daya ponsel", "Simpan dokumen di wadah kedap air"];

/** Cincin skor ilustrasi yang terisi sekali saat dimuat. */
function CincinSkor() {
  const diam = useReducedMotion();
  const [n, setN] = useState(0);
  useEffect(() => {
    const c = animate(0, SKOR_CONTOH, { duration: diam ? 0 : 1.4, delay: diam ? 0 : 0.7, ease: [0.2, 0, 0, 1], onUpdate: (v) => setN(Math.round(v)) });
    return () => c.stop();
  }, [diam]);
  return (
    <div className="relative size-16 shrink-0 text-primary">
      <svg viewBox="0 0 80 80" className="size-full -rotate-90">
        <circle cx="40" cy="40" r={R} fill="none" strokeWidth="8" className="stroke-muted" />
        <circle cx="40" cy="40" r={R} fill="none" strokeWidth="8" strokeLinecap="round" stroke="currentColor" strokeDasharray={`${(n / 100) * K} ${K}`} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-lg font-bold tabular-nums text-foreground">{n}</span>
    </div>
  );
}

/** Tanya-jawab Asisten: pertanyaan pengguna, titik mengetik, lalu jawaban (sekali, tidak berulang). */
function TanyaJawab() {
  const diam = useReducedMotion();
  const [siap, setSiap] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSiap(true), diam ? 0 : 2200);
    return () => clearTimeout(t);
  }, [diam]);
  return (
    <div className="space-y-2 text-xs">
      <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-primary-foreground">Nanti sore hujan lebat, apa yang perlu disiapkan?</p>
      <div className="min-h-[3.25rem] max-w-[92%] rounded-2xl rounded-bl-sm border border-border bg-background px-3 py-2">
        {siap ? (
          <p className="text-foreground [animation:sigap-masuk_400ms_both]">Bersihkan saluran di depan rumah, isi daya ponsel, dan simpan dokumen penting di wadah kedap air.</p>
        ) : (
          <span className="titik-ketik inline-flex py-1.5 text-muted-foreground" aria-hidden="true"><span /><span /><span /></span>
        )}
      </div>
    </div>
  );
}

/**
 * Pratinjau produk di hero dengan data ILUSTRASI yang ditandai jelas: satu cerita utuh (peringatan hujan lebat
 * -> tiga tindakan -> skor naik saat dicentang -> Asisten menjawab soal hujan yang sama). Data asli pengguna
 * tampil di kartu "Rencana keluarga Anda" dan Briefing di bawah, bukan di sini.
 */
export function HeroVisual() {
  return (
    <figure className="relative mx-auto w-full max-w-lg" aria-label="Contoh tampilan SIGAP dengan data ilustrasi: peringatan hujan lebat, tiga tindakan, skor kesiapsiagaan, dan jawaban Asisten">
      <div className="absolute inset-x-0 -inset-y-6 rounded-[2.5rem] bg-primary/10 blur-3xl sm:-inset-6" aria-hidden="true" />
      <div className="relative space-y-3" aria-hidden="true">
        <p data-masuk className="flex w-fit items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur">
          <Info className="size-3.5" /> Contoh tampilan · data ilustrasi, bukan data Anda
        </p>

        <div data-masuk style={{ "--tunda": "150ms" } as React.CSSProperties} className="rounded-3xl border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-1.5 text-sm font-bold text-foreground"><Sparkles className="size-4 text-primary" /> Briefing Siaga Hari Ini</p>
              <p className="text-xs text-muted-foreground">Contoh wilayah: Cawang, Jakarta Timur</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-warning px-2.5 py-1 text-xs font-semibold text-warning-foreground"><Eye className="size-3.5" /> Perhatikan</span>
          </div>
          <p className="mt-3 flex items-start gap-2 rounded-xl border border-warning-foreground/20 bg-warning/40 p-2.5 text-xs text-foreground">
            <CloudRain className="mt-0.5 size-4 shrink-0 text-warning-foreground" /> Prakiraan BMKG: hujan lebat disertai petir sore ini.
          </p>
          <ol className="mt-3 grid grid-cols-3 gap-2 text-xs">
            {TINDAKAN.map((t, i) => (
              <li key={t} className="rounded-xl border border-border bg-background p-2.5">
                <span className={`mb-1 flex size-5 items-center justify-center rounded-full text-xs font-bold ${i < 2 ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"}`}>
                  {i < 2 ? <CheckCircle2 className="size-3.5" /> : i + 1}
                </span>
                <span className="font-medium text-foreground">{t}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
          <div data-masuk style={{ "--tunda": "350ms" } as React.CSSProperties} className="flex items-center gap-3 rounded-3xl border border-border bg-surface p-4 shadow-sm">
            <CincinSkor />
            <div className="max-w-[8.5rem]">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Skor siaga</p>
              <p className="text-xs leading-snug text-foreground">Naik setiap tindakan dicentang</p>
            </div>
          </div>
          <div data-masuk style={{ "--tunda": "550ms" } as React.CSSProperties} className="rounded-3xl border border-border bg-surface p-4 shadow-sm">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><Sparkles className="size-3.5 text-primary" /> Asisten SIGAP</p>
            <TanyaJawab />
          </div>
        </div>
      </div>
    </figure>
  );
}
