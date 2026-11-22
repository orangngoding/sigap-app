"use client";
import { useSyncExternalStore } from "react";

const KUERI = "(prefers-reduced-motion: reduce)";

/**
 * Preferensi "kurangi gerakan" yang aman untuk hydration: saat hydration memakai nilai server (false), lalu langsung
 * mengikuti preferensi perangkat. Berbeda dengan `useReducedMotion` dari motion, yang membaca preferensi pada render
 * pertama klien sehingga HTML server dan klien bisa berbeda bagi pengguna yang mengaktifkannya.
 */
export function useKurangiGerak(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(KUERI);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(KUERI).matches,
    () => false,
  );
}
