import type { Metadata } from "next";
import { DataSayaView } from "@/components/data-saya/data-saya-view";

export const metadata: Metadata = {
  title: "Data Saya",
  description: "Lihat dan hapus data yang tersimpan di perangkat ini.",
};

export default function DataSayaPage() {
  return (
    <main id="konten" tabIndex={-1} className="flex-1 focus:outline-none">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <DataSayaView />
      </div>
    </main>
  );
}
