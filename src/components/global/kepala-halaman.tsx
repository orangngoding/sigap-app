import Image from "next/image";
import type { Foto } from "@/lib/gambar";

/**
 * Kepala halaman bersama. Dengan `foto`: pita gelap berfoto (teks putih di atas gradasi). Tanpa foto:
 * latar terang berpola titik. Masuk sekali saat halaman dimuat.
 */
export function KepalaHalaman({
  label, judul, deskripsi, foto, posisi = "center", children, lebar = "max-w-7xl",
}: {
  label?: string;
  judul: string;
  deskripsi?: React.ReactNode;
  foto?: Foto;
  posisi?: string;
  children?: React.ReactNode;
  lebar?: string;
}) {
  const gelap = Boolean(foto);
  return (
    <header className={`cetak-polos relative isolate overflow-hidden ${gelap ? "bg-ink text-ink-foreground" : "latar-titik border-b border-border bg-surface"}`}>
      {foto && (
        <>
          <Image src={foto.src} alt="" fill loading="eager" fetchPriority="high" sizes="100vw" className="ken-burns -z-20 object-cover" style={{ objectPosition: posisi }} />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink via-ink/85 to-ink/30" aria-hidden="true" />
          <div className="absolute inset-x-0 bottom-0 -z-10 h-24 bg-gradient-to-t from-ink/60 to-transparent" aria-hidden="true" />
        </>
      )}
      <div className={`mx-auto ${lebar} px-4 py-8 sm:px-6 sm:py-16 lg:px-8`}>
        {label && (
          <p data-masuk className={`text-sm font-semibold uppercase tracking-wider ${gelap ? "text-emerald-300" : "text-primary"}`}>{label}</p>
        )}
        <h1 data-masuk style={{ "--tunda": "60ms" } as React.CSSProperties} className={`mt-2 max-w-3xl text-3xl font-extrabold tracking-tight sm:text-5xl ${gelap ? "text-white" : "text-foreground"}`}>
          {judul}
        </h1>
        {deskripsi && (
          <p data-masuk style={{ "--tunda": "120ms" } as React.CSSProperties} className={`mt-3 max-w-2xl text-base leading-relaxed sm:mt-4 sm:text-lg ${gelap ? "text-ink-muted" : "text-muted-foreground"}`}>
            {deskripsi}
          </p>
        )}
        {children && <div data-masuk style={{ "--tunda": "180ms" } as React.CSSProperties} className="mt-6">{children}</div>}
      </div>
    </header>
  );
}
