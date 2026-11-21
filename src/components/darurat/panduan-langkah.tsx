"use client";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Volume2, VolumeX, X } from "lucide-react";
import { useBacakan } from "@/hooks/use-suara";

const FOKUS = "focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-white";

/**
 * Satu langkah per layar dengan huruf sangat besar: lebih mudah diikuti saat panik daripada daftar panjang.
 * Bisa dibacakan otomatis setiap pindah langkah. Panah kiri/kanan dan Esc untuk papan ketik.
 */
/** Satu langkah: teks biasa (situasi kritis) atau perintah dengan keadaan dan penjelasan (langkah per bencana). */
export type ItemPanduan = string | { teks: string; detail?: string; keadaan?: string };
const teksItem = (x: ItemPanduan) => (typeof x === "string" ? x : `${x.keadaan ? `${x.keadaan}: ` : ""}${x.teks}.${x.detail ? ` ${x.detail}` : ""}`);

export function PanduanLangkah({ judul, langkah, onTutup }: { judul: string; langkah: ItemPanduan[]; onTutup: () => void }) {
  const [i, setI] = useState(0);
  const [baca, setBaca] = useState(false);
  const suara = useBacakan();
  const terakhir = i === langkah.length - 1;

  useEffect(() => {
    if (baca && suara.didukung) suara.baca(`langkah-${i}`, `Langkah ${i + 1}. ${teksItem(langkah[i])}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, baca]);

  useEffect(() => {
    const tombol = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setI((x) => Math.min(langkah.length - 1, x + 1));
      if (e.key === "ArrowLeft") setI((x) => Math.max(0, x - 1));
      if (e.key === "Escape") onTutup();
    };
    window.addEventListener("keydown", tombol);
    return () => {
      window.removeEventListener("keydown", tombol);
      suara.berhenti();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [langkah.length, onTutup]);

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`Panduan langkah: ${judul}`} className="fixed inset-0 z-[90] flex flex-col bg-black px-5 py-6 text-white">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3">
        <p className="text-lg font-bold text-yellow-300">{judul}</p>
        <button type="button" onClick={onTutup} autoFocus className={`inline-flex size-14 items-center justify-center rounded-2xl border-2 border-white ${FOKUS}`} aria-label="Tutup panduan langkah">
          <X className="size-6" aria-hidden="true" />
        </button>
      </div>

      <div className="mx-auto mt-4 flex w-full max-w-3xl gap-1.5" aria-hidden="true">
        {langkah.map((_, k) => <span key={k} className={`h-2 flex-1 rounded-full ${k <= i ? "bg-yellow-300" : "bg-white/25"}`} />)}
      </div>

      <div className="mx-auto flex w-full max-w-3xl flex-1 items-center" aria-live="assertive">
        <AnimatePresence mode="wait">
          <motion.div key={i} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.22 }}>
            <p className="text-2xl font-bold text-yellow-300">Langkah {i + 1} dari {langkah.length}</p>
            {typeof langkah[i] === "string" ? (
              <p className="mt-4 text-4xl font-extrabold leading-tight sm:text-5xl">{langkah[i] as string}</p>
            ) : (
              <>
                {(langkah[i] as Exclude<ItemPanduan, string>).keadaan && <p className="mt-3 inline-block rounded-full border-2 border-white/70 px-3 py-1 text-lg font-bold">{(langkah[i] as Exclude<ItemPanduan, string>).keadaan}</p>}
                <p className="mt-4 text-4xl font-extrabold leading-tight sm:text-5xl">{(langkah[i] as Exclude<ItemPanduan, string>).teks}</p>
                {(langkah[i] as Exclude<ItemPanduan, string>).detail && <p className="mt-5 text-2xl leading-snug text-white/90">{(langkah[i] as Exclude<ItemPanduan, string>).detail}</p>}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mx-auto grid w-full max-w-3xl gap-3">
        {suara.didukung && (
          <button type="button" aria-pressed={baca} onClick={() => { setBaca((b) => !b); if (baca) suara.berhenti(); }} className={`inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 border-white text-lg font-bold ${FOKUS}`}>
            {baca ? <VolumeX className="size-6" aria-hidden="true" /> : <Volume2 className="size-6" aria-hidden="true" />} {baca ? "Matikan suara" : "Bacakan setiap langkah"}
          </button>
        )}
        <div className="grid grid-cols-2 gap-3">
          <button type="button" disabled={i === 0} onClick={() => setI((x) => x - 1)} className={`inline-flex min-h-16 items-center justify-center gap-2 rounded-2xl border-2 border-white text-xl font-bold disabled:opacity-30 ${FOKUS}`}>
            <ArrowLeft className="size-6" aria-hidden="true" /> Kembali
          </button>
          <button type="button" onClick={() => (terakhir ? onTutup() : setI((x) => x + 1))} className={`inline-flex min-h-16 items-center justify-center gap-2 rounded-2xl bg-yellow-300 text-xl font-extrabold text-black ${FOKUS}`}>
            {terakhir ? "Selesai" : <>Lanjut <ArrowRight className="size-6" aria-hidden="true" /></>}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
