import { LOGO_DAUN, LOGO_OMBAK, LOGO_PERISAI, LOGO_TULANG } from "@/components/global/logo";

/** Logo SIGAP sebagai teks SVG (untuk ikon PNG dan gambar pratinjau tautan yang dibuat server). */
export const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="12" y1="4" x2="54" y2="60" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#14B8A6"/><stop offset=".55" stop-color="#0F766E"/><stop offset="1" stop-color="#065F46"/></linearGradient></defs><path d="${LOGO_PERISAI}" fill="url(#g)"/><path d="${LOGO_DAUN}" fill="#fff"/><path d="${LOGO_TULANG}" fill="none" stroke="#0F766E" stroke-width="2.1" stroke-linecap="round"/><path d="${LOGO_OMBAK}" fill="none" stroke="#A7F3D0" stroke-width="2.6" stroke-linecap="round"/></svg>`;

export const LOGO_DATA_URI = `data:image/svg+xml;base64,${Buffer.from(LOGO_SVG).toString("base64")}`;
