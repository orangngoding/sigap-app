import type { Metadata } from "next";
import { SEMUA_ARTIKEL } from "@/lib/pustaka/data";
import { PustakaDaftar } from "@/components/pustaka/pustaka-daftar";

export const metadata: Metadata = {
  title: "Pustaka",
  description: "Panduan singkat kesiapsiagaan bencana yang disusun dari sumber resmi BNPB dan BMKG.",
};

export default function PustakaPage() {
  const artikel = SEMUA_ARTIKEL.map(({ slug, title, ringkasan, hazards, kategori, menit }) => ({ slug, title, ringkasan, hazards, kategori, menit }));
  return (
    <main id="konten" tabIndex={-1} className="flex-1 focus:outline-none">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Pustaka</h1>
        <p className="mt-2 text-muted-foreground">Panduan singkat yang bisa dibaca tanpa mengisi profil. Setiap butir menyebut sumbernya.</p>
        <PustakaDaftar artikel={artikel} />
      </div>
    </main>
  );
}
