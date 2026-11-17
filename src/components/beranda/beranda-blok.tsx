import Link from "next/link";
import { ArrowRight, BadgeCheck, Ban, BookOpenCheck, Siren, Sparkles } from "lucide-react";
import { HAZARDS } from "@/lib/hazards/hazards";
import { HAZARD_DESKRIPSI, isHazardAktif } from "@/lib/hazards/pack-status";

const JUDUL = "text-3xl font-bold tracking-tight text-foreground sm:text-4xl";
const LABEL = "text-sm font-semibold uppercase tracking-wider text-primary";

/** Blueprint 5.2 blok 5: grid sembilan bahaya dengan satu kalimat; yang berstatus segera diberi label. */
export function BencanaDicakup() {
  return (
    <section aria-labelledby="judul-bencana" className="border-t border-border bg-surface px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <span className={LABEL}>Cakupan</span>
        <h2 id="judul-bencana" className={`mt-3 ${JUDUL}`}>Sembilan jenis bencana</h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">Pilih yang relevan dengan tempat tinggalmu. Setiap bahaya punya panduan Sebelum, Saat, dan Sesudah beserta sumbernya.</p>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {HAZARDS.map((h) => {
            const aktif = isHazardAktif(h.id);
            return (
              <li key={h.id} className={`rounded-2xl border border-border bg-background p-5 ${aktif ? "" : "opacity-70"}`}>
                <div className="flex items-center gap-2">
                  <span className={`size-3 rounded-full bg-current ${h.colorClass}`} aria-hidden="true" />
                  <h3 className="font-bold text-foreground">{h.label}</h3>
                  {!aktif && <span className="ml-auto rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">Segera hadir</span>}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{HAZARD_DESKRIPSI[h.id]}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/** Blueprint 5.2 blok 6: pratinjau Kartu Siaga contoh (bukan data pengguna). */
export function PratinjauKartu() {
  return (
    <section aria-labelledby="judul-kartu" className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-2">
        <div>
          <span className={LABEL}>Hasil yang bisa dipakai</span>
          <h2 id="judul-kartu" className={`mt-3 ${JUDUL}`}>Kartu Siaga untuk ditempel di rumah</h2>
          <p className="mt-3 text-muted-foreground">
            Satu halaman hitam putih berisi nomor penting, titik kumpul, tindakan kunci saat kejadian, dan isi tas siaga. Kode QR di kartu membuka Mode Darurat, yang tetap bisa dibuka tanpa internet.
          </p>
          <Link href="/rencana?contoh=1" className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-lg border border-border bg-surface px-6 text-sm font-semibold hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            Lihat rencana contoh <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        <figure>
          <div aria-hidden="true" className="mx-auto max-w-md rotate-1 rounded-xl border-2 border-black bg-white p-5 text-[13px] leading-snug text-black shadow-sm">
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
          <figcaption className="mt-3 text-center text-xs text-muted-foreground">Contoh tampilan Kartu Siaga untuk keluarga empat orang. Isi kartu Anda mengikuti profil dan lokasi Anda.</figcaption>
        </figure>
      </div>
    </section>
  );
}

/** Blueprint 5.2 blok 7: transparansi AI (apa yang dilakukan, tidak dilakukan, cara diverifikasi). */
export function TransparansiAi() {
  const butir = [
    { Ikon: Sparkles, judul: "Yang dilakukan AI", isi: "Merangkum panduan resmi yang bersumber menjadi rencana sesuai keluargamu, dan menyederhanakan teks peringatan BMKG." },
    { Ikon: Ban, judul: "Yang tidak dilakukan AI", isi: "Tidak memprediksi bencana, tidak menentukan lokasi evakuasi, dan tidak memberi saran medis atau dosis obat." },
    { Ikon: BadgeCheck, judul: "Cara diperiksa", isi: "Setiap tindakan memuat sumbernya. Kode menolak sumber karangan dan kalimat ramalan. Bila AI tidak tersedia, rencana disusun tanpa AI dan diberi label." },
  ];
  return (
    <section aria-labelledby="judul-ai" className="border-t border-border bg-surface px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <span className={LABEL}>Transparansi</span>
        <h2 id="judul-ai" className={`mt-3 ${JUDUL}`}>Bagaimana AI dipakai di SIGAP</h2>
        <ul className="mt-8 grid gap-4 md:grid-cols-3">
          {butir.map(({ Ikon, judul, isi }) => (
            <li key={judul} className="rounded-2xl border border-border bg-background p-6">
              <Ikon className="size-6 text-primary" aria-hidden="true" />
              <h3 className="mt-3 font-bold text-foreground">{judul}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{isi}</p>
            </li>
          ))}
        </ul>
        <Link href="/metodologi" className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          <BookOpenCheck className="size-4" aria-hidden="true" /> Baca metodologi lengkap
        </Link>
      </div>
    </section>
  );
}

/** Blueprint 5.2 blok 8: kartu Mode Darurat. */
export function KartuModeDarurat() {
  return (
    <section aria-labelledby="judul-darurat" className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 rounded-3xl bg-black p-8 text-white sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <Siren className="mt-1 size-8 shrink-0 text-yellow-300" aria-hidden="true" />
          <div>
            <h2 id="judul-darurat" className="text-2xl font-bold">Mode Darurat</h2>
            <p className="mt-1 text-white/80">Nomor penting dan langkah saat kejadian dengan tombol besar. Tetap terbuka tanpa internet setelah pernah dibuka sekali.</p>
          </div>
        </div>
        <Link href="/darurat" className="inline-flex min-h-14 shrink-0 items-center justify-center gap-2 rounded-xl bg-yellow-300 px-6 text-base font-extrabold text-black focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-white">
          Buka Mode Darurat <ArrowRight className="size-5" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
