"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import { ExternalLink, LocateFixed, Loader2 } from "lucide-react";
import type { PosisiPerangkat } from "./peta-lokasi";
import { jarakKm } from "@/lib/data/titik-panas";
import { PESAN_TIDAK_AMAN, pesanGalatLokasi } from "@/lib/geo/galat-lokasi";

const Peta = dynamic(() => import("./peta-lokasi"), {
  ssr: false,
  loading: () => <div className="h-56 w-full animate-pulse rounded-xl bg-muted sm:h-72" aria-busy="true" aria-label="Memuat peta" />,
});

const TOMBOL = "inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-sm font-semibold hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60";

/**
 * Pembungkus muat-malas. Peta bukan satu-satunya cara memilih lokasi (ada pemilih berjenjang). Posisi perangkat
 * hanya diminta bila pengguna menekan tombol, hanya digambar di peta, dan tidak disimpan atau dikirim ke mana pun.
 */
export function PetaLokasi({ lat, lon, label, presisi, nama }: { lat: number; lon: number; label: string; presisi?: "desa" | "kabkota"; nama?: string }) {
  const [posisi, setPosisi] = useState<PosisiPerangkat | null>(null);
  const [mencari, setMencari] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  const cari = () => {
    setGalat(null);
    if (!("geolocation" in navigator)) return setGalat("Perangkat ini tidak mendukung lokasi.");
    if (!window.isSecureContext) return setGalat(PESAN_TIDAK_AMAN);
    setMencari(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { setPosisi({ lat: p.coords.latitude, lon: p.coords.longitude, akurasi: p.coords.accuracy }); setMencari(false); },
      (e) => { setMencari(false); void pesanGalatLokasi(e).then(setGalat); },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
    );
  };
  const jarak = posisi ? jarakKm(lat, lon, posisi.lat, posisi.lon) : null;

  return (
    <figure>
      <Peta lat={lat} lon={lon} label={label} presisi={presisi} posisi={posisi} />
      <figcaption className="mt-2 space-y-2 text-xs text-muted-foreground">
        <p>
          {presisi === "desa"
            ? `Titik hijau adalah titik kelurahan/desa ${nama ?? ""} dari data wilayah yang dipakai BMKG (Kemendagri). Rumah Anda bisa berjarak beberapa ratus meter sampai beberapa kilometer dari titik ini.`.replace("  ", " ")
            : "Titik peta adalah pusat kabupaten/kota (perkiraan) karena titik kelurahan belum terbaca; akan diperbarui otomatis saat tersambung."}
          {jarak !== null && ` Posisi Anda (biru) sekitar ${jarak < 1 ? `${Math.round(jarak * 1000)} m` : `${jarak.toFixed(1).replace(".", ",")} km`} dari titik itu; posisi ini tidak disimpan.`}
        </p>
        <span className="flex flex-wrap gap-2">
          <button type="button" onClick={cari} disabled={mencari} className={TOMBOL}>
            {mencari ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <LocateFixed className="size-4" aria-hidden="true" />} {posisi ? "Perbarui posisi saya" : "Tampilkan posisi saya"}
          </button>
          <a href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`} target="_blank" rel="noreferrer" className={TOMBOL}>
            Buka peta besar <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
        </span>
        {galat && <span role="alert" className="block text-sm text-danger-foreground">{galat}</span>}
      </figcaption>
    </figure>
  );
}
