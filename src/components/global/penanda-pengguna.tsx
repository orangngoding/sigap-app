"use client";
import { useEffect } from "react";

/**
 * Menandai <html>: data-pengguna="lama" bila lokasi sudah tersimpan, data-rencana="ada" bila rencana nyata (bukan
 * contoh) sudah tersimpan. CSS memakai penanda ini untuk meringkas Beranda di HP dan tablet. Hanya membaca
 * localStorage di perangkat; tidak ada data yang dikirim ke mana pun. Tanpa impor dan tanpa variabel luar, karena
 * sumber fungsinya juga ditanam apa adanya sebagai skrip inline.
 */
function bacaPenanda() {
  try {
    const ambil = function (k: string) {
      const v = localStorage.getItem(k);
      return v ? JSON.parse(v).state : null;
    };
    const l = ambil("sigap:v1:lokasi");
    const r = ambil("sigap:v1:rencana");
    const d = document.documentElement;
    if (l && l.lokasi) d.dataset.pengguna = "lama";
    else delete d.dataset.pengguna;
    if (r && r.rencana && r.rencana.mode !== "contoh") d.dataset.rencana = "ada";
    else delete d.dataset.rencana;
  } catch {
    /* penyimpanan tidak tersedia: Beranda tampil lengkap seperti untuk pengguna baru */
  }
}

/** Skrip inline di awal <body>: penanda sudah ada sebelum halaman tampil, jadi tidak ada lompatan tata letak. */
export function PenandaPengguna() {
  return <script dangerouslySetInnerHTML={{ __html: `(${bacaPenanda.toString()})()` }} />;
}

/**
 * Dipasang di Beranda: membaca ulang penanda saat Beranda dibuka lewat navigasi di dalam aplikasi (mis. sesudah
 * memilih lokasi atau menghapus data), karena skrip inline hanya berjalan saat halaman dimuat penuh.
 */
export function SegarkanPenanda() {
  useEffect(() => bacaPenanda(), []);
  return null;
}
