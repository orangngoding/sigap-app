import type { Metadata } from "next";
import { SEMUA_ARTIKEL } from "@/lib/pustaka/data";
import { FOTO, fotoArtikel } from "@/lib/gambar";
import { PustakaDaftar } from "@/components/pustaka/pustaka-daftar";
import { BeritaTerkini } from "@/components/pustaka/berita-terkini";
import { KepalaHalaman } from "@/components/global/kepala-halaman";

export const metadata: Metadata = {
  title: "Pustaka",
  description: "Panduan singkat kesiapsiagaan bencana yang disusun dari sumber resmi BNPB dan BMKG.",
};

export default function PustakaPage() {
  // Artikel unggulan (kartu besar) di depan: banjir, bencana paling sering di Indonesia.
  const urut = [...SEMUA_ARTIKEL].sort((a, b) => Number(b.slug === "siap-menghadapi-banjir") - Number(a.slug === "siap-menghadapi-banjir"));
  const artikel = urut.map(({ slug, title, ringkasan, hazards, kategori, menit }) => ({
    slug, title, ringkasan, hazards, kategori, menit, foto: fotoArtikel(slug, hazards),
  }));
  return (
    <main id="konten" tabIndex={-1} className="flex-1 focus:outline-none">
      <KepalaHalaman
        label="Pustaka"
        judul="Panduan siaga yang bisa dibaca kapan saja"
        deskripsi={`${artikel.length} artikel singkat dari panduan resmi BNPB, BMKG, dan Kemenkes. Tanpa mengisi profil, dan setiap butir menyebut sumbernya.`}
        foto={FOTO.lanskap2}
      />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start xl:grid-cols-[minmax(0,1fr)_22rem]">
          <PustakaDaftar artikel={artikel} />
          <aside aria-label="Berita bencana terkini" className="lg:sticky lg:top-24">
            <BeritaTerkini />
          </aside>
        </div>
      </div>
    </main>
  );
}
