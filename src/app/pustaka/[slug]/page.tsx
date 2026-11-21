import { Suspense } from "react";

import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowRight, BookOpenCheck, Clock, ExternalLink, Siren } from "lucide-react";
import { fotoArtikel } from "@/lib/gambar";
import { Foto } from "@/components/global/foto";
import { TombolTanya } from "@/components/tanya/tombol-tanya";
import { BeritaTerkait } from "@/components/pustaka/berita-terkait";
import { notFound } from "next/navigation";
import { DisclaimerBox } from "@/components/global/disclaimer-box";
import { CetakArtikel } from "@/components/pustaka/cetak-artikel";
import { BilahArtikel, DaftarIsiSamping } from "@/components/pustaka/navigasi-artikel";
import { ARTIKEL_BY_SLUG, SEMUA_ARTIKEL, artikelTerkait } from "@/lib/pustaka/data";

type ArtikelPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return SEMUA_ARTIKEL.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: ArtikelPageProps): Promise<Metadata> {
  const { slug } = await params;
  const a = ARTIKEL_BY_SLUG[slug];

  return a
    ? { title: a.title, description: a.ringkasan }
    : { title: "Artikel tidak ditemukan" };
}

const idBagian = (judul: string) => `b-${judul.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

async function ArtikelPageIsi({
  params,
}: ArtikelPageProps) {
  const { slug } = await params;
  const a = ARTIKEL_BY_SLUG[slug];

  if (!a) notFound();
  const foto = fotoArtikel(a.slug, a.hazards);
  const terkait = artikelTerkait(a);
  const isi = a.bagian.map((b) => ({ id: idBagian(b.judul), judul: b.judul }));
  const urutan = SEMUA_ARTIKEL.findIndex((x) => x.slug === a.slug);
  const sebelumnya = urutan > 0 ? SEMUA_ARTIKEL[urutan - 1] : null;
  const berikutnya = urutan >= 0 && urutan < SEMUA_ARTIKEL.length - 1 ? SEMUA_ARTIKEL[urutan + 1] : null;
  const jumlahButir = a.bagian.reduce((n, b) => n + b.butir.length, 0);

  return (
    <main id="konten" tabIndex={-1} className="flex-1 focus:outline-none">
      <div className="kemajuan-baca" aria-hidden="true" />
      <article>
        {/* Sampul foto penuh */}
        <header className="cetak-polos relative isolate flex min-h-[26rem] items-end overflow-hidden bg-ink text-white sm:min-h-[30rem]">
          <Image src={foto.src} alt={foto.alt} fill loading="eager" fetchPriority="high" sizes="100vw" className="ken-burns -z-20 object-cover" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-ink/60 to-ink/10" aria-hidden="true" />
          <div className="mx-auto w-full max-w-7xl px-4 pb-10 pt-24 sm:px-6 lg:px-8">
            <Link href="/pustaka" data-masuk className="tanpa-cetak inline-flex min-h-11 items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-4 text-sm font-semibold backdrop-blur hover:bg-white/20">
              <ArrowLeft className="size-4" aria-hidden="true" /> Pustaka
            </Link>
            <p data-masuk className="mt-5 text-sm font-semibold uppercase tracking-wider text-emerald-300">{a.kategori}</p>
            <h1 data-masuk style={{ "--tunda": "60ms" } as React.CSSProperties} className="mt-2 max-w-4xl text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">{a.title}</h1>
            <p data-masuk style={{ "--tunda": "120ms" } as React.CSSProperties} className="mt-4 inline-flex flex-wrap items-center gap-2 text-sm text-white/80">
              <Clock className="size-4" aria-hidden="true" /> {a.menit} menit baca · {jumlahButir} butir panduan · {a.sumber.length} sumber resmi
            </p>
          </div>
        </header>

        <BilahArtikel bagian={isi} />

        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:px-8 print:block print:max-w-none print:px-0 print:py-4">
          <div className="min-w-0 max-w-3xl">
            <p className="hidden text-sm print:block">Dicetak dari SIGAP · Pustaka · panduan dari sumber resmi BNPB dan BMKG</p>
            <p className="text-xl leading-relaxed text-foreground">{a.intro}</p>

            {a.bagian.map((b) => (
              <section key={b.judul} className="mt-12" id={idBagian(b.judul)} aria-labelledby={`${idBagian(b.judul)}-j`}>
                <h2 id={`${idBagian(b.judul)}-j`} className="text-2xl font-extrabold tracking-tight">{b.judul}</h2>
                <ol className="mt-5 space-y-3">
                  {b.butir.map((x, i) => (
                    <li
                      key={x.id}
                      data-muncul
                      className={`flex gap-4 rounded-2xl border p-5 ${x.darurat ? "border-red-200 bg-red-50/70" : "border-border bg-surface"}`}
                    >
                      <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold print:border print:border-black print:bg-transparent print:text-black ${x.darurat ? "bg-destructive text-white" : "bg-primary/10 text-primary"}`} aria-hidden="true">
                        {x.darurat ? <Siren className="size-4" /> : i + 1}
                      </span>
                      <div>
                        <h3 className="font-bold text-foreground">{x.judul}</h3>
                        <p className="mt-1 leading-relaxed text-muted-foreground">{x.isi}</p>
                        {x.turunan && (
                          <p className="mt-2 inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">Turunan: {x.turunan}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            ))}

            {a.sumber.length > 0 && (
              <section className="mt-12 rounded-3xl border border-border bg-surface p-6" aria-labelledby="sumber-artikel">
                <h2 id="sumber-artikel" className="flex items-center gap-2 text-lg font-bold"><BookOpenCheck className="size-5 text-primary" aria-hidden="true" /> Sumber resmi</h2>
                <ul className="mt-3 space-y-2 text-sm">
                  {a.sumber.map((s) => (
                    <li key={s.url}>
                      <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1.5 text-primary underline-offset-2 hover:underline">
                        <ExternalLink className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" /> {s.judul}
                      </a>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-xs text-muted-foreground">
                  Foto sampul: {foto.oleh}, {foto.lisensi}. <Link href="/metodologi#kredit-foto" className="underline">Kredit foto</Link>
                </p>
              </section>
            )}

            <div className="mt-8"><DisclaimerBox /></div>

            {(sebelumnya || berikutnya) && (
              <nav aria-label="Artikel lainnya" className="tanpa-cetak mt-10 grid gap-3 sm:grid-cols-2">
                {sebelumnya ? (
                  <Link href={`/pustaka/${sebelumnya.slug}`} rel="prev" className="angkat group flex min-h-20 flex-col justify-center rounded-2xl border border-border bg-surface p-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><ArrowLeft className="size-3.5" aria-hidden="true" /> Sebelumnya</span>
                    <span className="mt-1 font-bold leading-snug text-foreground group-hover:text-primary">{sebelumnya.title}</span>
                  </Link>
                ) : <span className="hidden sm:block" />}
                {berikutnya && (
                  <Link href={`/pustaka/${berikutnya.slug}`} rel="next" className="angkat group flex min-h-20 flex-col justify-center rounded-2xl border border-border bg-surface p-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:items-end sm:text-right">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Berikutnya <ArrowRight className="size-3.5" aria-hidden="true" /></span>
                    <span className="mt-1 font-bold leading-snug text-foreground group-hover:text-primary">{berikutnya.title}</span>
                  </Link>
                )}
              </nav>
            )}
          </div>

          {/* Samping: daftar isi, tanya, cetak */}
          <aside className="tanpa-cetak space-y-4 lg:sticky lg:top-32 lg:self-start">
            <DaftarIsiSamping bagian={isi} />
            <div className="rounded-3xl bg-primary/5 p-5">
              <p className="text-sm font-semibold text-foreground">Masih ada yang ingin ditanyakan?</p>
              <p className="mt-1 text-sm text-muted-foreground">Asisten SIGAP menjawab dengan panduan resmi dan menyesuaikan dengan keluarga Anda.</p>
              <TombolTanya className="mt-3" label="Tanya tentang artikel ini" pertanyaan={`Saya membaca artikel “${a.title}”. Apa hal terpenting yang perlu keluarga saya siapkan?`} />
            </div>
            <BeritaTerkait hazards={a.hazards} />
            <CetakArtikel />
          </aside>
        </div>

        {terkait.length > 0 && (
          <section className="tanpa-cetak border-t border-border bg-surface py-14" aria-labelledby="artikel-terkait">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <h2 id="artikel-terkait" className="text-2xl font-extrabold tracking-tight">Baca juga</h2>
              <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {terkait.map((t) => (
                  <li key={t.slug} data-muncul>
                    <Link href={`/pustaka/${t.slug}`} className="angkat group flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                      <Foto foto={fotoArtikel(t.slug, t.hazards)} hias zoom sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="aspect-[16/10]" />
                      <span className="flex flex-1 flex-col p-5">
                        <span className="font-bold text-foreground group-hover:text-primary">{t.title}</span>
                        <span className="mt-1 line-clamp-2 text-sm text-muted-foreground">{t.ringkasan}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </article>
    </main>
  );
}

/** Cangkang statis; `params` dibaca di dalam Suspense agar navigasi tetap instan (Cache Components). */
export default function ArtikelPage(props: ArtikelPageProps) {
  return (
    <Suspense fallback={<div className="mx-auto h-96 max-w-3xl animate-pulse rounded-2xl bg-muted px-4 py-10" aria-busy="true" />}>
      <ArtikelPageIsi params={props.params} />
    </Suspense>
  );
}
