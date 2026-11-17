"use client";
import { useState } from "react";
import { ClipboardList, ExternalLink } from "lucide-react";
import type { HazardId, Phase } from "@/types";
import type { Progres, Tindakan } from "@/types/rencana";
import { CHUNK_BY_ID } from "@/lib/kb/data";
import { HAZARD_BY_ID } from "@/lib/hazards/hazards";

const FASE: Array<{ id: Phase; judul: string; ket: string }> = [
  { id: "sebelum", judul: "Sebelum", ket: "Dikerjakan sekarang, saat situasi aman." },
  { id: "saat", judul: "Saat kejadian", ket: "Hafalkan agar tidak perlu berpikir lama saat panik." },
  { id: "sesudah", judul: "Sesudah", ket: "Panduan setelah kejadian. Tidak dihitung dalam skor." },
];
const PRIORITAS = { tinggi: "Prioritas tinggi", sedang: "Prioritas sedang", rendah: "Prioritas rendah" } as const;
const labelHazard = (h: Tindakan["hazard"]) => (h === "umum" ? "Umum" : HAZARD_BY_ID[h as HazardId].label);

function Sumber({ t }: { t: Tindakan }) {
  const c = CHUNK_BY_ID[t.sourceIds[0]];
  if (!c) return null;
  return (
    <>
    {c.turunan && (
      <p className="mt-1 inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
        Turunan: {c.turunan}
      </p>
    )}
    <details className="mt-1 text-xs text-muted-foreground">
      <summary className="inline-flex min-h-8 cursor-pointer items-center rounded font-medium underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
        Sumber
      </summary>
      <p className="mt-1">
        <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline">
          {c.sourceTitle} <ExternalLink className="size-3" aria-hidden="true" />
          <span className="sr-only">(buka di tab baru)</span>
        </a>
        . Diakses {c.accessedAt}.{c.reviewedBy.length > 0 ? ` Ditinjau oleh ${c.reviewedBy.join(" dan ")}.` : ""}
      </p>
    </details>
    </>
  );
}

export function TindakanDaftar({
  tindakan, hazardUrut, progres, onToggle,
}: { tindakan: Tindakan[]; hazardUrut: Array<Tindakan["hazard"]>; progres: Progres; onToggle: (key: string) => void }) {
  const [fokus, setFokus] = useState<"semua" | Tindakan["hazard"]>("semua");
  const tampil = tindakan.filter((t) => fokus === "semua" || t.hazard === fokus);
  const urutHazard = hazardUrut.filter((h) => tindakan.some((t) => t.hazard === h));

  return (
    <section aria-labelledby="judul-tindakan" className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <h2 id="judul-tindakan" className="flex items-center gap-2 text-lg font-bold text-foreground">
        <ClipboardList className="size-5 text-primary" aria-hidden="true" /> Tindakan Sebelum, Saat, dan Sesudah
      </h2>

      {urutHazard.length > 1 && (
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filter bahaya">
          {(["semua", ...urutHazard] as const).map((h) => (
            <button
              key={h} type="button" aria-pressed={fokus === h} onClick={() => setFokus(h)}
              className={`min-h-11 rounded-full border px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                fokus === h ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface text-foreground hover:bg-muted"
              }`}
            >
              {h === "semua" ? "Semua" : labelHazard(h)}
            </button>
          ))}
        </div>
      )}

      <div className="mt-5 space-y-8">
        {FASE.map((f) => {
          const daftar = tampil.filter((t) => t.phase === f.id);
          if (daftar.length === 0) return null;
          return (
            <div key={f.id}>
              <h3 className="text-base font-bold text-foreground">{f.judul}</h3>
              <p className="text-sm text-muted-foreground">{f.ket}</p>
              <ul className="mt-2 divide-y divide-border">
                {daftar.map((t) => {
                  const centang = Boolean(progres[t.actionId]);
                  const isi = (
                    <span className="flex-1">
                      <span className={`block text-sm font-semibold ${centang ? "text-muted-foreground line-through" : "text-foreground"}`}>
                        {t.title}
                        {centang && <span className="sr-only"> (sudah dikerjakan)</span>}
                      </span>
                      <span className="mt-0.5 block text-sm text-muted-foreground">{t.detail}</span>
                      <span className="mt-1 flex flex-wrap gap-x-3 text-xs font-medium text-muted-foreground">
                        <span>{labelHazard(t.hazard)}</span>
                        <span>{PRIORITAS[t.priority]}</span>
                      </span>
                    </span>
                  );
                  return (
                    <li key={t.actionId} className="py-2.5">
                      {f.id === "sesudah" ? (
                        <div className="flex gap-3">{isi}</div>
                      ) : (
                        <label className="flex min-h-11 cursor-pointer items-start gap-3">
                          <input
                            type="checkbox" checked={centang} onChange={() => onToggle(t.actionId)}
                            className="mt-0.5 size-5 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                          />
                          {isi}
                        </label>
                      )}
                      <div className={f.id === "sesudah" ? "" : "pl-8"}><Sumber t={t} /></div>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
