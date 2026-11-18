import type { Metadata } from "next";
import { LatihanDaftar } from "@/components/latihan/latihan-daftar";
import { DisclaimerBox } from "@/components/global/disclaimer-box";
import { KepalaHalaman } from "@/components/global/kepala-halaman";
import { FOTO } from "@/lib/gambar";

export const metadata: Metadata = {
  title: "Latihan Siaga",
  description: "Simulasi keputusan saat bencana: pilih tindakan, dapat umpan balik dari panduan resmi, dan naikkan skor kesiapsiagaan keluarga.",
};

export default function LatihanPage() {
  return (
    <main id="konten" tabIndex={-1} className="flex-1 focus:outline-none">
      <KepalaHalaman
        label="Latihan Siaga"
        judul="Saat panik, kita bertindak seperti yang pernah dilatih"
        deskripsi="Hadapi situasi bencana dalam simulasi singkat, pilih tindakan, dan lihat alasannya dari panduan resmi BNPB dan BMKG. Lulus dengan nilai 70 ke atas ikut menaikkan skor kesiapsiagaan."
        foto={FOTO.evakuasi}
      />
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <LatihanDaftar />
        <DisclaimerBox />
      </div>
    </main>
  );
}
