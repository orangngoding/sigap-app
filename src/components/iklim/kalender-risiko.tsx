"use client";
import { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import type { ProyeksiResponse } from "@/lib/data/proyeksi";
import { NAMA_BULAN, bulanWib, kalenderRisiko } from "@/lib/iklim/ketahanan";
import { rentangBulan } from "@/lib/iklim/keputusan";

const fmt = (v: number, d = 1) => v.toLocaleString("id-ID", { maximumFractionDigits: d });

/** Halaman resmi Prediksi Musim BMKG (diperiksa aktif 19 November 2026; rilis terbaru: Prediksi Musim Hujan 2026/2027). */
export const URL_PREDIKSI_MUSIM_BMKG = "https://www.bmkg.go.id/iklim/prakiraan-musim.bmkg";

type Pilihan = "kini" | "2050";
const PILIHAN: Array<{ id: Pilihan; label: string; rentang: string }> = [
  { id: "kini", label: "Saat ini", rentang: "2011-2030" },
  { id: "2050", label: "10-25 tahun lagi", rentang: "2031-2050" },
];

/** Ringkasan satu kalimat per jenis risiko dari kalender (tanpa angka besar yang dipamerkan). */
export function RingkasanKalender({ p, namaWilayah }: { p: ProyeksiResponse; namaWilayah: string }) {
  const kal = useMemo(() => kalenderRisiko(p, "kini"), [p]);
  const adaKering = kal.some((b) => b.kering);
  const idx = (f: (b: (typeof kal)[number]) => boolean) => kal.filter(f).map((b) => b.bulan);
  const baris = [
    { k: "Panas terik", v: rentangBulan([...NAMA_BULAN], idx((b) => b.puncakPanas)) },
    { k: "Hujan lebat", v: rentangBulan([...NAMA_BULAN], idx((b) => b.puncakHujan)) },
    adaKering
      ? { k: "Bulan kering", v: rentangBulan([...NAMA_BULAN], idx((b) => b.kering)) }
      : { k: "Paling kering", v: rentangBulan([...NAMA_BULAN], idx((b) => b.palingKering)) },
  ];
  return (
    <div>
      <p className="text-base leading-relaxed text-foreground">
        Menurut iklim saat ini (rata-rata 2011-2030), ini bulan yang paling rawan di <strong>{namaWilayah}</strong>. Siapkan rumah sebelum bulan-bulan itu tiba.
      </p>
      <dl className="mt-4 grid gap-x-8 gap-y-2 sm:grid-cols-[auto_1fr]">
        {baris.map(({ k, v }) => (
          <div key={k} className="contents">
            <dt className="text-sm font-semibold text-muted-foreground">{k}</dt>
            <dd className="text-base font-semibold text-foreground">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Ini pola rata-rata, bukan ramalan tahun ini. Untuk perkiraan kapan kemarau atau musim hujan tahun ini dimulai di zona Anda, lihat{" "}
        <a href={URL_PREDIKSI_MUSIM_BMKG} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary underline underline-offset-2">
          Prediksi Musim BMKG<ExternalLink className="size-3.5" aria-hidden="true" /><span className="sr-only"> (membuka situs BMKG di tab baru)</span>
        </a>.
      </p>
    </div>
  );
}

/** Tabel 12 bulan. Angka selalu tertulis; batang hanya pelengkap, dan label teks menandai bulan puncak. */
export function KalenderRisiko({ p }: { p: ProyeksiResponse }) {
  const [periode, setPeriode] = useState<Pilihan>("kini");
  const baris = useMemo(() => kalenderRisiko(p, periode), [p, periode]);
  const sekarang = bulanWib(new Date());
  const adaKering = baris.some((b) => b.kering);
  const maks = {
    panas: Math.max(1, ...baris.map((b) => b.hariSangatPanas)),
    hujan: Math.max(0.5, ...baris.map((b) => b.hariHujanEkstrem)),
    mm: Math.max(1, ...baris.map((b) => b.hujanMm)),
  };

  return (
    <div>
      <div role="group" aria-label="Pilih periode kalender" className="tanpa-cetak inline-flex rounded-full border border-border bg-surface p-1">
        {PILIHAN.map((x) => (
          <button
            key={x.id} type="button" aria-pressed={periode === x.id} onClick={() => setPeriode(x.id)}
            className={`min-h-11 rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary ${periode === x.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {x.label} <span className="text-xs font-medium opacity-80">{x.rentang}</span>
          </button>
        ))}
      </div>

      {periode === "2050" && (
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Mengapa 10-25 tahun lagi? Tandon, atap, dan saluran air dipakai selama itu, jadi keputusan hari ini juga untuk masa tersebut. Model iklim hanya andal sebagai rata-rata 20 tahun, bukan untuk tahun tertentu.
        </p>
      )}
      <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-120 border-collapse text-sm">
          <caption className="sr-only">
            Rata-rata per bulan untuk periode {periode === "2050" ? "10-25 tahun lagi (2031-2050)" : "saat ini (2011-2030)"}: hari sangat panas, hari hujan ekstrem, dan total hujan.
          </caption>
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
        Rata-rata per bulan dalam periode 20 tahun, dari dua model iklim. Hari sangat panas: suhu siang di atas {fmt(p.ambang.sangatPanasC)}°C (5% hari terpanas 1991-2010).
        Hari hujan lebat: di atas {fmt(p.ambang.hujanEkstremMm, 0)} mm per hari. Bulan kering: hujan kurang dari 60 mm; bila tak ada, tiga bulan terkering ditandai “paling kering”. Puncak: tiga bulan tertinggi.
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
