"use client";
import { useEffect } from "react";

/**
 * Daftarkan service worker agar Mode Darurat bisa dibuka tanpa internet.
 * Hanya di produksi: di `next dev` nama berkas JS tidak berganti saat kode berubah, sehingga service worker
 * (cache dulu untuk /_next/static) akan terus menyajikan versi lama. Uji mode luring dengan `npm run build && npm start`.
 */
export function RegistrasiSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") {
      void navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => void r.unregister()));
      return;
    }
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
  }, []);
  return null;
}
