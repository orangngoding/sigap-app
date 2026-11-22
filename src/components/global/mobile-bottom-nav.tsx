"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  ClipboardList,
  CloudSun,
  Dumbbell,
  FileSearch,
  Home,
  Lock,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Newspaper,
  Thermometer,
  X,
  type LucideIcon,
} from "lucide-react";

interface Menu {
  label: string;
  href: string;
  Ikon: LucideIcon;
}

/**
 * Urutan bar mengikuti navigasi desktop (Lokasi, Siaga Iklim, Rencana), didahului Beranda. Sisanya ada di "Lainnya"
 * dengan urutan desktop yang sama (Simulasi, Asisten, Pustaka) lalu informasi. Nama menu sama persis dengan desktop.
 */
const BAR: Menu[] = [
  { label: "Beranda", href: "/", Ikon: Home },
  { label: "Lokasi", href: "/lokasi", Ikon: MapPin },
  { label: "Siaga Iklim", href: "/iklim", Ikon: Thermometer },
  { label: "Rencana", href: "/rencana", Ikon: ClipboardList },
];

const KELOMPOK: { judul: string; menu: Menu[] }[] = [
  {
    judul: "Fitur",
    menu: [
      { label: "Simulasi", href: "/latihan", Ikon: Dumbbell },
      { label: "Asisten", href: "/tanya", Ikon: MessageCircle },
    ],
  },
  {
    judul: "Pustaka",
    menu: [
      { label: "Artikel panduan", href: "/pustaka", Ikon: BookOpen },
      { label: "Berita bencana terkini", href: "/pustaka/berita", Ikon: Newspaper },
      { label: "Berita cuaca dan iklim", href: "/pustaka/cuaca", Ikon: CloudSun },
    ],
  },
  {
    judul: "Tentang",
    menu: [
      { label: "Data & privasi", href: "/data-saya", Ikon: Lock },
      { label: "Metodologi", href: "/metodologi", Ikon: FileSearch },
    ],
  },
];

const FOKUS = "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary";

export function MobileBottomNav() {
  const pathname = usePathname();
  const [buka, setBuka] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const tombolRef = useRef<HTMLButtonElement>(null);

  // Tutup panel "Lainnya" saat pengguna mengetuk di luar navigasi atau menekan Esc (fokus kembali ke tombolnya).
  useEffect(() => {
    if (!buka) return;
    const tutupLuar = (e: PointerEvent) => {
      if (!navRef.current?.contains(e.target as Node)) setBuka(false);
    };
    const tutupEsc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setBuka(false);
      tombolRef.current?.focus();
    };
    document.addEventListener("pointerdown", tutupLuar);
    document.addEventListener("keydown", tutupEsc);
    return () => {
      document.removeEventListener("pointerdown", tutupLuar);
      document.removeEventListener("keydown", tutupEsc);
    };
  }, [buka]);

  // Pustaka punya tiga halaman: "Artikel panduan" aktif untuk /pustaka dan artikelnya, bukan untuk halaman berita.
  function aktif(href: string) {
    if (href === "/") return pathname === "/";
    if (href === "/pustaka") return pathname === "/pustaka" || (pathname.startsWith("/pustaka/") && !pathname.startsWith("/pustaka/berita") && !pathname.startsWith("/pustaka/cuaca"));
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const lainnyaAktif = KELOMPOK.some((k) => k.menu.some((m) => aktif(m.href)));

  return (
    <nav
      ref={navRef}
      data-bingkai-situs
      aria-label="Navigasi bawah"
      // bg-white/95: kaca 78% membuat angka besar hero (mis. "265") tembus di balik label navigasi.
      className="tanpa-cetak kaca bg-white/95 fixed inset-x-0 bottom-0 z-50 border-t border-border/70 pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {buka && (
        <div
          id="menu-lainnya"
          className="absolute inset-x-0 bottom-full max-h-[calc(100dvh-9rem)] overflow-y-auto rounded-t-3xl border-t border-border bg-surface px-4 pb-3 pt-2 shadow-[0_-12px_32px_-16px_rgb(13_31_30/0.35)] animate-in fade-in-0 slide-in-from-bottom-2 motion-reduce:animate-none"
        >
          <div className="mx-auto max-w-lg">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground">Menu lainnya</h2>
              <button
                type="button"
                onClick={() => {
                  setBuka(false);
                  tombolRef.current?.focus();
                }}
                aria-label="Tutup menu lainnya"
                className={`-mr-2 inline-flex size-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground ${FOKUS}`}
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            {KELOMPOK.map((k) => (
              <section key={k.judul} aria-labelledby={`lainnya-${k.judul}`} className="mt-2 first-of-type:mt-0">
                <h3 id={`lainnya-${k.judul}`} className="px-1 pb-1 pt-2 text-sm font-semibold text-muted-foreground">
                  {k.judul}
                </h3>
                <ul className="grid gap-1">
                  {k.menu.map(({ label, href, Ikon }) => {
                    const ini = aktif(href);
                    return (
                      <li key={href}>
                        <Link
                          href={href}
                          onClick={() => setBuka(false)}
                          aria-current={ini ? "page" : undefined}
                          className={`flex min-h-12 items-center gap-3 rounded-xl px-3 text-base transition-colors ${FOKUS} ${ini ? "bg-accent font-semibold text-primary" : "text-foreground hover:bg-muted"}`}
                        >
                          <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${ini ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}>
                            <Ikon className="size-4" aria-hidden="true" />
                          </span>
                          {label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </div>
      )}

      <div className="mx-auto grid h-16 max-w-lg grid-cols-5">
        {BAR.map(({ label, href, Ikon }) => {
          const ini = aktif(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setBuka(false)}
              aria-current={ini ? "page" : undefined}
              className={`flex min-w-0 flex-col items-center justify-center gap-1 px-0.5 text-xs transition-colors ${FOKUS} ${ini ? "font-semibold text-primary" : "text-muted-foreground hover:text-primary"}`}
            >
              <span className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${ini ? "bg-primary/12" : ""}`}>
                <Ikon className="size-5" strokeWidth={ini ? 2.25 : 1.75} aria-hidden="true" />
              </span>
              <span className="max-w-full truncate">{label}</span>
            </Link>
          );
        })}

        <button
          ref={tombolRef}
          type="button"
          aria-expanded={buka}
          aria-controls="menu-lainnya"
          onClick={() => setBuka((b) => !b)}
          className={`flex min-w-0 flex-col items-center justify-center gap-1 px-0.5 text-xs transition-colors ${FOKUS} ${buka || lainnyaAktif ? "font-semibold text-primary" : "text-muted-foreground hover:text-primary"}`}
        >
          <span className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${buka || lainnyaAktif ? "bg-primary/12" : ""}`}>
            <MoreHorizontal className="size-5" strokeWidth={buka || lainnyaAktif ? 2.25 : 1.75} aria-hidden="true" />
          </span>
          <span>Lainnya</span>
        </button>
      </div>
    </nav>
  );
}
