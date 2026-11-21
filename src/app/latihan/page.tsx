import { Suspense } from "react";
import type { Metadata } from "next";
import { SimulatorView } from "@/components/simulasi/simulator-view";
import { KepalaHalaman } from "@/components/global/kepala-halaman";
import { DisclaimerBox } from "@/components/global/disclaimer-box";
import { FOTO } from "@/lib/gambar";

export const metadata: Metadata = {
  title: "Simulator Bencana AI",
  description: "Simulasi saat bencana yang disusun AI untuk keluarga, rumah, lokasi, dan prakiraan nyata minggu ini, dengan tingkat dasar, menantang, dan bencana beruntun, serta uji pemahaman sebelum dan sesudah sehingga peningkatannya terukur.",
};

/** Latihan Siaga = Simulator Bencana AI. `?bahaya=` (dari tautan lama atau Asisten) dibaca di dalam Suspense. */
export default function LatihanPage() {
  return (
    <main id="konten" tabIndex={-1} className="flex-1 focus:outline-none">
      <KepalaHalaman
        label="Latihan Siaga · Simulator Bencana AI"
        judul="Rasakan bencananya sebelum terjadi, putuskan dengan tepat saat terjadi"
        deskripsi="AI menyusun simulasi dari keadaan nyata Anda: anggota keluarga yang rentan, jenis rumah, kendaraan, risiko di lokasi, bahkan prakiraan cuaca minggu ini. Pilih tingkat dasar, menantang, atau bencana beruntun. Uji awal singkat menunjukkan hal yang perlu dipelajari, dan setiap keputusan dijelaskan akibatnya dari panduan resmi."
        foto={FOTO.evakuasi}
        lebar="max-w-3xl"
      />
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <Suspense fallback={<div className="h-80 animate-pulse rounded-3xl bg-muted motion-reduce:animate-none" aria-busy="true" />}>
          <SimulatorView />
        </Suspense>
        <DisclaimerBox />
      </div>
    </main>
  );
}
