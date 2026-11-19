import type { Metadata } from "next";
import { KepalaHalaman } from "@/components/global/kepala-halaman";
import { SiagaIklim } from "@/components/iklim/siaga-iklim";
import { FOTO } from "@/lib/gambar";

export const metadata: Metadata = {
  title: "Siaga Iklim",
  description: "Lihat bulan mana yang paling rawan panas, hujan lebat, dan kemarau di wilayah Anda, uji seberapa siap rumah Anda, lalu dapatkan tindakan yang perlu dilakukan lebih dulu.",
};

export default function IklimPage() {
  return (
    <main id="konten" tabIndex={-1} className="flex-1 focus:outline-none">
      <KepalaHalaman
        label="Siaga Iklim"
        judul="Bersiap sebelum bulan rawan tiba"
        deskripsi="Lihat dampak perubahan iklim pada rumah Anda, dan langkah paling berarti yang bisa dimulai hari ini."
        foto={FOTO.kekeringan}
      />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <SiagaIklim />
      </div>
    </main>
  );
}
