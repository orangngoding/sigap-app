"use client";
import { useState } from "react";
import { motion } from "motion/react";
import { Bar, CartesianGrid, ComposedChart, Line, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ProyeksiResponse } from "@/lib/data/proyeksi";
import { LABEL_PERIODE } from "@/lib/iklim/ketahanan";

type KunciGrafik = "hariSangatPanas" | "suhuMaks" | "hujan";
const PILIHAN: Array<{ id: KunciGrafik; label: string; satuan: string; judul: (p: ProyeksiResponse) => string }> = [
  { id: "hariSangatPanas", label: "Hari sangat panas", satuan: "hari", judul: (p) => `Hari sangat panas per tahun (suhu maksimum di atas ${String(p.ambang.sangatPanasC).replace(".", ",")}°C)` },
  { id: "suhuMaks", label: "Suhu siang", satuan: "°C", judul: () => "Rata-rata suhu maksimum harian per tahun" },
  { id: "hujan", label: "Curah hujan", satuan: "mm", judul: () => "Total curah hujan per tahun" },
];

/** Rata-rata bergerak 10 tahun agar tren terbaca di antara naik-turun tahunan. */
function rataBergerak(nilai: Array<number | null>, jendela = 10): Array<number | null> {
  return nilai.map((_, i) => {
    if (i < jendela - 1) return null;
    const xs = nilai.slice(i - jendela + 1, i + 1).filter((v): v is number => v !== null);
    return xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null;
  });
}

const fmt = (v: number) => v.toLocaleString("id-ID", { maximumFractionDigits: 1 });

export function GrafikProyeksi({ data }: { data: ProyeksiResponse }) {
  const [kunci, setKunci] = useState<KunciGrafik>("hariSangatPanas");
  const pilihan = PILIHAN.find((x) => x.id === kunci)!;
  const nilai = data.tahunan.map((t) => t[kunci]);
  const tren = rataBergerak(nilai);
  const rows = data.tahunan.map((t, i) => ({ tahun: t.tahun, nilai: nilai[i], tren: tren[i] }));
  // Label dari konstanta klien: data tersimpan lama masih membawa label "Menuju 2050".
  const [dulu, kini, depan] = data.periode.map((pr) => ({ ...pr, label: LABEL_PERIODE[pr.id] ?? pr.label }));
  const suhu = kunci === "suhuMaks";

  return (
    <div className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">{pilihan.judul(data)}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {suhu ? "Titik" : "Batang"} = nilai tiap tahun (rata-rata dua model). Garis tebal = rata-rata 10 tahun terakhir.
          </p>
        </div>
        <div role="tablist" aria-label="Pilih data grafik" className="tanpa-cetak isolate flex rounded-xl border border-border bg-muted/60 p-1">
          {PILIHAN.map((x) => (
            <button
              key={x.id} type="button" role="tab" aria-selected={kunci === x.id} onClick={() => setKunci(x.id)}
              className={`relative min-h-9 rounded-lg px-3 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-primary sm:text-sm ${kunci === x.id ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {kunci === x.id && <motion.span layoutId="grafik-proyeksi" className="absolute inset-0 -z-10 rounded-lg bg-primary" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
              {x.label}
            </button>
          ))}
        </div>
      </div>

      <div className="cetak-grafik mt-5 h-72 w-full" role="img" aria-label={`${pilihan.judul(data)}, ${data.tahunan[0]?.tahun} sampai ${data.tahunan.at(-1)?.tahun}. ${dulu.label}: ${fmt(dulu.metrik[kunci === "suhuMaks" ? "suhuMaksRata" : kunci === "hujan" ? "hujanTahunan" : "hariSangatPanas"].rata)}, ${depan.label}: ${fmt(depan.metrik[kunci === "suhuMaks" ? "suhuMaksRata" : kunci === "hujan" ? "hujanTahunan" : "hariSangatPanas"].rata)} ${pilihan.satuan}.`}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 22, right: 8, bottom: 0, left: -12 }}>
            {[dulu, kini, depan].map((p, i) => (
              <ReferenceArea
                key={p.id} x1={p.awal} x2={p.akhir} ifOverflow="hidden"
                fill={i === 2 ? "var(--chart-5)" : "var(--muted-foreground)"} fillOpacity={i === 2 ? 0.08 : i === 0 ? 0.04 : 0}
                label={{ value: p.label, position: "insideTop", fontSize: 11, fill: "var(--muted-foreground)", fontWeight: 600 }}
              />
            ))}
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis dataKey="tahun" type="number" domain={["dataMin", "dataMax"]} ticks={[1991, 2000, 2010, 2020, 2030, 2040, 2050]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={{ stroke: "var(--border)" }} />
            <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} domain={suhu ? ["dataMin - 0.3", "dataMax + 0.3"] : [0, "auto"]} tickFormatter={(v: number) => fmt(v)} width={44} />
            <Tooltip
              cursor={{ fill: "var(--muted)", opacity: 0.6 }}
              labelFormatter={(t) => `Tahun ${t}`}
              formatter={(v, n) => [`${fmt(Number(v))} ${pilihan.satuan}`, n === "tren" ? "Rata-rata 10 tahun" : pilihan.label]}
              contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface)", fontSize: 12 }}
            />
            {suhu ? (
              <Line dataKey="nilai" stroke="var(--chart-1)" strokeOpacity={0.45} strokeWidth={1} dot={{ r: 2, fill: "var(--chart-1)", strokeWidth: 0 }} activeDot={{ r: 5 }} isAnimationActive={false} />
            ) : (
              <Bar dataKey="nilai" fill="var(--chart-1)" fillOpacity={0.55} radius={[3, 3, 0, 0]} isAnimationActive={false} />
            )}
            <Line dataKey="tren" stroke="var(--foreground)" strokeWidth={2.25} dot={false} connectNulls isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <details className="tanpa-cetak mt-3 text-sm">
        <summary className="cursor-pointer font-semibold text-primary">Lihat sebagai tabel</summary>
        <div className="mt-2 max-h-64 overflow-auto rounded-xl border border-border">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-muted"><tr><th className="px-3 py-2">Tahun</th><th className="px-3 py-2">{pilihan.label} ({pilihan.satuan})</th><th className="px-3 py-2">Rata-rata 10 tahun</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.tahun} className="border-t border-border"><td className="px-3 py-1.5">{r.tahun}</td><td className="px-3 py-1.5">{r.nilai === null ? "-" : fmt(r.nilai)}</td><td className="px-3 py-1.5">{r.tren === null ? "-" : fmt(r.tren)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
