"use client";
// Dokumen Rencana Siaga lengkap untuk dicetak atau disimpan sebagai PDF: susunan seperti dokumen (identitas, risiko,
// nomor penting, tindakan per bahaya dan fase, Tas Siaga, persiapan rumah, sumber), BUKAN cetakan halaman web.
// Semua isi dari data di perangkat (tanpa jaringan), sama dengan yang tampil di Rencana dan Kartu Siaga.
import Link from "next/link";
import { useMemo } from "react";
import { ArrowLeft, Printer } from "lucide-react";
import { useHydrate } from "@/hooks/use-hydrate";
import { useLokasiStore } from "@/stores/lokasi-store";
import { useProfilStore } from "@/stores/profil-store";
import { useRencanaStore } from "@/stores/rencana-store";
import { useProgresStore } from "@/stores/progres-store";
import { useKartuStore } from "@/stores/kartu-store";
import { useAksiIklimStore } from "@/stores/aksi-iklim-store";
import { useKeluarga } from "@/hooks/use-keluarga";
import { finalisasiProfil } from "@/lib/preparedness/profil-schema";
import { HAZARD_BY_ID } from "@/lib/hazards/hazards";
import { CHUNK_BY_ID } from "@/lib/kb/data";
import { gabungSumber } from "@/lib/darurat/langkah";
import { OPSI_BANGUNAN } from "./langkah-rumah";
import kontak from "@/generated/kontak.json";
import type { Tindakan } from "@/types/rencana";

const FASE: Array<{ id: Tindakan["phase"]; judul: string }> = [
  { id: "sebelum", judul: "Sebelum terjadi" },
  { id: "saat", judul: "Saat terjadi" },
  { id: "sesudah", judul: "Sesudah terjadi" },
];
const BOBOT = { tinggi: 0, sedang: 1, rendah: 2 } as const;
const tanggal = (iso: string) => new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" });

/** Kotak centang yang tercetak jelas di semua printer (bukan karakter yang bergantung font). */
function Kotak({ isi }: { isi: boolean }) {
  return (
    <span aria-hidden="true" className="mt-[3px] inline-flex size-[11px] shrink-0 items-center justify-center border border-black text-[9px] font-bold leading-none">
      {isi ? "✓" : ""}
    </span>
  );
}

function Bagian({ no, judul, children }: { no: number; judul: string; children: React.ReactNode }) {
  return (
    <section className="dok-bagian mt-6">
      <h2 className="border-b-2 border-black pb-1 text-[13pt] font-bold">{no}. {judul}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}

export function DokumenRencana() {
  const siap = useHydrate(useLokasiStore, useProfilStore, useRencanaStore, useProgresStore, useKartuStore, useAksiIklimStore);
  const lokasi = useLokasiStore((s) => s.lokasi);
  const draft = useProfilStore((s) => s.profil);
  const rencana = useRencanaStore((s) => s.rencana);
  const progres = useProgresStore((s) => s.progres);
  const namaKartu = useKartuStore((s) => s.namaKeluarga);
  const aksiIklim = useAksiIklimStore((s) => s.aksi);
  const { aktif } = useKeluarga();
  const profil = useMemo(() => finalisasiProfil(draft), [draft]);

  const sumber = useMemo(() => {
    const ids = new Set((rencana?.tindakan ?? []).flatMap((t) => t.sourceIds));
    return gabungSumber([...ids].map((id) => CHUNK_BY_ID[id]).filter(Boolean).map((c) => ({ judul: c.sourceTitle, url: c.sourceUrl })));
  }, [rencana?.tindakan]);

  if (!siap) return <div className="h-64 animate-pulse rounded-2xl bg-muted" aria-busy="true" aria-label="Memuat dokumen rencana" />;
  if (!lokasi || !profil || !rencana) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-8 text-center">
        <h1 className="font-semibold">Dokumen dibuat dari Rencana Siaga.</h1>
        <p className="mt-1 text-sm text-muted-foreground">Pilih lokasi dan isi profil keluarga dulu, lalu buka Rencana Siaga.</p>
        <Link href="/rencana" className="mt-4 inline-flex min-h-12 items-center rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground">Ke Rencana Siaga</Link>
      </div>
    );
  }

  // Nama dari Kartu Siaga atau daftar keluarga; bila belum ada, garis isian agar ditulis tangan di kertas.
  const nama = namaKartu.trim() || (aktif && !aktif.milikSaya ? aktif.nama : "") || "Keluarga ____________________";
  const bangunan = OPSI_BANGUNAN.find((o) => o.value === profil.bangunan)?.label ?? "-";
  const rentan = [
    profil.lansia > 0 && `${profil.lansia} lansia`,
    profil.balita > 0 && `${profil.balita} balita`,
    profil.hamil > 0 && `${profil.hamil} ibu hamil atau menyusui`,
    profil.disabilitas > 0 && `${profil.disabilitas} penyandang disabilitas`,
  ].filter(Boolean).join(", ");
  const urutBahaya = [...profil.bahaya, "umum"] as Array<Tindakan["hazard"]>;
  const perBahaya = urutBahaya
    .map((h) => ({ h, daftar: rencana.tindakan.filter((t) => t.hazard === h) }))
    .filter((x) => x.daftar.length > 0);
  const tasPerKelompok = Object.entries(
    rencana.tas.reduce<Record<string, typeof rencana.tas>>((a, x) => ((a[x.kelompok] ??= []).push(x), a), {}),
  );
  const siapTindakan = rencana.tindakan.filter((t) => t.phase !== "sesudah");
  const sudah = siapTindakan.filter((t) => progres[t.actionId]).length;
  const nomor = [...kontak.kontak, ...kontak.lainnya];
  let no = 0;

  return (
    <div>
      {/* Bilah layar: tidak ikut tercetak. */}
      <div className="tanpa-cetak sticky top-[calc(4rem+var(--spanduk,0px))] z-10 mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface/95 p-3 backdrop-blur">
        <Link href="/rencana?tab=bagikan" className="inline-flex min-h-11 items-center gap-2 px-2 text-sm font-semibold text-primary"><ArrowLeft className="size-4" aria-hidden="true" /> Kembali ke rencana</Link>
        <p className="hidden text-sm text-muted-foreground sm:block">Pratinjau dokumen A4. Pilih &ldquo;Simpan sebagai PDF&rdquo; di jendela cetak untuk menyimpannya.</p>
        <button type="button" onClick={() => window.print()} className="press inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground">
          <Printer className="size-4" aria-hidden="true" /> Cetak atau simpan PDF
        </button>
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 15mm 14mm 16mm; }
          .dok-kertas { box-shadow: none !important; border: 0 !important; padding: 0 !important; max-width: none !important; }
          .dok-bagian h2, .dok-bahaya h3 { break-after: avoid; }
          .dok-bahaya, .dok-blok, tr { break-inside: avoid; }
        }
      `}</style>

      <article className="dok-kertas mx-auto max-w-[210mm] rounded-sm border border-border bg-white p-6 text-[10.5pt] leading-snug text-black shadow-lg sm:p-10" aria-label={`Dokumen Rencana Siaga ${nama}`}>
        <header className="border-b-[3px] border-black pb-3">
          <p className="text-[9pt] font-semibold uppercase tracking-widest">SIGAP · Rencana Siaga Keluarga</p>
          <h1 className="mt-1 text-[20pt] font-extrabold leading-tight [overflow-wrap:anywhere]">{nama}</h1>
          <p className="mt-1">{lokasi.kelurahan}, Kec. {lokasi.kecamatan}, {lokasi.kabKota}, {lokasi.provinsi}</p>
          <p className="mt-1 text-[9pt]">Disusun {tanggal(rencana.dibuatPada)} · Dicetak {tanggal(new Date().toISOString())} · Kesiapan: {sudah} dari {siapTindakan.length} tindakan sebelum dan saat bencana sudah dicentang</p>
        </header>

        <Bagian no={++no} judul="Identitas keluarga">
          <table className="w-full border-collapse text-left">
            <tbody>
              {[
                ["Jumlah anggota", `${profil.jumlahAnggota} orang`],
                ["Kelompok rentan", rentan || "Tidak ada"],
                ["Berobat rutin", profil.obatRutin ? `${profil.jumlahObatRutin} orang` : "Tidak"],
                ["Rumah", `${bangunan}${profil.lantaiTinggal ? `, tinggal di lantai ${profil.lantaiTinggal}` : ""}`],
                ["Kendaraan", profil.punyaKendaraan ? "Punya" : "Tidak punya"],
                ["Hewan peliharaan", profil.hewanPeliharaan ? "Ada" : "Tidak ada"],
                ["Persediaan disiapkan untuk", `${profil.persediaanHari} hari`],
                ["Titik kumpul keluarga", profil.titikKumpul?.trim() || "Belum ditentukan"],
              ].map(([k, v]) => (
                <tr key={k} className="border-b border-black/20 align-top">
                  <th scope="row" className="w-[38%] py-1 pr-3 font-semibold">{k}</th>
                  <td className="py-1">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 font-semibold">Kontak darurat keluarga</p>
          {profil.kontakDarurat.length ? (
            <ul className="mt-1 grid grid-cols-2 gap-x-6">
              {profil.kontakDarurat.map((k, i) => <li key={i}>{k.nama}: {k.telepon}</li>)}
            </ul>
          ) : <p className="mt-1">Belum diisi. Tulis di sini: ______________________________</p>}
          {profil.catatanKhusus?.trim() && <p className="mt-2"><span className="font-semibold">Catatan khusus:</span> {profil.catatanKhusus.trim()}</p>}
        </Bagian>

        <Bagian no={++no} judul="Risiko di lokasi ini">
          {rencana.ringkasanRisiko && <p>{rencana.ringkasanRisiko}</p>}
          <p className="mt-2"><span className="font-semibold">Bahaya yang disiapkan:</span> {profil.bahaya.map((h) => HAZARD_BY_ID[h].label).join(", ")}.</p>
          {rencana.faktorKerentanan.length > 0 && (
            <>
              <p className="mt-2 font-semibold">Yang perlu diperhatikan di keluarga ini</p>
              <ul className="mt-1 list-disc pl-5">{rencana.faktorKerentanan.map((f) => <li key={f}>{f}</li>)}</ul>
            </>
          )}
        </Bagian>

        <Bagian no={++no} judul="Nomor penting">
          <ul className="grid grid-cols-2 gap-x-6 gap-y-0.5">
            {nomor.map((k) => <li key={k.nomor}><span className="font-bold tabular-nums">{k.nomor === "1500533" ? "1500-533" : k.nomor}</span> {k.nama}</li>)}
          </ul>
          <p className="mt-2 text-[9.5pt]">Bila 112 tidak tersambung (belum semua daerah punya layanan 112), langsung hubungi 110, 113, 115, atau 119.</p>
        </Bagian>

        <Bagian no={++no} judul="Tindakan per bahaya">
          <p className="text-[9.5pt]">Centang setiap tindakan yang sudah dikerjakan. Tanda &ldquo;Penting&rdquo; = didahulukan.</p>
          {perBahaya.map(({ h, daftar }) => (
            <div key={h} className="dok-bahaya mt-4">
              <h3 className="text-[11.5pt] font-bold">{h === "umum" ? "Semua jenis bencana" : HAZARD_BY_ID[h].label}</h3>
              {FASE.map((f) => {
                const isi = daftar.filter((t) => t.phase === f.id).sort((a, b) => BOBOT[a.priority] - BOBOT[b.priority]);
                if (!isi.length) return null;
                return (
                  <div key={f.id} className="dok-blok mt-1.5">
                    <p className="text-[9.5pt] font-bold uppercase tracking-wide">{f.judul}</p>
                    <ul className="mt-0.5 space-y-1">
                      {isi.map((t) => (
                        <li key={t.actionId} className="flex gap-2">
                          <Kotak isi={Boolean(progres[t.actionId])} />
                          <span>
                            <span className="font-semibold">{t.title}</span>
                            {t.priority === "tinggi" && <span className="ml-1 border border-black px-1 text-[8pt] font-bold uppercase">Penting</span>}
                            {t.detail && <span className="block text-[9.5pt]">{t.detail}</span>}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          ))}
        </Bagian>

        <Bagian no={++no} judul={`Isi Tas Siaga (untuk ${profil.jumlahAnggota} orang, ${profil.persediaanHari} hari)`}>
          <div className="grid grid-cols-2 gap-x-6">
            {tasPerKelompok.map(([kelompok, isi]) => (
              <div key={kelompok} className="dok-blok mt-2">
                <p className="font-bold">{kelompok}</p>
                <ul className="mt-0.5 space-y-0.5">
                  {isi.map((x) => (
                    <li key={x.id} className="flex gap-2">
                      <Kotak isi={Boolean(progres[`tas:${x.id}`])} />
                      <span>{x.nama} <span className="tabular-nums">({x.jumlah} {x.satuan})</span></span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Bagian>

        {aksiIklim.length > 0 && (
          <Bagian no={++no} judul="Persiapan rumah menghadapi iklim">
            <ul className="space-y-1">
              {aksiIklim.map((a) => (
                <li key={a.id} className="flex gap-2">
                  <Kotak isi={Boolean(progres[`iklim:${a.id}`])} />
                  <span><span className="font-semibold">{a.judul}</span>{a.waktu && <span> · {a.waktu}</span>}<span className="block text-[9.5pt]">Mulai dengan: {a.langkahPertama}</span></span>
                </li>
              ))}
            </ul>
          </Bagian>
        )}

        <Bagian no={++no} judul="Diperiksa bersama keluarga">
          <div className="dok-blok grid grid-cols-2 gap-x-6 gap-y-3">
            <p>Tanggal diperiksa: ____________________</p>
            <p>Latihan berikutnya: ____________________</p>
            <p>Penanggung jawab tas siaga: ____________</p>
            <p>Paraf: ____________________</p>
          </div>
          <p className="mt-3 text-[9.5pt]">Periksa isi tas siaga dan tanggal kedaluwarsa obat setiap enam bulan, dan perbarui rencana bila anggota keluarga atau tempat tinggal berubah.</p>
        </Bagian>

        <footer className="mt-6 border-t border-black pt-2 text-[8.5pt] leading-snug">
          {rencana.catatanKeterbatasan && <p>{rencana.catatanKeterbatasan}</p>}
          {sumber.length > 0 && <p className="mt-1"><span className="font-semibold">Sumber panduan:</span> {sumber.map((s) => s.judul).join("; ")}.</p>}
          <p className="mt-1">Disusun dengan SIGAP. Dokumen ini alat bantu kesiapsiagaan, bukan pengganti arahan BNPB, BPBD, BMKG, dan petugas di lokasi.</p>
        </footer>
      </article>
    </div>
  );
}
