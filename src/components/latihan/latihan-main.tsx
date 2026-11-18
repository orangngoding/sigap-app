"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useAngkaHalus } from "@/hooks/use-angka-halus";
import { ArrowRight, CheckCircle2, CircleAlert, ExternalLink, RotateCcw, Trophy, Volume2, VolumeX, XCircle } from "lucide-react";
import { CHUNK_BY_ID } from "@/lib/kb/data";
import { HAZARD_BY_ID } from "@/lib/hazards/hazards";
import { AMBANG_LULUS, cariLangkah, hitungHasil, kunciLatihan, langkahSesudah, type Jawaban } from "@/lib/latihan/mesin";
import { SKENARIO_BY_ID, type Pilihan } from "@/lib/latihan/skenario";
import { useBacakan } from "@/hooks/use-suara";
import { useHydrate } from "@/hooks/use-hydrate";
import { useLatihanStore } from "@/stores/latihan-store";
import { useProgresStore } from "@/stores/progres-store";
import { TombolTanya } from "@/components/tanya/tombol-tanya";

const TOMBOL = "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const TOMBOL_2 = "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-5 text-sm font-semibold hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

const NADA: Record<Pilihan["nilai"], { cls: string; Ikon: typeof CheckCircle2; label: string }> = {
  2: { cls: "border-success-foreground/40 bg-success text-success-foreground", Ikon: CheckCircle2, label: "Tepat" },
  1: { cls: "border-warning-foreground/40 bg-warning text-warning-foreground", Ikon: CircleAlert, label: "Kurang tepat" },
  0: { cls: "border-danger-foreground/40 bg-danger text-danger-foreground", Ikon: XCircle, label: "Berbahaya" },
};

function Sumber({ id }: { id: string }) {
  const c = CHUNK_BY_ID[id];
  if (!c) return null;
  return (
    <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground underline underline-offset-2">
      Sumber: {c.sourceTitle} <ExternalLink className="size-3" aria-hidden="true" /><span className="sr-only">(buka di tab baru)</span>
    </a>
  );
}

/** Satu sesi Latihan Siaga: pilih tindakan, dapat umpan balik bersumber, nilai akhir masuk skor kesiapsiagaan. */
export function LatihanMain({ id }: { id: string }) {
  const s = SKENARIO_BY_ID[id];
  const siap = useHydrate(useLatihanStore, useProgresStore);
  const catat = useLatihanStore((x) => x.catat);
  const setel = useProgresStore((x) => x.setel);
  const terbaik = useLatihanStore((x) => x.hasil[id]?.terbaik);
  const suara = useBacakan();

  const [langkahId, setLangkahId] = useState(s.langkah[0].id);
  const [jawaban, setJawaban] = useState<Jawaban[]>([]);
  const [dipilih, setDipilih] = useState<number | null>(null);
  const [selesai, setSelesai] = useState(false);
  const judulRef = useRef<HTMLHeadingElement>(null);

  const langkah = cariLangkah(s, langkahId)!;
  const nomor = jawaban.length + (dipilih === null ? 1 : 0);
  const hasil = hitungHasil(s, jawaban);
  const label = HAZARD_BY_ID[s.hazard].label;
  const nilaiTampil = useAngkaHalus(selesai ? hasil.persen : 0, { durasi: 1.1, tunda: 0.25 });
  const kemajuan = Math.min(1, (jawaban.length) / s.langkah.length);

  // Fokus ke situasi baru agar pembaca layar dan papan ketik mengikuti alur.
  useEffect(() => { judulRef.current?.focus(); }, [langkahId, selesai]);

  const pilih = (i: number) => {
    if (dipilih !== null) return;
    suara.berhenti();
    setDipilih(i);
    setJawaban((j) => [...j, { langkahId, pilihan: i }]);
  };

  const lanjut = () => {
    if (dipilih === null) return;
    const berikut = langkahSesudah(s, langkahId, dipilih);
    setDipilih(null);
    if (berikut) {
      setLangkahId(berikut);
      return;
    }
    setSelesai(true);
    const akhir = hitungHasil(s, jawaban);
    if (siap) {
      catat(s.id, akhir.persen);
      if (akhir.lulus) setel(kunciLatihan(s.hazard), true);
    }
  };

  const ulangi = () => {
    suara.berhenti();
    setLangkahId(s.langkah[0].id);
    setJawaban([]);
    setDipilih(null);
    setSelesai(false);
  };

  if (selesai) {
    return (
      <section aria-labelledby="judul-hasil" className="space-y-5">
        <div className={`rounded-2xl border p-6 text-center ${hasil.lulus ? "border-success-foreground/30 bg-success" : "border-warning-foreground/30 bg-warning"}`}>
          <motion.div initial={{ scale: 0.4, rotate: -12, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 14 }}>
            <Trophy className={`mx-auto size-10 ${hasil.lulus ? "text-success-foreground" : "text-warning-foreground"}`} aria-hidden="true" />
          </motion.div>
          <h2 id="judul-hasil" ref={judulRef} tabIndex={-1} className="mt-2 text-2xl font-bold text-foreground focus:outline-none">
            Nilai Anda <span className="tabular-nums" aria-hidden="true">{nilaiTampil}</span><span className="sr-only">{hasil.persen}</span>
          </h2>
          <p className="mt-1 text-sm text-foreground">
            {hasil.lulus
              ? `Lulus! Latihan ${label.toLowerCase()} ikut menaikkan skor kesiapsiagaan di Rencana Siaga.`
              : `Butuh minimal ${AMBANG_LULUS} untuk lulus. Baca umpan balik di bawah lalu coba lagi.`}
          </p>
          {terbaik !== undefined && <p className="mt-1 text-xs text-muted-foreground">Nilai terbaik Anda: {terbaik}</p>}
        </div>

        <ol className="space-y-3">
          {jawaban.map((j, i) => {
            const l = cariLangkah(s, j.langkahId)!;
            const p = l.pilihan[j.pilihan];
            const terbaikP = l.pilihan.find((x) => x.nilai === 2)!;
            const n = NADA[p.nilai];
            return (
              <li key={`${j.langkahId}-${i}`} className="rounded-xl border border-border bg-surface p-4 text-sm">
                <p className="text-muted-foreground">{l.situasi}</p>
                <p className="mt-2 flex items-start gap-2 font-semibold"><n.Ikon className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> <span>{n.label}: {p.teks}</span></p>
                {p.nilai < 2 && <p className="mt-1 text-foreground">Yang tepat: {terbaikP.teks}</p>}
              </li>
            );
          })}
        </ol>

        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={ulangi} className={TOMBOL}><RotateCcw className="size-4" aria-hidden="true" /> Ulangi latihan</button>
          <Link href="/latihan" className={TOMBOL_2}>Latihan lain</Link>
          <Link href="/rencana" className={TOMBOL_2}>Lihat skor di Rencana</Link>
        </div>
      </section>
    );
  }

  const p = dipilih !== null ? langkah.pilihan[dipilih] : null;
  const tepat = langkah.pilihan.find((x) => x.nilai === 2)!;

  return (
    <section aria-labelledby="judul-situasi" className="space-y-5">
      <div>
        <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>Keputusan ke-{nomor}</span>
          <span className="tabular-nums" aria-label={`Poin sementara ${hasil.poin}`}>Poin: {hasil.poin}</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
          <motion.div className="h-full rounded-full bg-primary" initial={false} animate={{ width: `${Math.max(4, kemajuan * 100)}%` }} transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }} />
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={langkah.id}
        initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
        transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
        className="rounded-2xl border border-border bg-surface p-5 sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="judul-situasi" ref={judulRef} tabIndex={-1} className="text-lg font-semibold leading-relaxed text-foreground focus:outline-none">
            {langkah.situasi}
          </h2>
          {suara.didukung && (
            <button
              type="button" onClick={() => suara.alih(langkah.id, `${langkah.situasi} Pilihan: ${langkah.pilihan.map((x, i) => `${i + 1}. ${x.teks}`).join(". ")}`)}
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-border hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
              aria-label={suara.sedang === langkah.id ? "Hentikan bacaan" : "Bacakan situasi dan pilihan"}
            >
              {suara.sedang === langkah.id ? <VolumeX className="size-4" aria-hidden="true" /> : <Volume2 className="size-4" aria-hidden="true" />}
            </button>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Apa yang Anda lakukan?</p>

        <ul className="mt-4 space-y-2">
          {langkah.pilihan.map((x, i) => {
            const terpilih = dipilih === i;
            const tampakkan = dipilih !== null && (terpilih || x.nilai === 2);
            return (
              <li key={x.teks}>
                <motion.button
                  animate={terpilih && x.nilai === 0 ? { x: [0, -6, 6, -3, 0] } : { x: 0 }}
                  transition={{ duration: 0.35 }}
                  type="button" onClick={() => pilih(i)} disabled={dipilih !== null} aria-pressed={terpilih}
                  className={`flex min-h-12 w-full items-start gap-3 rounded-xl border p-3 text-left text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-default ${
                    tampakkan ? NADA[x.nilai].cls : dipilih !== null ? "border-border opacity-60" : "border-border bg-background hover:border-primary hover:bg-primary/5"
                  }`}
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-current text-xs font-bold" aria-hidden="true">{String.fromCharCode(65 + i)}</span>
                  <span className="flex-1">{x.teks}</span>
                </motion.button>
              </li>
            );
          })}
        </ul>
      </motion.div>
      </AnimatePresence>

      <div aria-live="polite">
        {p && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
            className={`rounded-2xl border p-5 ${NADA[p.nilai].cls}`}
          >
            <p className="flex items-center gap-2 font-bold">
              {(() => { const I = NADA[p.nilai].Ikon; return <I className="size-5" aria-hidden="true" />; })()} {NADA[p.nilai].label}
            </p>
            <p className="mt-2 text-sm text-foreground">{p.umpanBalik}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Sumber id={p.sumber} />
              <TombolTanya label="Kenapa begitu?" pertanyaan={`Dalam latihan siaga ${label.toLowerCase()}, situasinya: "${langkah.situasi}" Mengapa tindakan "${tepat.teks}" paling tepat, dan apa yang perlu diperhatikan keluarga?`} />
            </div>
          </motion.div>
        )}
      </div>

      {p && (
        <button type="button" onClick={lanjut} className={TOMBOL}>
          {langkahSesudah(s, langkahId, dipilih!) ? "Lanjut" : "Lihat hasil"} <ArrowRight className="size-4" aria-hidden="true" />
        </button>
      )}
    </section>
  );
}
