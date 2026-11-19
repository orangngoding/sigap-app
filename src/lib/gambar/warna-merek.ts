/**
 * Warna logo dan penanda peta SIGAP dalam satu tempat. Nilainya harus literal karena dipakai di tempat yang tidak
 * bisa membaca variabel CSS (SVG data URI untuk ikon dan gambar pratinjau, serta pathOptions Leaflet).
 * `utama` sama dengan token --primary di globals.css; ubah keduanya bersamaan.
 */
export const WARNA_MEREK = {
  terang: "#14B8A6",
  utama: "#0F766E",
  gelap: "#065F46",
  ombak: "#A7F3D0",
} as const;
