
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DisclaimerBox } from "@/components/global/disclaimer-box";
import { ARTIKEL_BY_SLUG, SEMUA_ARTIKEL } from "@/lib/pustaka/data";

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

export default async function ArtikelPage({
  params,
}: ArtikelPageProps) {
  const { slug } = await params;
  const a = ARTIKEL_BY_SLUG[slug];

  if (!a) notFound();

  return (
    <main id="konten" tabIndex={-1} className="flex-1 focus:outline-none">
      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <Link
          href="/pustaka"
          className="text-sm text-primary underline underline-offset-2"
        >
          Kembali ke Pustaka
        </Link>

        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
          {a.title}
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          {a.menit} menit baca
        </p>

        <p className="mt-4 text-lg leading-relaxed">{a.intro}</p>

        {a.bagian.map((b) => (
          <section
            key={b.judul}
            className="mt-8"
            aria-labelledby={`b-${b.judul.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
          >
            <h2
              id={`b-${b.judul.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
              className="text-xl font-bold"
            >
              {b.judul}
            </h2>

            <ul className="mt-3 space-y-3">
              {b.butir.map((x) => (
                <li
                  key={x.id}
                  className={`rounded-xl border p-4 ${
                    x.darurat
                      ? "border-primary/40 bg-primary/5"
                      : "border-border bg-surface"
                  }`}
                >
                  <h3 className="font-semibold">{x.judul}</h3>
                  <p className="mt-1 leading-relaxed">{x.isi}</p>
                </li>
              ))}
            </ul>
          </section>
        ))}

        {a.sumber.length > 0 && (
          <section className="mt-8" aria-labelledby="sumber-artikel">
            <h2 id="sumber-artikel" className="text-xl font-bold">
              Sumber
            </h2>

            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {a.sumber.map((s) => (
                <li key={s.url}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline underline-offset-2"
                  >
                    {s.judul}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="mt-8">
          <DisclaimerBox />
        </div>
      </article>
    </main>
  );
}
