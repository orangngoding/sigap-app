# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Pengguna utama: keluarga awam di Indonesia, bukan ahli kebencanaan. Mereka memakai SIGAP dalam dua situasi yang berbeda:

- **Saat tenang:** memilih lokasi, mengisi profil rumah tangga, menyusun Rencana Siaga dan isi tas siaga, membaca Pustaka, berlatih lewat Latihan Siaga.
- **Saat genting:** membuka Mode Darurat atau memindai kode QR di Kartu Siaga untuk mendapat langkah singkat dan nomor darurat. Mereka cemas, terburu-buru, dan sinyal atau baterai bisa terbatas.

Tiga persona perancangan dari blueprint (fiktif, untuk menguji keputusan):

- **Bu Rina**, ibu rumah tangga, rumah dua lantai dekat kali, anak 5 tahun dan ibu lansia. Butuh tahu apa yang disiapkan dan kapan mengungsi, dalam bahasa sederhana. Ponsel Android, kuota terbatas.
- **Dimas**, mahasiswa perantau, kos di lantai 2 kawasan padat, sendirian. Butuh daftar singkat yang langsung bisa dijalankan dan tas siaga hemat.
- **Pak Joko**, ketua RT / relawan desa tangguh, mengurus warga di lereng dan dekat sungai. Butuh bahan edukasi dan Kartu Siaga untuk banyak keluarga. Ini audiens sekunder.

## Product Purpose

SIGAP adalah aplikasi web kesiapsiagaan multi-bencana. Ia mengubah data resmi dan profil rumah tangga menjadi **Rencana Siaga personal**: tindakan sebelum, saat, dan sesudah per bahaya, daftar isi tas siaga yang dihitung dari profil, skor kesiapsiagaan, Kartu Siaga yang bisa dicetak, dan Mode Darurat yang tetap terbuka tanpa internet. Semua panduan berasal dari sumber resmi (BNPB, BMKG, Badan Geologi, Kemenkes) dan setiap tindakan menautkan sumbernya.

Masalah yang dijawab: informasi resmi bersifat teknis dan tidak menjawab "apa yang harus keluarga saya lakukan"; panduan umum tidak membedakan lansia, balita, disabilitas, atau obat rutin; risiko berbeda-beda (pesisir, lereng, bantaran sungai, dekat gunung api); orang jarang berlatih atau memeriksa kesiapan; saat darurat sinyal dan baterai terbatas.

Keberhasilan: keluarga punya rencana dan tas yang siap, dan tahu apa yang dilakukan saat kejadian.

**Yang bukan SIGAP:** bukan sistem peringatan dini, bukan alat prediksi, bukan pengganti arahan BPBD, BMKG, atau petugas berwenang, dan bukan sumber saran medis. Kondisi darurat selalu diarahkan ke 112 dan kanal resmi.

## Positioning

Tiga pilar dari blueprint, dan tiga hal yang tidak bisa ditiru begitu saja oleh aplikasi sejenis:

- **Personal dan kontekstual:** lokasi nyata, kondisi cuaca hari itu, bahaya terpilih, dan profil rumah tangga, bukan satu daftar untuk semua.
- **Dapat dipercaya:** setiap saran memuat sumber; AI tidak memprediksi bencana; data resmi selalu tampil utuh di samping hasil AI.
- **Dapat dipakai nyata:** hasil akhirnya benda yang bisa dipakai (kartu cetak, mode offline), bukan sekadar tampilan.

Pembeda yang dikonfirmasi harus dijaga pekerjaan berikutnya:

- **Tanpa akun, data di perangkat.** Profil keluarga tidak pernah dikirim ke server. Pindah HP lewat berkas data yang disimpan dan dimasukkan sendiri oleh pengguna.
- **Hanya sumber resmi, dengan tautan sumber** pada setiap tindakan.
- **Bisa dipakai tanpa internet.** Mode Darurat tetap terbuka setelah pernah dibuka, dan Kartu Siaga dicetak hitam putih.

## Operating Context

- Pengguna sering membuka aplikasi dari ponsel (web seluler), dengan sinyal yang tidak selalu baik. Ponsel kelas menengah ke bawah, data terbatas.
- Kartu Siaga dicetak (A4/A5) atau diunduh sebagai PDF yang dibuat di perangkat. Artikel Pustaka bisa dicetak untuk dibagikan pengurus RT/RW.
- Rencana dibagikan ke keluarga lewat WhatsApp atau salin teks, tanpa nomor kontak.
- Data cuaca, gempa, dan peringatan dini berasal dari BMKG. Proyeksi dan tren iklim dari Open-Meteo (data ERA5/CMIP6). Berita bencana di Pustaka berasal dari umpan RSS Google Berita yang menghimpun judul media Indonesia; isinya tidak disalin, pembaca diarahkan ke situs media.
- **Konteks lomba (berlaku sementara):** SIGAP dibuat untuk lomba IT RUSH 2026 (subtema Mitigasi Bencana dan Perubahan Iklim, tenggat pengiriman 20 November 2026, situs harus hidup sampai 30 November 2026). Juri menilai secara daring dan asinkron, tanpa presentasi dan tanpa pendamping, jadi 60 detik pertama di Beranda menentukan: Beranda harus menjelaskan diri sendiri dan menawarkan satu aksi jelas. Jalur demo juri: tombol "Coba dengan data contoh" menyelesaikan seluruh alur tanpa mengetik dan tanpa panggilan AI.
- **Biaya nol:** seluruh layanan memakai paket gratis dan sumber terbuka. Layanan gratis Open-Meteo hanya untuk penggunaan non-komersial.

## Capabilities and Constraints

- **Sembilan bahaya**, masing-masing sebuah "hazard pack": banjir, longsor, gempa bumi, cuaca ekstrem, tsunami, kekeringan, kebakaran hutan dan lahan, gunung api, serta gelombang tinggi dan abrasi. Level dukungan: A (data live relevan + panduan lengkap: banjir, longsor, gempa, cuaca ekstrem), B (panduan + indikator/tren: tsunami, kekeringan, karhutla), C (panduan + tautan kanal resmi saja: gunung api, gelombang/abrasi). Bahaya yang kontennya belum memenuhi minimum berstatus "Segera hadir" dan tidak bisa dipilih, tanpa mengubah kode.
- **Angka dihitung kode, AI menjelaskan.** Skor kesiapsiagaan, jumlah isi tas, faktor kerentanan, jarak gempa, dan tingkat perhatian (Tenang/Perhatikan/Waspada) dihitung oleh kode yang deterministik dan bisa diuji. AI hanya menyusun narasi dan prioritas dengan skema keluaran yang divalidasi, kutipan sumber wajib, dan pagar pengaman. Setiap fitur AI punya cadangan templat tanpa AI ("Mode ringkas"), sehingga rencana tetap muncul bila AI gagal.
- **Pagar AI:** tidak memprediksi bencana; tidak menentukan lokasi evakuasi (titik kumpul hanya dari pengguna, rujukan evakuasi ke BPBD dan kelurahan); tidak memberi saran medis atau dosis; tidak menjawab tanpa sumber; teks pengguna dan teks BMKG diperlakukan sebagai data, bukan perintah; menolak konten SARA, kekerasan, dan topik di luar kebencanaan. Tindakan tanpa kutipan valid dibuang. Keluaran AI diberi label dan penafian.
- **Privasi:** tanpa akun, tanpa cookie pelacak, tanpa analitik pihak ketiga. Titik kumpul, kontak darurat, dan catatan khusus **tidak pernah** dikirim ke server atau AI; AI hanya menerima atribut profil anonim dan nama wilayah. Data kesehatan hanya berupa jumlah orang per kategori, tanpa nama, diagnosis, atau nama obat. Pengguna bisa melihat, mengekspor, dan menghapus seluruh datanya kapan saja.
- **Kegagalan sumber data tidak boleh pernah tampil sebagai "tidak ada peringatan" atau "tidak ada berita":** antarmuka menampilkan data lama dengan penanda, atau mengarahkan ke kanal resmi. Setiap kartu data memuat nama sumber, waktu pengambilan, dan tautan.
- **Tanpa konten buatan pengguna publik** (tidak ada moderasi). Tidak ada fitur login.
- **Bahasa Indonesia saja.** Bahasa daerah dan Inggris adalah arah pengembangan, bukan cakupan sekarang.
- **Terminologi tetap:** "Rencana Siaga", "Kartu Siaga", "Mode Darurat", "Profil Lokasi", "Siaga Iklim", "Pustaka", "Data & privasi", "Mode ringkas". Satu padanan untuk satu istilah di seluruh aplikasi. Fitur pindah data memakai bahasa "simpan data" dan "ambil data dari HP lama", bukan "file cadangan" atau "JSON".
- Blueprint (14 November 2026) adalah spesifikasi awal; README dan kode adalah keadaan terkini. Bila keduanya berbeda (mis. Asisten kini punya banyak sesi percakapan, ada Iklim 2050 dan Latihan Siaga), kode yang berlaku.

## Brand Commitments

- Nama: SIGAP ("Siaga Bencana & Iklim"). Logo: [public/logo-sigap.svg](public/logo-sigap.svg).
- **Suara:** tenang, tegas, dan menenangkan, bukan alarmis. Bahasa Indonesia sehari-hari, kalimat aktif dan pendek, kata kerja di depan ("Siapkan", "Simpan", "Cetak"), istilah teknis selalu dijelaskan. Tanpa huruf kapital berlebihan, tanda seru berulang, atau emoji. Tidak pernah menyatakan bahwa bencana akan atau tidak akan terjadi.
- **Warna bermakna, bukan hiasan:** merah hanya untuk tindakan darurat dan hal merusak, amber untuk perhatian, dan warna tidak pernah menjadi satu-satunya penanda (selalu ada teks atau ikon).
- Foto bersumber berlisensi dengan kredit di halaman Metodologi (`/metodologi#kredit-foto`).
- Token visual (palet, tipografi, bentuk) ada di blueprint bagian 16.2 sebagai usulan awal; keputusan visual dicatat di DESIGN.md, bukan di sini.

## Evidence on Hand

- Panduan dibangun dari basis pengetahuan resmi di `content/kb` dan `content/pustaka` (11 artikel). Setiap potongan menyertakan judul sumber, URL, tanggal akses, dan dua peninjau.
- Dokumen proyek: `docs/architecture.md`, `docs/data-sources.md`, `docs/attribution.md`, `docs/ai-evaluation.md`, dan blueprint produk (berkas Blueprint_Aplikasi_Web_SIGAP).
- Status verifikasi sumber data dicatat di `docs/data-sources.md`. Endpoint BMKG dan Open-Meteo bergantung pada layanan pihak ketiga.
- Tidak ada testimoni, angka pengguna, atau klaim dampak yang tercatat. Jangan mengarangnya. Angka di proposal atau tampilan harus bersumber dan bertanggal.

## Product Principles

1. **Tidak pernah salah demi terlihat tenang.** Bila data tidak terbaca, katakan begitu dan tunjuk kanal resmi.
2. **Setiap anjuran punya sumber resmi.** Tindakan tanpa sumber tidak ditampilkan.
3. **Data keluarga tetap di tangan keluarga.** Tanpa akun, tanpa mengirim profil ke server.
4. **Bisa dipakai dalam keadaan genting dan oleh siapa saja.** Bahasa sederhana, langkah singkat, target sentuh besar, tetap berfungsi dengan sinyal lemah.
5. **Kode menghitung, AI menjelaskan.** Angka dan keputusan tidak diserahkan ke AI.
6. **Tahan gangguan.** Bila API cuaca atau AI gagal, aplikasi tetap menghasilkan sesuatu yang berguna (data lama, templat, Mode Darurat).
7. **Satu aksi utama per layar.** Pengguna yang cemas butuh langkah berikutnya, bukan lebih banyak data.

## Accessibility & Inclusion

- **Target WCAG 2.2 AA** (dari blueprint bagian 16.6): kontras teks 4,5 : 1 dan komponen 3 : 1; semua fungsi bisa dioperasikan dengan keyboard dengan fokus yang selalu terlihat dan tautan lompat ke konten utama; HTML semantik; status dinamis diumumkan lewat wilayah live; grafik punya ringkasan teks atau tabel; peta bukan satu-satunya cara memilih lokasi; zoom 200% tidak merusak tata letak.
- **Target sentuh minimal 44 px, dan 56 px di Mode Darurat.** Mode Darurat: kontras tinggi, tanpa animasi, huruf dasar 18-20 px.
- Lansia dan pengguna dengan literasi digital rendah adalah pengguna nyata: bahasa sederhana, istilah sehari-hari, kontrol besar dan jelas. Fitur teknis tidak boleh bocor ke tampilan (mis. nama format berkas).
- Ponsel kelas menengah ke bawah dan sinyal lemah adalah batas kinerja yang harus dihormati (mobile-first; pemilih lokasi, peta, grafik, dan PDF dimuat malas).
- Animasi menghormati `prefers-reduced-motion`. Tidak ada kedipan. Tidak ada mode gelap umum; Mode Darurat memakai tema gelap kontras tinggi sendiri.
- PDF Kartu Siaga berisi teks asli (bukan gambar) dengan urutan baca benar, dan terbaca saat dicetak hitam putih.
