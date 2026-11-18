
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

## 7. Data Iklim

- **Open-Meteo** (CC BY 4.0, https://open-meteo.com/): Historical Weather API (ERA5) untuk tren hujan lebat di `/lokasi`, dan Climate API (https://open-meteo.com/en/docs/climate-api) untuk proyeksi 1991-2050 di `/iklim`.
- Model proyeksi CMIP6 HighResMIP yang dipakai lewat Open-Meteo: **EC-Earth3P-HR** (konsorsium EC-Earth) dan **MRI-AGCM3-2-S** (Meteorological Research Institute, Japan Meteorological Agency). Data dikoreksi bias oleh Open-Meteo terhadap ERA5.

## 8. Basis Pengetahuan dari Buku Saku BNPB

- **Buku Saku Menghadapi Bencana: Tanggap Tangkas Tangguh** (BNPB, Pusat Data Informasi dan Humas, cetakan keempat Maret 2019, ISBN 978-602-5693-05-2). Sumber utama potongan KB tsunami, gunung api, kekeringan, karhutla, dan tambahan longsor serta umum (draf 2026-11-17). Setiap potongan memuat nomor halaman cetak di `sourceTitle`.
- Seluruh kalimat adalah parafrase, bukan salinan. Draf disusun dengan bantuan asisten AI. Sesuai revisi tim (2026-11-17), proyek tidak mewajibkan peninjau dan `reviewedBy` dibiarkan kosong; karena itu potongan belum diverifikasi manusia terhadap buku, dan halaman Metodologi menyatakan hal ini terus terang.
- Nomor telepon dan alamat BPBD dalam buku (cetakan 2019) sengaja tidak disalin ke aplikasi karena dapat sudah berubah; `content/kontak.json` hanya memuat nomor darurat nasional (112, 110, 113, 115, 119) yang dikonfirmasi tim pada 2026-11-17.

## 9. Sumber Tambahan Gelombang Tinggi, Abrasi, Rob, dan Longsor (2026-11-17)

Disusun dari rekapan tim `SIGAP_Basis_Pengetahuan_Rujukan.md`, lalu halaman yang dikutip dicocokkan langsung ke PDF aslinya:

- **BNPB, Buku Saku Tanggap, Tangkas, Tangguh Menghadapi Bencana (2012)**, `.../pubs/478.pdf`. Dicocokkan: hlm 17 (rob), hlm 31-34 (gelombang pasang dan abrasi).
- **BNPB/BAKORNAS PB, Pengenalan Karakteristik Bencana dan Upaya Mitigasinya di Indonesia, Edisi II (2007)**, `.../pubs/470.pdf`. Dicocokkan: hlm 28-31 (penyebab dan gejala longsor), hlm 46 (pasang purnama sekitar tanggal 1 dan 15).
- **BNPB, Buku Saku Menghadapi Bencana (cetakan keempat, 2019)**, berkas unggahan tim, hlm 36-39 (banjir) untuk langkah turunan.

Catatan penting:
- Tidak ada sumber resmi yang memuat langkah Saat dan Sesudah khusus gelombang tinggi, abrasi, atau rob. Langkah Saat (selain "jauhi pantai dan naik ke tempat tinggi") dan seluruh Sesudah pada `gelombang_abrasi` adalah TURUNAN dari panduan banjir umum, ditandai lewat kolom `turunan` dan ditampilkan ke pengguna (Rencana dan Mode Darurat).
- Rekapan tim juga memuat bahan dari sumber lain (BMKG, Badan Geologi, S3/S4, S9) yang BELUM dijadikan potongan KB karena tautan resmi sumbernya belum tersedia; lihat bagian 10 rekapan untuk angka yang meragukan.

## 10. Sumber Rujukan Tim yang Dibuka Langsung (2026-11-17)

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

## 11. Sumber Karhutla dan Kekeringan Hasil Pencarian (2026-11-17)

Dicari di web, lalu setiap halaman diunduh dan kalimatnya dicocokkan sebelum dipakai:

| Sumber | Dipakai untuk |
|---|---|
| Kemenkes, rilis "Cegah dan Tangani Dampak Kesehatan Akibat Kabut Asap" (15 Okt 2015) | Karhutla: persediaan obat rutin, deteksi dini gejala, kapan ke fasilitas kesehatan, berobat teratur, skrining (fase Sesudah) |
| Kemenkes, rilis Menkes soal masker dan kualitas udara (21 Agu 2026) | Karhutla: gejala yang perlu segera ke puskesmas, periksa indeks kualitas udara |
| Kemenkes, rilis perlindungan kelompok rentan karhutla (26 Agu 2026) | Karhutla: kelompok rentan, Rumah Oksigen |
| BNPB, laporan harian 3 Jul, 7 Jul, 2 Sep, 12 Okt 2026 | Kekeringan: cadangan air, pipa bocor, prioritas memasak dan minum, air bekas. Karhutla: larangan membakar, puntung rokok, lapor titik api |

Tidak dipakai: halaman Pusat Krisis Kemenkes tentang kemarau (mengutip ulang media daerah), artikel BKPK 2026 (tulisan opini analis), Kepmendesa 71/2021 (hampir tidak membahas kedua bahaya), dan berita media yang mengutip Instagram Kemenkes. Pemetaan langkah Kemenkes (upaya sekunder dan tersier) ke fase Sesudah adalah penilaian penyusun.

## Foto

Foto ilustrasi dari Wikimedia Commons (lisensi bebas), disimpan di `public/img/` dan dioptimasi oleh next/image. Foto adalah ilustrasi jenis bencana, bukan lokasi pengguna. Daftar yang sama tampil di halaman Metodologi (Kredit foto).

| Foto | Pembuat | Lisensi | Sumber |
|---|---|---|---|
| Warga berjalan menembus banjir di jalan kota Jakarta | VOA Indonesian Service | [Public domain](https://creativecommons.org/publicdomain/mark/1.0/) | [Commons](https://commons.wikimedia.org/wiki/File:VOA_People_walk_through_Jakarta%27s_flooded_streets.jpg) |
| Banjir lumpur merendam permukiman di Padangsidimpuan, Sumatra Utara | Indonesian National Board for Disaster Management | [Public domain](https://creativecommons.org/publicdomain/mark/1.0/) | [Commons](https://commons.wikimedia.org/wiki/File:Floods_in_Padangsidimpuan_caused_by_Cyclone_Senyar.jpg) |
| Banjir menggenangi rumah di Aceh Tenggara | Indonesian National Board for Disaster Management | [Public domain](https://creativecommons.org/publicdomain/mark/1.0/) | [Commons](https://commons.wikimedia.org/wiki/File:Flood_in_Southeast_Aceh_Regency,_Sumatra.jpg) |
| Rumah rusak berat akibat gempa di Kabupaten Bandung | National Agency for Disaster Countermeasure | [Public domain](https://creativecommons.org/publicdomain/mark/1.0/) | [Commons](https://commons.wikimedia.org/wiki/File:House%27s_damage_by_earthquakes_in_Bandung_Regency,_Indonesia.jpg) |
| Rumah roboh akibat gempa di Sigi, Sulawesi Tengah | National Agency for Disaster Countermeasure | [Public domain](https://creativecommons.org/publicdomain/mark/1.0/) | [Commons](https://commons.wikimedia.org/wiki/File:A_house_destroyed_by_earthquake_in_Sigi,_Sulawesi.jpg) |
| Petugas membersihkan jalan yang tertimbun longsor setelah hujan lebat | Indonesian National Board for Disaster Management | [Public domain](https://creativecommons.org/publicdomain/mark/1.0/) | [Commons](https://commons.wikimedia.org/wiki/File:Landslide_in_North_Tapanuli_following_heavy_rainfall.jpg) |
| Petugas mengevakuasi warga setelah tanah longsor di Serasan | National Disaster Mitigation Agency | [Public domain](https://creativecommons.org/publicdomain/mark/1.0/) | [Commons](https://commons.wikimedia.org/wiki/File:Serasan_landslide_aftermath.jpg) |
| Gunung Sinabung mengeluarkan asap erupsi saat fajar | Arteri Project | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | [Commons](https://commons.wikimedia.org/wiki/File:Asap_Erupsi_Gunung_Sinabung_di_Pagi_Hari.jpg) |
| Rumah tertutup abu vulkanik setelah erupsi Merapi | USAID Indonesia | [Public domain](https://creativecommons.org/publicdomain/mark/1.0/) | [Commons](https://commons.wikimedia.org/wiki/File:Mount_Merapi_Eruption_(5134675344).jpg) |
| Pelabuhan perahu nelayan di Banda Aceh setelah tsunami 2004 | Michael L. Bak | [Public domain](https://creativecommons.org/publicdomain/mark/1.0/) | [Commons](https://commons.wikimedia.org/wiki/File:Fishing_boats_in_Banda_Aceh_after_2004_tsunami_DD-SD-06-07375.JPEG) |
| Kabut asap kebakaran hutan dan lahan menyelimuti jembatan di Riau | anwar siak from Kesultanan Siak, indonesia | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) | [Commons](https://commons.wikimedia.org/wiki/File:Kabut_Asap.jpg) |
| Tanah sawah retak akibat kemarau panjang | Rosser1954 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | [Commons](https://commons.wikimedia.org/wiki/File:Cracked_earth_after_prolonged_drought._2020.jpg) |
| Petir menyambar dari awan badai di malam hari | Rolland Anthony | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0) | [Commons](https://commons.wikimedia.org/wiki/File:Lightning_Storm_(63669379).jpeg) |
| Langit gelap di atas Jakarta menjelang hujan lebat | Achmad Hikam | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | [Commons](https://commons.wikimedia.org/wiki/File:Jakarta%27s_sky_before_rain_comes.jpg) |
| Pantai terkikis abrasi di Pulau Gede, Rembang | Ubaidillah Elmuddin | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | [Commons](https://commons.wikimedia.org/wiki/File:Abrasi_2,_Pulau_Gede,_Rembang_10162016.jpg) |
| Gelombang tinggi menghantam pesisir berbatu | JopkeB | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | [Commons](https://commons.wikimedia.org/wiki/File:High_waves_between_S%C3%A3o_Jorge_and_Pico_(Azores)_2011.jpg) |
| Sawah hijau dengan Gunung Singgalang di Sumatra Barat | Undeka 11 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | [Commons](https://commons.wikimedia.org/wiki/File:Rice_Fields_with_Mount_Singgalang_in_the_Distance,_Biaro,_Ampek_Angkek,_Agam_Regency.jpg) |
| Terasering sawah di Bali setelah hujan | Hariyono Suwardi | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0) | [Commons](https://commons.wikimedia.org/wiki/File:Rice_Terrace_View,_Bali,_Indonesia.jpg) |
| Petugas BNPB memuat bantuan bencana ke pesawat | Indonesian National Board for Disaster Management | [Public domain](https://creativecommons.org/publicdomain/mark/1.0/) | [Commons](https://commons.wikimedia.org/wiki/File:Aid_sent_for_disaster_management_in_West_Sumatra.jpg) |
| Mobil menerobos jalan yang tergenang banjir di Jakarta | VOA Indonesian Service | [Public domain](https://creativecommons.org/publicdomain/mark/1.0/) | [Commons](https://commons.wikimedia.org/wiki/File:VOA_A_car_tries_to_drive_through_Jakarta%27s_flooded_streets.jpg) |
| Gunung Sinabung dilihat dari permukiman di Kabupaten Karo | Pavel Kirillov from St.Petersburg, Russia | [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0) | [Commons](https://commons.wikimedia.org/wiki/File:Mount_Sinabung_2017_(33117536845).jpg) |
| Isi tas siaga: helm, air minum, sarung tangan, senter, dan perlengkapan darurat | Toby Oxborrow | [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0) | [Commons](https://commons.wikimedia.org/wiki/File:Earthquake_Kit_in_Japan_2008.jpg) |
| Tangga jalur evakuasi menuju bukit dengan papan penunjuk arah | Harris Est 13 | [CC0](http://creativecommons.org/publicdomain/zero/1.0/deed.en) | [Commons](https://commons.wikimedia.org/wiki/File:Jalur_Evakuasi_Kapo-Kapo.jpg) |
| Stasiun alat ukur cuaca milik BMKG | SATELITBM | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | [Commons](https://commons.wikimedia.org/wiki/File:Alat_Ukur_Cuaca_Milik_BMKG.jpg) |
