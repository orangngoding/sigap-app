"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useAngkaHalus } from "@/hooks/use-angka-halus";
import {
  ArrowRight, BadgeAlert, CheckCircle2, ChevronDown, CircleAlert, ClipboardCheck, ExternalLink, Forward, HeartPulse, Megaphone, Radio,
  RotateCcw, Share2, ShieldCheck, Timer, Trophy, Users, Volume2, VolumeX, XCircle, type LucideIcon,
} from "lucide-react";
import { CHUNK_BY_ID } from "@/lib/kb/data";
import { HAZARD_BY_ID } from "@/lib/hazards/hazards";
import { AMBANG_LULUS, cariLangkah, hitungHasil, hoaksDikenali, kunciLatihan, langkahSesudah, pelajaranDari, teksBagikanLatihan, type HasilLatihan, type Jawaban } from "@/lib/latihan/mesin";
import { SKENARIO_BY_ID, type Pilihan, type Skenario } from "@/lib/latihan/skenario";
import { AWAL_KESELAMATAN, DETIK_KEPUTUSAN, PESAN, meterKeselamatan, type JenisPesan, type Pesan } from "@/lib/latihan/pesan";
import { useBacakan } from "@/hooks/use-suara";
import { useHydrate } from "@/hooks/use-hydrate";
import { useLatihanStore } from "@/stores/latihan-store";
import { useProgresStore } from "@/stores/progres-store";
import { useRencanaStore } from "@/stores/rencana-store";
import { TombolTanya } from "@/components/tanya/tombol-tanya";

const TOMBOL = "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const TOMBOL_2 = "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-5 text-sm font-semibold hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

const NADA: Record<Pilihan["nilai"], { cls: string; Ikon: typeof CheckCircle2; label: string }> = {
  2: { cls: "border-success-foreground/40 bg-success text-success-foreground", Ikon: CheckCircle2, label: "Tepat" },
  1: { cls: "border-warning-foreground/40 bg-warning text-warning-foreground", Ikon: CircleAlert, label: "Kurang tepat" },
  0: { cls: "border-danger-foreground/40 bg-danger text-danger-foreground", Ikon: XCircle, label: "Berbahaya" },
};

const SUMBER_PESAN: Record<JenisPesan, { Ikon: LucideIcon; cls: string; label: string }> = {
  resmi: { Ikon: ShieldCheck, cls: "border-emerald-500/40 bg-emerald-50 dark:bg-emerald-400/10", label: "Sumber resmi" },
  warga: { Ikon: Megaphone, cls: "border-sky-500/30 bg-sky-50 dark:bg-sky-400/10", label: "Pengumuman warga" },
  keluarga: { Ikon: Users, cls: "border-border bg-surface", label: "Keluarga" },
  radio: { Ikon: Radio, cls: "border-violet-500/30 bg-violet-50 dark:bg-violet-400/10", label: "Radio" },
  medsos: { Ikon: Forward, cls: "border-border bg-muted/60", label: "Pesan diteruskan" },
};

/** Status keselamatan keluarga untuk meter dan hasil akhir. */
function statusMeter(m: number) {
  return m >= 80 ? { label: "Keluarga selamat dan siap", warna: "bg-emerald-500" } : m >= 50 ? { label: "Selamat, tetapi ada risiko", warna: "bg-amber-500" } : { label: "Keluarga dalam bahaya", warna: "bg-red-600" };
}

function Sumber({ id }: { id: string }) {
  const c = CHUNK_BY_ID[id];
  if (!c) return null;
  return (
    <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground underline underline-offset-2">
      Sumber: {c.sourceTitle} <ExternalLink className="size-3" aria-hidden="true" /><span className="sr-only">(buka di tab baru)</span>
    </a>
  );
}

/** Satu notifikasi di lini masa ponsel; label hoaks baru tampil setelah pengguna menjawab. */
function Notifikasi({ p, i, terungkap }: { p: Pesan; i: number; terungkap: boolean }) {
  const diam = useReducedMotion();
  const g = SUMBER_PESAN[p.jenis];
  const hoaks = terungkap && p.hoaks;
  return (
    <motion.li
      initial={diam ? false : { opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: diam ? 0 : 0.35 + i * 0.7, duration: 0.3 }}
      className={`rounded-2xl border p-3 ${hoaks ? "border-red-500 bg-red-50 dark:bg-red-500/10" : g.cls}`}
    >
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="flex items-center gap-1.5 font-semibold text-foreground"><g.Ikon className="size-3.5" aria-hidden="true" /> {p.dari}</span>
        <span className="tabular-nums text-muted-foreground">{p.jam}</span>
      </div>
      <p className={`mt-1 text-sm leading-relaxed ${p.jenis === "medsos" ? "italic" : ""} text-foreground`}>{p.teks}</p>
      {hoaks && (
        <p className="mt-2 flex items-start gap-1.5 rounded-xl bg-red-600 px-2.5 py-1.5 text-xs font-medium text-white">
          <BadgeAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" /> <span><strong>Hoaks.</strong> {p.hoaks}</span>
        </p>
      )}
      <span className="sr-only">({g.label})</span>
    </motion.li>
  );
}

/**
 * Hitung mundur per keputusan. Dipasang ulang tiap langkah (key = id langkah); habis = pengingat bahwa ragu
 * membuang waktu, nilai tidak dikurangi.
 */
function HitungMundur() {
  const [mulai] = useState(() => Date.now());
  const [kini, setKini] = useState(mulai);
  useEffect(() => {
    const t = setInterval(() => setKini(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  const sisa = Math.max(0, DETIK_KEPUTUSAN - (kini - mulai) / 1000);
  const habis = sisa <= 0;
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between text-xs">
        <span className={`flex items-center gap-1 font-semibold ${habis ? "text-red-600" : "text-muted-foreground"}`}><Timer className="size-3.5" aria-hidden="true" /> {habis ? "Waktu habis" : "Waktu memutuskan"}</span>
        <span className="tabular-nums text-muted-foreground" aria-hidden="true">{Math.ceil(sisa)} detik</span>
      </div>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <div className={`h-full rounded-full transition-[width] duration-300 ease-linear ${sisa < 8 ? "bg-red-500" : "bg-primary"}`} style={{ width: `${(sisa / DETIK_KEPUTUSAN) * 100}%` }} />
      </div>
      {habis && <p className="mt-2 text-sm text-red-700 dark:text-red-300" role="status">Dalam keadaan nyata, ragu-ragu membuang waktu berharga. Tetap pilih tindakan terbaik.</p>}
    </div>
  );
}

interface PropsLatihan {
  id: string;
  /** Skenario dari luar bank (mis. Simulator Bencana AI); bawaan: skenario bank `id`. */
  skenario?: Skenario;
  /** Pesan notifikasi per langkah untuk skenario dari luar; bawaan: PESAN bank. */
  pesan?: Record<string, Pesan[]>;
  /** Dipanggil sekali saat simulasi selesai (mis. untuk lanjut ke uji akhir). */
  onSelesai?: (hasil: HasilLatihan, jawaban: Jawaban[]) => void;
  /** Isi tambahan di atas layar hasil (mis. ajakan uji akhir), dan sembunyikan tombol ulang. */
  sesudah?: React.ReactNode;
}

/** Sesi Latihan Siaga: situasi datang lewat notifikasi, keputusan berwaktu, akibat terlihat, lalu diterapkan ke rencana. */
export function LatihanMain({ id, skenario, pesan: petaLuar, onSelesai, sesudah }: PropsLatihan) {
  const s = skenario ?? SKENARIO_BY_ID[id];
  const petaPesan = petaLuar ?? PESAN;
  const siap = useHydrate(useLatihanStore, useProgresStore, useRencanaStore);
  const catat = useLatihanStore((x) => x.catat);
  const setel = useProgresStore((x) => x.setel);
  const progres = useProgresStore((x) => x.progres);
  const rencana = useRencanaStore((x) => x.rencana);
  const terbaik = useLatihanStore((x) => x.hasil[id]?.terbaik);
  const suara = useBacakan();

  const [langkahId, setLangkahId] = useState(s.langkah[0].id);
  const [jawaban, setJawaban] = useState<Jawaban[]>([]);
  const [dipilih, setDipilih] = useState<number | null>(null);
  const [selesai, setSelesai] = useState(false);
  const [disalin, setDisalin] = useState(false);
  const judulRef = useRef<HTMLHeadingElement>(null);

  const langkah = cariLangkah(s, langkahId)!;
  const pesan = petaPesan[langkahId] ?? [];
  const nomor = jawaban.length + (dipilih === null ? 1 : 0);
  const hasil = hitungHasil(s, jawaban);
  const label = HAZARD_BY_ID[s.hazard].label;
  const nilaiTampil = useAngkaHalus(selesai ? hasil.persen : 0, { durasi: 1.1, tunda: 0.25 });
  const kemajuan = Math.min(1, jawaban.length / s.langkah.length);
  const meter = meterKeselamatan(jawaban.map((j) => cariLangkah(s, j.langkahId)!.pilihan[j.pilihan].nilai));
  const meterKini = meter.at(-1) ?? AWAL_KESELAMATAN;
  // Awal langkah, untuk mencatat berapa detik dipakai memutuskan (dibaca saat menjawab, bukan saat render).
  const mulaiLangkah = useRef(0);
  useEffect(() => { mulaiLangkah.current = Date.now(); }, [langkahId]);

  const tindakanRencana = useMemo(() => (rencana && rencana.mode !== "contoh" ? rencana.tindakan : []), [rencana]);
  const pelajaran = useMemo(() => (selesai ? pelajaranDari(s, jawaban, tindakanRencana) : []), [selesai, s, jawaban, tindakanRencana]);
  const hoaks = hoaksDikenali(jawaban, s, petaPesan);
  const lambat = jawaban.filter((j) => (j.detik ?? 0) > DETIK_KEPUTUSAN).length;

  // Fokus ke situasi baru agar pembaca layar dan papan ketik mengikuti alur.
  useEffect(() => { judulRef.current?.focus(); }, [langkahId, selesai]);

  const pilih = (i: number) => {
    if (dipilih !== null) return;
    suara.berhenti();
    setDipilih(i);
    setJawaban((j) => [...j, { langkahId, pilihan: i, detik: Math.round((Date.now() - mulaiLangkah.current) / 100) / 10 }]);
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
    onSelesai?.(akhir, jawaban);
  };

  const ulangi = () => {
    suara.berhenti();
    setLangkahId(s.langkah[0].id);
    setJawaban([]);
    setDipilih(null);
    setSelesai(false);
    setDisalin(false);
  };

  const bagikan = async () => {
    const teks = teksBagikanLatihan(s, jawaban);
    if (navigator.share) await navigator.share({ text: teks }).catch(() => {});
    else {
      await navigator.clipboard?.writeText(teks).catch(() => {});
      setDisalin(true);
    }
  };

  if (selesai) {
    const st = statusMeter(meterKini);
    return (
      <section aria-labelledby="judul-hasil" className="space-y-6">
        {sesudah}
        <div className={`rounded-3xl border p-6 text-center ${hasil.lulus ? "border-success-foreground/30 bg-success" : "border-warning-foreground/30 bg-warning"}`}>
          <motion.div initial={{ scale: 0.4, rotate: -12, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 14 }}>
            <Trophy className={`mx-auto size-10 ${hasil.lulus ? "text-success-foreground" : "text-warning-foreground"}`} aria-hidden="true" />
          </motion.div>
          <h2 id="judul-hasil" ref={judulRef} tabIndex={-1} className="mt-2 text-2xl font-bold text-foreground focus:outline-none">
            Nilai Anda <span className="tabular-nums" aria-hidden="true">{nilaiTampil}</span><span className="sr-only">{hasil.persen}</span>
          </h2>
          <p className="mt-1 text-sm text-foreground">
            {hasil.lulus ? `Lulus! Latihan ${label.toLowerCase()} ikut menaikkan skor kesiapsiagaan di Rencana Siaga.` : `Butuh minimal ${AMBANG_LULUS} untuk lulus. Lihat yang perlu diterapkan di bawah, lalu coba lagi.`}
          </p>
          {terbaik !== undefined && <p className="mt-1 text-xs text-muted-foreground">Nilai terbaik Anda: {terbaik}</p>}
        </div>

        <ul className="grid gap-3 sm:grid-cols-3">
          <li className="rounded-2xl border border-border bg-surface p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><HeartPulse className="size-4 text-primary" aria-hidden="true" /> Keselamatan keluarga</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{meterKini}<span className="text-sm text-muted-foreground">/100</span></p>
            <p className="text-sm">{st.label}</p>
          </li>
          <li className="rounded-2xl border border-border bg-surface p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><BadgeAlert className="size-4 text-primary" aria-hidden="true" /> Hoaks</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{hoaks.dikenali}<span className="text-sm text-muted-foreground">/{hoaks.total}</span></p>
            <p className="text-sm">{hoaks.total === 0 ? "Tidak ada hoaks di jalur ini" : hoaks.dikenali === hoaks.total ? "Semua dikenali dan tidak disebarkan" : "Ada yang lolos; selalu cek sumber resmi"}</p>
          </li>
          <li className="rounded-2xl border border-border bg-surface p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><Timer className="size-4 text-primary" aria-hidden="true" /> Kecepatan</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{jawaban.length - lambat}<span className="text-sm text-muted-foreground">/{jawaban.length}</span></p>
            <p className="text-sm">keputusan dalam {DETIK_KEPUTUSAN} detik</p>
          </li>
        </ul>

        <section aria-labelledby="judul-terapkan" className="rounded-3xl border border-primary/30 bg-primary/5 p-5 sm:p-6">
          <h2 id="judul-terapkan" className="flex items-center gap-2 text-lg font-bold"><ClipboardCheck className="size-5 text-primary" aria-hidden="true" /> Terapkan di rumah</h2>
          {pelajaran.length === 0 ? (
            <p className="mt-2 text-sm leading-relaxed">Semua keputusan Anda tepat. Pastikan keluarga juga tahu: bagikan hal yang perlu diingat ke grup keluarga di bawah.</p>
          ) : (
            <>
              <p className="mt-1 text-sm text-muted-foreground">Keputusan yang belum tepat, dan apa yang bisa disiapkan sekarang agar tidak terjadi saat bencana sungguhan.</p>
              <ol className="mt-4 space-y-3">
                {pelajaran.map((p) => {
                  const c = CHUNK_BY_ID[p.terbaik.sumber];
                  return (
                    <li key={p.langkahId} className="rounded-2xl border border-border bg-surface p-4">
                      <p className="text-sm text-muted-foreground">Anda memilih: <span className="text-foreground">{p.dipilih.teks}</span></p>
                      <p className="mt-1 font-semibold">Yang tepat: {p.terbaik.teks}</p>
                      {p.tindakan.length > 0 ? (
                        <ul className="mt-3 space-y-2">
                          {p.tindakan.map((t) => {
                            const sudah = Boolean(progres[t.actionId]);
                            return (
                              <li key={t.actionId} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/60 p-3 text-sm">
                                <span><span className="block text-xs font-semibold text-primary">Di rencana keluarga Anda</span>{t.title}</span>
                                <button type="button" onClick={() => setel(t.actionId, !sudah)} aria-pressed={sudah} className={`press inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold ${sudah ? "bg-success text-success-foreground" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}>
                                  <CheckCircle2 className="size-4" aria-hidden="true" /> {sudah ? "Sudah disiapkan" : "Tandai sudah disiapkan"}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      ) : c ? (
                        <p className="mt-2 text-sm leading-relaxed"><span className="font-semibold">Siapkan dari sekarang:</span> {c.title}. {c.body}</p>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
              {tindakanRencana.length === 0 && (
                <p className="mt-4 text-sm">
                  Belum punya rencana keluarga? <Link href="/lokasi" className="font-semibold text-primary underline underline-offset-2">Susun rencana</Link> agar tindakan ini masuk daftar dan bisa dicentang.
                </p>
              )}
            </>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button type="button" onClick={bagikan} className={TOMBOL_2}><Share2 className="size-4" aria-hidden="true" /> Bagikan yang perlu diingat ke keluarga</button>
            {disalin && <span className="text-sm text-muted-foreground" role="status">Teks disalin, tempel di grup keluarga.</span>}
          </div>
        </section>

        <details className="group rounded-2xl border border-border bg-surface">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 px-4 text-sm font-semibold">
            Tinjau semua keputusan ({jawaban.length}) <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <ol className="space-y-3 border-t border-border p-4">
            {jawaban.map((j, i) => {
              const l = cariLangkah(s, j.langkahId)!;
              const p = l.pilihan[j.pilihan];
              const terbaikP = l.pilihan.find((x) => x.nilai === 2)!;
              const n = NADA[p.nilai];
              return (
                <li key={`${j.langkahId}-${i}`} className="rounded-xl border border-border p-4 text-sm">
                  <p className="text-muted-foreground">{l.situasi}</p>
                  <p className="mt-2 flex items-start gap-2 font-semibold"><n.Ikon className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> <span>{n.label}: {p.teks}</span></p>
                  {p.nilai < 2 && <p className="mt-1 text-foreground">Yang tepat: {terbaikP.teks}</p>}
                </li>
              );
            })}
          </ol>
        </details>

        {sesudah ?? (
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={ulangi} className={TOMBOL}><RotateCcw className="size-4" aria-hidden="true" /> Ulangi latihan</button>
          </div>
        )}
      </section>
    );
  }

  const p = dipilih !== null ? langkah.pilihan[dipilih] : null;
  const tepat = langkah.pilihan.find((x) => x.nilai === 2)!;
  const stMeter = statusMeter(meterKini);

  return (
    <section aria-labelledby="judul-situasi" className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
            <span>Keputusan ke-{nomor}</span>
            <span className="tabular-nums" aria-label={`Poin sementara ${hasil.poin}`}>Poin: {hasil.poin}</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
            <motion.div className="h-full rounded-full bg-primary" initial={false} animate={{ width: `${Math.max(4, kemajuan * 100)}%` }} transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }} />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground"><HeartPulse className="size-4" aria-hidden="true" /> Keselamatan keluarga</span>
            <span className="font-semibold tabular-nums">{meterKini}</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted" role="meter" aria-label={`Keselamatan keluarga: ${stMeter.label}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={meterKini}>
            <motion.div className={`h-full rounded-full ${stMeter.warna}`} initial={false} animate={{ width: `${meterKini}%` }} transition={{ type: "spring", stiffness: 180, damping: 22 }} />
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={langkah.id} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }} className="space-y-4">
          {pesan.length > 0 && (
            <div className="rounded-3xl bg-ink p-3 sm:p-4">
              <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-emerald-300">Notifikasi di ponsel Anda</p>
              <ul className="space-y-2" aria-label="Pesan yang masuk">
                {pesan.map((x, i) => <Notifikasi key={`${langkah.id}-${i}`} p={x} i={i} terungkap={dipilih !== null} />)}
              </ul>
            </div>
          )}

          <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <h2 id="judul-situasi" ref={judulRef} tabIndex={-1} className="text-lg font-semibold leading-relaxed text-foreground focus:outline-none">{langkah.situasi}</h2>
              {suara.didukung && (
                <button
                  type="button" onClick={() => suara.alih(langkah.id, `${pesan.map((x) => `Pesan dari ${x.dari}: ${x.teks}`).join(". ")} ${langkah.situasi} Pilihan: ${langkah.pilihan.map((x, i) => `${i + 1}. ${x.teks}`).join(". ")}`)}
                  className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-border hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
                  aria-label={suara.sedang === langkah.id ? "Hentikan bacaan" : "Bacakan pesan, situasi, dan pilihan"}
                >
                  {suara.sedang === langkah.id ? <VolumeX className="size-4" aria-hidden="true" /> : <Volume2 className="size-4" aria-hidden="true" />}
                </button>
              )}
            </div>

            {dipilih === null && <HitungMundur key={langkah.id} />}
            <p className="mt-3 text-sm text-muted-foreground">Apa yang Anda lakukan?</p>

            <ul className="mt-3 space-y-2">
              {langkah.pilihan.map((x, i) => {
                const terpilih = dipilih === i;
                const tampakkan = dipilih !== null && (terpilih || x.nilai === 2);
                return (
                  <li key={x.teks}>
                    <motion.button
                      animate={terpilih && x.nilai === 0 ? { x: [0, -6, 6, -3, 0] } : { x: 0 }} transition={{ duration: 0.35 }}
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
          </div>
        </motion.div>
      </AnimatePresence>

      <div aria-live="polite">
        {p && (
          <motion.div initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }} className={`rounded-2xl border p-5 ${NADA[p.nilai].cls}`}>
            <p className="flex items-center gap-2 font-bold">
              {(() => { const I = NADA[p.nilai].Ikon; return <I className="size-5" aria-hidden="true" />; })()} {NADA[p.nilai].label}
              <span className="ml-auto text-xs font-semibold tabular-nums">Keselamatan {p.nilai === 2 ? "+15" : p.nilai === 1 ? "-5" : "-20"}</span>
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
