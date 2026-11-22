"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ExternalLink, Globe2, RefreshCw, Search, ShieldCheck } from "lucide-react";
import type { BeritaItem, BeritaResponse, PeringatanGlobal } from "@/types";
import { readCache, writeCache } from "@/lib/storage/safe-storage";
import { waktuMutlak, waktuRelatif } from "@/lib/utils/format";
import { GambarBerita } from "./gambar-berita";
import { jenisValid, metaJenis, type JenisBerita as Jenis } from "./jenis-berita";

const labelJenis = (j: Jenis) => metaJenis(j).label;
const LEVEL: Record<PeringatanGlobal["level"], { label: string; cls: string }> = {
  hijau: { label: "Dampak rendah", cls: "bg-success text-success-foreground" },
  oranye: { label: "Dampak sedang", cls: "bg-warning text-warning-foreground" },
  merah: { label: "Dampak tinggi", cls: "bg-danger text-danger-foreground" },
};
const PER_HALAMAN = 18;
const TAUTAN_LUAR = "inline-flex items-center gap-1 font-semibold text-primary underline underline-offset-2";

const TAUTAN_KARTU = "angkat group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

/** Label jenis bencana di atas foto. */
function ChipJenis({ j, gelap = false }: { j: Jenis; gelap?: boolean }) {
  const m = metaJenis(j);
  const Ikon = m.Ikon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold backdrop-blur ${gelap ? "bg-white/15 text-white" : "bg-surface/90 text-foreground shadow-sm"}`}>
      <Ikon className={`size-3.5 ${gelap ? "" : m.colorClass}`} aria-hidden="true" /> {labelJenis(j)}
    </span>
  );
}

/** Ikon media: favicon situs penerbit; bila tidak ada domainnya atau gagal dimuat, inisial nama media. */
function LogoMedia({ b, terang }: { b: BeritaItem; terang: boolean }) {
  const [gagal, setGagal] = useState(false);
  if (b.situs && !gagal)
    return (
      <span className="grid size-5 shrink-0 place-items-center overflow-hidden rounded-full bg-white ring-1 ring-black/10" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(b.situs)}&sz=64`}
          alt=""
          width={16}
          height={16}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setGagal(true)}
          className="size-4 object-contain"
        />
      </span>
    );
  return (
    <span className={`grid size-5 shrink-0 place-items-center rounded-full text-xs font-bold ${terang ? "bg-white/20 text-white" : "bg-primary/10 text-primary"}`} aria-hidden="true">{b.sumber.charAt(0).toUpperCase()}</span>
  );
}

/** Nama media dan waktu terbit. */
function Meta({ b, terang = false }: { b: BeritaItem; terang?: boolean }) {
  return (
    <span className={`flex items-center gap-2 text-xs ${terang ? "text-white/80" : "text-muted-foreground"}`}>
      <LogoMedia b={b} terang={terang} />
      <span className="truncate font-semibold">{b.sumber}</span>
      <span aria-hidden="true">·</span>
      <time dateTime={b.waktu} title={waktuMutlak(b.waktu)} className="shrink-0">{waktuRelatif(b.waktu)}</time>
    </span>
  );
}

/** Kartu berita bergaya aplikasi berita: foto, label jenis, judul, media, dan waktu. */
function KartuBerita({ b }: { b: BeritaItem }) {
  return (
    <li>
      <a href={b.url} target="_blank" rel="noopener noreferrer" className={`${TAUTAN_KARTU} flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface`}>
        <span className="relative block">
          <GambarBerita b={b} className="aspect-[16/9]" />
          <span className="absolute left-3 top-3"><ChipJenis j={b.jenis ?? "umum"} /></span>
        </span>
        <span className="flex flex-1 flex-col gap-3 p-4">
          <span className="line-clamp-3 font-semibold leading-snug text-foreground group-hover:text-primary">{b.judul}</span>
          <span className="mt-auto flex items-center justify-between gap-2">
            <Meta b={b} />
            <ExternalLink className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </span>
        </span>
        <span className="sr-only">(buka di situs {b.sumber}, tab baru)</span>
      </a>
    </li>
  );
}

/** Baris berita tanpa foto: ikon jenis bencana, judul, media, dan waktu. */
function BarisBerita({ b }: { b: BeritaItem }) {
  const m = metaJenis(b.jenis ?? "umum");
  const Ikon = m.Ikon;
  return (
    <li>
      <a href={b.url} target="_blank" rel="noopener noreferrer" className="group flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-muted/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary">
        <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${m.bgClass} ${m.colorClass}`} aria-hidden="true"><Ikon className="size-5" /></span>
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 text-sm font-semibold leading-snug text-foreground group-hover:text-primary">{b.judul}</span>
          <span className="mt-1 block"><Meta b={b} /></span>
        </span>
        <ExternalLink className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="sr-only">(buka di situs {b.sumber}, tab baru)</span>
      </a>
    </li>
  );
}

const PER_LEMBAR = 6;

/**
 * "Berita lainnya" per lembar (6 judul). Lembar digeser ke kiri/kanan (scroll-snap, hanya daftar ini yang bergeser;
 * berita berfoto di atasnya tetap), atau dipilih lewat nomor halaman. Tinggi mengikuti lembar terpanjang.
 */
function HalamanBerita({ daftar }: { daftar: BeritaItem[] }) {
  const lembar = useMemo(() => Array.from({ length: Math.ceil(daftar.length / PER_LEMBAR) }, (_, i) => daftar.slice(i * PER_LEMBAR, (i + 1) * PER_LEMBAR)), [daftar]);
  const jalur = useRef<HTMLDivElement>(null);
  const [aktif, setAktif] = useState(0);
  useEffect(() => {
    const el = jalur.current;
    if (!el) return;
    let raf = 0;
    const baca = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => setAktif(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)))); };
    el.addEventListener("scroll", baca, { passive: true });
    return () => { el.removeEventListener("scroll", baca); cancelAnimationFrame(raf); };
  }, []);
  const ke = (i: number) => {
    const el = jalur.current;
    if (!el) return;
    const halus = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: i * el.clientWidth, behavior: halus ? "smooth" : "auto" });
  };
  const tombol = "inline-flex min-h-10 any-pointer-coarse:min-h-11 min-w-10 items-center justify-center rounded-full px-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-40";
  return (
    <div className="mt-3">
      <div ref={jalur} className="relative flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-2xl border border-border bg-surface [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Berita lainnya, geser untuk halaman berikutnya">
        {lembar.map((isi, i) => (
          <ul key={i} aria-label={`Halaman ${i + 1} dari ${lembar.length}`} aria-hidden={i !== aktif} inert={i !== aktif} className="w-full shrink-0 snap-start snap-always divide-y divide-border">
            {isi.map((b) => <BarisBerita key={b.id} b={b} />)}
          </ul>
        ))}
      </div>
      {lembar.length > 1 && (
        <nav aria-label="Halaman berita lainnya" className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {aktif * PER_LEMBAR + 1}–{Math.min(daftar.length, (aktif + 1) * PER_LEMBAR)} dari {daftar.length} · <span className="sm:hidden">geser untuk melihat lainnya</span><span className="hidden sm:inline">halaman {aktif + 1} dari {lembar.length}</span>
          </p>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => ke(aktif - 1)} disabled={aktif === 0} className={`${tombol} border border-border bg-surface hover:bg-muted`}>Sebelumnya</button>
            {lembar.map((_, i) => (
              <button key={i} type="button" onClick={() => ke(i)} aria-label={`Halaman ${i + 1}`} aria-current={i === aktif ? "page" : undefined} className={`${tombol} max-sm:hidden ${i === aktif ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{i + 1}</button>
            ))}
            <button type="button" onClick={() => ke(aktif + 1)} disabled={aktif === lembar.length - 1} className={`${tombol} border border-border bg-surface hover:bg-muted`}>Berikutnya</button>
          </div>
        </nav>
      )}
    </div>
  );
}

/** Sorotan: satu berita utama berfoto besar dan beberapa berita pendamping dengan foto kecil. */
function Sorotan({ utama, samping }: { utama: BeritaItem; samping: BeritaItem[] }) {
  return (
    <section aria-labelledby="judul-sorotan">
      <h2 id="judul-sorotan" className="text-lg font-bold">Sorotan hari ini</h2>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <a href={utama.url} target="_blank" rel="noopener noreferrer" className={`${TAUTAN_KARTU} relative isolate flex min-h-80 flex-col justify-end overflow-hidden rounded-3xl bg-ink p-6 text-white sm:min-h-96 sm:p-8`}>
          <GambarBerita b={utama} latar className="-z-20" />
          <span className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-ink/60 to-ink/0" aria-hidden="true" />
          <span className="w-fit"><ChipJenis j={utama.jenis ?? "umum"} gelap /></span>
          <span className="mt-3 block max-w-2xl text-xl font-bold leading-snug sm:text-3xl">{utama.judul}</span>
          <span className="mt-4 flex items-center gap-3"><Meta b={utama} terang /><ExternalLink className="size-4 shrink-0 text-white/70" aria-hidden="true" /></span>
          <span className="sr-only">(buka di situs {utama.sumber}, tab baru)</span>
        </a>
        <ul className="grid gap-3">
          {samping.map((b) => (
            <li key={b.id}>
              <a href={b.url} target="_blank" rel="noopener noreferrer" className={`${TAUTAN_KARTU} flex h-full items-center gap-4 rounded-2xl border border-border bg-surface p-3`}>
                <GambarBerita b={b} label={false} className="aspect-square w-24 shrink-0 rounded-xl sm:w-28" />
                <span className="min-w-0 flex-1">
                  <span className="text-xs font-semibold text-primary">{labelJenis(b.jenis ?? "umum")}</span>
                  <span className="mt-0.5 line-clamp-3 text-sm font-semibold leading-snug text-foreground group-hover:text-primary">{b.judul}</span>
                  <span className="mt-1.5 block"><Meta b={b} /></span>
                </span>
                <span className="sr-only">(buka di situs {b.sumber}, tab baru)</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** Pustaka > Berita bencana: peringatan resmi GDACS, berita media yang bisa disaring per jenis bencana. */
export function BeritaHalaman({ mode = "bencana" }: { mode?: "bencana" | "cuaca" }) {
  const cuacaMode = mode === "cuaca";
  const jenisAwal = useSearchParams().get("jenis");
  const [jenis, setJenis] = useState<Jenis | "semua">(jenisValid(jenisAwal) ? jenisAwal : "semua");
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

  const daftar = useMemo(() => (cuacaMode ? q.data?.cuaca : q.data?.daftar) ?? [], [q.data, cuacaMode]);
  const hitung = useMemo(() => {
    const m = new Map<Jenis, number>();
    for (const b of daftar) m.set(b.jenis ?? "umum", (m.get(b.jenis ?? "umum") ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [daftar]);
  const kata = cari.trim().toLowerCase();
  const tersaring = daftar.filter((b) => (jenis === "semua" || (b.jenis ?? "umum") === jenis) && (!kata || b.judul.toLowerCase().includes(kata) || b.sumber.toLowerCase().includes(kata)));
  // Sorotan hanya pada tampilan tanpa saringan: berita berfoto asli didahulukan.
  const tanpaSaring = !kata && jenis === "semua";
  const berfoto = daftar.filter((b) => b.gambar);
  const utama = tanpaSaring ? berfoto[0] : undefined;
  const samping = utama ? berfoto.slice(1, 4) : [];
  const disorot = new Set([utama, ...samping]);
  const sisa = tersaring.filter((b) => !disorot.has(b));
  const sisaFoto = sisa.filter((b) => b.gambar);
  const sisaTeks = sisa.filter((b) => !b.gambar);

  if (q.isPending)
    return (
      <div className="space-y-4" role="status" aria-busy="true">
        <p className="text-sm text-muted-foreground">Mengumpulkan berita dari Google Berita dan media nasional…</p>
        <div className="h-28 animate-pulse rounded-3xl bg-muted motion-reduce:animate-none" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <div key={i} className="h-72 animate-pulse rounded-2xl bg-muted motion-reduce:animate-none" />)}</div>
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

      {utama && <Sorotan utama={utama} samping={samping} />}

      {!cuacaMode && (d.resmi?.length ?? 0) > 0 && (
        <section aria-labelledby="judul-gdacs">
          <h2 id="judul-gdacs" className="flex items-center gap-2 text-lg font-bold"><Globe2 className="size-5 text-primary" aria-hidden="true" /> Peringatan resmi internasional</h2>
          <p className="mt-1 text-sm text-muted-foreground">Dari GDACS (sistem peringatan bencana global PBB dan Komisi Eropa), 30 hari terakhir untuk Indonesia. Tingkat dampak versi GDACS, bukan status resmi BNPB.</p>
          {/* Jumlah kolom mengikuti jumlah peringatan (1-4) agar tidak ada kolom kosong. */}
          <ul className={`mt-4 grid gap-3 sm:grid-cols-2 ${["lg:grid-cols-1", "lg:grid-cols-2", "lg:grid-cols-3", "lg:grid-cols-4"][Math.min(4, d.resmi!.length) - 1] /* paling banyak 4 peringatan terbaru, satu baris */}`}>
            {d.resmi!.slice(0, 4).map((g) => (
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

      <section aria-labelledby="judul-berita-media">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="judul-berita-media" className="text-lg font-bold">{cuacaMode ? "Cuaca dan iklim di Indonesia, 7 hari terakhir" : "Berita dari media, 7 hari terakhir"}</h2>
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
                className={`inline-flex min-h-10 any-pointer-coarse:min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-primary ${aktif ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface text-foreground hover:bg-muted"}`}
              >
                {j === "semua" ? "Semua" : labelJenis(j)} <span className={`tabular-nums ${aktif ? "text-primary-foreground" : "text-muted-foreground"}`}>{n}</span>
              </button>
            );
          })}
        </div>

        {sisaFoto.length > 0 && (
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sisaFoto.slice(0, batas).map((b) => <KartuBerita key={b.id} b={b} />)}
          </ul>
        )}
        {sisaFoto.length > batas && (
          <button type="button" onClick={() => setBatas((n) => n + PER_HALAMAN)} className="press mt-5 inline-flex min-h-11 items-center rounded-xl border border-border bg-surface px-5 text-sm font-semibold hover:bg-muted">
            Tampilkan lebih banyak ({sisaFoto.length - batas} lagi)
          </button>
        )}
        {/* Berita tanpa foto dari penerbit: daftar judul ringkas, bukan kartu dengan foto pengganti yang berulang. */}
        {sisaTeks.length > 0 && (
          <div className={sisaFoto.length ? "mt-8" : "mt-5"}>
            {sisaFoto.length > 0 && <h3 className="text-base font-bold">Berita lainnya</h3>}
            <HalamanBerita key={`${mode}-${jenis}-${kata}`} daftar={sisaTeks} />
          </div>
        )}
        {sisa.length === 0 && (
          <p className="mt-5 rounded-2xl border border-border bg-surface p-5 text-sm text-muted-foreground">
            {d.tersedia ? "Tidak ada berita yang cocok dengan saringan ini. Coba jenis atau kata lain." : "Belum ada berita yang bisa ditampilkan. Periksa kanal resmi BNPB dan BMKG."}
          </p>
        )}
      </section>

      {/* Catatan editorial: judul, satu kalimat inti, rincian tiga butir yang dilipat (details bawaan, jalan tanpa JavaScript). */}
      <aside aria-labelledby="judul-catatan-berita" className="mx-auto max-w-2xl rounded-2xl border border-border bg-surface px-5 py-5 text-center sm:px-8">
        <h2 id="judul-catatan-berita" className="inline-flex items-center gap-2 text-sm font-bold text-foreground">
          <ShieldCheck className="size-4 text-primary" aria-hidden="true" /> Tentang berita di halaman ini
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Berita berasal dari media dan belum tentu terverifikasi. Untuk peringatan dan status resmi, rujuk{" "}
          <a className={TAUTAN_LUAR} href="https://www.bmkg.go.id/" target="_blank" rel="noopener noreferrer">BMKG</a>,{" "}
          <a className={TAUTAN_LUAR} href="https://bnpb.go.id/berita" target="_blank" rel="noopener noreferrer">BNPB</a>, dan BPBD setempat.
        </p>
        <details className="group mt-2">
          <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1 rounded-lg px-2 text-sm font-semibold text-primary hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">Selengkapnya</span><span className="hidden group-open:inline">Sembunyikan</span>
            <ChevronDown className="size-4 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
          </summary>
          <dl className="mt-3 space-y-3 border-t border-border pt-4 text-left text-sm leading-relaxed">
            {[
              ["Sumber", `Dikumpulkan otomatis dari ${d.umpan?.length ? d.umpan.join(", ") : "umpan berita media"}. Diperbarui setiap 10 menit.`],
              ["Penyaringan", `Hanya berita ${cuacaMode ? "cuaca dan iklim" : "bencana"} di Indonesia yang ditampilkan. Berita di luar topik, kiasan, dan judul kembar disaring otomatis.`],
              ["Hak cipta", "SIGAP hanya menampilkan judul, foto dari penerbit, nama media, dan waktu. Isi lengkap dibaca langsung di situs medianya."],
            ].map(([k, v]) => (
              <div key={k} className="grid gap-0.5 sm:grid-cols-[7rem_1fr] sm:gap-4">
                <dt className="font-semibold text-foreground">{k}</dt>
                <dd className="text-muted-foreground">{v}</dd>
              </div>
            ))}
          </dl>
        </details>
      </aside>
    </div>
  );
}
