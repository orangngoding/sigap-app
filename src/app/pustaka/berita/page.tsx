import type { Metadata } from "next";
import { Suspense } from "react";
import { KepalaHalaman } from "@/components/global/kepala-halaman";
import { BeritaHalaman } from "@/components/pustaka/berita-halaman";
import { PustakaTab } from "@/components/pustaka/pustaka-tab";
import { FOTO } from "@/lib/gambar";

export const metadata: Metadata = {
  title: "Berita bencana terkini",
  description: "Berita bencana 7 hari terakhir dari media Indonesia dan ANTARA, serta peringatan resmi GDACS untuk Indonesia, bisa disaring per jenis bencana.",
};

export default function BeritaPage() {
  return (
    <main id="konten" tabIndex={-1} className="flex-1 focus:outline-none">
      <KepalaHalaman
        label="Pustaka"
        judul="Berita bencana terkini"
        deskripsi="Kejadian bencana di Indonesia dari puluhan media dan kantor berita ANTARA, ditambah peringatan resmi internasional GDACS. Diperbarui otomatis setiap 10 menit."
        foto={FOTO.banjir}
      />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <PustakaTab aktif="berita" />
        <div className="mt-8">
          {/* useSearchParams() (?jenis=) di komponen klien wajib dibungkus Suspense */}
          <Suspense fallback={<div className="h-64 animate-pulse rounded-3xl bg-muted" aria-busy="true" />}>
            <BeritaHalaman />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
