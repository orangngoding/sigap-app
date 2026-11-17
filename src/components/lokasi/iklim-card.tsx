"use client";
import { TrendingUp } from "lucide-react";
import { Bar, CartesianGrid, Line, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { IklimResponse } from "@/types";
import { useDataCard, TTL } from "@/hooks/use-data-card";
import { snapGrid, slope } from "@/lib/data/iklim-math";
import { DataCard } from "./data-card";

export function takeawayIklim(d: IklimResponse): string {
  const { awal, akhir } = d.pembanding;
  return `Rata-rata ${awal.rataHariHujanLebat} hari hujan lebat per tahun pada ${awal.periode} dibanding ${akhir.rataHariHujanLebat} pada ${akhir.periode}.`;
}

export function IklimCard({ lat, lon }: { lat: number; lon: number }) {
  const key = `${snapGrid(lat)},${snapGrid(lon)}`;
  const query = useDataCard<IklimResponse>("iklim", key, `/api/iklim?lat=${lat}&lon=${lon}`, TTL.iklim);
  return (
    <DataCard
      title="Tren Iklim" icon={TrendingUp} query={query} minHeight="min-h-80"
      officialUrl="https://open-meteo.com/" takeaway={takeawayIklim}
    >
      {(d) => {
        const xs = d.tahunan.map((t) => t.tahun);
        const ys = d.tahunan.map((t) => t.hariHujanLebat);
        const b = slope(xs, ys);
        const mx = xs.reduce((a, c) => a + c, 0) / xs.length;
        const my = ys.reduce((a, c) => a + c, 0) / ys.length;
        const rows = d.tahunan.map((t) => ({ tahun: t.tahun, hari: t.hariHujanLebat, tren: +(my + b * (t.tahun - mx)).toFixed(2) }));
        return (
          <div className="space-y-2">
            <div className="h-48 w-full" role="img" aria-label={`Grafik hari hujan lebat per tahun, ${d.periode.awal} sampai ${d.periode.akhir}`}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="tahun" tick={{ fontSize: 11 }} interval="preserveStartEnd" minTickGap={24} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip formatter={(v, n) => [v as number, n === "hari" ? "Hari hujan lebat" : "Garis tren"]} />
                  <Bar dataKey="hari" fill="var(--chart-1)" radius={[3, 3, 0, 0]} />
                  <Line dataKey="tren" stroke="var(--foreground)" strokeWidth={1.25} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-muted-foreground">
              Hari hujan lebat = curah hujan harian &gt; {d.ambang.hujanLebatMm} mm (nilai awal, perlu verifikasi klasifikasi BMKG).
              Garis tipis adalah tren linear sederhana, bukan klaim signifikansi statistik.
            </p>
            <p className="text-xs text-muted-foreground">{d.catatan}</p>
          </div>
        );
      }}
    </DataCard>
  );
}
