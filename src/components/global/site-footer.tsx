import Link from "next/link";
import { Phone } from "lucide-react";
import { Logo } from "./logo";

const KOLOM = [
  {
    judul: "Fitur",
    tautan: [
      ["Profil wilayah", "/lokasi"],
      ["Iklim 2050", "/iklim"],
      ["Rencana Siaga", "/rencana"],
      ["Latihan Siaga", "/latihan"],
      ["Asisten SIGAP", "/tanya"],
      ["Mode Darurat", "/darurat"],
    ],
  },
  {
    judul: "Informasi",
    tautan: [
      ["Pustaka", "/pustaka"],
      ["Metodologi", "/metodologi"],
      ["Kredit foto", "/metodologi#kredit-foto"],
      ["Data & privasi", "/data-saya"],
    ],
  },
] as const;

const SUMBER = [
  ["BMKG", "https://www.bmkg.go.id/", ""],
  ["BNPB", "https://bnpb.go.id/", ""],
  ["Open-Meteo", "https://open-meteo.com/", "CC BY 4.0"],
  ["OpenStreetMap contributors", "https://www.openstreetmap.org/copyright", "ODbL"],
  ["Wikimedia Commons", "https://commons.wikimedia.org/", "foto"],
] as const;

const TAUTAN = "rounded text-sm text-ink-muted transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300";

export function SiteFooter() {
  return (
    <footer className="tanpa-cetak mt-auto bg-ink text-ink-foreground">
      <div className="mx-auto max-w-7xl px-4 pb-28 pt-14 sm:px-6 md:pb-10 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          <div>
            <Link href="/" className="group inline-flex rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-300" aria-label="SIGAP - Beranda">
              <Logo terang />
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-muted">
              SIGAP (Siaga dan Tanggap Bencana) membantu keluarga di Indonesia memahami risiko dan beradaptasi dengan perubahan iklim, dari data dan panduan resmi.
            </p>
            <a href="tel:112" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-semibold text-white hover:bg-white/10">
              <Phone className="size-4" aria-hidden="true" /> Darurat: 112
            </a>
          </div>

          {KOLOM.map((k) => (
            <div key={k.judul}>
              <h2 className="text-sm font-semibold text-white">{k.judul}</h2>
              <ul className="mt-4 space-y-2.5">
                {k.tautan.map(([label, href]) => (
                  <li key={href}><Link href={href} className={TAUTAN}>{label}</Link></li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h2 className="text-sm font-semibold text-white">Sumber data</h2>
            <ul className="mt-4 space-y-2.5">
              {SUMBER.map(([label, href, ket]) => (
                <li key={href}>
                  <a href={href} target="_blank" rel="noreferrer" className={TAUTAN}>{label}</a>
                  {ket && <span className="text-xs text-ink-muted/70"> · {ket}</span>}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs leading-relaxed text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl">
            SIGAP adalah alat bantu kesiapsiagaan, bukan sistem peringatan dini resmi atau pengganti arahan BPBD, BMKG, dan petugas berwenang.
          </p>
          <p>SIGAP · IT RUSH 2026</p>
        </div>
      </div>
    </footer>
  );
}
