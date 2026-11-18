"use client";
import { Activity } from "lucide-react";
import type { GempaResponse } from "@/types";
import { useDataCard, TTL } from "@/hooks/use-data-card";
import { waktuMutlak } from "@/lib/utils/format";
import { DataCard } from "./data-card";

export function takeawayGempa(d: GempaResponse): string {
  const g = d.terbaru;
  if (!g) return "Belum ada data gempa terbaru dari BMKG.";
  // Tanpa klaim dampak (Blueprint 6.2)
  return g.jarakKm !== undefined
    ? `Gempa terbaru M${g.magnitudo} berjarak sekitar ${g.jarakKm} km dari lokasi Anda.`
    : `Gempa terbaru M${g.magnitudo} di ${g.wilayah}.`;
}

export function GempaCard({ lat, lon }: { lat: number; lon: number }) {
  const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;
  const query = useDataCard<GempaResponse>("gempa", key, `/api/gempa?lat=${lat}&lon=${lon}`, TTL.gempa);
  return (
    <DataCard
      title="Gempa Bumi" icon={Activity} query={query} minHeight="min-h-64"
      officialUrl="https://www.bmkg.go.id/gempabumi/gempabumi-terkini.bmkg" takeaway={takeawayGempa}
      tanya={(d) => `Data gempa BMKG: ${takeawayGempa(d)} Apa artinya bagi keluarga saya dan apa yang perlu saya lakukan untuk bersiap?`}
    >
      {(d) => (
        <div className="space-y-3 text-sm">
          {d.terbaru && (
            <div className="rounded-xl border border-border p-3">
              <p className="font-semibold">M{d.terbaru.magnitudo} · kedalaman {d.terbaru.kedalamanKm ?? "–"} km</p>
              <p className="text-muted-foreground">{d.terbaru.wilayah}</p>
              <p className="mt-1 text-xs text-muted-foreground">{waktuMutlak(d.terbaru.waktu)}</p>
              {d.terbaru.potensi && <p className="mt-2">{d.terbaru.potensi}</p>}
              {d.terbaru.shakemapUrl && (
                <a href={d.terbaru.shakemapUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-primary underline underline-offset-2">
                  Peta guncangan
                </a>
              )}
            </div>
          )}
          {d.daftar.length > 0 && (
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Gempa M5.0+ dan dirasakan terakhir</h3>
              <ul className="divide-y divide-border">
                {d.daftar.map((g) => (
                  <li key={`${g.waktu}-${g.magnitudo}`} className="flex items-start gap-3 py-2">
                    <span className="w-14 shrink-0 font-semibold tabular-nums">M{g.magnitudo}</span>
                    <span className="flex-1">{g.wilayah}</span>
                    {g.jarakKm !== undefined && <span className="shrink-0 text-muted-foreground">±{g.jarakKm} km</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </DataCard>
  );
}
