"use client";
import { useEffect, useState } from "react";

/** Bentuk minimal API `persist` zustand yang dibutuhkan (kompatibel dengan store mana pun). */
interface PersistStore {
  persist: {
    rehydrate: () => Promise<void> | void;
    hasHydrated: () => boolean;
    onFinishHydration: (fn: () => void) => () => void;
  };
}

/**
 * Pulihkan store dari penyimpanan lokal setelah mount, lalu kembalikan true.
 * Memanggil rehydrate() pada store yang sudah terhidrasi aman (hanya membaca ulang).
 */
export function useHydrate(...stores: PersistStore[]): boolean {
  const [siap, setSiap] = useState(false);
  useEffect(() => {
    let batal = false;
    Promise.all(stores.map((s) => Promise.resolve(s.persist.rehydrate()))).then(() => {
      if (!batal) setSiap(true);
    });
    return () => {
      batal = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return siap;
}
