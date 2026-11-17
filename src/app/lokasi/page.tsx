import type { Metadata } from "next";
import { LokasiView } from "@/components/lokasi/lokasi-view";

export const metadata: Metadata = { title: "Lokasi" };

export default function LokasiPage() {
  return (
    <main id="konten" tabIndex={-1} className="flex-1 focus:outline-none">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <LokasiView />
      </div>
    </main>
  );
}
