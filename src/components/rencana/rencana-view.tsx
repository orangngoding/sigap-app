"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { Backpack, BookOpen, Check, ChevronRight, Dumbbell, FileText, HardDriveDownload, LayoutDashboard, ListChecks, Share2, Target, Loader2, MapPin, MessageCircleQuestion, Pencil, Printer, RefreshCw, Sparkles, UserRound } from "lucide-react";
import type { Progres } from "@/types/rencana";
import { DisclaimerBox } from "@/components/global/disclaimer-box";
import { StatusBanner } from "@/components/global/status-banner";
import { StepIndicator } from "@/components/global/step-indicator";
import { StorageBanner } from "@/components/global/storage-banner";
import { useHydrate } from "@/hooks/use-hydrate";
import { useSusunRencana } from "@/hooks/use-susun-rencana";
import { ARTIKEL_BY_SLUG } from "@/lib/pustaka/data";
import { bacaRingkasanLokal } from "@/lib/rencana/klien";
import { HAZARD_BY_ID } from "@/lib/hazards/hazards";
import { LOKASI_CONTOH, buatProfilContoh } from "@/lib/preparedness/profil-awal";
import { finalisasiProfil } from "@/lib/preparedness/profil-schema";
import { bangunButir, hitungSkor } from "@/lib/preparedness/skor";
import { SEMUA_CHUNK } from "@/lib/kb/data";
import { anonimkan, hashMasukan } from "@/lib/rencana/hash";
import { bangunRencanaTemplat } from "@/lib/rencana/templat";
import { useRencanaStore } from "@/stores/rencana-store";
import { useLokasiStore } from "@/stores/lokasi-store";
import { useProfilStore } from "@/stores/profil-store";
import { useProgresStore } from "@/stores/progres-store";
import { SkorPanel } from "./skor-panel";
import { TasSiaga } from "./tas-siaga";
import { TindakanDaftar } from "./tindakan-daftar";
import { TombolBagikan } from "./tombol-bagikan";
import { Foto } from "@/components/global/foto";
import { fotoArtikel, fotoBahaya } from "@/lib/gambar";
import { AMBANG_LULUS } from "@/lib/latihan/mesin";
import { SKENARIO } from "@/lib/latihan/skenario";
import { useLatihanStore } from "@/stores/latihan-store";
import { LatihanDaftar } from "@/components/latihan/latihan-daftar";
import { hazardLatihan } from "@/lib/latihan/mesin";
import { useTasStore } from "@/stores/tas-store";

type TabId = "ringkasan" | "tindakan" | "tas" | "latihan" | "bagikan";
const TAB: Array<{ id: TabId; label: string; Ikon: typeof LayoutDashboard }> = [
  { id: "ringkasan", label: "Ringkasan", Ikon: LayoutDashboard },
  { id: "tindakan", label: "Tindakan", Ikon: ListChecks },
  { id: "tas", label: "Tas Siaga", Ikon: Backpack },
  { id: "latihan", label: "Latihan", Ikon: Dumbbell },
  { id: "bagikan", label: "Bagikan", Ikon: Share2 },
];
const tabSah = (x: string | null): x is TabId => TAB.some((t) => t.id === x);

/** Penjaga rute (Blueprint 4.2): arahkan ke langkah yang kurang dengan pesan jelas. */
function LangkahKurang({ ikon, pesan, href, tombol }: { ikon: React.ReactNode; pesan: string; href: string; tombol: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-8 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">{ikon}</div>
      <p className="mx-auto mt-4 max-w-md text-base font-semibold text-foreground">{pesan}</p>
      <Link href={href} className="mt-6 inline-flex min-h-12 items-center justify-center rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
        {tombol}
      </Link>
    </div>
  );
}

function LabelAi({ mode }: { mode: "ai" | "cadangan" | "contoh" }) {
  const teks = mode === "ai" ? "Dibuat dengan bantuan AI dari panduan resmi" : mode === "contoh" ? "Contoh, disusun dari panduan resmi" : "Disusun otomatis dari panduan resmi (tanpa AI)";
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
      <Sparkles className="size-3.5" aria-hidden="true" /> {teks}
    </span>
  );
}

const PESAN_CADANGAN: Record<string, string> = {
  anggaran: "Batas penggunaan AI hari ini tercapai. Rencana disusun dari panduan resmi tanpa AI.",
  default: "Layanan AI sedang tidak tersedia. Rencana disusun dari panduan resmi tanpa AI.",
};

function StatusSusun({ status, alasan, pulihMenit, usang, onSusun, onBatal }: {
  status: ReturnType<typeof useSusunRencana>["status"];
  alasan?: string;
  pulihMenit: number;
  usang: boolean;
  onSusun: () => void;
  onBatal: () => void;
}) {
  const tombol = "inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-semibold hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
  const ulang = (
    <button type="button" onClick={onSusun} className={tombol}>
      <RefreshCw className="size-4" aria-hidden="true" /> Susun ulang
    </button>
  );
  return (
    <div className="space-y-3" aria-live="polite">
      {status === "menyusun" ? (
        <div role="status" className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-surface p-4">
          <Loader2 className="size-5 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
          <span className="flex-1 text-sm font-medium">Menyusun rencana dari panduan resmi. Rencana dasar di bawah sudah bisa dipakai.</span>
          <button type="button" onClick={onBatal} className={tombol}>Batalkan</button>
        </div>
      ) : (
        <>
          {status === "offline" && <StatusBanner tone="offline">Anda sedang offline. Rencana disusun dari panduan resmi yang tersimpan di perangkat.</StatusBanner>}
          {status === "batas" && <StatusBanner tone="warning">Batas penyusunan tercapai. Coba lagi sekitar {Math.max(1, pulihMenit)} menit lagi.</StatusBanner>}
          {status === "gagal" && <StatusBanner tone="warning" action={ulang}>Rencana AI belum berhasil dibuat. Yang tampil disusun dari panduan resmi tanpa AI.</StatusBanner>}
          {status === "selesai" && alasan && <StatusBanner tone="info">{PESAN_CADANGAN[alasan] ?? PESAN_CADANGAN.default}</StatusBanner>}
          {usang && status !== "selesai" && (
            <StatusBanner tone="warning" action={ulang}>Profil atau lokasi berubah sejak rencana ini dibuat. Susun ulang agar sesuai.</StatusBanner>
          )}
          {!usang && status !== "gagal" && <div>{ulang}</div>}
        </>
      )}
    </div>
  );
}

export function RencanaView() {
  const params = useSearchParams();
  const contoh = params.get("contoh") === "1";
  const tabAwal = params.get("tab");
  const [tab, setTab] = useState<TabId>(tabSah(tabAwal) ? tabAwal : "ringkasan");
  const tabRef = useRef<HTMLDivElement>(null);
  // Tab tersimpan di URL (bisa dibagikan dan bertahan saat dimuat ulang) tanpa navigasi ulang.
  const pilihTab = (t: TabId) => {
    setTab(t);
    const u = new URL(window.location.href);
    u.searchParams.set("tab", t);
    window.history.replaceState(null, "", u);
    const atas = tabRef.current?.getBoundingClientRect().top ?? 0;
    if (atas < 64) tabRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const siap = useHydrate(useLokasiStore, useProfilStore, useProgresStore, useRencanaStore, useTasStore, useLatihanStore);

  const lokasiTersimpan = useLokasiStore((s) => s.lokasi);
  const draft = useProfilStore((s) => s.profil);
  const progresTersimpan = useProgresStore((s) => s.progres);
  const toggleTersimpan = useProgresStore((s) => s.toggle);
  const [progresContoh, setProgresContoh] = useState<Progres>({}); // mode contoh tidak menyentuh data pengguna

  const lokasi = contoh ? LOKASI_CONTOH : lokasiTersimpan;
  const profil = useMemo(() => finalisasiProfil(contoh ? buatProfilContoh() : draft), [contoh, draft]);
  const progres = contoh ? progresContoh : progresTersimpan;
  const toggle = (key: string) =>
    contoh
      ? setProgresContoh((p) => {
          const n = { ...p };
          if (n[key]) delete n[key];
          else n[key] = true;
          return n;
        })
      : toggleTersimpan(key);

  const anon = useMemo(() => (profil ? anonimkan(profil) : null), [profil]);
  const tersimpan = useRencanaStore((s) => s.rencana);
  const simpanRencana = useRencanaStore((s) => s.setRencana);
  const sorotan = useMemo(() => (siap && lokasi ? bacaRingkasanLokal(lokasi).sorotan : []), [siap, lokasi]);
  const { status, alasan, pulihMenit, susun, batal } = useSusunRencana(contoh ? null : lokasi, anon);

  // Templat deterministik: dasar tampilan, cadangan, dan satu-satunya sumber pada mode contoh.
  const templat = useMemo(
    () => (anon && lokasi ? bangunRencanaTemplat({ adm4: lokasi.adm4, namaLokasi: lokasi.kelurahan, profil: anon, kb: SEMUA_CHUNK, sorotan }) : null),
    [anon, lokasi, sorotan],
  );
  const hashSekarang = useMemo(() => (anon && lokasi ? hashMasukan(lokasi.adm4, anon) : null), [anon, lokasi]);
  const ada = !contoh && !!tersimpan && !!lokasi && tersimpan.lokasiAdm4 === lokasi.adm4;
  const rencana = contoh ? (templat ? { ...templat, mode: "contoh" as const } : null) : ada ? tersimpan : templat;
  const usang = ada && !!hashSekarang && tersimpan.hashMasukan !== hashSekarang;

  // Kunjungan pertama untuk lokasi ini: simpan templat dulu (halaman Kartu dan Darurat siap offline), lalu minta AI.
  const sudahOtomatis = useRef(false);
  useEffect(() => {
    if (contoh || !siap || !lokasi || !templat || sudahOtomatis.current) return;
    sudahOtomatis.current = true;
    const s = useRencanaStore.getState().rencana;
    if (s && s.lokasiAdm4 === lokasi.adm4) return;
    simpanRencana(templat);
    void susun({ otomatis: true });
  }, [contoh, siap, lokasi, templat, simpanRencana, susun]);

  const tas = useMemo(() => rencana?.tas ?? [], [rencana?.tas]);
  const faktor = rencana?.faktorKerentanan ?? [];

  const latihan = useMemo(() => hazardLatihan(rencana?.tindakan ?? []), [rencana?.tindakan]);
  const hasil = useMemo(
    () => hitungSkor(bangunButir(rencana?.tindakan ?? [], tas, latihan), progres),
    [rencana?.tindakan, tas, latihan, progres],
  );
  const hasilLatihan = useLatihanStore((s) => s.hasil);
  const hitung = useMemo(() => {
    const t = (rencana?.tindakan ?? []).filter((x) => x.phase !== "sesudah");
    return {
      tindakan: t.length,
      tindakanSiap: t.filter((x) => progres[x.actionId]).length,
      tas: tas.length,
      tasSiap: tas.filter((x) => progres["tas:" + x.id]).length,
      latihanLulus: SKENARIO.filter((s) => latihan.includes(s.hazard) && (hasilLatihan[s.id]?.terbaik ?? 0) >= AMBANG_LULUS).length,
    };
  }, [rencana?.tindakan, tas, progres, latihan, hasilLatihan]);
  const kedaluwarsa = useTasStore((s) => s.kedaluwarsa);
  const setKedaluwarsa = useTasStore((s) => s.setKedaluwarsa);
  
  if (!siap) return <div className="h-64 animate-pulse rounded-2xl bg-muted" aria-busy="true" aria-label="Memuat rencana" />;

  if (!contoh && !lokasi) {
    return (
      <>
        <StepIndicator current="rencana" />
        <LangkahKurang ikon={<MapPin className="size-6" aria-hidden="true" />} pesan="Pilih lokasi dulu supaya rencana sesuai tempat Anda." href="/lokasi" tombol="Pilih lokasi" />
      </>
    );
  }
  if (!profil || !lokasi) {
    return (
      <>
        <StepIndicator current="rencana" done={["lokasi"]} />
        <LangkahKurang ikon={<UserRound className="size-6" aria-hidden="true" />} pesan="Lengkapi profil keluarga dulu supaya rencana sesuai kebutuhan Anda." href="/rencana/profil" tombol="Isi profil keluarga" />
      </>
    );
  }

  return (
    <div className="space-y-6">
      <StepIndicator current="rencana" done={["lokasi", "profil"]} />
      <StorageBanner />
      {contoh && (
        <StatusBanner tone="info" action={<Link href="/lokasi" className="font-semibold underline">Gunakan data saya</Link>}>
          Ini contoh, bukan data Anda.
        </StatusBanner>
      )}

      <header className="cetak-polos relative isolate overflow-hidden rounded-3xl bg-ink p-6 text-white shadow-xl shadow-ink/10 sm:p-8">
        <Foto foto={fotoBahaya(profil.bahaya[0] ?? "umum")} hias latar sizes="(min-width: 1024px) 900px, 100vw" className="-z-20" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink via-ink/85 to-ink/40" aria-hidden="true" />
        <p data-masuk className="text-sm font-semibold uppercase tracking-wider text-emerald-300">Rencana Siaga keluarga</p>
        <h1 data-masuk style={{ "--tunda": "60ms" } as React.CSSProperties} className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Rencana Siaga</h1>
        <p className="mt-2 flex items-start gap-2 text-white/80">
          <MapPin className="mt-1 size-4 shrink-0 text-emerald-300" aria-hidden="true" />
          <span>{lokasi.kelurahan}, Kec. {lokasi.kecamatan}, {lokasi.kabKota}, {lokasi.provinsi}</span>
        </p>
        <ul className="mt-5 flex flex-wrap gap-2" aria-label="Bahaya terpilih">
          {profil.bahaya.map((id) => (
            <li key={id} className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm font-medium backdrop-blur">
              {HAZARD_BY_ID[id].label}
            </li>
          ))}
        </ul>
        {!contoh && (
          <Link href="/rencana/profil" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 text-sm font-semibold backdrop-blur hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
            <Pencil className="size-4" aria-hidden="true" /> Ubah profil
          </Link>
        )}
      </header>

      {!contoh && <StatusSusun status={status} alasan={alasan} pulihMenit={pulihMenit} usang={usang} onSusun={() => void susun({ paksa: true })} onBatal={batal} />}
      {sorotan.length > 0 && (
        <StatusBanner tone="warning" action={<Link href="/lokasi" className="font-semibold underline">Lihat data</Link>}>
          <strong>Perhatikan hari ini:</strong> {sorotan.join(" ")}
        </StatusBanner>
      )}

      {/* Navigasi tab: menempel di bawah header agar berpindah bagian tanpa menggulir panjang. */}
      <div ref={tabRef} className="tanpa-cetak sticky top-16 z-30 -mx-4 scroll-mt-16 px-4 py-2 sm:mx-0 sm:px-0">
        <div role="tablist" aria-label="Bagian rencana" className="kaca isolate flex gap-1 overflow-x-auto rounded-2xl border border-border/70 p-1 shadow-sm">
          {TAB.map(({ id, label, Ikon }) => {
            const aktif = tab === id;
            const badge = id === "tindakan" ? `${hitung.tindakanSiap}/${hitung.tindakan}` : id === "tas" ? `${hitung.tasSiap}/${hitung.tas}` : id === "latihan" && latihan.length ? `${hitung.latihanLulus}/${latihan.length}` : null;
            if (id === "latihan" && (contoh || latihan.length === 0)) return null;
            return (
              <button
                key={id} type="button" role="tab" id={`tab-${id}`} aria-selected={aktif} aria-controls={`panel-${id}`} onClick={() => pilihTab(id)}
                className={`relative flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-primary sm:flex-1 sm:justify-center ${aktif ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {aktif && <motion.span layoutId="tab-rencana" className="absolute inset-0 -z-10 rounded-xl bg-primary shadow-sm shadow-primary/30" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                <Ikon className="size-4" aria-hidden="true" /> {label}
                {badge && <span className={`rounded-full px-1.5 text-[11px] tabular-nums ${aktif ? "bg-white/20" : "bg-muted"}`}>{badge}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Ringkasan */}
      <div id="panel-ringkasan" role="tabpanel" aria-labelledby="tab-ringkasan" className={tab === "ringkasan" ? "panel-masuk space-y-6" : "hidden space-y-6 print:block"}>
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <SkorPanel hasil={hasil} tanpaLangkah catatan="Skor dihitung dari tindakan Sebelum, tindakan Saat, Tas Siaga, dan Latihan Siaga yang lulus." />
          <section aria-labelledby="judul-kemajuan" className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <h2 id="judul-kemajuan" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Kemajuan per bagian</h2>
            <ul className="mt-4 space-y-3">
              {[
                { id: "tindakan" as const, label: "Tindakan sebelum dan saat", siap: hitung.tindakanSiap, total: hitung.tindakan, Ikon: ListChecks },
                { id: "tas" as const, label: "Isi tas siaga", siap: hitung.tasSiap, total: hitung.tas, Ikon: Backpack },
                ...(latihan.length && !contoh ? [{ id: "latihan" as const, label: "Latihan Siaga lulus", siap: hitung.latihanLulus, total: latihan.length, Ikon: Dumbbell }] : []),
              ].map((b) => (
                <li key={b.id}>
                  <button type="button" onClick={() => pilihTab(b.id)} className="group w-full rounded-xl p-2 text-left hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary">
                    <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <b.Ikon className="size-4 text-primary" aria-hidden="true" /> {b.label}
                      <span className="ml-auto tabular-nums text-muted-foreground">{b.siap}/{b.total}</span>
                      <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                    </span>
                    <span className="mt-2 block h-2 overflow-hidden rounded-full bg-muted">
                      <motion.span className="block h-full rounded-full bg-gradient-to-r from-primary to-emerald-500" initial={false} animate={{ width: `${b.total ? (b.siap / b.total) * 100 : 0}%` }} transition={{ duration: 0.6 }} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {hasil.langkahBerikutnya && (
              <div className="mt-4 flex items-center gap-3 rounded-xl border border-primary/25 bg-primary/5 p-3">
                <Target className="size-5 shrink-0 text-primary" aria-hidden="true" />
                <p className="min-w-0 flex-1 text-sm"><span className="font-semibold">Langkah berikutnya:</span> {hasil.langkahBerikutnya.judul}</p>
                <button type="button" onClick={() => toggle(hasil.langkahBerikutnya!.key)} className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground hover:bg-primary/90">
                  <Check className="size-3.5" aria-hidden="true" /> Tandai selesai
                </button>
              </div>
            )}
          </section>
        </div>

        {rencana && (
          <section aria-labelledby="judul-ringkasan" className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="judul-ringkasan" className="text-lg font-bold text-foreground">Ringkasan untuk keluarga Anda</h2>
              <LabelAi mode={rencana.mode} />
            </div>
            <p className="mt-3 leading-relaxed text-foreground">{rencana.ringkasanRisiko}</p>
            {faktor.length > 0 && (
              <>
                <h3 className="mt-5 text-sm font-semibold text-foreground">Hal yang perlu diperhatikan</h3>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {faktor.map((f) => <li key={f} className="rounded-full bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-900">{f}</li>)}
                </ul>
              </>
            )}
          </section>
        )}
      </div>

      {/* Tindakan */}
      <div id="panel-tindakan" role="tabpanel" aria-labelledby="tab-tindakan" className={tab === "tindakan" ? "panel-masuk" : "hidden print:mt-8 print:block"}>
        {rencana && <TindakanDaftar tindakan={rencana.tindakan} hazardUrut={[...profil.bahaya, "umum"]} progres={progres} onToggle={toggle} />}
      </div>

      {/* Tas siaga */}
      <div id="panel-tas" role="tabpanel" aria-labelledby="tab-tas" className={tab === "tas" ? "panel-masuk" : "hidden print:mt-8 print:block"}>
        <TasSiaga tas={tas} progres={progres} onToggle={toggle} kedaluwarsa={contoh ? undefined : kedaluwarsa} onKedaluwarsa={contoh ? undefined : setKedaluwarsa} />
      </div>

      {/* Latihan */}
      {latihan.length > 0 && !contoh && (
        <div id="panel-latihan" role="tabpanel" aria-labelledby="tab-latihan" className={tab === "latihan" ? "panel-masuk" : "hidden"}>
          <p className="mb-4 text-sm text-muted-foreground">Uji keputusan Anda dalam simulasi singkat. Latihan yang lulus (nilai 70 ke atas) dihitung dalam skor.</p>
          <LatihanDaftar hanya={latihan} />
        </div>
      )}

      {/* Bagikan dan cetak */}
      <div id="panel-bagikan" role="tabpanel" aria-labelledby="tab-bagikan" className={tab === "bagikan" ? "panel-masuk space-y-6" : "hidden"}>
        <div className="grid gap-4 sm:grid-cols-2">
          {!contoh && (
            <Link href="/rencana/kartu" className="angkat group flex items-start gap-4 rounded-2xl bg-primary p-5 text-primary-foreground shadow-lg shadow-primary/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
              <Printer className="size-6 shrink-0" aria-hidden="true" />
              <span><span className="block font-bold">Buat Kartu Siaga</span><span className="block text-sm text-primary-foreground/80">Satu halaman untuk ditempel di rumah, dengan kode QR ke Mode Darurat.</span></span>
            </Link>
          )}
          <button type="button" onClick={() => window.print()} className="angkat flex items-start gap-4 rounded-2xl border border-border bg-surface p-5 text-left focus-visible:outline-2 focus-visible:outline-primary">
            <FileText className="size-6 shrink-0 text-primary" aria-hidden="true" />
            <span><span className="block font-bold text-foreground">Cetak rencana lengkap</span><span className="block text-sm text-muted-foreground">Semua tindakan dan isi tas siaga, rapi hitam putih.</span></span>
          </button>
          <Link href="/tanya" className="angkat flex items-start gap-4 rounded-2xl border border-border bg-surface p-5 focus-visible:outline-2 focus-visible:outline-primary">
            <MessageCircleQuestion className="size-6 shrink-0 text-primary" aria-hidden="true" />
            <span><span className="block font-bold text-foreground">Tanya Asisten</span><span className="block text-sm text-muted-foreground">Tanyakan apa pun tentang rencana ini.</span></span>
          </Link>
          {!contoh && (
            <Link href="/data-saya" className="angkat flex items-start gap-4 rounded-2xl border border-border bg-surface p-5 focus-visible:outline-2 focus-visible:outline-primary">
              <HardDriveDownload className="size-6 shrink-0 text-primary" aria-hidden="true" />
              <span><span className="block font-bold text-foreground">Cadangkan data</span><span className="block text-sm text-muted-foreground">Pindahkan rencana ke HP lain tanpa akun.</span></span>
            </Link>
          )}
        </div>
        {rencana && !contoh && (
          <div className="flex flex-wrap gap-3">
            <TombolBagikan lokasi={lokasi} bahaya={profil.bahaya} tindakan={rencana.tindakan} tas={tas} titikKumpul={draft.titikKumpul} />
          </div>
        )}
        {rencana && rencana.rekomendasiEdukasi.length > 0 && (
          <section aria-labelledby="judul-bacaan">
            <h2 id="judul-bacaan" className="flex items-center gap-2 text-lg font-bold text-foreground">
              <BookOpen className="size-5 text-primary" aria-hidden="true" /> Bacaan untuk Anda
            </h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {rencana.rekomendasiEdukasi.filter((slug) => ARTIKEL_BY_SLUG[slug]).map((slug) => (
                <li key={slug}>
                  <Link href={`/pustaka/${slug}`} className="angkat group flex h-full gap-3 overflow-hidden rounded-2xl border border-border bg-surface p-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                    <Foto foto={fotoArtikel(slug, ARTIKEL_BY_SLUG[slug].hazards)} hias zoom sizes="96px" className="size-20 shrink-0 rounded-xl" />
                    <span className="min-w-0">
                      <span className="block font-semibold text-foreground group-hover:text-primary">{ARTIKEL_BY_SLUG[slug].title}</span>
                      <span className="line-clamp-2 text-sm text-muted-foreground">{ARTIKEL_BY_SLUG[slug].ringkasan}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {rencana && <p className="text-sm text-muted-foreground">{rencana.catatanKeterbatasan}</p>}
      <DisclaimerBox />
    </div>
  );
}
