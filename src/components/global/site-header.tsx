
import Link from "next/link";
import {
  BookOpen,
  ClipboardList,
  MapPin,
  MessageCircle,
  ShieldAlert,
} from "lucide-react";

const navigation = [
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
  {
    label: "Pustaka",
    href: "/pustaka",
    icon: BookOpen,
  },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-surface">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2"
          aria-label="SIGAP - Beranda"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <ShieldAlert className="size-5" aria-hidden="true" />
          </span>

          <span className="flex flex-col leading-tight">
            <span className="text-lg font-bold tracking-tight text-foreground">
              SIGAP
            </span>
            <span className="hidden text-[10px] text-muted-foreground sm:block">
              Siaga dan Tanggap Bencana
            </span>
          </span>
        </Link>

        {/* Navigasi Desktop */}
        <nav
          aria-label="Navigasi utama"
          className="hidden items-center gap-6 md:flex"
        >
          {navigation.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                <Icon className="size-4" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Tombol Mode Darurat */}
        <Link
          href="/darurat"
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-destructive px-3 text-sm font-semibold text-white transition-colors hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destructive sm:px-4"
          aria-label="Buka Mode Darurat"
        >
          <ShieldAlert className="size-5 shrink-0" aria-hidden="true" />
          <span className="hidden sm:inline">Mode Darurat</span>
        </Link>
      </div>
    </header>
  );
}
