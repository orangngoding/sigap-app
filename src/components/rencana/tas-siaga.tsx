"use client";
import { Backpack } from "lucide-react";
import type { ItemTas, Progres } from "@/types/rencana";
import { kelompokkanTas } from "@/lib/preparedness/tas";

/** Tas Siaga hasil kalkulator (Blueprint 7.2 dan 9.1), dikelompokkan dengan kotak centang "sudah siap". */
export function TasSiaga({ tas, progres, onToggle }: { tas: ItemTas[]; progres: Progres; onToggle: (key: string) => void }) {
  const grup = kelompokkanTas(tas);
  return (
    <section aria-labelledby="judul-tas" className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <h2 id="judul-tas" className="flex items-center gap-2 text-lg font-bold text-foreground">
        <Backpack className="size-5 text-primary" aria-hidden="true" /> Tas Siaga
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Jumlah adalah perkiraan dari rumus sederhana berdasarkan jumlah anggota dan lama persediaan. Sesuaikan dengan kebutuhan keluarga Anda.
      </p>

      <div className="mt-5 space-y-6">
        {grup.map(({ kelompok, item }) => {
          const siap = item.filter((i) => progres[`tas:${i.id}`]).length;
          return (
            <div key={kelompok}>
              <h3 className="flex items-baseline justify-between gap-2 border-b border-border pb-2 text-sm font-bold text-foreground">
                <span>{kelompok}</span>
                <span className="text-xs font-medium text-muted-foreground">{siap} dari {item.length} siap</span>
              </h3>
              <ul className="divide-y divide-border">
                {item.map((i) => {
                  const key = `tas:${i.id}`;
                  const centang = Boolean(progres[key]);
                  return (
                    <li key={i.id}>
                      <label className="flex min-h-11 cursor-pointer items-start gap-3 py-2.5">
                        <input
                          type="checkbox" checked={centang} onChange={() => onToggle(key)}
                          className="mt-0.5 size-5 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        />
                        <span className={`flex-1 text-sm ${centang ? "text-muted-foreground line-through" : "text-foreground"}`}>
                          {i.nama}
                          {centang && <span className="sr-only"> (sudah siap)</span>}
                        </span>
                        <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">{i.jumlah} {i.satuan}</span>
                      </label>
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
