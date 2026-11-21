"use client";
import { useMemo } from "react";
import { CloudRain, Flame, Globe2, Sun, Thermometer, type LucideIcon } from "lucide-react";
import type { KlimatologiResponse } from "@/lib/data/klimatologi";
import type { KondisiGlobal } from "@/lib/data/iklim-global";
import { kalenderDariBulanan, type BarisBulan } from "@/lib/iklim/ketahanan";
import { rawanKarhutla } from "@/lib/iklim/pekan";

const fmt = (v: number) => v.toLocaleString("id-ID", { maximumFractionDigits: 0 });

interface Ciri { Ikon: LucideIcon; teks: string; kuat: boolean }

/** Ciri satu bulan menurut pola iklim pengamatan, dalam bahasa sehari-hari. */
function ciriBulan(b: BarisBulan, karhutla: boolean): Ciri[] {
  const c: Ciri[] = [];
  if (b.puncakHujan) c.push({ Ikon: CloudRain, teks: "Puncak hujan lebat: banjir dan genangan lebih mungkin", kuat: true });
  if (b.puncakPanas) c.push({ Ikon: Thermometer, teks: "Puncak hari sangat panas", kuat: true });
  if (b.kering) c.push({ Ikon: Sun, teks: "Bulan kering: air mulai sulit", kuat: true });
  if (b.kering && karhutla) c.push({ Ikon: Flame, teks: "Musim rawan karhutla: jangan membakar lahan", kuat: true });
  if (!c.length) c.push({ Ikon: b.hujanMm >= 200 ? CloudRain : Sun, teks: b.hujanMm >= 200 ? "Bulan basah, tanpa puncak menonjol" : "Tanpa puncak menonjol", kuat: false });
  return c;
}

/** Penyesuaian tahun ini bila ENSO/IOD membuat musim menyimpang dari pola rata-rata. */
function penyesuaian(g: KondisiGlobal | null | undefined, b: BarisBulan, karhutla: boolean): string | null {
  if (!g || g.pengaruh === "netral") return null;
  const kuat = g.enso.kekuatan === "kuat" || g.enso.kekuatan === "sangat_kuat";
  if (g.pengaruh === "kering") {
    if (b.puncakHujan) return `Tahun ini hujan lebat bisa datang terlambat atau lebih sedikit (${g.enso.fase === "el_nino" ? "El Niño" : "IOD positif"}), tetapi hujan singkat yang deras tetap mungkin.`;
    if (b.kering) return `Tahun ini bisa lebih kering dan lebih panjang dari biasanya${karhutla ? "; risiko karhutla lebih tinggi" : ""}${kuat ? ". Hemat air sejak dini" : ""}.`;
    return "Tahun ini hujan cenderung di bawah rata-rata bulan ini.";
  }
  if (b.puncakHujan) return "Tahun ini hujan lebat cenderung lebih sering dan lebih lama dari biasanya; waspada banjir dan longsor.";
  return "Tahun ini hujan cenderung di atas rata-rata bulan ini.";
}

/**
 * Tiga bulan ke depan menurut pola iklim pengamatan 1991-2020 (periode normal standar), dengan catatan bila tahun ini
 * menyimpang karena El Niño atau La Niña: pola rata-rata saja bisa menyesatkan pada tahun ekstrem.
 */
export function TigaBulan({ k, provinsi, bahaya, global, now = new Date() }: { k: KlimatologiResponse; provinsi: string; bahaya?: string[]; global?: KondisiGlobal | null; now?: Date }) {
  const karhutla = rawanKarhutla(provinsi, bahaya);
  const kal = useMemo(() => kalenderDariBulanan(k.bulanan), [k]);
  const bulanIni = new Date(now.getTime() + 7 * 3_600_000).getUTCMonth();
  const tiga = [0, 1, 2].map((i) => kal[(bulanIni + i) % 12]);
  // Catatan El Niño/La Niña yang sama untuk beberapa bulan berturut-turut ditulis SEKALI, tidak diulang di tiap kartu.
  const kelompok: { bulan: string[]; teks: string }[] = [];
  for (const b of tiga) {
    const teks = penyesuaian(global, b, karhutla);
    if (!teks) continue;
    const akhir = kelompok[kelompok.length - 1];
    if (akhir && akhir.teks === teks) akhir.bulan.push(b.nama);
    else kelompok.push({ bulan: [b.nama], teks });
  }
  const namaKelompok = (bl: string[]) => (bl.length === 1 ? bl[0] : bl.length === 2 ? `${bl[0]} dan ${bl[1]}` : `${bl[0]}–${bl[bl.length - 1]}`);

  return (
    <div className="space-y-3">
    <ol className="grid gap-3 md:grid-cols-3">
      {tiga.map((b, i) => {
        return (
          <li key={b.bulan} className="cetak-utuh flex flex-col rounded-2xl border border-border bg-surface p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{i === 0 ? "Bulan ini" : i === 1 ? "Bulan depan" : "Dua bulan lagi"}</p>
            <p className="mt-1 text-xl font-bold">{b.nama}</p>
            <p className="mt-1 text-sm text-muted-foreground">Rata-rata hujan sekitar {fmt(b.hujanMm)} mm</p>
            <ul className="mt-3 space-y-1.5 text-sm">
              {ciriBulan(b, karhutla).map(({ Ikon, teks, kuat }) => (
                <li key={teks} className={`flex gap-2 ${kuat ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                  <Ikon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" /> {teks}
                </li>
              ))}
            </ul>
          </li>
        );
      })}
    </ol>
    {kelompok.length > 0 && (
      <ul className="space-y-2" aria-label="Penyesuaian tahun ini">
        {kelompok.map((x) => (
          <li key={x.teks} className="flex gap-2 rounded-xl bg-warning px-3 py-2 text-sm leading-relaxed text-warning-foreground">
            <Globe2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> <span><strong>{namaKelompok(x.bulan)}:</strong> {x.teks}</span>
          </li>
        ))}
      </ul>
    )}
    </div>
  );
}
