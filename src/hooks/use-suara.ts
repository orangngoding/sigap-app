"use client";
// Suara memakai Web Speech API bawaan peramban (gratis, tanpa server SIGAP):
// - Dikte: ucapkan pertanyaan (id-ID). Pada Chrome, audio diproses layanan pengenal suara peramban.
// - Bacakan: jawaban, langkah darurat, dan skenario latihan dibacakan (membantu lansia dan tunanetra).
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

/** Bentuk minimal SpeechRecognition (belum ada di lib.dom TypeScript). */
interface PengenalSuara {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
type KonstruktorPengenal = new () => PengenalSuara;

function konstruktorPengenal(): KonstruktorPengenal | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: KonstruktorPengenal; webkitSpeechRecognition?: KonstruktorPengenal };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const tanpaLangganan = () => () => {};
/** true hanya di klien yang mendukung; server selalu false agar HTML server dan klien sama. */
function useDidukung(cek: () => boolean): boolean {
  return useSyncExternalStore(tanpaLangganan, cek, () => false);
}

/** Teks untuk dibacakan: tanpa tanda format markdown sederhana. */
export const teksUntukDibaca = (t: string) =>
  t.replace(/\*\*/g, "").replace(/^\s*[-•]\s+/gm, "").replace(/^\s*(\d+)\.\s+/gm, "$1, ").replace(/\s+/g, " ").trim();

function suaraIndonesia(): SpeechSynthesisVoice | undefined {
  return window.speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith("id"));
}

/** Bacakan teks; hanya satu teks dibacakan dalam satu waktu (ditandai dengan `id`). */
export function useBacakan() {
  const didukung = useDidukung(() => typeof window !== "undefined" && "speechSynthesis" in window);
  const [sedang, setSedang] = useState<string | null>(null);

  useEffect(() => () => { if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel(); }, []);

  const berhenti = useCallback(() => {
    window.speechSynthesis.cancel();
    setSedang(null);
  }, []);

  const baca = useCallback((id: string, teks: string) => {
    const s = window.speechSynthesis;
    s.cancel();
    const u = new SpeechSynthesisUtterance(teksUntukDibaca(teks));
    u.lang = "id-ID";
    const v = suaraIndonesia();
    if (v) u.voice = v;
    u.rate = 0.95;
    u.onend = () => setSedang((x) => (x === id ? null : x));
    u.onerror = () => setSedang((x) => (x === id ? null : x));
    setSedang(id);
    s.speak(u);
  }, []);

  /** Tekan sekali untuk membaca, sekali lagi untuk berhenti. */
  const alih = useCallback((id: string, teks: string) => (sedang === id ? berhenti() : baca(id, teks)), [sedang, baca, berhenti]);
  return { didukung, sedang, baca, berhenti, alih };
}

const PESAN_GALAT: Record<string, string> = {
  "not-allowed": "Izin mikrofon ditolak. Izinkan mikrofon di pengaturan peramban.",
  "service-not-allowed": "Pengenal suara tidak diizinkan di peramban ini.",
  "no-speech": "Suara tidak terdengar. Coba lagi lebih dekat ke mikrofon.",
  "audio-capture": "Mikrofon tidak ditemukan.",
  network: "Pengenal suara memerlukan internet.",
};

/** Hening sepanjang ini setelah bicara = selesai, teks dikirim otomatis. */
export const JEDA_KIRIM_MS = 5500;
/** Hitung mundur baru ditampilkan setelah hening sepanjang ini (jeda wajar saat berpikir tidak mengganggu). */
export const TAMPIL_HITUNG_MS = 1500;
/** Tanpa suara sama sekali sepanjang ini setelah mulai: berhenti dengan pesan. */
export const BATAS_TANPA_SUARA_MS = 12_000;

/** Gabungkan potongan transkrip menjadi satu kalimat rapi. */
export const gabungTranskrip = (...bagian: string[]) => bagian.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();

const GALAT_FATAL = new Set(["not-allowed", "service-not-allowed", "audio-capture", "network", "language-not-supported"]);

/**
 * Dikte bahasa Indonesia yang tidak berhenti saat pengguna jeda sebentar.
 * Pengenal dijalankan per ucapan dan otomatis dimulai ulang (lebih andal daripada mode `continuous`, yang
 * menggandakan kata di Chrome Android); teks digabung. Bila hening selama JEDA_KIRIM_MS setelah bicara,
 * `onSelesai` dipanggil dengan teks lengkap (kirim otomatis). `berhenti()` menghentikan tanpa mengirim.
 */
export function useDikte(onTeks: (teks: string, akhir: boolean) => void, onSelesai?: (teks: string) => void) {
  const didukung = useDidukung(() => konstruktorPengenal() !== null);
  const [mendengar, setMendengar] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  /** Sisa waktu (ms) sebelum terkirim otomatis; null bila tidak sedang menghitung mundur. */
  const [sisaMs, setSisaMs] = useState<number | null>(null);

  const ref = useRef<PengenalSuara | null>(null);
  const aktif = useRef(false);
  const akhir = useRef("");
  const ucapanFinal = useRef("");
  const ucapanSementara = useRef("");
  const terakhirBicara = useRef(0);
  const dimulai = useRef(0);
  const adaSuara = useRef(false);
  const detak = useRef<ReturnType<typeof setInterval> | null>(null);
  const cbTeks = useRef(onTeks);
  const cbSelesai = useRef(onSelesai);
  useEffect(() => {
    cbTeks.current = onTeks;
    cbSelesai.current = onSelesai;
  }, [onTeks, onSelesai]);

  const teksLengkap = () => gabungTranskrip(akhir.current, ucapanFinal.current, ucapanSementara.current);

  const selesai = useCallback((kirim: boolean) => {
    if (!aktif.current) return;
    aktif.current = false;
    if (detak.current) clearInterval(detak.current);
    detak.current = null;
    const t = teksLengkap();
    ref.current?.abort();
    ref.current = null;
    setMendengar(false);
    setSisaMs(null);
    cbTeks.current(t, true);
    if (kirim && t) cbSelesai.current?.(t);
  }, []);

  // Ref agar pengenal bisa memulai ulang dirinya dari onend tanpa callback rekursif.
  const jalankanRef = useRef<() => void>(() => {});
  const jalankanPengenal = useCallback(() => {
    const K = konstruktorPengenal();
    if (!K || !aktif.current) return;
    const r = new K();
    r.lang = "id-ID";
    r.interimResults = true;
    r.continuous = false;
    r.onresult = (e) => {
      let fin = "";
      let sem = "";
      for (let i = 0; i < e.results.length; i++) {
        if (e.results[i].isFinal) fin += e.results[i][0].transcript;
        else sem += e.results[i][0].transcript;
      }
      ucapanFinal.current = fin;
      ucapanSementara.current = sem;
      if ((fin + sem).trim()) {
        adaSuara.current = true;
        terakhirBicara.current = Date.now();
        setSisaMs(null);
      }
      cbTeks.current(teksLengkap(), false);
    };
    r.onerror = (e) => {
      if (GALAT_FATAL.has(e.error)) {
        setGalat(PESAN_GALAT[e.error] ?? "Pengenal suara belum dapat dipakai.");
        selesai(false);
      }
      // "no-speech" dan "aborted" diabaikan: pengenal dimulai ulang selama masih aktif.
    };
    r.onend = () => {
      akhir.current = gabungTranskrip(akhir.current, ucapanFinal.current || ucapanSementara.current);
      ucapanFinal.current = "";
      ucapanSementara.current = "";
      if (aktif.current && ref.current === r) {
        try {
          jalankanRef.current();
        } catch {
          selesai(true);
        }
      }
    };
    ref.current = r;
    r.start();
  }, [selesai]);
  useEffect(() => {
    jalankanRef.current = jalankanPengenal;
  }, [jalankanPengenal]);

  useEffect(
    () => () => {
      aktif.current = false;
      if (detak.current) clearInterval(detak.current);
      ref.current?.abort();
    },
    [],
  );

  const mulai = useCallback(() => {
    if (!konstruktorPengenal() || aktif.current) return;
    akhir.current = "";
    ucapanFinal.current = "";
    ucapanSementara.current = "";
    adaSuara.current = false;
    dimulai.current = Date.now();
    terakhirBicara.current = Date.now();
    aktif.current = true;
    setGalat(null);
    setSisaMs(null);
    setMendengar(true);
    try {
      jalankanPengenal();
    } catch {
      aktif.current = false;
      setMendengar(false);
      setGalat("Pengenal suara belum dapat dipakai.");
      return;
    }
    detak.current = setInterval(() => {
      if (!aktif.current) return;
      const kini = Date.now();
      if (!adaSuara.current) {
        if (kini - dimulai.current > BATAS_TANPA_SUARA_MS) {
          setGalat("Suara tidak terdengar. Coba lagi lebih dekat ke mikrofon.");
          selesai(false);
        }
        return;
      }
      const diam = kini - terakhirBicara.current;
      if (diam >= JEDA_KIRIM_MS) selesai(true);
      else setSisaMs(diam >= TAMPIL_HITUNG_MS ? JEDA_KIRIM_MS - diam : null);
    }, 200);
  }, [jalankanPengenal, selesai]);

  /** Berhenti mendengarkan tanpa mengirim (teks tetap di kotak untuk diperiksa). */
  const berhenti = useCallback(() => selesai(false), [selesai]);
  /** Kirim sekarang tanpa menunggu jeda. */
  const kirimSekarang = useCallback(() => selesai(true), [selesai]);

  return { didukung, mendengar, galat, sisaMs, mulai, berhenti, kirimSekarang };
}
