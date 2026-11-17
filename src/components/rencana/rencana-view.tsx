"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Loader2, MapPin, Pencil, Printer, RefreshCw, Sparkles, UserRound } from "lucide-react";
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
  const contoh = useSearchParams().get("contoh") === "1";
  const siap = useHydrate(useLokasiStore, useProfilStore, useProgresStore, useRencanaStore);

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

  const hasil = useMemo(
    () => hitungSkor(bangunButir(rencana?.tindakan ?? [], tas), progres),
    [rencana?.tindakan, tas, progres],
  );
  
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

      <header>
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Rencana Siaga</h1>
        <p className="mt-2 flex items-start gap-2 text-muted-foreground">
          <MapPin className="mt-1 size-4 shrink-0 text-primary" aria-hidden="true" />
          <span>{lokasi.kelurahan}, Kec. {lokasi.kecamatan}, {lokasi.kabKota}, {lokasi.provinsi}</span>
        </p>
        <ul className="mt-4 flex flex-wrap gap-2" aria-label="Bahaya terpilih">
          {profil.bahaya.map((id) => (
            <li key={id} className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-sm font-medium">
              <span className={`size-2.5 rounded-full bg-current ${HAZARD_BY_ID[id].colorClass}`} aria-hidden="true" />
              {HAZARD_BY_ID[id].label}
            </li>
          ))}
        </ul>
        {!contoh && (
          <Link href="/rencana/profil" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-semibold hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
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

      {rencana && (
        <section aria-labelledby="judul-ringkasan" className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="judul-ringkasan" className="text-lg font-bold text-foreground">Ringkasan untuk keluarga Anda</h2>
            <LabelAi mode={rencana.mode} />
          </div>
          <p className="mt-3 leading-relaxed text-foreground">{rencana.ringkasanRisiko}</p>
        </section>
      )}

      <SkorPanel hasil={hasil} catatan="Skor dihitung dari tindakan Sebelum, tindakan Saat, dan Tas Siaga. Panduan Sesudah tidak dihitung." />

      {faktor.length > 0 && (
        <section aria-labelledby="judul-faktor" className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <h2 id="judul-faktor" className="text-lg font-bold text-foreground">Hal yang perlu diperhatikan</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {faktor.map((f) => (
              <li key={f} className="rounded-full bg-muted px-3 py-1.5 text-sm font-medium text-foreground">{f}</li>
            ))}
          </ul>
        </section>
      )}

      {rencana && (
        <TindakanDaftar tindakan={rencana.tindakan} hazardUrut={[...profil.bahaya, "umum"]} progres={progres} onToggle={toggle} />
      )}

      {rencana && rencana.rekomendasiEdukasi.length > 0 && (
        <section aria-labelledby="judul-bacaan" className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <h2 id="judul-bacaan" className="flex items-center gap-2 text-lg font-bold text-foreground">
            <BookOpen className="size-5 text-primary" aria-hidden="true" /> Bacaan untuk Anda
          </h2>
          <ul className="mt-3 space-y-2">
            {rencana.rekomendasiEdukasi.filter((slug) => ARTIKEL_BY_SLUG[slug]).map((slug) => (
              <li key={slug}>
                <Link href={`/pustaka/${slug}`} className="block rounded-lg border border-border px-4 py-3 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                  <span className="font-semibold text-foreground">{ARTIKEL_BY_SLUG[slug].title}</span>
                  <span className="block text-sm text-muted-foreground">{ARTIKEL_BY_SLUG[slug].ringkasan}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <TasSiaga tas={tas} progres={progres} onToggle={toggle} />
      {!contoh && (
        <Link href="/rencana/kartu" className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          <Printer className="size-4" aria-hidden="true" /> Cetak Kartu Siaga
        </Link>
      )}
      {rencana && <p className="text-sm text-muted-foreground">{rencana.catatanKeterbatasan}</p>}
      <DisclaimerBox />
    </div>
  );
}
