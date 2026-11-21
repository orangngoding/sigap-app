"use client";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Globe2, Newspaper, RefreshCw, Search } from "lucide-react";
import type { BeritaItem, BeritaResponse, HazardId, PeringatanGlobal } from "@/types";
import { HAZARDS } from "@/lib/hazards/hazards";
import { IKON_BAHAYA } from "@/lib/hazards/ikon";
import { readCache, writeCache } from "@/lib/storage/safe-storage";
import { waktuMutlak, waktuRelatif } from "@/lib/utils/format";

type Jenis = HazardId | "umum";
const META = new Map(HAZARDS.map((h) => [h.id, h]));
const labelJenis = (j: Jenis) => (j === "umum" ? "Umum" : META.get(j)?.label ?? j);
const LEVEL: Record<PeringatanGlobal["level"], { label: string; cls: string }> = {
  hijau: { label: "Dampak rendah", cls: "bg-success text-success-foreground" },
  oranye: { label: "Dampak sedang", cls: "bg-warning text-warning-foreground" },
  merah: { label: "Dampak tinggi", cls: "bg-danger text-danger-foreground" },
};
const PER_HALAMAN = 18;
const TAUTAN_LUAR = "inline-flex items-center gap-1 font-semibold text-primary underline underline-offset-2";

function IkonJenis({ j, besar = false }: { j: Jenis; besar?: boolean }) {
  const m = j === "umum" ? null : META.get(j);
  const Ikon = j === "umum" ? Newspaper : IKON_BAHAYA[j];
  return (
    <span className={`grid shrink-0 place-items-center rounded-xl ${besar ? "size-12" : "size-10"} ${m?.bgClass ?? "bg-muted"} ${m?.colorClass ?? "text-muted-foreground"}`} aria-hidden="true">
      <Ikon className={besar ? "size-6" : "size-5"} />
    </span>
  );
}

function KartuBerita({ b }: { b: BeritaItem }) {
  const j = b.jenis ?? "umum";
  return (
    <li>
      <a href={b.url} target="_blank" rel="noopener noreferrer" className="angkat group flex h-full gap-3 rounded-2xl border border-border bg-surface p-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
        <IkonJenis j={j} />
        <span className="min-w-0 flex-1">
          <span className="text-xs font-semibold text-muted-foreground">{labelJenis(j)}</span>
          <span className="mt-0.5 block font-semibold leading-snug text-foreground group-hover:text-primary">{b.judul}</span>
          <span className="mt-1.5 block text-xs text-muted-foreground">
            {b.sumber} · <time dateTime={b.waktu} title={waktuMutlak(b.waktu)}>{waktuRelatif(b.waktu)}</time>
          </span>
        </span>
        <ExternalLink className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="sr-only">(buka di situs {b.sumber}, tab baru)</span>
      </a>
    </li>
  );
}

function BeritaUtama({ b }: { b: BeritaItem }) {
  return (
    <a href={b.url} target="_blank" rel="noopener noreferrer" className="angkat group grid overflow-hidden rounded-3xl border border-border bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:grid-cols-[1.2fr_1fr]">
      <span className="relative block aspect-[16/10] overflow-hidden bg-muted md:aspect-auto md:min-h-64">
        {/* Foto dari umpan RSS ANTARA, ditampilkan apa adanya bersama tautan ke beritanya. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={b.gambar} alt="" loading="lazy" referrerPolicy="no-referrer" className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-[1.03] motion-reduce:transition-none" />
      </span>
      <span className="flex flex-col justify-center p-6 sm:p-8">
        <span className="text-xs font-semibold uppercase tracking-wider text-primary">{labelJenis(b.jenis ?? "umum")} · {b.sumber}</span>
        <span className="mt-2 block text-xl font-bold leading-snug text-foreground group-hover:text-primary sm:text-2xl">{b.judul}</span>
        <span className="mt-3 inline-flex items-center gap-1 text-sm text-muted-foreground">
          <time dateTime={b.waktu}>{waktuRelatif(b.waktu)}</time> · Baca di situs {b.sumber} <ExternalLink className="size-3.5" aria-hidden="true" />
        </span>
      </span>
    </a>
  );
}

/** Pustaka > Berita bencana: peringatan resmi GDACS, berita media yang bisa disaring per jenis bencana. */
export function BeritaHalaman() {
  const jenisAwal = useSearchParams().get("jenis");
  const [jenis, setJenis] = useState<Jenis | "semua">(jenisAwal && (jenisAwal === "umum" || META.has(jenisAwal as HazardId)) ? (jenisAwal as Jenis) : "semua");
  const [cari, setCari] = useState("");
  const [batas, setBatas] = useState(PER_HALAMAN);

  const q = useQuery<BeritaResponse & { stale?: boolean }>({
    queryKey: ["berita", "umum"],
    staleTime: 10 * 60_000,
    retry: 1,
    queryFn: async () => {
      try {
        const res = await fetch("/api/berita");
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as BeritaResponse;
        writeCache("berita", "umum", data);
        return data;
      } catch (e) {
        const lama = readCache<BeritaResponse>("berita", "umum");
        if (lama) return { ...lama.data, stale: true };
        throw e;
      }
    },
  });

  const daftar = useMemo(() => q.data?.daftar ?? [], [q.data]);
  const hitung = useMemo(() => {
    const m = new Map<Jenis, number>();
    for (const b of daftar) m.set(b.jenis ?? "umum", (m.get(b.jenis ?? "umum") ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [daftar]);
  const kata = cari.trim().toLowerCase();
  const tersaring = daftar.filter((b) => (jenis === "semua" || (b.jenis ?? "umum") === jenis) && (!kata || b.judul.toLowerCase().includes(kata) || b.sumber.toLowerCase().includes(kata)));
  const utama = !kata && jenis === "semua" ? daftar.find((b) => b.gambar) : undefined;
  const sisa = tersaring.filter((b) => b !== utama);

  if (q.isPending)
    return (
      <div className="space-y-4" role="status" aria-busy="true">
        <p className="text-sm text-muted-foreground">Mengumpulkan berita dari Google Berita, ANTARA, dan GDACS…</p>
        <div className="h-28 animate-pulse rounded-3xl bg-muted motion-reduce:animate-none" />
        <div className="grid gap-3 md:grid-cols-2">{Array.from({ length: 6 }, (_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted motion-reduce:animate-none" />)}</div>
      </div>
    );
  if (q.isError)
    return (
      <div role="alert" className="rounded-3xl border border-border bg-surface p-6">
        <p className="font-semibold">Berita belum dapat dimuat.</p>
        <p className="mt-1 text-sm text-muted-foreground">Untuk keadaan terbaru, buka kanal resmi <a className={TAUTAN_LUAR} href="https://bnpb.go.id/berita" target="_blank" rel="noopener noreferrer">BNPB</a> atau <a className={TAUTAN_LUAR} href="https://www.bmkg.go.id/" target="_blank" rel="noopener noreferrer">BMKG</a>.</p>
        <button type="button" onClick={() => q.refetch()} className="press mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold hover:bg-muted">
          <RefreshCw className="size-4" aria-hidden="true" /> Coba lagi
        </button>
      </div>
    );

  const d = q.data;
  return (
    <div className="space-y-10">
      {d.stale && <p className="rounded-xl bg-warning px-4 py-2 text-sm text-warning-foreground">Menampilkan berita tersimpan terakhir karena perangkat sedang offline.</p>}

      {(d.resmi?.length ?? 0) > 0 && (
        <section aria-labelledby="judul-gdacs">
          <h2 id="judul-gdacs" className="flex items-center gap-2 text-lg font-bold"><Globe2 className="size-5 text-primary" aria-hidden="true" /> Peringatan resmi internasional</h2>
          <p className="mt-1 text-sm text-muted-foreground">Dari GDACS (sistem peringatan bencana global PBB dan Komisi Eropa), 30 hari terakhir untuk Indonesia. Tingkat dampak versi GDACS, bukan status resmi BNPB.</p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {d.resmi!.map((g) => (
              <li key={g.id}>
                <a href={g.url} target="_blank" rel="noopener noreferrer" className="angkat flex h-full flex-col rounded-2xl border border-border bg-surface p-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                  <span className={`w-fit rounded-full px-2 py-0.5 text-xs font-semibold ${LEVEL[g.level].cls}`}>{LEVEL[g.level].label}</span>
                  <span className="mt-2 flex-1 font-semibold leading-snug">{g.judul}</span>
                  <span className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground"><time dateTime={g.waktu} title={waktuMutlak(g.waktu)}>{waktuRelatif(g.waktu)}</time> · GDACS <ExternalLink className="size-3" aria-hidden="true" /></span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {utama && <BeritaUtama b={utama} />}

      <section aria-labelledby="judul-berita-media">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="judul-berita-media" className="text-lg font-bold">Berita dari media, 7 hari terakhir</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {d.tersedia ? `${daftar.length} berita dari ${new Set(daftar.map((b) => b.sumber)).size} media · diperbarui ${waktuRelatif(d.sumber.diambilPada)}` : "Umpan berita sedang tidak dapat dibaca."}
            </p>
          </div>
          <label className="relative block w-full sm:w-72">
            <span className="sr-only">Cari berita</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input type="search" value={cari} onChange={(e) => { setCari(e.target.value); setBatas(PER_HALAMAN); }} placeholder="Cari wilayah atau kata, mis. Aceh" className="min-h-11 w-full rounded-xl border border-border bg-surface pl-9 pr-3 text-sm focus-visible:outline-2 focus-visible:outline-primary" />
          </label>
        </div>

        <div role="group" aria-label="Saring jenis bencana" className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {([["semua", daftar.length] as const, ...hitung]).map(([j, n]) => {
            const aktif = jenis === j;
            return (
              <button
                key={j} type="button" aria-pressed={aktif} onClick={() => { setJenis(j); setBatas(PER_HALAMAN); }}
                className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-primary ${aktif ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface text-foreground hover:bg-muted"}`}
              >
                {j === "semua" ? "Semua" : labelJenis(j)} <span className={`tabular-nums ${aktif ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{n}</span>
              </button>
            );
          })}
        </div>

        {sisa.length > 0 ? (
          <ul className="mt-5 grid gap-3 md:grid-cols-2">
            {sisa.slice(0, batas).map((b) => <KartuBerita key={b.id} b={b} />)}
          </ul>
        ) : (
          <p className="mt-5 rounded-2xl border border-border bg-surface p-5 text-sm text-muted-foreground">
            {d.tersedia ? "Tidak ada berita yang cocok dengan saringan ini. Coba jenis atau kata lain." : "Belum ada berita yang bisa ditampilkan. Periksa kanal resmi BNPB dan BMKG."}
          </p>
        )}
        {sisa.length > batas && (
          <button type="button" onClick={() => setBatas((n) => n + PER_HALAMAN)} className="press mt-5 inline-flex min-h-11 items-center rounded-xl border border-border bg-surface px-5 text-sm font-semibold hover:bg-muted">
            Tampilkan lebih banyak ({sisa.length - batas} lagi)
          </button>
        )}
      </section>

      <aside className="rounded-2xl border border-border bg-muted/50 p-5 text-sm leading-relaxed text-muted-foreground">
        <p>
          SIGAP hanya menampilkan judul, nama media, dan waktu, lalu membawa Anda ke situs medianya. Berita dikumpulkan otomatis dari {d.umpan?.join(", ") || "umpan berita"} dan disaring agar hanya berita kebencanaan yang tampil; berita media belum tentu diverifikasi.
          Untuk peringatan dan status resmi, andalkan{" "}
          <a className={TAUTAN_LUAR} href="https://www.bmkg.go.id/" target="_blank" rel="noopener noreferrer">BMKG</a>,{" "}
          <a className={TAUTAN_LUAR} href="https://bnpb.go.id/berita" target="_blank" rel="noopener noreferrer">BNPB</a>, dan BPBD setempat.
        </p>
      </aside>
    </div>
  );
}
