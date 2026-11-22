"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import {
  BellRing, BookCheck, Check, ClipboardCheck, Lock, Pause, Play, QrCode, Smartphone, Sparkles, UserX, WifiOff,
  type LucideIcon,
} from "lucide-react";
import { HAZARDS } from "@/lib/hazards/hazards";
import { IKON_BAHAYA } from "@/lib/hazards/ikon";

/** Lama satu slide tampil sebelum pindah otomatis. */
const DURASI = 6000;

const d = (ms: number) => ({ "--d": `${ms}ms` }) as React.CSSProperties;

/** Kerangka isi slide: label kecil, judul, keterangan, lalu visual. */
function Slide({ label, Ikon, judul, isi, children }: { label: string; Ikon: LucideIcon; judul: string; isi: string; children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col">
      <p className="karosel-masuk flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary" style={d(0)}>
        <Ikon className="size-3.5" aria-hidden="true" /> {label}
      </p>
      <h2 className="karosel-masuk mt-1 text-base font-bold leading-snug sm:mt-2 sm:text-xl tracking-tight text-foreground" style={d(80)}>{judul}</h2>
      <p className="karosel-masuk mt-1 line-clamp-2 text-[13px] leading-snug text-muted-foreground sm:mt-1.5 sm:line-clamp-none sm:text-sm sm:leading-relaxed" style={d(160)}>{isi}</p>
      <div className="flex flex-1 flex-col justify-center pt-3 sm:pt-5">{children}</div>
    </div>
  );
}

function SlideApa() {
  const alur: [LucideIcon, string, string][] = [
    [BellRing, "Peringatan BMKG", "bg-warning text-warning-foreground"],
    [Sparkles, "Disusun SIGAP", "bg-primary/10 text-primary"],
    [ClipboardCheck, "Rencana keluarga", "bg-success text-success-foreground"],
  ];
  return (
    <Slide label="Apa itu SIGAP" Ikon={Sparkles} judul="Dari peringatan resmi ke langkah yang jelas" isi="SIGAP membaca data BMKG di wilayahmu, lalu mengubahnya menjadi rencana siaga yang sesuai dengan keluargamu.">
      <div className="relative grid grid-cols-3 gap-2">
        <span className="karosel-garis absolute left-[16%] right-[16%] top-[18px] h-0.5 sm:top-6 bg-gradient-to-r from-warning-foreground/30 via-primary/50 to-success-foreground/40" style={d(320)} aria-hidden="true" />
        {alur.map(([Ikon, teks, cls], i) => (
          <div key={teks} className="karosel-masuk relative flex flex-col items-center text-center" style={d(260 + i * 180)}>
            <span className={`flex size-9 items-center justify-center rounded-xl ring-4 ring-surface sm:size-12 sm:rounded-2xl ${cls}`}><Ikon className="size-5" aria-hidden="true" /></span>
            <span className="mt-1.5 text-[11px] font-semibold leading-tight text-foreground sm:mt-2 sm:text-xs">{teks}</span>
          </div>
        ))}
      </div>
      <p className="karosel-masuk mt-4 rounded-xl border border-border bg-background px-3 py-2 text-xs leading-snug text-muted-foreground" style={d(820)}>
        <span className="font-semibold text-foreground">Contoh:</span> BMKG memperkirakan hujan lebat sore ini, SIGAP menyarankan bersihkan saluran dan simpan dokumen di wadah kedap air.
      </p>
    </Slide>
  );
}

function SlideKeluarga() {
  const langkah = ["Masukkan obat rutin nenek ke tas siaga", "Siapkan popok dan susu balita"];
  return (
    <Slide label="Sesuai keluargamu" Ikon={ClipboardCheck} judul="Rencana mengikuti siapa saja yang ada di rumah" isi="Ada lansia, balita, atau rumah dekat sungai? Langkahnya ikut menyesuaikan, bukan saran yang sama untuk semua orang.">
      <ul className="flex flex-wrap gap-1.5">
        {["Ada lansia", "Ada balita", "Dekat sungai"].map((k, i) => (
          <li key={k} className="karosel-masuk rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-medium text-foreground" style={d(240 + i * 80)}>{k}</li>
        ))}
      </ul>
      <ol className="mt-2.5 space-y-2 sm:mt-3">
        {langkah.map((l, i) => (
          <li key={l} className={`karosel-masuk items-center gap-3 rounded-xl border border-border bg-background px-3 py-2 sm:py-2.5 ${i > 0 ? "hidden sm:flex" : "flex"}`} style={d(520 + i * 140)}>
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"><Check className="size-3.5" strokeWidth={3} aria-hidden="true" /></span>
            <span className="flex-1 text-sm font-medium text-foreground">{l}</span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">BNPB</span>
          </li>
        ))}
      </ol>
    </Slide>
  );
}

/** Nama pendek untuk bahaya yang namanya panjang, agar muat di petak kecil. */
const SINGKAT: Partial<Record<string, string>> = { karhutla: "Karhutla", gelombang_abrasi: "Gelombang tinggi" };

function SlideBahaya() {
  return (
    <Slide label="Cakupan" Ikon={ClipboardCheck} judul="9 jenis bencana di Indonesia" isi="Setiap bahaya punya panduan sebelum, saat, dan sesudah kejadian.">
      <ul className="flex flex-wrap gap-1.5 sm:grid sm:grid-cols-3 sm:gap-2">
        {HAZARDS.map((h, i) => {
          const Ikon = IKON_BAHAYA[h.id];
          return (
            <li key={h.id} className="karosel-masuk inline-flex items-center gap-1.5 rounded-full border border-border bg-background py-1 pl-1 pr-2.5 sm:flex sm:gap-2 sm:rounded-xl sm:p-2" style={d(220 + i * 50)}>
              <span className={`flex size-5 shrink-0 items-center justify-center rounded-full sm:size-7 sm:rounded-lg ${h.bgClass} ${h.colorClass}`}><Ikon className="size-3 sm:size-3.5" aria-hidden="true" /></span>
              <span className="text-[11px] font-medium leading-tight text-foreground sm:text-xs">{SINGKAT[h.id] ?? h.label}</span>
            </li>
          );
        })}
      </ul>
    </Slide>
  );
}

function SlideSumber({ jumlahPanduan }: { jumlahPanduan: number }) {
  return (
    <Slide label="Bisa dicek" Ikon={BookCheck} judul="Setiap saran menyebut sumbernya" isi="Rencana disusun dari panduan resmi, dan setiap tindakan bisa ditelusuri ke dokumen aslinya.">
      <div className="karosel-masuk flex items-end gap-3" style={d(240)}>
        <span className="text-4xl font-extrabold tabular-nums leading-none sm:text-5xl tracking-tight text-foreground">{jumlahPanduan}</span>
        <span className="pb-1 text-sm font-medium leading-snug text-muted-foreground">potongan panduan<br />resmi siap dipakai</span>
      </div>
      <ul className="mt-3 flex flex-wrap gap-1.5 sm:mt-4">
        {["BNPB", "BMKG", "Kemenkes", "Badan Geologi"].map((s, i) => (
          <li key={s} className="karosel-masuk rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-foreground" style={d(420 + i * 80)}>{s}</li>
        ))}
      </ul>
      <p className="karosel-masuk mt-3 flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs text-muted-foreground" style={d(760)}>
        <BookCheck className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
        <span>Contoh kutipan: <span className="font-semibold text-foreground">Buku Saku BNPB, hlm. 36</span></span>
      </p>
    </Slide>
  );
}

function SlidePrivasi() {
  const butir: [LucideIcon, string][] = [
    [UserX, "Tanpa daftar akun dan kata sandi"],
    [Smartphone, "Profil keluarga disimpan di perangkat ini"],
    [Lock, "Lihat, pindahkan, atau hapus datanya kapan saja"],
  ];
  return (
    <Slide label="Privasi" Ikon={Lock} judul="Langsung pakai, tanpa membuat akun" isi="Data keluargamu tetap di perangkatmu sendiri.">
      <ul className="space-y-1.5 sm:space-y-2">
        {butir.map(([Ikon, t], i) => (
          <li key={t} className="karosel-masuk flex items-center gap-2.5 rounded-xl border border-border bg-background px-2.5 py-1.5 sm:gap-3 sm:px-3 sm:py-2.5" style={d(260 + i * 140)}>
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary sm:size-8 sm:rounded-lg"><Ikon className="size-3.5 sm:size-4" aria-hidden="true" /></span>
            <span className="text-[13px] font-medium text-foreground sm:text-sm">{t}</span>
          </li>
        ))}
      </ul>
    </Slide>
  );
}

function SlideDarurat() {
  return (
    <Slide label="Saat darurat" Ikon={WifiOff} judul="Tetap bisa dibuka tanpa internet" isi="Mode Darurat berisi nomor penting dan langkah saat kejadian, dengan tombol besar dan bisa dibacakan.">
      <div className="grid grid-cols-2 gap-2">
        <div className="karosel-masuk flex items-center gap-2 rounded-xl border border-border bg-background p-2.5 sm:block sm:p-3" style={d(260)}>
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg sm:size-8 bg-danger text-danger-foreground"><WifiOff className="size-4" aria-hidden="true" /></span>
          <p className="text-[13px] font-semibold leading-tight text-foreground sm:mt-2 sm:text-sm">Mode Darurat</p>
          <p className="hidden text-xs text-muted-foreground sm:block">Terbuka setelah pernah dibuka sekali</p>
        </div>
        <div className="karosel-masuk flex items-center gap-2 rounded-xl border border-border bg-background p-2.5 sm:block sm:p-3" style={d(400)}>
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg sm:size-8 bg-muted text-foreground"><QrCode className="size-4" aria-hidden="true" /></span>
          <p className="text-[13px] font-semibold leading-tight text-foreground sm:mt-2 sm:text-sm">Kartu Siaga</p>
          <p className="hidden text-xs text-muted-foreground sm:block">Kode QR-nya membuka Mode Darurat</p>
        </div>
      </div>
      <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Nomor darurat">
        {["112 Darurat", "110 Polisi", "113 Pemadam", "115 SAR", "119 Ambulans"].map((n, i) => (
          <li key={n} className="karosel-masuk rounded-full bg-danger px-2.5 py-1 text-xs font-semibold text-danger-foreground" style={d(540 + i * 60)}>{n}</li>
        ))}
      </ul>
    </Slide>
  );
}

/**
 * Hero: carousel "Mengenal SIGAP". Berpindah otomatis tiap 6 detik, bisa digeser ke kiri/kanan (scroll-snap),
 * berhenti saat disentuh, disorot, atau difokus, dan tidak berjalan otomatis bila pengguna meminta gerakan dikurangi.
 * Navigasi lewat titik (tanpa panah); titik aktif terisi mengikuti waktu tampil.
 */
export function HeroVisual({ jumlahPanduan }: { jumlahPanduan: number }) {
  const slides = [
    <SlideApa key="apa" />,
    <SlideKeluarga key="keluarga" />,
    <SlideBahaya key="bahaya" />,
    <SlideSumber key="sumber" jumlahPanduan={jumlahPanduan} />,
    <SlidePrivasi key="privasi" />,
    <SlideDarurat key="darurat" />,
  ];
  const n = slides.length;
  const diam = useReducedMotion();
  const jalur = useRef<HTMLDivElement>(null);
  const [aktif, setAktif] = useState(0);
  const aktifRef = useRef(0);
  const [putaran, setPutaran] = useState(0); // naik tiap pindah slide: memasang ulang isi agar animasi masuk diputar lagi
  const [sentuh, setSentuh] = useState(false); // disorot, difokus, atau sedang digeser
  const [dijeda, setDijeda] = useState(false); // dijeda lewat tombol
  const jeda = sentuh || dijeda || !!diam;

  const ke = useCallback((i: number) => {
    const el = jalur.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: diam ? "auto" : "smooth" });
  }, [diam]);

  // Slide aktif mengikuti posisi gulir (juga saat digeser manual).
  useEffect(() => {
    const el = jalur.current;
    if (!el) return;
    let raf = 0;
    const baca = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const i = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
        if (i === aktifRef.current) return;
        aktifRef.current = i;
        setAktif(i);
        setPutaran((p) => p + 1);
      });
    };
    el.addEventListener("scroll", baca, { passive: true });
    return () => { el.removeEventListener("scroll", baca); cancelAnimationFrame(raf); };
  }, []);

  // Pindah otomatis; berhenti saat dijeda.
  useEffect(() => {
    if (jeda) return;
    const t = setTimeout(() => ke((aktif + 1) % n), DURASI);
    return () => clearTimeout(t);
  }, [aktif, putaran, jeda, ke, n]);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Mengenal SIGAP"
      className="relative mx-auto w-full min-w-0 max-w-lg"
      onPointerEnter={(e) => e.pointerType === "mouse" && setSentuh(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setSentuh(false)}
      onFocus={() => setSentuh(true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setSentuh(false); }}
      onTouchStart={() => setSentuh(true)}
      onTouchEnd={() => setTimeout(() => setSentuh(false), 1500)}
    >
      <div className="absolute inset-x-0 -inset-y-6 rounded-[2.5rem] bg-primary/10 blur-3xl sm:-inset-6" aria-hidden="true" />
      <div data-masuk style={{ "--tunda": "150ms" } as React.CSSProperties} className="relative overflow-hidden rounded-3xl border border-border bg-surface shadow-sm">
        <div
          ref={jalur}
          className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-live={jeda ? "polite" : "off"}
        >
          {slides.map((s, i) => (
            <div
              key={i}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} dari ${n}`}
              aria-hidden={i !== aktif}
              inert={i !== aktif}
              className="w-full shrink-0 snap-center snap-always px-4 pb-3 pt-4 sm:p-7"
            >
              {/* Hanya slide aktif dipasang ulang agar animasinya diputar; slide lain tetap terlihat saat digeser. */}
              <div key={i === aktif ? `a${putaran}` : "diam"} className="h-full">{s}</div>
            </div>
          ))}
        </div>

        <div data-jeda={jeda} className="flex items-center justify-between gap-3 border-t border-border px-4 py-0.5 sm:px-7 sm:py-3">
          <div className="-ml-2 flex items-center" role="group" aria-label="Pilih slide">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => ke(i)}
                aria-label={`Slide ${i + 1}`}
                aria-current={i === aktif}
                className="group flex h-8 min-w-6 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <span className={`relative block h-1.5 overflow-hidden rounded-full bg-muted transition-[width] duration-300 motion-reduce:transition-none ${i === aktif ? "w-7" : "w-1.5 group-hover:bg-muted-foreground/40"}`}>
                  {i === aktif && (
                    <span
                      key={`j${putaran}`}
                      className={`absolute inset-0 rounded-full bg-primary ${jeda ? "" : "karosel-jalan"}`}
                      style={{ "--durasi": `${DURASI}ms` } as React.CSSProperties}
                    />
                  )}
                </span>
              </button>
            ))}
          </div>
          {!diam && (
            <button
              type="button"
              onClick={() => setDijeda((v) => !v)}
              aria-label={dijeda ? "Putar slide otomatis" : "Jeda slide otomatis"}
              className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {dijeda ? <Play className="size-3.5" aria-hidden="true" /> : <Pause className="size-3.5" aria-hidden="true" />}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
