"use client";

export default function Galat({ reset }: { error: Error; reset: () => void }) {
  return (
    <main id="konten" tabIndex={-1} className="flex-1 focus:outline-none">
      <div role="alert" className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="text-3xl font-bold">Terjadi kesalahan</h1>
        <p className="mt-3 text-muted-foreground">Halaman ini gagal dimuat. Data Anda di perangkat tidak berubah. Dalam keadaan darurat hubungi 112.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className="inline-flex min-h-11 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground">Coba lagi</button>
          <a href="/darurat" className="inline-flex min-h-11 items-center rounded-lg border border-border px-5 text-sm font-semibold">Mode Darurat</a>
        </div>
      </div>
    </main>
  );
}
