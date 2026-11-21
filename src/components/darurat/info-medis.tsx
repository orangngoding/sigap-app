"use client";
// Info medis untuk penolong (seperti "Medical ID"): golongan darah, alergi, kondisi dan obat penting. Ditunjukkan
// langsung dari layar ini ke petugas atau relawan saat pemilik ponsel tidak bisa bicara. Hanya di perangkat ini.
// Mode Darurat hanya MENAMPILKAN; mengisinya dilakukan selagi tenang di Rencana > Bagikan ("Siapkan Mode Darurat").
import Link from "next/link";
import { Cross, Pencil } from "lucide-react";
import { useHydrate } from "@/hooks/use-hydrate";
import { adaInfoMedis, useMedisStore } from "@/stores/medis-store";

const FOKUS = "focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-white";
const TAUTAN_ISI = "/rencana?tab=bagikan#info-medis";

function Baris({ label, isi }: { label: string; isi: string }) {
  if (!isi.trim()) return null;
  return (
    <div className="py-2">
      <dt className="text-base font-semibold text-black/60">{label}</dt>
      <dd className="text-2xl font-extrabold text-black">{isi}</dd>
    </div>
  );
}

export function InfoMedis() {
  const siap = useHydrate(useMedisStore);
  const m = useMedisStore();
  if (!siap) return null;
  const ada = adaInfoMedis(m);

  return (
    <section aria-labelledby="d-medis" className="mt-8 rounded-3xl border-2 border-white/80 p-5 sm:p-6">
      <h2 id="d-medis" className="flex items-center gap-2 text-2xl font-bold"><Cross className="size-6 text-red-400" aria-hidden="true" /> Info medis untuk penolong</h2>
      {ada ? (
        <>
          <p className="mt-1 text-base text-white/80">Tunjukkan layar ini ke petugas bila Anda tidak bisa bicara. Hanya tersimpan di ponsel ini.</p>
          <dl className="mt-4 divide-y divide-black/10 rounded-2xl bg-white px-5 py-2">
            <Baris label="Nama" isi={m.nama} />
            <Baris label="Golongan darah" isi={m.golonganDarah} />
            <Baris label="Alergi" isi={m.alergi} />
            <Baris label="Penyakit dan obat penting" isi={m.kondisi} />
            <Baris label="Catatan" isi={m.catatan} />
          </dl>
          <Link href={TAUTAN_ISI} className={`mt-3 inline-flex min-h-12 items-center gap-2 text-base font-bold underline underline-offset-4 ${FOKUS}`}>
            <Pencil className="size-4" aria-hidden="true" /> Ubah di Rencana
          </Link>
        </>
      ) : (
        <p className="mt-2 text-base text-white/80">
          Belum diisi. Selagi tenang, isi golongan darah, alergi, dan obat penting di{" "}
          <Link href={TAUTAN_ISI} className={`font-bold underline underline-offset-4 ${FOKUS}`}>Rencana, bagian Siapkan Mode Darurat</Link>.
        </p>
      )}
    </section>
  );
}
