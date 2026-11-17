"use client";
import { useState } from "react";
import type { Lokasi } from "@/types";
import { StepIndicator } from "@/components/global/step-indicator";
import { useHydrate } from "@/hooks/use-hydrate";
import { useLokasiStore } from "@/stores/lokasi-store";
import { useRencanaStore } from "@/stores/rencana-store";
import { ProfilLokasi } from "./profil-lokasi";
import { WilayahPicker } from "./wilayah-picker";

const BTN = "inline-flex min-h-11 items-center rounded-lg border border-border bg-surface px-4 text-sm font-semibold hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export function LokasiView() {
  const hydrated = useHydrate(useLokasiStore, useRencanaStore);
  const { lokasi, setLokasi } = useLokasiStore();
  const rencana = useRencanaStore((s) => s.rencana);
  const tandaiUsang = useRencanaStore((s) => s.tandaiUsang);
  const [mengganti, setMengganti] = useState(false);
  const [menunggu, setMenunggu] = useState<Lokasi | null>(null); // lokasi baru yang menunggu konfirmasi
  const tampilPicker = mengganti || !lokasi;

  const simpan = (l: Lokasi, tandaiRencana: boolean) => {
    setLokasi(l);
    if (tandaiRencana) tandaiUsang(true); // rencana lama tidak dihapus, hanya ditandai (Blueprint 6.1)
    setMenunggu(null);
    setMengganti(false);
  };

  const pilih = (l: Lokasi) => {
    // Konfirmasi hanya bila ada rencana untuk lokasi yang berbeda.
    if (rencana && lokasi && rencana.lokasiAdm4 !== l.adm4) setMenunggu(l);
    else simpan(l, false);
  };

  return (
    <>
      <StepIndicator current="lokasi" done={lokasi ? ["lokasi"] : []} />
      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Lokasi dan Profil Lokasi</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Pilih kelurahan atau desa tempat tinggalmu untuk melihat kondisi terkini dan tren di sekitarnya.
      </p>

      <div className="mt-8">
        {!hydrated ? (
          <div className="h-48 animate-pulse rounded-2xl bg-muted" aria-busy="true" />
        ) : tampilPicker ? (
          <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <WilayahPicker onSubmit={pilih} />
            {menunggu && (
              <div role="alertdialog" aria-labelledby="judul-ganti" aria-describedby="isi-ganti" className="mt-5 rounded-2xl border border-border bg-warning p-4 text-warning-foreground">
                <p id="judul-ganti" className="font-semibold">Ganti lokasi ke {menunggu.kelurahan}?</p>
                <p id="isi-ganti" className="mt-1 text-sm">Rencana lama dibuat untuk lokasi sebelumnya. Rencana akan ditandai &lsquo;perlu diperbarui&rsquo; dan tidak dihapus.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => simpan(menunggu, true)} className={BTN}>Ya, ganti lokasi</button>
                  <button type="button" onClick={() => setMenunggu(null)} className={BTN}>Batal</button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <ProfilLokasi lokasi={lokasi} onGanti={() => setMengganti(true)} />
        )}
      </div>
    </>
  );
}
