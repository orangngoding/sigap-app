"use client";
import { ExternalLink, Flame, Globe2, Thermometer } from "lucide-react";
import { URL_BMKG_IKLIM, teksEnso, type KondisiGlobal } from "@/lib/data/iklim-global";
import type { RingkasTitikPanas } from "@/lib/data/titik-panas";
import { URL_FIRMS_BERANDA } from "@/lib/data/titik-panas";

const TAUTAN = "inline-flex items-center gap-1 font-semibold text-primary underline underline-offset-2";
const fmt = (v: number) => v.toLocaleString("id-ID", { maximumFractionDigits: 0 });

const WARNA: Record<KondisiGlobal["pengaruh"], string> = {
  kering: "border-orange-400/60 bg-orange-50 dark:bg-orange-400/10",
  basah: "border-sky-400/60 bg-sky-50 dark:bg-sky-400/10",
  netral: "border-border bg-surface",
};

/** Satu baris di atas tab "Minggu ini": konteks musim tahun ini, dengan tautan ke penjelasan lengkap. */
export function SorotanGlobal({ g, onBuka, harian }: { g: KondisiGlobal; onBuka?: () => void; harian?: boolean }) {
  if (g.pengaruh === "netral") return null;
  return (
    <div className={`flex flex-wrap items-start gap-3 rounded-2xl border p-4 ${WARNA[g.pengaruh]}`} role="note">
      <Globe2 className="mt-0.5 size-5 shrink-0 text-foreground" aria-hidden="true" />
      <p className="min-w-0 flex-1 text-sm leading-relaxed text-foreground">
        <strong>{teksEnso(g.enso)}.</strong> {g.dampak[0]}{harian && " Ini tentang jumlah hujan sepanjang musim; hujan harian tetap bisa turun, jadi rencana minggu ini memakai prakiraan harian di bawah."} {onBuka && <button type="button" onClick={onBuka} className={`${TAUTAN} min-h-8`}>Lihat penjelasannya</button>}
      </p>
    </div>
  );
}

/** Kondisi iklim global lengkap (tab "Musim ini"): ENSO, IOD, dampak untuk Indonesia, dan rujukan resmi BMKG. */
export function KartuGlobal({ g }: { g: KondisiGlobal }) {
  return (
    <div className={`cetak-utuh rounded-3xl border p-5 sm:p-6 ${WARNA[g.pengaruh]}`}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-background/70 p-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><Thermometer className="size-4" aria-hidden="true" /> ENSO (Samudra Pasifik)</p>
          <p className="mt-1 text-xl font-bold">{teksEnso(g.enso).replace(/ \(.*/, "")}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            ONI {g.enso.oni.toLocaleString("id-ID", { signDisplay: "exceptZero" })} ({g.enso.periode}).
            {g.enso.bulanTerakhir && ` Anomali Niño 3.4 bulan ${g.enso.bulanTerakhir.bulan}: ${g.enso.bulanTerakhir.nilai.toLocaleString("id-ID", { signDisplay: "exceptZero" })}°C.`}
          </p>
        </div>
        <div className="rounded-2xl bg-background/70 p-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><Globe2 className="size-4" aria-hidden="true" /> IOD (Samudra Hindia)</p>
          {g.iod ? (
            <>
              <p className="mt-1 text-xl font-bold">IOD {g.iod.fase}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                DMI {g.iod.nilai.toLocaleString("id-ID", { signDisplay: "exceptZero" })} ({g.iod.bulan}).
                {g.iod.usiaBulan >= 3 && ` Data bulan-bulan berikutnya belum terbit, jadi ini indikasi (${g.iod.usiaBulan} bulan lalu).`}
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">Data IOD sedang tidak tersedia.</p>
          )}
        </div>
      </div>
      <h3 className="mt-5 text-base font-bold">Artinya untuk Indonesia (kecenderungan, bukan kepastian)</h3>
      <ul className="mt-2 space-y-1.5 text-sm leading-relaxed">
        {g.dampak.map((d) => <li key={d} className="flex gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-foreground/60" aria-hidden="true" /> {d}</li>)}
      </ul>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        Dampaknya berbeda di tiap wilayah. Untuk perkiraan awal dan lama musim hujan di zona Anda, ikuti{" "}
        <a href={URL_BMKG_IKLIM} target="_blank" rel="noopener noreferrer" className={TAUTAN}>Prakiraan Musim BMKG<ExternalLink className="size-3.5" aria-hidden="true" /><span className="sr-only"> (membuka situs BMKG di tab baru)</span></a>.
        Sumber data: {g.sumber.nama}.
      </p>
    </div>
  );
}

/** Titik panas satelit di sekitar lokasi dan gambaran nasional (karhutla). */
export function PanelTitikPanas({ tp, rawan }: { tp: RingkasTitikPanas; rawan: boolean }) {
  const maks = Math.max(1, ...tp.nasional.perWilayah.map((w) => w.jumlah));
  return (
    <section aria-labelledby="judul-titik-panas" className="cetak-utuh rounded-3xl border border-border bg-surface p-5 sm:p-6">
      <h3 id="judul-titik-panas" className="flex items-center gap-2 text-lg font-bold"><Flame className="size-5 text-primary" aria-hidden="true" /> Titik panas satelit{rawan ? " (karhutla)" : ""}</h3>
      <p className="mt-1 text-sm text-muted-foreground">Deteksi anomali panas oleh satelit NASA dalam 7 hari terakhir. Ini indikasi api, bukan kepastian kebakaran.</p>
      <div className={`mt-4 grid gap-4 ${rawan ? "md:grid-cols-2" : ""}`}>
        <div>
          <p className="text-sm font-semibold">Di sekitar Anda (radius {tp.radiusKm} km)</p>
          <p className="mt-1 text-3xl font-extrabold tabular-nums">{fmt(tp.dalam7h)} <span className="text-base font-semibold text-muted-foreground">titik</span></p>
          <p className="text-sm text-muted-foreground">
            {tp.dalam24j} dalam 24 jam terakhir.{tp.terdekat ? ` Terdekat ${tp.terdekat.km} km ke arah ${tp.terdekat.arah}.` : " Tidak ada dalam 150 km."}
          </p>
          {!rawan && tp.dalam7h > 0 && <p className="mt-2 text-xs text-muted-foreground">Di kawasan perkotaan, titik panas sering berasal dari pembakaran sampah atau industri.</p>}
        </div>
        {rawan && <div>
          <p className="text-sm font-semibold">Seluruh Indonesia: {fmt(tp.nasional.total)} titik</p>
          <ul className="mt-2 space-y-1.5" aria-label="Titik panas per wilayah">
            {tp.nasional.perWilayah.map((w) => (
              <li key={w.wilayah} className="grid grid-cols-[8.5rem_1fr_3rem] items-center gap-2 text-xs">
                <span className="truncate">{w.wilayah}</span>
                <span className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true"><span className="block h-full rounded-full bg-orange-500" style={{ width: `${(w.jumlah / maks) * 100}%` }} /></span>
                <span className="text-right font-semibold tabular-nums">{fmt(w.jumlah)}</span>
              </li>
            ))}
          </ul>
        </div>}
      </div>
      <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <a href="https://sipongi.menlhk.go.id/" target="_blank" rel="noopener noreferrer" className={TAUTAN}>SiPongi KLHK (status resmi) <ExternalLink className="size-3.5" aria-hidden="true" /></a>
        <a href={URL_FIRMS_BERANDA} target="_blank" rel="noopener noreferrer" className={TAUTAN}>Peta NASA FIRMS <ExternalLink className="size-3.5" aria-hidden="true" /></a>
      </p>
      <p className="mt-2 text-xs text-muted-foreground">{tp.sumber.nama}. {tp.catatan}</p>
    </section>
  );
}
