import type { Metadata } from "next";
import { Suspense } from "react";
import { KepalaHalaman } from "@/components/global/kepala-halaman";
import { SiagaIklim } from "@/components/iklim/siaga-iklim";
import { FOTO } from "@/lib/gambar";

export const metadata: Metadata = {
  title: "Siaga Iklim",
  description: "Siaga cuaca dan iklim untuk keluarga: hujan lebat, panas, kekeringan, karhutla, dan kualitas udara 16 hari ke depan, bulan rawan musim ini, sampai kesiapan rumah 10-25 tahun lagi.",
};

export default function IklimPage() {
  return (
    <main id="konten" tabIndex={-1} className="flex-1 focus:outline-none">
      <KepalaHalaman
        label="Siaga Iklim"
        judul="Siaga cuaca dan iklim, dari minggu ini sampai 25 tahun lagi"
        deskripsi="Hujan lebat, panas berbahaya, kekeringan, karhutla, dan asap di wilayah Anda: kapan datangnya, apa dampaknya bagi keluarga, dan apa yang perlu dilakukan sekarang."
        foto={FOTO.kekeringan}
      />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* useSearchParams() (tab ?tab=) di komponen klien wajib dibungkus Suspense */}
        <Suspense fallback={<div className="h-80 animate-pulse rounded-3xl bg-muted" aria-busy="true" />}>
          <SiagaIklim />
        </Suspense>
      </div>
    </main>
  );
}
