"use client";
// Metronom RJP (resusitasi jantung paru) untuk orang awam: bunyi dan denyut layar 110 kali per menit agar irama
// tekan dada tepat (anjuran 100-120 per menit), dengan hitungan tekanan dan layar dijaga tetap menyala. Tanpa internet.
import { useCallback, useEffect, useRef, useState } from "react";
import { HeartPulse, PlayCircle, Square } from "lucide-react";
import { KETUKAN_RJP_PER_MENIT } from "@/lib/darurat/situasi";

const FOKUS = "focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-white";

/** Ketukan 110 per menit (bunyi + denyut layar) dan hitungan tekanan; layar dijaga tetap menyala. */
export function KetukanRjp() {
  const [aktif, setAktif] = useState(false);
  const [hitung, setHitung] = useState(0);
  const ctx = useRef<AudioContext | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const kunci = useRef<{ release: () => Promise<void> } | null>(null);

  const berhenti = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    void ctx.current?.close();
    ctx.current = null;
    void kunci.current?.release().catch(() => {});
    kunci.current = null;
    setAktif(false);
  }, []);

  const mulai = useCallback(() => {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    const c = Ctx ? new Ctx() : null;
    ctx.current = c;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request("screen").then((k) => { kunci.current = k; }).catch(() => {});
    setHitung(0);
    setAktif(true);
    const ketuk = () => {
      setHitung((h) => h + 1);
      if (!c) return;
      const o = c.createOscillator();
      const g = c.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.8, c.currentTime + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.08);
      o.connect(g).connect(c.destination);
      o.start();
      o.stop(c.currentTime + 0.1);
    };
    ketuk();
    timer.current = setInterval(ketuk, Math.round(60_000 / KETUKAN_RJP_PER_MENIT));
  }, []);

  useEffect(() => berhenti, [berhenti]);

  return (
    <div className="rounded-2xl border-2 border-white/80 p-4">
      <p className="flex items-center gap-2 text-xl font-extrabold"><HeartPulse className="size-6 text-red-400" aria-hidden="true" /> Ketukan RJP</p>
      <p className="mt-1 text-base text-white/80">Tekan dada setiap kali berbunyi ({KETUKAN_RJP_PER_MENIT} kali per menit). Jangan berhenti sampai bantuan datang.</p>
      {aktif && (
        <div className="mt-3 flex items-center gap-4" aria-live="off">
          <span key={hitung} className="ketuk-rjp flex size-20 shrink-0 items-center justify-center rounded-full bg-red-600 text-2xl font-black" aria-hidden="true">{hitung}</span>
          <p className="text-lg font-bold">Tekan keras dan cepat, sekitar 5 cm.</p>
        </div>
      )}
      <button
        type="button" aria-pressed={aktif} onClick={() => (aktif ? berhenti() : mulai())}
        className={`mt-3 inline-flex min-h-16 w-full items-center justify-center gap-2 rounded-2xl text-xl font-extrabold ${aktif ? "border-2 border-white" : "bg-red-600 hover:bg-red-500"} ${FOKUS}`}
      >
        {aktif ? <><Square className="size-6 fill-current" aria-hidden="true" /> Hentikan ketukan</> : <><PlayCircle className="size-6" aria-hidden="true" /> Mulai ketukan RJP</>}
      </button>
    </div>
  );
}

