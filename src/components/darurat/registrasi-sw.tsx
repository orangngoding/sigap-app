"use client";
import { useEffect } from "react";

/** Daftarkan service worker hanya di halaman Mode Darurat agar bisa dibuka tanpa internet. */
export function RegistrasiSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
  }, []);
  return null;
}
