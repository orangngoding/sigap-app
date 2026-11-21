"use client";
import { useMemo } from "react";
import { ExternalLink } from "lucide-react";
import type { KlimatologiResponse } from "@/lib/data/klimatologi";
import { NAMA_BULAN, bulanWib, kalenderDariBulanan } from "@/lib/iklim/ketahanan";
import { rentangBulan } from "@/lib/iklim/keputusan";
import { TeksPihak } from "@/components/rencana/teks-pihak";
import type { KondisiGlobal } from "@/lib/data/iklim-global";

const fmt = (v: number, d = 1) => v.toLocaleString("id-ID", { maximumFractionDigits: d });

/** Halaman resmi Prediksi Musim BMKG (diperiksa aktif 19 November 2026; rilis terbaru: Prediksi Musim Hujan 2026/2027). */
export const URL_PREDIKSI_MUSIM_BMKG = "https://www.bmkg.go.id/iklim/prakiraan-musim.bmkg";

/** Ringkasan satu kalimat per jenis risiko dari pola pengamatan 1991-2020, dengan peringatan bila tahun ini menyimpang (El Niño/La Niña). */
export function RingkasanKalender({ k, namaWilayah, global }: { k: KlimatologiResponse; namaWilayah: string; global?: KondisiGlobal | null }) {
  const kal = useMemo(() => kalenderDariBulanan(k.bulanan), [k]);
  const adaKering = kal.some((b) => b.kering);
  const idx = (f: (b: (typeof kal)[number]) => boolean) => kal.filter(f).map((b) => b.bulan);
  const baris = [
    { k: "Panas terik", v: rentangBulan([...NAMA_BULAN], idx((b) => b.puncakPanas)) },
    { k: "Hujan lebat", v: rentangBulan([...NAMA_BULAN], idx((b) => b.puncakHujan)) },
    adaKering
      ? { k: "Bulan kering", v: rentangBulan([...NAMA_BULAN], idx((b) => b.kering)) }
      : { k: "Paling kering", v: rentangBulan([...NAMA_BULAN], idx((b) => b.palingKering)) },
  ];
  const menyimpang = global && global.pengaruh !== "netral";
  return (
    <div>
      <p className="text-base leading-relaxed text-foreground">
        Menurut pengamatan iklim {k.periode.label} (periode normal standar), ini bulan yang paling rawan di <strong>{namaWilayah}</strong> pada tahun biasa. Siapkan rumah sebelum bulan-bulan itu tiba.
      </p>
      <dl className="mt-4 grid gap-x-8 gap-y-2 sm:grid-cols-[auto_1fr]">
        {baris.map(({ k: label, v }) => (
          <div key={label} className="contents">
            <dt className="text-sm font-semibold text-muted-foreground">{label}</dt>
            <dd className="text-base font-semibold text-foreground">{v}</dd>
          </div>
        ))}
      </dl>
      {menyimpang && (
        <p className="mt-4 max-w-3xl rounded-2xl bg-warning px-4 py-3 text-sm leading-relaxed text-warning-foreground">
          <strong>Tahun ini tidak biasa:</strong> karena {global.enso.fase === "el_nino" ? "El Niño" : "La Niña"}
          {global.enso.kekuatan ? ` ${global.enso.kekuatan.replace("_", " ")}` : ""}, hujan tahun ini cenderung {global.pengaruh === "kering" ? "di bawah" : "di atas"} pola rata-rata ini
          {global.pengaruh === "kering" ? " dan awal musim hujan bisa mundur, sehingga bulan kering terasa lebih panjang." : ", sehingga risiko banjir dan longsor di bulan basah lebih tinggi."}
        </p>
      )}
      <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">
        <TeksPihak>Ini pola rata-rata, bukan ramalan tahun ini. Untuk perkiraan kapan kemarau atau musim hujan tahun ini dimulai di zona Anda, lihat</TeksPihak>{" "}
        <a href={URL_PREDIKSI_MUSIM_BMKG} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary underline underline-offset-2">
          Prediksi Musim BMKG<ExternalLink className="size-3.5" aria-hidden="true" /><span className="sr-only"> (membuka situs BMKG di tab baru)</span>
        </a>.
      </p>
    </div>
  );
}

/** Tabel 12 bulan. Angka selalu tertulis; batang hanya pelengkap, dan label teks menandai bulan puncak. */
export function KalenderRisiko({ k }: { k: KlimatologiResponse }) {
  const baris = useMemo(() => kalenderDariBulanan(k.bulanan), [k]);
  const sekarang = bulanWib(new Date());
  const adaKering = baris.some((b) => b.kering);
  const maks = {
    panas: Math.max(1, ...baris.map((b) => b.hariSangatPanas)),
    hujan: Math.max(0.5, ...baris.map((b) => b.hariHujanEkstrem)),
    mm: Math.max(1, ...baris.map((b) => b.hujanMm)),
  };

  return (
    <div>
      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-120 border-collapse text-sm">
          <caption className="sr-only">Rata-rata pengamatan per bulan {k.periode.label}: hari sangat panas, hari hujan lebat, dan total hujan.</caption>
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th scope="col" className="px-3 py-2.5 font-semibold sm:px-4">Bulan</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">Hari sangat panas</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">Hari hujan lebat</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">Hujan (mm)</th>
            </tr>
          </thead>
          <tbody>
            {baris.map((b) => (
              <tr key={b.bulan} aria-current={b.bulan === sekarang ? "date" : undefined} className={`border-b border-border/60 last:border-0 ${b.bulan === sekarang ? "bg-primary/5" : ""}`}>
                <th scope="row" className="px-3 py-2.5 text-left font-semibold sm:px-4">
                  {b.nama}
                  {b.bulan === sekarang && <span className="ml-1.5 text-xs font-medium text-primary">sekarang</span>}
                  <span className="mt-0.5 flex flex-wrap gap-1 empty:hidden">
                    {b.puncakPanas && <span className="rounded bg-orange-100 px-1.5 text-xs font-semibold text-orange-900">Puncak panas</span>}
                    {b.puncakHujan && <span className="rounded bg-sky-100 px-1.5 text-xs font-semibold text-sky-900">Puncak hujan lebat</span>}
                    {b.kering && <span className="rounded bg-amber-100 px-1.5 text-xs font-semibold text-amber-900">Kering</span>}
                    {!adaKering && b.palingKering && <span className="rounded bg-amber-100 px-1.5 text-xs font-semibold text-amber-900">Paling kering</span>}
                  </span>
                </th>
                <Sel nilai={fmt(b.hariSangatPanas)} persen={(b.hariSangatPanas / maks.panas) * 100} warna="bg-orange-300" />
                <Sel nilai={fmt(b.hariHujanEkstrem)} persen={(b.hariHujanEkstrem / maks.hujan) * 100} warna="bg-sky-300" />
                <Sel nilai={fmt(b.hujanMm, 0)} persen={(b.hujanMm / maks.mm) * 100} warna="bg-slate-300" />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        Rata-rata per bulan dari pengamatan {k.periode.label} ({k.sumber.nama}). Hari sangat panas: suhu siang di atas {fmt(k.ambang.sangatPanasC)}°C (5% hari terpanas).
        Hari hujan lebat: di atas {fmt(k.ambang.hujanEkstremMm, 0)} mm per hari. Bulan kering: hujan kurang dari 60 mm (kriteria BMKG); bila tak ada, tiga bulan terkering ditandai “paling kering”. Puncak: tiga bulan tertinggi.
        {k.sumber.nama.startsWith("NASA") && " Data cadangan NASA POWER (grid sekitar 50 km) dipakai karena layanan ERA5 sedang penuh: suhu siangnya bisa beberapa derajat di bawah suhu stasiun kota, tetapi ambang sangat panas dihitung dari grid yang sama sehingga jumlah harinya tetap sebanding."}
      </p>
    </div>
  );
}

function Sel({ nilai, persen, warna }: { nilai: string; persen: number; warna: string }) {
  return (
    <td className="px-3 py-2.5">
      <div className="flex items-center gap-2">
        <span className="w-9 shrink-0 text-right font-semibold tabular-nums">{nilai}</span>
        <span className="hidden h-2 min-w-8 flex-1 overflow-hidden rounded-full bg-muted sm:block" aria-hidden="true">
          <span className={`block h-full rounded-full ${warna}`} style={{ width: `${Math.max(0, Math.min(100, persen))}%` }} />
        </span>
      </div>
    </td>
  );
}
