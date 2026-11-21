import type { Metadata } from "next";
import { DokumenRencana } from "@/components/rencana/dokumen-rencana";

export const metadata: Metadata = {
  title: "Dokumen Rencana Siaga",
  description: "Rencana Siaga keluarga lengkap dalam bentuk dokumen A4 untuk dicetak atau disimpan sebagai PDF.",
};

export default function CetakRencanaPage() {
  return (
    <main id="konten" tabIndex={-1} className="flex-1 bg-muted/40 focus:outline-none print:bg-white">
      <div className="mx-auto max-w-5xl px-3 py-6 sm:px-6 print:p-0">
        <DokumenRencana />
      </div>
    </main>
  );
}
