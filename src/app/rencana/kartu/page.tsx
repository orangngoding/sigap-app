import type { Metadata } from "next";
import { KartuView } from "@/components/kartu/kartu-view";

export const metadata: Metadata = { title: "Kartu Siaga", description: "Kartu Siaga satu halaman untuk dicetak dan ditempel di rumah." };

export default function KartuPage() {
  return (
    <main id="konten" tabIndex={-1} className="flex-1 focus:outline-none">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <KartuView />
      </div>
    </main>
  );
}
