"use client";
import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Download, Phone, Wifi, WifiOff } from "lucide-react";
import { useHydrate } from "@/hooks/use-hydrate";
import { HAZARDS } from "@/lib/hazards/hazards";
import { isHazardAktif } from "@/lib/hazards/pack-status";
import { langkahDaruratBahaya } from "@/lib/darurat/langkah";
import { SEMUA_CHUNK } from "@/lib/kb/data";
import kontak from "@/generated/kontak.json";
import { useProfilStore } from "@/stores/profil-store";
import { finalisasiProfil } from "@/lib/preparedness/profil-schema";
import type { HazardId } from "@/types";

const FOKUS = "focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-white";

function useOnline(): boolean {
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

interface PromptPasang extends Event {
  prompt: () => Promise<void>;
}

/**
 * Mode Darurat (Blueprint 8.2): kontras tinggi, tanpa animasi, huruf 18-20 px, sasaran sentuh 56 px.
 * Langkah berasal dari KB yang ikut terkemas di aplikasi, jadi tetap tampil tanpa rencana dan tanpa internet.
 */
export function DaruratView() {
  const siap = useHydrate(useProfilStore);
  const draft = useProfilStore((s) => s.profil);
  const profil = useMemo(() => finalisasiProfil(draft), [draft]);
  const online = useOnline();
  const [dipilih, setDipilih] = useState<HazardId | null>(null);
  const [pasang, setPasang] = useState<PromptPasang | null>(null);

  useEffect(() => {
    const tangkap = (e: Event) => {
      e.preventDefault();
      setPasang(e as PromptPasang);
    };
    window.addEventListener("beforeinstallprompt", tangkap);
    return () => window.removeEventListener("beforeinstallprompt", tangkap);
  }, []);

  // Bahaya terpilih di profil tampil lebih dulu (Blueprint 8.2); bahaya "segera" tidak punya langkah.
  const urutan = useMemo(() => {
    const milik = new Set<HazardId>(draft.bahaya);
    return HAZARDS.filter((h) => isHazardAktif(h.id)).sort((a, b) => Number(milik.has(b.id)) - Number(milik.has(a.id)));
  }, [draft.bahaya]);
  const aktif = dipilih ?? urutan[0]?.id ?? null;
  const paket = useMemo(() => (aktif ? langkahDaruratBahaya(SEMUA_CHUNK, aktif) : null), [aktif]);

  // Nomor penting dan langkah tidak menunggu penyimpanan lokal: keduanya sudah ada di HTML sehingga tetap terbaca
  // walau JavaScript belum termuat saat offline. Hanya blok "Keluarga saya" yang menunggu data perangkat.
  const kerabat = profil?.kontakDarurat ?? draft.kontakDarurat;
  const titik = (profil?.titikKumpul ?? draft.titikKumpul)?.trim();

  return (
    <div className="min-h-screen bg-black p-4 text-[19px] leading-snug text-white">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-3xl font-extrabold">Mode Darurat</h1>
        <p role="status" className="inline-flex items-center gap-2 rounded-full border-2 border-white px-3 py-1 text-base font-bold">
          {online ? <Wifi className="size-5" aria-hidden="true" /> : <WifiOff className="size-5" aria-hidden="true" />}
          {online ? "Online" : "Offline"}
        </p>
      </div>
      <p className="mt-1">Tetap tenang. Lindungi diri dulu, lalu hubungi bantuan.</p>

      {/* Blok 1: nomor penting */}
      <section aria-labelledby="d-nomor" className="mt-5">
        <h2 id="d-nomor" className="sr-only">Nomor penting</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {kontak.kontak.map((k) => (
            <li key={k.nomor}>
              <a href={`tel:${k.nomor}`} className={`flex min-h-14 items-center gap-3 rounded-xl border-2 border-white bg-yellow-300 px-4 text-xl font-extrabold text-black ${FOKUS}`}>
                <Phone className="size-6" aria-hidden="true" /> {k.nomor} <span className="text-base font-semibold">{k.nama}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      {/* Blok 2: pilih bahaya */}
      <section aria-labelledby="d-bahaya" className="mt-7">
        <h2 id="d-bahaya" className="text-2xl font-bold">Apa yang terjadi?</h2>
        <div role="group" aria-label="Pilih bahaya" className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {urutan.map((h) => (
            <button
              key={h.id}
              type="button"
              aria-pressed={aktif === h.id}
              onClick={() => setDipilih(h.id)}
              className={`min-h-14 rounded-xl border-2 border-white px-3 py-2 text-lg font-bold ${FOKUS} ${aktif === h.id ? "bg-white text-black" : "bg-black text-white"}`}
            >
              {aktif === h.id ? "✓ " : ""}{h.label}
            </button>
          ))}
        </div>
        {urutan.length < HAZARDS.length && (
          <p className="mt-2 text-base">Bahaya lain tampil di sini setelah panduannya siap (Segera hadir).</p>
        )}
      </section>

      {/* Blok 3: langkah */}
      {paket && aktif && (
        <section aria-labelledby="d-langkah" className="mt-6">
          <h2 id="d-langkah" className="text-2xl font-bold">Saat kejadian: {HAZARDS.find((h) => h.id === aktif)?.label}</h2>
          <ol className="mt-3 space-y-2">
            {paket.saat.map((l, i) => (
              <li key={l.id} className="rounded-xl border-2 border-white p-3 text-xl font-bold">{i + 1}. {l.teks}{l.turunan ? " *" : ""}</li>
            ))}
          </ol>
          {[...paket.saat, ...paket.sesudah].some((l) => l.turunan) && (
            <p className="mt-3 text-base">* Turunan dari panduan banjir umum. Belum ada panduan resmi khusus untuk bahaya ini; ikuti arahan petugas.</p>
          )}
          {paket.sesudah.length > 0 && (
            <>
              <h3 className="mt-5 text-xl font-bold">Sesudah kejadian</h3>
              <ol className="mt-2 space-y-2">
                {paket.sesudah.map((l, i) => (
                  <li key={l.id} className="rounded-xl border border-white p-3">{i + 1}. {l.teks}{l.turunan ? " *" : ""}</li>
                ))}
              </ol>
            </>
          )}
        </section>
      )}

      {/* Blok 4: keluarga saya */}
      <section aria-labelledby="d-keluarga" className="mt-8 rounded-xl border-2 border-white p-4">
        <h2 id="d-keluarga" className="text-2xl font-bold">Keluarga saya</h2>
        {!siap ? <p className="mt-2">Memuat data keluarga dari perangkat ini…</p> : titik ? <p className="mt-2"><strong>Titik kumpul:</strong> {titik}</p> : <p className="mt-2">Titik kumpul belum diisi.</p>}
        {kerabat.length > 0 && (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {kerabat.map((k, i) => (
              <li key={i}>
                <a href={`tel:${k.telepon.replace(/[^\d+]/g, "")}`} className={`flex min-h-14 items-center gap-3 rounded-xl border-2 border-white px-4 text-xl font-bold ${FOKUS}`}>
                  <Phone className="size-6" aria-hidden="true" /> {k.nama} <span className="text-base">{k.telepon}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3">
          <Link href="/rencana/kartu" className="underline">Buka Kartu Siaga</Link>
          {" · "}
          <Link href="/rencana/profil" className="underline">Isi atau ubah profil</Link>
        </p>
      </section>

      {/* Pasang di layar utama */}
      <section aria-labelledby="d-pasang" className="mt-6">
        <h2 id="d-pasang" className="text-xl font-bold">Pasang di layar utama</h2>
        {pasang ? (
          <button type="button" onClick={() => void pasang.prompt()} className={`mt-2 inline-flex min-h-14 items-center gap-2 rounded-xl border-2 border-white px-4 text-lg font-bold ${FOKUS}`}>
            <Download className="size-5" aria-hidden="true" /> Pasang SIGAP
          </button>
        ) : (
          <p className="mt-1 text-base">Android Chrome: menu titik tiga lalu &ldquo;Tambahkan ke layar utama&rdquo;. iPhone Safari: tombol Bagikan lalu &ldquo;Tambah ke Layar Utama&rdquo;.</p>
        )}
      </section>

      <p className="mt-6 text-base">Versi panduan {kontak.diperbarui}. Panduan ini bukan pengganti arahan BNPB, BPBD, dan BMKG. Ikuti petugas di lokasi.</p>
    </div>
  );
}
