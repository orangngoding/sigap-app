"use client";
import { useRef } from "react";
import { useAngkaHalus } from "@/hooks/use-angka-halus";

/** Angka yang menghitung naik sekali saat dimuat. */
export function AngkaNaik({ nilai, tunda = 0.4 }: { nilai: number; tunda?: number }) {
  const n = useAngkaHalus(nilai, { durasi: 1.6, tunda });
  return (
    <>
      <span aria-hidden="true">{n}</span>
      <span className="sr-only">{nilai}</span>
    </>
  );
}

/**
 * Bungkus kartu dengan efek sorot: cahaya lembut mengikuti penunjuk. Hanya mengubah variabel CSS
 * (tanpa render ulang React); di layar sentuh tidak aktif.
 */
export function Sorot({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      className={`sorot rounded-3xl ${className}`}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse" || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        ref.current.style.setProperty("--sx", `${e.clientX - r.left}px`);
        ref.current.style.setProperty("--sy", `${e.clientY - r.top}px`);
      }}
    >
      {children}
    </div>
  );
}
