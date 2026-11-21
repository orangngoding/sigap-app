import type { Metadata } from "next";
import { KelolaKeluarga } from "@/components/rencana/kelola-keluarga";

export const metadata: Metadata = {
  title: "Keluarga yang Didampingi",
  description: "Susun Rencana Siaga untuk banyak keluarga, misalnya warga satu RT, dengan rekap anggota dan kelompok rentan.",
};

export default function KeluargaPage() {
  return (
    <main id="konten" tabIndex={-1} className="flex-1 focus:outline-none">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <KelolaKeluarga />
      </div>
    </main>
  );
}
