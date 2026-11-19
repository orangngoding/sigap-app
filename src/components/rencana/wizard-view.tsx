"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Save } from "lucide-react";
import type { ErrorMap, LangkahWizard } from "@/types/rencana";
import { StepIndicator } from "@/components/global/step-indicator";
import { StatusBanner } from "@/components/global/status-banner";
import { StorageBanner } from "@/components/global/storage-banner";
import { useHydrate } from "@/hooks/use-hydrate";
import { profilLengkap, validasiLangkah } from "@/lib/preparedness/profil-schema";
import { useLokasiStore } from "@/stores/lokasi-store";
import { useProfilStore } from "@/stores/profil-store";
import { fieldId } from "./form-kit";
import { LangkahBahaya } from "./langkah-bahaya";
import { LangkahKeluarga } from "./langkah-keluarga";
import { LangkahRumah } from "./langkah-rumah";
import { RingkasanProfil } from "./ringkasan-profil";

const JUDUL = ["Bahaya", "Keluarga", "Rumah dan kondisi", "Ringkasan"] as const;

export function WizardView() {
  const siap = useHydrate(useLokasiStore, useProfilStore);
  const lokasi = useLokasiStore((s) => s.lokasi);
  const { profil, langkah, ubah, setLangkah } = useProfilStore();

  // Galat tampil setelah pengguna menekan Lanjut; setelah itu divalidasi ulang tiap perubahan.
  const [tampilGalat, setTampilGalat] = useState(false);
  const judulRef = useRef<HTMLHeadingElement>(null);

  const langkahForm = langkah === 4 ? null : langkah;
  const errors: ErrorMap = useMemo(
    () => (tampilGalat && langkahForm ? validasiLangkah(langkahForm, profil) : {}),
    [tampilGalat, langkahForm, profil],
  );

  // Pindah langkah: fokus ke judul agar pengguna keyboard dan pembaca layar tahu konteks baru.
  // Dijalankan hanya untuk perpindahan langkah oleh pengguna, bukan saat pemulihan data awal.
  const langkahSebelumnya = useRef<LangkahWizard | null>(null);
  useEffect(() => {
    if (!siap) return;
    if (langkahSebelumnya.current === null) { langkahSebelumnya.current = langkah; return; }
    if (langkahSebelumnya.current === langkah) return;
    langkahSebelumnya.current = langkah;
    judulRef.current?.focus();
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [siap, langkah]);

  const pindah = (l: LangkahWizard) => { setTampilGalat(false); setLangkah(l); };

  const lanjut = () => {
    if (!langkahForm) return;
    const galat = validasiLangkah(langkahForm, profil);
    const kunci = Object.keys(galat);
    if (kunci.length > 0) {
      setTampilGalat(true);
      // Fokus ke field pertama yang salah (Blueprint 7.1).
      requestAnimationFrame(() => {
        const els = kunci.map((k) => document.getElementById(fieldId(k))).filter((el): el is HTMLElement => el !== null);
        els.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1)); // urutan tampil
        els[0]?.focus();
      });
      return;
    }
    pindah((langkahForm + 1) as LangkahWizard);
  };

  if (!siap) return <div className="h-64 animate-pulse rounded-2xl bg-muted" aria-busy="true" aria-label="Memuat isian" />;

  return (
    <>
      <StepIndicator current="profil" done={lokasi ? ["lokasi"] : []} />
      <StorageBanner />

      <h1 ref={judulRef} tabIndex={-1} className="mt-4 text-3xl font-bold tracking-tight text-foreground focus:outline-none sm:text-4xl">
        {langkah === 4 ? "Ringkasan profil" : "Profil keluarga"}
      </h1>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {langkah === 4 ? "Langkah terakhir" : `Langkah ${langkah} dari 3: ${JUDUL[langkah - 1]}`}
        </p>
        <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Save className="size-3.5" aria-hidden="true" /> Tersimpan otomatis di perangkat ini
        </p>
      </div>

      {/* Penunjuk langkah wizard (teks + angka; tidak hanya warna) */}
      <ol className="mt-4 grid grid-cols-3 gap-2" aria-label="Langkah profil">
        {JUDUL.slice(0, 3).map((j, i) => {
          const n = (i + 1) as LangkahWizard;
          const aktif = langkah === n;
          return (
            <li key={j}>
              <button type="button" onClick={() => pindah(n)} aria-current={aktif ? "step" : undefined}
                className={`min-h-11 w-full rounded-lg border px-2 text-xs font-semibold sm:text-sm ${aktif ? "border-primary bg-primary/10 text-foreground" : "border-border bg-surface text-muted-foreground hover:bg-muted"} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary`}>
                {n}. {j}
              </button>
            </li>
          );
        })}
      </ol>

      {!lokasi && (
        <div className="mt-4">
          <StatusBanner tone="info" action={<Link href="/lokasi" className="inline-flex min-h-11 items-center font-semibold underline">Pilih lokasi</Link>}>
            Lokasi belum dipilih. Anda tetap bisa mengisi profil, tetapi rencana perlu lokasi.
          </StatusBanner>
        </div>
      )}

      <div className="mt-8 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        {langkah === 1 && <LangkahBahaya profil={profil} ubah={ubah} errors={errors} />}
        {langkah === 2 && <LangkahKeluarga profil={profil} ubah={ubah} errors={errors} />}
        {langkah === 3 && <LangkahRumah profil={profil} ubah={ubah} errors={errors} />}
        {langkah === 4 && <RingkasanProfil profil={profil} lokasi={lokasi} onUbah={pindah} />}
      </div>

      {langkahForm && Object.keys(errors).length > 0 && (
        <p role="alert" className="mt-4 text-sm font-medium text-danger-foreground">
          Ada isian yang perlu diperbaiki. Periksa pesan di bawah kolom yang bertanda.
        </p>
      )}

      {langkah === 4 ? (
        !profilLengkap(profil) && (
          <div className="mt-4"><StatusBanner tone="warning">Beberapa isian belum lengkap. Gunakan tombol Ubah pada bagian terkait.</StatusBanner></div>
        )
      ) : (
        <div className="mt-6 flex items-center justify-between gap-3">
          {langkah > 1 ? (
            <button type="button" onClick={() => pindah((langkah - 1) as LangkahWizard)}
              className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-border bg-surface px-5 text-sm font-semibold hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
              <ArrowLeft className="size-4" aria-hidden="true" /> Kembali
            </button>
          ) : (
            <Link href="/lokasi" className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-border bg-surface px-5 text-sm font-semibold hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
              <ArrowLeft className="size-4" aria-hidden="true" /> Lokasi
            </Link>
          )}
          <button type="button" onClick={lanjut}
            className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            {langkah === 3 ? "Lihat ringkasan" : "Lanjut"} <ArrowRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </>
  );
}
