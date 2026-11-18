import Link from "next/link";
import { ArrowRight, BadgeCheck, Ban, BookOpenCheck, ClipboardCheck, MapPin, Siren, Sparkles, Users } from "lucide-react";
import { HAZARDS } from "@/lib/hazards/hazards";
import { HAZARD_DESKRIPSI } from "@/lib/hazards/pack-status";
import { SEMUA_ARTIKEL } from "@/lib/pustaka/data";
import { FOTO, fotoBahaya } from "@/lib/gambar";
import { Foto } from "@/components/global/foto";

const JUDUL = "text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl";
const LABEL = "text-sm font-semibold uppercase tracking-wider text-primary";
const WRAP = "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8";

/** Deretan lembaga sumber panduan dan data. */
export function SumberResmi() {
  const sumber = ["BMKG", "BNPB", "Badan Geologi", "Kemenkes", "BPBD", "Open-Meteo"];
  return (
    <section aria-label="Sumber resmi" className="border-b border-border bg-surface">
      <div className={`${WRAP} flex flex-col gap-4 py-7 md:flex-row md:items-center md:justify-between`}>
        <p className="text-sm font-medium text-muted-foreground">Panduan dan data disusun dari sumber resmi</p>
        <ul className="flex flex-wrap items-center gap-x-8 gap-y-3">
          {sumber.map((s) => (
            <li key={s} className="text-lg font-extrabold tracking-tight text-foreground/40 transition-colors hover:text-primary">{s}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** Tiga langkah, dihubungkan garis. */
export function CaraKerja() {
  const langkah = [
    { Ikon: MapPin, judul: "Pilih lokasi", isi: "Tentukan kelurahan atau desa. SIGAP membaca cuaca, peringatan dini, dan gempa BMKG untuk wilayah itu." },
    { Ikon: Users, judul: "Isi profil keluarga", isi: "Jumlah anggota, lansia, balita, dan jenis rumah. Data pribadi tetap di perangkat Anda." },
    { Ikon: ClipboardCheck, judul: "Dapat rencana dan Kartu Siaga", isi: "Tindakan sebelum, saat, dan sesudah per bahaya, isi tas siaga, skor, dan kartu siap cetak." },
  ];
  return (
    <section aria-labelledby="judul-cara" className="py-20">
      <div className={WRAP}>
        <div className="max-w-2xl" data-muncul>
          <span className={LABEL}>Cara kerja</span>
          <h2 id="judul-cara" className={`mt-3 ${JUDUL}`}>Rencana siaga keluarga dalam tiga langkah</h2>
        </div>
        <ol className="relative mt-12 grid gap-6 md:grid-cols-3">
          <span className="absolute left-7 right-7 top-7 hidden h-0.5 bg-gradient-to-r from-primary/40 via-primary to-primary/40 md:block" aria-hidden="true" />
          {langkah.map(({ Ikon, judul, isi }, i) => (
            <li key={judul} data-muncul className="relative">
              <span className="relative flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-8 ring-background">
                <Ikon className="size-6" aria-hidden="true" />
              </span>
              <p className="mt-6 text-sm font-bold text-primary">Langkah {i + 1}</p>
              <h3 className="mt-1 text-xl font-bold text-foreground">{judul}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{isi}</p>
            </li>
          ))}
        </ol>
        <Link href="/lokasi" className="mt-10 inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/30 hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          Mulai dari lokasi <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

/** Sembilan bahaya sebagai kartu foto; tiap kartu membuka artikel Pustaka bahaya itu. */
export function BencanaDicakup() {
  return (
    <section aria-labelledby="judul-bencana" className="bg-surface py-20">
      <div className={WRAP}>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between" data-muncul>
          <div className="max-w-2xl">
            <span className={LABEL}>Cakupan</span>
            <h2 id="judul-bencana" className={`mt-3 ${JUDUL}`}>Sembilan jenis bencana di Indonesia</h2>
            <p className="mt-3 text-muted-foreground">Setiap bahaya punya panduan Sebelum, Saat, dan Sesudah beserta sumber resminya.</p>
          </div>
          <Link href="/pustaka" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary hover:underline">
            Semua artikel Pustaka <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {HAZARDS.map((h, i) => {
            const artikel = SEMUA_ARTIKEL.find((a) => a.hazards.includes(h.id));
            const besar = i === 0;
            return (
              <li key={h.id} data-muncul className={besar ? "sm:col-span-2 lg:row-span-2" : ""}>
                <Link
                  href={artikel ? `/pustaka/${artikel.slug}` : "/pustaka"}
                  className="angkat group relative flex h-full min-h-60 flex-col justify-end overflow-hidden rounded-3xl bg-ink p-6 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <Foto foto={fotoBahaya(h.id)} hias zoom sizes={besar ? "(min-width: 1024px) 66vw, 100vw" : "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"} latar />
                  <span className="absolute inset-0 bg-gradient-to-t from-ink via-ink/55 to-ink/5" aria-hidden="true" />
                  <span className="relative">
                    <span className="inline-flex rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold backdrop-blur">{h.level === "A" ? "Panduan lengkap" : "Panduan inti"}</span>
                    <span className={`mt-3 block font-extrabold tracking-tight ${besar ? "text-3xl" : "text-xl"}`}>{h.label}</span>
                    <span className="mt-1 block max-w-md text-sm text-white/80">{HAZARD_DESKRIPSI[h.id]}</span>
                    <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-emerald-300">
                      Baca panduan <ArrowRight className="size-4 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" aria-hidden="true" />
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/** Pratinjau Kartu Siaga contoh (bukan data pengguna). */
export function PratinjauKartu() {
  return (
    <section aria-labelledby="judul-kartu" className="overflow-hidden py-20">
      <div className={`${WRAP} grid items-center gap-12 lg:grid-cols-2`}>
        <div data-muncul>
          <span className={LABEL}>Hasil yang bisa dipakai</span>
          <h2 id="judul-kartu" className={`mt-3 ${JUDUL}`}>Kartu Siaga untuk ditempel di rumah</h2>
          <p className="mt-4 text-muted-foreground">
            Satu halaman hitam putih berisi nomor penting, titik kumpul, tindakan kunci saat kejadian, dan isi tas siaga. Kode QR di kartu membuka Mode Darurat, yang tetap bisa dibuka tanpa internet.
          </p>
          <Link href="/rencana?contoh=1" className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl border border-border bg-surface px-6 text-sm font-semibold hover:border-primary/40 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            Lihat rencana contoh <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        <div className="relative" data-muncul>
          <div className="absolute inset-6 -z-10 rotate-6 rounded-3xl bg-primary/15" aria-hidden="true" />
          <div aria-hidden="true" className="mx-auto max-w-md -rotate-2 rounded-2xl border-2 border-black bg-white p-6 text-[13px] leading-snug text-black shadow-2xl shadow-ink/20 transition-transform duration-500 hover:rotate-0 motion-reduce:transition-none">
            <p className="border-b-2 border-black pb-1 text-base font-extrabold uppercase">Kartu Siaga Keluarga</p>
            <p className="mt-1">Gambir, Kec. Gambir, Jakarta Pusat</p>
            <p className="mt-2 font-bold">Nomor darurat</p>
            <p>112 Panggilan darurat terpadu &middot; 113 Pemadam kebakaran</p>
            <p className="mt-2 font-bold">Saat banjir</p>
            <ol className="ml-4 list-decimal"><li>Matikan listrik</li><li>Mengungsi lebih awal</li></ol>
            <p className="mt-2 font-bold">Isi tas siaga</p>
            <p>36 liter air minum &middot; 36 porsi makanan &middot; 1 set kotak P3K</p>
            <div className="mt-3 flex items-end justify-between border-t-2 border-black pt-2">
              <p className="max-w-[70%] text-[11px]">Bukan pengganti arahan BPBD, BMKG, atau petugas berwenang.</p>
              <div className="grid size-12 grid-cols-4 gap-0.5">{Array.from({ length: 16 }, (_, i) => <span key={i} className={(i * 7) % 3 ? "bg-black" : "bg-white"} />)}</div>
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">Contoh untuk keluarga empat orang. Isi kartu Anda mengikuti profil dan lokasi Anda.</p>
        </div>
      </div>
    </section>
  );
}

/** Transparansi AI di pita gelap berfoto stasiun cuaca BMKG. */
export function TransparansiAi() {
  const butir = [
    { Ikon: Sparkles, judul: "Yang dilakukan AI", isi: "Merangkum panduan resmi menjadi rencana sesuai keluarga, meringkas data BMKG menjadi briefing harian, dan menyederhanakan teks peringatan." },
    { Ikon: Ban, judul: "Yang tidak dilakukan AI", isi: "Tidak memprediksi bencana, tidak menentukan lokasi evakuasi, dan tidak memberi saran medis atau dosis obat." },
    { Ikon: BadgeCheck, judul: "Cara diperiksa", isi: "Setiap tindakan memuat sumbernya. Kode menolak sumber karangan, angka baru, dan kalimat ramalan. Tanpa AI, semua fitur tetap jalan." },
  ];
  return (
    <section aria-labelledby="judul-ai" className="relative isolate overflow-hidden bg-ink py-20 text-ink-foreground">
      <Foto foto={FOTO.bmkg} hias sizes="100vw" latar className="-z-20 opacity-30" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-ink via-ink/95 to-ink/70" aria-hidden="true" />
      <div className={WRAP}>
        <div className="max-w-2xl" data-muncul>
          <span className="text-sm font-semibold uppercase tracking-wider text-emerald-300">Transparansi</span>
          <h2 id="judul-ai" className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Bagaimana AI dipakai di SIGAP</h2>
        </div>
        <ul className="mt-10 grid gap-4 md:grid-cols-3">
          {butir.map(({ Ikon, judul, isi }) => (
            <li key={judul} data-muncul className="kaca-gelap rounded-3xl border border-white/10 p-6">
              <span className="flex size-11 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-300"><Ikon className="size-5" aria-hidden="true" /></span>
              <h3 className="mt-4 text-lg font-bold text-white">{judul}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{isi}</p>
            </li>
          ))}
        </ul>
        <Link href="/metodologi" className="mt-8 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-emerald-300 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300">
          <BookOpenCheck className="size-4" aria-hidden="true" /> Baca metodologi lengkap
        </Link>
      </div>
    </section>
  );
}

/** Ajakan Mode Darurat. */
export function KartuModeDarurat() {
  return (
    <section aria-labelledby="judul-darurat" className={`${WRAP} py-20`}>
      <div data-muncul className="relative isolate flex flex-col gap-6 overflow-hidden rounded-3xl bg-black p-8 text-white sm:flex-row sm:items-center sm:justify-between sm:p-10">
        <div className="absolute -right-16 -top-16 -z-10 size-64 rounded-full bg-red-600/40 blur-3xl" aria-hidden="true" />
        <div className="flex items-start gap-4">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-yellow-300 text-black"><Siren className="size-7" aria-hidden="true" /></span>
          <div>
            <h2 id="judul-darurat" className="text-2xl font-extrabold sm:text-3xl">Mode Darurat</h2>
            <p className="mt-1 max-w-xl text-white/80">Nomor penting dan langkah saat kejadian dengan tombol besar, bisa dibacakan, dan tetap terbuka tanpa internet setelah pernah dibuka sekali.</p>
          </div>
        </div>
        <Link href="/darurat" className="inline-flex min-h-14 shrink-0 items-center justify-center gap-2 rounded-xl bg-yellow-300 px-6 text-base font-extrabold text-black hover:bg-yellow-200 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-white">
          Buka Mode Darurat <ArrowRight className="size-5" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
