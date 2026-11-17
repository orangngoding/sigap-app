"use client";
import { useSyncExternalStore } from "react";
import { onStorageFailure, storageFailed } from "@/lib/storage/safe-storage";
import { StatusBanner } from "./status-banner";

/** Tampil bila penyimpanan lokal tidak dapat dipakai (mode privat, kuota penuh, diblokir). Blueprint 12.2. */
export function StorageBanner() {
  const gagal = useSyncExternalStore(onStorageFailure, storageFailed, () => false);
  if (!gagal) return null;
  return (
    <StatusBanner tone="warning">
      Data Anda tidak dapat disimpan di perangkat ini. Rencana akan hilang bila halaman ditutup.
    </StatusBanner>
  );
}
