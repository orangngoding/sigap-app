import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, BookOpenCheck, Calculator, CheckCircle2, Code2, Database, History, Info, Lock, MessageSquareHeart, ShieldCheck, Sparkles, UserCheck } from "lucide-react";
import { DaftarIsi } from "@/components/metodologi/daftar-isi";
import { KepalaHalaman } from "@/components/global/kepala-halaman";
import { Foto } from "@/components/global/foto";
import { FOTO, SEMUA_FOTO } from "@/lib/gambar";
import { DisclaimerBox } from "@/components/global/disclaimer-box";
import { HAZARDS } from "@/lib/hazards/hazards";
import { isHazardAktif } from "@/lib/hazards/pack-status";
import { KANAL_DIVERIFIKASI } from "@/lib/hazards/kanal";
import { SEMUA_CHUNK } from "@/lib/kb/data";
import { MIN_POTONGAN } from "@/lib/kb/schema";
import { ASUMSI, BOBOT_PRIORITAS, TINGKAT_SKOR } from "@/lib/preparedness/constants";
import { BOBOT_KELOMPOK } from "@/lib/preparedness/tas";
import { AMBANG_HARI_KERING_MM, AMBANG_HUJAN_LEBAT_MM } from "@/lib/data/iklim";
import kontak from "@/generated/kontak.json";

export const metadata: Metadata = {
  title: "Metodologi",
  description: "Dari mana data SIGAP berasal, bagaimana rencana dan skor dihitung, apa peran AI, privasi, atribusi, dan batasan yang perlu Anda ketahui.",
};

const URL_MASUKAN = "https://github.com/orangngoding/sigap-app/issues";

// Ringkasan KB dihitung dari isi KB sendiri agar halaman ini tidak pernah berbeda dari data sebenarnya.
const PER_BAHAYA = [{ id: "umum", label: "Umum (semua bahaya)" }, ...HAZARDS.map((h) => ({ id: h.id, label: h.label }))].map((h) => {
  const milik = SEMUA_CHUNK.filter((c) => c.hazard === h.id);
  const fase = (p: string) => milik.filter((c) => c.phase === p).length;
  return { ...h, total: milik.length, sebelum: fase("sebelum"), saat: fase("saat"), sesudah: fase("sesudah"), turunan: milik.filter((c) => c.turunan).length };
});
const PENERBIT = Array.from(new Set(SEMUA_CHUNK.map((c) => c.sourceTitle.replace(/,?\s*hlm\..*$/, "").trim()))).sort();
const AKSES_TERBARU = SEMUA_CHUNK.map((c) => c.accessedAt).sort().at(-1);
const JUMLAH_TURUNAN = SEMUA_CHUNK.filter((c) => c.turunan).length;

const P = "mt-3 leading-relaxed first:mt-0";
const TABEL = "mt-3 w-full min-w-[32rem] border-collapse text-sm";
const TH = "border-b border-border px-2 py-2 text-left font-semibold";
const TD = "border-b border-border px-2 py-2 align-top";

function Tabel({ kepala, baris }: { kepala: string[]; baris: Array<Array<string | number>> }) {
  return (
    <div className="overflow-x-auto">
      <table className={TABEL}>
        <thead><tr>{kepala.map((k) => <th key={k} scope="col" className={TH}>{k}</th>)}</tr></thead>
        <tbody>{baris.map((b, i) => <tr key={i}>{b.map((s, j) => <td key={j} className={TD}>{s}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

const BAGIAN = [
  { id: "m1", judul: "Apa itu SIGAP" },
  { id: "m2", judul: "Sumber data" },
  { id: "m3", judul: "Panduan kesiapsiagaan" },
  { id: "m4", judul: "Peran AI dan pagar pengaman" },
  { id: "m5", judul: "Rumus skor dan Tas Siaga" },
  { id: "m6", judul: "Privasi" },
  { id: "m7", judul: "Atribusi dan kredit foto" },
  { id: "m8", judul: "AI dalam pengembangan" },
  { id: "m9", judul: "Versi konten" },
  { id: "m10", judul: "Memberi masukan" },
];

const ALUR = [
  { Ikon: Database, judul: "Data resmi", isi: "BMKG, BNPB, Kemenkes, Badan Geologi" },
  { Ikon: Calculator, judul: "Kode menghitung", isi: "Sinyal bahaya, skor, jumlah isi tas" },
  { Ikon: Sparkles, judul: "AI merangkai", isi: "Bahasa sederhana sesuai keluarga" },
  { Ikon: ShieldCheck, judul: "Penyaring memeriksa", isi: "Sumber, angka, kalimat ramalan" },
  { Ikon: UserCheck, judul: "Anda memutuskan", isi: "Ikuti arahan BPBD dan petugas" },
];

const PAGAR = [
  "Sumber yang dikutip AI harus ada di basis pengetahuan; sumber karangan dibuang.",
  "Kalimat ramalan atau jaminan (“pasti aman”, “akan terjadi”) ditolak.",
  "Angka baru yang tidak ada di data resmi membuat keluaran AI ditolak.",
  "Permintaan ramalan, dosis obat, lokasi evakuasi, dan konten berbahaya ditolak sebelum sampai ke AI.",
  "Teks dari pengguna dan dari BMKG diperlakukan sebagai data, bukan perintah.",
  "Tanpa AI atau saat kuota habis, semua fitur tetap jalan dari templat panduan yang sama, dan diberi label.",
];

function Bagian({ id, judul, Ikon, children }: { id: string; judul: string; Ikon: typeof Database; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-j`} className="scroll-mt-24 rounded-3xl border border-border bg-surface p-6 sm:p-8">
      <h2 id={`${id}-j`} className="flex items-center gap-3 text-xl font-extrabold tracking-tight sm:text-2xl">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary print:hidden"><Ikon className="size-5" aria-hidden="true" /></span>
        {judul}
      </h2>
      <div className="mt-4 text-foreground/90">{children}</div>
    </section>
  );
}

export default function MetodologiPage() {
  return (
    <main id="konten" tabIndex={-1} className="flex-1 focus:outline-none">
      <div className="kemajuan-baca" aria-hidden="true" />
      <KepalaHalaman
        label="Metodologi"
        judul="Cara SIGAP bekerja, dijelaskan apa adanya"
        deskripsi="Dari mana data berasal, apa yang dihitung kode, apa yang dilakukan AI dan pagar pengamannya, serta bagaimana data Anda dijaga."
        foto={FOTO.bmkg}
      />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Ringkasan 30 detik */}
        <section aria-labelledby="judul-ringkas">
          <h2 id="judul-ringkas" className="text-sm font-semibold uppercase tracking-wider text-primary">Ringkasan 30 detik</h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { Ikon: Database, judul: `${SEMUA_CHUNK.length} panduan resmi`, isi: `Dari ${PENERBIT.length} dokumen BNPB, BMKG, Kemenkes, dan lainnya, masing-masing dengan halaman sumber.` },
              { Ikon: Calculator, judul: "Angka dihitung kode", isi: "Skor, isi tas, dan tingkat perhatian tidak pernah ditebak oleh AI." },
              { Ikon: ShieldCheck, judul: "AI diberi pagar", isi: "Tidak meramal bencana, tidak memberi dosis obat, dan tidak mengarang sumber." },
              { Ikon: Lock, judul: "Data tetap di HP Anda", isi: "Tanpa akun, tanpa pelacak. Nama dan kontak tidak pernah dikirim." },
            ].map(({ Ikon, judul, isi }) => (
              <li key={judul} data-muncul className="rounded-3xl bg-primary/5 p-5">
                <Ikon className="size-6 text-primary" aria-hidden="true" />
                <p className="mt-3 text-lg font-bold text-foreground">{judul}</p>
                <p className="mt-1 text-sm text-muted-foreground">{isi}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Alur */}
        <section aria-labelledby="judul-alur" className="mt-10 overflow-hidden rounded-3xl bg-ink p-6 text-ink-foreground sm:p-8 print:bg-white print:text-black">
          <h2 id="judul-alur" className="text-xl font-extrabold tracking-tight text-white sm:text-2xl print:text-black">Bagaimana SIGAP menyusun setiap saran</h2>
          <ol className="relative mt-8 grid gap-4 md:grid-cols-5">
            <span className="alur-garis absolute left-6 right-6 top-6 hidden h-0.5 md:block" aria-hidden="true" />
            {ALUR.map(({ Ikon, judul, isi }, i) => (
              <li key={judul} data-muncul className="relative flex gap-4 md:flex-col md:gap-0">
                <span className="relative flex size-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-400 text-ink shadow-lg shadow-emerald-500/20 ring-4 ring-ink print:ring-0">
                  <Ikon className="size-5" aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-xs font-bold text-emerald-300 md:mt-4 print:text-black">Langkah {i + 1}</span>
                  <span className="block font-bold text-white print:text-black">{judul}</span>
                  <span className="block text-sm text-ink-muted print:text-black">{isi}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <div className="mt-10 grid gap-10 lg:grid-cols-[15rem_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div className="sticky top-24"><DaftarIsi butir={BAGIAN} /></div>
          </aside>

          <div className="min-w-0 space-y-6">
            <Bagian id="m1" judul="Apa itu SIGAP dan batasannya" Ikon={Info}>
              <p className={P}>SIGAP membantu keluarga menyusun rencana kesiapsiagaan untuk sembilan jenis bencana dari data resmi dan jawaban mereka sendiri, lalu mengubahnya menjadi checklist, skor, Kartu Siaga cetak, latihan, dan Mode Darurat yang bisa dibuka tanpa internet.</p>
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                <p className="font-semibold">Yang bukan tugas SIGAP</p>
                <p className="mt-1">SIGAP bukan sistem peringatan dini, tidak memprediksi bencana, tidak menentukan lokasi evakuasi, dan bukan sumber saran medis. Rencana bersifat umum dan tidak menggantikan arahan BPBD, BMKG, atau petugas berwenang. Dalam keadaan darurat, hubungi 112.</p>
              </div>
            </Bagian>

            <Bagian id="m2" judul="Sumber data" Ikon={Database}>
              <Tabel
                kepala={["Data", "Sumber", "Pembaruan di SIGAP"]}
                baris={[
                  ["Prakiraan cuaca per kelurahan", "BMKG", "Disimpan sementara 10 menit"],
                  ["Gempa terbaru, M5+, dan dirasakan", "BMKG", "Disimpan sementara 2 menit"],
                  ["Peringatan dini cuaca", "BMKG (RSS dan CAP)", "Disimpan sementara 2 menit"],
                  ["Tren hujan lebat dan hari kering", "Open-Meteo, model ERA5 (CC BY 4.0)", "Disimpan sementara 7 hari"],
                  ["Proyeksi iklim 1991-2050 (Iklim 2050)", "Open-Meteo Climate API, model CMIP6 HighResMIP EC-Earth3P-HR dan MRI-AGCM3-2-S (CC BY 4.0)", "Disimpan sementara 30 hari per grid 0,25°"],
                  ["Kode dan nama wilayah", "Kepmendagri No 300.2.2-2138 Tahun 2025, lewat dataset cahyadsn/wilayah (MIT)", "Tetap, dikemas di aplikasi"],
                  ["Peta", "OpenStreetMap", "Langsung dari server ubin OSM"],
                ]}
              />
              <p className={P}>Bila sumber tidak dapat dibaca, kartu menampilkan data lama yang tersimpan di perangkat Anda dengan penanda jelas, atau mengarahkan Anda ke kanal resmi. SIGAP tidak pernah menyatakan &ldquo;tidak ada peringatan&rdquo; ketika umpan resmi tidak terbaca.</p>
              <p className={P}>Dataset wilayah hanya memuat koordinat pusat kabupaten/kota, jadi titik peta dan jarak gempa adalah perkiraan, bukan letak persis kelurahan. Pencocokan peringatan memakai nama kecamatan dan kabupaten/kota; peringatan tingkat provinsi tidak berarti wilayah Anda pasti terdampak.</p>
            </Bagian>

            <Bagian id="m3" judul="Panduan kesiapsiagaan" Ikon={BookOpenCheck}>
              <p className={P}>Setiap langkah dalam rencana berasal dari basis pengetahuan berisi {SEMUA_CHUNK.length} potongan panduan pendek, masing-masing dengan sumber, halaman, dan tanggal akses. Sebuah bahaya dibuka untuk umum setelah jumlah potongannya memenuhi minimum.</p>
              <Tabel
                kepala={["Bahaya", "Sebelum", "Saat", "Sesudah", "Total (minimum)", "Status"]}
                baris={PER_BAHAYA.map((h) => [h.label, h.sebelum, h.saat, h.sesudah, `${h.total} (${MIN_POTONGAN[h.id]})`, h.id === "umum" || isHazardAktif(h.id as Parameters<typeof isHazardAktif>[0]) ? "Aktif" : "Segera hadir"])}
              />
              <p className={P}>Potongan disusun dengan bantuan AI dari sumber resmi, dengan kalimat sendiri (parafrase), lalu halaman yang dikutip dicocokkan ke dokumen aslinya. Potongan ini belum melalui tinjauan terpisah oleh ahli, jadi periksa sumbernya bila ragu.</p>
              <p className={P}>{JUMLAH_TURUNAN} langkah ditandai <strong>turunan</strong>: tidak ada panduan resmi khusus untuk bahaya itu (misalnya langkah saat dan sesudah gelombang tinggi atau banjir rob), sehingga langkahnya diambil dari panduan banjir umum. Label ini selalu tampil di Rencana dan Mode Darurat.</p>
              <details className="mt-4 rounded-2xl border border-border p-4 text-sm">
                <summary className="cursor-pointer font-semibold">Daftar dokumen sumber ({PENERBIT.length})</summary>
                <ul className="mt-2 list-disc space-y-1 pl-5">{PENERBIT.map((s) => <li key={s}>{s}</li>)}</ul>
              </details>
            </Bagian>

            <Bagian id="m4" judul="Peran AI dan pagar pengaman" Ikon={Sparkles}>
              <p className={P}>AI (Google Gemini) merangkum panduan yang sudah bersumber, menyederhanakan teks peringatan resmi, meringkas data BMKG menjadi briefing harian, dan menjawab pertanyaan di Asisten. AI tidak menambah fakta, tidak memprediksi bencana, dan tidak memberi saran medis. Angka perlengkapan, skor, faktor yang perlu diperhatikan, tingkat perhatian, dan rekomendasi bacaan dihitung oleh kode.</p>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {PAGAR.map((x) => (
                  <li key={x} className="flex gap-3 rounded-2xl border border-border bg-background p-4 text-sm">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" /> {x}
                  </li>
                ))}
              </ul>
              <details className="mt-4 rounded-2xl border border-border p-4 text-sm">
                <summary className="cursor-pointer font-semibold">Rincian per fitur: Briefing, Latihan, Asisten</summary>
                <p className="mt-3 leading-relaxed"><strong>Briefing Siaga Hari Ini.</strong> Kode menghitung sinyal dari prakiraan cuaca, peringatan dini, dan gempa BMKG (misalnya peringatan yang menyebut kecamatan Anda, hujan lebat atau petir dalam 24 jam, suhu 35&deg;C ke atas, angin 40 km/jam ke atas, gempa M5+ dalam radius 300 km pada 24 jam terakhir, atau gempa yang dinyatakan BMKG berpotensi tsunami) dan menentukan tingkat Tenang, Perhatikan, atau Waspada. Tingkat ini versi SIGAP, bukan status resmi. AI hanya merangkai ringkasan dan tiga tindakan dari sinyal tersebut.</p>
                <p className="mt-3 leading-relaxed"><strong>Latihan Siaga.</strong> Ditulis tim dari potongan panduan yang sama, bukan oleh AI. Setiap pilihan bernilai 2 (tepat), 1 (kurang tepat), atau 0 (berbahaya), dan setiap umpan balik mengutip sumbernya; uji otomatis memastikan semua kutipan ada di basis pengetahuan. Latihan yang lulus (nilai 70 ke atas) menjadi satu butir berbobot 2 di skor.</p>
                <p className="mt-3 leading-relaxed"><strong>Asisten SIGAP.</strong> Bekerja hibrida: bila ada panduan resmi yang cocok, jawaban disusun dari panduan itu dan sumbernya dicantumkan; bila tidak (misalnya &ldquo;Apa itu BMKG?&rdquo;), AI menjawab dari pengetahuan umumnya dan diberi label. Asisten memahami percakapan sebelumnya dan profil keluarga anonim. Bila pertanyaan menyangkut keadaan sekarang (cuaca, peringatan, aman keluar rumah), server membaca data BMKG terkini untuk lokasi pengguna dengan aturan sinyal yang sama seperti Briefing dan memberikannya ke AI sebagai fakta (koordinat tidak ikut dikirim). Ringkasan rencana keluarga (skor, judul tindakan yang belum dikerjakan, isi tas yang belum siap atau hampir kedaluwarsa) dipakai untuk saran yang spesifik. AI diberi anggaran berpikir kecil sebelum menjawab, dan boleh menyarankan tombol aksi aplikasi yang dipilih dari daftar tautan buatan kode. Teks peringatan BMKG yang ditempel dijelaskan tanpa angka atau fakta baru.</p>
              </details>
            </Bagian>

            <section id="iklim-2050" aria-labelledby="iklim-2050-j" className="scroll-mt-24 rounded-3xl border border-border bg-surface p-6 sm:p-8">
              <h2 id="iklim-2050-j" className="text-xl font-bold">Cara kerja Iklim 2050 (Mesin Waktu Iklim)</h2>
              <p className={P}>Server mengambil suhu maksimum dan curah hujan harian 1991-2050 untuk grid sekitar 25 km di lokasi Anda dari dua model iklim global resolusi tinggi (CMIP6 HighResMIP, skenario emisi tinggi, dikoreksi bias terhadap ERA5). Kode lalu menghitung rata-rata per tahun untuk tiga periode 20 tahun (1991-2010, 2011-2030, 2031-2050): rata-rata suhu siang, hari 35&deg;C atau lebih, hari sangat panas (di atas persentil 95 suhu maksimum 1991-2010 di lokasi itu), curah hujan tahunan, hari hujan ekstrem (di atas persentil 99 hari hujan 1991-2010), dan kemarau terpanjang (hari berturut-turut dengan hujan di bawah 1 mm). Angka utama adalah rata-rata kedua model; rentang model ditampilkan sebagai ukuran ketidakpastian.</p>
              <p className={P}>AI menerima angka itu (tanpa koordinat) beserta profil keluarga anonim, lalu menyusun 2-3 dampak dan 4-6 langkah adaptasi berkategori rumah, air, kesehatan, ekonomi, dan komunitas. Kode menolak keluaran yang memuat angka di luar data proyeksi, angka rupiah, atau kalimat ramalan pasti, lalu memakai templat berbasis aturan (misalnya hari sangat panas naik &rarr; langkah menyejukkan rumah dan jadwal aktivitas; kemarau memanjang &rarr; menampung air hujan). Proyeksi bukan prakiraan cuaca dan tidak memprediksi bencana.</p>
            </section>

            <Bagian id="m5" judul="Rumus skor dan Tas Siaga" Ikon={Calculator}>
              <div className="rounded-2xl bg-muted p-4 text-center font-mono text-sm sm:text-base">
                Skor = 100 &times; bobot butir yang dicentang &divide; bobot semua butir
              </div>
              <p className={P}>Butir yang dihitung adalah tindakan Sebelum, tindakan Saat (dicentang bila sudah dipahami), item Tas Siaga, dan Latihan Siaga yang lulus. Panduan Sesudah tidak dihitung karena belum bisa dilakukan sebelum kejadian.</p>
              <Tabel
                kepala={["Butir", "Bobot"]}
                baris={[
                  ["Tindakan prioritas tinggi / sedang / rendah", `${BOBOT_PRIORITAS.tinggi} / ${BOBOT_PRIORITAS.sedang} / ${BOBOT_PRIORITAS.rendah}`],
                  ...Object.entries(BOBOT_KELOMPOK).map(([k, v]) => [`Tas Siaga: ${k}`, v]),
                  ["Latihan Siaga yang lulus", 2],
                ]}
              />
              <ul className="mt-4 flex flex-wrap gap-2 text-sm">
                {TINGKAT_SKOR.map((t, i) => (
                  <li key={t.label} className="rounded-full border border-border bg-background px-3 py-1">
                    <strong>{t.min}{i < TINGKAT_SKOR.length - 1 ? `–${TINGKAT_SKOR[i + 1].min - 1}` : "–100"}</strong> {t.label}
                  </li>
                ))}
              </ul>
              <details className="mt-4 rounded-2xl border border-border p-4 text-sm">
                <summary className="cursor-pointer font-semibold">Asumsi jumlah perlengkapan dan ambang data</summary>
                <p className="mt-3 leading-relaxed">Jumlah perlengkapan dihitung dari jumlah anggota keluarga dan lama persediaan (3, 5, atau 7 hari), lalu dibulatkan ke atas. Asumsi per orang per hari: air minum {ASUMSI.airLiterPerOrangHari} liter, makanan {ASUMSI.porsiPerOrangHari} porsi, popok {ASUMSI.popokPerBalitaHari} buah per balita; masker {ASUMSI.maskerPerOrang} buah per orang; pakaian ganti {ASUMSI.pakaianSetPerOrang} set per orang; obat rutin minimal {ASUMSI.minHariObatRutin} hari. Angka ini adalah asumsi awal penyusun dan belum dicocokkan dengan panduan resmi BNPB, PMI, atau Kemenkes. Panduan Keluarga BNPB (2018) misalnya menyebut air minum minimal 2 liter per orang per hari, jadi angka SIGAP lebih longgar. SIGAP tidak pernah menyebut jenis atau dosis obat.</p>
                <p className="mt-3 leading-relaxed">Banner &ldquo;Perhatikan hari ini&rdquo; muncul bila prakiraan BMKG 48 jam ke depan memuat hujan lebat atau petir, atau bila ada gempa M5,0 ke atas dalam 24 jam terakhir dalam radius 300 km dari lokasi Anda. Grafik tren iklim menghitung hari hujan lebat sebagai hari dengan curah hujan di atas {AMBANG_HUJAN_LEBAT_MM} mm, dan hari kering sebagai hari di bawah {AMBANG_HARI_KERING_MM} mm. Ambang ini tidak berarti bencana akan terjadi.</p>
              </details>
            </Bagian>

            <Bagian id="m6" judul="Privasi" Ikon={Lock}>
              <p className={P}>Tidak ada akun, tidak ada cookie pelacak, dan tidak ada analitik pihak ketiga. Tabel ini menjelaskan ke mana setiap jenis data pergi.</p>
              <Tabel
                kepala={["Data", "Disimpan di", "Dikirim ke server SIGAP", "Dikirim ke penyedia AI"]}
                baris={[
                  ["Lokasi (kelurahan, koordinat pusat wilayah)", "Perangkat", "Ya, untuk mengambil data cuaca, gempa, iklim", "Nama wilayah saja"],
                  ["Profil tanpa identitas (jumlah anggota, kategori, bangunan, bahaya)", "Perangkat", "Ya, untuk menyusun rencana, briefing, dan rencana adaptasi iklim", "Ya"],
                  ["Titik kumpul, kontak darurat, catatan khusus", "Perangkat", "Tidak", "Tidak"],
                  ["Rencana, centang, pengaturan kartu", "Perangkat", "Tidak", "Tidak"],
                  ["Pertanyaan Asisten dan teks peringatan yang ditempel", "Perangkat (riwayat percakapan)", "Ya, diproses sementara", "Ya"],
                  ["Ringkasan rencana untuk Asisten (skor, judul tindakan dan isi tas yang belum siap)", "Perangkat", "Ya, diproses sementara", "Ya"],
                  ["Hasil Latihan Siaga, tanggal kedaluwarsa tas", "Perangkat", "Tidak", "Tidak"],
                  ["Suara saat dikte", "Tidak disimpan", "Tidak (diproses layanan suara peramban)", "Tidak"],
                  ["Teks rencana yang dibagikan, file cadangan", "Tidak disimpan", "Tidak (dikirim sendiri oleh pengguna)", "Tidak"],
                ]}
              />
              <p className={P}>Koordinat dari &ldquo;Gunakan lokasi saya&rdquo; hanya dipakai sekali untuk menebak kabupaten/kota terdekat dan tidak disimpan. Log server hanya mencatat rute, status, durasi, dan kode galat, tanpa isi permintaan. Alamat IP hanya dipakai di memori untuk pembatasan laju.</p>
              <Link href="/data-saya" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                <Lock className="size-4" aria-hidden="true" /> Lihat, pindahkan, atau hapus data Anda
              </Link>
            </Bagian>

            <Bagian id="m7" judul="Atribusi dan kredit foto" Ikon={BadgeCheck}>
              <ul className="list-disc space-y-1 pl-5 leading-relaxed">
                <li>Data cuaca, gempa, dan peringatan dini: Badan Meteorologi, Klimatologi, dan Geofisika (BMKG).</li>
                <li>Data iklim historis dan proyeksi iklim: Open-Meteo (Historical Weather API dan Climate API), lisensi CC BY 4.0; model CMIP6 HighResMIP EC-Earth3P-HR (konsorsium EC-Earth) dan MRI-AGCM3-2-S (Meteorological Research Institute, Jepang).</li>
                <li>Peta: &copy; kontributor OpenStreetMap (ODbL), ditampilkan dengan Leaflet (BSD-2-Clause) dan react-leaflet (Hippocratic-2.1).</li>
                <li>Kode wilayah: dataset cahyadsn/wilayah (MIT), berdasarkan Kepmendagri No 300.2.2-2138 Tahun 2025.</li>
                <li>Panduan: BNPB, BAKORNAS PB, Kemenkes, BMKG, dan Kementerian ESDM (daftar lengkap di bagian 3).</li>
                <li>Perangkat lunak terbuka: Next.js, React, Tailwind CSS, Motion, Zustand, TanStack Query, Zod, Recharts, Lucide, dan qrcode. Daftar dan versinya ada di berkas docs/attribution.md di repositori.</li>
              </ul>
              <h3 id="kredit-foto" className="mt-6 scroll-mt-24 text-lg font-bold">Kredit foto</h3>
              <p className={P}>Foto dari Wikimedia Commons dengan lisensi bebas, disimpan di server SIGAP agar tetap tampil tanpa internet. Foto ini ilustrasi jenis bencana, bukan lokasi pengguna.</p>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                {SEMUA_FOTO.map((f) => (
                  <li key={f.src} className="flex gap-3 rounded-xl border border-border bg-background p-2.5">
                    <Foto foto={f} sizes="96px" className="size-16 shrink-0 rounded-lg" />
                    <p className="min-w-0 text-xs leading-relaxed">
                      <a href={f.halaman} target="_blank" rel="noreferrer" className="font-semibold text-primary underline-offset-2 hover:underline">{f.alt}</a>
                      <span className="block text-muted-foreground">{f.oleh} · <a href={f.lisensiUrl} target="_blank" rel="noreferrer" className="underline">{f.lisensi}</a></span>
                    </p>
                  </li>
                ))}
              </ul>
            </Bagian>

            <Bagian id="m8" judul="Pemakaian AI dalam pengembangan" Ikon={Code2}>
              <p className={P}>Di dalam aplikasi, AI (Google Gemini) dipakai sebagai komponen fungsional untuk Rencana Siaga, Briefing Siaga Hari Ini, Jelaskan Peringatan, dan Asisten SIGAP, dengan instruksi sistem, skema keluaran, dan penyaring buatan tim. Pertanyaan dapat diucapkan dan jawaban dibacakan memakai Web Speech API peramban; dikte diproses layanan pengenal suara peramban, bukan server SIGAP.</p>
              <p className={P}>Selama pengembangan, tim memakai asisten AI pemrograman untuk menulis dan memeriksa kode, menyusun draf potongan panduan dari dokumen resmi, serta mencocokkan halaman sumber. Keputusan produk dan arsitektur diambil tim.</p>
            </Bagian>

            <Bagian id="m9" judul="Versi konten" Ikon={History}>
              <ul className="list-disc space-y-1 pl-5 leading-relaxed">
                <li>Basis pengetahuan: {SEMUA_CHUNK.length} potongan, sumber terakhir diakses {AKSES_TERBARU}.</li>
                <li>Daftar nomor darurat: diperbarui {kontak.diperbarui}{kontak.perluVerifikasi ? ", masih menunggu verifikasi ke situs resmi tiap lembaga" : ""}.</li>
                <li>Tautan kanal resmi per bahaya: diperiksa {KANAL_DIVERIFIKASI}.</li>
              </ul>
            </Bagian>

            <Bagian id="m10" judul="Cara memberi masukan" Ikon={MessageSquareHeart}>
              <p className={P}>
                Menemukan langkah yang keliru, sumber yang tidak sesuai, atau masalah tampilan? Laporkan lewat{" "}
                <a href={URL_MASUKAN} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline-offset-2 hover:underline">GitHub Issues di repositori SIGAP</a>.
                Sertakan nama halaman dan, bila ada, nama bahaya atau langkah yang dimaksud. Jangan menulis data pribadi di laporan.
              </p>
            </Bagian>

            <DisclaimerBox />
          </div>
        </div>
      </div>
    </main>
  );
}
