import { WARNA_MEREK } from "@/lib/gambar/warna-merek";

/**
 * Logo SIGAP: perisai (siaga dan perlindungan) berisi daun (iklim dan lingkungan) yang tumbuh di atas
 * gelombang air (bencana hidrometeorologi, paling sering di Indonesia). Satu warna teal ke hijau, tetap
 * terbaca di ukuran ikon 16 piksel. Data jalur yang sama dipakai untuk favicon (src/app/icon.svg).
 */
export const LOGO_PERISAI = "M32 3.5 54.5 11.5v18.2c0 14.3-9.4 25.6-22.5 30.8C18.9 55.3 9.5 44 9.5 29.7V11.5L32 3.5Z";
export const LOGO_DAUN = "M19.5 39.5c-.4-12.6 9.8-22.6 27-22.5.3 15.8-9.7 25.5-24.2 24.9-1.1 0-2-1.1-2.8-2.4Z";
export const LOGO_TULANG = "M21.5 40.2c5.6-7.4 11.5-12.8 20.2-18.4";
export const LOGO_OMBAK = "M19.5 47.2c2.1-1.7 4.2-1.7 6.3 0s4.2 1.7 6.3 0 4.2-1.7 6.3 0 4.2 1.7 6.3 0";

export function LogoMark({ className = "size-9", judul }: { className?: string; judul?: string }) {
  const id = "sigap-logo-gradasi";
  return (
    <svg viewBox="0 0 64 64" className={className} role={judul ? "img" : undefined} aria-hidden={judul ? undefined : true} aria-label={judul}>
      <defs>
        <linearGradient id={id} x1="12" y1="4" x2="54" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={WARNA_MEREK.terang} />
          <stop offset=".55" stopColor={WARNA_MEREK.utama} />
          <stop offset="1" stopColor={WARNA_MEREK.gelap} />
        </linearGradient>
      </defs>
      <path d={LOGO_PERISAI} fill={`url(#${id})`} />
      <path d={LOGO_DAUN} fill="#fff" />
      <path d={LOGO_TULANG} fill="none" stroke={WARNA_MEREK.utama} strokeWidth="2.1" strokeLinecap="round" />
      <path d={LOGO_OMBAK} fill="none" stroke={WARNA_MEREK.ombak} strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

/** Logo lengkap: tanda + nama + kepanjangan. `terang` untuk latar gelap (footer). */
export function Logo({ terang = false, ringkas = false }: { terang?: boolean; ringkas?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark className="size-10 shrink-0 drop-shadow-sm transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105 motion-reduce:transition-none" />
      <span className="flex flex-col leading-tight">
        <span className={`text-lg font-extrabold tracking-tight ${terang ? "text-white" : "text-foreground"}`}>SIGAP</span>
        {!ringkas && <span className={`hidden text-xs font-medium sm:block ${terang ? "text-ink-muted" : "text-muted-foreground"}`}>Siaga Bencana &amp; Iklim</span>}
      </span>
    </span>
  );
}
