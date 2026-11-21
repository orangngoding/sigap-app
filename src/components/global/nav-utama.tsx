"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { DropdownMenu } from "radix-ui";
import { BookOpen, ChevronDown, ClipboardList, Dumbbell, MapPin, MessageCircle, Newspaper, Thermometer } from "lucide-react";

const NAV = [
  { label: "Lokasi", href: "/lokasi", Ikon: MapPin },
  { label: "Siaga Iklim", href: "/iklim", Ikon: Thermometer },
  { label: "Rencana", href: "/rencana", Ikon: ClipboardList },
  { label: "Simulasi", href: "/latihan", Ikon: Dumbbell },
  { label: "Asisten", href: "/tanya", Ikon: MessageCircle },
];

const PUSTAKA = [
  { label: "Artikel panduan", ket: "Panduan siaga dari BNPB, BMKG, Kemenkes", href: "/pustaka", Ikon: BookOpen },
  { label: "Berita bencana terkini", ket: "Media, ANTARA, dan peringatan GDACS", href: "/pustaka/berita", Ikon: Newspaper },
];

const KELAS_MENU = "relative flex min-h-11 items-center gap-2 whitespace-nowrap rounded-xl px-2.5 text-sm lg:px-3.5 font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-primary";

function Sorotan() {
  return <motion.span layoutId="nav-aktif" className="absolute inset-0 -z-10 rounded-xl bg-primary shadow-sm shadow-primary/30" transition={{ type: "spring", stiffness: 420, damping: 34 }} />;
}

/** Pustaka berisi dua halaman: artikel panduan dan berita bencana, dipilih lewat menu tarik-turun. */
function MenuPustaka({ path }: { path: string }) {
  const aktif = path === "/pustaka" || path.startsWith("/pustaka/");
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger className={`${KELAS_MENU} data-[state=open]:text-foreground ${aktif ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
        {aktif && <Sorotan />}
        <BookOpen className="hidden size-4 xl:block" aria-hidden="true" />
        Pustaka
        <ChevronDown className="size-3.5 transition-transform in-data-[state=open]:rotate-180" aria-hidden="true" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={10} className="z-[60] w-72 rounded-2xl border border-border bg-surface p-1.5 shadow-xl shadow-black/10 data-[state=open]:[animation:sigap-masuk_180ms_both]">
          {PUSTAKA.map(({ label, ket, href, Ikon }) => {
            const ini = path === href || (href !== "/pustaka" && path.startsWith(href)) || (href === "/pustaka" && path.startsWith("/pustaka/") && !path.startsWith("/pustaka/berita"));
            return (
              <DropdownMenu.Item key={href} asChild>
                <Link href={href} aria-current={ini ? "page" : undefined} className={`flex items-start gap-3 rounded-xl p-3 outline-none data-[highlighted]:bg-muted ${ini ? "bg-primary/5" : ""}`}>
                  <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${ini ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}><Ikon className="size-4" aria-hidden="true" /></span>
                  <span>
                    <span className="block text-sm font-semibold text-foreground">{label}</span>
                    <span className="block text-xs text-muted-foreground">{ket}</span>
                  </span>
                </Link>
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/** Navigasi desktop; latar halaman aktif bergeser halus antar-menu. */
export function NavUtama() {
  const path = usePathname();
  return (
    <nav aria-label="Navigasi utama" className="isolate hidden items-center gap-1 rounded-2xl border border-border/70 bg-surface/60 p-1 md:flex">
      {NAV.map(({ label, href, Ikon }) => {
        const aktif = path === href || path.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={aktif ? "page" : undefined}
            className={`${KELAS_MENU} ${aktif ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {aktif && <Sorotan />}
            <Ikon className="hidden size-4 xl:block" aria-hidden="true" />
            {label}
          </Link>
        );
      })}
      <MenuPustaka path={path} />
    </nav>
  );
}
