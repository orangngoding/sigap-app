import Link from "next/link";

export default function NotFound() {
  return (
    <main id="konten" tabIndex={-1} className="flex-1 focus:outline-none">
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="text-3xl font-bold">Halaman tidak ditemukan</h1>
        <p className="mt-3 text-muted-foreground">Alamat yang Anda buka tidak ada atau sudah dipindahkan.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/" className="inline-flex min-h-11 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground">Ke beranda</Link>
          <Link href="/darurat" className="inline-flex min-h-11 items-center rounded-lg border border-border px-5 text-sm font-semibold">Mode Darurat</Link>
        </div>
      </div>
    </main>
  );
}
