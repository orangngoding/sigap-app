"use client";
import { useState } from "react";
import type { BeritaItem } from "@/types";
import { metaJenis } from "./jenis-berita";

/**
 * Foto berita dari umpan penerbit. Bila tidak ada atau gagal dimuat: panel polos berwarna jenis bencana dengan ikonnya,
 * bukan foto pengganti (foto stok yang berulang terkesan palsu dan bisa dikira foto kejadiannya).
 */
export function GambarBerita({ b, className = "", latar = false }: { b: BeritaItem; className?: string; latar?: boolean; label?: boolean }) {
  const [gagal, setGagal] = useState(false);
  const posisi = `${latar ? "absolute inset-0" : "relative"} block overflow-hidden ${className}`;
  if (!b.gambar || gagal) {
    const { Ikon, bgClass, colorClass } = metaJenis(b.jenis ?? "umum");
    return (
      <span className={`${posisi} grid place-items-center ${bgClass} ${colorClass}`} aria-hidden="true">
        <Ikon className="size-1/4 max-h-12 max-w-12 opacity-80" />
      </span>
    );
  }
  return (
    <span className={`${posisi} bg-muted`}>
      {/* Foto dari umpan RSS penerbit ditampilkan apa adanya bersama tautan ke beritanya. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={b.gambar}
        alt=""
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setGagal(true)}
        className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-[1.04] motion-reduce:transition-none"
      />
    </span>
  );
}
