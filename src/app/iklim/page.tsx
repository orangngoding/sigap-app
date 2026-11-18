import type { Metadata } from "next";
import { KepalaHalaman } from "@/components/global/kepala-halaman";
import { MesinWaktuIklim } from "@/components/iklim/mesin-waktu";
import { FOTO } from "@/lib/gambar";

export const metadata: Metadata = {
  title: "Iklim 2050",
  description: "Mesin Waktu Iklim: bandingkan hari sangat panas, hujan ekstrem, dan kemarau di wilayah Anda pada 1990-an, kini, dan menuju 2050, lalu dapatkan rencana adaptasi keluarga.",
};

export default function IklimPage() {
  return (
    <main id="konten" tabIndex={-1} className="flex-1 focus:outline-none">
      <KepalaHalaman
        label="Mesin Waktu Iklim"
        judul="Seperti apa iklim di wilayahmu pada 2050?"
        deskripsi="Bandingkan hari sangat panas, hujan ekstrem, dan kemarau antara 1990-an, sekarang, dan menuju 2050 dari model iklim global resolusi tinggi. Lalu AI menyusun langkah adaptasi yang sesuai untuk keluargamu."
        foto={FOTO.kekeringan}
      />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <MesinWaktuIklim />
      </div>
    </main>
  );
}
