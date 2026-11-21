import type { Metadata } from "next";
import { AMBANG_BULAN_KERING_MM, BATAS_RASIO_KEMARAU, HARI_GANGGUAN_AIR, HEMAT_AIR_PERSEN, KATALOG, KURANG_AIR_WASPADA_HARI, LITER_PER_ORANG_HARI, MIN_HARI_CADANGAN_AIR, MIN_PUNCAK, SELISIH_HUJAN, SELISIH_PANAS } from "@/lib/iklim/ketahanan";
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
    <section id={id} aria-labelledby={`${id}-j`} className="rounded-3xl border border-border bg-surface p-6 sm:p-8">
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
            <div className="sticky top-[calc(6rem+var(--spanduk,0px))]"><DaftarIsi butir={BAGIAN} /></div>
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
                  ["Prakiraan cuaca 16 hari dan 30 hari terakhir (Siaga Iklim, Minggu ini)", "Open-Meteo Forecast API, gabungan model cuaca global terbaik untuk lokasi (CC BY 4.0)", "Disimpan sementara 1 jam per grid 0,25°"],
                  ["Kualitas udara PM2.5 5 hari (Siaga Iklim, Minggu ini)", "Open-Meteo Air Quality API, model CAMS Copernicus Uni Eropa (CC BY 4.0)", "Disimpan sementara 1 jam per grid 0,25°"],
                  ["Status El Niño/La Niña (ONI) dan IOD (DMI), tab Musim ini dan Minggu ini", "NOAA Climate Prediction Center (ONI) dan NOAA Physical Sciences Laboratory (Niño 3.4, DMI)", "Disimpan sementara 12 jam; data diperbarui sebulan sekali"],
                  ["Titik panas satelit untuk karhutla (Minggu ini)", "NASA FIRMS, deteksi VIIRS 375 m satelit NOAA-20 dan NOAA-21 (data terbuka NASA)", "Disimpan sementara 1 jam"],
                  ["Cadangan pengamatan harian (Musim ini, catatan kemarau, metode delta)", "NASA POWER, NASA Langley Research Center (MERRA-2 dan hujan terkoreksi satelit, data terbuka NASA)", "Disimpan sementara 30 hari per sel 0,5°"],
                  ["Cadangan prakiraan 9 hari (Minggu ini)", "MET Norway Locationforecast 2.0 (CC BY 4.0)", "Disimpan sementara 1 jam"],
                  ["Cuaca per jam di Lokasi (melengkapi BMKG per 3 jam)", "Open-Meteo Forecast API (model cuaca global, CC BY 4.0); cadangan MET Norway", "Disimpan sementara 30 menit per sel sekitar 1 km"],
                  ["Titik kelurahan/desa untuk peta dan semua data lokasi", "Koordinat desa pada respons prakiraan cuaca BMKG (data wilayah Kemendagri)", "Disimpan di perangkat bersama lokasi"],
                  ["Profil Risiko Lokasi: gunung api", "Smithsonian Global Volcanism Program, Volcanoes of the World (101 gunung api Holosen di Indonesia)", "Berkas bawaan, dibuat ulang dengan npm run bangun:data-risiko"],
                  ["Profil Risiko Lokasi: gempa", "USGS Earthquake Catalog (gempa M5+ dalam 150 km sejak 1976, M7+ dalam 300 km sejak 1900)", "Disimpan sementara 30 hari per sel 0,1°"],
                  ["Profil Risiko Lokasi: tsunami dan pantai", "NOAA NCEI Global Historical Tsunami Database (titik runup Indonesia) dan garis pantai Natural Earth 1:10m", "Berkas bawaan"],
                  ["Profil Risiko Lokasi: ketinggian dan lereng", "SRTM 90 m melalui OpenTopoData (9 titik dalam radius sekitar 600 m)", "Disimpan sementara 30 hari per sel 0,005°"],
                  ["Perubahan iklim 2031-2050 untuk metode delta", "World Bank Climate Change Knowledge Portal, ansambel CMIP6 x0.25 SSP5-8.5, agregat Indonesia (CC BY 4.0)", "Angka tetap di kode, diambil 19 November 2026"],
                  ["Pola bulanan iklim saat ini (tab Musim ini)", "Open-Meteo Historical Weather API, reanalisis ERA5 periode normal 1991-2020 (CC BY 4.0)", "Disimpan sementara 30 hari per grid 0,25°"],
                  ["Proyeksi iklim 1991-2050 (Siaga Iklim)", "Open-Meteo Climate API, model CMIP6 HighResMIP EC-Earth3P-HR dan MRI-AGCM3-2-S (CC BY 4.0)", "Kota utama: data bawaan di aplikasi; lokasi lain disimpan sementara 30 hari per grid 0,25° (sesuai resolusi model, sekitar 25 km; grid 0,5° bisa jatuh ke sel pesisir yang jauh lebih kering)"],
                  ["Berita bencana (Pustaka)", "Google Berita (7 pencarian per jenis bencana), RSS ANTARA, dan peringatan GDACS (PBB dan Komisi Eropa) untuk Indonesia; hanya judul, media, waktu, dan tautan", "Disimpan sementara 10 menit"],
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
                <p className="mt-3 leading-relaxed"><strong>Skenario bank tim (di balik Simulator Bencana AI).</strong> Sembilan skenario, satu per bahaya, ditulis tim dari potongan panduan yang sama, bukan oleh AI. Skenario ini tidak lagi ditampilkan sebagai latihan terpisah: skenario dipakai sebagai cadangan bila AI tidak tersedia. Soal uji awal diambil dari bank soal terpisah yang juga ditulis tim (15-18 soal per bahaya, tiap tindakan terbaik bersumber potongan panduan yang sama). Setiap sesi menampilkan 5 soal acak dan mendahulukan soal yang belum muncul di sesi-sesi terakhir, agar tidak berulang; kunci jawaban tampil di rapor. Setiap pilihan bernilai 2 (tepat), 1 (kurang tepat), atau 0 (berbahaya), dan setiap umpan balik mengutip sumbernya; uji otomatis memastikan semua kutipan ada di basis pengetahuan. Latihan yang lulus (nilai 70 ke atas) menjadi satu butir berbobot 2 di skor. Setiap situasi ditulis lengkap dalam satu kartu dengan tiga pilihan, tanpa notifikasi terpisah, agar mudah dibaca di layar ponsel; sebagian situasi memuat pesan berantai khas saat bencana untuk melatih memeriksa ke sumber resmi. Waktu memutuskan (25 detik) dan meter keselamatan keluarga hanya untuk umpan balik, tidak mengubah nilai. Sesudah latihan, keputusan yang keliru dicocokkan dengan tindakan di rencana keluarga lewat id potongan panduan yang sama, sehingga pengguna bisa langsung menyiapkannya.</p>
                <p className="mt-3 leading-relaxed"><strong>Asisten SIGAP.</strong> Bekerja hibrida: bila ada panduan resmi yang cocok, jawaban disusun dari panduan itu dan sumbernya dicantumkan; bila tidak (misalnya &ldquo;Apa itu BMKG?&rdquo;), AI menjawab dari pengetahuan umumnya dan diberi label. Asisten memahami percakapan sebelumnya dan profil keluarga anonim. Bila pertanyaan menyangkut keadaan sekarang (cuaca, peringatan, aman keluar rumah), server membaca data BMKG terkini untuk lokasi pengguna dengan aturan sinyal yang sama seperti Briefing dan memberikannya ke AI sebagai fakta (koordinat tidak ikut dikirim). Ringkasan rencana keluarga (skor, judul tindakan yang belum dikerjakan, isi tas yang belum siap atau hampir kedaluwarsa) dipakai untuk saran yang spesifik. AI diberi anggaran berpikir kecil sebelum menjawab, dan boleh menyarankan tombol aksi aplikasi yang dipilih dari daftar tautan buatan kode. Teks peringatan BMKG yang ditempel dijelaskan tanpa angka atau fakta baru.</p>
              </details>
            </Bagian>

            <section id="iklim-2050" aria-labelledby="iklim-2050-j" className="rounded-3xl border border-border bg-surface p-6 sm:p-8">
              <h2 id="iklim-2050-j" className="text-xl font-bold">Cara kerja Siaga Iklim</h2>
              <p className={P}>Siaga Iklim dibagi menurut rentang waktu: <strong>Minggu ini</strong> (16 hari), <strong>Musim ini</strong> (3-12 bulan), dan <strong>Rumah &amp; masa depan</strong> (10-25 tahun).</p>
              <p className={P}><strong>Minggu ini.</strong> Server mengambil prakiraan harian 16 hari beserta data 30 hari terakhir (Open-Meteo) dan PM2.5 per jam untuk sekitar 5 hari (model CAMS Copernicus). Kode lalu menandai tiap hari dengan ambang dari acuan resmi: hujan 20 mm/hari atau lebih dengan peluang 70% ke atas (perhatikan) dan 50 mm atau lebih (waspada), sesuai kategori hujan sedang dan lebat BMKG; suhu maksimum 35&deg;C ke atas (perhatikan) dan suhu terasa 41&deg;C ke atas (waspada, kategori &ldquo;bahaya&rdquo; heat index NWS/NOAA); hari tanpa hujan berarti (di bawah 1 mm) 7 hari berturut-turut (perhatikan) dan 14 hari (waspada); cuaca mudah terbakar bila hari kering, kelembapan minimum di bawah 45%, dan sudah 5 hari atau lebih tanpa hujan (waspada bila angin 20 km/jam ke atas atau 10 hari tanpa hujan); serta PM2.5 rata-rata harian di atas 55,4 &micro;g/m&sup3; (tidak sehat) dan di atas 150,4 &micro;g/m&sup3; (sangat tidak sehat) menurut kategori ISPU Permen LHK P.14/2020. Wilayah dianggap rawan karhutla bila provinsinya termasuk provinsi prioritas pengendalian karhutla atau pengguna memilih bahaya karhutla. Semua bahaya ditampilkan, termasuk yang aman, agar terlihat sudah diperiksa.</p>
              <p className={P}>AI menerima sinyal itu (tanpa koordinat) dan profil keluarga anonim, lalu menyusun rencana 3-5 langkah untuk 7 hari ke depan. Kode menolak keluaran yang memuat angka atau tanggal di luar sinyal, rupiah, atau kalimat ramalan pasti, mencoba sekali lagi, dan bila tetap gagal memakai rencana dari aturan (tindakan utama tiap sinyal menurut tanggal). Ini indikator SIGAP, bukan peringatan resmi: halaman selalu menautkan peringatan dini BMKG, ISPU KLHK, dan SiPongi (titik panas karhutla).</p>
              <p className={P}><strong>Kondisi iklim global.</strong> Musim di Indonesia sangat dipengaruhi El Niño/La Niña (ENSO) dan Indian Ocean Dipole (IOD). SIGAP membaca Oceanic Niño Index (ONI) NOAA: El Niño bila ONI mencapai +0,5 dan La Niña bila -0,5, dengan kekuatan lemah (0,5-0,9), sedang (1,0-1,4), kuat (1,5-1,9), dan sangat kuat (2,0 ke atas); serta Dipole Mode Index (DMI) dengan ambang 0,4 untuk IOD positif atau negatif. Dampaknya dirumuskan kode sebagai kecenderungan sesuai penjelasan BMKG (El Niño: hujan di bawah normal, awal musim hujan mundur, risiko kekeringan dan karhutla naik; La Niña: sebaliknya) dan tidak menggantikan Prakiraan Musim BMKG. Data IOD terbit lebih lambat dari ENSO, jadi bulan terakhirnya selalu ditampilkan beserta usianya.</p>
              <p className={P}><strong>Simulator Bencana AI: tingkat dan kondisi nyata.</strong> Tingkat dasar berisi satu bencana; tingkat menantang menambahkan dua keadaan sulit yang sering terjadi sungguhan (malam hari dan listrik padam, sinyal lemah sehingga hanya SMS yang kadang terkirim, anggota dewasa sedang di luar rumah, jalan tertutup), dipilih kode bergiliran; tingkat bencana beruntun memasangkan bencana pertama dengan bencana yang lazim dipicunya (gempa dan tsunami, hujan ekstrem dan banjir, banjir dan longsor, kemarau dan kebakaran lahan). Tsunami hanya dipilih bila Profil Risiko Lokasi menunjukkan lokasi berisiko tsunami. Kejadian beruntun (compound events) makin sering seiring perubahan iklim, dan keputusan yang tepat untuk bencana pertama bisa keliru untuk bencana kedua; validasi kode mewajibkan simulasi beruntun mengutip panduan kedua bencana, dan uji awal mencakup keduanya (3 soal bencana pertama dan 2 soal bencana kedua). Bila prakiraan minggu ini di lokasi pengguna relevan (sinyal hujan, kering, cuaca mudah terbakar, atau udara dari Siaga Iklim, serta El Niño atau La Niña yang arahnya sesuai bahaya), langkah pertama dibuka dari fakta nyata itu dan disebut sebagai prakiraan, bukan kepastian. Koordinat hanya dipakai server untuk mengambil prakiraan dan tidak pernah diteruskan ke AI.</p>
              <p className={P}><strong>Simulator Bencana AI.</strong> AI di sini bukan obrolan: ia menyusun simulasi keputusan untuk satu keluarga dari data yang sudah ada di SIGAP, yaitu atribut keluarga tanpa nama atau kontak (anggota rentan, jenis rumah, kendaraan, hewan), nama wilayah, fakta Profil Risiko Lokasi, dan konsep yang keliru di uji awal. Bahannya hanya potongan panduan resmi di basis pengetahuan untuk bahaya itu. Kode lalu memeriksa setiap keluaran: tepat satu tindakan terbaik dan minimal satu tindakan berbahaya per langkah, setiap pilihan mengutip id panduan yang benar-benar diberikan, angka hanya boleh berasal dari data pengguna atau nomor darurat, tepat satu kabar bohong yang jawaban terbaiknya memeriksa sumber resmi, dan tindakan terbaik serta umpan balik tidak boleh berisi ramalan atau jaminan keselamatan. Pilihan keliru boleh menggambarkan anggapan yang salah karena itulah yang dilatih. Urutan pilihan diacak kode. Bila ditolak, alasannya dikirim kembali ke model untuk satu kali perbaikan; bila tetap gagal, pengguna mendapat skenario tim. <strong>Uji awal tanpa AI</strong>: 5 soal acak dari bank soal tim (tervalidasi, bersumber panduan) mengukur pemahaman sebelum simulasi, dan konsep yang keliru dikirim ke AI untuk disasar. Rapor menampilkan kunci jawaban uji awal, nilai keputusan selama simulasi, dan nilai uji awal dari sesi ke sesi. Ini pengukuran pribadi yang tersimpan di perangkat, bukan penelitian berkontrol.</p>
              <p className={P}><strong>Mode Darurat.</strong> Dirancang untuk orang yang panik dan mungkin tanpa internet: kontras tinggi, huruf besar, sasaran sentuh minimal 56 px, dan semua isi ikut terkemas di aplikasi sehingga tetap terbuka offline setelah satu kali kunjungan (halaman lain yang belum tersimpan dialihkan ke Mode Darurat). Selain langkah per bencana, ada tujuh situasi kritis yang terjadi dalam bencana apa pun dan menentukan nyawa dalam hitungan menit: terjebak reruntuhan (ketuk pipa atau dinding, peluit, tutup mulut dengan kain, kirim SMS; BNPB dan Ready.gov), perdarahan (tekan luka terus-menerus; Kemenkes dan MSD Manual), tidak sadar dan tidak bernapas (RJP tangan saja 100-120 tekanan per menit, dengan metronom 110 per menit), kebakaran rumah, bau gas, arus banjir (arus setinggi 15 cm dapat menjatuhkan orang; Ready.gov), dan terpisah dari keluarga (BNPB 117). Langkahnya ditulis ulang tim tanpa obat atau dosis, dan setiap situasi menyebut nomor yang paling tepat. Pesan kabar keluarga dikirim lewat SMS karena SMS tetap terkirim saat internet data mati atau jaringan padat, dan GPS tidak butuh internet. Info medis untuk penolong hanya tersimpan di perangkat dan tidak pernah masuk ke pesan.</p>
              <p className={P}><strong>Profil Risiko Lokasi.</strong> Sebelum menyusun rencana, SIGAP menilai 9 bahaya untuk titik lokasi Anda dari catatan nyata, bukan dari tebakan: jarak ke gunung api dan tahun erupsi terakhirnya (dalam 30 km dan pernah meletus sejak 1900 = tinggi; sampai 80 km = perlu disiapkan karena hujan abu), jumlah gempa M5+ dalam 150 km sejak 1976 (20 atau lebih = tinggi), jarak ke pantai, ketinggian tanah, dan riwayat tsunami (tsunami tinggi hanya bila dalam 5 km dari pantai, tanah 30 m atau lebih rendah, dan pernah ada tsunami atau gempa M7+ di sekitar), beda tinggi permukaan dalam radius sekitar 600 m untuk lereng (100 m atau lebih = tinggi), jumlah bulan kering dan kemarau terpanjang 1991-2020, serta provinsi prioritas karhutla dan titik panas satelit. Setiap tingkat disertai angka dan sumbernya, sumber yang gagal dibaca ditandai &ldquo;belum terbaca&rdquo; (bukan dianggap aman), dan pengguna tetap bebas menambah atau mengurangi bahaya. Fakta ini juga dikirim ke AI Rencana (tanpa koordinat) agar ringkasan dan prioritas tindakan sesuai lokasi; angka di ringkasan AI wajib berasal dari data ini. Briefing Siaga Hari Ini menambahkan sinyal gabungan hanya bila ada pemicu hari ini sekaligus risiko di titik itu (hujan lebat di lokasi berlereng = waspada longsor; hujan lebat di dekat gunung api aktif = waspada lahar; hujan lebat di dataran rendah = waspada banjir; gempa terasa di pesisir rendah = kenali jalur ke tempat tinggi; cuaca panas di wilayah rawan karhutla = jangan membakar), dan sinyal itu dihitung kode, bukan AI. Asisten memakai fakta yang sama untuk pertanyaan tentang risiko tempat tinggal, Latihan Siaga mendahulukan skenario untuk bahaya bertingkat tinggi, dan Kartu Siaga mencetak fakta risiko tingginya. Ini saran persiapan, bukan peta risiko resmi: kondisi tepat di sekitar rumah (sungai kecil, tebing) tidak terlihat, jadi pertanyaan swa-penilaian tetap dipakai, dan peta resmi tetap InaRISK BNPB serta peta Kawasan Rawan Bencana PVMBG.</p>
              <p className={P}><strong>Titik panas.</strong> SIGAP menghitung deteksi anomali panas satelit NASA FIRMS dalam 7 hari terakhir di radius 50 km dari lokasi Anda. Deteksi berkepercayaan rendah dibuang, deteksi ganda dari dua satelit digabung, dan titik panas hanya indikasi, bukan kepastian kebakaran atau luas lahan terbakar. Tingkat waspada baru muncul bila titik panas banyak dan tiga hari ke depan diprakirakan kering; di luar provinsi rawan karhutla (mis. kota besar, tempat titik panas sering berasal dari pembakaran sampah atau industri) peringatan baru tampil bila jumlahnya jauh lebih banyak. PM2.5 dari model global beresolusi kasar hanya menjadi waspada bila ada titik panas di sekitar; selain itu paling tinggi perhatikan, dengan catatan bahwa angkanya dapat berbeda dari stasiun ISPU. Suhu terasa berasal dari Open-Meteo dan ambang 41°C mengacu pada kriteria Heat Advisory NWS/NOAA; BMKG belum menetapkan kategori panas resmi, jadi ini indikator SIGAP.</p>
              <p className={P}><strong>Musim ini</strong> memakai pola bulanan dari PENGAMATAN (reanalisis ERA5 periode normal standar WMO 1991-2020, bukan simulasi model) untuk menunjukkan ciri tiga bulan ke depan: puncak hujan lebat, puncak hari sangat panas, bulan kering (hujan di bawah 60 mm menurut kriteria BMKG), dan musim rawan karhutla. Pola rata-rata bisa menyesatkan pada tahun ekstrem, jadi tiap bulan diberi catatan bila El Niño atau La Niña membuat tahun ini menyimpang. Permintaan pengamatan 30 tahun jauh lebih ringan daripada proyeksi 60 tahun dua model, dan proyeksi baru diminta saat tab Rumah &amp; masa depan dibuka, sehingga tab lain tetap berfungsi walau kuota harian penyedia data habis.</p>
              <p className={P}>Server mengambil suhu maksimum dan curah hujan harian 1991-2050 untuk grid sekitar 25 km di lokasi Anda dari dua model iklim global resolusi tinggi (CMIP6 HighResMIP, skenario emisi tinggi, dikoreksi bias terhadap ERA5). Kode lalu menghitung rata-rata per tahun untuk tiga periode 20 tahun (1991-2010, 2011-2030, 2031-2050): rata-rata suhu siang, hari 35&deg;C atau lebih, hari sangat panas (di atas persentil 95 suhu maksimum 1991-2010 di lokasi itu), curah hujan tahunan, hari hujan ekstrem (di atas persentil 99 hari hujan 1991-2010), dan kemarau terpanjang (hari berturut-turut dengan hujan di bawah 1 mm). Angka utama adalah rata-rata kedua model; rentang model ditampilkan sebagai ukuran ketidakpastian.</p>
              <p className={P}>Dari data itu kode menyusun <strong>Kalender Risiko</strong> 12 bulan (hari sangat panas, hari hujan ekstrem, dan curah hujan per bulan) serta <strong>Uji Ketahanan Rumah</strong>: berapa hari air simpanan Anda cukup dibanding hari air perlu ditutup, dan tingkat risiko panas serta hujan lebat untuk rumah Anda. Semua angka, tingkat, dan efek tiap tindakan dihitung kode di perangkat Anda dan bisa diuji.</p>
              <p className={P}><strong>Keandalan data: tetap tampil di semua lokasi.</strong> Penyedia utama (Open-Meteo) gratis, tetapi membatasi pemakaian harian untuk semua pengguna. Karena itu setiap tab punya sumber cadangan yang kredibel dan tanpa kuota harian, dipakai otomatis begitu penyedia utama menolak (penyedia yang menolak tidak dihubungi lagi selama 30 menit, jadi pengguna tidak menunggu): <em>Minggu ini</em> memakai prakiraan MET Norway (institut meteorologi Norwegia, sekitar 9 hari) dan hujan 30 hari terakhir NASA POWER; <em>Musim ini</em> dan catatan kemarau memakai pengamatan harian NASA POWER 1991-2020 dengan definisi metrik yang sama; <em>Rumah &amp; masa depan</em> memakai metode delta, yaitu pengamatan NASA POWER di lokasi Anda (1991 sampai tahun lalu) ditambah pemanasan yang diproyeksikan ansambel puluhan model CMIP6 untuk Indonesia dari World Bank Climate Change Knowledge Portal (skenario SSP5-8.5; median, dengan rentang persentil 10-90). Suhu siang 2031-2050 dipatok ke rata-rata 1991-2010 ditambah pemanasan itu, sedangkan pola harian (termasuk kemarau El Niño 2015, 2019, dan 2023) diambil dari 20 tahun pengamatan terakhir. Proyeksi kota utama juga bisa dihitung sebelumnya dan disimpan di aplikasi. Setiap kali data cadangan dipakai, halaman menyebut sumbernya dan keterbatasannya.</p>
              <p className={P}><strong>Acuan waktu.</strong> Angka utama di layar memakai periode saat ini (2011-2030), yang mencakup tahun ini. Periode 2031-2050 ditampilkan sebagai arah tren (&ldquo;10-25 tahun lagi&rdquo;), karena tandon, atap, dan saluran air dipakai selama itu; tingkat risiko dan urutan tindakan ikut mempertimbangkannya. Model iklim hanya andal sebagai rata-rata 20 tahun, jadi SIGAP tidak menampilkan angka untuk tahun tertentu. Untuk perkiraan musim tahun berjalan, SIGAP menautkan <a href="https://www.bmkg.go.id/iklim/prakiraan-musim.bmkg" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline underline-offset-2">Prediksi Musim BMKG</a> tanpa menyalin angkanya.</p>
              <p className={P}><strong>Yang sudah terjadi.</strong> Sebagai pembanding, SIGAP menampilkan kemarau terpanjang yang tercatat dalam 5 tahun penuh terakhir di grid yang sama, dari data reanalisis ERA5 (Open-Meteo, ambang yang sama: hujan di bawah 1 mm). Angka ini tidak mengubah hitungan; bila kemarau nyata lebih panjang dari proyeksi tahun terburuk saat ini (selisih lebih dari 15 persen atau 3 hari), layar menyarankan agar angka proyeksi dianggap batas bawah. Karena &ldquo;tahun terburuk dalam 20 tahun&rdquo; bergantung pada satu tahun ekstrem, perubahan kemarau 2031-2050 yang tidak lebih dari 10 persen (paling sedikit 3 hari) ditampilkan sebagai &ldquo;tidak berubah berarti&rdquo;, bukan sebagai tren.</p>
              <p className={P}><strong>Penasihat Keputusan</strong> memilih tindakan dari katalog tetap ({KATALOG.length} tindakan). Urutan awal dihitung kode dan tampil tanpa AI. Bila Anda menekan &ldquo;Sesuaikan dengan AI&rdquo;, AI menerima hasil uji rumah (tanpa koordinat, nama, atau kontak) dan kendala yang Anda tulis, lalu memilih 2-3 id tindakan dari katalog dan menulis alasan serta langkah pertama. Kode membuang id di luar katalog, menolak keluaran yang memuat angka di luar data, rupiah, atau kalimat ramalan pasti, lalu menghitung sendiri efek tiap tindakan; bila gagal, urutan dari kode dipakai. Harga tidak ditampilkan karena berbeda di tiap daerah.</p>
              <details className="mt-4 rounded-2xl border border-border p-4 text-sm">
                <summary className="cursor-pointer font-semibold">Asumsi Siaga Iklim (nilai awal, perlu verifikasi)</summary>
                <ul className="mt-3 list-disc space-y-1.5 pl-5 leading-relaxed">
                  <li>Kebutuhan air dasar {LITER_PER_ORANG_HARI} liter per orang per hari (mengacu pada standar kemanusiaan Sphere; belum diverifikasi tim).</li>
                  <li>Bulan kering: hujan di bawah {AMBANG_BULAN_KERING_MM} mm per bulan; bila tidak ada, tiga bulan terkering di bawah rata-rata ditandai &ldquo;paling kering&rdquo;.</li>
                  <li>Lama air sulit memakai pengalaman Anda ({HARI_GANGGUAN_AIR.hari} hari untuk &ldquo;beberapa hari&rdquo;, {HARI_GANGGUAN_AIR.minggu} hari untuk &ldquo;beberapa minggu&rdquo;), untuk saat ini; untuk 2031-2050 disesuaikan dengan perubahan kemarau terpanjang (dibatasi {BATAS_RASIO_KEMARAU.min} sampai {BATAS_RASIO_KEMARAU.maks} kali), dengan cadangan minimal {MIN_HARI_CADANGAN_AIR} hari. Selama soal air belum dijawab, SIGAP tidak menebak: hanya cadangan dasar {MIN_HARI_CADANGAN_AIR} hari yang dihitung, dan ringkasan memakai temuan dari data iklim (panas atau hujan).</li>
                  <li>Tingkat panas: selisih hari sangat panas per tahun di bawah {SELISIH_PANAS.sedikit} = aman, di atas {SELISIH_PANAS.banyak} = waspada, naik satu tingkat bila ada anggota rentan atau atap seng.</li>
                  <li>Tingkat hujan lebat: selisih hari hujan ekstrem di bawah {SELISIH_HUJAN.sedikit} = aman, di atas {SELISIH_HUJAN.banyak} = waspada, naik satu tingkat bila rumah pernah tergenang.</li>
                  <li>Tingkat air: kekurangan lebih dari {KURANG_AIR_WASPADA_HARI} hari = waspada. Skenario &ldquo;hemat air&rdquo; mengandaikan pemakaian turun {HEMAT_AIR_PERSEN} persen; itu skenario hitungan, bukan janji hasil.</li>
                  <li>Puncak bulan: tiga bulan tertinggi yang melewati nilai minimum ({MIN_PUNCAK.panas} hari panas, {MIN_PUNCAK.hujan} hari hujan ekstrem).</li>
                </ul>
              </details>
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
                  ["Simulasi yang lulus di Simulator Bencana AI", 2],
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
                <li>Peta: &copy; kontributor OpenStreetMap (ODbL), ditampilkan dengan Leaflet (BSD-2-Clause).</li>
                <li>Kode wilayah: dataset cahyadsn/wilayah (MIT), berdasarkan Kepmendagri No 300.2.2-2138 Tahun 2025.</li>
                <li>Panduan: BNPB, BAKORNAS PB, Kemenkes, BMKG, dan Kementerian ESDM (daftar lengkap di bagian 3).</li>
                <li>Perangkat lunak terbuka: Next.js, React, Tailwind CSS, Motion, Zustand, TanStack Query, Zod, Recharts, Lucide, dan qrcode. Daftar dan versinya ada di berkas docs/attribution.md di repositori.</li>
              </ul>
              <h3 id="kredit-foto" className="mt-6 text-lg font-bold">Kredit foto</h3>
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
