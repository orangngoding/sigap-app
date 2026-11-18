import type { Metadata } from "next";
import { LokasiView } from "@/components/lokasi/lokasi-view";
import { KepalaHalaman } from "@/components/global/kepala-halaman";
import { FOTO } from "@/lib/gambar";

export const metadata: Metadata = { title: "Lokasi" };

export default function LokasiPage() {
  return (
    <main id="konten" tabIndex={-1} className="flex-1 focus:outline-none">
      <KepalaHalaman
        label="Lokasi"
        judul="Kenali kondisi wilayah tempat tinggalmu"
        deskripsi="Pilih kelurahan atau desa untuk melihat cuaca, peringatan dini, dan gempa terkini dari BMKG, tren hujan lebat, serta Briefing Siaga Hari Ini."
        foto={FOTO.lanskap}
      />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <LokasiView />
      </div>
    </main>
  );
}
