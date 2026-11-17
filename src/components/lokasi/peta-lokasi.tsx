"use client";
import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, TileLayer } from "react-leaflet";

/**
 * Peta lokasi terpilih (Blueprint 6.1): Leaflet + ubin OpenStreetMap, tanpa kunci API.
 * Penanda memakai CircleMarker (tanpa gambar) agar tidak bergantung pada aset ikon bundler.
 * Dimuat malas lewat PetaLokasi supaya Beranda dan halaman lain tetap ringan.
 */
export default function PetaLokasiLeaflet({ lat, lon, label }: { lat: number; lon: number; label: string }) {
  return (
    <MapContainer center={[lat, lon]} zoom={11} scrollWheelZoom={false} className="h-56 w-full rounded-xl sm:h-64" attributionControl>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={18}
      />
      <CircleMarker center={[lat, lon]} radius={10} pathOptions={{ color: "#0F766E", fillColor: "#0F766E", fillOpacity: 0.6 }} aria-label={label} />
    </MapContainer>
  );
}
