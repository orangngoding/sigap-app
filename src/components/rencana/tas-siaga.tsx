"use client";
import { useState } from "react";
import { Backpack, CalendarPlus, CalendarClock, ChevronDown } from "lucide-react";
import type { ItemTas, Progres } from "@/types/rencana";
import { kelompokkanTas } from "@/lib/preparedness/tas";
import { BISA_KEDALUWARSA, buatIcs, ringkasPengingat, sisaHari, statusKedaluwarsa, tanggalValid, type PetaKedaluwarsa } from "@/lib/rencana/pengingat";
import { TeksPihak } from "@/components/rencana/teks-pihak";

const LENCANA = {
  lewat: "bg-danger text-danger-foreground",
  segera: "bg-warning text-warning-foreground",
  aman: "bg-muted text-muted-foreground",
} as const;

function labelSisa(t: string): string {
  const n = sisaHari(t);
  return n < 0 ? `Kedaluwarsa ${-n} hari lalu` : n === 0 ? "Kedaluwarsa hari ini" : `${n} hari lagi`;
}

function unduhIcs(tas: ItemTas[], peta: PetaKedaluwarsa) {
  const blob = new Blob([buatIcs(tas, peta)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "pengingat-tas-siaga-sigap.ics";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Tas Siaga hasil kalkulator (Blueprint 7.2 dan 9.1), dikelompokkan dengan kotak centang "sudah siap".
 * Item yang punya masa berlaku bisa diberi tanggal kedaluwarsa; pengingat dibuat sebagai berkas kalender di perangkat.
 */
export function TasSiaga({ tas, progres, onToggle, kedaluwarsa, onKedaluwarsa }: {
  tas: ItemTas[];
  progres: Progres;
  onToggle: (key: string) => void;
  kedaluwarsa?: PetaKedaluwarsa;
  onKedaluwarsa?: (id: string, tanggal: string) => void;
}) {
  const grup = kelompokkanTas(tas);
  // Kelompok pertama yang belum lengkap terbuka; yang lain dilipat agar tidak perlu menggulir panjang.
  const [terbuka, setTerbuka] = useState<Set<string>>(() => {
    const awal = grup.find(({ item }) => item.some((i) => !progres[`tas:${i.id}`]))?.kelompok ?? grup[0]?.kelompok;
    return new Set(awal ? [awal] : []);
  });
  const alih = (k: string) => setTerbuka((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const pengingat = kedaluwarsa ? ringkasPengingat(tas, kedaluwarsa) : null;
  const perlu = pengingat ? pengingat.lewat.length + pengingat.segera.length : 0;

  return (
    <section aria-labelledby="judul-tas" className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <h2 id="judul-tas" className="flex items-center gap-2 text-lg font-bold text-foreground">
        <Backpack className="size-5 text-primary" aria-hidden="true" /> Tas Siaga
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Jumlah adalah perkiraan dari rumus sederhana berdasarkan jumlah anggota dan lama persediaan. <TeksPihak>Sesuaikan dengan kebutuhan keluarga Anda.</TeksPihak>
      </p>

      {kedaluwarsa && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted p-3 text-sm">
          <p className="flex items-start gap-2">
            <CalendarClock className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            <span>
              {perlu > 0
                ? <><strong>{perlu} isi tas</strong> sudah atau hampir kedaluwarsa. Segera ganti.</>
                : "Isi tanggal kedaluwarsa air, makanan, obat, dan baterai agar SIGAP bisa mengingatkan. Panduan BNPB: periksa isi tas setiap 3 bulan."}
            </span>
          </p>
          <button
            type="button" onClick={() => unduhIcs(tas, kedaluwarsa)}
            className="tanpa-cetak inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-surface px-3 font-semibold hover:bg-background focus-visible:outline-2 focus-visible:outline-primary"
          >
            <CalendarPlus className="size-4" aria-hidden="true" /> Tambah pengingat ke kalender
          </button>
        </div>
      )}

      <div className="mt-5 space-y-3">
        {grup.map(({ kelompok, item }) => {
          const siap = item.filter((i) => progres[`tas:${i.id}`]).length;
          const buka = terbuka.has(kelompok);
          const idIsi = `tas-${kelompok.replace(/\W+/g, "-")}`;
          return (
            <div key={kelompok} className={`rounded-2xl border transition-colors ${siap === item.length ? "border-primary/30 bg-primary/5" : "border-border bg-background"}`}>
              <h3>
                <button
                  type="button" onClick={() => alih(kelompok)} aria-expanded={buka} aria-controls={idIsi}
                  className="flex w-full items-center gap-3 rounded-2xl p-4 text-left focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-foreground">{kelompok}</span>
                    <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-muted">
                      <span className="block h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${(siap / item.length) * 100}%` }} />
                    </span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">{siap}/{item.length}</span>
                  <ChevronDown className={`tanpa-cetak size-4 shrink-0 text-muted-foreground transition-transform ${buka ? "rotate-180" : ""}`} aria-hidden="true" />
                </button>
              </h3>
              <ul id={idIsi} className={`divide-y divide-border px-4 pb-2 ${buka ? "panel-masuk" : "hidden print:block"}`}>
                {item.map((i) => {
                  const key = `tas:${i.id}`;
                  const centang = Boolean(progres[key]);
                  const tgl = kedaluwarsa?.[i.id];
                  const bisa = Boolean(kedaluwarsa && onKedaluwarsa && BISA_KEDALUWARSA.has(i.id));
                  const st = tanggalValid(tgl) ? statusKedaluwarsa(tgl) : null;
                  return (
                    <li key={i.id} className="py-2.5">
                      <label className="flex min-h-11 cursor-pointer items-start gap-3">
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
                      {bisa && (
                        <div className="tanpa-cetak mt-1 flex flex-wrap items-center gap-2 pl-8 text-xs">
                          <label htmlFor={`exp-${i.id}`} className="text-muted-foreground">Kedaluwarsa</label>
                          <input
                            id={`exp-${i.id}`} type="date" value={tgl ?? ""} onChange={(e) => onKedaluwarsa!(i.id, e.target.value)}
                            className="min-h-9 rounded-md border border-border bg-surface px-2 text-sm focus-visible:outline-2 focus-visible:outline-primary"
                          />
                          {st && tgl && <span className={`rounded-full px-2 py-0.5 font-semibold ${LENCANA[st]}`}>{labelSisa(tgl)}</span>}
                        </div>
                      )}
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
