"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { BookOpen, ClipboardList, Dumbbell, MapPin, MessageCircle, Thermometer } from "lucide-react";

const NAV = [
  { label: "Lokasi", href: "/lokasi", Ikon: MapPin },
  { label: "Iklim 2050", href: "/iklim", Ikon: Thermometer },
  { label: "Rencana", href: "/rencana", Ikon: ClipboardList },
  { label: "Latihan", href: "/latihan", Ikon: Dumbbell },
  { label: "Asisten", href: "/tanya", Ikon: MessageCircle },
  { label: "Pustaka", href: "/pustaka", Ikon: BookOpen },
];

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
            className={`relative flex min-h-9 items-center gap-2 whitespace-nowrap rounded-xl px-2.5 text-sm lg:px-3.5 font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-primary ${aktif ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {aktif && (
              <motion.span layoutId="nav-aktif" className="absolute inset-0 -z-10 rounded-xl bg-primary shadow-sm shadow-primary/30" transition={{ type: "spring", stiffness: 420, damping: 34 }} />
            )}
            <Ikon className="hidden size-4 xl:block" aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
