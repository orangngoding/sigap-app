"use client";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef } from "react";
import { WARNA_MEREK } from "@/lib/gambar/warna-merek";

export interface PosisiPerangkat {
  lat: number;
  lon: number;
  akurasi: number;
}

/**
 * Peta lokasi terpilih (Blueprint 6.1): Leaflet + ubin OpenStreetMap, tanpa kunci API.
 * Penanda memakai CircleMarker (tanpa gambar) agar tidak bergantung pada aset ikon bundler.
 * Dimuat malas lewat PetaLokasi supaya Beranda dan halaman lain tetap ringan.
 *
 * Peta dikelola langsung dengan Leaflet (bukan react-leaflet): setiap kali efek dibersihkan, `map.remove()`
 * melepas peta dari elemennya. Tanpa itu, saat halaman disembunyikan lalu ditampilkan lagi (Cache Components)
 * atau Fast Refresh, elemen lama masih membawa peta sebelumnya dan Leaflet melempar
 * "Map container is being reused by another instance".
 *
 * `presisi` "desa" = titik kelurahan/desa (zoom dekat); selain itu pusat kab/kota (zoom jauh). `posisi` (opsional) =
 * posisi perangkat yang diminta pengguna, hanya digambar di peta dan tidak disimpan.
 */
export default function PetaLokasiLeaflet({ lat, lon, label, presisi, posisi }: { lat: number; lon: number; label: string; presisi?: "desa" | "kabkota"; posisi?: PosisiPerangkat | null }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const map = L.map(el, { center: [lat, lon], zoom: presisi === "desa" ? 14 : 11, scrollWheelZoom: false, attributionControl: true });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    }).addTo(map);
    L.circleMarker([lat, lon], { radius: 10, color: WARNA_MEREK.utama, fillColor: WARNA_MEREK.utama, fillOpacity: 0.6 })
      .bindTooltip(presisi === "desa" ? "Titik kelurahan/desa" : "Pusat kabupaten/kota")
      .addTo(map);
    if (posisi) {
      // Lingkaran akurasi GPS + titik biru, lalu bingkai keduanya.
      L.circle([posisi.lat, posisi.lon], { radius: Math.min(posisi.akurasi, 2000), color: "#2563eb", weight: 1, fillOpacity: 0.12 }).addTo(map);
      L.circleMarker([posisi.lat, posisi.lon], { radius: 7, color: "#ffffff", weight: 2, fillColor: "#2563eb", fillOpacity: 1 }).bindTooltip("Posisi Anda").addTo(map);
      map.fitBounds(L.latLngBounds([[lat, lon], [posisi.lat, posisi.lon]]), { padding: [36, 36], maxZoom: 16 });
    }
    return () => {
      map.remove();
    };
  }, [lat, lon, presisi, posisi]);

  return <div ref={ref} role="region" aria-label={label} className="h-56 w-full rounded-xl sm:h-72" />;
}
