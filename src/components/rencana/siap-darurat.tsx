"use client";
// "Siapkan Mode Darurat" di Rencana > Bagikan: hal yang perlu dikerjakan SELAGI TENANG agar Mode Darurat siap dipakai
// saat panik, yaitu info medis untuk penolong dan memasang SIGAP di layar utama (tetap terbuka tanpa internet).
import Link from "next/link";
import { Cross, Download, Siren, Smartphone } from "lucide-react";
import { useHydrate } from "@/hooks/use-hydrate";
import { usePasangPwa } from "@/hooks/use-pasang-pwa";
import { GOLONGAN_DARAH, MEDIS_TEKS_MAKS, adaInfoMedis, useMedisStore, type GolonganDarah } from "@/stores/medis-store";

const MASUKAN = "mt-1 block w-full min-h-11 rounded-xl border border-border bg-background px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-primary";

export function SiapDarurat() {
  const siap = useHydrate(useMedisStore);
  const m = useMedisStore();
  const ada = siap && adaInfoMedis(m);
  const { bisaPasang, sudahTerpasang, pasang: jalankanPasang } = usePasangPwa();

  return (
    <section aria-labelledby="judul-siap-darurat" className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <h2 id="judul-siap-darurat" className="flex items-center gap-2 text-lg font-bold text-foreground">
        <Siren className="size-5 text-red-600" aria-hidden="true" /> Siapkan Mode Darurat
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Kerjakan selagi tenang, agar saat darurat Anda tinggal membuka dan menunjukkan.{" "}
        <Link href="/darurat" className="font-semibold text-primary underline underline-offset-2">Lihat Mode Darurat</Link>
      </p>

      <div id="info-medis" className="mt-5 scroll-mt-24">
        <h3 className="flex items-center gap-2 font-bold text-foreground"><Cross className="size-4 text-red-600" aria-hidden="true" /> Info medis untuk penolong</h3>
        <p className="mt-1 text-sm text-muted-foreground">Tampil di Mode Darurat untuk ditunjukkan ke petugas bila Anda tidak bisa bicara. Hanya tersimpan di ponsel ini, tidak dikirim ke mana pun.</p>
        {siap && (
          <form className="mt-3 grid gap-3 sm:grid-cols-2" onSubmit={(e) => e.preventDefault()} aria-label="Info medis untuk penolong">
            <label className="block text-sm font-semibold">Nama panggilan
              <input value={m.nama} onChange={(e) => m.ubah({ nama: e.target.value })} maxLength={40} className={MASUKAN} autoComplete="off" />
            </label>
            <label className="block text-sm font-semibold">Golongan darah
              <select value={m.golonganDarah} onChange={(e) => m.ubah({ golonganDarah: e.target.value as GolonganDarah | "" })} className={MASUKAN}>
                <option value="">Belum diisi</option>
                {GOLONGAN_DARAH.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </label>
            <label className="block text-sm font-semibold">Alergi (obat, makanan)
              <input value={m.alergi} onChange={(e) => m.ubah({ alergi: e.target.value })} maxLength={MEDIS_TEKS_MAKS} placeholder="Misalnya: penisilin, udang" className={MASUKAN} autoComplete="off" />
            </label>
            <label className="block text-sm font-semibold">Penyakit dan obat penting
              <input value={m.kondisi} onChange={(e) => m.ubah({ kondisi: e.target.value })} maxLength={MEDIS_TEKS_MAKS} placeholder="Misalnya: diabetes, pakai insulin" className={MASUKAN} autoComplete="off" />
            </label>
            <label className="block text-sm font-semibold sm:col-span-2">Catatan untuk penolong
              <input value={m.catatan} onChange={(e) => m.ubah({ catatan: e.target.value })} maxLength={MEDIS_TEKS_MAKS} placeholder="Misalnya: tuli, ajak bicara lewat tulisan" className={MASUKAN} autoComplete="off" />
            </label>
            <p className="text-sm text-muted-foreground sm:col-span-2" role="status">
              {ada ? "Tersimpan otomatis di ponsel ini." : "Belum ada yang diisi."}
              {ada && (
                <>
                  {" "}
                  <button type="button" onClick={() => m.reset()} className="font-semibold text-foreground underline underline-offset-2">Hapus info medis</button>
                </>
              )}
            </p>
          </form>
        )}
      </div>

      <div className="mt-6 border-t border-border pt-5">
        <h3 className="flex items-center gap-2 font-bold text-foreground"><Smartphone className="size-4 text-primary" aria-hidden="true" /> Pasang SIGAP di layar utama</h3>
        <p className="mt-1 text-sm text-muted-foreground">Mode Darurat jadi satu ketuk dari layar utama dan tetap terbuka tanpa internet.</p>
        {sudahTerpasang ? (
          <p className="mt-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">SIGAP sudah terpasang di layar utama perangkat ini.</p>
        ) : bisaPasang ? (
          <button type="button" onClick={() => void jalankanPasang()} className="press mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">
            <Download className="size-4" aria-hidden="true" /> Pasang SIGAP
          </button>
        ) : (
          <p className="mt-2 text-sm text-foreground">Android Chrome: menu titik tiga, lalu &ldquo;Tambahkan ke layar utama&rdquo;. iPhone Safari: tombol Bagikan, lalu &ldquo;Tambah ke Layar Utama&rdquo;.</p>
        )}
      </div>
    </section>
  );
}
