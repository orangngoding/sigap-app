"use client";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { ArrowLeft, CheckCircle2, CircleSlash, Wifi, WifiOff, X } from "lucide-react";

const FOKUS = "focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-white";

/** Nama halaman untuk path asal yang dikirim service worker (?dari=). Path di luar daftar tidak disebut namanya. */
const NAMA_HALAMAN: [string, string][] = [
  ["/rencana/kartu", "Kartu Siaga"],
  ["/rencana", "Rencana Siaga"],
  ["/lokasi", "Lokasi"],
  ["/iklim", "Siaga Iklim"],
  ["/latihan", "Simulasi"],
  ["/tanya", "Asisten SIGAP"],
  ["/pustaka/berita", "Berita bencana"],
  ["/pustaka/cuaca", "Berita cuaca dan iklim"],
  ["/pustaka", "Pustaka"],
  ["/data-saya", "Data & privasi"],
  ["/metodologi", "Metodologi"],
];

export function useOnline(): boolean {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener("online", cb);
      window.addEventListener("offline", cb);
      return () => {
        window.removeEventListener("online", cb);
        window.removeEventListener("offline", cb);
      };
    },
    () => navigator.onLine,
    () => true,
  );
}

/** Isi alamat saat halaman dibuka (tidak berubah selama di Mode Darurat). */
function useCari(): string {
  return useSyncExternalStore(
    () => () => {},
    () => window.location.search,
    () => "",
  );
}

/** Halaman asal bila Mode Darurat dibuka karena halaman itu belum tersimpan untuk offline. */
function bacaAsal(cari: string): { dialihkan: boolean; path: string | null; nama: string | null } {
  const p = new URLSearchParams(cari);
  const dialihkan = p.get("offline") === "1";
  const dari = p.get("dari");
  // Hanya path internal sederhana: tidak pernah menautkan ke situs lain.
  const path = dari && /^\/[a-z0-9/-]*$/i.test(dari) && !dari.startsWith("//") && dari !== "/darurat" ? dari : null;
  const nama = path === "/" ? "Beranda" : path ? (NAMA_HALAMAN.find(([awal]) => path === awal || path.startsWith(`${awal}/`))?.[1] ?? null) : null;
  return { dialihkan, path, nama };
}

const TETAP_BISA = [
  "Menelepon 112 dan nomor penting di bawah. Telepon memakai sinyal seluler, bukan internet.",
  "Langkah saat kejadian dan tombol Pandu saya.",
  "Kirim SMS ke keluarga, termasuk koordinat GPS.",
  "Senter, peluit SOS, dan ketukan RJP.",
];
const PERLU_INTERNET = [
  "Cuaca dan peringatan BMKG terbaru.",
  "Peta, berita, dan Asisten SIGAP.",
  "Halaman yang belum pernah dibuka di ponsel ini.",
];

/**
 * Keadaan koneksi di Mode Darurat. Offline: panel besar yang menjelaskan apa yang terjadi, apa yang tetap bisa
 * dipakai, dan apa yang perlu internet. Kembali online: pemberitahuan singkat, dengan tautan ke halaman asal bila
 * pengguna dialihkan ke sini oleh service worker.
 */
export function StatusKoneksi({ online, siapOffline }: { online: boolean; siapOffline: boolean | null }) {
  const asal = bacaAsal(useCari());
  const [sebelumnya, setSebelumnya] = useState(online);
  const [tersambungLagi, setTersambungLagi] = useState(false);
  const [tutup, setTutup] = useState(false);

  // Perubahan koneksi disesuaikan saat render (bukan di effect): offline -> online memunculkan pemberitahuan.
  if (online !== sebelumnya) {
    setSebelumnya(online);
    setTersambungLagi(online);
    setTutup(false);
  }

  // Tanpa halaman asal, pemberitahuan cukup sebentar. Dengan halaman asal, tetap tampil agar jalan kembali terlihat.
  useEffect(() => {
    if (!tersambungLagi || asal.path) return;
    const t = setTimeout(() => setTersambungLagi(false), 8000);
    return () => clearTimeout(t);
  }, [tersambungLagi, asal.path]);

  if (!online) {
    return (
      <section role="status" aria-labelledby="d-offline" className="mt-4 rounded-3xl border-2 border-yellow-300 bg-yellow-300/10 p-4 sm:p-6">
        <h2 id="d-offline" className="flex items-center gap-3 text-2xl font-extrabold text-yellow-300">
          <WifiOff className="size-7 shrink-0" aria-hidden="true" /> Anda sedang offline
        </h2>
        <p className="mt-2 text-lg leading-snug text-white">
          {asal.dialihkan
            ? `${asal.nama ? `Halaman ${asal.nama}` : "Halaman yang Anda buka"} belum tersimpan di ponsel ini, jadi SIGAP membuka Mode Darurat. `
            : "Internet terputus. "}
          {siapOffline === false
            ? "Jangan tutup halaman ini: Mode Darurat belum tersimpan untuk dibuka ulang tanpa internet."
            : "Mode Darurat tersimpan di ponsel dan tetap bisa dipakai."}
        </p>
        <div className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
          <div>
            <h3 className="text-lg font-bold text-emerald-300">Tetap bisa dipakai</h3>
            <ul className="mt-2 space-y-2">
              {TETAP_BISA.map((t) => (
                <li key={t} className="flex gap-2.5 text-base leading-snug text-white">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-300" aria-hidden="true" /> {t}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-bold text-white/85">Perlu internet</h3>
            <ul className="mt-2 space-y-2">
              {PERLU_INTERNET.map((t) => (
                <li key={t} className="flex gap-2.5 text-base leading-snug text-white/85">
                  <CircleSlash className="mt-0.5 size-5 shrink-0 text-white/60" aria-hidden="true" /> {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      {tersambungLagi && !tutup && (
        <section role="status" aria-labelledby="d-online-lagi" className="mt-4 flex flex-wrap items-center gap-3 rounded-3xl border-2 border-emerald-400 bg-emerald-400/10 p-4 sm:p-5">
          <Wifi className="size-7 shrink-0 text-emerald-300" aria-hidden="true" />
          <div className="min-w-48 flex-1">
            <h2 id="d-online-lagi" className="text-xl font-extrabold text-emerald-300">Internet tersambung lagi</h2>
            <p className="text-base leading-snug text-white">Cuaca, peringatan, dan halaman lain bisa dibuka seperti biasa.</p>
          </div>
          {asal.path && (
            <Link href={asal.path} className={`inline-flex min-h-14 items-center gap-2 rounded-2xl bg-emerald-400 px-5 text-lg font-extrabold text-black hover:bg-emerald-300 ${FOKUS}`}>
              <ArrowLeft className="size-5" aria-hidden="true" /> Kembali ke {asal.nama ?? "halaman sebelumnya"}
            </Link>
          )}
          <button type="button" onClick={() => setTutup(true)} aria-label="Tutup pemberitahuan" className={`inline-flex size-14 items-center justify-center rounded-2xl border-2 border-white/50 hover:border-white ${FOKUS}`}>
            <X className="size-6" aria-hidden="true" />
          </button>
        </section>
      )}
      {siapOffline !== null && (
        <p className={`mt-2 inline-flex items-center gap-2 text-base ${siapOffline ? "text-emerald-300" : "text-yellow-200"}`}>
          {siapOffline ? <CheckCircle2 className="size-5 shrink-0" aria-hidden="true" /> : <WifiOff className="size-5 shrink-0" aria-hidden="true" />}
          {siapOffline ? "Tersimpan di ponsel: halaman ini tetap terbuka tanpa internet." : "Belum tersimpan untuk offline. Biarkan halaman ini terbuka sebentar selagi ada internet."}
        </p>
      )}
    </>
  );
}
