# SIGAP

**SIGAP** adalah aplikasi web kesiapsiagaan bencana untuk keluarga di Indonesia. Pengguna memilih lokasi, mengisi profil rumah tangga, lalu mendapat Rencana Siaga, daftar isi tas siaga, dan Kartu Siaga yang bisa dicetak. Semua panduan berasal dari sumber resmi (BNPB, BMKG, Badan Geologi, Kemenkes) dan setiap tindakan menautkan sumbernya.

**Subtema IT RUSH 2026:** Mitigasi Bencana dan Perubahan Iklim.

| | |
|---|---|
| Website | https://ISI-URL-VERCEL.vercel.app |
| Video demo | https://youtu.be/ISI-LINK-VIDEO |
| Repository | https://github.com/orangngoding/sigap-app |
| Akun demo | Tidak diperlukan: SIGAP dipakai tanpa daftar akun, semua data tersimpan di perangkat pengguna |

> SIGAP bukan sistem peringatan dini resmi dan tidak memprediksi bencana. Ikuti selalu arahan BPBD, BMKG, dan petugas berwenang. Dalam keadaan darurat hubungi **112**.

## Fitur

| Fitur | Rute | Keterangan |
|---|---|---|
| Briefing Siaga Hari Ini | `/`, `/lokasi` | Ringkasan cuaca, peringatan dini, dan gempa BMKG untuk lokasi pengguna, tingkat perhatian (Tenang/Perhatikan/Waspada) yang dihitung kode, dan 3 tindakan hari ini yang disesuaikan dengan keluarga; dirangkum AI dengan cadangan templat |
| Siaga Iklim | `/iklim` | Tiga rentang waktu dalam tab. **Minggu ini:** prakiraan 16 hari (Open-Meteo) dan PM2.5 (CAMS) diubah kode menjadi sinyal hujan lebat, panas berbahaya, hari kering, cuaca mudah terbakar (karhutla), dan kualitas udara (kategori ISPU), lengkap dengan tanggal dan tindakan; AI menyusun rencana 7 hari keluarga yang dijaga pagar angka dan tanggal. **Musim ini:** kondisi iklim tahun berjalan (status El Niño/La Niña dan IOD dari NOAA, dengan dampaknya untuk Indonesia dan tautan Prakiraan Musim BMKG), lalu ciri tiga bulan ke depan dan bulan rawan sepanjang tahun dari pola pengamatan ERA5 1991-2020 yang diberi catatan bila tahun ini menyimpang. **Minggu ini** juga memuat titik panas satelit NASA FIRMS untuk karhutla (jumlah di sekitar lokasi, terdekat, dan gambaran nasional). **Rumah & masa depan:** mengubah proyeksi iklim lokasi (CMIP6 HighResMIP lewat Open-Meteo Climate API) menjadi tindakan: Kalender Risiko 12 bulan (hari sangat panas, hujan lebat, bulan kering), Uji Ketahanan Rumah (air simpanan vs hari air perlu ditutup, tingkat panas dan hujan lebat, dari jawaban pengguna dan profil keluarga), dan Penasihat Keputusan: urutan tindakan dari katalog dihitung kode (efek pada air dihitung, bukan ditulis AI), AI menyesuaikan pilihan dengan kendala pengguna (lahan, anggaran, status rumah) dan dibatasi pagar (id katalog, angka dari data, tanpa rupiah), plus pengingat kalender .ics. Tanpa AI, urutan dari kode tetap tampil |
| Lokasi | `/lokasi` | Pilih provinsi sampai kelurahan (514 kab/kota) atau pakai lokasi perangkat; peta Leaflet . **Profil Risiko Lokasi**: 9 bahaya dinilai untuk titik lokasi dari data terbuka (gunung api Smithsonian GVP, gempa USGS sejak 1976, runup tsunami NOAA NCEI, garis pantai Natural Earth, lereng dan ketinggian SRTM, pola iklim, titik panas NASA FIRMS), tiap tingkat dengan angka dan sumber; bahaya yang disarankan bisa langsung dimasukkan ke rencana **Titik kelurahan/desa presisi** dari koordinat yang menyertai prakiraan BMKG (data wilayah Kemendagri), bukan pusat kab/kota; lokasi lama diperbarui otomatis sekali; peta memperbesar ke tingkat kelurahan dan bisa menampilkan posisi perangkat (tidak disimpan). **Cuaca sekarang per jam** untuk titik itu (Open-Meteo, cadangan MET Norway): kondisi kini, tiga jam ke depan, 24 jam penuh hari ini/besok/lusa, peluang hujan, terasa, UV, angin, terbit dan terbenam; semuanya dalam **satu kartu Cuaca** bersama prakiraan resmi BMKG (per 3 jam): peringatan hujan lebat BMKG di atas, ringkasan resmi per hari, dan label "BMKG" pada jam-jam yang dirilis BMKG; bila per jam gagal, kartu menampilkan prakiraan BMKG per 3 jam. |
| Profil wilayah | `/lokasi` | Prakiraan cuaca BMKG, gempa terkini, peringatan dini cuaca, tren hari hujan lebat tahunan, tautan InaRISK dan kanal resmi per bahaya |
| Profil keluarga | `/rencana/profil` | Anggota, kelompok rentan, bangunan, bahaya yang disiapkan; data pribadi tidak pernah dikirim ke server |
| Rencana Siaga | `/rencana` | Tindakan sebelum, saat, dan sesudah per bahaya; disusun AI dari KB, dengan cadangan templat tanpa AI. Langkah 1 wizard menyarankan bahaya dari Profil Risiko Lokasi; fakta risiko dikirim ke AI (tanpa koordinat) sehingga ringkasan menyebut fakta lokasi dan bahaya bertingkat tinggi diprioritaskan; dasbor menandai bahaya berisiko yang belum ada di rencana; Kartu Siaga mencetak fakta risiko tinggi |
| Tas siaga dan skor | `/rencana` | Jumlah dihitung kode dari profil; checklist dan skor kesiapsiagaan tersimpan di perangkat |
| Pengingat kedaluwarsa | `/rencana` | Tanggal kedaluwarsa air, makanan, obat, dan baterai; peringatan di Rencana dan Beranda; unduh pengingat kalender (.ics) seminggu sebelum kedaluwarsa plus pemeriksaan tiap 3 bulan |
| Bagikan ke keluarga | `/rencana` | Ringkasan rencana (112, titik kumpul, langkah saat kejadian, isi tas) lewat WhatsApp atau salin teks; nomor kontak tidak ikut |
| Rencana untuk keluarga lain | `/rencana/keluarga` | Pak RT, kader, atau kerabat bisa menyusun rencana terpisah untuk banyak keluarga dari satu perangkat (lokasi, profil, rencana, dan Kartu Siaga masing-masing), berganti lewat pemilih keluarga; spanduk lengket menandai saat yang dibuka bukan keluarga sendiri, dan teks "Anda" berubah menjadi nama keluarga itu. Mode Darurat tetap menampilkan keluarga pemilik perangkat |
| Simulator Bencana AI | `/latihan` | Inovasi utama AI dalam tiga tahap: (1) **uji awal** 5 soal acak dari bank 147 soal tim (soal berganti tiap sesi), untuk melihat pemahaman awal; (2) AI menyusun **simulasi keputusan** untuk keluarga ini (anggota rentan, jenis rumah, kendaraan, hewan), fakta Profil Risiko Lokasi, prakiraan nyata minggu ini, dan **konsep yang keliru di uji awal**, dari panduan KB resmi. **Kode memvalidasi** setiap keluaran (tepat satu tindakan terbaik dan minimal satu berbahaya per langkah, kutipan hanya id panduan yang diberikan, angka hanya dari data, tanpa ramalan, jaminan, atau tautan) dan mengacak urutan pilihan; penolakan dikirim balik ke model sebagai catatan perbaikan, gagal = skenario tim. Setiap pilihan dijelaskan akibat dan dasarnya; (3) **rapor**: hasil uji awal, nilai keputusan simulasi, kunci jawaban, dan riwayat per bahaya. Tiga tingkat: dasar, menantang (malam, listrik padam, sinyal lemah, anggota di luar rumah), dan **bencana beruntun** (gempa dan tsunami, hujan ekstrem dan banjir, kemarau dan karhutla). Riwayat tersimpan di perangkat |
| Kartu Siaga | `/rencana/kartu` | Satu halaman A4/A5, hitam putih, kode QR ke Mode Darurat; cetak atau unduh PDF yang dibuat di perangkat |
| Mode Darurat | `/darurat` | Nomor darurat dan langkah singkat per bahaya dengan tombol besar, bisa dibacakan, tetap terbuka tanpa internet setelah pernah dibuka. Langkah dikelompokkan per keadaan dan bisa dilipat (gempa: di dalam bangunan, di luar, di mobil, di dekat pantai; banjir; cuaca ekstrem), plus panduan langkah demi langkah. **Keadaan gawat sekarang?**: 7 situasi yang menentukan nyawa (terjebak reruntuhan, perdarahan, tidak sadar dan tidak bernapas dengan metronom RJP 110 per menit, kebakaran rumah, bau gas, arus banjir, terpisah dari keluarga), masing-masing dengan nomor yang tepat dan sumber resmi. **Kabari keluarga** lewat SMS ("Saya selamat" atau "Butuh bantuan") beserta lokasi GPS, ke kontak tersimpan dan/atau nomor lain yang diketik (tersimpan di perangkat, nomor kembar 08/+62 dikenali, format tautan SMS menyesuaikan Android dan iPhone). **Info medis untuk penolong** (hanya di perangkat). Bahaya diurutkan dari risiko tertinggi di lokasi |
| Asisten SIGAP | `/tanya` | Asisten AI yang sadar konteks: membaca kondisi BMKG terkini di lokasi pengguna bila pertanyaan menyangkut keadaan sekarang, memakai ringkasan rencana keluarga (butir belum dikerjakan, isi tas hampir kedaluwarsa), dan menyarankan tombol aksi aplikasi. Percakapan seperti Gemini: banyak sesi (baru, riwayat, cari, ganti nama, hapus), ubah pertanyaan lalu kirim ulang, buat ulang jawaban, hentikan jawaban; dikte suara yang tetap mendengar saat jeda dan terkirim otomatis setelah sekitar 5,5 detik hening; jawaban bisa dibacakan (ingat konteks, personal ke profil keluarga). Hibrida: panduan resmi KB beserta kutipan bila cocok, pengetahuan umum Gemini bila tidak; saran pertanyaan lanjutan; menolak prediksi, saran medis, dan lokasi evakuasi spesifik Pertanyaan tentang risiko tempat tinggal ("rumah saya rawan apa?") dijawab dengan Profil Risiko Lokasi. |
| Asisten di mana saja | semua halaman | Tombol Asisten melayang, serta tombol "Tanya" di tindakan rencana, kartu data lokasi, dan briefing yang langsung menanyakan konteks itu |
| Jelaskan Peringatan | `/tanya`, kartu Peringatan | Menyatu di Asisten: teks peringatan BMKG yang ditempel otomatis disederhanakan tanpa menambah fakta |
| Pustaka: Artikel | `/pustaka` | 11 artikel edukasi yang dibangun dari KB, bisa disaring per kategori dan bahaya, dicari, dan dicetak; tiap artikel menampilkan kejadian terkait minggu ini |
| Pustaka: Berita bencana | `/pustaka/berita` | Berita 7 hari terakhir dari Google Berita dan RSS media nasional (ANTARA, Tempo, Okezone, JPNN, VIVA, iNews, detikcom, Liputan6, SINDOnews, kumparan) dengan foto dari penerbit. Kode menyaring agar hanya peristiwa 9 jenis bencana di Indonesia yang tampil (menolak kiasan, topik di luar bencana, dan berita luar negeri), menggabungkan judul kembar, dan memberi jenis bencana untuk disaring; berita tanpa foto tampil sebagai daftar berhalaman yang bisa digeser. Peringatan resmi GDACS untuk Indonesia diterjemahkan kode |
| Pustaka: Berita cuaca dan iklim | `/pustaka/cuaca` | Prakiraan dan peringatan cuaca BMKG, musim hujan dan kemarau, El Niño/La Niña, suhu panas, dan kualitas udara di Indonesia, dengan saringan dan tampilan yang sama |
| Metodologi | `/metodologi` | Cara kerja, sumber data, batasan, dan statistik KB |
| Data Saya | `/data-saya` | Ringkasan data di perangkat, unduh cadangan dan pulihkan di perangkat lain (pindah HP), atau hapus semua data |

Sembilan bahaya dicakup: banjir, longsor, gempa bumi, cuaca ekstrem, tsunami, kekeringan, kebakaran hutan dan lahan, gunung api, serta gelombang tinggi dan abrasi.

## Penggunaan AI dalam fitur

SIGAP memakai **Google Gemini** sebagai komponen fungsional, dengan instruksi sistem, skema keluaran, dan penyaring buatan tim. Angka, skor, dan tingkat perhatian selalu dihitung kode, bukan ditebak AI, dan setiap fitur tetap berjalan tanpa AI (cadangan templat).

| Fitur | Peran AI |
|---|---|
| Rencana Siaga | Menyusun tindakan sesuai keluarga dari potongan panduan resmi (KB) |
| Briefing Siaga Hari Ini | Merangkum data BMKG menjadi ringkasan dan 3 tindakan |
| Asisten SIGAP | Menjawab pertanyaan dengan konteks lokasi, rencana keluarga, dan KB |
| Jelaskan Peringatan | Menyederhanakan teks peringatan BMKG tanpa menambah fakta |
| Simulator Bencana AI | Menyusun skenario keputusan yang menyasar kekeliruan pengguna |
| Siaga Iklim | Menyusun rencana 7 hari dan menyesuaikan urutan tindakan adaptasi |

Pagar pengaman dan metode evaluasinya: [docs/ai-evaluation.md](docs/ai-evaluation.md).

## Teknologi

- Next.js 16 (App Router, Cache Components), React 19, TypeScript
- Tailwind CSS 4, komponen Radix UI, ikon lucide-react, animasi Motion (menghormati pengaturan "kurangi gerakan")
- Zustand (penyimpanan lokal di perangkat), TanStack Query, Zod
- Leaflet untuk peta, Recharts untuk grafik tren iklim
- jsPDF dan qrcode untuk Kartu Siaga PDF
- Gemini lewat REST API langsung (tanpa SDK), dengan penyedia kedua opsional yang kompatibel OpenAI
- Pencarian KB: BM25 buatan sendiri, tanpa embedding dan tanpa layanan eksternal
- Service worker manual (`public/sw.js`) untuk Mode Darurat luring

## Menjalankan

Prasyarat: Node.js 20 atau lebih baru, npm, dan Git.

```bash
git clone https://github.com/orangngoding/sigap-app.git
cd sigap-app
npm install
cp .env.example .env.local   # lalu isi GEMINI_API_KEY (opsional)
npm run dev
```

Buka http://localhost:3000. Tanpa `GEMINI_API_KEY`, semua fitur tetap berjalan memakai cadangan tanpa AI.

### Perintah

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Server pengembangan |
| `npm run build` lalu `npm start` | Build dan jalankan versi produksi |
| `npm run lint` / `npm run typecheck` | ESLint dan pemeriksaan tipe |
| `npm run test:unit` | Seluruh uji unit (tanpa jaringan) |
| `npm run validate:content` | Validasi skema dan status konten KB |
| `npm run build:content` | Bangun ulang indeks KB dan Pustaka ke `src/generated/` setelah mengubah `content/` |
| `npm run eval:ai` | Evaluasi AI dengan model sungguhan; hasil ke `docs/ai-evaluation-hasil.md` |
| `npm run bangun:iklim-kota` | Hitung proyeksi iklim bawaan kota-kota utama ke `src/lib/data/proyeksi-kota.json` (satu permintaan berat per kota; jalankan setelah kuota harian Open-Meteo pulih, 07.00 WIB; bisa dilanjutkan dan melewati kota yang sudah ada; lalu commit berkas itu) |
| `npm run bangun:data-risiko` | Bangun ulang data statis Profil Risiko Lokasi di `src/lib/risiko/data/` (gunung api Smithsonian GVP, runup tsunami NOAA NCEI, garis pantai Natural Earth). Bila jaringan Node bermasalah, unduh berkasnya dengan curl lalu jalankan dengan `--lokal <folder>` |

## Variabel lingkungan

Lihat [`.env.example`](.env.example). Simpan nilai asli hanya di `.env.local` (diabaikan git) atau di dashboard hosting.

| Variabel | Wajib | Keterangan |
|---|---|---|
| `GEMINI_API_KEY` | Tidak | Kunci dari Google AI Studio. Kosong = mode tanpa AI |
| `GEMINI_MODEL` | Tidak | Bawaan `gemini-3.5-flash-lite` |
| `LLM2_BASE_URL`, `LLM2_API_KEY`, `LLM2_MODEL` | Tidak | Penyedia kedua bila model utama sibuk atau gagal |
| `AI_DAILY_BUDGET` | Tidak | Batas panggilan AI per hari, bawaan 200 |
| `NEXT_PUBLIC_SITE_URL` | Ya untuk produksi | URL publik, dipakai untuk kode QR Kartu Siaga dan metadata |

**Jangan pernah meng-commit API key.** Kunci yang pernah ter-commit dianggap bocor dan harus dibuat ulang.

## Struktur

```text
content/          Sumber konten: kb/ (potongan panduan per bahaya), pustaka/, kontak.json
scripts/          Validasi dan pembangunan konten, data wilayah, evaluasi AI
src/app/          Halaman dan rute API (rencana, tanya, briefing, terjemah, cuaca, gempa, peringatan, iklim, proyeksi, adaptasi)
src/components/   Komponen per fitur
src/lib/          ai/ (penyedia, pagar, prompt), briefing/ (sinyal), latihan/ (skenario, mesin), kb/ (skema, pencarian), data/ (BMKG), rencana/, kartu/
src/stores/       Penyimpanan Zustand di perangkat
src/generated/    Indeks hasil build:content (jangan diedit manual)
public/data/      Data wilayah per provinsi
tests/unit/       Uji unit
docs/             Evaluasi AI, atribusi, dan sumber data
```

## Dokumentasi

- [docs/ai-evaluation.md](docs/ai-evaluation.md): pagar pengaman AI dan metode evaluasi; hasil terbaru di [docs/ai-evaluation-hasil.md](docs/ai-evaluation-hasil.md)
- [docs/data-sources.md](docs/data-sources.md): sumber data dan status verifikasi
- [docs/attribution.md](docs/attribution.md): atribusi konten, data, dan pustaka pihak ketiga

## Privasi

Profil keluarga, kontak, titik kumpul, catatan, dan progres checklist disimpan hanya di perangkat pengguna. Ke server hanya dikirim profil tanpa data pribadi (jumlah anggota, kelompok rentan, jenis bangunan, bahaya) dan nama wilayah, untuk menyusun rencana dan Briefing Siaga. Koordinat lokasi hanya dipakai server untuk menghitung jarak gempa dan tidak dikirim ke AI. Fitur suara memakai Web Speech API peramban: pembacaan jawaban berjalan di perangkat, sedangkan dikte suara diproses oleh layanan pengenal suara bawaan peramban (pada Chrome, milik Google), bukan oleh server SIGAP.

## Penggunaan AI coding assistant, template, dan aset open-source

Sesuai ketentuan IT RUSH 2026, berikut pihak ketiga yang dipakai dalam pengembangan:

- **AI coding assistant:** Claude Code (Anthropic) dipakai tim untuk membantu menulis dan meninjau kode, menguji tampilan, dan merapikan dokumentasi. Arah produk, pemilihan fitur, isi panduan, dan keputusan akhir dibuat oleh tim; seluruh kode diuji dengan uji unit, pemeriksaan tipe, dan lint.
- **AI dalam produk:** Google Gemini (lihat bagian Penggunaan AI dalam fitur).
- **Template dan komponen:** komponen dasar dari Radix UI dan pola shadcn/ui (MIT). Tidak memakai template situs jadi.
- **Library open-source:** Next.js, React, Tailwind CSS, Zustand, TanStack Query, Zod, Motion, Leaflet, Recharts, jsPDF, qrcode, lucide-react, dan lainnya; nama, versi, dan lisensi di [docs/attribution.md](docs/attribution.md).
- **Foto:** Wikimedia Commons dengan lisensi bebas (domain publik, CC0, CC BY, CC BY-SA), dengan nama pembuat dan lisensi per foto di [docs/attribution.md](docs/attribution.md#foto) dan halaman Metodologi.
- **Data:** BMKG, BNPB, Badan Geologi, Kemenkes, Open-Meteo, NASA, NOAA, USGS, GDACS, OpenStreetMap, dan data wilayah cahyadsn/wilayah; rincian di [docs/data-sources.md](docs/data-sources.md).
- **Konten panduan:** diparafrasekan dari dokumen resmi dan selalu menyebut sumber serta halamannya; hak atas isi tetap milik lembaga sumbernya.

## Tim

SIGAP dikembangkan oleh tim empat orang untuk lomba IT RUSH 2026.

| Nama | Peran | Perguruan tinggi |
|---|---|---|
| ISI NAMA (Ketua) | ISI PERAN | ISI KAMPUS |
| ISI NAMA | ISI PERAN | ISI KAMPUS |
| ISI NAMA | ISI PERAN | ISI KAMPUS |
| ISI NAMA | ISI PERAN | ISI KAMPUS |

## Lisensi

Kode sumber: hak cipta tetap milik tim. Konten panduan tetap milik lembaga sumbernya, dan foto mengikuti lisensi masing-masing; lihat [docs/attribution.md](docs/attribution.md).
