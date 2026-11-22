import type { Metadata } from "next";
import { Suspense } from "react";
import { KepalaHalaman } from "@/components/global/kepala-halaman";
import { BeritaHalaman } from "@/components/pustaka/berita-halaman";
import { PustakaTab } from "@/components/pustaka/pustaka-tab";
import { FOTO } from "@/lib/gambar";

export const metadata: Metadata = {
  title: "Berita cuaca dan iklim",
  description: "Prakiraan dan peringatan cuaca BMKG, musim hujan dan kemarau, El Niño dan La Niña, suhu panas, serta kualitas udara di Indonesia, 7 hari terakhir dari media nasional.",
};

export default function CuacaPage() {
  return (
    <main id="konten" tabIndex={-1} className="flex-1 focus:outline-none">
      <KepalaHalaman
        label="Pustaka · Siaga Iklim"
        judul="Berita cuaca dan iklim"
        deskripsi="Prakiraan dan peringatan cuaca BMKG, musim hujan dan kemarau, El Niño dan La Niña, suhu panas, dan kualitas udara di Indonesia. Diperbarui otomatis setiap 10 menit."
        foto={FOTO.cuaca_ekstrem}
      />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <PustakaTab aktif="cuaca" />
        <div className="mt-8">
          {/* useSearchParams() (?jenis=) di komponen klien wajib dibungkus Suspense */}
          <Suspense fallback={<div className="h-64 animate-pulse rounded-3xl bg-muted" aria-busy="true" />}>
            <BeritaHalaman mode="cuaca" />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
