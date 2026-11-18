"use client";
import { createPortal } from "react-dom";
// Alat darurat yang bekerja tanpa internet: peluit SOS (Web Audio), layar senter (layar putih + wake lock),
// dan kirim lokasi (GPS perangkat; dikirim lewat WhatsApp/SMS/menu Bagikan oleh pengguna sendiri).
import { useCallback, useEffect, useRef, useState } from "react";
import { Flashlight, LocateFixed, Loader2, Megaphone, Square, X } from "lucide-react";

const FOKUS = "focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-white";
const KARTU = `flex min-h-24 flex-col items-start justify-between gap-2 rounded-2xl border-2 p-4 text-left transition-colors ${FOKUS}`;

// ---------- Peluit SOS ----------
/** Pola SOS morse: 3 pendek, 3 panjang, 3 pendek (dalam milidetik: [nyala, jeda]). */
export const POLA_SOS: Array<[number, number]> = [
  [200, 200], [200, 200], [200, 500],
  [600, 200], [600, 200], [600, 500],
  [200, 200], [200, 200], [200, 1400],
];

function usePeluit() {
  const [aktif, setAktif] = useState(false);
  const ctx = useRef<AudioContext | null>(null);
  const henti = useRef(false);

  const berhenti = useCallback(() => {
    henti.current = true;
    setAktif(false);
    void ctx.current?.close();
    ctx.current = null;
  }, []);

  const mulai = useCallback(async () => {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const c = new Ctx();
    ctx.current = c;
    henti.current = false;
    setAktif(true);
    const penguat = c.createGain();
    penguat.gain.value = 0;
    penguat.connect(c.destination);
    const osc = c.createOscillator();
    osc.type = "square";
    osc.frequency.value = 3150; // nada peluit, terdengar jauh
    osc.connect(penguat);
    osc.start();
    const tidur = (ms: number) => new Promise((r) => setTimeout(r, ms));
    while (!henti.current) {
      for (const [nyala, jeda] of POLA_SOS) {
        if (henti.current) break;
        penguat.gain.setTargetAtTime(0.9, c.currentTime, 0.005);
        await tidur(nyala);
        penguat.gain.setTargetAtTime(0, c.currentTime, 0.005);
        await tidur(jeda);
      }
    }
  }, []);

  useEffect(() => () => { henti.current = true; void ctx.current?.close(); }, []);
  return { aktif, mulai, berhenti };
}

// ---------- Layar senter ----------
function LayarSenter({ onTutup }: { onTutup: () => void }) {
  useEffect(() => {
    let kunci: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request("screen").then((k) => { kunci = k; }).catch(() => {});
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onTutup(); };
    window.addEventListener("keydown", esc);
    return () => {
      void kunci?.release();
      window.removeEventListener("keydown", esc);
    };
  }, [onTutup]);
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Layar senter" className="fixed inset-0 z-[100] flex items-end justify-center bg-white p-6">
      <button type="button" onClick={onTutup} autoFocus className="inline-flex min-h-14 items-center gap-2 rounded-2xl border-2 border-black bg-white px-6 text-lg font-bold text-black focus-visible:outline-4 focus-visible:outline-black">
        <X className="size-5" aria-hidden="true" /> Matikan layar senter
      </button>
    </div>,
    document.body,
  );
}

// ---------- Kirim lokasi ----------
type Lok = { lat: number; lon: number; akurasi: number };

export function teksLokasi(l: Lok): string {
  const k = `${l.lat.toFixed(5)},${l.lon.toFixed(5)}`;
  return `DARURAT. Saya butuh bantuan. Lokasi saya: https://maps.google.com/?q=${k} (koordinat ${k}, akurasi sekitar ${Math.round(l.akurasi)} m). Dikirim dari SIGAP.`;
}

function KirimLokasi() {
  const [status, setStatus] = useState<"diam" | "mencari" | "ok" | "galat">("diam");
  const [lok, setLok] = useState<Lok | null>(null);
  const [pesan, setPesan] = useState("");

  const cari = () => {
    if (!("geolocation" in navigator)) {
      setStatus("galat");
      setPesan("Perangkat ini tidak mendukung lokasi.");
      return;
    }
    setStatus("mencari");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLok({ lat: p.coords.latitude, lon: p.coords.longitude, akurasi: p.coords.accuracy });
        setStatus("ok");
      },
      (e) => {
        setStatus("galat");
        setPesan(e.code === 1 ? "Izin lokasi ditolak. Izinkan lokasi di pengaturan peramban." : "Lokasi belum didapat. Coba di tempat terbuka.");
      },
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 30_000 },
    );
  };

  const bagikan = async () => {
    if (!lok) return;
    const teks = teksLokasi(lok);
    try {
      if (navigator.share) {
        await navigator.share({ title: "Lokasi darurat", text: teks });
        return;
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
    }
    window.location.href = `https://wa.me/?text=${encodeURIComponent(teks)}`;
  };

  return (
    <div className="rounded-2xl border-2 border-white/80 p-4">
      <p className="flex items-center gap-2 text-lg font-bold"><LocateFixed className="size-6 text-yellow-300" aria-hidden="true" /> Kirim lokasi saya</p>
      <p className="mt-1 text-base text-white/80">GPS tetap bekerja tanpa internet. Bacakan koordinat ke petugas 112, atau kirim ke keluarga.</p>
      <div aria-live="polite" className="mt-3">
        {status === "ok" && lok ? (
          <div className="space-y-3">
            <p className="rounded-xl bg-white px-4 py-3 font-mono text-xl font-bold text-black">{lok.lat.toFixed(5)}, {lok.lon.toFixed(5)}</p>
            <p className="text-base text-white/80">Akurasi sekitar {Math.round(lok.akurasi)} meter.</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void bagikan()} className={`inline-flex min-h-14 items-center gap-2 rounded-xl bg-yellow-300 px-5 text-lg font-extrabold text-black ${FOKUS}`}>Kirim ke keluarga</button>
              <a href={`sms:?body=${encodeURIComponent(teksLokasi(lok))}`} className={`inline-flex min-h-14 items-center rounded-xl border-2 border-white px-5 text-lg font-bold ${FOKUS}`}>Kirim lewat SMS</a>
            </div>
          </div>
        ) : (
          <button type="button" onClick={cari} disabled={status === "mencari"} className={`inline-flex min-h-14 items-center gap-2 rounded-xl border-2 border-white px-5 text-lg font-bold disabled:opacity-60 ${FOKUS}`}>
            {status === "mencari" ? <><Loader2 className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> Mencari lokasi…</> : "Ambil lokasi saya"}
          </button>
        )}
        {status === "galat" && <p className="mt-2 text-base text-yellow-200">{pesan}</p>}
      </div>
    </div>
  );
}

/** Kumpulan alat darurat. */
export function AlatDarurat() {
  const peluit = usePeluit();
  const [senter, setSenter] = useState(false);
  const tutupSenter = useCallback(() => setSenter(false), []);

  return (
    <section aria-labelledby="d-alat" className="mt-8">
      <h2 id="d-alat" className="text-2xl font-bold">Alat darurat</h2>
      <p className="mt-1 text-base text-white/80">Bekerja tanpa internet.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <button
          type="button" aria-pressed={peluit.aktif} onClick={() => (peluit.aktif ? peluit.berhenti() : void peluit.mulai())}
          className={`${KARTU} ${peluit.aktif ? "animate-pulse border-red-400 bg-red-600 motion-reduce:animate-none" : "border-white/80 hover:bg-white/10"}`}
        >
          {peluit.aktif ? <Square className="size-7 fill-current" aria-hidden="true" /> : <Megaphone className="size-7 text-yellow-300" aria-hidden="true" />}
          <span>
            <span className="block text-xl font-extrabold">{peluit.aktif ? "Hentikan peluit SOS" : "Peluit SOS"}</span>
            <span className="block text-base text-white/80">Bunyi keras berpola SOS untuk meminta pertolongan bila terjebak.</span>
          </span>
        </button>
        <button type="button" onClick={() => setSenter(true)} className={`${KARTU} border-white/80 hover:bg-white/10`}>
          <Flashlight className="size-7 text-yellow-300" aria-hidden="true" />
          <span>
            <span className="block text-xl font-extrabold">Layar senter</span>
            <span className="block text-base text-white/80">Layar putih terang untuk penerangan atau memberi tanda.</span>
          </span>
        </button>
      </div>
      <div className="mt-3"><KirimLokasi /></div>
      {senter && <LayarSenter onTutup={tutupSenter} />}
    </section>
  );
}
