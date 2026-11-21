import Link from "next/link";
import Image from "next/image";
import { ArrowRight, PlayCircle, ShieldCheck } from "lucide-react";
import { KartuLanjutkan } from "@/components/global/kartu-lanjutkan";
import { BriefingHarian } from "@/components/beranda/briefing-harian";
import { RisikoTeratas } from "@/components/beranda/risiko-teratas";
import { HeroVisual } from "@/components/beranda/hero-visual";
import { FiturUnggulan } from "@/components/beranda/fitur-unggulan";
import { BencanaDicakup, CaraKerja, KartuModeDarurat, PratinjauKartu, SumberResmi, TransparansiAi } from "@/components/beranda/beranda-blok";
import { SEMUA_CHUNK } from "@/lib/kb/data";
import { FOTO } from "@/lib/gambar";
import { AngkaNaik } from "@/components/global/efek";

const tunda = (ms: number) => ({ "--tunda": `${ms}ms` }) as React.CSSProperties;

export default function Home() {
  return (
    <main id="konten" tabIndex={-1} className="flex-1 focus:outline-none">
      {/* Hero: foto penuh erupsi Sinabung saat fajar, teks di atas gradasi gelap, pratinjau produk di kanan. */}
      <section aria-labelledby="judul-hero" className="relative isolate overflow-hidden bg-ink text-white">
        <Image src={FOTO.gunung_api.src} alt="" fill loading="eager" fetchPriority="high" sizes="100vw" className="ken-burns -z-20 object-cover object-[60%_40%]" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink/95 via-ink/75 to-ink/25 lg:via-ink/50 lg:to-transparent" aria-hidden="true" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-ink to-transparent" aria-hidden="true" />

        <div className="mx-auto grid min-h-[calc(100svh-4rem)] max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:px-8">
          <div className="max-w-2xl">
            <p data-masuk className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur">
              <ShieldCheck className="size-4 text-emerald-300" aria-hidden="true" /> Kesiapsiagaan dimulai dari keluarga
            </p>
            <h1 id="judul-hero" data-masuk style={tunda(80)} className="mt-6 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
              Dari peringatan resmi menjadi <span className="teks-sorot">rencana siaga keluargamu.</span>
            </h1>
            <p data-masuk style={tunda(160)} className="mt-6 max-w-xl text-base leading-relaxed text-white/80 sm:text-lg">
              SIGAP membaca data BMKG di wilayahmu, lalu menyusun rencana, isi tas siaga, latihan, dan Kartu Siaga sesuai kebutuhan keluargamu. Semua dari panduan resmi BNPB dan BMKG.
            </p>
            <div data-masuk style={tunda(240)} className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/lokasi" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-6 text-sm font-bold text-ink shadow-lg shadow-emerald-500/30 hover:bg-emerald-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300">
                Mulai susun rencana <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link href="/rencana?contoh=1" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-6 text-sm font-semibold text-white backdrop-blur hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                <PlayCircle className="size-4" aria-hidden="true" /> Coba dengan data contoh
              </Link>
            </div>
            <KartuLanjutkan />
            <ul data-masuk style={tunda(320)} className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-white/15 pt-6">
              {[
                ["9", "jenis bencana"],
                [String(SEMUA_CHUNK.length), "panduan resmi BNPB, BMKG, Kemenkes"],
                ["0", "akun perlu dibuat; data tetap di perangkat"],
              ].map(([angka, ket]) => (
                <li key={ket}>
                  <span className="block text-3xl font-extrabold tabular-nums text-white"><AngkaNaik nilai={Number(angka)} /></span>
                  <span className="mt-1 block text-xs leading-snug text-white/70">{ket}</span>
                </li>
              ))}
            </ul>
          </div>
          <HeroVisual />
        </div>
      </section>

      <SumberResmi />
      <BriefingHarian />
      <RisikoTeratas />
      <FiturUnggulan />
      <CaraKerja />
      <BencanaDicakup />
      <PratinjauKartu />
      <TransparansiAi />
      <KartuModeDarurat />
    </main>
  );
}
