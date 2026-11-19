"use client";
import { CheckCircle2, Eye, TriangleAlert, type LucideIcon } from "lucide-react";
import type { Atap, GangguanAir, HasilUji, InputRumah, SumberAir, Tingkat } from "@/lib/iklim/ketahanan";
import { rentangBulan } from "@/lib/iklim/keputusan";
import { NAMA_BULAN } from "@/lib/iklim/ketahanan";
import { useIklimRumahStore } from "@/stores/iklim-rumah-store";

const fmt = (v: number, d = 1) => v.toLocaleString("id-ID", { maximumFractionDigits: d });

const TINGKAT: Record<Tingkat, { label: string; Ikon: LucideIcon; cls: string }> = {
  aman: { label: "Aman", Ikon: CheckCircle2, cls: "bg-emerald-50 text-emerald-900 ring-emerald-200" },
  perhatikan: { label: "Perlu diperhatikan", Ikon: Eye, cls: "bg-warning text-warning-foreground ring-amber-200" },
  waspada: { label: "Waspada", Ikon: TriangleAlert, cls: "bg-red-50 text-red-900 ring-red-200" },
};

const LITER: Array<[number, string]> = [
  [0, "Tidak punya air simpanan"],
  [100, "Ember dan bak mandi (sekitar 100 liter)"],
  [200, "Satu drum (200 liter)"],
  [500, "Tandon 500 liter"],
  [1000, "Tandon 1.000 liter"],
  [2000, "Tandon 2.000 liter"],
  [5000, "5.000 liter atau lebih"],
];
const ATAP: Array<[Atap, string]> = [["seng", "Seng"], ["genteng", "Genteng"], ["beton", "Beton atau dak"], ["lainnya", "Lainnya"]];
const SUMBER: Array<[SumberAir, string]> = [["pdam", "PDAM"], ["sumur", "Sumur"], ["beli", "Beli air atau tangki"], ["lainnya", "Lainnya"]];

const GANGGUAN: Array<[GangguanAir, string]> = [["jarang", "Jarang sulit"], ["hari", "Beberapa hari"], ["minggu", "Beberapa minggu"], ["kemarau", "Hampir sepanjang kemarau (misalnya sumur kering)"]];

const kolom = "min-h-11 w-full rounded-xl border border-border bg-surface px-3 text-base focus-visible:outline-2 focus-visible:outline-primary";

/** Formulir lima pertanyaan. Isian yang sudah ada di profil keluarga terisi otomatis dan boleh diubah. */
export function FormRumah({ input, dariProfil }: { input: InputRumah; dariProfil: boolean }) {
  const jawaban = useIklimRumahStore((s) => s.jawaban);
  const ubah = useIklimRumahStore((s) => s.ubah);

  const pilih = (aktif: boolean) =>
    `min-h-11 flex-1 rounded-xl border px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary ${aktif ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface text-foreground hover:bg-muted"}`;

  return (
    <form className="space-y-5" onSubmit={(e) => e.preventDefault()} aria-label="Keadaan rumah Anda">
      {dariProfil && <p className="rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">Jumlah orang dan anggota rentan diambil dari profil keluarga Anda. Ubah di sini bila perlu.</p>}

      <div>
        <label htmlFor="ir-anggota" className="block text-sm font-semibold">Berapa orang tinggal di rumah?</label>
        <input
          id="ir-anggota" name="anggota" type="number" inputMode="numeric" min={1} max={12} value={input.anggota} autoComplete="off"
          onChange={(e) => { const n = Math.round(Number(e.target.value)); if (n >= 1 && n <= 12) ubah({ anggota: n }); }}
          className={`${kolom} mt-1.5 max-w-32`}
        />
      </div>

      <fieldset>
        <legend className="text-sm font-semibold">Ada lansia, balita, atau ibu hamil?</legend>
        <div className="mt-1.5 flex max-w-xs gap-2">
          <button type="button" aria-pressed={input.rentan > 0} onClick={() => ubah({ adaRentan: true })} className={pilih(input.rentan > 0)}>Ada</button>
          <button type="button" aria-pressed={input.rentan === 0} onClick={() => ubah({ adaRentan: false })} className={pilih(input.rentan === 0)}>Tidak ada</button>
        </div>
      </fieldset>

      <div>
        <label htmlFor="ir-liter" className="text-sm font-semibold">Air simpanan sendiri di rumah</label>
        <p id="ir-liter-b" className="text-xs text-muted-foreground">Jumlah semua tandon, drum, dan bak penampung yang bisa dipakai saat pasokan terganggu.</p>
        <select id="ir-liter" name="liter" aria-describedby="ir-liter-b" value={jawaban.litersTersimpan} onChange={(e) => ubah({ litersTersimpan: Number(e.target.value) })} className={`${kolom} mt-1.5`}>
          {LITER.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      <div>
        <label htmlFor="ir-gangguan" className="text-sm font-semibold">Saat kemarau, berapa lama air di rumah biasanya sulit?</label>
        <p id="ir-gangguan-b" className="text-xs text-muted-foreground">Berdasarkan pengalaman Anda: air mati, keruh, atau sumur menyusut.</p>
        <select id="ir-gangguan" name="gangguan" aria-describedby="ir-gangguan-b" value={jawaban.gangguanAir} onChange={(e) => ubah({ gangguanAir: e.target.value as GangguanAir })} className={`${kolom} mt-1.5`}>
          {GANGGUAN.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="ir-sumber" className="text-sm font-semibold">Sumber air utama</label>
          <select id="ir-sumber" name="sumber" value={jawaban.sumberAir} onChange={(e) => ubah({ sumberAir: e.target.value as SumberAir })} className={`${kolom} mt-1.5`}>
            {SUMBER.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="ir-atap" className="text-sm font-semibold">Jenis atap</label>
          <select id="ir-atap" name="atap" value={jawaban.atap} onChange={(e) => ubah({ atap: e.target.value as Atap })} className={`${kolom} mt-1.5`}>
            {ATAP.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>

      <fieldset>
        <legend className="text-sm font-semibold">Pernah tergenang saat hujan lebat?</legend>
        <div className="mt-1.5 flex max-w-xs gap-2">
          <button type="button" aria-pressed={jawaban.pernahTergenang} onClick={() => ubah({ pernahTergenang: true })} className={pilih(jawaban.pernahTergenang)}>Pernah</button>
          <button type="button" aria-pressed={!jawaban.pernahTergenang} onClick={() => ubah({ pernahTergenang: false })} className={pilih(!jawaban.pernahTergenang)}>Belum</button>
        </div>
      </fieldset>
    </form>
  );
}

/** "Aman" hanya untuk air yang tercukupi; untuk panas dan hujan artinya perubahan sampai 2031-2050 kecil, bukan bebas risiko. */
function Lencana({ t, amanLabel }: { t: Tingkat; amanLabel?: string }) {
  const { label: dasar, Ikon, cls } = TINGKAT[t];
  const label = t === "aman" && amanLabel ? amanLabel : dasar;
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${cls}`}>
      <Ikon className="size-3.5" aria-hidden="true" /> {label}
    </span>
  );
}

function Batang({ label, hari, maks, warna }: { label: string; hari: number; maks: number; warna: string }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr_auto] items-center gap-2 text-xs sm:grid-cols-[11rem_1fr_auto]">
      <span className="text-muted-foreground">{label}</span>
      <span className="h-2.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <span className={`block h-full rounded-full ${warna}`} style={{ width: `${Math.max(2, Math.min(100, (hari / maks) * 100))}%` }} />
      </span>
      <span className="w-16 text-right font-semibold tabular-nums text-foreground">{fmt(hari)} hari</span>
    </div>
  );
}

const CATATAN_SUMBER: Record<SumberAir, string> = {
  pdam: "Pasokan PDAM bisa bergilir atau berhenti saat kemarau panjang.",
  sumur: "Sumur dangkal bisa menyusut saat kemarau panjang.",
  beli: "Harga dan ketersediaan air tangki bisa berubah saat kemarau panjang.",
  lainnya: "",
};

/** Hasil uji: tiga baris (bukan kartu kembar) dengan status bertulisan, bukan hanya warna. */
export function HasilUjiRumah({ u, input }: { u: HasilUji; input: InputRumah }) {
  const { air, panas, hujan } = u;
  const maks = Math.max(air.hariCukup, air.perluDepan, air.perluKini, 1);
  const nama = [...NAMA_BULAN];
  const bulanIdx = (daftar: string[]) => daftar.map((n) => nama.indexOf(n as (typeof NAMA_BULAN)[number]));

  return (
    <div className="divide-y divide-border rounded-2xl border border-border bg-surface">
      <section aria-labelledby="u-air" className="space-y-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id="u-air" className="text-base font-bold">Air bersih</h3>
          <Lencana t={air.tingkat} amanLabel="Cukup" />
        </div>
        <div className="space-y-1.5">
          <Batang label="Air simpanan Anda" hari={air.hariCukup} maks={maks} warna="bg-primary" />
          <Batang label="Air sulit, saat ini" hari={air.perluKini} maks={maks} warna="bg-amber-300" />
          <Batang label="Air sulit, 2031-2050" hari={air.perluDepan} maks={maks} warna="bg-orange-400" />
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Dengan {input.anggota} orang memakai {air.kebutuhanLiterPerHari} liter per hari, air simpanan Anda cukup {fmt(air.hariCukup)} hari.{" "}
          {air.kurangKini > 0
            ? <>Saat ini sekitar <strong className="text-foreground">{air.kurangKini} hari</strong> harus ditutup pasokan luar (PDAM, tangki, atau tetangga), dan {air.kurangDepan} hari bila tren berlanjut 10-25 tahun lagi.</>
            : air.kurangDepan > 0
              ? <>Cukup untuk kemarau saat ini, tetapi bisa kurang <strong className="text-foreground">{air.kurangDepan} hari</strong> bila tren berlanjut 10-25 tahun lagi.</>
              : <>Lebih lama dari masa air sulit saat ini ({air.perluKini} hari) maupun 2031-2050 ({air.perluDepan} hari).</>}
          {" "}{CATATAN_SUMBER[input.sumberAir]}
        </p>
        <p className="text-xs text-muted-foreground">
          Kemarau terpanjang di wilayah ini diproyeksikan {air.kemarauKini} hari saat ini dan {air.kemarauDepan} hari pada 2031-2050 (tahun terburuk dalam 20 tahun). Lama air sulit saat ini memakai pengalaman Anda; untuk 2031-2050 disesuaikan dengan perubahan kemarau, dengan cadangan minimal 3 hari.
        </p>
      </section>

      <section aria-labelledby="u-panas" className="space-y-2 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id="u-panas" className="text-base font-bold">Panas</h3>
          <Lencana t={panas.tingkat} amanLabel="Tidak banyak berubah" />
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Hari sangat panas per tahun: <strong className="text-foreground">{fmt(panas.hariKini)}</strong> saat ini, dari {fmt(panas.hariDulu)} pada 1990-an; sekitar {fmt(panas.hariDepan)} bila tren berlanjut 10-25 tahun lagi. Bulan puncak: {rentangBulan(nama, bulanIdx(panas.bulanPuncak))}.
          {panas.rentan && " Lansia, balita, dan ibu hamil lebih cepat terdampak panas."}
          {panas.atapPanas && " Atap seng membuat isi rumah lebih cepat panas."}
        </p>
      </section>

      <section aria-labelledby="u-hujan" className="space-y-2 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id="u-hujan" className="text-base font-bold">Hujan lebat dan genangan</h3>
          <Lencana t={hujan.tingkat} amanLabel="Tidak banyak berubah" />
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Hari hujan ekstrem per tahun: <strong className="text-foreground">{fmt(hujan.hariKini)}</strong> saat ini, dari {fmt(hujan.hariDulu)} pada 1990-an; sekitar {fmt(hujan.hariDepan)} bila tren berlanjut 10-25 tahun lagi. Bulan puncak: {rentangBulan(nama, bulanIdx(hujan.bulanPuncak))}.
          {hujan.rawanGenang && " Rumah Anda pernah tergenang, jadi persiapan sebelum bulan puncak lebih penting."}
        </p>
      </section>
    </div>
  );
}
