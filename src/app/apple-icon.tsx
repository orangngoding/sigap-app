import { ImageResponse } from "next/og";
import { LOGO_DATA_URI } from "@/lib/gambar/logo-svg";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Ikon layar utama iPhone/iPad: logo SIGAP di atas latar terang. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#F2F7F5" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOGO_DATA_URI} width={140} height={140} alt="" />
      </div>
    ),
    { ...size },
  );
}
