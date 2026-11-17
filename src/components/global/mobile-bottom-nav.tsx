
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  ClipboardList,
  Home,
  MapPin,
  MessageCircle,
  MoreHorizontal,
} from "lucide-react";

const navigation = [
  {
    label: "Beranda",
    href: "/",
    icon: Home,
  },
  {
    label: "Lokasi",
    href: "/lokasi",
    icon: MapPin,
  },
  {
    label: "Rencana",
    href: "/rencana",
    icon: ClipboardList,
  },
  {
    label: "Tanya",
    href: "/tanya",
    icon: MessageCircle,
  },
];

const moreNavigation = [
  {
    label: "Pustaka",
    href: "/pustaka",
    icon: BookOpen,
  },
  {
    label: "Metodologi",
    href: "/metodologi",
  },
  {
    label: "Data Saya",
    href: "/data-saya",
  },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  // Tutup menu "Lainnya" saat pengguna mengetuk di luar navigasi atau menekan Esc.
  useEffect(() => {
    if (!isMoreOpen) return;
    const tutupLuar = (e: PointerEvent) => {
      if (!navRef.current?.contains(e.target as Node)) setIsMoreOpen(false);
    };
    const tutupEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMoreOpen(false);
    };
    document.addEventListener("pointerdown", tutupLuar);
    document.addEventListener("keydown", tutupEsc);
    return () => {
      document.removeEventListener("pointerdown", tutupLuar);
      document.removeEventListener("keydown", tutupEsc);
    };
  }, [isMoreOpen]);


  function isActive(href: string) {
    if (href === "/") {
        return pathname === "/";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
    }

  const isMoreActive = moreNavigation.some((item) =>
    isActive(item.href)
  );

  return (
    <nav
      ref={navRef}
      aria-label="Navigasi bawah"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div className="mx-auto grid h-16 max-w-lg grid-cols-5">
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsMoreOpen(false)}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center justify-center gap-1 text-xs transition-colors ${
                active
                  ? "font-semibold text-primary"
                  : "text-muted-foreground hover:text-primary"
              }`}
            >
              <Icon
                className="size-5"
                strokeWidth={active ? 2.25 : 1.75}
                aria-hidden="true"
              />
              <span>{item.label}</span>
            </Link>
          );
        })}

        <button
          type="button"
          aria-expanded={isMoreOpen}
          aria-controls="mobile-more-menu"
          onClick={() => setIsMoreOpen((open) => !open)}
          className={`flex flex-col items-center justify-center gap-1 text-xs transition-colors ${
            isMoreOpen || isMoreActive
              ? "font-semibold text-primary"
              : "text-muted-foreground hover:text-primary"
          }`}
        >
          <MoreHorizontal
            className="size-5"
            strokeWidth={isMoreOpen || isMoreActive ? 2.25 : 1.75}
            aria-hidden="true"
          />
          <span>Lainnya</span>
        </button>
      </div>

      {isMoreOpen && (
        <div
          id="mobile-more-menu"
          className="absolute right-3 bottom-full mb-2 w-52 rounded-xl border border-border bg-surface p-2 shadow-lg"
        >
          <div className="px-3 py-2 text-xs font-semibold text-muted-foreground">
            MENU LAINNYA
          </div>

          {moreNavigation.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMoreOpen(false)}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-accent font-semibold text-primary"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                {Icon ? (
                  <Icon className="size-4" aria-hidden="true" />
                ) : null}
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}
