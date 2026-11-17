"use client";
import dynamic from "next/dynamic";

const Peta = dynamic(() => import("./peta-lokasi"), {
  ssr: false,
  loading: () => <div className="h-56 w-full animate-pulse rounded-xl bg-muted sm:h-64" aria-busy="true" aria-label="Memuat peta" />,
});

/** Pembungkus muat-malas. Peta bukan satu-satunya cara memilih lokasi (ada pemilih berjenjang). */
export function PetaLokasi({ lat, lon, label }: { lat: number; lon: number; label: string }) {
  return (
    <figure>
      <Peta lat={lat} lon={lon} label={label} />
      <figcaption className="mt-1 text-xs text-muted-foreground">
        Titik peta adalah pusat kabupaten/kota (perkiraan), bukan letak persis kelurahan.
      </figcaption>
    </figure>
  );
}
