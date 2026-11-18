"use client";
import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "motion/react";

/** Angka yang bergerak halus menuju nilai baru (skor, nilai latihan). "Kurangi gerakan" = langsung. */
export function useAngkaHalus(target: number, opsi: { durasi?: number; tunda?: number } = {}): number {
  const diam = useReducedMotion();
  const [n, setN] = useState(0);
  const kini = useRef(0);
  useEffect(() => {
    const c = animate(kini.current, target, {
      duration: diam ? 0 : (opsi.durasi ?? 0.9),
      delay: diam ? 0 : (opsi.tunda ?? 0),
      ease: [0.2, 0, 0, 1],
      onUpdate: (v) => {
        kini.current = v;
        setN(Math.round(v));
      },
    });
    return () => c.stop();
  }, [target, diam, opsi.durasi, opsi.tunda]);
  return n;
}
