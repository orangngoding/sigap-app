import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HAZARD_BY_ID } from "@/lib/hazards/hazards";
import { SKENARIO, SKENARIO_BY_ID } from "@/lib/latihan/skenario";
import { LatihanMain } from "@/components/latihan/latihan-main";
import { KepalaHalaman } from "@/components/global/kepala-halaman";
import { fotoBahaya } from "@/lib/gambar";

type Props = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return SKENARIO.map((s) => ({ id: s.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const s = SKENARIO_BY_ID[(await params).id];
  return s ? { title: `Latihan: ${s.judul}`, description: s.ringkas } : { title: "Latihan tidak ditemukan" };
}

async function LatihanSkenarioPageIsi({ params }: Props) {
  const { id } = await params;
  const s = SKENARIO_BY_ID[id];
  if (!s) notFound();
  return (
    <main id="konten" tabIndex={-1} className="flex-1 focus:outline-none">
      <KepalaHalaman
        label={`Latihan Siaga · ${HAZARD_BY_ID[s.hazard].label}`}
        judul={s.judul}
        deskripsi={`${s.ringkas} Ini simulasi; dalam keadaan nyata ikuti arahan petugas dan hubungi 112 bila darurat.`}
        foto={fotoBahaya(s.hazard)}
        lebar="max-w-3xl"
      >
        <Link href="/latihan" className="inline-flex min-h-10 items-center rounded-full border border-white/25 bg-white/10 px-4 text-sm font-semibold text-white backdrop-blur hover:bg-white/20">Semua latihan</Link>
      </KepalaHalaman>
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <LatihanMain key={s.id} id={s.id} />
      </div>
    </main>
  );
}

/** Cangkang statis; `params` dibaca di dalam Suspense agar navigasi tetap instan (Cache Components). */
export default function LatihanSkenarioPage(props: Props) {
  return (
    <Suspense fallback={<div className="mx-auto h-96 max-w-2xl animate-pulse rounded-2xl bg-muted px-4 py-10" aria-busy="true" />}>
      <LatihanSkenarioPageIsi params={props.params} />
    </Suspense>
  );
}
