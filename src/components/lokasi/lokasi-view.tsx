"use client";
import { useState } from "react";
import { StepIndicator } from "@/components/global/step-indicator";
import { useHydrate } from "@/hooks/use-hydrate";
import { useLokasiStore } from "@/stores/lokasi-store";
import { ProfilLokasi } from "./profil-lokasi";
import { WilayahPicker } from "./wilayah-picker";

export function LokasiView() {
  const hydrated = useHydrate(useLokasiStore);
  const { lokasi, setLokasi } = useLokasiStore();
  const [mengganti, setMengganti] = useState(false);
  const tampilPicker = mengganti || !lokasi;

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
            {/* TODO Blueprint 6.1: ConfirmDialog "Rencana lama dibuat untuk lokasi sebelumnya…" bila rencana sudah ada */}
            <WilayahPicker onSubmit={(l) => { setLokasi(l); setMengganti(false); }} />
          </div>
        ) : (
          <ProfilLokasi lokasi={lokasi} onGanti={() => setMengganti(true)} />
        )}
      </div>
    </>
  );
}
