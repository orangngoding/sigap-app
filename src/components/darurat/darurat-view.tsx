"use client";
import Link from "next/link";
import { Phone } from "lucide-react";
import { useHydrate } from "@/hooks/use-hydrate";
import { HAZARD_BY_ID } from "@/lib/hazards/hazards";
import { langkahSaat } from "@/lib/rencana/ringkas-saat";
import kontak from "@/generated/kontak.json";
import { useRencanaStore } from "@/stores/rencana-store";
import { useProfilStore } from "@/stores/profil-store";
import { finalisasiProfil } from "@/lib/preparedness/profil-schema";

/** Mode Darurat: kontras tinggi, sasaran sentuh 56 px, tanpa data jaringan (Blueprint 7.6). */
export function DaruratView() {
  const siap = useHydrate(useRencanaStore, useProfilStore);
  const rencana = useRencanaStore((s) => s.rencana);
  const profil = finalisasiProfil(useProfilStore((s) => s.profil));
  if (!siap) return <p className="p-6 text-lg">Memuat…</p>;
  const grup = rencana && profil ? langkahSaat(rencana.tindakan, profil.bahaya, 5) : [];

  return (
    <div className="min-h-screen bg-black p-4 text-white">
      <h1 className="text-3xl font-extrabold">Mode Darurat</h1>
      <p className="mt-1 text-lg">Tetap tenang. Lindungi diri dulu, lalu hubungi bantuan.</p>

      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {kontak.kontak.map((k) => (
          <li key={k.nomor}>
            <a href={`tel:${k.nomor}`} className="flex min-h-14 items-center gap-3 rounded-xl border-2 border-white bg-yellow-300 px-4 text-xl font-extrabold text-black focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-white">
              <Phone className="size-6" aria-hidden="true" /> {k.nomor} <span className="text-base font-semibold">{k.nama}</span>
            </a>
          </li>
        ))}
        {profil?.kontakDarurat.map((k, i) => (
          <li key={`k${i}`}>
            <a href={`tel:${k.telepon.replace(/[^\d+]/g, "")}`} className="flex min-h-14 items-center gap-3 rounded-xl border-2 border-white px-4 text-xl font-bold focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-yellow-300">
              <Phone className="size-6" aria-hidden="true" /> {k.nama} <span className="text-base">{k.telepon}</span>
            </a>
          </li>
        ))}
      </ul>

      {grup.length === 0 ? (
        <p className="mt-6 text-lg">Belum ada rencana di perangkat ini. <Link href="/rencana" className="underline">Buat Rencana Siaga</Link> agar langkah Saat kejadian muncul di sini.</p>
      ) : (
        grup.map(({ hazard, langkah }) => (
          <section key={hazard} className="mt-6">
            <h2 className="text-2xl font-bold">{HAZARD_BY_ID[hazard as keyof typeof HAZARD_BY_ID].label}</h2>
            <ol className="mt-2 space-y-2">
              {langkah.map((t, i) => (
                <li key={t.actionId} className="rounded-xl border-2 border-white p-3 text-lg">
                  <span className="font-extrabold">{i + 1}. {t.title}.</span> {t.detail}
                </li>
              ))}
            </ol>
          </section>
        ))
      )}
      <p className="mt-8 text-base">Panduan ini bukan pengganti arahan BNPB, BPBD, dan BMKG. Ikuti petugas di lokasi.</p>
    </div>
  );
}
