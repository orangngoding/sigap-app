"use client";
// Titik masuk "rencana untuk banyak keluarga". Dengan satu keluarga hanya tampil ajakan kecil; dengan lebih dari satu,
// tampil pemilih keluarga (menu tarik-turun) untuk berganti langsung. Spanduk global menempel di bawah header saat
// yang dibuka bukan keluarga pemilik ponsel, agar tidak salah mengisi data keluarga lain.
import { useEffect, useRef } from "react";
import Link from "next/link";
import { DropdownMenu } from "radix-ui";
import { Check, ChevronDown, Settings2, Undo2, UserPlus, Users } from "lucide-react";
import { bukaKeluarga, useIkutiKeluargaTabLain, useKeluarga, type KeluargaTampil } from "@/hooks/use-keluarga";

/** Huruf awal nama keluarga untuk lencana ("Keluarga Bu Sari" -> "B"). */
const inisial = (nama: string) => (nama.replace(/^keluarga\s+/i, "").trim()[0] ?? nama[0] ?? "?").toUpperCase();

function Lencana({ k, besar = false }: { k: KeluargaTampil; besar?: boolean }) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full font-bold ${besar ? "size-11 text-lg" : "size-9 text-sm"} ${
        k.milikSaya ? "bg-primary text-primary-foreground" : "bg-amber-500 text-white"
      }`}
      aria-hidden="true"
    >
      {inisial(k.nama)}
    </span>
  );
}

const keterangan = (k: KeluargaTampil) =>
  [k.milikSaya ? "Milik Anda" : null, k.ringkas.kelurahan, k.ringkas.adaRencana ? "rencana tersusun" : "belum ada rencana"].filter(Boolean).join(" · ");

export function PemilihKeluarga() {
  const { siap, aktif, daftar, jumlah } = useKeluarga();
  if (!siap || !aktif) return <div className="mb-4 h-11" aria-hidden="true" />;
  if (jumlah < 2)
    return (
      <aside
        aria-labelledby="judul-keluarga-lain"
        className="tanpa-cetak mb-4 flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-3 sm:mb-6 sm:gap-4 sm:p-5"
      >
        <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center sm:gap-4">
          <span className="hidden size-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground sm:grid" aria-hidden="true">
            <Users className="size-5 sm:size-6" />
          </span>
          <div className="min-w-0">
            <h2 id="judul-keluarga-lain" className="text-sm font-bold text-foreground sm:text-base">Mengelola rencana keluarga lain?</h2>
            <p className="mt-0.5 hidden text-sm leading-relaxed text-muted-foreground sm:block">
              Pak RT, kader, atau kerabat bisa menyusun rencana terpisah untuk tiap keluarga dari perangkat ini.
            </p>
          </div>
        </div>
        <Link
          href="/rencana/keluarga#tambah-keluarga"
          className="press inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border-2 border-primary bg-surface px-3 text-sm sm:px-5 font-semibold text-primary hover:bg-primary hover:text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <UserPlus className="size-4" aria-hidden="true" /> Tambah keluarga
        </Link>
      </aside>
    );
  const lain = !aktif.milikSaya;
  return (
    <div className="tanpa-cetak mb-5">
      <p id="label-pemilih-keluarga" className="mb-1.5 text-sm font-semibold text-muted-foreground">Rencana ini untuk</p>
      <DropdownMenu.Root modal={false}>
        {/* Satu kontrol yang tampak seperti pilihan (nama + panah), pola yang sudah dikenal: ketuk untuk ganti keluarga. */}
        <DropdownMenu.Trigger
          aria-labelledby="label-pemilih-keluarga nama-keluarga-aktif"
          className={`group flex w-full items-center gap-3 rounded-2xl border-2 bg-surface px-4 py-3 text-left shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary data-[state=open]:shadow-md ${
            lain ? "border-amber-400 hover:bg-amber-50 data-[state=open]:bg-amber-50" : "border-border hover:border-primary/40 hover:bg-muted/50 data-[state=open]:border-primary/40"
          }`}
        >
          <Lencana k={aktif} besar />
          <span className="min-w-0 flex-1">
            <span id="nama-keluarga-aktif" className="block text-lg font-bold leading-tight text-foreground [overflow-wrap:anywhere]">{aktif.nama}</span>
            <span className="mt-0.5 block text-sm text-muted-foreground">{keterangan(aktif)}</span>
          </span>
          <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold ${lain ? "bg-amber-100 text-amber-950" : "bg-primary/10 text-primary"}`}>
            Ganti
            <ChevronDown className="size-4 transition-transform group-data-[state=open]:rotate-180" aria-hidden="true" />
          </span>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="start" sideOffset={8}
            className="z-[60] w-[var(--radix-dropdown-menu-trigger-width)] max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-surface p-1.5 shadow-xl shadow-black/10 data-[state=open]:[animation:sigap-masuk_180ms_both]"
          >
            <DropdownMenu.Label className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pilih keluarga ({jumlah})</DropdownMenu.Label>
            <div className="max-h-[min(22rem,55dvh)] overflow-y-auto overscroll-contain">
              {daftar.map((k) => (
                <DropdownMenu.Item
                  key={k.id}
                  onSelect={() => { if (!k.aktif) bukaKeluarga(k.id); }}
                  className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl px-3 py-2 outline-none data-[highlighted]:bg-muted ${k.aktif ? "bg-primary/5" : ""}`}
                >
                  <Lencana k={k} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-foreground [overflow-wrap:anywhere]">{k.nama}</span>
                    <span className="block text-xs text-muted-foreground">{keterangan(k)}</span>
                  </span>
                  {k.aktif && <Check className="size-5 shrink-0 text-primary" aria-label="sedang dibuka" />}
                </DropdownMenu.Item>
              ))}
            </div>
            <DropdownMenu.Separator className="my-1.5 h-px bg-border" />
            <DropdownMenu.Item asChild>
              <Link href="/rencana/keluarga#tambah-keluarga" className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-primary outline-none data-[highlighted]:bg-muted">
                <UserPlus className="size-5" aria-hidden="true" /> Tambah keluarga baru
              </Link>
            </DropdownMenu.Item>
            <DropdownMenu.Item asChild>
              <Link href="/rencana/keluarga" className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-foreground outline-none data-[highlighted]:bg-muted">
                <Settings2 className="size-5 text-muted-foreground" aria-hidden="true" /> Kelola, ubah nama, atau hapus keluarga
              </Link>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}

/**
 * Spanduk yang menempel tepat di bawah header di semua halaman saat yang dibuka adalah keluarga lain
 * (disembunyikan di Mode Darurat dan saat dicetak). Tingginya ditulis ke variabel CSS --spanduk agar bilah lain
 * yang ikut menempel (tab Rencana, tab Siaga Iklim, navigasi artikel) turun di bawahnya, bukan tertutup.
 */
export function SpandukKeluarga() {
  const { siap, aktif, daftar } = useKeluarga();
  // Spanduk terpasang di semua halaman, jadi penjaga antartab dipasang di sini.
  useIkutiKeluargaTabLain();
  const ref = useRef<HTMLDivElement>(null);
  const tampil = siap && aktif !== null && !aktif.milikSaya;

  useEffect(() => {
    const el = ref.current;
    const akar = document.documentElement;
    if (!tampil || !el) {
      akar.style.removeProperty("--spanduk");
      return;
    }
    const atur = () => akar.style.setProperty("--spanduk", `${el.offsetHeight}px`);
    atur();
    const ro = new ResizeObserver(atur);
    ro.observe(el);
    return () => { ro.disconnect(); akar.style.removeProperty("--spanduk"); };
  }, [tampil]);

  if (!tampil || !aktif) return null;
  const saya = daftar.find((k) => k.milikSaya);
  return (
    <div ref={ref} data-bingkai-situs role="status" className="tanpa-cetak sticky top-16 z-40 border-b-2 border-amber-400 bg-amber-100 text-amber-950 shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2 sm:gap-6 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-amber-500 text-white shadow-sm sm:size-9" aria-hidden="true">
            <Users className="size-4 sm:size-[18px]" />
          </span>
          <p className="min-w-0 text-sm leading-snug">
            <span className="block sm:text-base">
              <span className="hidden sm:inline">Sedang membuka data </span>
              <span className="text-xs font-medium text-amber-800 sm:hidden">Sedang membuka data<br /></span>
              <strong className="font-bold [overflow-wrap:anywhere]">{aktif.nama}</strong>
            </span>
            <span className="hidden text-amber-900 sm:block">Lokasi, rencana, dan Siaga Iklim memakai data keluarga ini, bukan keluarga Anda sendiri.</span>
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Link
            href="/rencana/keluarga"
            aria-label="Kelola keluarga"
            className="inline-flex size-10 any-pointer-coarse:size-11 items-center justify-center rounded-full border border-amber-400 bg-white/80 text-sm font-semibold transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 sm:size-auto sm:min-h-10 sm:px-4"
          >
            <Settings2 className="size-4 sm:hidden" aria-hidden="true" />
            <span className="hidden sm:inline">Kelola keluarga</span>
          </Link>
          {saya && (
            <button
              type="button"
              onClick={() => bukaKeluarga(saya.id, "/")}
              aria-label="Kembali ke keluarga saya"
              className="inline-flex min-h-10 any-pointer-coarse:min-h-11 items-center gap-1.5 rounded-full bg-amber-950 px-3 text-sm font-semibold text-amber-50 transition-colors hover:bg-amber-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 sm:px-4"
            >
              <Undo2 className="size-4" aria-hidden="true" />
              <span className="sm:hidden">Kembali</span>
              <span className="hidden sm:inline">Kembali ke keluarga saya</span>
            </button>
          )}
        </span>
      </div>
    </div>
  );
}
