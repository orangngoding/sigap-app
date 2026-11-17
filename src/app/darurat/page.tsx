import type { Metadata } from "next";
import { DaruratView } from "@/components/darurat/darurat-view";

export const metadata: Metadata = { title: "Mode Darurat", description: "Nomor penting dan langkah saat kejadian, kontras tinggi dan bisa dibuka tanpa internet." };

// Service worker didaftarkan di layout untuk semua halaman (lihat src/app/layout.tsx).
export default function DaruratPage() {
  return (
    <main id="konten" tabIndex={-1} className="flex-1 focus:outline-none">
      <DaruratView />
    </main>
  );
}
