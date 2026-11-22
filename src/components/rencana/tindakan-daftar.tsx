"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, ClipboardList, ExternalLink } from "lucide-react";
import type { HazardId, Phase } from "@/types";
import type { Progres, Tindakan } from "@/types/rencana";
import { CHUNK_BY_ID } from "@/lib/kb/data";
import { HAZARD_BY_ID } from "@/lib/hazards/hazards";
import { TombolTanya } from "@/components/tanya/tombol-tanya";

const FASE: Array<{ id: Phase; judul: string; ket: string }> = [
  { id: "sebelum", judul: "Sebelum", ket: "Dikerjakan sekarang, saat situasi aman." },
  { id: "saat", judul: "Saat kejadian", ket: "Hafalkan agar tidak perlu berpikir lama saat panik. Centang bila sudah dipahami." },
  { id: "sesudah", judul: "Sesudah", ket: "Panduan setelah kejadian. Tidak dihitung dalam skor." },
];
const PRIORITAS = { tinggi: "Prioritas tinggi", sedang: "Prioritas sedang", rendah: "Prioritas rendah" } as const;
const WARNA_PRIORITAS = { tinggi: "bg-red-50 text-red-700", sedang: "bg-amber-50 text-amber-800", rendah: "bg-muted text-muted-foreground" } as const;
const labelHazard = (h: Tindakan["hazard"]) => (h === "umum" ? "Umum" : HAZARD_BY_ID[h as HazardId].label);

function Sumber({ t }: { t: Tindakan }) {
  const c = CHUNK_BY_ID[t.sourceIds[0]];
  if (!c) return null;
  return (
    <>
      {c.turunan && (
        <p className="mt-1 inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground">Turunan: {c.turunan}</p>
      )}
      <details className="mt-1 text-xs text-muted-foreground">
        <summary className="inline-flex min-h-8 cursor-pointer items-center rounded font-medium underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Sumber</summary>
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

function Butir({ t, fase, centang, onToggle }: { t: Tindakan; fase: Phase; centang: boolean; onToggle: () => void }) {
  const bisaCentang = fase !== "sesudah";
  return (
    <motion.li layout className={`rounded-2xl border p-4 transition-colors ${centang ? "border-primary/30 bg-primary/5" : "border-border bg-surface"}`}>
      <div className="flex items-start gap-3">
        {bisaCentang ? (
          <button
            type="button" onClick={onToggle} role="checkbox" aria-checked={centang} aria-label={`${t.title}${centang ? " (sudah dikerjakan)" : ""}`}
            className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${centang ? "border-primary bg-primary text-white" : "border-border bg-surface hover:border-primary"}`}
          >
            <AnimatePresence>
              {centang && (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 500, damping: 22 }}>
                  <Check className="size-4" strokeWidth={3} aria-hidden="true" />
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        ) : (
          <span className="mt-2 size-2 shrink-0 rounded-full bg-primary/40" aria-hidden="true" />
        )}
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold ${centang ? "text-muted-foreground line-through decoration-primary/50" : "text-foreground"}`}>{t.title}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{t.detail}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-medium">
            <span className="rounded-full bg-muted px-2 py-0.5 text-foreground">{labelHazard(t.hazard)}</span>
            <span className={`rounded-full px-2 py-0.5 ${WARNA_PRIORITAS[t.priority]}`}>{PRIORITAS[t.priority]}</span>
          </div>
          <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
            <Sumber t={t} />
            <TombolTanya label="Tanya cara melakukannya" className="mt-1" pertanyaan={`Jelaskan tindakan siaga dari rencana saya ini dan cara melakukannya untuk keluarga saya: "${t.title}". ${t.detail}`} />
          </div>
        </div>
      </div>
    </motion.li>
  );
}

/**
 * Tindakan per fase. Satu fase ditampilkan sekali waktu (tidak perlu menggulir panjang); saat dicetak
 * semua fase tampil.
 */
export function TindakanDaftar({
  tindakan, hazardUrut, progres, onToggle,
}: { tindakan: Tindakan[]; hazardUrut: Array<Tindakan["hazard"]>; progres: Progres; onToggle: (key: string) => void }) {
  const [fokus, setFokus] = useState<"semua" | Tindakan["hazard"]>("semua");
  const [fase, setFase] = useState<Phase>("sebelum");
  const tampil = tindakan.filter((t) => fokus === "semua" || t.hazard === fokus);
  const urutHazard = hazardUrut.filter((h) => tindakan.some((t) => t.hazard === h));

  return (
    <section aria-labelledby="judul-tindakan">
      <h2 id="judul-tindakan" className="sr-only print:not-sr-only print:flex print:items-center print:gap-2 print:text-lg print:font-bold">
        <ClipboardList className="size-5" aria-hidden="true" /> Tindakan Sebelum, Saat, dan Sesudah
      </h2>

      <div role="tablist" aria-label="Fase" className="tanpa-cetak grid grid-cols-3 gap-2">
        {FASE.map((f) => {
          const daftar = tampil.filter((t) => t.phase === f.id);
          const selesai = daftar.filter((t) => progres[t.actionId]).length;
          const aktif = fase === f.id;
          return (
            <button
              key={f.id} type="button" role="tab" aria-selected={aktif} aria-controls={`fase-${f.id}`} id={`tab-fase-${f.id}`} onClick={() => setFase(f.id)}
              className={`relative overflow-hidden rounded-2xl border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${aktif ? "border-primary bg-primary text-primary-foreground shadow-md" : "border-border bg-surface hover:border-primary/40"}`}
            >
              <span className="block text-sm font-bold">{f.judul}</span>
              <span className={`block text-xs ${aktif ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                {f.id === "sesudah" ? `${daftar.length} panduan` : `${selesai} dari ${daftar.length} siap`}
              </span>
              {f.id !== "sesudah" && daftar.length > 0 && (
                <span className={`mt-2 block h-1 overflow-hidden rounded-full ${aktif ? "bg-white/25" : "bg-muted"}`}>
                  <motion.span className={`block h-full rounded-full ${aktif ? "bg-white" : "bg-primary"}`} initial={false} animate={{ width: `${(selesai / daftar.length) * 100}%` }} transition={{ duration: 0.4 }} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {urutHazard.length > 1 && (
        <div className="tanpa-cetak -mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Filter bahaya">
          {(["semua", ...urutHazard] as const).map((h) => (
            <button
              key={h} type="button" aria-pressed={fokus === h} onClick={() => setFokus(h)}
              className={`min-h-10 shrink-0 rounded-full border px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                fokus === h ? "border-foreground bg-foreground text-background" : "border-border bg-surface text-foreground hover:bg-muted"
              }`}
            >
              {h === "semua" ? "Semua bahaya" : labelHazard(h)}
            </button>
          ))}
        </div>
      )}

      {FASE.map((f) => {
        const daftar = tampil.filter((t) => t.phase === f.id);
        const aktif = fase === f.id;
        return (
          <div key={f.id} id={`fase-${f.id}`} role="tabpanel" aria-labelledby={`tab-fase-${f.id}`} className={aktif ? "panel-masuk mt-5" : "hidden print:mt-6 print:block"}>
            <h3 className="hidden text-base font-bold print:block">{f.judul}</h3>
            <p className="text-sm text-muted-foreground">{f.ket}</p>
            {daftar.length === 0 ? (
              <p className="mt-3 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Tidak ada tindakan untuk pilihan ini.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {daftar.map((t) => (
                  <Butir key={t.actionId} t={t} fase={f.id} centang={Boolean(progres[t.actionId])} onToggle={() => onToggle(t.actionId)} />
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </section>
  );
}
