"use client";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, MessageSquare, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useHydrate } from "@/hooks/use-hydrate";
import { cariSesi, kelompokkanSesi, type SesiChat } from "@/lib/tanya/sesi";
import { waktuRelatif } from "@/lib/utils/format";
import { useTanyaStore } from "@/stores/tanya-store";

const TOMBOL_IKON = "inline-flex size-8 any-pointer-coarse:size-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-background hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary";

function ButirSesi({ s, aktif, onPilih }: { s: SesiChat; aktif: boolean; onPilih: () => void }) {
  const { hapusSesi, gantiJudul } = useTanyaStore.getState();
  const [mode, setMode] = useState<"biasa" | "ubah" | "hapus">("biasa");
  const [judul, setJudul] = useState(s.judul);

  if (mode === "ubah") {
    return (
      <form
        onSubmit={(e) => { e.preventDefault(); gantiJudul(s.id, judul); setMode("biasa"); }}
        className="flex items-center gap-1 rounded-xl bg-surface p-1 ring-2 ring-primary/40"
      >
        <label htmlFor={`judul-${s.id}`} className="sr-only">Nama percakapan</label>
        <input
          id={`judul-${s.id}`} value={judul} maxLength={80} autoFocus onChange={(e) => setJudul(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Escape") { setJudul(s.judul); setMode("biasa"); } }}
          className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-sm focus:outline-none"
        />
        <button type="submit" className={TOMBOL_IKON} aria-label="Simpan nama"><Check className="size-4" aria-hidden="true" /></button>
        <button type="button" onClick={() => { setJudul(s.judul); setMode("biasa"); }} className={TOMBOL_IKON} aria-label="Batal"><X className="size-4" aria-hidden="true" /></button>
      </form>
    );
  }

  if (mode === "hapus") {
    return (
      <div className="flex items-center justify-between gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-900" role="alertdialog" aria-label={`Hapus percakapan ${s.judul}?`}>
        <span className="font-medium">Hapus percakapan ini?</span>
        <span className="flex gap-1">
          <button type="button" onClick={() => hapusSesi(s.id)} className="min-h-8 any-pointer-coarse:min-h-11 rounded-lg bg-red-600 px-3 text-xs font-semibold text-white hover:bg-red-700">Hapus</button>
          <button type="button" onClick={() => setMode("biasa")} className="min-h-8 any-pointer-coarse:min-h-11 rounded-lg px-3 text-xs font-semibold hover:bg-red-100">Batal</button>
        </span>
      </div>
    );
  }

  return (
    <div className="group relative">
      {aktif && <motion.span layoutId="sesi-aktif" className="absolute inset-0 rounded-xl bg-surface shadow-sm ring-1 ring-border" transition={{ type: "spring", stiffness: 420, damping: 36 }} />}
      <button
        type="button" onClick={onPilih} aria-current={aktif ? "true" : undefined}
        className={`relative flex min-h-12 w-full flex-col items-start justify-center rounded-xl px-3 py-2 pr-16 text-left focus-visible:outline-2 focus-visible:outline-primary ${aktif ? "" : "hover:bg-surface/70"}`}
      >
        <span className={`line-clamp-1 text-sm ${aktif ? "font-semibold text-foreground" : "font-medium text-foreground/80"}`}>{s.judul}</span>
        <span className="text-xs text-muted-foreground">{waktuRelatif(s.diubah)} · {Math.ceil(s.pesan.length / 2)} pertanyaan</span>
      </button>
      <span className={`absolute right-1 top-1/2 flex -translate-y-1/2 gap-0.5 transition-opacity ${aktif ? "opacity-100" : "opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"}`}>
        <button type="button" onClick={() => setMode("ubah")} className={TOMBOL_IKON} aria-label={`Ganti nama ${s.judul}`}><Pencil className="size-3.5" aria-hidden="true" /></button>
        <button type="button" onClick={() => setMode("hapus")} className={TOMBOL_IKON} aria-label={`Hapus ${s.judul}`}><Trash2 className="size-3.5" aria-hidden="true" /></button>
      </span>
    </div>
  );
}

/** Riwayat percakapan: percakapan baru, cari, pilih, ganti nama, hapus. Tersimpan hanya di perangkat. */
export function DaftarSesi({ onPilih }: { onPilih?: () => void }) {
  const siap = useHydrate(useTanyaStore);
  const sesi = useTanyaStore((s) => s.sesi);
  const aktif = useTanyaStore((s) => s.aktif);
  const { sesiBaru, pilihSesi, hapusSemuaSesi } = useTanyaStore.getState();
  const [kata, setKata] = useState("");
  const [yakinHapus, setYakinHapus] = useState(false);
  const kelompok = useMemo(() => kelompokkanSesi(cariSesi(sesi, kata)), [sesi, kata]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <button
        type="button" onClick={() => { sesiBaru(); onPilih?.(); }}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <Plus className="size-4" aria-hidden="true" /> Percakapan baru
      </button>

      {sesi.length > 2 && (
        <div className="relative mt-3">
          <label htmlFor="cari-sesi" className="sr-only">Cari percakapan</label>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            id="cari-sesi" type="search" value={kata} onChange={(e) => setKata(e.target.value)} placeholder="Cari percakapan"
            className="min-h-10 any-pointer-coarse:min-h-11 w-full rounded-xl border border-border bg-surface pl-9 pr-3 text-sm focus-visible:outline-2 focus-visible:outline-primary"
          />
        </div>
      )}

      <nav aria-label="Riwayat percakapan" className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
        {!siap ? (
          <div className="space-y-2" aria-hidden="true">{[0, 1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-muted" />)}</div>
        ) : sesi.length === 0 ? (
          <p className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            <MessageSquare className="size-5" aria-hidden="true" /> Riwayat percakapan akan tampil di sini, tersimpan hanya di perangkat Anda.
          </p>
        ) : kelompok.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">Tidak ada percakapan yang cocok.</p>
        ) : (
          <div className="space-y-5">
            {kelompok.map((g) => (
              <section key={g.judul} aria-label={g.judul}>
                <h3 className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{g.judul}</h3>
                <ul className="space-y-0.5">
                  <AnimatePresence initial={false}>
                    {g.sesi.map((s) => (
                      <motion.li key={s.id} layout initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, height: 0 }}>
                        <ButirSesi s={s} aktif={s.id === aktif} onPilih={() => { pilihSesi(s.id); onPilih?.(); }} />
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              </section>
            ))}
          </div>
        )}
      </nav>

      {siap && sesi.length > 0 && (
        <div className="mt-3 border-t border-border pt-3">
          {yakinHapus ? (
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="font-medium text-red-800">Hapus {sesi.length} percakapan?</span>
              <span className="flex gap-1">
                <button type="button" onClick={() => { hapusSemuaSesi(); setYakinHapus(false); }} className="min-h-8 any-pointer-coarse:min-h-11 rounded-lg bg-red-600 px-3 text-xs font-semibold text-white">Hapus semua</button>
                <button type="button" onClick={() => setYakinHapus(false)} className="min-h-8 any-pointer-coarse:min-h-11 rounded-lg px-3 text-xs font-semibold hover:bg-muted">Batal</button>
              </span>
            </div>
          ) : (
            <button type="button" onClick={() => setYakinHapus(true)} className="inline-flex min-h-9 any-pointer-coarse:min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
              <Trash2 className="size-3.5" aria-hidden="true" /> Hapus semua riwayat
            </button>
          )}
        </div>
      )}
    </div>
  );
}
