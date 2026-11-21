"use client";
// Kabari keluarga lewat SMS: satu ketuk "Saya selamat" atau "Saya butuh bantuan", lengkap dengan lokasi GPS.
// SMS dipilih karena tetap terkirim saat internet data mati atau jaringan padat sesudah bencana; GPS juga tidak
// butuh internet. Pesan disusun di perangkat dan dikirim oleh pengguna sendiri lewat aplikasi SMS.
import Link from "next/link";
import { useState } from "react";
import { HeartHandshake, Loader2, LocateFixed, MessageSquare, ShieldCheck } from "lucide-react";
import { tautanSms, teksKabar, type JenisKabar, type Posisi } from "@/lib/darurat/situasi";

const FOKUS = "focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-white";

const jamSekarang = () => new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" }).format(new Date()).replace(":", ".");

/** Posisi GPS: untuk SMS tunggu paling lama 10 detik dan terima posisi 5 menit terakhir; gagal = null (pesan tetap dikirim). */
function ambilPosisi(batasMs = 10_000, umurMs = 300_000): Promise<Posisi | null> {
  return new Promise((selesai) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator) || !window.isSecureContext) return selesai(null);
    navigator.geolocation.getCurrentPosition(
      (p) => selesai({ lat: p.coords.latitude, lon: p.coords.longitude, akurasi: p.coords.accuracy }),
      () => selesai(null),
      { enableHighAccuracy: true, timeout: batasMs, maximumAge: umurMs },
    );
  });
}

interface Props {
  kontak: Array<{ nama: string; telepon: string }>;
  titikKumpul?: string;
  jumlahOrang?: number;
}

export function KabariKeluarga({ kontak, titikKumpul, jumlahOrang }: Props) {
  const [menyiapkan, setMenyiapkan] = useState<JenisKabar | null>(null);
  const [siap, setSiap] = useState<{ jenis: JenisKabar; teks: string; adaLokasi: boolean } | null>(null);
  // Koordinat besar untuk dibacakan ke petugas 112 lewat telepon (GPS tetap bekerja tanpa internet).
  const [koordinat, setKoordinat] = useState<Posisi | "mencari" | "gagal" | null>(null);
  const tampilkanKoordinat = async () => {
    setKoordinat("mencari");
    setKoordinat((await ambilPosisi(20_000, 30_000)) ?? "gagal");
  };
  const nomor = kontak.map((k) => k.telepon).filter((t) => t.replace(/\D/g, "").length >= 6);

  const susun = async (jenis: JenisKabar) => {
    setMenyiapkan(jenis);
    const posisi = await ambilPosisi();
    const teks = teksKabar(jenis, { posisi, titikKumpul, jam: jamSekarang(), jumlahOrang });
    setMenyiapkan(null);
    setSiap({ jenis, teks, adaLokasi: Boolean(posisi) });
    // Satu penerima atau tanpa kontak: langsung buka aplikasi SMS. Banyak penerima: tampilkan pilihan (iOS hanya andal satu per satu).
    if (nomor.length <= 1) window.location.href = tautanSms(nomor, teks);
  };

  return (
    <section id="d-kabari" aria-labelledby="d-kabari-judul" className="mt-8 scroll-mt-4 rounded-3xl border-2 border-white/80 p-5 sm:p-6">
      <h2 id="d-kabari-judul" className="text-2xl font-bold">Kabari keluarga</h2>
      <p className="mt-1 text-base text-white/80">Lewat SMS beserta lokasi GPS. SMS tetap terkirim saat internet mati atau jaringan padat, dan GPS bekerja tanpa internet.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={() => void susun("selamat")} disabled={menyiapkan !== null} className={`flex min-h-20 items-center justify-center gap-3 rounded-2xl bg-emerald-500 px-4 text-xl font-extrabold text-black hover:bg-emerald-400 disabled:opacity-60 ${FOKUS}`}>
          {menyiapkan === "selamat" ? <Loader2 className="size-7 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <ShieldCheck className="size-7" aria-hidden="true" />} Saya selamat
        </button>
        <button type="button" onClick={() => void susun("butuh-bantuan")} disabled={menyiapkan !== null} className={`flex min-h-20 items-center justify-center gap-3 rounded-2xl bg-red-600 px-4 text-xl font-extrabold hover:bg-red-500 disabled:opacity-60 ${FOKUS}`}>
          {menyiapkan === "butuh-bantuan" ? <Loader2 className="size-7 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <HeartHandshake className="size-7" aria-hidden="true" />} Saya butuh bantuan
        </button>
      </div>
      {menyiapkan && <p role="status" className="mt-2 text-base text-white/80">Mencari lokasi GPS (paling lama 10 detik)…</p>}

      <div className="mt-3" aria-live="polite">
        {koordinat && typeof koordinat === "object" ? (
          <div className="rounded-2xl border-2 border-white/80 p-4">
            <p className="text-base font-semibold text-white/85">Bacakan ke petugas 112:</p>
            <p className="mt-2 rounded-xl bg-white px-4 py-3 font-mono text-2xl font-bold text-black">{koordinat.lat.toFixed(5)}, {koordinat.lon.toFixed(5)}</p>
            <p className="mt-2 text-base text-white/80">Akurasi sekitar {Math.round(koordinat.akurasi)} meter. Sebutkan juga patokan terdekat.</p>
          </div>
        ) : (
          <button type="button" onClick={() => void tampilkanKoordinat()} disabled={koordinat === "mencari"} className={`inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 border-white px-5 text-lg font-bold disabled:opacity-60 sm:w-auto ${FOKUS}`}>
            {koordinat === "mencari" ? <><Loader2 className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> Mencari lokasi…</> : <><LocateFixed className="size-5 text-yellow-300" aria-hidden="true" /> Tampilkan koordinat untuk petugas</>}
          </button>
        )}
        {koordinat === "gagal" && <p className="mt-2 text-base text-yellow-200">Lokasi belum didapat. Nyalakan GPS (lokasi) di ponsel, beri izin lokasi, lalu coba lagi di tempat terbuka.</p>}
      </div>

      {siap && (
        <div className="mt-4 space-y-3" aria-live="polite">
          <p className="rounded-2xl bg-white px-4 py-3 text-base font-semibold text-black">{siap.teks}</p>
          {!siap.adaLokasi && <p className="text-base text-yellow-200">Lokasi GPS belum didapat; pesan dikirim tanpa lokasi. Sebutkan patokan terdekat bila menelepon.</p>}
          {nomor.length > 1 && (
            <>
              <a href={tautanSms(nomor, siap.teks)} className={`flex min-h-16 items-center justify-center gap-2 rounded-2xl bg-yellow-300 text-xl font-extrabold text-black ${FOKUS}`}>
                <MessageSquare className="size-6" aria-hidden="true" /> Kirim ke semua ({nomor.length} kontak)
              </a>
              <ul className="grid gap-2 sm:grid-cols-2">
                {kontak.map((k, i) => (
                  <li key={`${k.telepon}-${i}`}>
                    <a href={tautanSms([k.telepon], siap.teks)} className={`flex min-h-14 items-center gap-2 rounded-2xl border-2 border-white px-4 text-lg font-bold ${FOKUS}`}>
                      <MessageSquare className="size-5 text-yellow-300" aria-hidden="true" /> {k.nama}
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
          {nomor.length <= 1 && (
            <a href={tautanSms(nomor, siap.teks)} className={`inline-flex min-h-14 items-center gap-2 rounded-2xl border-2 border-white px-5 text-lg font-bold ${FOKUS}`}>
              <MessageSquare className="size-5 text-yellow-300" aria-hidden="true" /> Buka SMS lagi
            </a>
          )}
        </div>
      )}
      {kontak.length === 0 && (
        <p className="mt-3 text-base text-white/80">
          Belum ada kontak keluarga, jadi Anda memilih penerima sendiri di aplikasi SMS.{" "}
          <Link href="/rencana/profil" className="font-bold underline underline-offset-4">Tambahkan kontak</Link> agar pesan langsung terkirim ke keluarga.
        </p>
      )}
    </section>
  );
}
