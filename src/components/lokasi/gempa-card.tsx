"use client";
import { Activity, ChevronDown } from "lucide-react";
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

function DaftarGempa({ daftar }: { daftar: GempaResponse["daftar"] }) {
  return (
    <ul className="divide-y divide-border">
      {daftar.map((g) => (
        <li key={`${g.waktu}-${g.magnitudo}`} className="flex items-start gap-3 py-2">
          <span className="w-14 shrink-0 font-semibold tabular-nums">M{g.magnitudo}</span>
          <span className="flex-1">{g.wilayah}</span>
          {g.jarakKm !== undefined && <span className="shrink-0 text-muted-foreground">±{g.jarakKm} km</span>}
        </li>
      ))}
    </ul>
  );
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
                <a href={d.terbaru.shakemapUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex min-h-11 items-center text-primary underline underline-offset-2 lg:min-h-0">
                  Peta guncangan
                </a>
              )}
            </div>
          )}
          {d.daftar.length > 0 && (
            <>
              {/* HP dan tablet: riwayat dilipat agar halaman Lokasi tidak memanjang; desktop: langsung tampil. */}
              <details className="group lg:hidden">
                <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 font-semibold text-primary [&::-webkit-details-marker]:hidden">
                  <ChevronDown className="size-4 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
                  Lihat {d.daftar.length} gempa M5.0+ dan dirasakan terakhir
                </summary>
                <DaftarGempa daftar={d.daftar} />
              </details>
              <div className="hidden lg:block">
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Gempa M5.0+ dan dirasakan terakhir</h3>
                <DaftarGempa daftar={d.daftar} />
              </div>
            </>
          )}
        </div>
      )}
    </DataCard>
  );
}
