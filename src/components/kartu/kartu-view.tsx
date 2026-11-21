"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Download, Printer } from "lucide-react";
import { buatPdfKartu, namaBerkasKartu } from "@/lib/kartu/pdf";
import { toast } from "@/lib/toast";
import { useHydrate } from "@/hooks/use-hydrate";
import { HAZARD_BY_ID } from "@/lib/hazards/hazards";
import { faktaRisikoKartu, langkahKunciKartu, tasRingkasKartu } from "@/lib/kartu/isi";
import { useRisikoLokasi } from "@/hooks/use-risiko-lokasi";
import kontak from "@/generated/kontak.json";
import { useKartuStore, NAMA_KELUARGA_MAKS } from "@/stores/kartu-store";
import { useLokasiStore } from "@/stores/lokasi-store";
import { useProfilStore } from "@/stores/profil-store";
import { useRencanaStore } from "@/stores/rencana-store";
import { finalisasiProfil } from "@/lib/preparedness/profil-schema";
import { useKeluarga } from "@/hooks/use-keluarga";
import { TeksPihak } from "@/components/rencana/teks-pihak";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "";
const GARIS = "________________";
const BTN = "min-h-11 rounded-lg border px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

const tanggal = (iso: string) => new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(new Date(iso));

/**
 * Kartu Siaga satu halaman, hitam putih, tanpa gambar latar (Blueprint 8.1).
 * Huruf minimal 10 pt (A5) dan 11 pt (A4), tepi 12 mm. Dicetak lewat dialog cetak peramban
 * ("Simpan sebagai PDF" menghasilkan PDF berisi teks asli). Seluruh data tetap di perangkat.
 */
export function KartuView() {
  const siap = useHydrate(useLokasiStore, useProfilStore, useRencanaStore, useKartuStore);
  const lokasi = useLokasiStore((s) => s.lokasi);
  const draft = useProfilStore((s) => s.profil);
  const rencana = useRencanaStore((s) => s.rencana);
  const [mengunduh, setMengunduh] = useState(false);
  const { namaKeluarga, ukuran, tampilkanCatatan, ubah } = useKartuStore();
  // Nama di daftar keluarga (bila ada lebih dari satu keluarga): tawarkan bila nama kartu berbeda.
  const { aktif: keluargaAktif, jumlah: jumlahKeluarga } = useKeluarga();
  const namaDaftar = jumlahKeluarga > 1 && keluargaAktif ? keluargaAktif.nama.slice(0, NAMA_KELUARGA_MAKS) : null;
  const [qr, setQr] = useState<string | null>(null);
  const profil = useMemo(() => finalisasiProfil(draft), [draft]);
  const risikoQ = useRisikoLokasi(siap ? lokasi : null);

  useEffect(() => {
    let batal = false;
    const url = `${SITE_URL || window.location.origin}/darurat`;
    import("qrcode")
      .then((m) => m.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M" }))
      .then((svg) => { if (!batal) setQr(svg); })
      .catch(() => { if (!batal) setQr(null); });
    return () => { batal = true; };
  }, []);

  if (!siap) return <div className="h-64 animate-pulse rounded-2xl bg-muted" aria-busy="true" aria-label="Memuat kartu" />;
  if (!lokasi || !profil || !rencana) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-8 text-center">
        <h1 className="font-semibold"><TeksPihak>Kartu Siaga dibuat dari rencana Anda.</TeksPihak></h1>
        <p className="mt-1 text-sm text-muted-foreground">Pilih lokasi dan isi profil keluarga dulu, lalu buka Rencana Siaga.</p>
        <Link href="/rencana" className="mt-4 inline-flex min-h-12 items-center rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground">Ke Rencana Siaga</Link>
      </div>
    );
  }

  const grup = langkahKunciKartu(rencana.tindakan, profil.bahaya);
  const faktaRisiko = faktaRisikoKartu(risikoQ.data?.nilai, profil.bahaya, ukuran === "A5" ? 2 : 3);
  const tas = tasRingkasKartu(rencana.tas);
  const catatan = profil.catatanKhusus?.trim();
  const kecil = ukuran === "A5";
  const pt = kecil ? 10 : 11;
  const kosong = kontak.perluVerifikasi;

  return (
    <div>
      <style>{`
        @page { size: ${ukuran}; margin: 12mm; }
        @media print {
          .tanpa-cetak { display: none !important; }
          body { background: #fff !important; }
          .kartu { border: 0 !important; padding: 0 !important; box-shadow: none !important; }
        }
      `}</style>

      <div className="tanpa-cetak mb-6 space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label htmlFor="nama-keluarga" className="block text-sm font-semibold">Nama keluarga (opsional)</label>
            <input
              id="nama-keluarga"
              type="text"
              maxLength={NAMA_KELUARGA_MAKS}
              value={namaKeluarga}
              onChange={(e) => ubah({ namaKeluarga: e.target.value })}
              className="mt-1 min-h-11 w-64 max-w-full rounded-lg border border-border bg-surface px-3 text-sm"
              aria-describedby="nama-bantuan"
            />
            <p id="nama-bantuan" className="mt-1 text-xs text-muted-foreground">{namaKeluarga.length}/{NAMA_KELUARGA_MAKS} karakter</p>
            {siap && namaDaftar && namaKeluarga.trim() !== namaDaftar.trim() && (
              <button type="button" onClick={() => ubah({ namaKeluarga: namaDaftar })} className="mt-1 inline-flex min-h-9 items-center text-left text-xs font-semibold text-primary underline underline-offset-2">
                Pakai nama keluarga: {namaDaftar}
              </button>
            )}
          </div>
          <div role="group" aria-label="Ukuran kertas" className="flex gap-2">
            {(["A4", "A5"] as const).map((u) => (
              <button key={u} type="button" aria-pressed={ukuran === u} onClick={() => ubah({ ukuran: u })}
                className={`${BTN} ${ukuran === u ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface"}`}>
                {u}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => window.print()} className={`${BTN} inline-flex items-center gap-2 border-primary bg-primary text-primary-foreground`}>
            <Printer className="size-4" aria-hidden="true" /> Cetak
          </button>
          <button
            type="button"
            disabled={mengunduh}
            onClick={async () => {
              setMengunduh(true);
              try {
                const { blob, terpangkas } = await buatPdfKartu({
                  ukuran,
                  namaKeluarga,
                  dibuat: tanggal(rencana.dibuatPada),
                  lokasi: `${lokasi.kelurahan}, Kec. ${lokasi.kecamatan}, ${lokasi.kabKota}`,
                  bahaya: profil.bahaya.map((h) => HAZARD_BY_ID[h].label),
                  faktaRisiko,
                  kontakNasional: kontak.kontak,
                  kontakKeluarga: profil.kontakDarurat,
                  titikKumpul: profil.titikKumpul ?? "",
                  langkah: grup.map((g) => ({ bahaya: HAZARD_BY_ID[g.hazard as keyof typeof HAZARD_BY_ID].label, langkah: g.langkah.map((t) => t.title) })),
                  tas: tas.map((i) => `${i.jumlah} ${i.satuan} ${i.nama.toLowerCase()}`),
                  catatan: tampilkanCatatan ? catatan : undefined,
                  urlDarurat: `${SITE_URL || window.location.origin}/darurat`,
                });
                // PDF dibuat sepenuhnya di peramban; tidak ada data yang dikirim ke server (Blueprint 8.1).
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = namaBerkasKartu(lokasi.kelurahan);
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000); // dicabut langsung dapat membatalkan unduhan di Safari
                toast(terpangkas ? "PDF diunduh, tetapi sebagian isi dipangkas agar muat satu halaman. Pilih A4 agar lengkap." : "Kartu Siaga diunduh sebagai PDF.");
              } catch {
                toast("PDF belum berhasil dibuat. Coba tombol Cetak lalu pilih Simpan sebagai PDF.");
              } finally {
                setMengunduh(false);
              }
            }}
            className={`${BTN} inline-flex items-center gap-2 border-border bg-surface disabled:opacity-60`}
          >
            <Download className="size-4" aria-hidden="true" /> {mengunduh ? "Menyiapkan PDF…" : "Unduh PDF"}
          </button>
        </div>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" checked={tampilkanCatatan} disabled={!catatan} onChange={(e) => ubah({ tampilkanCatatan: e.target.checked })} className="size-5" />
          Cetak catatan khusus{!catatan && " (belum diisi di profil)"}
        </label>
        <p className="text-sm text-muted-foreground">&ldquo;Unduh PDF&rdquo; membuat berkas langsung di perangkat ini, tanpa mengirim data ke server. Kartu selalu dibatasi satu halaman; isi berlebih dipangkas, bukan dipecah ke halaman kedua.</p>
        {ukuran === "A5" && (
          <p className="text-sm text-muted-foreground">A5 memuat lebih sedikit. Untuk keluarga besar atau banyak bahaya, pilih A4 agar seluruh isi tercetak.</p>
        )}
        {kosong && <p className="text-sm text-muted-foreground">Nomor darurat masih menunggu verifikasi tim sebelum dirilis (lihat Metodologi).</p>}
      </div>

      <article className="kartu cetak-utuh rounded-2xl border border-border bg-white p-6 text-black" style={{ fontSize: `${pt}pt`, lineHeight: 1.35 }}>
        <header className="border-b-2 border-black pb-2">
          <h1 className="font-extrabold uppercase" style={{ fontSize: kecil ? "15pt" : "18pt" }}>Kartu Siaga Keluarga</h1>
          {namaKeluarga.trim() && <p className="font-bold">{namaKeluarga.trim()}</p>}
          <p>{lokasi.kelurahan}, Kec. {lokasi.kecamatan}, {lokasi.kabKota}</p>
          <p>Dibuat: {tanggal(rencana.dibuatPada)}</p>
        </header>

        <section className="mt-2">
          <h2 className="font-bold">Bahaya yang disiapkan</h2>
          <p>{profil.bahaya.map((h) => HAZARD_BY_ID[h].label).join(", ")}</p>
          {faktaRisiko.length > 0 && (
            <ul className="mt-0.5 list-disc pl-5">
              {faktaRisiko.map((f) => <li key={f}>{f}</li>)}
            </ul>
          )}
        </section>

        <section className="mt-2">
          <h2 className="font-bold">Nomor darurat nasional</h2>
          <ul className="grid grid-cols-2 gap-x-4">
            {kontak.kontak.map((k) => (<li key={k.nomor}><strong>{k.nomor}</strong> {k.nama}</li>))}
          </ul>
        </section>

        <section className="mt-2">
          <h2 className="font-bold">Kontak keluarga dan BPBD</h2>
          <ul>
            {profil.kontakDarurat.map((k, i) => (<li key={i}><strong>{k.telepon}</strong> {k.nama}</li>))}
            <li>BPBD setempat: {GARIS}</li>
          </ul>
        </section>

        <section className="mt-2">
          <h2 className="font-bold">Titik kumpul dan jalur keluar</h2>
          <p>Titik kumpul: {profil.titikKumpul?.trim() || GARIS}</p>
          <p>Jalur keluar: {GARIS}</p>
        </section>

        {grup.length > 0 && (
          <section className="mt-2">
            <h2 className="font-bold">Tindakan kunci saat kejadian</h2>
            {grup.map(({ hazard, langkah }) => (
              <div key={hazard}>
                <h3 className="font-semibold">{HAZARD_BY_ID[hazard as keyof typeof HAZARD_BY_ID].label}</h3>
                <ol className="ml-5 list-decimal">
                  {langkah.map((t) => (<li key={t.actionId}>{t.title}</li>))}
                </ol>
              </div>
            ))}
          </section>
        )}

        <section className="mt-2">
          <h2 className="font-bold">Isi tas siaga (ringkas)</h2>
          <ul className="grid grid-cols-2 gap-x-4">
            {tas.map((i) => (<li key={i.id}>{i.jumlah} {i.satuan} {i.nama.toLowerCase()}</li>))}
          </ul>
        </section>

        {tampilkanCatatan && catatan && (
          <section className="mt-2"><h2 className="font-bold">Catatan khusus</h2><p>{catatan}</p></section>
        )}

        <footer className="mt-3 flex items-end justify-between gap-4 border-t-2 border-black pt-2">
          <p style={{ maxWidth: "70%" }}>Dibuat dengan SIGAP. Pindai untuk Mode Darurat (bisa dibuka tanpa internet setelah pernah dibuka). Bukan pengganti arahan BPBD, BMKG, atau petugas berwenang.</p>
          {qr ? <div role="img" aria-label="Kode QR ke halaman Mode Darurat" style={{ width: "26mm", height: "26mm" }} dangerouslySetInnerHTML={{ __html: qr }} /> : <p><strong>{(SITE_URL || "").replace(/^https?:\/\//, "")}/darurat</strong></p>}
        </footer>
      </article>
    </div>
  );
}
