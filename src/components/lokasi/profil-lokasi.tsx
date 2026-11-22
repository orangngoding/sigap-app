"use client";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, MapPin, RefreshCw } from "lucide-react";
import type { Lokasi } from "@/types";
import { CuacaCard } from "./cuaca-card";
import { GempaCard } from "./gempa-card";
import { IklimCard } from "./iklim-card";
import { PeringatanCard } from "./peringatan-card";
import { PetaLokasi } from "./peta-lokasi.client";
import { BahayaTerpilihCard } from "./bahaya-terpilih-card";
import { RisikoLokasiCard } from "./risiko-lokasi-card";
import { BriefingHarian } from "@/components/beranda/briefing-harian";

export function ProfilLokasi({ lokasi, onGanti }: { lokasi: Lokasi; onGanti: () => void }) {
  const qc = useQueryClient();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-5">
        <div className="flex items-start gap-3">
          <MapPin className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <h2 className="text-lg font-bold text-foreground">{lokasi.kelurahan}</h2>
            <p className="text-sm text-muted-foreground">
              Kec. {lokasi.kecamatan} · {lokasi.kabKota} · {lokasi.provinsi}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== "iklim" })}
            className="inline-flex min-h-10 any-pointer-coarse:min-h-11 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm font-medium hover:bg-muted">
            <RefreshCw className="size-4" aria-hidden="true" /> Muat ulang
          </button>
          <button type="button" onClick={onGanti}
            className="inline-flex min-h-10 any-pointer-coarse:min-h-11 items-center rounded-lg border border-border bg-surface px-3 text-sm font-medium hover:bg-muted">
            Ganti lokasi
          </button>
        </div>
      </div>

      <BriefingHarian varian="lokasi" />

      <PetaLokasi lat={lokasi.lat} lon={lokasi.lon} label={`Peta ${lokasi.kelurahan}`} presisi={lokasi.presisi} nama={lokasi.kelurahan} />

      <CuacaCard adm4={lokasi.adm4} lat={lokasi.lat} lon={lokasi.lon} provinsi={lokasi.provinsi} nama={lokasi.kelurahan} />

      <div className="grid gap-4 lg:grid-cols-2">
        <PeringatanCard lokasi={lokasi} />
        <GempaCard lat={lokasi.lat} lon={lokasi.lon} />
        <div className="lg:col-span-2"><IklimCard lat={lokasi.lat} lon={lokasi.lon} /></div>
      </div>

      <RisikoLokasiCard lokasi={lokasi} />

      <BahayaTerpilihCard />

      {/* HP dan tablet: aksi utama menempel di bawah layar (di atas navigasi bawah) agar selalu terjangkau jempol,
          bukan baru muncul sesudah semua kartu. Desktop: di akhir halaman seperti biasa. */}
      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 flex justify-end pt-2 lg:static lg:z-auto">
        <Link href="/rencana/profil"
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 text-base font-semibold text-primary-foreground shadow-[0_10px_28px_-10px_rgb(13_31_30/0.45)] transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:w-auto lg:rounded-lg lg:text-sm lg:shadow-none">
          Lanjut: isi profil keluarga <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
