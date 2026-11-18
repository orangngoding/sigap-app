"use client";
import { useEffect, useState } from "react";
import { Dialog } from "radix-ui";
import { PanelLeft, Plus, X } from "lucide-react";
import { DaftarSesi } from "./daftar-sesi";
import { useTanyaStore } from "@/stores/tanya-store";
import { AsistenChat } from "./asisten-chat";

const KUNCI_PREFILL = "sigap:v1:prefill-peringatan";

/**
 * Halaman Asisten SIGAP. "Jelaskan Peringatan" kini menyatu di percakapan: teks peringatan yang ditempel
 * otomatis dijelaskan. Teks yang disiapkan lewat tautan lama (?tab=terjemah) tetap dijalankan sekali.
 */
export function TanyaView() {
  useEffect(() => {
    let teks: string | null = null;
    try {
      teks = sessionStorage.getItem(KUNCI_PREFILL);
      if (teks) sessionStorage.removeItem(KUNCI_PREFILL);
    } catch {
      /* sessionStorage tidak tersedia */
    }
    if (teks) void useTanyaStore.getState().jelaskanPeringatan(teks);
  }, []);

  const [laci, setLaci] = useState(false);
  const judul = useTanyaStore((x) => x.sesi.find((y) => y.id === x.aktif)?.judul);

  return (
    <div className="flex h-[calc(100svh-4rem-4rem)] min-h-[34rem] gap-6 md:h-[calc(100svh-4rem)]">
      {/* Desktop: riwayat di samping */}
      <aside className="hidden w-72 shrink-0 border-r border-border/70 py-5 pr-5 lg:block" aria-label="Riwayat percakapan">
        <DaftarSesi />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center gap-3 border-b border-border/70 py-4">
          <Dialog.Root open={laci} onOpenChange={setLaci}>
            <Dialog.Trigger asChild>
              <button type="button" className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-surface hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary lg:hidden" aria-label="Buka riwayat percakapan">
                <PanelLeft className="size-5" aria-hidden="true" />
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-50 bg-foreground/30 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
              <Dialog.Content className="fixed inset-y-0 left-0 z-50 flex w-[86vw] max-w-sm flex-col bg-background p-4 shadow-2xl data-[state=open]:animate-in data-[state=open]:slide-in-from-left" aria-describedby={undefined}>
                <div className="mb-3 flex items-center justify-between">
                  <Dialog.Title className="text-base font-bold">Riwayat percakapan</Dialog.Title>
                  <Dialog.Close className="inline-flex size-10 items-center justify-center rounded-lg hover:bg-muted" aria-label="Tutup riwayat"><X className="size-5" aria-hidden="true" /></Dialog.Close>
                </div>
                <div className="min-h-0 flex-1"><DaftarSesi onPilih={() => setLaci(false)} /></div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-extrabold tracking-tight sm:text-xl">{judul ?? "Asisten SIGAP"}</h1>
            <p className="truncate text-xs text-muted-foreground sm:text-sm">Ketik atau ucapkan pertanyaan, atau tempel teks peringatan BMKG.</p>
          </div>
          <button type="button" onClick={() => useTanyaStore.getState().sesiBaru()} className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl border border-border bg-surface px-3 text-sm font-semibold hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary lg:hidden" aria-label="Percakapan baru">
            <Plus className="size-4" aria-hidden="true" /> <span className="hidden sm:inline">Baru</span>
          </button>
        </header>
        <div className="min-h-0 flex-1 pb-3 pt-2">
          <AsistenChat />
        </div>
      </div>
    </div>
  );
}
