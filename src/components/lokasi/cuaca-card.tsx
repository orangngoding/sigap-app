"use client";
import { CloudSun, Droplets, Wind } from "lucide-react";
import type { CuacaResponse, IntervalCuaca } from "@/types";
import { useDataCard, TTL } from "@/hooks/use-data-card";
import { hariTanggal, jamLokal, namaHari, tanggalLokal } from "@/lib/utils/format";
import { DataCard } from "./data-card";

/** Kalimat takeaway: dibuat kode (Blueprint 6.2). */
export function takeawayCuaca(d: CuacaResponse): string {
  if (d.ringkasan.hujanLebat48j && d.ringkasan.hujanLebatWaktu) {
    const w = d.ringkasan.hujanLebatWaktu;
    return `Ada prakiraan hujan lebat pada ${namaHari(w)}, ${jamLokal(w)}. Cek peringatan resmi BMKG.`;
  }
  return "Tidak ada hujan lebat dalam prakiraan 3 hari ke depan.";
}

function groupByDay(items: IntervalCuaca[]) {
  const m = new Map<string, IntervalCuaca[]>();
  for (const it of items) {
    const k = tanggalLokal(it.waktu);
    m.set(k, [...(m.get(k) ?? []), it]);
  }
  return [...m.values()].slice(0, 3); // hari ini + dua hari ke depan
}

export function CuacaCard({ adm4 }: { adm4: string }) {
  const query = useDataCard<CuacaResponse>("cuaca", adm4, `/api/cuaca?adm4=${encodeURIComponent(adm4)}`, TTL.cuaca);
  return (
    <DataCard
      title="Cuaca" icon={CloudSun} query={query} minHeight="min-h-64"
      officialUrl="https://www.bmkg.go.id/cuaca/prakiraan-cuaca" takeaway={takeawayCuaca}
      tanya={(d) => `Prakiraan cuaca BMKG di wilayah saya: ${takeawayCuaca(d)} Apa artinya bagi keluarga saya dan apa yang perlu disiapkan hari ini?`}
    >
      {(d) => (
        <div className="space-y-2">
          {groupByDay(d.prakiraan).map((day, idx) => {
            const suhu = day.map((x) => x.suhu).filter((v): v is number => v !== null);
            const lead = day[Math.floor(day.length / 2)];
            return (
              <details key={day[0].waktu} className="rounded-xl border border-border p-3" open={idx === 0}>
                <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 text-sm font-semibold">
                  <span>{hariTanggal(day[0].waktu)}</span>
                  <span className="font-normal text-muted-foreground">
                    {lead.kondisi}{suhu.length ? ` · ${Math.min(...suhu)}–${Math.max(...suhu)}°C` : ""}
                  </span>
                </summary>
                <ul className="mt-3 divide-y divide-border text-sm">
                  {day.map((x) => (
                    <li key={x.waktu} className="flex items-center gap-3 py-2">
                      <span className="w-12 font-medium tabular-nums">{jamLokal(x.waktu)}</span>
                      <span className="flex-1">{x.kondisi}</span>
                      <span className="tabular-nums">{x.suhu ?? "–"}°C</span>
                      <span className="hidden items-center gap-1 text-muted-foreground sm:flex"><Droplets className="size-3.5" aria-hidden="true" />{x.kelembapan ?? "–"}%</span>
                      <span className="hidden items-center gap-1 text-muted-foreground sm:flex"><Wind className="size-3.5" aria-hidden="true" />{x.anginKmj ?? "–"} km/j</span>
                    </li>
                  ))}
                </ul>
              </details>
            );
          })}
          <p className="text-xs text-muted-foreground">Prakiraan BMKG, bukan peringatan resmi.</p>
        </div>
      )}
    </DataCard>
  );
}
