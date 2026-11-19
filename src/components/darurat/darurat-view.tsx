"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  Activity, Ambulance, ChevronDown, CloudLightning, Download, Droplets, Flame, LifeBuoy, MapPin, Mountain, MountainSnow,
  Phone, PlayCircle, ShieldHalf, Siren, Sun, Volume2, VolumeX, Waves, Wifi, WifiOff, Wind, type LucideIcon,
} from "lucide-react";
import { useBacakan } from "@/hooks/use-suara";
import { useHydrate } from "@/hooks/use-hydrate";
import { HAZARDS } from "@/lib/hazards/hazards";
import { isHazardAktif } from "@/lib/hazards/pack-status";
import { langkahDaruratBahaya } from "@/lib/darurat/langkah";
import { SEMUA_CHUNK } from "@/lib/kb/data";
import kontak from "@/generated/kontak.json";
import { useProfilStore } from "@/stores/profil-store";
import { finalisasiProfil } from "@/lib/preparedness/profil-schema";
import type { HazardId } from "@/types";
import { AlatDarurat } from "./alat-darurat";
import { PanduanLangkah } from "./panduan-langkah";

const FOKUS = "focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-white";

const IKON_BAHAYA: Record<HazardId, LucideIcon> = {
  banjir: Droplets,
  longsor: Mountain,
  gempa: Activity,
  cuaca_ekstrem: CloudLightning,
  tsunami: Waves,
  kekeringan: Sun,
  karhutla: Flame,
  gunung_api: MountainSnow,
  gelombang_abrasi: Wind,
};
const IKON_NOMOR: Record<string, LucideIcon> = { "110": ShieldHalf, "113": Flame, "115": LifeBuoy, "119": Ambulance };

/** Bacakan langkah darurat: membantu saat tangan sibuk, panik, atau penglihatan terbatas. Tanpa internet. */
function TombolBacakan({ id, teks }: { id: string; teks: string }) {
  const s = useBacakan();
  if (!s.didukung) return null;
  const aktif = s.sedang === id;
  return (
    <button type="button" onClick={() => s.alih(id, teks)} className={`inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 border-white px-4 text-lg font-bold ${FOKUS}`} aria-pressed={aktif}>
      {aktif ? <VolumeX className="size-5" aria-hidden="true" /> : <Volume2 className="size-5" aria-hidden="true" />} {aktif ? "Berhenti" : "Bacakan"}
    </button>
  );
}

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
 * Mode Darurat (Blueprint 8.2): kontras tinggi, huruf 18-20 px, sasaran sentuh 56 px, animasi seperlunya.
 * Langkah berasal dari KB yang ikut terkemas di aplikasi, jadi tetap tampil tanpa rencana dan tanpa internet.
 */
export function DaruratView() {
  const siap = useHydrate(useProfilStore);
  const draft = useProfilStore((s) => s.profil);
  const profil = useMemo(() => finalisasiProfil(draft), [draft]);
  const online = useOnline();
  const [dipilih, setDipilih] = useState<HazardId | null>(null);
  const [pasang, setPasang] = useState<PromptPasang | null>(null);
  const [panduan, setPanduan] = useState(false);
  const tutupPanduan = useCallback(() => setPanduan(false), []);

  useEffect(() => {
    const tangkap = (e: Event) => {
      e.preventDefault();
      setPasang(e as PromptPasang);
    };
    window.addEventListener("beforeinstallprompt", tangkap);
    return () => window.removeEventListener("beforeinstallprompt", tangkap);
  }, []);

  // Bahaya terpilih di profil tampil lebih dulu (Blueprint 8.2).
  const urutan = useMemo(() => {
    const milik = new Set<HazardId>(draft.bahaya);
    return HAZARDS.filter((h) => isHazardAktif(h.id)).sort((a, b) => Number(milik.has(b.id)) - Number(milik.has(a.id)));
  }, [draft.bahaya]);
  const aktif = dipilih ?? urutan[0]?.id ?? null;
  const paket = useMemo(() => (aktif ? langkahDaruratBahaya(SEMUA_CHUNK, aktif) : null), [aktif]);
  const labelAktif = HAZARDS.find((h) => h.id === aktif)?.label ?? "";

  // Nomor penting dan langkah tidak menunggu penyimpanan lokal: keduanya sudah ada di HTML sehingga tetap terbaca
  // walau JavaScript belum termuat saat offline. Hanya blok "Keluarga saya" yang menunggu data perangkat.
  const kerabat = profil?.kontakDarurat ?? draft.kontakDarurat;
  const titik = (profil?.titikKumpul ?? draft.titikKumpul)?.trim();
  const [utama, ...lain] = kontak.kontak;

  return (
    <div className="min-h-screen bg-black px-4 py-6 text-[19px] leading-snug text-white sm:py-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="flex items-center gap-3 text-3xl font-extrabold">
            <Siren className="size-8 text-red-500" aria-hidden="true" /> Mode Darurat
          </h1>
          <p role="status" className={`inline-flex items-center gap-2 rounded-full border-2 px-3 py-1 text-base font-bold ${online ? "border-emerald-400 text-emerald-300" : "border-yellow-300 text-yellow-300"}`}>
            {online ? <Wifi className="size-5" aria-hidden="true" /> : <WifiOff className="size-5" aria-hidden="true" />}
            {online ? "Online" : "Offline: tetap bisa dipakai"}
          </p>
        </div>
        <p className="mt-1 text-white/85">Tetap tenang. Lindungi diri dulu, lalu hubungi bantuan.</p>

        {/* Blok 1: nomor penting, 112 paling besar */}
        <section aria-labelledby="d-nomor" className="mt-6 grid gap-3 md:grid-cols-[1.2fr_1fr]">
          <h2 id="d-nomor" className="sr-only">Nomor penting</h2>
          <a href={`tel:${utama.nomor}`} className={`group relative flex min-h-36 items-center gap-5 overflow-hidden rounded-3xl bg-red-600 p-6 text-white shadow-2xl shadow-red-900/50 hover:bg-red-500 ${FOKUS}`}>
            <span className="relative flex size-20 shrink-0 items-center justify-center rounded-full bg-white text-red-600">
              <span className="absolute inset-0 animate-ping [animation-iteration-count:3]! rounded-full bg-white/50 motion-reduce:animate-none" aria-hidden="true" />
              <Phone className="relative size-9" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-6xl font-black tracking-tight">{utama.nomor}</span>
              <span className="block text-lg font-bold">{utama.nama}: ketuk untuk menelepon</span>
            </span>
          </a>
          <ul className="grid grid-cols-2 gap-3">
            {lain.map((k) => {
              const Ikon = IKON_NOMOR[k.nomor] ?? Phone;
              return (
                <li key={k.nomor}>
                  <a href={`tel:${k.nomor}`} className={`flex h-full min-h-16 flex-col justify-center gap-1 rounded-2xl bg-yellow-300 px-4 py-3 text-black hover:bg-yellow-200 ${FOKUS}`}>
                    <span className="flex items-center gap-2 text-2xl font-black"><Ikon className="size-6" aria-hidden="true" /> {k.nomor}</span>
                    <span className="text-base font-bold leading-tight">{k.nama}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Blok 2: pilih bahaya */}
        <section aria-labelledby="d-bahaya" className="mt-8">
          <h2 id="d-bahaya" className="text-2xl font-bold">Apa yang terjadi?</h2>
          <div role="group" aria-label="Pilih bahaya" className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
            {urutan.map((h) => {
              const Ikon = IKON_BAHAYA[h.id];
              const pilih = aktif === h.id;
              return (
                <button
                  key={h.id} type="button" aria-pressed={pilih} onClick={() => setDipilih(h.id)}
                  className={`flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border-2 px-2 py-3 text-center text-base font-bold leading-tight transition-colors sm:text-lg ${FOKUS} ${pilih ? "border-white bg-white text-black" : "border-white/40 bg-white/5 text-white hover:border-white"}`}
                >
                  <Ikon className="size-8" aria-hidden="true" />
                  {h.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* Blok 3: langkah */}
        {paket && aktif && (
          <section aria-labelledby="d-langkah" className="mt-8 rounded-3xl border-2 border-white/80 p-5 sm:p-6">
            <h2 id="d-langkah" className="text-2xl font-bold">Saat {labelAktif.toLowerCase()}</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
              <button type="button" onClick={() => setPanduan(true)} className={`inline-flex min-h-16 items-center justify-center gap-3 rounded-2xl bg-yellow-300 px-5 text-xl font-extrabold text-black hover:bg-yellow-200 ${FOKUS}`}>
                <PlayCircle className="size-7" aria-hidden="true" /> Pandu saya langkah demi langkah
              </button>
              <TombolBacakan id={`darurat-${aktif}`} teks={`Saat kejadian. ${paket.saat.map((l, i) => `${i + 1}. ${l.teks}`).join(". ")}`} />
            </div>
            <ol className="mt-4 space-y-2">
              {paket.saat.map((l, i) => (
                <li key={l.id} className="flex gap-4 rounded-2xl bg-white/10 p-4 text-xl font-bold">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-yellow-300 text-lg font-black text-black" aria-hidden="true">{i + 1}</span>
                  <span className="pt-1">{l.teks}{l.turunan ? " *" : ""}</span>
                </li>
              ))}
            </ol>
            {[...paket.saat, ...paket.sesudah].some((l) => l.turunan) && (
              <p className="mt-3 text-base text-white/85">* Turunan dari panduan banjir umum. Belum ada panduan resmi khusus untuk bahaya ini; ikuti arahan petugas.</p>
            )}
            {paket.sesudah.length > 0 && (
              <details className="group mt-5 rounded-2xl border border-white/40">
                <summary className={`flex min-h-14 cursor-pointer list-none items-center justify-between gap-2 rounded-2xl px-4 text-xl font-bold ${FOKUS}`}>
                  Sesudah kejadian <ChevronDown className="size-6 transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <ol className="space-y-2 px-4 pb-4">
                  {paket.sesudah.map((l, i) => (
                    <li key={l.id} className="flex gap-3 text-lg">
                      <span className="font-black text-yellow-300">{i + 1}.</span> <span>{l.teks}{l.turunan ? " *" : ""}</span>
                    </li>
                  ))}
                </ol>
              </details>
            )}
          </section>
        )}

        <AlatDarurat />

        {/* Blok 4: keluarga saya */}
        <section aria-labelledby="d-keluarga" className="mt-8 rounded-3xl border-2 border-white/80 p-5 sm:p-6">
          <h2 id="d-keluarga" className="text-2xl font-bold">Keluarga saya</h2>
          <div className="mt-3 flex items-start gap-3 rounded-2xl bg-white/10 p-4">
            <MapPin className="mt-0.5 size-6 shrink-0 text-yellow-300" aria-hidden="true" />
            {!siap ? <p>Memuat data keluarga dari perangkat ini…</p> : titik ? <p><span className="block text-base text-white/80">Titik kumpul</span><strong className="text-2xl">{titik}</strong></p> : <p>Titik kumpul belum diisi.</p>}
          </div>
          {kerabat.length > 0 && (
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {kerabat.map((k, i) => (
                <li key={i}>
                  <a href={`tel:${k.telepon.replace(/[^\d+]/g, "")}`} className={`flex min-h-16 items-center gap-3 rounded-2xl border-2 border-white px-4 text-xl font-bold hover:bg-white/10 ${FOKUS}`}>
                    <Phone className="size-6 text-yellow-300" aria-hidden="true" />
                    <span><span className="block">{k.nama}</span><span className="block text-base font-semibold text-white/80">{k.telepon}</span></span>
                  </a>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-base">
            <Link href="/rencana/kartu" className="inline-flex min-h-14 items-center underline underline-offset-4">Buka Kartu Siaga</Link>
            <Link href="/rencana/profil" className="inline-flex min-h-14 items-center underline underline-offset-4">Isi atau ubah profil</Link>
          </p>
        </section>

        {/* Pasang di layar utama */}
        <section aria-labelledby="d-pasang" className="mt-8">
          <h2 id="d-pasang" className="text-xl font-bold">Pasang di layar utama</h2>
          {pasang ? (
            <button type="button" onClick={() => void pasang.prompt()} className={`mt-2 inline-flex min-h-14 items-center gap-2 rounded-2xl border-2 border-white px-5 text-lg font-bold ${FOKUS}`}>
              <Download className="size-5" aria-hidden="true" /> Pasang SIGAP
            </button>
          ) : (
            <p className="mt-1 text-base text-white/85">Android Chrome: menu titik tiga lalu &ldquo;Tambahkan ke layar utama&rdquo;. iPhone Safari: tombol Bagikan lalu &ldquo;Tambah ke Layar Utama&rdquo;.</p>
          )}
        </section>

        <p className="mt-6 text-base text-white/70">Versi panduan {kontak.diperbarui}. Panduan ini bukan pengganti arahan BNPB, BPBD, dan BMKG. Ikuti petugas di lokasi.</p>
      </div>

      {panduan && paket && <PanduanLangkah judul={`Saat ${labelAktif.toLowerCase()}`} langkah={paket.saat.map((l) => l.teks)} onTutup={tutupPanduan} />}
    </div>
  );
}
