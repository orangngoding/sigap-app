import Link from "next/link";
import { Suspense } from "react";
import { Lock, ShieldAlert } from "lucide-react";
import { NavUtama } from "./nav-utama";
import { Logo } from "./logo";

export function SiteHeader() {
  return (
    <header className="tanpa-cetak kaca sticky top-0 z-50 w-full border-b border-border/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex min-h-11 shrink-0 items-center rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary" aria-label="SIGAP - Beranda">
          <Logo />
        </Link>

        {/* usePathname pada rute dinamis memerlukan Suspense saat Cache Components aktif. */}
        <Suspense fallback={<div className="hidden flex-1 md:block" />}>
          <NavUtama />
        </Suspense>

        <div className="flex items-center gap-2">
        <Link
          href="/data-saya"
          className="hidden min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:inline-flex"
          title="Data & privasi: lihat, pindahkan, atau hapus data Anda"
        >
          <Lock className="size-4" aria-hidden="true" /> Data &amp; privasi
        </Link>
        <Link
          href="/darurat"
          className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl bg-destructive px-3 text-sm font-bold text-white shadow-sm shadow-red-900/20 hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destructive sm:px-4"
          aria-label="Buka Mode Darurat"
        >
          <span className="size-2.5 rounded-full bg-white" aria-hidden="true" />
          <span className="hidden sm:inline">Mode Darurat</span>
          <ShieldAlert className="size-5 shrink-0 sm:hidden" aria-hidden="true" />
        </Link>
        </div>
      </div>
    </header>
  );
}
