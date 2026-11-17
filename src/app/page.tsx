
import Link from "next/link";
import { KartuLanjutkan } from "@/components/global/kartu-lanjutkan";
import { BencanaDicakup, KartuModeDarurat, PratinjauKartu, TransparansiAi } from "@/components/beranda/beranda-blok";
import {
  ArrowRight,
  ClipboardCheck,
  MapPin,
  Building2,
  BookOpenCheck,
  Printer,
  ShieldCheck,
  Users,
} from "lucide-react";

export default function Home() {
  return (
    <main id="konten" tabIndex={-1} className="flex-1 focus:outline-none">
      <KartuLanjutkan />
      <section className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2 lg:px-8">
        {/* Hero Content */}
        <div className="max-w-2xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-medium text-primary">
            <ShieldCheck className="size-4" />
            Kesiapsiagaan dimulai dari keluarga
          </div>

          <h1 className="text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Dari peringatan resmi menjadi{" "}
            <span className="text-primary">
              rencana siaga keluargamu.
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Kenali risiko bencana di lingkunganmu dan siapkan
            langkah perlindungan yang sesuai dengan kondisi
            serta kebutuhan keluargamu bersama SIGAP.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/lokasi"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Mulai Susun Rencana
              <ArrowRight className="size-4" />
            </Link>

            <Link
              href="/rencana?contoh=1"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Coba dengan Data Contoh
            </Link>
          </div>

          <div className="mt-6 flex items-start gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
            <p>
              Tanpa daftar akun. Data keluarga tetap di perangkat Anda.
            </p>
          </div>
        </div>

        {/* Hero Illustration */}
        <div className="relative mx-auto w-full max-w-lg">
          <div className="absolute -inset-4 rounded-[2rem] bg-primary/5 blur-2xl" />

          <div className="relative rounded-3xl border border-border bg-surface p-6 shadow-sm sm:p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  LANGKAH AWAL
                </p>
                <h2 className="mt-1 text-xl font-bold text-foreground">
                  Siapkan Keluargamu
                </h2>
              </div>

              <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <ShieldCheck className="size-7" />
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <div className="flex items-center gap-4 rounded-xl border border-border p-4">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <MapPin className="size-5" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    Kenali Lokasi
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Pahami kondisi wilayah tempat tinggalmu.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-xl border border-border p-4">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                  <ClipboardCheck className="size-5" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    Kenali Kebutuhan Keluarga
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Sesuaikan persiapan dengan kondisi keluarga.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <ShieldCheck className="size-5" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    Susun Rencana Siaga
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Dapatkan panduan kesiapsiagaan keluarga.
                  </p>
                </div>
              </div>
            </div>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              Kenali risiko. Siapkan keluarga. Tetap sigap.
            </p>
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="border-y border-border bg-surface">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-8 sm:px-6 lg:grid-cols-4 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Building2 className="size-5" />
            </div>
            <p className="text-sm font-semibold text-foreground">
              Data resmi BMKG
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BookOpenCheck className="size-5" />
            </div>
            <p className="text-sm font-semibold text-foreground">
              Rencana dengan kutipan sumber
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Printer className="size-5" />
            </div>
            <p className="text-sm font-semibold text-foreground">
              Bisa dicetak dan dipakai offline
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="size-5" />
            </div>
            <p className="text-sm font-semibold text-foreground">
              Sembilan jenis bencana
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-background px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-sm font-semibold uppercase tracking-wider text-primary">
              Cara Kerja SIGAP
            </span>

            <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Siapkan Keluargamu dalam Tiga Langkah
            </h2>

            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Proses sederhana untuk membantu keluargamu lebih siap
              menghadapi risiko bencana.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {/* Step 1 */}
            <div className="relative rounded-2xl border border-border bg-surface p-7">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <MapPin className="size-7" />
              </div>

              <span className="mt-6 block text-sm font-semibold text-primary">
                LANGKAH 01
              </span>

              <h3 className="mt-2 text-xl font-bold text-foreground">
                Pilih Lokasi
              </h3>

              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Tentukan kelurahan atau desa tempat tinggalmu
                untuk mengenali kondisi wilayah dan risiko
                bencana di sekitarnya.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative rounded-2xl border border-border bg-surface p-7">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                <Users className="size-7" />
              </div>

              <span className="mt-6 block text-sm font-semibold text-primary">
                LANGKAH 02
              </span>

              <h3 className="mt-2 text-xl font-bold text-foreground">
                Isi Profil Keluarga
              </h3>

              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Kenali kebutuhan anggota keluarga agar
                rekomendasi persiapan dapat disesuaikan
                dengan kondisi rumah tanggamu.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative rounded-2xl border border-primary/20 bg-primary/5 p-7">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <ClipboardCheck className="size-7" />
              </div>

              <span className="mt-6 block text-sm font-semibold text-primary">
                LANGKAH 03
              </span>

              <h3 className="mt-2 text-xl font-bold text-foreground">
                Dapatkan Rencana dan Kartu
              </h3>

              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Dapatkan rencana kesiapsiagaan dan Kartu
                Siaga yang dapat digunakan sebagai panduan
                persiapan keluarga.
              </p>
            </div>
          </div>
        </div>
      </section>

      <BencanaDicakup />
      <PratinjauKartu />
      <TransparansiAi />
      <KartuModeDarurat />
    </main>
  );
}
