import Link from "next/link";
import { Sorot } from "@/components/global/efek";
import Image from "next/image";
import { ArrowRight, CalendarClock, Dumbbell, Newspaper, Sparkles, Thermometer } from "lucide-react";
import { FOTO } from "@/lib/gambar";

const FITUR = [
  {
    href: "/pustaka/berita",
    Ikon: Newspaper,
    judul: "Berita bencana terkini",
    isi: "Berita bencana 7 hari terakhir dari media Indonesia dan ANTARA, serta peringatan resmi GDACS untuk Indonesia, bisa disaring per jenis bencana.",
    ciri: ["7 hari terakhir", "Saring per bencana"],
  },
  {
    href: "/tanya",
    Ikon: Sparkles,
    judul: "Asisten SIGAP",
    isi: "Tanya apa saja seputar bencana dan iklim, dengan teks atau suara. Tempel teks peringatan BMKG, Asisten menjelaskannya dengan bahasa sederhana.",
    ciri: ["Mengutip panduan resmi", "Bisa dibacakan"],
  },
  {
    href: "/latihan",
    Ikon: Dumbbell,
    judul: "Simulator Bencana AI",
    isi: "AI menyusun simulasi untuk keluarga, rumah, lokasi, dan prakiraan nyata minggu ini, termasuk bencana beruntun. Uji awal 5 soal acak menunjukkan hal yang perlu dipelajari, lalu simulasi menyasarnya.",
    ciri: ["Bencana beruntun", "Soal berganti tiap sesi"],
  },
  {
    href: "/rencana",
    Ikon: CalendarClock,
    judul: "Pengingat dan berbagi",
    isi: "Catat tanggal kedaluwarsa isi tas siaga dan pasang pengingat di kalender ponsel. Bagikan rencana ke grup keluarga lewat WhatsApp.",
    ciri: ["Tanpa akun", "Pengingat tiap 3 bulan"],
  },
] as const;

/** Empat fitur utama, masing-masing kartu bertautan (naik 2px saat disorot, tanpa animasi saat scroll). */
export function FiturUnggulan() {
  return (
    <section aria-labelledby="judul-fitur" className="py-14 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">Yang bisa dilakukan SIGAP</p>
        <h2 id="judul-fitur" className="mt-2 max-w-2xl text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Bersiap sebelum bencana datang, dan untuk iklim yang terus berubah
        </h2>
        <Link
          href="/iklim"
          data-muncul
          className="angkat group relative mt-10 grid overflow-hidden rounded-3xl bg-ink text-ink-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:grid-cols-[1.1fr_1fr]"
        >
          <span className="relative z-10 block px-6 pb-6 pt-2 sm:p-10">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 px-3 py-1 text-xs font-semibold text-amber-200">
              <Thermometer className="size-3.5" aria-hidden="true" /> Baru: Siaga Iklim
            </span>
            <span className="mt-4 block text-2xl font-bold text-white sm:text-3xl">Hujan lebat, panas, karhutla, atau asap minggu ini? Siapkan keluargamu lebih dulu.</span>
            <span className="mt-3 block max-w-xl text-sm leading-relaxed text-ink-muted sm:text-base">
              Lihat bahaya cuaca dan kualitas udara 16 hari ke depan di wilayahmu, bulan rawan musim ini, dan kesiapan rumahmu menghadapi iklim 10-25 tahun lagi. AI menyusun rencana 7 hari yang sesuai keluargamu.
            </span>
            <span className="mt-6 flex flex-wrap gap-1.5">
              {["Prakiraan 16 hari", "Kualitas udara & karhutla", "Rencana 7 hari dari AI"].map((c) => (
                <span key={c} className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white">{c}</span>
              ))}
            </span>
            <span className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-amber-200">
              Lihat minggu ini <ArrowRight className="size-4 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" aria-hidden="true" />
            </span>
          </span>
          {/* overflow-hidden: zoom saat disorot tetap di dalam bingkai (tanpanya tepi foto meluber ke kolom teks dan tampak "patah"). */}
          {/* HP: foto di atas teks (order-first), memudar ke latar gelap di tepi bawahnya; layar lebar: foto di kanan. */}
          <span className="relative order-first block min-h-44 overflow-hidden md:order-none md:min-h-full">
            <Image src={FOTO.kekeringan.src} alt="" fill sizes="(min-width: 768px) 45vw, 100vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.03] motion-reduce:transition-none" />
            <span className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent md:bg-gradient-to-r" aria-hidden="true" />
          </span>
        </Link>
        {/* HP: kartu ringkas (ikon dan judul sebaris, tanpa label ciri); layar lebar: kartu penuh. */}
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {FITUR.map((f) => (
            <li key={f.href} data-muncul>
              <Sorot className="angkat h-full border border-border bg-surface hover:border-primary/40">
              <Link
                href={f.href}
                className="group flex h-full flex-col rounded-3xl p-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:p-6"
              >
                <span className="flex items-center gap-3 sm:flex-col sm:items-start sm:gap-0">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <f.Ikon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="flex-1 text-lg font-bold text-foreground sm:mt-5">{f.judul}</span>
                  <ArrowRight className="size-4 shrink-0 text-primary sm:hidden" aria-hidden="true" />
                </span>
                <span className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{f.isi}</span>
                <span className="mt-5 hidden flex-wrap gap-1.5 sm:flex">
                  {f.ciri.map((c) => (
                    <span key={c} className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground">{c}</span>
                  ))}
                </span>
                <span className="mt-5 hidden items-center gap-1 text-sm font-semibold text-primary sm:inline-flex">
                  Buka <ArrowRight className="size-4 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" aria-hidden="true" />
                </span>
              </Link>
              </Sorot>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
