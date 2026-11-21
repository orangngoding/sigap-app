import Link from "next/link";
import { BookOpen, Newspaper } from "lucide-react";

const TAB = [
  { id: "artikel", href: "/pustaka", label: "Artikel panduan", Ikon: BookOpen },
  { id: "berita", href: "/pustaka/berita", label: "Berita bencana terkini", Ikon: Newspaper },
] as const;

/** Pindah antara dua isi Pustaka: artikel panduan dan berita bencana (sama dengan menu tarik-turun di navigasi). */
export function PustakaTab({ aktif }: { aktif: (typeof TAB)[number]["id"] }) {
  return (
    <nav aria-label="Isi Pustaka" className="tanpa-cetak inline-flex gap-1 rounded-2xl border border-border bg-surface p-1 shadow-sm">
      {TAB.map(({ id, href, label, Ikon }) => {
        const ya = id === aktif;
        return (
          <Link
            key={id}
            href={href}
            aria-current={ya ? "page" : undefined}
            className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-primary ${ya ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
          >
            <Ikon className="size-4" aria-hidden="true" /> {label}
          </Link>
        );
      })}
    </nav>
  );
}
