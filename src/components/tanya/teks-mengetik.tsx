"use client";
import { useEffect, useMemo, useState } from "react";
import { useReducedMotion } from "motion/react";
import { TeksFormat } from "./teks-format";

const LANGKAH_MS = 35;
const KATA_PER_LANGKAH = 1;
const MAKS_DURASI_MS = 3200;

/**
 * Jawaban tampil bertahap kata demi kata (kesan "mengetik"), lalu utuh. Hanya untuk jawaban yang baru
 * diterima; riwayat langsung utuh. Pembaca layar menerima teks utuh sekaligus (salinan sr-only), dan
 * "kurangi gerakan" melewati efek ini.
 */
export function TeksMengetik({ teks, aktif, onSelesai }: { teks: string; aktif: boolean; onSelesai?: () => void }) {
  const diam = useReducedMotion();
  const potongan = useMemo(() => teks.split(/(\s+)/), [teks]);
  const total = potongan.length;
  // Percepat jawaban panjang agar efek tidak lebih dari ~3 detik.
  const per = Math.max(KATA_PER_LANGKAH, Math.ceil(total / (MAKS_DURASI_MS / LANGKAH_MS)));
  const [n, setN] = useState(0);
  const jalan = aktif && !diam;

  useEffect(() => {
    if (!jalan) return;
    const id = setInterval(() => {
      setN((x) => {
        const b = Math.min(total, x + per * 2); // *2: potongan memuat spasi
        if (b >= total) clearInterval(id);
        return b;
      });
    }, LANGKAH_MS);
    return () => clearInterval(id);
  }, [jalan, total, per]);

  const selesai = !jalan || n >= total;
  useEffect(() => {
    if (selesai && jalan) onSelesai?.();
  }, [selesai, jalan, onSelesai]);

  if (selesai) return <TeksFormat teks={teks} />;
  return (
    <>
      <span className="sr-only">{teks}</span>
      <div aria-hidden="true">
        <TeksFormat teks={potongan.slice(0, n).join("")} />
        <span className="ml-0.5 inline-block h-4 w-1.5 translate-y-0.5 animate-pulse rounded-sm bg-primary/60 motion-reduce:animate-none" />
      </div>
    </>
  );
}
