import type { Metadata } from "next";
import { DataSayaView } from "@/components/data-saya/data-saya-view";
import { KepalaHalaman } from "@/components/global/kepala-halaman";

export const metadata: Metadata = {
  title: "Data & privasi",
  description: "Lihat data yang tersimpan di perangkat, unduh aplikasi via browser, cadangkan ke HP lain, atau hapus data.",
};

export default function DataSayaPage() {
  return (
    <main id="konten" tabIndex={-1} className="flex-1 focus:outline-none">
      <KepalaHalaman
        label="Data & privasi"
        judul="Data Anda, di tangan Anda"
        deskripsi="Lihat apa saja yang disimpan SIGAP di perangkat ini, unduh aplikasi via browser, pindahkan ke HP lain, atau hapus kapan saja."
        lebar="max-w-5xl"
      />
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <DataSayaView />
      </div>
    </main>
  );
}
