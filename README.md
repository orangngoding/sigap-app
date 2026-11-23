# SIGAP

**SIGAP (Siaga dan Tanggap Bencana)** adalah aplikasi web kesiapsiagaan bencana untuk keluarga di Indonesia. Alurnya:
1. Pengguna memilih lokasi sampai tingkat kelurahan/desa.
2. Pengguna mengisi profil rumah tangga.
3. SIGAP menyusun Rencana Siaga, daftar isi Tas Siaga, dan Kartu Siaga yang bisa dicetak.
4. Mode Darurat bisa dibuka tanpa internet.

Panduan keselamatan bersumber dari dokumen resmi BNPB, BMKG, Badan Geologi, dan Kemenkes, dan setiap tindakan menautkan sumbernya. Data cuaca, gempa, dan iklim diambil langsung dari BMKG serta penyedia data terbuka.

**Subtema IT RUSH 2026:** Mitigasi Bencana dan Perubahan Iklim.

| | |
|---|---|
| Website | https://sigap-app-itrush.vercel.app |
| Video demo | _Tautan menyusul_ |
| Repository | https://github.com/orangngoding/sigap-app |
| Akun demo | Tidak diperlukan. SIGAP dipakai tanpa daftar akun; semua data pribadi tersimpan di perangkat pengguna. Data contoh tersedia lewat tombol "Coba dengan data contoh" di Beranda (`/rencana?contoh=1`). |

> SIGAP bukan sistem peringatan dini resmi dan tidak memprediksi bencana. Ikuti selalu arahan BPBD, BMKG, dan petugas berwenang. Dalam keadaan darurat hubungi **112**.

## Daftar isi

- [Fitur](#fitur)
- [Penggunaan AI dalam fitur](#penggunaan-ai-dalam-fitur)
- [Struktur situs dan navigasi](#struktur-situs-dan-navigasi)
- [Metodologi singkat](#metodologi-singkat)
- [Teknologi](#teknologi)
- [Menjalankan](#menjalankan)
- [Variabel lingkungan](#variabel-lingkungan)
- [Rute API](#rute-api)
- [Struktur folder](#struktur-folder)
- [Keamanan dan privasi](#keamanan-dan-privasi)
- [Penggunaan AI coding assistant, template, dan aset open-source](#penggunaan-ai-coding-assistant-template-dan-aset-open-source)
- [Tim pengembang](#tim-pengembang)

## Fitur

Sembilan bahaya dicakup: banjir, longsor, gempa bumi, cuaca ekstrem, tsunami, kekeringan, kebakaran hutan dan lahan (karhutla), gunung api, serta gelombang tinggi dan abrasi.

### Beranda dan lokasi

| Fitur | Rute | Keterangan |
|---|---|---|
| Beranda | `/` | **Briefing Siaga Hari Ini**: ringkasan cuaca, peringatan dini, dan gempa BMKG untuk lokasi pengguna. Tingkat perhatian (Tenang, Perhatikan, Waspada) dihitung kode, lalu AI merangkumnya menjadi 3 tindakan hari ini yang disesuaikan dengan keluarga; ada cadangan templat bila AI tidak tersedia. Halaman ini juga memuat **Risiko teratas** di lokasi dan kartu **Lanjutkan rencana** berisi kemajuan dan skor kesiapsiagaan. Pengguna yang sudah punya data mendapat tampilan Beranda yang lebih ringkas di HP. |
| Lokasi | `/lokasi` | Pengguna memilih provinsi sampai kelurahan/desa (38 provinsi, 514 kab/kota, data wilayah Kemendagri) atau memakai lokasi perangkat. Titik kelurahan diambil dari koordinat yang menyertai prakiraan BMKG, dan peta Leaflet memperbesar ke tingkat kelurahan. Posisi perangkat bisa ditampilkan di peta tetapi tidak disimpan. |
| Profil Risiko Lokasi | `/lokasi`, `/rencana` | 9 bahaya dinilai untuk titik lokasi dari data terbuka: gunung api (Smithsonian GVP), gempa (USGS sejak 1976), runup tsunami (NOAA NCEI), garis pantai (Natural Earth), lereng dan ketinggian (SRTM), pola iklim, dan titik panas (NASA FIRMS). Setiap tingkat disertai angka dan sumbernya, dan bahaya yang disarankan bisa langsung dimasukkan ke rencana. |
| Cuaca dan data wilayah | `/lokasi` | Satu kartu Cuaca menggabungkan cuaca per jam (Open-Meteo, cadangan MET Norway: kondisi kini, 24 jam hari ini sampai lusa, peluang hujan, UV, angin) dengan prakiraan resmi BMKG per 3 jam. Peringatan dini cuaca BMKG tampil di atasnya. Kartu lain memuat gempa terkini BMKG beserta riwayatnya, tren hari hujan lebat tahunan, serta tautan InaRISK dan kanal resmi per bahaya. |

### Rencana Siaga

| Fitur | Rute | Keterangan |
|---|---|---|
| Profil keluarga | `/rencana/profil` | Wizard 4 langkah: bahaya (disarankan dari Profil Risiko Lokasi), keluarga (jumlah anggota, lansia, balita, ibu hamil/menyusui, disabilitas, obat rutin, hewan peliharaan), rumah dan kondisi (jenis bangunan, lantai, kendaraan, persediaan, titik kumpul, kontak darurat), lalu ringkasan. Menekan **Susun Rencana Siaga** setelah mengubah profil langsung memperbarui rencana dan Tas Siaga. |
| Rencana Siaga | `/rencana` | Empat tab: Ringkasan, Tindakan, Tas Siaga, dan Bagikan. Tindakan dikelompokkan sebelum, saat, dan sesudah per bahaya. Rencana disusun AI dari potongan panduan resmi (KB), dengan cadangan templat tanpa AI yang langsung tersedia. Fakta Profil Risiko Lokasi (tanpa koordinat) ikut dikirim ke AI, dan bahaya berisiko tinggi yang belum ada di rencana ditandai. Rencana disusun ulang otomatis bila profil atau lokasi berubah. |
| Tas Siaga dan skor | `/rencana?tab=tas` | Jumlah barang (air, makanan, obat, perlengkapan bayi, dan lainnya) dihitung kode dari profil keluarga dan lama persediaan. Checklist dan skor kesiapsiagaan tersimpan di perangkat. |
| Pengingat kedaluwarsa | `/rencana?tab=tas` | Tanggal kedaluwarsa air, makanan, obat, dan baterai dicatat dan diperingatkan di Rencana dan Beranda. Pengguna bisa mengunduh pengingat kalender (.ics) seminggu sebelum kedaluwarsa, ditambah pemeriksaan tiap 3 bulan. |
| Bagikan ke keluarga | `/rencana?tab=bagikan` | Ringkasan rencana (112, titik kumpul, langkah saat kejadian, isi tas) dikirim lewat WhatsApp atau disalin sebagai teks. Nomor kontak tidak ikut. |
| Siapkan Mode Darurat | `/rencana?tab=bagikan` | Dikerjakan selagi tenang: mengisi **info medis untuk penolong** (nama panggilan, golongan darah, alergi, penyakit, catatan; hanya tersimpan di perangkat) dan **memasang SIGAP di layar utama** agar Mode Darurat satu ketukan dan tetap terbuka tanpa internet. |
| Kartu Siaga | `/rencana/kartu` | Satu halaman A4/A5 hitam putih: bahaya dan fakta risiko, nomor darurat, kontak keluarga, titik kumpul, tindakan kunci, dan isi tas ringkas. Kode QR beserta alamat tertulis mengarah ke Mode Darurat (`sigap-app-itrush.vercel.app/darurat`). Kartu bisa dicetak atau diunduh sebagai PDF yang dibuat di perangkat. |
| Cetak rencana lengkap | `/rencana/cetak` | Dokumen A4 berisi identitas, risiko, nomor penting, tindakan per bencana, dan Tas Siaga, untuk dicetak atau disimpan sebagai PDF. |
| Rencana untuk keluarga lain | `/rencana/keluarga` | Ketua RT, kader, atau kerabat bisa menyusun rencana terpisah untuk banyak keluarga dari satu perangkat. Tiap keluarga punya lokasi, profil, rencana, dan Kartu Siaga sendiri, dan pengguna berganti keluarga lewat pemilih keluarga. Spanduk penanda tampil saat yang dibuka bukan keluarga sendiri. Mode Darurat tetap menampilkan keluarga pemilik perangkat. |

### Siaga Iklim

| Fitur | Rute | Keterangan |
|---|---|---|
| Minggu ini | `/iklim` | Prakiraan 16 hari (Open-Meteo) dan PM2.5 (CAMS) diubah kode menjadi sinyal hujan lebat, panas berbahaya, hari kering, cuaca mudah terbakar, dan kualitas udara (kategori ISPU), lengkap dengan tanggal dan tindakan. Tab ini juga memuat titik panas satelit NASA FIRMS di sekitar lokasi. AI menyusun rencana 7 hari keluarga, dan pagar kode memastikan angka serta tanggalnya hanya berasal dari data. |
| Musim ini | `/iklim?tab=musim` | Kondisi iklim tahun berjalan: status El Niño/La Niña dan IOD (NOAA), dampaknya untuk Indonesia, dan tautan Prediksi Musim BMKG. Tab ini juga menunjukkan ciri tiga bulan ke depan dan bulan rawan sepanjang tahun dari pengamatan ERA5 1991-2020, dengan catatan bila tahun ini menyimpang. |
| Rumah & masa depan | `/iklim?tab=jangka` | Proyeksi iklim lokasi (CMIP6 HighResMIP lewat Open-Meteo Climate API) diubah menjadi tiga alat:<br>• **Kalender Risiko** 12 bulan.<br>• **Uji Ketahanan Rumah**: membandingkan air simpanan dengan lama air perlu ditutup, serta menilai tingkat panas dan hujan lebat.<br>• **Penasihat Keputusan**: urutan tindakan dan efeknya dihitung kode, lalu AI menyesuaikan pilihan dengan kendala pengguna (lahan, anggaran, status rumah) dalam batas pagar.<br>Pengingat kalender .ics juga tersedia. |

### Simulasi dan Asisten

| Fitur | Rute | Keterangan |
|---|---|---|
| Simulator Bencana AI | `/latihan` | Tiga tahap:<br>1. **Uji awal**: 5 soal acak dari bank 147 soal tim.<br>2. **Simulasi keputusan**: disusun AI untuk keluarga ini dari kondisi rumah, Profil Risiko Lokasi, prakiraan nyata minggu ini, dan konsep yang keliru di uji awal.<br>3. **Rapor**: kunci jawaban, nilai keputusan, dan riwayat per bahaya.<br>Kode memvalidasi setiap keluaran AI: tepat satu tindakan terbaik dan minimal satu tindakan berbahaya per langkah, kutipan hanya dari panduan yang diberikan, serta tanpa ramalan atau jaminan. Kode juga mengacak urutan pilihan. Bila validasi gagal, simulasi memakai 9 skenario buatan tim. Ada tiga tingkat: dasar, menantang, dan bencana beruntun. |
| Asisten SIGAP | `/tanya` dan tombol melayang | Asisten AI yang memakai kondisi BMKG terkini di lokasi pengguna, ringkasan rencana keluarga, Profil Risiko Lokasi, dan KB. Jawaban dari panduan resmi disertai kutipan sumber. Fiturnya: banyak sesi percakapan, ubah dan kirim ulang pertanyaan, buat ulang jawaban, dikte suara bahasa Indonesia, jawaban dibacakan, dan saran pertanyaan lanjutan. **Jelaskan Peringatan**: teks peringatan BMKG yang ditempel disederhanakan tanpa menambah fakta. Asisten menolak memberi prediksi, saran medis, dan lokasi evakuasi spesifik. |

### Mode Darurat

| Fitur | Rute | Keterangan |
|---|---|---|
| Mode Darurat | `/darurat` | Kontras tinggi dengan tombol besar, dan tetap terbuka tanpa internet setelah pernah dibuka (service worker). Isinya:<br>• Nomor darurat (112, 110, 113, 115, 119) yang langsung bisa ditelepon.<br>• Langkah per bahaya yang dikelompokkan per keadaan dan bisa dilipat, dengan panduan sesudah kejadian, panduan langkah demi langkah, dan tombol **Bacakan** bersuara bahasa Indonesia.<br>• **Butuh pertolongan pertama?**: 7 situasi kritis, termasuk RJP dengan metronom 110 per menit, kebakaran, bau gas, dan terpisah dari keluarga.<br>• **Kabari keluarga** lewat SMS ("Saya selamat" atau "Butuh bantuan") beserta lokasi GPS.<br>• **Info medis untuk penolong**, hanya tersimpan di perangkat.<br>• Alat darurat: layar senter dan peluit SOS.<br>Saat offline, panel menjelaskan apa yang tetap bisa dipakai dan apa yang perlu internet. Bahaya diurutkan dari risiko tertinggi di lokasi. |

### Pustaka dan lainnya

| Fitur | Rute | Keterangan |
|---|---|---|
| Artikel | `/pustaka`, `/pustaka/[slug]` | 11 artikel edukasi yang dibangun dari KB, bisa disaring per kategori dan bahaya, dicari, dan dicetak. |
| Berita bencana | `/pustaka/berita` | Berita 7 hari terakhir dari Google Berita dan RSS media nasional, dengan foto dari penerbit. Kode menyaring agar hanya peristiwa bencana di Indonesia yang tampil, menggabungkan judul kembar, dan memberi label jenis bencana. Peringatan resmi GDACS untuk Indonesia juga ditampilkan. |
| Berita cuaca dan iklim | `/pustaka/cuaca` | Berita prakiraan dan peringatan BMKG, musim, El Niño/La Niña, suhu panas, dan kualitas udara. |
| Data & privasi | `/data-saya` | Ringkasan data di perangkat. Pengguna bisa mengunduh cadangan (JSON), mengirimnya lewat menu Bagikan ponsel, memulihkannya di perangkat lain, atau menghapus semua data (termasuk info medis, Simulasi, dan Siaga Iklim). Halaman ini juga memuat **Pasang SIGAP sebagai aplikasi (PWA)**: tombol pasang satu ketukan bila peramban mendukung, penanda "sudah terpasang", dan panduan per platform (Android, iPhone/iPad, desktop). Tanpa toko aplikasi dan tanpa akun. |
| Metodologi | `/metodologi` | Cara kerja, sumber data, batasan, peran AI, rumus skor, privasi, pemasangan dan mode luring, serta statistik KB (323 potongan panduan). |

## Penggunaan AI dalam fitur

SIGAP memakai **Google Gemini** (bawaan `gemini-3.5-flash-lite`, lewat REST API tanpa SDK) sebagai komponen fungsional. Penyedia kedua yang kompatibel OpenAI bisa dipasang sebagai cadangan. Prinsipnya:
- **Angka dari kode, bukan AI.** Skor, tingkat perhatian, jumlah barang Tas Siaga, sinyal cuaca, dan efek tindakan iklim selalu dihitung kode. AI hanya menyusun dan merangkai teks.
- **Hanya dari sumber yang diberikan.** AI hanya boleh memakai potongan panduan resmi yang diberikan, dan setiap kutipan diperiksa kode.
- **Selalu ada cadangan.** Setiap fitur tetap berjalan tanpa AI memakai templat atau skenario buatan tim. Batas harian (`AI_DAILY_BUDGET`) mencegah biaya berlebih.
- **Tanpa data pribadi.** Nama, nomor telepon, titik kumpul, catatan, dan koordinat tidak pernah dikirim ke AI.

| Fitur | Peran AI | Pagar dari kode | Tanpa AI |
|---|---|---|---|
| Rencana Siaga | Menyusun tindakan sesuai keluarga dari potongan KB | Skema keluaran, id sumber harus ada di KB | Templat dari KB |
| Briefing Siaga Hari Ini | Merangkum data BMKG menjadi ringkasan dan 3 tindakan | Tingkat perhatian dihitung kode | Templat ringkasan |
| Asisten SIGAP | Menjawab pertanyaan dengan konteks lokasi, rencana, dan KB | Menolak prediksi, saran medis, dan lokasi evakuasi | Kutipan panduan KB yang paling cocok |
| Jelaskan Peringatan | Menyederhanakan teks peringatan BMKG | Tidak boleh menambah fakta atau angka baru | Teks resmi tetap tampil dengan tindakan umum |
| Simulator Bencana AI | Menyusun skenario keputusan yang menyasar kekeliruan pengguna | Validasi struktur, kutipan, angka, dan bahasa terlarang | 9 skenario tim |
| Siaga Iklim | Rencana 7 hari dan penyesuaian urutan tindakan adaptasi | Angka dan tanggal hanya dari data; id katalog | Urutan dari kode |

Rincian pagar pengaman dan metode evaluasinya ada di [docs/ai-evaluation.md](docs/ai-evaluation.md), dengan hasil terbaru di [docs/ai-evaluation-hasil.md](docs/ai-evaluation-hasil.md).

## Struktur situs dan navigasi

Bilah atas desktop memuat Lokasi, Siaga Iklim, Rencana, Simulasi, Asisten, dan menu tarik-turun Pustaka. Menu bawah HP memuat Beranda, Lokasi, Siaga Iklim, Rencana, dan menu lanjutan untuk Simulasi, Asisten, Pustaka, Data & privasi, dan Metodologi. Footer mengelompokkan tautan menjadi **Fitur** dan **Informasi**.

| Kelompok | Halaman |
|---|---|
| **Fitur utama** | Beranda `/`, Lokasi `/lokasi`, Siaga Iklim `/iklim`, Rencana `/rencana` (profil, kartu, cetak, keluarga), Simulasi `/latihan`, Asisten `/tanya` |
| **Darurat** | Mode Darurat `/darurat`, juga halaman awal aplikasi yang sudah dipasang (`start_url` manifest PWA) |
| **Informasi** | Pustaka `/pustaka` (artikel, berita bencana, berita cuaca dan iklim), Metodologi `/metodologi`, Data & privasi `/data-saya` |

Alur pengguna baru: **Lokasi → Profil keluarga → Rencana Siaga (Tas Siaga, Kartu Siaga) → Siapkan Mode Darurat → Latihan**. Semua tahap memakai data yang sama dari penyimpanan di perangkat, jadi pengguna bisa berhenti dan melanjutkan kapan saja lewat kartu **Lanjutkan rencana** di Beranda.

## Metodologi singkat

Rincian lengkap ada di halaman [`/metodologi`](https://sigap-app-itrush.vercel.app/metodologi). Ringkasannya, setiap saran SIGAP melewati lima langkah:

1. **Data resmi.** BMKG, BNPB, Kemenkes, Badan Geologi, dan penyedia data terbuka (Open-Meteo, NASA, NOAA, USGS).
2. **Kode menghitung.** Sinyal bahaya, tingkat perhatian, skor kesiapsiagaan, dan jumlah isi Tas Siaga dihitung oleh kode yang bisa diuji, bukan ditebak AI.
3. **AI merangkai.** Gemini hanya menyusun bahasa dari potongan panduan resmi dan sinyal yang sudah dihitung.
4. **Penyaring memeriksa.** Kode memvalidasi skema, kutipan sumber, angka, dan menolak kalimat ramalan atau jaminan. Bila gagal, dipakai templat tanpa AI.
5. **Pengguna memutuskan.** SIGAP adalah alat bantu persiapan, bukan peringatan dini resmi.

Rumus skor: `Skor = 100 × bobot butir yang dicentang ÷ bobot semua butir`. Butirnya tindakan Sebelum dan Saat, item Tas Siaga, dan simulasi yang lulus (nilai 70 ke atas). Panduan Sesudah tidak dihitung. Basis pengetahuan berisi 323 potongan panduan bersumber (halaman dan tanggal akses), dan bank soal uji awal berisi 147 soal tim.

Prinsip rekayasa: **offline-first** untuk bagian darurat (service worker dan aset terkemas), **local-first** untuk data pribadi (localStorage, tanpa akun), dan **degradasi bertahap** untuk data luar (setiap sumber punya cadangan, dan kartu tidak pernah menyatakan "aman" bila umpan resmi tidak terbaca).

## Teknologi

- **Kerangka:** Next.js 16 (App Router, Cache Components, Turbopack), React 19, TypeScript 5
- **Tampilan:** Tailwind CSS 4, Radix UI dengan pola shadcn/ui, ikon lucide-react, animasi Motion (menghormati pengaturan "kurangi gerakan"), huruf Plus Jakarta Sans
- **Data dan state:** Zustand (persist ke localStorage), TanStack Query, Zod 4 untuk validasi input API dan data tersimpan
- **Peta dan grafik:** Leaflet (OpenStreetMap), Recharts
- **Dokumen:** jsPDF dan qrcode untuk Kartu Siaga PDF
- **AI:** Gemini lewat REST API langsung; pencarian KB memakai BM25 buatan sendiri, tanpa embedding dan tanpa layanan eksternal
- **Luring dan PWA:** service worker manual (`public/sw.js`) untuk Mode Darurat, manifest PWA (`src/app/manifest.ts`, `start_url` `/darurat`), dan hook `use-pasang-pwa` untuk tombol pasang (`beforeinstallprompt`), deteksi mode terpasang, dan panduan per platform
- **Suara:** Web Speech API peramban, untuk dikte dan Bacakan berbahasa Indonesia
- **Uji dan CI:** uji unit dengan `tsx` dan `node:assert`, ESLint, pemeriksaan tipe, dan GitHub Actions (`.github/workflows/ci.yml`)
- **Hosting:** Vercel

## Menjalankan

Prasyarat: Node.js 20.9 atau lebih baru (CI memakai Node 22) dan npm.

```bash
git clone https://github.com/orangngoding/sigap-app.git
cd sigap-app
npm install
cp .env.example .env.local   # lalu isi GEMINI_API_KEY (opsional)
npm run dev
```

Buka http://localhost:3000. Tanpa `GEMINI_API_KEY`, semua fitur tetap berjalan memakai cadangan tanpa AI. Service worker Mode Darurat hanya aktif di build produksi (`npm run build` lalu `npm start`).

### Perintah

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Server pengembangan |
| `npm run build` lalu `npm start` | Build dan jalankan versi produksi |
| `npm run lint` / `npm run typecheck` | ESLint dan pemeriksaan tipe |
| `npm run test:unit` | Seluruh uji unit (30 berkas, tanpa jaringan) |
| `npm run validate:content` | Validasi skema dan status konten KB |
| `npm run build:content` | Bangun ulang indeks KB dan Pustaka ke `src/generated/` setelah mengubah `content/` |
| `npm run eval:ai` | Evaluasi AI dengan model sungguhan; hasilnya ditulis ke `docs/ai-evaluation-hasil.md` |
| `npm run bangun:iklim-kota` | Hitung proyeksi iklim bawaan kota-kota utama ke `src/lib/data/proyeksi-kota.json`. Jalankan setelah kuota harian Open-Meteo pulih (07.00 WIB); perintah ini bisa dilanjutkan dan melewati kota yang sudah ada. |
| `npm run bangun:data-risiko` | Bangun ulang data statis Profil Risiko Lokasi di `src/lib/risiko/data/`. Bila jaringan Node bermasalah, unduh berkasnya dengan curl lalu jalankan dengan `--lokal <folder>`. |

## Variabel lingkungan

Lihat [`.env.example`](.env.example). Simpan nilai asli hanya di `.env.local` (diabaikan git) atau di dashboard Vercel. Semua kunci hanya dibaca di server.

| Variabel | Wajib | Keterangan |
|---|---|---|
| `GEMINI_API_KEY` | Tidak | Kunci dari Google AI Studio. Kosong berarti mode tanpa AI. |
| `GEMINI_MODEL` | Tidak | Bawaan `gemini-3.5-flash-lite`. |
| `GEMINI_PENCARIAN` | Tidak | `1` membuat Asisten memakai pencarian Google (grounding). Perlu kuota grounding; tanpa kuota, Asisten menjawab tanpa pencarian. |
| `LLM2_BASE_URL`, `LLM2_API_KEY`, `LLM2_MODEL` | Tidak | Penyedia kedua (kompatibel OpenAI, wajib https) bila model utama sibuk atau gagal. |
| `AI_DAILY_BUDGET` | Tidak | Batas panggilan AI per hari, bawaan 200. Setelah habis, fitur memakai cadangan tanpa AI. |
| `NEXT_PUBLIC_SITE_URL` | Tidak | URL publik untuk kode QR Kartu Siaga, teks bagikan, dan metadata (`og:image`). Kosong berarti `https://sigap-app-itrush.vercel.app` di produksi. Nilai selalu dipaksa https, dan alamat `*.vercel.app` lama diganti domain produksi. |

**Jangan pernah meng-commit API key.** Kunci yang pernah ter-commit dianggap bocor dan harus dibuat ulang.

## Rute API

Semua rute ada di `src/app/api/`. Setiap rute memvalidasi input dengan Zod, membatasi ukuran body dan laju permintaan, menolak permintaan dari situs lain, dan hanya mengambil data dari host yang diizinkan.

| Rute | Metode | Fungsi | AI |
|---|---|---|---|
| `/api/rencana` | POST | Menyusun Rencana Siaga | Ya |
| `/api/briefing` | POST | Briefing Siaga Hari Ini | Ya |
| `/api/tanya` | POST | Asisten SIGAP | Ya |
| `/api/terjemah` | POST | Jelaskan Peringatan | Ya |
| `/api/simulasi` | POST | Simulator Bencana AI | Ya |
| `/api/rencana-pekan` | POST | Rencana 7 hari Siaga Iklim | Ya |
| `/api/keputusan-iklim` | POST | Penasihat Keputusan Siaga Iklim | Ya |
| `/api/adaptasi` | POST | Rencana adaptasi dari proyeksi iklim (tidak lagi dipanggil antarmuka; digantikan `/api/keputusan-iklim`) | Ya |
| `/api/cuaca` | GET | Prakiraan BMKG per 3 jam | Tidak |
| `/api/cuaca-jam` | GET | Cuaca per jam (Open-Meteo, cadangan MET Norway) | Tidak |
| `/api/gempa` | GET | Gempa terkini BMKG | Tidak |
| `/api/peringatan` | GET | Peringatan dini cuaca BMKG | Tidak |
| `/api/iklim` | GET | Tren hari hujan lebat tahunan | Tidak |
| `/api/siaga-pekan` | GET | Sinyal 16 hari Siaga Iklim | Tidak |
| `/api/klimatologi` | GET | Pola bulanan ERA5 1991-2020 | Tidak |
| `/api/proyeksi` | GET | Proyeksi iklim CMIP6 | Tidak |
| `/api/risiko-lokasi` | GET | Profil Risiko Lokasi | Tidak |
| `/api/berita` | GET | Berita bencana dan cuaca | Tidak |

## Struktur folder

```text
content/            Sumber konten: kb/ (potongan panduan per bahaya), pustaka/ (artikel), hazards/, demo/, kontak.json
scripts/            Validasi dan pembangunan konten, data wilayah, data risiko, proyeksi kota, evaluasi AI
src/app/            Halaman (App Router), rute API, metadata, gambar OpenGraph, manifest PWA
src/components/     Komponen per fitur: beranda, lokasi, risiko, rencana, kartu, iklim, latihan, simulasi,
                    tanya, darurat, pustaka, data-saya, metodologi, global (header, navigasi), ui
src/hooks/          Hook React (suara, penyusunan rencana, hidrasi store, risiko lokasi, keluarga, pasang PWA)
src/lib/            Logika: ai/ (penyedia, pagar, prompt), briefing/, data/ (BMKG, Open-Meteo, NASA, berita),
                    data-saya/ (cadangan dan pemulihan), darurat/, iklim/, kartu/ (isi dan PDF), keluarga/,
                    kb/ (pencarian BM25), latihan/, simulasi/,
                    preparedness/ (profil, skor), rencana/, risiko/, storage/ (penyaring data tersimpan),
                    ratelimit/, http/, geo/, situs.ts (URL publik)
src/stores/         Penyimpanan Zustand di perangkat (lokasi, profil, rencana, progres, tas, medis, keluarga, dll.)
src/types/          Tipe TypeScript bersama
src/generated/      Indeks hasil build:content (jangan diedit manual)
public/             Service worker (sw.js), logo, foto, dan data wilayah per provinsi (data/wilayah/)
tests/unit/         Uji unit
docs/               Arsitektur, evaluasi AI, atribusi, dan sumber data
```

## Keamanan dan privasi

- **Data di perangkat:** profil keluarga, kontak, titik kumpul, catatan, info medis, dan progres checklist disimpan hanya di perangkat pengguna (localStorage). Data yang dibaca kembali disaring dulu, sehingga data rusak tidak membuat halaman gagal dimuat.
- **Yang dikirim ke server:** hanya profil tanpa data pribadi (jumlah anggota, kelompok rentan, jenis bangunan, bahaya) dan nama wilayah, untuk menyusun rencana dan Briefing. Koordinat hanya dipakai server untuk menghitung jarak gempa dan risiko lokasi, dan tidak dikirim ke AI.
- **Kabari keluarga:** SMS dan lokasi GPS dikirim lewat aplikasi SMS di ponsel pengguna sendiri, bukan lewat server SIGAP.
- **Suara:** Bacakan berjalan di perangkat. Dikte diproses layanan pengenal suara bawaan peramban (pada Chrome milik Google), bukan server SIGAP.
- **Header keamanan di produksi:** Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, dan Permissions-Policy. Header `X-Powered-By` dimatikan.
- **Pemasangan aplikasi:** SIGAP dipasang lewat peramban (PWA), bukan toko aplikasi, sehingga tidak ada akun, pelacak, atau izin tambahan. Service worker hanya menyimpan halaman inti dan berkas statis; rute API dan data pribadi tidak pernah masuk cache-nya.
- **Menghapus data:** pengguna bisa menghapus seluruh datanya kapan saja di halaman Data & privasi.

## Penggunaan AI coding assistant, template, dan aset open-source

Sesuai ketentuan IT RUSH 2026, berikut seluruh bantuan pihak ketiga dalam pengembangan SIGAP.

### AI coding assistant

| | |
|---|---|
| Alat | **Claude Code** (Anthropic), dengan model Claude, dipakai di VS Code dan terminal |
| Dipakai untuk | Membantu menulis dan merapikan kode komponen, rute API, dan logika; mencari dan memperbaiki bug; audit tampilan di HP, tablet, dan desktop; audit keamanan (validasi input, sanitasi data, header); menulis uji unit; menguji halaman di peramban otomatis (Playwright); dan merapikan dokumentasi termasuk README ini |
| Tidak dipakai untuk | Menentukan arah produk dan pemilihan fitur, memilih dan memverifikasi isi panduan keselamatan dari dokumen resmi, serta keputusan akhir atas setiap perubahan. Semua itu dilakukan tim. |
| Kontrol mutu | Setiap perubahan ditinjau tim dan harus lulus uji unit, pemeriksaan tipe, lint, dan build di CI sebelum dirilis |

### AI di dalam produk

**Google Gemini** dipakai sebagai komponen fitur; rinciannya ada di bagian [Penggunaan AI dalam fitur](#penggunaan-ai-dalam-fitur). Isi yang disusun AI selalu diberi label di antarmuka ("Dibuat dengan bantuan AI dari panduan resmi"), dan rencana tanpa AI diberi label berbeda.

### Template, pustaka, dan aset

- **Template dan komponen:** komponen dasar dari Radix UI dan pola shadcn/ui (MIT). SIGAP tidak memakai template situs jadi.
- **Library open-source:** Next.js, React, Tailwind CSS, Zustand, TanStack Query, Zod, Motion, Leaflet, Recharts, jsPDF, qrcode, lucide-react, dan lainnya. Nama, versi, dan lisensinya ada di [docs/attribution.md](docs/attribution.md).
- **Foto:** Wikimedia Commons dengan lisensi bebas (domain publik, CC0, CC BY, CC BY-SA). Nama pembuat dan lisensi per foto tercantum di [docs/attribution.md](docs/attribution.md#foto) dan halaman Metodologi.
- **Data:** BMKG, BNPB, Badan Geologi, Kemenkes, Open-Meteo, CAMS, MET Norway, NASA (FIRMS, SRTM), NOAA, USGS, Smithsonian GVP, Natural Earth, GDACS, OpenStreetMap, dan data wilayah cahyadsn/wilayah (Kemendagri). Rinciannya ada di [docs/data-sources.md](docs/data-sources.md).
- **Konten panduan:** diparafrasekan dari dokumen resmi dan selalu menyebut sumber serta halamannya. Hak atas isinya tetap milik lembaga sumber.

## Dokumentasi lain

- [docs/architecture.md](docs/architecture.md): arsitektur aplikasi
- [docs/ai-evaluation.md](docs/ai-evaluation.md): pagar pengaman AI dan metode evaluasi
- [docs/data-sources.md](docs/data-sources.md): sumber data dan status verifikasi
- [docs/attribution.md](docs/attribution.md): atribusi konten, data, dan pustaka pihak ketiga

## Tim pengembang

SIGAP dikembangkan oleh tim empat orang dari IPB University untuk lomba IT RUSH 2026, subtema Mitigasi Bencana dan Perubahan Iklim.

| Nama | Perguruan tinggi | GitHub |
|---|---|---|
| Rasya Falahdia Sastra (Ketua) | IPB University | [@orangngoding](https://github.com/orangngoding) |
| Muhammad Abdan Syakuro | IPB University | [@AbdanSyakuroo](https://github.com/AbdanSyakuroo) |
| Muhammad Faisal Al Ikhwani | IPB University | [@Pesalll](https://github.com/Pesalll) |
| Haafizh 'Aalim Mardiyanto | IPB University | [@haafizham](https://github.com/haafizham) |

## Lisensi

Hak cipta kode sumber tetap milik tim. Konten panduan tetap milik lembaga sumbernya, dan foto mengikuti lisensi masing-masing; lihat [docs/attribution.md](docs/attribution.md).
