import type { Metadata } from "next";
import { WizardView } from "@/components/rencana/wizard-view";

export const metadata: Metadata = {
  title: "Profil Keluarga",
  description: "Pilih bahaya dan isi profil rumah tangga untuk menyusun Rencana Siaga yang sesuai kondisi keluarga Anda.",
};

export default function ProfilPage() {
  return (
    <main id="konten" tabIndex={-1} className="flex-1 focus:outline-none">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <WizardView />
      </div>
    </main>
  );
}
