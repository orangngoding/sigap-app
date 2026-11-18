import { ImageResponse } from "next/og";
import { LOGO_DATA_URI } from "@/lib/gambar/logo-svg";

export const alt = "SIGAP: rencana siaga keluarga dari data resmi BMKG dan BNPB";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Gambar pratinjau saat tautan SIGAP dibagikan (WhatsApp, media sosial). */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "linear-gradient(135deg, #08201F 0%, #0B3B36 60%, #0F766E 100%)", color: "#F2F7F5" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_DATA_URI} width={112} height={112} alt="" />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 64, fontWeight: 800, letterSpacing: -2 }}>SIGAP</span>
            <span style={{ fontSize: 28, color: "#A8BDB8" }}>Siaga Bencana &amp; Iklim</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <span style={{ fontSize: 58, fontWeight: 800, lineHeight: 1.1, letterSpacing: -1.5, maxWidth: 980 }}>Dari peringatan resmi menjadi rencana siaga keluargamu.</span>
          <span style={{ fontSize: 28, color: "#A7F3D0" }}>Data BMKG · Panduan BNPB · Asisten AI · Latihan Siaga · Mode Darurat</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
