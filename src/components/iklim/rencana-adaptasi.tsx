"use client";
import { Clock, Droplets, HeartPulse, Home, Sparkles, Users, Wallet, Wand2, type LucideIcon } from "lucide-react";
import type { HasilAdaptasi } from "@/lib/ai/adaptasi";
import { KATEGORI_ADAPTASI } from "@/lib/ai/schema";
import { TombolTanya } from "@/components/tanya/tombol-tanya";

const KATEGORI: Record<(typeof KATEGORI_ADAPTASI)[number], { label: string; Ikon: LucideIcon; cls: string }> = {
  rumah: { label: "Rumah", Ikon: Home, cls: "bg-amber-100 text-amber-900 dark:bg-amber-400/15 dark:text-amber-200" },
  air: { label: "Air", Ikon: Droplets, cls: "bg-sky-100 text-sky-900 dark:bg-sky-400/15 dark:text-sky-200" },
  kesehatan: { label: "Kesehatan", Ikon: HeartPulse, cls: "bg-rose-100 text-rose-900 dark:bg-rose-400/15 dark:text-rose-200" },
  ekonomi: { label: "Ekonomi keluarga", Ikon: Wallet, cls: "bg-emerald-100 text-emerald-900 dark:bg-emerald-400/15 dark:text-emerald-200" },
  komunitas: { label: "Bersama warga", Ikon: Users, cls: "bg-violet-100 text-violet-900 dark:bg-violet-400/15 dark:text-violet-200" },
};
const BIAYA: Record<string, string> = { rendah: "Biaya rendah", sedang: "Biaya sedang", tinggi: "Biaya tinggi" };
const KAPAN: Record<string, string> = { sekarang: "Mulai sekarang", "1-5 tahun": "1-5 tahun", "jangka panjang": "Jangka panjang" };
const URUT_KAPAN = ["sekarang", "1-5 tahun", "jangka panjang"];

export function KerangkaAdaptasi() {
  return (
    <div className="rounded-3xl border border-border bg-surface p-6" aria-busy="true">
      <p className="flex items-center gap-2 text-sm font-semibold text-primary">
        <Wand2 className="size-4 animate-pulse" aria-hidden="true" /> AI sedang menyusun rencana adaptasi dari data proyeksi...
      </p>
      <div className="mt-4 space-y-3">
        <div className="h-4 w-11/12 animate-pulse rounded bg-muted" />
        <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
        <div className="grid gap-3 pt-2 sm:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />)}</div>
      </div>
    </div>
  );
}

export function RencanaAdaptasi({ hasil, wilayah }: { hasil: HasilAdaptasi; wilayah: string }) {
  const langkah = [...hasil.langkah].sort((a, b) => URUT_KAPAN.indexOf(a.kapan) - URUT_KAPAN.indexOf(b.kapan));
  return (
    <div className="space-y-6">
      <div className="cetak-panel cetak-utuh relative overflow-hidden rounded-3xl bg-ink p-6 text-ink-foreground sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-emerald-400/10 blur-3xl" aria-hidden="true" />
        <p className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-emerald-200">
          <Sparkles className="size-3.5" aria-hidden="true" />
          {hasil.mode === "ai" ? "Disusun AI dari angka proyeksi, diperiksa kode" : "Templat berbasis aturan (AI sedang tidak tersedia)"}
        </p>
        <p className="mt-4 max-w-3xl text-lg leading-relaxed text-white sm:text-xl">{hasil.ringkasan}</p>
      </div>

      <div>
        <h3 className="text-lg font-bold">Apa artinya bagi keluarga di {wilayah}</h3>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {hasil.dampak.map((d) => (
            <li data-muncul
              key={d.judul}
              className="angkat cetak-utuh rounded-2xl border border-border bg-surface p-5"
            >
              <p className="font-semibold">{d.judul}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{d.isi}</p>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h3 className="text-lg font-bold">Langkah adaptasi, dari yang bisa dimulai hari ini</h3>
          <TombolTanya pertanyaan={`Iklim di ${wilayah} diproyeksikan makin panas menuju 2050. Bagaimana memulai langkah adaptasi keluarga yang paling murah dan cepat?`} label="Tanya lebih lanjut" />
        </div>
        <ol className="mt-3 grid gap-3 md:grid-cols-2">
          {langkah.map((l) => {
            const k = KATEGORI[l.kategori];
            return (
              <li data-muncul
                key={l.judul}
                className="angkat cetak-utuh flex gap-4 rounded-2xl border border-border bg-surface p-5"
              >
                <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${k.cls}`}><k.Ikon className="size-5" aria-hidden="true" /></span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{k.label}</p>
                  <p className="mt-0.5 font-semibold">{l.judul}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{l.alasan}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 print:border print:border-black print:text-black ${l.kapan === "sekarang" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                      <Clock className="size-3" aria-hidden="true" /> {KAPAN[l.kapan]}
                    </span>
                    <span className="rounded-full bg-muted px-2.5 py-1 text-foreground print:border print:border-black">{BIAYA[l.biaya]}</span>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
