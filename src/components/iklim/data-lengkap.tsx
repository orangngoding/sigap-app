"use client";
import Link from "next/link";
import { Info } from "lucide-react";
import type { KunciMetrik, ProyeksiResponse } from "@/lib/data/proyeksi";
import { LABEL_PERIODE } from "@/lib/iklim/ketahanan";
import { GrafikProyeksi } from "./grafik-proyeksi";

const fmt = (v: number, d = 1) => v.toLocaleString("id-ID", { maximumFractionDigits: d });


const METRIK: Array<{ k: KunciMetrik; label: string; satuan: string; desimal: number }> = [
  { k: "hariSangatPanas", label: "Hari sangat panas", satuan: "hari/tahun", desimal: 1 },
  { k: "hariPanas", label: "Hari 35°C atau lebih", satuan: "hari/tahun", desimal: 1 },
  { k: "suhuMaksRata", label: "Suhu siang rata-rata", satuan: "°C", desimal: 1 },
  { k: "hujanTahunan", label: "Curah hujan tahunan", satuan: "mm", desimal: 0 },
  { k: "hariHujanEkstrem", label: "Hari hujan ekstrem", satuan: "hari/tahun", desimal: 1 },
  { k: "keringTerpanjang", label: "Kemarau terpanjang (rata-rata per tahun)", satuan: "hari", desimal: 1 },
];

/** Data iklim lengkap untuk yang ingin memeriksa angkanya: tabel tiga periode, grafik 60 tahun, dan catatan kejujuran. */
export function DataLengkap({ p }: { p: ProyeksiResponse }) {
  return (
    <div className="space-y-8">
      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-136 border-collapse text-sm">
          <caption className="sr-only">Metrik iklim per periode 20 tahun, dengan rentang antar-model untuk 2031-2050.</caption>
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th scope="col" className="px-4 py-2.5 font-semibold">Metrik</th>
              {p.periode.map((pr) => <th key={pr.id} scope="col" className="px-3 py-2.5 font-semibold">{LABEL_PERIODE[pr.id] ?? pr.label} <span className="font-normal">({pr.awal}-{pr.akhir})</span></th>)}
              <th scope="col" className="px-3 py-2.5 font-semibold">{p.metode ? "Rentang ansambel 2031-2050" : "Rentang model 2031-2050"}</th>
            </tr>
          </thead>
          <tbody>
            {METRIK.map(({ k, label, satuan, desimal }) => (
              <tr key={k} className="border-b border-border/60 last:border-0">
                <th scope="row" className="px-4 py-2.5 text-left font-semibold">{label} <span className="text-xs font-normal text-muted-foreground">({satuan})</span></th>
                {p.periode.map((pr) => <td key={pr.id} className="px-3 py-2.5 tabular-nums">{fmt(pr.metrik[k].rata, desimal)}</td>)}
                <td className="px-3 py-2.5 tabular-nums text-muted-foreground">{fmt(p.periode[2].metrik[k].min, desimal)}-{fmt(p.periode[2].metrik[k].maks, desimal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        {p.metode ? (
          <>
            <h3 className="text-lg font-bold">Yang sudah tercatat, tahun demi tahun</h3>
            <p className="mt-1 text-sm text-muted-foreground">Grafik ini pengamatan nyata NASA POWER 1991-{p.metode.akhirAmati} di lokasi Anda (kemarau El Niño 2015, 2019, dan 2023 ikut terbaca). Angka 2031-2050 ada di tabel di atas, bukan di grafik, karena dihitung per periode, bukan per tahun.</p>
          </>
        ) : (
          <>
            <h3 className="text-lg font-bold">Enam puluh tahun simulasi dalam satu grafik</h3>
            <p className="mt-1 text-sm text-muted-foreground">Ini simulasi model, bukan rekaman kejadian: batang pada tahun tertentu tidak sama dengan cuaca nyata tahun itu (misalnya kemarau panjang 2015). Yang bermakna adalah arah dan rata-rata antar-periode.</p>
          </>
        )}
        <div className="mt-3"><GrafikProyeksi data={p} /></div>
      </div>

      <aside className="rounded-2xl border border-border bg-muted/50 p-5 text-sm leading-relaxed" aria-labelledby="judul-catatan-iklim">
        <h3 id="judul-catatan-iklim" className="flex items-center gap-2 font-bold"><Info className="size-4 text-primary" aria-hidden="true" /> Cara membaca proyeksi ini dengan jujur</h3>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-muted-foreground">
          <li>{p.catatan}</li>
          <li>Model iklim tidak mengetahui El Niño, La Niña, atau kejadian ekstrem pada tahun tertentu; ia menggambarkan iklim rata-rata dan arah perubahannya. Kondisi tahun berjalan ada di tab Musim ini dan Minggu ini.</li>
          {p.metode ? (
            <li>Perubahan 2031-2050 berasal dari ansambel puluhan model CMIP6 (World Bank Climate Change Knowledge Portal), rata-rata wilayah Indonesia. Angka utama memakai median ansambel; rentang memakai persentil 10 sampai 90. Pemanasan lokal bisa sedikit berbeda dari rata-rata nasional.</li>
          ) : (
            <li>Model: {p.model.join(" dan ")}. Angka utama adalah rata-rata keduanya; rentang model menunjukkan seberapa besar ketidakpastian.</li>
          )}
          <li>Kemarau terpanjang pada Uji Rumah memakai tahun terburuk dalam 20 tahun, bukan rata-rata, agar persiapan tidak terlalu optimistis.</li>
          <li>Ini bukan prakiraan cuaca dan bukan status resmi. Untuk cuaca dan peringatan hari ini, gunakan BMKG di halaman <Link href="/lokasi" className="font-semibold text-primary underline underline-offset-2">Lokasi</Link>.</li>
          <li>
            Sumber: <a href={p.sumber.url} target="_blank" rel="noreferrer" className="font-semibold text-primary underline underline-offset-2">{p.sumber.nama}</a> ({p.sumber.lisensi}).
            Cara perhitungan dan asumsi ada di <Link href="/metodologi#iklim-2050" className="font-semibold text-primary underline underline-offset-2">Metodologi</Link>.
          </li>
        </ul>
      </aside>
    </div>
  );
}
