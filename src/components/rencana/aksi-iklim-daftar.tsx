"use client";
import Link from "next/link";
import { Check, Leaf, Trash2 } from "lucide-react";
import type { Progres } from "@/types/rencana";
import { useAksiIklimStore } from "@/stores/aksi-iklim-store";

export const kunciAksiIklim = (id: string) => `iklim:${id}`;

/** Tindakan adaptasi yang dimasukkan dari Siaga Iklim; tampil hanya bila ada. */
export function AksiIklimDaftar({ progres, onToggle }: { progres: Progres; onToggle: (key: string) => void }) {
  const aksi = useAksiIklimStore((s) => s.aksi);
  const hapus = useAksiIklimStore((s) => s.hapus);
  if (!aksi.length) return null;
  return (
    <section aria-labelledby="judul-aksi-iklim" className="cetak-utuh mb-8 rounded-3xl border border-border bg-surface p-5 sm:p-6">
      <h3 id="judul-aksi-iklim" className="flex items-center gap-2 text-lg font-bold"><Leaf className="size-5 text-primary" aria-hidden="true" /> Dari Siaga Iklim</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Persiapan rumah menghadapi iklim 10-25 tahun ke depan yang Anda pilih di <Link href="/iklim?tab=jangka" className="font-semibold text-primary underline underline-offset-2">Siaga Iklim</Link>.
      </p>
      <ul className="mt-4 space-y-3">
        {aksi.map((a) => {
          const k = kunciAksiIklim(a.id);
          const selesai = Boolean(progres[k]);
          return (
            <li key={a.id} className="flex items-start gap-3 rounded-2xl border border-border p-4">
              <button
                type="button" role="checkbox" aria-checked={selesai} aria-label={`Tandai selesai: ${a.judul}`} onClick={() => onToggle(k)}
                className={`press mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border-2 ${selesai ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}
              >
                {selesai && <Check className="size-4" aria-hidden="true" />}
              </button>
              <div className="min-w-0 flex-1">
                <p className={`font-semibold ${selesai ? "text-muted-foreground line-through" : ""}`}>{a.judul}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Mulai dengan: {a.langkahPertama}</p>
                {a.waktu && <p className="mt-1 text-sm font-semibold text-primary">{a.waktu}</p>}
              </div>
              <button type="button" onClick={() => hapus(a.id)} aria-label={`Hapus dari rencana: ${a.judul}`} className="press flex size-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted print:hidden">
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
