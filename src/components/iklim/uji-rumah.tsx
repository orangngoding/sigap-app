"use client";
import { CheckCircle2, Eye, TriangleAlert, type LucideIcon } from "lucide-react";
import type { Atap, GangguanAir, HasilUji, InputRumah, SumberAir, Tingkat } from "@/lib/iklim/ketahanan";
import { rentangBulan } from "@/lib/iklim/keputusan";
import { HARI_GANGGUAN_AIR, LITER_PER_ORANG_HARI, MIN_HARI_CADANGAN_AIR, NAMA_BULAN, teksKeDepan, teksPerubahanKemarau } from "@/lib/iklim/ketahanan";
import { useIklimRumahStore } from "@/stores/iklim-rumah-store";

const fmt = (v: number, d = 1) => v.toLocaleString("id-ID", { maximumFractionDigits: d });
/** Jumlah hari dibulatkan untuk pembaca awam; di bawah 1 hari ditulis apa adanya. */
const hariBulat = (v: number) => (v < 0.5 ? "kurang dari 1" : fmt(v, 0));

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

/** Detail rumah lain (dilipat). Isian yang sudah ada di profil keluarga terisi otomatis dan boleh diubah. */
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
        <label htmlFor="ir-sumber" className="text-sm font-semibold">Sumber air utama</label>
        <select id="ir-sumber" name="sumber" value={jawaban.sumberAir} onChange={(e) => ubah({ sumberAir: e.target.value as SumberAir })} className={`${kolom} mt-1.5 max-w-sm`}>
          {SUMBER.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
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

/**
 * Tiga pertanyaan utama, SEBELUM hasil: tanpa jawaban ini angka air hanya cadangan dasar, jadi lebih jujur bertanya
 * dulu daripada menampilkan hasil dari isian bawaan. Detail lain (jumlah orang, sumber air, genangan) dilipat di bawah.
 */
export function PertanyaanRumah({ namaWilayah }: { namaWilayah: string }) {
  const jawaban = useIklimRumahStore((s) => s.jawaban);
  const ubah = useIklimRumahStore((s) => s.ubah);
  const sisa = [jawaban.gangguanAir, jawaban.litersTersimpan, jawaban.atap].filter((v) => v === null).length;
  return (
    <section aria-labelledby="judul-tanya-rumah" className="rounded-3xl border border-primary/30 bg-primary/5 p-5 sm:p-6">
      <h2 id="judul-tanya-rumah" className="text-xl font-bold leading-snug">{sisa ? `Cek rumah Anda: ${sisa === 3 ? "3 pertanyaan" : `${sisa} pertanyaan lagi`}` : "Rumah Anda"}</h2>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        {sisa
          ? `Dalam 10-25 tahun, ${namaWilayah} diperkirakan makin panas dan kemarau bisa lebih panjang. Jawab pertanyaan ini agar SIGAP bisa menghitung apa yang paling perlu disiapkan rumah Anda.`
          : "Hasil di bawah sudah dihitung dari jawaban Anda. Ubah kapan saja; jawaban hanya tersimpan di perangkat ini."}
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div>
          <label htmlFor="cek-gangguan" className="text-sm font-semibold">Saat kemarau, berapa lama air di rumah biasanya sulit?</label>
          <select id="cek-gangguan" value={jawaban.gangguanAir ?? ""} onChange={(e) => ubah({ gangguanAir: e.target.value as GangguanAir })} className={`${kolom} mt-1.5`}>
            {jawaban.gangguanAir === null && <option value="" disabled>Pilih jawaban</option>}
            {GANGGUAN.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="cek-liter" className="text-sm font-semibold">Berapa air simpanan sendiri di rumah?</label>
          <select id="cek-liter" value={jawaban.litersTersimpan ?? ""} onChange={(e) => ubah({ litersTersimpan: Number(e.target.value) })} className={`${kolom} mt-1.5`}>
            {jawaban.litersTersimpan === null && <option value="" disabled>Pilih jawaban</option>}
            {LITER.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="cek-atap" className="text-sm font-semibold">Atap rumah Anda dari apa?</label>
          <select id="cek-atap" value={jawaban.atap ?? ""} onChange={(e) => ubah({ atap: e.target.value as Atap })} className={`${kolom} mt-1.5`}>
            {jawaban.atap === null && <option value="" disabled>Pilih jawaban</option>}
            {ATAP.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>
    </section>
  );
}

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
          {air.dariPengguna ? (
            <>
              <Batang label="Air bisa sulit (sekarang)" hari={air.perluKini} maks={maks} warna="bg-amber-300" />
              <Batang label="Air bisa sulit (10-25 tahun lagi)" hari={air.perluDepan} maks={maks} warna="bg-orange-400" />
            </>
          ) : <Batang label="Cadangan dasar" hari={air.perluKini} maks={maks} warna="bg-amber-300" />}
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Keluarga {input.anggota} orang butuh sekitar {air.kebutuhanLiterPerHari} liter air sehari kalau berhemat ({LITER_PER_ORANG_HARI} liter per orang). Air simpanan Anda cukup untuk {fmt(air.hariCukup)} hari.{" "}
          {!air.dariPengguna
            ? <>Soal air belum dijawab, jadi kami hanya menghitung cadangan dasar {MIN_HARI_CADANGAN_AIR} hari yang sebaiknya dimiliki setiap rumah.</>
            : air.kurangKini > 0
            ? <>Kalau air sulit sekitar {air.perluKini} hari, keluarga perlu air dari luar (PDAM, tangki, atau tetangga) kira-kira <strong className="text-foreground">{air.kurangKini} hari</strong>. 10-25 tahun lagi bisa sekitar {air.kurangDepan} hari.</>
            : air.kurangDepan > 0
              ? <>Itu cukup untuk sekarang, tetapi 10-25 tahun lagi mungkin kurang sekitar <strong className="text-foreground">{air.kurangDepan} hari</strong>.</>
              : <>Itu lebih lama dari perkiraan air sulit, baik sekarang ({air.perluKini} hari) maupun 10-25 tahun lagi ({air.perluDepan} hari).</>}
          {" "}{air.dariPengguna && CATATAN_SUMBER[input.sumberAir]}
        </p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {air.dariPengguna
            ? <>Dari mana angka &ldquo;air bisa sulit&rdquo;? Dari jawaban Anda: &ldquo;beberapa hari&rdquo; kami hitung sekitar {HARI_GANGGUAN_AIR.hari} hari dan &ldquo;beberapa minggu&rdquo; sekitar {HARI_GANGGUAN_AIR.minggu} hari. Untuk 10-25 tahun lagi, angkanya kami sesuaikan dengan perkiraan kemarau: di tahun yang paling kering, wilayah ini bisa {teksPerubahanKemarau(air.kemarauKini, air.kemarauDepan)}.</>
            : <>Di tahun yang paling kering, wilayah ini bisa {teksPerubahanKemarau(air.kemarauKini, air.kemarauDepan)}. Tetapi tidak hujan bukan berarti air di rumah langsung sulit, karena itu kami menanyakan pengalaman Anda.</>}
        </p>
        {air.dariPengguna && air.kurangKini > 0 && (
            <div className="rounded-xl bg-muted px-4 py-3 text-sm leading-relaxed">
              <p className="font-semibold">Bila air rumah sudah sulit</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
                <li>Laporkan lewat ketua RT/RW atau kantor kelurahan/desa agar diteruskan ke BPBD kabupaten/kota, yang biasanya mengirim bantuan air bersih saat kemarau.</li>
                <li>Untuk pelanggan PDAM, tanyakan jadwal giliran air atau tangki air ke PDAM setempat (nomornya ada di rekening tagihan).</li>
                <li>Simpan air minum terpisah dari air untuk mandi dan mencuci, dan tutup semua wadah agar tidak jadi sarang nyamuk.</li>
              </ul>
            </div>
        )}
      </section>

      <section aria-labelledby="u-panas" className="space-y-2 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id="u-panas" className="text-base font-bold">Panas</h3>
          <Lencana t={panas.tingkat} amanLabel="Tidak banyak berubah" />
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Sekarang ada sekitar <strong className="text-foreground">{fmt(panas.hariKini, 0)} hari</strong> dalam setahun yang siangnya lebih dari {fmt(panas.ambangC, 0)}°C. Dulu (tahun 1990-an) sekitar {fmt(panas.hariDulu, 0)} hari, dan {teksKeDepan(panas.hariKini, panas.hariDepan)}.{panas.bulanPuncak.length ? ` Paling sering terjadi ${rentangBulan(nama, bulanIdx(panas.bulanPuncak))}.` : ""}
          {panas.rentan && " Lansia, balita, dan ibu hamil lebih cepat lemas karena panas."}
          {panas.atapPanas && " Atap seng membuat isi rumah lebih cepat panas."}
        </p>
        {(panas.rentan || panas.tingkat !== "aman") && (
          <div className="rounded-xl bg-muted px-4 py-3 text-sm leading-relaxed">
            <p className="font-semibold">Kenali tanda bahaya sengatan panas (heat stroke)</p>
            <p className="mt-1 text-muted-foreground">Kulit panas dan kering, bingung atau bicara tidak jelas, kejang, jantung berdebar dan napas cepat. Pindahkan ke tempat teduh, dinginkan tubuh dengan air, dan segera hubungi <a href="tel:119" className="font-semibold text-foreground underline underline-offset-2">119</a> atau puskesmas terdekat.</p>
            <p className="mt-1 text-muted-foreground">Tanda awal (lemas, pusing, berkeringat banyak): beri minum, istirahat di tempat sejuk setidaknya 30 menit. Lansia, bayi, dan anak kecil paling cepat terdampak; jangan pernah meninggalkan anak di mobil yang terparkir.</p>
            <p className="mt-1 text-xs text-muted-foreground">Sumber: Kementerian Kesehatan RI dan MSD Manual.</p>
          </div>
        )}
      </section>

      <section aria-labelledby="u-hujan" className="space-y-2 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id="u-hujan" className="text-base font-bold">Hujan lebat dan genangan</h3>
          <Lencana t={hujan.tingkat} amanLabel="Tidak banyak berubah" />
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Hujan sangat deras (lebih dari {fmt(hujan.ambangMm, 0)} mm dalam sehari) turun sekitar <strong className="text-foreground">{hariBulat(hujan.hariKini)} hari</strong> dalam setahun; {teksKeDepan(hujan.hariKini, hujan.hariDepan)}.{hujan.bulanPuncak.length ? ` Paling sering terjadi ${rentangBulan(nama, bulanIdx(hujan.bulanPuncak))}.` : ""}
          {hujan.rawanGenang && " Rumah Anda pernah tergenang, jadi siapkan sebelum bulan-bulan hujan."}
        </p>
      </section>
    </div>
  );
}
