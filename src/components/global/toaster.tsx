"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import { DURASI_TOAST_MS, dengarkanToast, type PesanToast } from "@/lib/toast";

/** Penampil toast global. Diumumkan lewat wilayah live yang sopan agar terbaca pembaca layar. */
export function Toaster() {
  const [daftar, setDaftar] = useState<PesanToast[]>([]);

  useEffect(
    () =>
      dengarkanToast((p) => {
        setDaftar((d) => [...d.slice(-2), p]);
        setTimeout(() => setDaftar((d) => d.filter((x) => x.id !== p.id)), DURASI_TOAST_MS);
      }),
    [],
  );

  return (
    <div aria-live="polite" role="status" className="tanpa-cetak pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50 flex flex-col items-center gap-2 px-4 lg:bottom-6">
      {daftar.map((t) => (
        <div key={t.id} className="pointer-events-auto flex max-w-md items-center gap-3 rounded-xl bg-foreground px-4 py-3 text-sm text-background shadow-lg motion-safe:animate-in motion-safe:fade-in">
          <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
          <span className="flex-1">{t.teks}</span>
          <button type="button" onClick={() => setDaftar((d) => d.filter((x) => x.id !== t.id))} className="rounded p-1 hover:bg-background/20" aria-label="Tutup pemberitahuan">
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
