import Link from "next/link";
import { BookOpen, CloudSun, Newspaper } from "lucide-react";

const TAB = [
  { id: "artikel", href: "/pustaka", label: "Artikel panduan", pendek: "Artikel", Ikon: BookOpen },
  { id: "berita", href: "/pustaka/berita", label: "Berita bencana terkini", pendek: "Bencana", Ikon: Newspaper },
  { id: "cuaca", href: "/pustaka/cuaca", label: "Cuaca dan iklim", pendek: "Cuaca", Ikon: CloudSun },
] as const;

/** Pindah antara isi Pustaka: artikel panduan, berita bencana, dan berita cuaca dan iklim (sama dengan menu tarik-turun di navigasi). */
export function PustakaTab({ aktif }: { aktif: (typeof TAB)[number]["id"] }) {
  return (
    <nav aria-label="Isi Pustaka" className="tanpa-cetak inline-flex gap-1 rounded-2xl border border-border bg-surface p-1 shadow-sm">
      {TAB.map(({ id, href, label, pendek, Ikon }) => {
        const ya = id === aktif;
        return (
          <Link
            key={id}
            href={href}
            aria-current={ya ? "page" : undefined}
            className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-primary ${ya ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
          >
            <Ikon className="size-4" aria-hidden="true" />
            {/* HP: label pendek agar tab tidak terlipat dua baris. */}
            <span className="sm:hidden">{pendek}</span>
            <span className="hidden sm:inline">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
