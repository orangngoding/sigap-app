
# SIGAP - Attribution

## 1. Purpose

Dokumen ini mencatat atribusi terhadap framework, library, aset visual, dan sumber daya pihak ketiga yang digunakan dalam pengembangan SIGAP.

## 2. Framework and Libraries

| Technology | Purpose | License |
|---|---|---|
| Next.js | Web framework | To be verified |
| React | UI library | To be verified |
| TypeScript | Programming language | To be verified |
| Tailwind CSS | Styling | To be verified |
| Zustand | State management | To be verified |
| TanStack Query | Data fetching | To be verified |
| Leaflet | Interactive maps | To be verified |
| Recharts | Data visualization | To be verified |

## 3. Visual Assets

Atribusi aset visual akan dicatat berdasarkan sumber dan lisensi masing-masing aset.

## 4. Data Sources

Sumber data dan atribusinya dicatat dalam `data-sources.md`.

## 5. Update Policy

Setiap dependency atau aset baru yang digunakan harus diperiksa lisensinya dan dicatat dalam dokumen ini.

## 6. Data Wilayah

- **cahyadsn/wilayah** (MIT, Copyright (c) 2017-2025 Cahya DSN): kode dan nama wilayah administrasi serta koordinat pusat kab/kota, sesuai Kepmendagri No 300.2.2-2138 Tahun 2025. Diolah oleh `scripts/bangun-wilayah.ts` menjadi `public/data/wilayah/`. https://github.com/cahyadsn/wilayah
- **Leaflet 1.9.4** (BSD-2-Clause) dan **react-leaflet 5.0.0** (Hippocratic-2.1): peta lokasi. Ubin peta dari **OpenStreetMap** (c) kontributor OpenStreetMap, ODbL.

## 7. Basis Pengetahuan dari Buku Saku BNPB

- **Buku Saku Menghadapi Bencana: Tanggap Tangkas Tangguh** (BNPB, Pusat Data Informasi dan Humas, cetakan keempat Maret 2019, ISBN 978-602-5693-05-2). Sumber utama potongan KB tsunami, gunung api, kekeringan, karhutla, dan tambahan longsor serta umum (draf 2026-11-17). Setiap potongan memuat nomor halaman cetak di `sourceTitle`.
- Seluruh kalimat adalah parafrase, bukan salinan. Draf disusun dengan bantuan asisten AI. Sesuai revisi tim (2026-11-17), proyek tidak mewajibkan peninjau dan `reviewedBy` dibiarkan kosong; karena itu potongan belum diverifikasi manusia terhadap buku, dan halaman Metodologi menyatakan hal ini terus terang.
- Nomor telepon dan alamat BPBD dalam buku (cetakan 2019) sengaja tidak disalin ke aplikasi karena dapat sudah berubah; `content/kontak.json` hanya memuat nomor darurat nasional (112, 110, 113, 115, 119) yang dikonfirmasi tim pada 2026-11-17.

## 8. Sumber Tambahan Gelombang Tinggi, Abrasi, Rob, dan Longsor (2026-11-17)

Disusun dari rekapan tim `SIGAP_Basis_Pengetahuan_Rujukan.md`, lalu halaman yang dikutip dicocokkan langsung ke PDF aslinya:

- **BNPB, Buku Saku Tanggap, Tangkas, Tangguh Menghadapi Bencana (2012)**, `.../pubs/478.pdf`. Dicocokkan: hlm 17 (rob), hlm 31-34 (gelombang pasang dan abrasi).
- **BNPB/BAKORNAS PB, Pengenalan Karakteristik Bencana dan Upaya Mitigasinya di Indonesia, Edisi II (2007)**, `.../pubs/470.pdf`. Dicocokkan: hlm 28-31 (penyebab dan gejala longsor), hlm 46 (pasang purnama sekitar tanggal 1 dan 15).
- **BNPB, Buku Saku Menghadapi Bencana (cetakan keempat, 2019)**, berkas unggahan tim, hlm 36-39 (banjir) untuk langkah turunan.

Catatan penting:
- Tidak ada sumber resmi yang memuat langkah Saat dan Sesudah khusus gelombang tinggi, abrasi, atau rob. Langkah Saat (selain "jauhi pantai dan naik ke tempat tinggi") dan seluruh Sesudah pada `gelombang_abrasi` adalah TURUNAN dari panduan banjir umum, ditandai lewat kolom `turunan` dan ditampilkan ke pengguna (Rencana dan Mode Darurat).
- Rekapan tim juga memuat bahan dari sumber lain (BMKG, Badan Geologi, S3/S4, S9) yang BELUM dijadikan potongan KB karena tautan resmi sumbernya belum tersedia; lihat bagian 10 rekapan untuk angka yang meragukan.

## 9. Sumber Rujukan Tim yang Dibuka Langsung (2026-11-17)

Dari dokumen tim "Sumber Rujukan SIGAP", setiap tautan dibuka dan halaman yang dikutip dicocokkan ke berkas aslinya:

| Sumber | Status | Dipakai untuk |
|---|---|---|
| BNPB, Panduan Kesiapsiagaan Bencana untuk Keluarga (2018), salinan PPID Kab. Demak | Terbaca, hlm 37-45 dicocokkan | Banjir tiga fase (+25), longsor tiga fase (+14) |
| BMKG, siaran pers rob dan gelombang tinggi Utara Jawa (4 Jun 2020) | Terbaca | Penjelasan rob, kanal peringatan BMKG |
| BMKG Maritim, BMOI Vol. 3 Sep 2026, hlm 18 | Terbaca | Kelas tinggi gelombang Skala Douglas |
| Kementerian ESDM, berita gerakan tanah (6 Feb 2018) | Terbaca | Peta prakiraan gerakan tanah bulanan Badan Geologi |
| Badan Geologi, analisis efektivitas program | Terbaca, tidak dipakai | Bukan panduan warga |
| BNPB Buku Saku 2017/2018, salinan Kemdikbud | Tidak dapat dijangkau | Isinya setara buku 2019 yang sudah dipakai |
| BNPB, berita kekeringan meteorologis (1 Sep 2021) | 404 (halaman dipindah) | Tidak dipakai |

## 10. Sumber Karhutla dan Kekeringan Hasil Pencarian (2026-11-17)

Dicari di web, lalu setiap halaman diunduh dan kalimatnya dicocokkan sebelum dipakai:

| Sumber | Dipakai untuk |
|---|---|
| Kemenkes, rilis "Cegah dan Tangani Dampak Kesehatan Akibat Kabut Asap" (15 Okt 2015) | Karhutla: persediaan obat rutin, deteksi dini gejala, kapan ke fasilitas kesehatan, berobat teratur, skrining (fase Sesudah) |
| Kemenkes, rilis Menkes soal masker dan kualitas udara (21 Agu 2026) | Karhutla: gejala yang perlu segera ke puskesmas, periksa indeks kualitas udara |
| Kemenkes, rilis perlindungan kelompok rentan karhutla (26 Agu 2026) | Karhutla: kelompok rentan, Rumah Oksigen |
| BNPB, laporan harian 3 Jul, 7 Jul, 2 Sep, 12 Okt 2026 | Kekeringan: cadangan air, pipa bocor, prioritas memasak dan minum, air bekas. Karhutla: larangan membakar, puntung rokok, lapor titik api |

Tidak dipakai: halaman Pusat Krisis Kemenkes tentang kemarau (mengutip ulang media daerah), artikel BKPK 2026 (tulisan opini analis), Kepmendesa 71/2021 (hampir tidak membahas kedua bahaya), dan berita media yang mengutip Instagram Kemenkes. Pemetaan langkah Kemenkes (upaya sekunder dan tersier) ke fase Sesudah adalah penilaian penyusun.
