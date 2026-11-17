"use client";
import { Printer } from "lucide-react";

/** Tombol cetak artikel (Blueprint 8.4: artikel dapat dicetak untuk dibagikan pengurus RT/RW). */
export function CetakArtikel() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-semibold hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <Printer className="size-4" aria-hidden="true" /> Cetak artikel
    </button>
  );
}
