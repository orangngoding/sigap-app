"use client";
import Link from "next/link";
import { CalendarPlus, CheckCircle2, ListPlus } from "lucide-react";
import { useAksiIklimStore, type AksiIklim } from "@/stores/aksi-iklim-store";

/**
 * Masukkan satu tindakan adaptasi ke rencana keluarga (tab Tindakan di Rencana). Setelah masuk, pengingat kalender
 * ditawarkan di tempat yang sama: satu alur, bukan dua tombol yang mirip.
 */
export function TombolMasukRencana({ aksi, onKalender }: { aksi: Omit<AksiIklim, "ditambahPada">; onKalender?: () => void }) {
  const ada = useAksiIklimStore((s) => s.aksi.some((x) => x.id === aksi.id));
  const tambah = useAksiIklimStore((s) => s.tambah);
  if (ada)
    return (
      <div role="status" className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-semibold text-primary">
        <span className="inline-flex min-h-11 items-center gap-2"><CheckCircle2 className="size-4" aria-hidden="true" /> Sudah ada di rencana keluarga.</span>
        <Link href="/rencana?tab=tindakan" className="inline-flex min-h-11 items-center underline underline-offset-2">Lihat di Rencana</Link>
        {onKalender && (
          <button type="button" onClick={onKalender} className="inline-flex min-h-11 items-center gap-1.5 underline underline-offset-2">
            <CalendarPlus className="size-4" aria-hidden="true" /> Pasang pengingat di kalender
          </button>
        )}
      </div>
    );
  return (
    <button type="button" onClick={() => tambah(aksi)} className="press inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90">
      <ListPlus className="size-4" aria-hidden="true" /> Masukkan ke rencana keluarga
    </button>
  );
}
