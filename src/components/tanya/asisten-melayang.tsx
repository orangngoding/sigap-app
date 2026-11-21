"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dialog } from "radix-ui";
import { Maximize2, Plus, Sparkles, X } from "lucide-react";
import { useAsistenUi } from "@/stores/asisten-ui-store";
import { useTanyaStore } from "@/stores/tanya-store";
import { AsistenChat } from "./asisten-chat";

/** Halaman yang tidak menampilkan tombol melayang: halaman Asisten sendiri, Mode Darurat, dan halaman cetak. */
const DISEMBUNYIKAN = ["/tanya", "/darurat", "/rencana/kartu"];

/** Asisten SIGAP yang bisa dibuka dari halaman mana pun, berbagi percakapan dengan halaman /tanya. */
export function AsistenMelayang() {
  const pathname = usePathname();
  const { terbuka, setTerbuka } = useAsistenUi();
  const memuat = useTanyaStore((s) => s.memuat);
  if (DISEMBUNYIKAN.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;

  return (
    // modal={false}: halaman di belakang tetap bisa di-scroll dan diklik selama panel terbuka (tanpa kunci scroll dan overlay).
    <Dialog.Root open={terbuka} onOpenChange={setTerbuka} modal={false}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          data-masuk
          style={{ "--tunda": "700ms" } as React.CSSProperties}
          className="tanpa-cetak fixed bottom-20 right-4 z-40 inline-flex size-14 items-center justify-center gap-2 rounded-full bg-primary text-sm sm:size-auto sm:min-h-12 sm:px-5 font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:bottom-6 md:right-6"
        >
          <Sparkles className={`size-5 sm:size-4 ${memuat ? "animate-pulse motion-reduce:animate-none" : ""}`} aria-hidden="true" />
          <span className="sr-only sm:not-sr-only">Tanya Asisten</span>
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Content
          // Panel tetap terbuka saat pengguna menyentuh/menggulir halaman; tutup lewat tombol X, Esc, atau tombol Tanya Asisten.
          onInteractOutside={(e) => e.preventDefault()}
          className="fixed inset-x-0 bottom-0 z-50 flex h-[75dvh] flex-col rounded-t-2xl border border-border bg-background p-4 shadow-2xl data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-8 data-[state=open]:fade-in-0 md:inset-x-auto md:bottom-6 md:right-6 md:h-[min(680px,calc(100dvh-7rem))] md:w-[440px] md:rounded-2xl"
          aria-describedby="asisten-panel-ket"
        >
          <div className="mb-3 flex shrink-0 items-start justify-between gap-3 border-b border-border pb-3">
            <div>
              <Dialog.Title className="flex items-center gap-2 text-base font-bold">
                <Sparkles className="size-4 text-primary" aria-hidden="true" /> Asisten SIGAP
              </Dialog.Title>
              <Dialog.Description id="asisten-panel-ket" className="text-xs text-muted-foreground">
                Bukan pengganti arahan BPBD dan BMKG. Darurat: 112.
              </Dialog.Description>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button" onClick={() => useTanyaStore.getState().sesiBaru()}
                className="inline-flex size-11 items-center justify-center rounded-lg hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
                aria-label="Percakapan baru" title="Percakapan baru"
              >
                <Plus className="size-4" aria-hidden="true" />
              </button>
              <Link
                href="/tanya"
                onClick={() => setTerbuka(false)}
                className="inline-flex size-11 items-center justify-center rounded-lg hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
                aria-label="Buka halaman Asisten dan riwayat"
                title="Buka halaman Asisten dan riwayat"
              >
                <Maximize2 className="size-4" aria-hidden="true" />
              </Link>
              <Dialog.Close
                className="inline-flex size-11 items-center justify-center rounded-lg hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
                aria-label="Tutup Asisten"
              >
                <X className="size-5" aria-hidden="true" />
              </Dialog.Close>
            </div>
          </div>
          <div className="min-h-0 flex-1">
            <AsistenChat varian="panel" />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
