"use client";
// Kelola keluarga: satu pengguna (mis. ketua RT, kader, relawan) menyusun Rencana Siaga untuk banyak keluarga, tanpa
// login. Setiap keluarga punya lokasi, profil, rencana, dan centangnya sendiri; yang "dibuka" dipakai semua fitur.
import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, ClipboardList, FileText, Home, MapPin, Pencil, Plus, Printer, ShieldCheck, Trash2, Users } from "lucide-react";
import { rekap, NAMA_MAKS, MAKS_KELUARGA } from "@/lib/keluarga/keluarga";
import { buangKeluarga, bukaKeluarga, namaiKeluarga, tambahDanBuka, useKeluarga, type KeluargaTampil } from "@/hooks/use-keluarga";

const TOMBOL = "press inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const MASUKAN = "mt-1 block w-full min-h-11 rounded-xl border border-border bg-background px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-primary";

const rentanTeks = (r: KeluargaTampil["ringkas"]) =>
  [r.lansia && `${r.lansia} lansia`, r.balita && `${r.balita} balita`, r.hamil && `${r.hamil} ibu hamil`, r.disabilitas && `${r.disabilitas} disabilitas`].filter(Boolean).join(", ");

function KartuKeluarga({ k }: { k: KeluargaTampil }) {
  const r = k.ringkas;
  const [ubah, setUbah] = useState(false);
  const [nama, setNama] = useState(k.nama);
  const [hapus, setHapus] = useState(false);
  const rentan = rentanTeks(r);
  const persen = r.tindakan ? Math.round((r.tindakanSiap / r.tindakan) * 100) : 0;

  return (
    <li className={`rounded-2xl border p-4 sm:p-5 ${k.aktif ? "border-primary bg-primary/5" : "border-border bg-surface"}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        {ubah ? (
          <form className="flex w-full flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); if (namaiKeluarga(k.id, nama)) setUbah(false); }}>
            <label className="sr-only" htmlFor={`nama-${k.id}`}>Nama keluarga</label>
            <input id={`nama-${k.id}`} value={nama} onChange={(e) => setNama(e.target.value)} maxLength={NAMA_MAKS} className={`${MASUKAN} mt-0 min-w-0 flex-1`} autoFocus />
            <button type="submit" className={`${TOMBOL} bg-primary text-primary-foreground`}>Simpan</button>
            <button type="button" onClick={() => { setNama(k.nama); setUbah(false); }} className={`${TOMBOL} border border-border`}>Batal</button>
          </form>
        ) : (
          <h3 className="flex flex-wrap items-center gap-2 text-lg font-bold">
            {k.nama}
            {k.milikSaya && <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">Milik Anda</span>}
            {k.aktif && <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">Sedang dibuka</span>}
          </h3>
        )}
      </div>
      <p className="mt-2 flex items-start gap-1.5 text-sm text-muted-foreground">
        <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {r.kelurahan ? `${r.kelurahan}, ${r.kabKota}` : "Lokasi belum dipilih"}
      </p>
      <p className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground">
        <Users className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {r.adaProfil ? `${r.anggota} orang${rentan ? `, termasuk ${rentan}` : ""}` : "Profil keluarga belum diisi"}
      </p>
      <p className="mt-1 flex items-start gap-1.5 text-sm">
        <ClipboardList className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
        {r.adaRencana ? <span><strong>{r.tindakanSiap} dari {r.tindakan}</strong> tindakan sudah siap ({persen}%)</span> : <span className="text-muted-foreground">Rencana belum disusun</span>}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {k.aktif ? (
          <Link href="/rencana" className={`${TOMBOL} bg-primary text-primary-foreground`}>Lanjutkan rencana</Link>
        ) : (
          <button type="button" onClick={() => bukaKeluarga(k.id, "/rencana")} className={`${TOMBOL} bg-primary text-primary-foreground`}>Buka rencana</button>
        )}
        {r.adaRencana && (
          k.aktif
            ? <Link href="/rencana/kartu" className={`${TOMBOL} border border-border`}><Printer className="size-4" aria-hidden="true" /> Kartu Siaga</Link>
            : <button type="button" onClick={() => bukaKeluarga(k.id, "/rencana/kartu")} className={`${TOMBOL} border border-border`}><Printer className="size-4" aria-hidden="true" /> Kartu Siaga</button>
        )}
        {r.adaRencana && (
          k.aktif
            ? <Link href="/rencana/cetak" className={`${TOMBOL} border border-border`}><FileText className="size-4" aria-hidden="true" /> Dokumen rencana</Link>
            : <button type="button" onClick={() => bukaKeluarga(k.id, "/rencana/cetak")} className={`${TOMBOL} border border-border`}><FileText className="size-4" aria-hidden="true" /> Dokumen rencana</button>
        )}
        {!ubah && <button type="button" onClick={() => setUbah(true)} className={`${TOMBOL} border border-border`}><Pencil className="size-4" aria-hidden="true" /> Ubah nama</button>}
        {!k.milikSaya && !k.aktif && !hapus && (
          <button type="button" onClick={() => setHapus(true)} className={`${TOMBOL} border border-border text-red-700`}><Trash2 className="size-4" aria-hidden="true" /> Hapus</button>
        )}
      </div>
      {hapus && (
        <div role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          <p className="font-semibold">Hapus {k.nama} beserta rencananya dari ponsel ini? Tidak bisa dibatalkan.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={() => buangKeluarga(k.id)} className={`${TOMBOL} bg-red-700 text-white`}>Ya, hapus</button>
            <button type="button" onClick={() => setHapus(false)} className={`${TOMBOL} border border-red-200 bg-white`}>Batal</button>
          </div>
        </div>
      )}
    </li>
  );
}

function FormTambah({ aktif }: { aktif: KeluargaTampil | null }) {
  const lokasiAktif = aktif?.ringkas.kelurahan ? `${aktif.ringkas.kelurahan}, ${aktif.ringkas.kabKota}` : null;
  const [nama, setNama] = useState("");
  const [salin, setSalin] = useState(true);
  const [galat, setGalat] = useState<string | null>(null);
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); setGalat(tambahDanBuka(nama, Boolean(lokasiAktif) && salin)); }}
      id="tambah-keluarga"
      className="scroll-mt-28 rounded-2xl border border-border bg-surface p-5 sm:p-6"
      aria-labelledby="judul-tambah-keluarga"
    >
      <h2 id="judul-tambah-keluarga" className="flex items-center gap-2 text-lg font-bold"><Plus className="size-5 text-primary" aria-hidden="true" /> Tambah keluarga</h2>
      <label htmlFor="nama-keluarga-baru" className="mt-3 block text-sm font-semibold">Nama keluarga</label>
      <input id="nama-keluarga-baru" value={nama} onChange={(e) => setNama(e.target.value)} maxLength={NAMA_MAKS} placeholder="Misalnya: Keluarga Bu Sari, RT 03" className={MASUKAN} autoComplete="off" />
      {lokasiAktif && (
        <label className="mt-3 flex items-start gap-3 text-sm">
          <input type="checkbox" checked={salin} onChange={(e) => setSalin(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-primary" />
          <span>Lokasinya sama dengan <strong>{lokasiAktif}</strong> (misalnya warga satu RT). Hilangkan centang bila keluarga ini tinggal di kelurahan lain.</span>
        </label>
      )}
      <p className="mt-3 flex items-start gap-2 rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
        Minta izin keluarga tersebut sebelum mendata. Semua data hanya tersimpan di ponsel ini, tidak dikirim ke mana pun.
      </p>
      {galat && <p role="alert" className="mt-3 text-sm font-semibold text-red-700">{galat}</p>}
      <button type="submit" className={`${TOMBOL} mt-4 w-full bg-primary text-primary-foreground sm:w-auto`}>
        {lokasiAktif && salin ? "Buat dan isi profil keluarga" : "Buat dan pilih lokasinya"}
      </button>
    </form>
  );
}

export function KelolaKeluarga() {
  const { siap, daftar, aktif, jumlah } = useKeluarga();
  if (!siap) return <div className="h-64 animate-pulse rounded-2xl bg-muted" aria-busy="true" aria-label="Memuat daftar keluarga" />;
  const total = rekap(daftar.map((k) => k.ringkas));

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">Rencana Siaga</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Keluarga yang Anda dampingi</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Susun Rencana Siaga untuk lebih dari satu keluarga, misalnya warga RT, keluarga besar, atau tetangga lansia. Setiap keluarga punya lokasi, profil, rencana, dan Kartu Siaga sendiri. Yang sedang dibuka dipakai di semua fitur SIGAP; Mode Darurat tetap menampilkan keluarga Anda sendiri.
        </p>
      </header>

      {jumlah >= 2 && (
        <section aria-labelledby="judul-rekap" className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="judul-rekap" className="flex items-center gap-2 text-lg font-bold"><Home className="size-5 text-primary" aria-hidden="true" /> Rekap warga</h2>
            <button type="button" onClick={() => window.print()} className={`${TOMBOL} tanpa-cetak border border-border`}><Printer className="size-4" aria-hidden="true" /> Cetak rekap</button>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Bahan rencana evakuasi lingkungan: siapa yang perlu dibantu lebih dulu saat mengungsi.</p>
          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Keluarga", `${total.keluarga}`, `${total.denganRencana} sudah punya rencana`],
              ["Orang", `${total.orang}`, "jumlah anggota"],
              ["Lansia", `${total.lansia}`, "perlu dibantu mengungsi"],
              ["Balita dan ibu hamil", `${total.balita + total.hamil}`, `${total.balita} balita, ${total.hamil} ibu hamil`],
            ].map(([l, n, s]) => (
              <div key={l} className="rounded-xl bg-muted/60 p-3">
                <dt className="text-xs font-semibold text-muted-foreground">{l}</dt>
                <dd className="text-2xl font-extrabold tabular-nums">{n}</dd>
                <dd className="text-xs text-muted-foreground">{s}</dd>
              </div>
            ))}
          </dl>
          {total.disabilitas > 0 && <p className="mt-3 text-sm"><strong>{total.disabilitas} penyandang disabilitas</strong> tercatat: pastikan ada pendamping saat evakuasi.</p>}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <caption className="sr-only">Daftar keluarga dan kelompok rentan</caption>
              <thead className="text-xs uppercase text-muted-foreground">
                <tr><th className="py-2 pr-3">Keluarga</th><th className="py-2 pr-3">Orang</th><th className="py-2 pr-3">Kelompok rentan</th><th className="py-2 pr-3">Titik kumpul</th><th className="py-2">Kesiapan</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {daftar.map((k) => (
                  <tr key={k.id}>
                    <td className="py-2 pr-3 font-semibold">{k.nama}</td>
                    <td className="py-2 pr-3 tabular-nums">{k.ringkas.adaProfil ? k.ringkas.anggota : "-"}</td>
                    <td className="py-2 pr-3">{rentanTeks(k.ringkas) || "-"}</td>
                    <td className="py-2 pr-3">{k.ringkas.titikKumpul || "-"}</td>
                    <td className="py-2 tabular-nums">{k.ringkas.adaRencana ? `${k.ringkas.tindakanSiap}/${k.ringkas.tindakan}` : "Belum ada rencana"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section aria-labelledby="judul-daftar-keluarga" className="tanpa-cetak">
        <h2 id="judul-daftar-keluarga" className="flex items-center gap-2 text-lg font-bold"><CheckCircle2 className="size-5 text-primary" aria-hidden="true" /> Daftar keluarga ({jumlah} dari {MAKS_KELUARGA})</h2>
        <ul className="mt-3 grid gap-3">
          {daftar.map((k) => <KartuKeluarga key={k.id} k={k} />)}
        </ul>
      </section>

      <div className="tanpa-cetak">
        <FormTambah aktif={aktif} />
      </div>

      <p className="tanpa-cetak text-sm text-muted-foreground">
        Pindah ke ponsel lain: gunakan <Link href="/data-saya" className="font-semibold text-primary underline underline-offset-2">Cadangkan data</Link>; semua keluarga ikut tersimpan.
      </p>
    </div>
  );
}
