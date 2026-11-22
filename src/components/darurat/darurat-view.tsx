"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  Ambulance, ChevronDown, Flame, LifeBuoy, MapPin,
  Phone, PlayCircle, ShieldHalf, Siren, Volume2, VolumeX, Wifi, WifiOff, X, type LucideIcon,
} from "lucide-react";
import { IKON_BAHAYA } from "@/lib/hazards/ikon";
import { useBacakan } from "@/hooks/use-suara";
import { useHydrate } from "@/hooks/use-hydrate";
import { HAZARDS } from "@/lib/hazards/hazards";
import { isHazardAktif } from "@/lib/hazards/pack-status";
import { langkahDaruratBahaya, teksLengkap } from "@/lib/darurat/langkah";
import { SEMUA_CHUNK } from "@/lib/kb/data";
import kontak from "@/generated/kontak.json";
import { useProfilStore } from "@/stores/profil-store";
import { finalisasiProfil } from "@/lib/preparedness/profil-schema";
import type { HazardId } from "@/types";
import { AlatDarurat } from "./alat-darurat";
import { PanduanLangkah } from "./panduan-langkah";
import { SituasiKritis } from "./situasi-kritis";
import { KabariKeluarga } from "./kabari-keluarga";
import { InfoMedis } from "./info-medis";
import { StatusKoneksi, useOnline } from "./status-koneksi";
import { useLokasiStore } from "@/stores/lokasi-store";
import { KUNCI_RISIKO, bacaRisikoTersimpan } from "@/hooks/use-risiko-lokasi";
import type { TingkatRisiko } from "@/lib/risiko/nilai";
import { KUNCI_KELUARGA, profilMilikSaya } from "@/lib/keluarga/keluarga";
import { bukaKeluarga } from "@/hooks/use-keluarga";

const FOKUS = "focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-white";

const IKON_NOMOR: Record<string, LucideIcon> = { "110": ShieldHalf, "113": Flame, "115": LifeBuoy, "119": Ambulance };
/** Label singkat agar muat tiga kolom di layar HP; nama lengkap tetap dibacakan pembaca layar. */
const SINGKAT_LAIN: Record<string, string> = { "117": "BNPB", "123": "Listrik PLN", "1500533": "Keracunan BPOM" };

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

/** Ringkasan Profil Risiko tersimpan di perangkat (tetap terbaca offline). */
function useRisikoMentah(): string | null {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener("storage", cb);
      return () => window.removeEventListener("storage", cb);
    },
    () => {
      try {
        return localStorage.getItem(KUNCI_RISIKO);
      } catch {
        return null;
      }
    },
    () => null,
  );
}

/** Profil keluarga pemilik ponsel bila yang sedang dibuka keluarga lain (null = pemilik ponsel sedang aktif). */
function useProfilMilikSaya() {
  const mentah = useSyncExternalStore(
    (cb) => {
      window.addEventListener("storage", cb);
      return () => window.removeEventListener("storage", cb);
    },
    () => {
      try {
        return localStorage.getItem(KUNCI_KELUARGA);
      } catch {
        return null;
      }
    },
    () => null,
  );
  return useMemo(() => {
    if (!mentah) return null;
    try {
      return profilMilikSaya(localStorage);
    } catch {
      return null;
    }
  }, [mentah]);
}

/** Apakah Mode Darurat sudah tersimpan di perangkat untuk dibuka tanpa internet (null = belum diperiksa). */
function useSiapOffline(): boolean | null {
  const [siap, setSiap] = useState<boolean | null>(null);
  useEffect(() => {
    if (typeof caches === "undefined") return;
    let batal = false;
    caches.match("/darurat").then((r) => { if (!batal) setSiap(Boolean(r)); }).catch(() => {});
    return () => { batal = true; };
  }, []);
  return siap;
}

const BOBOT_RISIKO: Record<TingkatRisiko, number> = { tinggi: 3, sedang: 2, rendah: 0, "belum-diketahui": 0 };

/**
 * Mode Darurat (Blueprint 8.2): kontras tinggi, huruf 18-20 px, sasaran sentuh 56 px, animasi seperlunya.
 * Langkah berasal dari KB yang ikut terkemas di aplikasi, jadi tetap tampil tanpa rencana dan tanpa internet.
 */
export function DaruratView() {
  const siap = useHydrate(useProfilStore, useLokasiStore);
  const draft = useProfilStore((s) => s.profil);
  const lokasi = useLokasiStore((s) => s.lokasi);
  // Bila yang sedang dibuka keluarga lain (mis. warga yang didata RT), Mode Darurat tetap memakai keluarga pemilik
  // ponsel: kontak, titik kumpul, DAN urutan bahaya dari profil serta risiko lokasi pemilik ponsel.
  const milikSaya = useProfilMilikSaya();
  const risikoMentah = useRisikoMentah();
  const risiko = milikSaya ? bacaRisikoTersimpan(milikSaya.risikoMentah, milikSaya.titik) : bacaRisikoTersimpan(risikoMentah, siap ? lokasi : null);
  const bahayaProfil = milikSaya ? (milikSaya.bahaya as HazardId[]) : draft.bahaya;
  const siapOffline = useSiapOffline();
  const profil = useMemo(() => finalisasiProfil(draft), [draft]);
  const online = useOnline();
  const [dipilih, setDipilih] = useState<HazardId | null>(null);
  const [panduan, setPanduan] = useState(false);
  const tutupPanduan = useCallback(() => setPanduan(false), []);

  // Bahaya berisiko tinggi di lokasi (Profil Risiko tersimpan) lalu bahaya pilihan profil tampil lebih dulu.
  const tingkatRisiko = useMemo(() => new Map((risiko?.nilai ?? []).map((n) => [n.id, n.tingkat])), [risiko]);
  const urutan = useMemo(() => {
    const milik = new Set<HazardId>(bahayaProfil);
    const bobot = (id: HazardId) => BOBOT_RISIKO[tingkatRisiko.get(id) ?? "belum-diketahui"] + (milik.has(id) ? 1 : 0);
    return HAZARDS.filter((h) => isHazardAktif(h.id)).sort((a, b) => bobot(b.id) - bobot(a.id));
  }, [bahayaProfil, tingkatRisiko]);
  const aktif = dipilih ?? urutan[0]?.id ?? null;
  const paket = useMemo(() => (aktif ? langkahDaruratBahaya(SEMUA_CHUNK, aktif) : null), [aktif]);
  const labelAktif = HAZARDS.find((h) => h.id === aktif)?.label ?? "";

  // Nomor penting dan langkah tidak menunggu penyimpanan lokal: keduanya sudah ada di HTML sehingga tetap terbaca
  // walau JavaScript belum termuat saat offline. Hanya blok "Keluarga saya" yang menunggu data perangkat.
  const kerabat = milikSaya ? milikSaya.kontakDarurat : profil?.kontakDarurat ?? draft.kontakDarurat;
  const titik = milikSaya ? milikSaya.titikKumpul : (profil?.titikKumpul ?? draft.titikKumpul)?.trim();
  const jumlahOrang = milikSaya ? milikSaya.jumlahAnggota : profil?.jumlahAnggota;
  const [utama, ...lain] = kontak.kontak;

  return (
    <div data-mode-darurat className="min-h-screen bg-black px-4 py-6 text-[19px] leading-snug text-white sm:py-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="flex items-center gap-3 text-3xl font-extrabold">
            <Siren className="size-8 text-red-500" aria-hidden="true" /> Mode Darurat
          </h1>
          <div className="flex items-center gap-2">
            <p role="status" className={`inline-flex items-center gap-2 rounded-full border-2 px-3 py-1 text-base font-bold ${online ? "border-emerald-400 text-emerald-300" : "border-yellow-300 text-yellow-300"}`}>
              {online ? <Wifi className="size-5" aria-hidden="true" /> : <WifiOff className="size-5" aria-hidden="true" />}
              {online ? "Online" : "Offline"}
            </p>
            <Link href="/" aria-label="Keluar dari Mode Darurat" className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border-2 border-white/60 px-3 text-base font-bold hover:border-white ${FOKUS}`}>
              <X className="size-5" aria-hidden="true" /> Keluar
            </Link>
          </div>
        </div>
        <p className="mt-1 text-white/85">Tetap tenang. Lindungi diri dulu, lalu hubungi bantuan.</p>
        <StatusKoneksi online={online} siapOffline={siapOffline} />

        {/* Blok 1: nomor penting, 112 paling besar */}
        <section aria-labelledby="d-nomor" className="mt-6 grid gap-3 md:grid-cols-[1.2fr_1fr]">
          <h2 id="d-nomor" className="sr-only">Nomor penting</h2>
          <a href={`tel:${utama.nomor}`} className={`group relative flex min-h-36 items-center gap-5 overflow-hidden rounded-3xl bg-red-600 p-6 text-white shadow-2xl hover:bg-red-500 ${FOKUS}`}>
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
          {/* 112 dikelola tiap kabupaten/kota; per September 2026 baru 198 dari 514 daerah (Kemendagri). */}
          <p className="text-base leading-snug text-white/90 md:col-span-2">
            <strong className="text-yellow-300">Bila 112 tidak tersambung</strong> (belum semua daerah punya layanan 112), langsung telepon 110, 113, 115, atau 119 di atas sesuai keadaannya.
          </p>
          <ul className="grid grid-cols-3 gap-2 md:col-span-2" aria-label="Nomor penting lain">
            {kontak.lainnya.map((k) => (
              <li key={k.nomor}>
                <a href={`tel:${k.nomor}`} aria-label={`${k.nomor === "1500533" ? "1500-533" : k.nomor}, ${k.nama}`} className={`flex h-full min-h-16 flex-col justify-center rounded-2xl border-2 border-white/60 px-3 py-2 hover:border-white ${FOKUS}`}>
                  <span className="text-lg font-black leading-tight sm:text-xl">{k.nomor === "1500533" ? "1500-533" : k.nomor}</span>
                  <span className="text-sm font-semibold leading-tight text-white/80">{SINGKAT_LAIN[k.nomor] ?? k.nama}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        {/* Blok 2: pilih bahaya */}
        <section aria-labelledby="d-bahaya" className="mt-8">
          <h2 id="d-bahaya" className="text-2xl font-bold">Apa yang terjadi?</h2>
          <div role="group" aria-label="Pilih bahaya" className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
            {urutan.map((h) => {
              const Ikon = IKON_BAHAYA[h.id];
              const pilih = aktif === h.id;
              const tinggi = tingkatRisiko.get(h.id) === "tinggi";
              return (
                <button
                  key={h.id} type="button" aria-pressed={pilih} onClick={() => setDipilih(h.id)}
                  className={`flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border-2 px-2 py-3 text-center text-base font-bold leading-tight transition-colors sm:text-lg ${FOKUS} ${pilih ? "border-white bg-white text-black" : "border-white/40 bg-white/5 text-white hover:border-white"}`}
                >
                  <Ikon className="size-8" aria-hidden="true" />
                  {h.label}
                  {tinggi && <span className={`rounded-full px-2 py-0.5 text-xs font-extrabold ${pilih ? "bg-red-600 text-white" : "bg-red-500/90 text-white"}`}>Risiko tinggi di sini</span>}
                </button>
              );
            })}
          </div>
        </section>

        {/* Blok 3: langkah */}
        {paket && aktif && (
          <section aria-labelledby="d-langkah" className="mt-8 rounded-3xl border-2 border-white/80 p-4 sm:p-6">
            <h2 id="d-langkah" className="text-2xl font-bold">Saat {labelAktif.toLowerCase()}</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
              <button type="button" onClick={() => setPanduan(true)} className={`inline-flex min-h-16 items-center justify-center gap-3 rounded-2xl bg-yellow-300 px-5 text-xl font-extrabold text-black hover:bg-yellow-200 ${FOKUS}`}>
                <PlayCircle className="size-7" aria-hidden="true" /> Pandu saya langkah demi langkah
              </button>
              <TombolBacakan id={`darurat-${aktif}`} teks={`Saat kejadian. ${paket.saat.map((l, i) => `${i + 1}. ${teksLengkap(l)}`).join(" ")}`} />
            </div>
            {/* Langkah dikelompokkan menurut keadaan (di dalam bangunan, di mobil, ...) dan bisa dilipat: orang panik langsung
                membuka yang berlaku untuknya tanpa menggulir semua langkah. Semua kelompok tertutup saat halaman dibuka
                atau bahaya diganti, agar pilihan keadaan terlihat sekaligus; "Pandu saya" dan "Bacakan" tetap memuat
                semua langkah. Native <details>: tetap jalan tanpa JavaScript dan tanpa internet. */}
            {paket.kelompok.map((k, ki) => {
              const awal = paket.kelompok.slice(0, ki).reduce((n, x) => n + x.langkah.length, 0);
              const daftar = (
                <ol className="space-y-2" start={awal + 1}>
                  {k.langkah.map((l, i) => (
                    <li key={l.id} className="flex gap-3 rounded-2xl bg-white/10 p-3.5 sm:gap-4 sm:p-4">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-yellow-300 text-base font-black text-black sm:size-10 sm:text-lg" aria-hidden="true">{awal + i + 1}</span>
                      <span className="pt-0.5 sm:pt-1">
                        <span className="block text-lg font-bold leading-snug sm:text-xl">{l.teks}{l.turunan ? " *" : ""}</span>
                        {l.detail && <span className="mt-1 block text-base leading-snug text-white/85 sm:text-lg">{l.detail}</span>}
                      </span>
                    </li>
                  ))}
                </ol>
              );
              if (!k.keadaan) return <div key="umum" className="mt-4">{daftar}</div>;
              return (
                <details key={`${aktif}-${k.keadaan}`} className="group mt-3 rounded-2xl border-2 border-white/25 open:border-yellow-300/70">
                  <summary className={`flex min-h-16 cursor-pointer list-none items-center gap-3 rounded-2xl px-4 py-3 [&::-webkit-details-marker]:hidden ${FOKUS}`}>
                    <span className="flex-1">
                      <span className="block text-lg font-extrabold leading-tight text-yellow-300 sm:text-xl">{k.keadaan}</span>
                      <span className="block text-sm font-semibold text-white/70">{k.langkah.length} langkah</span>
                    </span>
                    <ChevronDown className="size-6 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
                  </summary>
                  <div className="px-3 pb-3 sm:px-4 sm:pb-4">{daftar}</div>
                </details>
              );
            })}
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
                      <span className="font-black text-yellow-300">{i + 1}.</span>
                      <span><span className="font-bold">{l.teks}{l.turunan ? " *" : ""}</span>{l.detail && <span className="block text-base leading-snug text-white/80">{l.detail}</span>}</span>
                    </li>
                  ))}
                </ol>
              </details>
            )}
            <p className="mt-4 text-sm leading-relaxed text-white/75">
              Sumber: {paket.sumber.map((s, i) => <span key={`${s.judul}|${s.url}`}>{i > 0 && "; "}<a href={s.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">{s.judul}</a></span>)}. Ikuti arahan petugas di lokasi.
            </p>
          </section>
        )}

        <SituasiKritis onKabari={() => document.getElementById("d-kabari")?.scrollIntoView({ behavior: "smooth", block: "start" })} />

        <KabariKeluarga kontak={siap ? kerabat : []} titikKumpul={siap ? titik : undefined} jumlahOrang={siap ? jumlahOrang : undefined} />

        <AlatDarurat />

        <InfoMedis />

        {/* Blok 4: keluarga saya */}
        <section aria-labelledby="d-keluarga" className="mt-8 rounded-3xl border-2 border-white/80 p-5 sm:p-6">
          <h2 id="d-keluarga" className="text-2xl font-bold">Keluarga saya</h2>
          {milikSaya && <p className="mt-1 text-base text-white/80">Menampilkan {milikSaya.nama}, bukan keluarga lain yang sedang Anda dampingi.</p>}
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
            {milikSaya ? (
              // Tautan biasa akan membuka data keluarga lain yang sedang aktif: kembali dulu ke keluarga pemilik ponsel.
              <>
                <button type="button" onClick={() => bukaKeluarga(milikSaya.id, "/rencana/kartu")} className="inline-flex min-h-14 items-center underline underline-offset-4">Buka Kartu Siaga</button>
                <button type="button" onClick={() => bukaKeluarga(milikSaya.id, "/rencana/profil")} className="inline-flex min-h-14 items-center underline underline-offset-4">Isi atau ubah profil</button>
              </>
            ) : (
              <>
                <Link href="/rencana/kartu" className="inline-flex min-h-14 items-center underline underline-offset-4">Buka Kartu Siaga</Link>
                <Link href="/rencana/profil" className="inline-flex min-h-14 items-center underline underline-offset-4">Isi atau ubah profil</Link>
              </>
            )}
          </p>
        </section>

        <p className="mt-6 text-base text-white/70">Nomor telepon diperiksa tim pada {new Date(`${kontak.diperbarui}T00:00:00+07:00`).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" })}. Langkah disusun dari panduan BNPB, BPBD, BMKG, dan Kemenkes (sumbernya tertulis di tiap bagian). Panduan ini bukan pengganti arahan petugas; ikuti petugas di lokasi.</p>
      </div>

      {panduan && paket && <PanduanLangkah judul={`Saat ${labelAktif.toLowerCase()}`} langkah={paket.saat.map((l) => ({ teks: l.teks, detail: l.detail, keadaan: l.keadaan }))} onTutup={tutupPanduan} />}
    </div>
  );
}
