"use client";
import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ChevronDown, Clock, Loader2, RefreshCw, Sparkles } from "lucide-react";
import type { ProyeksiResponse } from "@/lib/data/proyeksi";
import type { Lokasi } from "@/types";
import { buatIcsIklim, intervensiById, type HasilUji, type InputRumah } from "@/lib/iklim/ketahanan";
import { fmt, keputusanCadangan, keyakinan, type HasilKeputusan, type OpsiKeputusan, type TingkatYakin } from "@/lib/iklim/keputusan";
import { TombolTanya } from "@/components/tanya/tombol-tanya";
import { TombolMasukRencana } from "./tombol-masuk-rencana";

const BIAYA = { rendah: "Biaya rendah", sedang: "Biaya sedang", tinggi: "Biaya tinggi" } as const;
const RUANG = { tidak: "tanpa lahan", kecil: "lahan kecil", sedang: "perlu lahan", besar: "perlu lahan luas" } as const;
/** "Seberapa kuat dasar saran ini", dalam kata sehari-hari. */
const YAKIN: Record<TingkatYakin, string> = { tinggi: "Dasarnya kuat", sedang: "Dasarnya cukup", rendah: "Dasarnya terbatas" };

const CONTOH_KENDALA = ["Lahan di rumah sempit", "Anggaran saya terbatas", "Saya mengontrak, tidak bisa mengubah bangunan"];

export function waktuMulai(o: OpsiKeputusan): string | null {
  if (!o.mulai) return null;
  return o.mulai.bulanLagi === 0 ? `Bulan ${o.mulai.nama} sudah masuk puncaknya: mulai sekarang.` : `Selesaikan sebelum ${o.mulai.nama} (${o.mulai.bulanLagi} bulan lagi).`;
}

function unduhIcs(opsi: OpsiKeputusan[]) {
  const ics = buatIcsIklim(opsi.map((o) => ({ id: o.id, judul: o.judul, langkahPertama: o.langkahPertama, bulan: o.mulai })));
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "Pengingat-Siaga-Iklim.ics";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

type LokasiAi = Pick<Lokasi, "lat" | "lon" | "kabKota" | "provinsi">;

/**
 * Keadaan Penasihat Keputusan, diangkat ke halaman agar ringkasan di atas dan daftar tindakan selalu sama.
 * Tampilan awal = urutan dari KODE (langsung, juga offline); AI hanya menyesuaikan pilihan dengan kendala pengguna.
 */
export function usePenasihat(p: ProyeksiResponse | undefined, lokasi: LokasiAi | null, input: InputRumah, uji: HasilUji | null) {
  const [kendala, setKendala] = useState("");
  const kunci = JSON.stringify([input, kendala.trim()]);
  const [hasilAi, setHasilAi] = useState<{ kunci: string; hasil: HasilKeputusan; kendala: string } | null>(null);

  const awal = useMemo<HasilKeputusan | null>(
    () => (p && uji ? { mode: "cadangan", dibuatPada: "", ...keputusanCadangan(input, uji, p, new Date(), kendala) } : null),
    [input, uji, p, kendala],
  );
  const cocok = hasilAi && hasilAi.kunci === kunci ? hasilAi : null;
  const tampil = cocok ? cocok.hasil : awal;

  const minta = useMutation<HasilKeputusan, Error, string>({
    mutationFn: async () => {
      if (!lokasi) throw new Error("tanpa lokasi");
      const res = await fetch("/api/keputusan-iklim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lokasi: { lat: lokasi.lat, lon: lokasi.lon, kabKota: lokasi.kabKota, provinsi: lokasi.provinsi }, rumah: { anggota: input.anggota, rentan: input.rentan, litersTersimpan: input.litersTersimpan, atap: input.atap, sumberAir: input.sumberAir, gangguanAir: input.gangguanAir, pernahTergenang: input.pernahTergenang, airDiketahui: input.airDiketahui }, kendala: kendala.trim() || undefined }),
      });
      if (!res.ok) throw new Error(String(res.status));
      return (await res.json()) as HasilKeputusan;
    },
    onSuccess: (hasil, k) => setHasilAi({ kunci: k, hasil, kendala: kendala.trim() }),
  });

  return { kendala, setKendala, kunci, tampil, minta, dariAi: cocok?.hasil.mode === "ai", aiGagalDiServer: cocok !== null && cocok.hasil.mode !== "ai", kendalaAi: cocok?.kendala ?? "" };
}
export type Penasihat = ReturnType<typeof usePenasihat>;

interface Props {
  p: ProyeksiResponse;
  lokasi: LokasiAi;
  input: InputRumah;
  uji: HasilUji;
  ps: Penasihat;
}

function StatusAi({ ps }: { ps: Penasihat }) {
  const { minta, dariAi, aiGagalDiServer, kendalaAi } = ps;
  if (minta.isPending)
    return (
      <div role="status" className="flex items-start gap-3 rounded-xl bg-muted px-4 py-3 text-sm">
        <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
        <p><strong>AI sedang menganalisis.</strong> Membaca hasil uji rumah dan batasan Anda, lalu memilih tindakan yang paling cocok. Biasanya 5-20 detik.</p>
      </div>
    );
  if (minta.isError)
    return (
      <p role="alert" className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-warning px-4 py-3 text-sm text-warning-foreground">
        <span><strong>AI belum bisa dihubungi.</strong> Urutan di bawah tetap dari hitungan di perangkat ini.</span>
        <button type="button" onClick={() => minta.mutate(ps.kunci)} className="inline-flex min-h-11 items-center gap-1 font-semibold underline underline-offset-2"><RefreshCw className="size-4" aria-hidden="true" /> Coba lagi</button>
      </p>
    );
  if (dariAi)
    return (
      <p role="status" className="rounded-xl bg-primary/10 px-4 py-3 text-sm text-foreground">
        <strong>Disesuaikan AI</strong>{kendalaAi ? <> untuk “{kendalaAi}”</> : null}. Pilihan dan angka sudah diperiksa ulang oleh kode.
      </p>
    );
  if (aiGagalDiServer)
    return <p role="status" className="rounded-xl bg-warning px-4 py-3 text-sm text-warning-foreground">AI sedang tidak tersedia, jadi urutan tetap dari hitungan. Batasan sederhana seperti lahan sempit dan anggaran tetap dipertimbangkan.</p>;
  return null;
}

/** Penasihat Keputusan: daftar tindakan (selalu ada); penyesuaian AI dilipat karena hanya perlu bila ada batasan. */
export function PenasihatKeputusan({ p, lokasi, input, uji, ps }: Props) {
  const { kendala, setKendala, tampil, minta, kunci } = ps;
  if (!tampil) return null;

  return (
    <div className="space-y-4">
      <details className="group rounded-2xl border border-border bg-surface" open={minta.isPending || ps.dariAi || undefined}>
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2 text-sm font-semibold text-primary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary">
          <span className="inline-flex items-center gap-2"><Sparkles className="size-4" aria-hidden="true" /> Punya batasan (lahan sempit, anggaran, mengontrak)? Sesuaikan dengan AI</span>
          <ChevronDown className="size-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="border-t border-border p-4">
          <p className="text-sm leading-relaxed text-muted-foreground">AI memilih ulang tiga dari 11 tindakan yang paling cocok dengan batasan Anda dan menjelaskan alasannya. Angka tetap dihitung di perangkat ini.</p>
          <label htmlFor="pk-kendala" className="mt-3 block text-sm font-semibold">Tulis batasan Anda dengan kata sendiri</label>
          <textarea
            id="pk-kendala" name="kendala" rows={2} maxLength={300} value={kendala} onChange={(e) => setKendala(e.target.value)} autoComplete="off"
            placeholder="Contoh: lahan sempit, anggaran terbatas, saya mengontrak…"
            className="mt-1.5 block w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-base focus-visible:outline-2 focus-visible:outline-primary"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {CONTOH_KENDALA.map((c) => (
              <button key={c} type="button" onClick={() => setKendala(c)} aria-pressed={kendala === c} className="min-h-11 rounded-full border border-border px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary aria-pressed:border-primary aria-pressed:text-foreground">{c}</button>
            ))}
          </div>
          <button
            type="button" onClick={() => minta.mutate(kunci)} disabled={minta.isPending}
            className="press mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60 sm:w-auto"
          >
            {minta.isPending ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Sparkles className="size-4" aria-hidden="true" />}
            {minta.isPending ? "Menganalisis…" : "Sesuaikan dengan AI"}
          </button>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Yang dikirim ke AI hanya jawaban tentang rumah, batasan di atas, dan nama kota. Tanpa nama atau kontak.</p>
        </div>
      </details>
      <DaftarTindakan p={p} lokasi={lokasi} input={input} uji={uji} ps={ps} />
    </div>
  );
}

function DaftarTindakan({ p, lokasi, input, uji, ps }: Props) {
  const { tampil, minta, dariAi } = ps;
  if (!tampil) return null;
  return (
      <div className="min-w-0">
        <div aria-live="polite" className="mb-4 empty:hidden"><StatusAi ps={ps} /></div>
        {/* Ringkasan cadangan sama dengan kartu dampak di atas; hanya ringkasan AI yang menambah penjelasan baru. */}
        {dariAi && <p className="mb-5 max-w-3xl text-base leading-relaxed">{tampil.ringkasan}</p>}

        <ol className={`space-y-4 transition-opacity ${minta.isPending ? "opacity-60" : ""}`} aria-busy={minta.isPending}>
          {tampil.opsi.map((o, i) => {
            const y = keyakinan(o.target, p, input);
            // Alasan keyakinan yang sama persis dengan tindakan sebelumnya tidak diulang kata per kata.
            const sama = tampil.opsi.slice(0, i).findIndex((x) => { const yx = keyakinan(x.target, p, input); return yx.tingkat === y.tingkat && yx.alasan === y.alasan; });
            const biaya = intervensiById(o.id)?.kisaranBiaya;
            return (
              <li key={o.id} className="rounded-2xl border border-border bg-surface p-5">
                <div className="flex items-start gap-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground" aria-hidden="true">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-bold leading-snug">{o.judul}</h3>
                    <p className="mt-0.5 text-xs font-medium text-muted-foreground">{BIAYA[o.biaya]}, {RUANG[o.ruang]}</p>
                  </div>
                </div>
                <div className="sm:pl-11">

                    {o.efekAir && (o.efekAir.tutupKini > 0 || o.efekAir.tutup > 0) && (
                      <p className="mt-3 text-sm">
                        <strong>Hasilnya untuk rumah Anda:</strong> air simpanan jadi cukup sekitar {fmt(o.efekAir.hariCukupBaru)} hari
                        {!uji.air.dariPengguna
                          ? ", memenuhi cadangan dasar yang dianjurkan."
                          : o.efekAir.tutupKini > 0
                            ? (o.efekAir.kurangKiniBaru === 0 ? ", jadi kekurangan air saat kemarau bisa tertutup." : `, jadi kekurangan air saat kemarau berkurang dari ${uji.air.kurangKini} menjadi ${o.efekAir.kurangKiniBaru} hari.`)
                            : `, cukup untuk perkiraan 10-25 tahun lagi.`}
                        {uji.air.dariPengguna && o.efekAir.tutupKini > 0 && uji.air.kurangDepan > 0 && <span className="text-muted-foreground"> (10-25 tahun lagi: dari {uji.air.kurangDepan} menjadi {o.efekAir.kurangDepanBaru} hari.)</span>}
                      </p>
                    )}
                    <p className="mt-3 text-sm leading-relaxed"><strong>Kenapa disarankan:</strong> <span className="text-muted-foreground">{o.alasan}</span></p>
                    <p className="mt-2 text-sm leading-relaxed"><strong>{YAKIN[y.tingkat]}:</strong> <span className="text-muted-foreground">{sama >= 0 ? `alasannya sama dengan tindakan ${sama + 1}.` : y.alasan}</span></p>
                    {biaya && <p className="mt-2 text-sm leading-relaxed"><strong>Perkiraan biaya:</strong> <span className="text-muted-foreground">{biaya}.</span></p>}
                    <p className="mt-3 rounded-xl bg-muted px-3 py-2 text-sm"><strong>Bisa dimulai hari ini:</strong> {o.langkahPertama}</p>
                    {waktuMulai(o) && <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-primary"><Clock className="size-4" aria-hidden="true" /> {waktuMulai(o)}</p>}
                    <div className="tanpa-cetak mt-3">
                      <TombolMasukRencana aksi={{ id: o.id, judul: o.judul, langkahPertama: o.langkahPertama, waktu: waktuMulai(o), wilayah: lokasi.kabKota }} onKalender={o.mulai ? () => unduhIcs([o]) : undefined} />
                    </div>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="tanpa-cetak mt-5 flex flex-wrap items-center gap-3">
          <TombolTanya
            label="Tanya Asisten tentang saran ini"
            pertanyaan={`Rumah saya di ${lokasi.kabKota}: kemarau terpanjang pada tahun terburuk diproyeksikan sekitar ${uji.air.kemarauKini} hari${uji.air.dariPengguna ? ` dan air simpanan saya cukup ${fmt(uji.air.hariCukup)} hari` : ""}. Jelaskan dengan bahasa sederhana: bagaimana cara memulai langkah "${tampil.opsi[0]?.judul ?? "adaptasi"}" dengan murah?`}
          />
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Ini bukan pengganti arahan petugas. Angka-angka di sini perkiraan kasar, bukan kepastian. Perkiraan biaya adalah kisaran kasar harga toko daring (November 2026); harga di daerah Anda bisa berbeda.</p>
      </div>
  );
}
