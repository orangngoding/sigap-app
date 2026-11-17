import type { Metadata } from "next";
import { DaruratView } from "@/components/darurat/darurat-view";
import { RegistrasiSW } from "@/components/darurat/registrasi-sw";

export const metadata: Metadata = { title: "Mode Darurat", description: "Nomor penting dan langkah saat kejadian, kontras tinggi dan bisa dibuka tanpa internet." };

export default function DaruratPage() {
  return (
    <main id="konten" tabIndex={-1} className="flex-1 focus:outline-none">
      <RegistrasiSW />
      <DaruratView />
    </main>
  );
}
