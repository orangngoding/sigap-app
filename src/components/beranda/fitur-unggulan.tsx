import Link from "next/link";
import { Sorot } from "@/components/global/efek";
import Image from "next/image";
import { ArrowRight, BellRing, CalendarClock, Dumbbell, Sparkles, Thermometer } from "lucide-react";
import { FOTO } from "@/lib/gambar";

const FITUR = [
  {
    href: "/lokasi",
    Ikon: BellRing,
    judul: "Briefing Siaga Hari Ini",
    isi: "Cuaca, peringatan dini, dan gempa BMKG di wilayah Anda diringkas menjadi tingkat perhatian dan 3 tindakan hari ini untuk keluarga.",
    ciri: ["Data BMKG langsung", "Tingkat dihitung kode"],
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
    judul: "Latihan Siaga",
    isi: "Hadapi gempa, banjir, tsunami, petir, asap, dan longsor dalam simulasi singkat. Setiap pilihan dijelaskan dari panduan BNPB.",
    ciri: ["6 skenario bercabang", "Menaikkan skor"],
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
    <section aria-labelledby="judul-fitur" className="py-20">
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
          <span className="relative z-10 block p-6 sm:p-10">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 px-3 py-1 text-xs font-semibold text-amber-200">
              <Thermometer className="size-3.5" aria-hidden="true" /> Baru: Siaga Iklim
            </span>
            <span className="mt-4 block text-2xl font-bold text-white sm:text-3xl">Bulan mana yang rawan bagi rumahmu, dan apa yang perlu disiapkan?</span>
            <span className="mt-3 block max-w-xl text-sm leading-relaxed text-ink-muted sm:text-base">
              Lihat bulan paling rawan panas, hujan lebat, dan kemarau di wilayahmu saat ini dan 10-25 tahun lagi, uji seberapa siap rumahmu, lalu dapatkan tindakan yang perlu dilakukan lebih dulu, lengkap dengan pengingat kalender.
            </span>
            <span className="mt-6 flex flex-wrap gap-1.5">
              {["Kalender risiko 12 bulan", "Uji ketahanan rumah", "Saran tindakan dari AI"].map((c) => (
                <span key={c} className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white">{c}</span>
              ))}
            </span>
            <span className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-amber-200">
              Mulai uji rumah <ArrowRight className="size-4 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" aria-hidden="true" />
            </span>
          </span>
          <span className="relative block min-h-48 md:min-h-full">
            <Image src={FOTO.kekeringan.src} alt="" fill sizes="(min-width: 768px) 45vw, 100vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.03] motion-reduce:transition-none" />
            <span className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent md:bg-gradient-to-r" aria-hidden="true" />
          </span>
        </Link>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FITUR.map((f) => (
            <li key={f.href} data-muncul>
              <Sorot className="angkat h-full border border-border bg-surface hover:border-primary/40">
              <Link
                href={f.href}
                className="group flex h-full flex-col rounded-3xl p-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <f.Ikon className="size-5" aria-hidden="true" />
                </span>
                <span className="mt-5 text-lg font-bold text-foreground">{f.judul}</span>
                <span className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{f.isi}</span>
                <span className="mt-5 flex flex-wrap gap-1.5">
                  {f.ciri.map((c) => (
                    <span key={c} className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground">{c}</span>
                  ))}
                </span>
                <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-primary">
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
