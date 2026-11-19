import type { MetadataRoute } from "next";
import { WARNA_MEREK } from "@/lib/gambar/warna-merek";

/** Aplikasi terpasang dibuka langsung ke Mode Darurat (siap tanpa internet). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SIGAP - Siaga Bencana & Iklim",
    short_name: "SIGAP",
    description: "Rencana siaga keluarga dari data resmi BMKG dan BNPB, dengan Mode Darurat tanpa internet.",
    start_url: "/darurat",
    display: "standalone",
    background_color: "#08201F",
    theme_color: WARNA_MEREK.utama,
    lang: "id",
    icons: [
      { src: "/logo-sigap.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
