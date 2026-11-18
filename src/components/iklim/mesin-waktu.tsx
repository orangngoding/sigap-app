"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, animate, motion, useReducedMotion } from "motion/react";
import { ArrowDown, ArrowRight, ArrowUp, CloudRain, Droplets, Flame, Info, MapPin, RefreshCw, Sun, Thermometer, type LucideIcon } from "lucide-react";
import type { IdPeriode, KunciMetrik, ProyeksiResponse } from "@/lib/data/proyeksi";
import type { HasilAdaptasi } from "@/lib/ai/adaptasi";
import { useHydrate } from "@/hooks/use-hydrate";
import { useAngkaHalus } from "@/hooks/use-angka-halus";
import { readCache, writeCache } from "@/lib/storage/safe-storage";
import { useLokasiStore } from "@/stores/lokasi-store";
import { useProfilStore } from "@/stores/profil-store";
import { profilSudahDiisi } from "@/lib/preparedness/profil-awal";
import { snapGrid } from "@/lib/data/iklim-math";
import { FOTO } from "@/lib/gambar";
import { GrafikProyeksi } from "./grafik-proyeksi";
import { KerangkaAdaptasi, RencanaAdaptasi } from "./rencana-adaptasi";

type Tampil<T> = T & { stale?: boolean };
const fmt = (v: number, d = 1) => v.toLocaleString("id-ID", { maximumFractionDigits: d });

const METRIK: Array<{ k: KunciMetrik; label: string; satuan: string; Ikon: LucideIcon; naikBuruk: boolean; desimal: number; ket: (p: ProyeksiResponse) => string }> = [
  { k: "hariSangatPanas", label: "Hari sangat panas", satuan: "hari/tahun", Ikon: Flame, naikBuruk: true, desimal: 1, ket: (p) => `Suhu siang di atas ${fmt(p.ambang.sangatPanasC)}°C (5% hari terpanas tahun 1991-2010)` },
  { k: "suhuMaksRata", label: "Suhu siang rata-rata", satuan: "°C", Ikon: Thermometer, naikBuruk: true, desimal: 1, ket: () => "Rata-rata suhu maksimum harian" },
  { k: "hariPanas", label: `Hari 35°C atau lebih`, satuan: "hari/tahun", Ikon: Sun, naikBuruk: true, desimal: 1, ket: () => "Ambang panas yang mulai berbahaya bagi tubuh" },
  { k: "hujanTahunan", label: "Curah hujan tahunan", satuan: "mm", Ikon: CloudRain, naikBuruk: false, desimal: 0, ket: () => "Total hujan dalam setahun" },
  { k: "hariHujanEkstrem", label: "Hari hujan ekstrem", satuan: "hari/tahun", Ikon: Droplets, naikBuruk: true, desimal: 1, ket: (p) => `Hujan harian di atas ${fmt(p.ambang.hujanEkstremMm, 0)} mm (1% hari hujan terlebat di masa lalu)` },
  { k: "keringTerpanjang", label: "Kemarau terpanjang", satuan: "hari", Ikon: Sun, naikBuruk: true, desimal: 1, ket: () => "Hari berturut-turut tanpa hujan, rata-rata per tahun" },
];

function AngkaDesimal({ nilai, desimal }: { nilai: number; desimal: number }) {
  const n = useAngkaHalus(Math.round(nilai * 10 ** desimal), { durasi: 1.1 }) / 10 ** desimal;
  return (
    <>
      <span aria-hidden="true">{fmt(n, desimal)}</span>
      <span className="sr-only">{fmt(nilai, desimal)}</span>
    </>
  );
}

/** Tahun yang berputar 1991 -> 2050 selama data dihitung (permintaan pertama bisa 15-30 detik). */
function PemutarWaktu() {
  const diam = useReducedMotion();
  const [tahun, setTahun] = useState(1991);
  useEffect(() => {
    if (diam) return;
    const c = animate(1991, 2050, { duration: 4, ease: "easeInOut", repeat: Infinity, repeatType: "reverse", onUpdate: (v) => setTahun(Math.round(v)) });
    return () => c.stop();
  }, [diam]);
  const persen = ((tahun - 1991) / (2050 - 1991)) * 100;
  return (
    <div className="relative overflow-hidden rounded-3xl bg-ink p-8 text-center text-ink-foreground sm:p-12" role="status" aria-live="polite">
      <div className="pointer-events-none absolute inset-0 opacity-40" style={{ background: `radial-gradient(60% 80% at ${persen}% 120%, rgba(251,146,60,.45), transparent 70%)` }} aria-hidden="true" />
      <p className="relative text-sm font-semibold uppercase tracking-widest text-emerald-300">Memutar waktu</p>
      <p className="relative mt-3 font-mono text-6xl font-extrabold tabular-nums text-white sm:text-8xl" aria-hidden="true">{diam ? "2050" : tahun}</p>
      <div className="relative mx-auto mt-6 h-1.5 max-w-md overflow-hidden rounded-full bg-white/10" aria-hidden="true">
        <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-orange-500" style={{ width: `${diam ? 100 : persen}%` }} />
      </div>
      <p className="relative mx-auto mt-6 max-w-lg text-sm leading-relaxed text-ink-muted">
        Menghitung sekitar 43.800 hari data iklim dari dua model iklim global untuk wilayah Anda.
        Pertama kali bisa memakan 15-30 detik; setelah itu tersimpan dan langsung tampil.
      </p>
    </div>
  );
}

function TanpaLokasi() {
  return (
    <div className="grid overflow-hidden rounded-3xl border border-border bg-surface md:grid-cols-2">
      <div className="relative min-h-56">
        <Image src={FOTO.kekeringan.src} alt="" fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
      </div>
      <div className="p-6 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">Langkah pertama</p>
        <h2 className="mt-2 text-2xl font-bold">Pilih lokasi untuk melihat iklim wilayah Anda pada 2050</h2>
        <p className="mt-3 text-muted-foreground">Proyeksi dihitung per grid sekitar 25 km. Lokasi hanya disimpan di perangkat ini; koordinat dibulatkan sebelum dikirim ke penyedia data.</p>
        <Link href="/lokasi" className="press mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          <MapPin className="size-4" aria-hidden="true" /> Pilih lokasi
        </Link>
      </div>
    </div>
  );
}

function LompatanUtama({ p }: { p: ProyeksiResponse }) {
  const dulu = p.periode[0].metrik.hariSangatPanas.rata;
  const depan = p.periode[2].metrik.hariSangatPanas.rata;
  const kali = dulu > 0 ? depan / dulu : null;
  return (
    <div className="cetak-panel cetak-utuh relative overflow-hidden rounded-3xl bg-ink p-6 text-ink-foreground sm:p-10">
      <div className="pointer-events-none absolute -bottom-24 right-0 size-96 rounded-full bg-orange-500/20 blur-3xl" aria-hidden="true" />
      <p className="relative text-sm font-semibold uppercase tracking-wider text-amber-300">Perubahan terbesar di wilayah Anda</p>
      <h2 className="relative mt-2 max-w-2xl text-2xl font-bold text-white sm:text-3xl">Hari sangat panas per tahun</h2>
      <div className="relative mt-6 flex flex-wrap items-end gap-x-6 gap-y-4">
        <div>
          <p className="text-sm text-ink-muted">{p.periode[0].label} ({p.periode[0].awal}-{p.periode[0].akhir})</p>
          <p className="text-5xl font-extrabold tabular-nums text-white/80 sm:text-6xl"><AngkaDesimal nilai={dulu} desimal={0} /></p>
        </div>
        <ArrowRight className="mb-4 size-8 text-amber-300" aria-hidden="true" />
        <div>
          <p className="text-sm text-ink-muted">{p.periode[2].label} ({p.periode[2].awal}-{p.periode[2].akhir})</p>
          <p className="bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-6xl font-extrabold tabular-nums text-transparent sm:text-7xl"><AngkaDesimal nilai={depan} desimal={0} /></p>
        </div>
        {kali !== null && kali >= 1.2 && (
          <p className="mb-3 rounded-full bg-orange-500/20 px-4 py-1.5 text-sm font-bold text-orange-200">sekitar {fmt(kali)} kali lipat</p>
        )}
      </div>
      <p className="relative mt-5 max-w-2xl text-sm leading-relaxed text-ink-muted">
        Hari sangat panas = suhu siang di atas {fmt(p.ambang.sangatPanasC)}°C, yaitu suhu yang pada 1991-2010 hanya terjadi pada 5% hari terpanas.
        Rentang antar-model menuju 2050: {fmt(p.periode[2].metrik.hariSangatPanas.min)}-{fmt(p.periode[2].metrik.hariSangatPanas.maks)} hari.
      </p>
    </div>
  );
}

function KartuMetrik({ p, periode }: { p: ProyeksiResponse; periode: IdPeriode }) {
  const pr = p.periode.find((x) => x.id === periode)!;
  const dulu = p.periode[0];
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {METRIK.map(({ k, label, satuan, Ikon, naikBuruk, desimal, ket }) => {
        const v = pr.metrik[k];
        const beda = Math.round((v.rata - dulu.metrik[k].rata) * 10 ** desimal) / 10 ** desimal;
        const naik = beda > 0;
        const buruk = naik === naikBuruk;
        return (
          <li key={k} className="angkat cetak-utuh rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-sm font-semibold"><Ikon className="size-4 text-primary" aria-hidden="true" /> {label}</p>
              {periode !== "dulu" && beda !== 0 && (
                <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold ${buruk ? "bg-orange-100 text-orange-900 dark:bg-orange-400/15 dark:text-orange-200" : "bg-sky-100 text-sky-900 dark:bg-sky-400/15 dark:text-sky-200"}`}>
                  {naik ? <ArrowUp className="size-3" aria-hidden="true" /> : <ArrowDown className="size-3" aria-hidden="true" />}
                  {naik ? "+" : ""}{fmt(beda, desimal)}<span className="sr-only"> dibanding 1990-an</span>
                </span>
              )}
            </div>
            <p className="mt-3 text-3xl font-extrabold tabular-nums">
              <AngkaDesimal nilai={v.rata} desimal={desimal} /> <span className="text-base font-semibold text-muted-foreground">{satuan}</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Rentang model: {fmt(v.min, desimal)}-{fmt(v.maks, desimal)}</p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{ket(p)}</p>
          </li>
        );
      })}
    </ul>
  );
}

export function MesinWaktuIklim() {
  const siap = useHydrate(useLokasiStore, useProfilStore);
  const lokasi = useLokasiStore((s) => s.lokasi);
  const profil = useProfilStore((s) => s.profil);
  const [periode, setPeriode] = useState<IdPeriode>("2050");

  const grid = lokasi ? `${snapGrid(lokasi.lat)},${snapGrid(lokasi.lon)}` : "";
  const proyeksi = useQuery<Tampil<ProyeksiResponse>>({
    queryKey: ["proyeksi", grid],
    enabled: siap && lokasi !== null,
    staleTime: Infinity,
    retry: 1,
    retryDelay: 4000,
    queryFn: async () => {
      try {
        const res = await fetch(`/api/proyeksi?lat=${lokasi!.lat}&lon=${lokasi!.lon}`);
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as ProyeksiResponse;
        writeCache("proyeksi", grid, data);
        return data;
      } catch (e) {
        const lama = readCache<ProyeksiResponse>("proyeksi", grid);
        if (lama) return { ...lama.data, stale: true };
        throw e;
      }
    },
  });

  const terisi = profilSudahDiisi(profil);
  const konteks = !terisi ? undefined : {
    jumlahAnggota: profil.jumlahAnggota, lansia: profil.lansia, balita: profil.balita, hamil: profil.hamil,
    disabilitas: profil.disabilitas, hewanPeliharaan: profil.hewanPeliharaan, bangunan: profil.bangunan ?? undefined,
  };
  const bahaya = terisi && profil.bahaya.length ? profil.bahaya : undefined;
  const kunciAdaptasi = `${grid}:${JSON.stringify([konteks, bahaya])}`;
  const adaptasi = useQuery<Tampil<HasilAdaptasi>>({
    queryKey: ["adaptasi", kunciAdaptasi],
    enabled: proyeksi.isSuccess && lokasi !== null,
    staleTime: Infinity,
    retry: false,
    queryFn: async () => {
      try {
        const res = await fetch("/api/adaptasi", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ lokasi: { lat: lokasi!.lat, lon: lokasi!.lon, kabKota: lokasi!.kabKota, provinsi: lokasi!.provinsi }, bahaya, konteks }),
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as HasilAdaptasi;
        writeCache("adaptasi", kunciAdaptasi, data);
        return data;
      } catch (e) {
        const lama = readCache<HasilAdaptasi>("adaptasi", kunciAdaptasi);
        if (lama) return { ...lama.data, stale: true };
        throw e;
      }
    },
  });

  if (!siap) return <div className="h-80 animate-pulse rounded-3xl bg-muted" aria-busy="true" />;
  if (!lokasi) return <TanpaLokasi />;
  if (proyeksi.isPending) return <PemutarWaktu />;
  if (proyeksi.isError)
    return (
      <div role="alert" className="rounded-3xl border border-border bg-surface p-6">
        <p className="font-semibold">Data proyeksi iklim belum dapat dimuat.</p>
        <p className="mt-1 text-sm text-muted-foreground">Penyedia data mungkin sedang sibuk. Coba lagi sebentar lagi.</p>
        <button type="button" onClick={() => proyeksi.refetch()} className="press mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold hover:bg-muted">
          <RefreshCw className="size-4" aria-hidden="true" /> Coba lagi
        </button>
      </div>
    );

  const p = proyeksi.data;
  const wilayah = lokasi.kabKota;
  return (
    <div className="space-y-12">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="inline-flex items-center gap-2 text-muted-foreground">
          <MapPin className="size-4 text-primary" aria-hidden="true" />
          {lokasi.kabKota}, {lokasi.provinsi} <span className="text-xs">(grid {fmt(p.grid.lat, 2)}, {fmt(p.grid.lon, 2)})</span>
        </p>
        <Link href="/lokasi" className="font-semibold text-primary underline underline-offset-2">Ganti lokasi</Link>
      </div>
      {p.stale && <p className="rounded-xl bg-warning px-4 py-2 text-sm text-warning-foreground">Menampilkan data tersimpan terakhir karena perangkat sedang offline atau server tidak terjangkau.</p>}

      <LompatanUtama p={p} />

      <section aria-labelledby="judul-periode" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="judul-periode" className="text-2xl font-bold">Putar waktu, bandingkan sendiri</h2>
            <p className="mt-1 text-sm text-muted-foreground">Rata-rata per tahun dalam tiap periode 20 tahun. Panah menunjukkan perubahan dibanding 1990-an.</p>
          </div>
          <div role="tablist" aria-label="Pilih periode" className="tanpa-cetak isolate flex rounded-2xl border border-border bg-muted/60 p-1">
            {p.periode.map((pr) => (
              <button
                key={pr.id} type="button" role="tab" aria-selected={periode === pr.id} onClick={() => setPeriode(pr.id)}
                className={`relative min-h-11 rounded-xl px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-primary ${periode === pr.id ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {periode === pr.id && <motion.span layoutId="periode-iklim" className={`absolute inset-0 -z-10 rounded-xl ${pr.id === "2050" ? "bg-gradient-to-r from-amber-500 to-orange-600" : "bg-primary"}`} transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                {pr.label}
                <span className="block text-[11px] font-medium opacity-80">{pr.awal}-{pr.akhir}</span>
              </button>
            ))}
          </div>
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={periode} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            <KartuMetrik p={p} periode={periode} />
          </motion.div>
        </AnimatePresence>
      </section>

      <section aria-labelledby="judul-grafik" className="space-y-4">
        <h2 id="judul-grafik" className="text-2xl font-bold">Enam puluh tahun dalam satu grafik</h2>
        <GrafikProyeksi data={p} />
      </section>

      <section aria-labelledby="judul-adaptasi" className="space-y-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Rencana adaptasi keluarga</p>
          <h2 id="judul-adaptasi" className="mt-1 text-2xl font-bold">Bersiap untuk iklim {wilayah} menuju 2050</h2>
          {!terisi && (
            <p className="mt-2 text-sm text-muted-foreground">
              Isi profil keluarga di <Link href="/rencana" className="font-semibold text-primary underline underline-offset-2">Rencana</Link> agar langkah disesuaikan dengan lansia, balita, atau jenis rumah Anda.
            </p>
          )}
        </div>
        {adaptasi.isPending ? (
          <KerangkaAdaptasi />
        ) : adaptasi.isError ? (
          <div role="alert" className="rounded-3xl border border-border bg-surface p-6">
            <p className="font-semibold">Rencana adaptasi belum dapat disusun.</p>
            <button type="button" onClick={() => adaptasi.refetch()} className="press mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold hover:bg-muted">
              <RefreshCw className="size-4" aria-hidden="true" /> Coba lagi
            </button>
          </div>
        ) : (
          <RencanaAdaptasi hasil={adaptasi.data} wilayah={wilayah} />
        )}
      </section>

      <aside className="cetak-utuh rounded-3xl border border-border bg-muted/50 p-6 text-sm leading-relaxed" aria-labelledby="judul-catatan">
        <h2 id="judul-catatan" className="flex items-center gap-2 font-bold"><Info className="size-4 text-primary" aria-hidden="true" /> Cara membaca proyeksi ini dengan jujur</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-muted-foreground">
          <li>{p.catatan}</li>
          <li>Model: {p.model.join(" dan ")}. Angka utama adalah rata-rata keduanya; rentang model menunjukkan seberapa besar ketidakpastian.</li>
          <li>Ini bukan prakiraan cuaca dan bukan status resmi. Untuk cuaca dan peringatan hari ini, gunakan BMKG di halaman <Link href="/lokasi" className="font-semibold text-primary underline underline-offset-2">Lokasi</Link>.</li>
          <li>
            Sumber: <a href={p.sumber.url} target="_blank" rel="noreferrer" className="font-semibold text-primary underline underline-offset-2">{p.sumber.nama}</a> ({p.sumber.lisensi}).
            Cara perhitungan ada di <Link href="/metodologi#iklim-2050" className="font-semibold text-primary underline underline-offset-2">Metodologi</Link>.
          </li>
        </ul>
      </aside>
    </div>
  );
}
