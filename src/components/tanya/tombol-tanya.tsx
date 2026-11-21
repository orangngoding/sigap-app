"use client";
import { Sparkles } from "lucide-react";
import { useAsistenUi } from "@/stores/asisten-ui-store";
import { usePihak } from "@/components/rencana/teks-pihak";

/** Tombol kecil "Tanya Asisten": membuka panel Asisten dan langsung mengirim pertanyaan tentang konteks ini. */
export function TombolTanya({ pertanyaan, label = "Tanya Asisten", className = "" }: { pertanyaan: string; label?: string; className?: string }) {
  const tanyakan = useAsistenUi((s) => s.tanyakan);
  const { s: sebut } = usePihak();
  return (
    <button
      type="button"
      onClick={() => tanyakan(sebut(pertanyaan))}
      className={`tanpa-cetak inline-flex min-h-8 items-center any-pointer-coarse:min-h-11 gap-1.5 rounded-full border border-primary/25 bg-primary/5 px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${className}`}
    >
      <Sparkles className="size-3.5" aria-hidden="true" /> {sebut(label)}
    </button>
  );
}
