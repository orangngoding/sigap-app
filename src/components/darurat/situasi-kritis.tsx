"use client";
// Situasi kritis: tujuh keadaan yang menentukan nyawa dalam hitungan menit, apa pun bencananya. Satu ketuk membuka
// layar penuh: tombol telepon nomor yang tepat, langkah berhuruf besar, alat yang relevan, dan sumbernya.
// Semua berjalan tanpa internet (isi ikut terkemas di aplikasi; suara metronom dibuat Web Audio).
import { createPortal } from "react-dom";
import { useCallback, useEffect, useState } from "react";
import { Activity, Droplet, Flame, HeartPulse, Megaphone, MessageSquare, Phone, PlayCircle, Square, UserSearch, Waves, Wind, X, type LucideIcon } from "lucide-react";
import { SITUASI, type Situasi } from "@/lib/darurat/situasi";
import { usePeluit } from "./alat-darurat";
import { KetukanRjp } from "./ketukan-rjp";
import { PanduanLangkah } from "./panduan-langkah";

const FOKUS = "focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-white";

const IKON: Record<Situasi["id"], LucideIcon> = {
  terjebak: Activity,
  perdarahan: Droplet,
  "tidak-bernapas": HeartPulse,
  kebakaran: Flame,
  "bau-gas": Wind,
  "arus-banjir": Waves,
  terpisah: UserSearch,
};

function AlatPeluit() {
  const p = usePeluit();
  return (
    <button
      type="button" aria-pressed={p.aktif} onClick={() => (p.aktif ? p.berhenti() : void p.mulai())}
      className={`inline-flex min-h-16 w-full items-center justify-center gap-2 rounded-2xl text-xl font-extrabold ${p.aktif ? "animate-pulse bg-red-600 motion-reduce:animate-none" : "border-2 border-white"} ${FOKUS}`}
    >
      {p.aktif ? <><Square className="size-6 fill-current" aria-hidden="true" /> Hentikan peluit SOS</> : <><Megaphone className="size-6 text-yellow-300" aria-hidden="true" /> Bunyikan peluit SOS</>}
    </button>
  );
}

function LayarSituasi({ s, onTutup, onKabari }: { s: Situasi; onTutup: () => void; onKabari: () => void }) {
  const [pandu, setPandu] = useState(false);
  const tutupPandu = useCallback(() => setPandu(false), []);
  const Ikon = IKON[s.id];

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape" && !pandu) onTutup(); };
    window.addEventListener("keydown", esc);
    const lama = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", esc);
      document.body.style.overflow = lama;
    };
  }, [onTutup, pandu]);

  return createPortal(
    <div role="dialog" aria-modal="true" aria-labelledby="judul-situasi" className="fixed inset-0 z-[80] overflow-y-auto bg-black px-4 py-5 text-[19px] text-white">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-start justify-between gap-3">
          <h2 id="judul-situasi" className="flex items-center gap-3 text-3xl font-extrabold leading-tight"><Ikon className="size-8 shrink-0 text-yellow-300" aria-hidden="true" /> {s.judul}</h2>
          <button type="button" onClick={onTutup} autoFocus className={`inline-flex size-14 shrink-0 items-center justify-center rounded-2xl border-2 border-white ${FOKUS}`} aria-label="Tutup">
            <X className="size-6" aria-hidden="true" />
          </button>
        </div>

        <a href={`tel:${s.nomor.nomor}`} className={`mt-4 flex min-h-20 items-center justify-center gap-3 rounded-3xl bg-red-600 px-5 text-2xl font-black hover:bg-red-500 ${FOKUS}`}>
          <Phone className="size-8" aria-hidden="true" /> Telepon {s.nomor.label}
        </a>
        {s.nomor.nomor !== "112" && <a href="tel:112" className={`mt-2 inline-flex min-h-12 items-center text-lg font-bold underline underline-offset-4 ${FOKUS}`}>Atau telepon 112</a>}

        <ol className="mt-5 space-y-2">
          {s.langkah.map((l, i) => (
            <li key={l} className="flex gap-4 rounded-2xl bg-white/10 p-4 text-xl font-bold leading-snug">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-yellow-300 text-lg font-black text-black" aria-hidden="true">{i + 1}</span>
              <span className="pt-1">{l}</span>
            </li>
          ))}
        </ol>

        <div className="mt-4 grid gap-3">
          <button type="button" onClick={() => setPandu(true)} className={`inline-flex min-h-16 items-center justify-center gap-3 rounded-2xl bg-yellow-300 px-5 text-xl font-extrabold text-black ${FOKUS}`}>
            <PlayCircle className="size-7" aria-hidden="true" /> Pandu saya satu per satu
          </button>
          {s.alat === "ketukan-rjp" && <KetukanRjp />}
          {s.alat === "peluit" && <AlatPeluit />}
          {s.alat === "kabari" && (
            <button type="button" onClick={onKabari} className={`inline-flex min-h-16 items-center justify-center gap-2 rounded-2xl border-2 border-white text-xl font-extrabold ${FOKUS}`}>
              <MessageSquare className="size-6 text-yellow-300" aria-hidden="true" /> Kabari keluarga lewat SMS
            </button>
          )}
        </div>

        <p className="mt-5 text-base text-white/75">
          Sumber: {s.sumber.map((x, i) => <span key={x.url}>{i > 0 && "; "}<a href={x.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">{x.nama}</a></span>)}. Panduan singkat ini bukan pengganti pelatihan pertolongan pertama; ikuti arahan petugas.
        </p>
      </div>
      {pandu && <PanduanLangkah judul={s.judul} langkah={s.langkah} onTutup={tutupPandu} />}
    </div>,
    document.body,
  );
}

/** Kisi tombol situasi kritis. `onKabari` membawa pengguna ke bagian Kabari keluarga. */
export function SituasiKritis({ onKabari }: { onKabari: () => void }) {
  const [buka, setBuka] = useState<Situasi | null>(null);
  const tutup = useCallback(() => setBuka(null), []);
  return (
    <section aria-labelledby="d-situasi" className="mt-8">
      <h2 id="d-situasi" className="text-2xl font-bold">Butuh pertolongan pertama?</h2>
      <p className="mt-1 text-base text-white/80">Ketuk keadaannya untuk langkah penyelamatan nyawa sambil menunggu bantuan.</p>
      {/* Satu baris per situasi: tujuh pilihan muat dalam setengah layar HP. */}
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {SITUASI.map((s) => {
          const Ikon = IKON[s.id];
          return (
            <li key={s.id}>
              <button type="button" onClick={() => setBuka(s)} aria-label={`${s.judul}: ${s.ringkas}`} className={`flex min-h-14 w-full items-center gap-3 rounded-2xl border-2 border-red-400/70 bg-red-950/60 px-4 py-2 text-left hover:border-red-300 hover:bg-red-900/60 ${FOKUS}`}>
                <Ikon className="size-6 shrink-0 text-red-300" aria-hidden="true" />
                <span className="text-lg font-extrabold leading-tight">{s.judul}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {buka && <LayarSituasi s={buka} onTutup={tutup} onKabari={() => { setBuka(null); onKabari(); }} />}
    </section>
  );
}
