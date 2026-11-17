
# SIGAP - Data Sources

## 1. Purpose

Dokumen ini mencatat sumber data yang digunakan SIGAP untuk menyediakan informasi terkait cuaca, gempa bumi, peringatan dini, dan kondisi wilayah.

## 2. Planned Data Sources

| Source | Data | Usage |
|---|---|---|
| BMKG | Informasi cuaca, gempa, dan peringatan dini | Informasi kebencanaan |
| Open-Meteo | Data cuaca | Informasi kondisi cuaca |
| OpenStreetMap | Data peta | Visualisasi lokasi |

## 3. Data Handling

- Data harus dinormalisasi sebelum digunakan oleh komponen aplikasi.
- Informasi harus mencantumkan sumber yang relevan.
- Kegagalan layanan eksternal harus ditangani dengan baik.
- Data yang sudah tidak aktual tidak boleh ditampilkan seolah-olah masih terkini.

## 4. Data Reliability

SIGAP tidak membuat klaim bahwa data eksternal selalu tersedia atau selalu aktual.

Jika sumber data mengalami gangguan, aplikasi harus memberikan informasi mengenai keterbatasan tersebut dan mengarahkan pengguna ke sumber resmi jika diperlukan.

## 5. Attribution

Ketentuan penggunaan, atribusi, dan lisensi masing-masing sumber akan diverifikasi sebelum fitur terkait dirilis.

## 6. Hasil Verifikasi (Blueprint 15.3)

Diperbarui 2026-11-17. Status: berhasil / gagal / berbeda dari dokumen.

| Pemeriksaan | Hasil | Catatan |
|---|---|---|
| Dataset wilayah | Berhasil | github.com/cahyadsn/wilayah (MIT), Kepmendagri No 300.2.2-2138 Tahun 2025. Dikonversi oleh `scripts/bangun-wilayah.ts` menjadi 38 provinsi, 514 kab/kota, 7.285 kecamatan, 83.762 kelurahan/desa. Kode kelurahan berformat 10 digit bertitik (mis. 31.71.01.1001), sama dengan `adm4` BMKG. |
| Koordinat wilayah | Berbeda dari dokumen | Dataset hanya punya koordinat tingkat kab/kota, bukan kelurahan. Kelurahan memakai pusat kab/kota (perkiraan); peta dan jarak gempa diberi keterangan. "Gunakan lokasi saya" menebak kab/kota terdekat, bukan kelurahan. |
| Kesalahan data sumber | Dikoreksi | Longitude Kabupaten Wakatobi (74.07) tertulis 23.5389; dikoreksi ke 123.5389 di skrip (poligon batas di baris yang sama berada di sekitar 123.58). Skrip gagal bila ada kab/kota di luar kotak batas Indonesia. |
| Open-Meteo Historical | Berhasil | Satu panggilan arsip dari jaringan pengembang mengembalikan 200 dan JSON harian. |
| BMKG prakiraan cuaca (adm4 31.71.01.1001) | Berhasil (diuji tim di peramban, 2026-11-17) | Respons sesuai bentuk di Blueprint 13.2: data[0].cuaca berupa larik hari berisi larik interval; kolom local_datetime, utc_datetime, weather_desc, t, hu, ws, wd, vs_text. Nilai weather_desc yang teramati: Hujan Ringan, Berawan, Cerah Berawan, Cerah, Hujan Petir, Petir. vs_text bernilai null. Zona waktu tingkat atas berupa nama IANA (Asia/Jakarta), di data[0].lokasi berupa +0700. URL ikon memuat spasi (di-encode di normalizeCuaca). Fixture: tests/fixtures/bmkg-cuaca-31.71.01.1001.json |
| BMKG gempa terbaru (autogempa.json) | Berhasil (2026-11-17) | Coordinates "lat,lon", Kedalaman "2 km", Magnitude string, Shakemap hanya nama berkas (awalan https://static.bmkg.go.id/ ditambahkan kode). Fixture: tests/fixtures/bmkg-gempa-autogempa.json. gempaterkini.json dan gempadirasakan.json BELUM diuji. |
| BMKG peringatan dini (RSS nowcast) | Sebagian (2026-11-17) | Umpan RSS terbuka dari peramban tim. Judul berpola "<Kejadian> di <Provinsi>", deskripsi menyebut kecamatan dengan huruf besar dan memakai frasa "akan terjadi". Berkas CAP XML detail BELUM diuji (struktur uraiCap masih asumsi). Perilaku saat tidak ada peringatan aktif BELUM diamati. |
| BMKG dari server (Vercel) | BELUM diuji | Jaringan pengembang di luar komputer tim menerima 403 Forbidden dari ketiga endpoint BMKG. Wajib diuji dari deploy Vercel; bila diblokir, kartu cuaca, gempa, dan peringatan hanya menampilkan status dan tautan resmi. |
| Hosting dan kuota | Belum diuji | Deploy dari anggota non-pemilik, kuota Gemini, dan tautan resmi level C masih perlu diverifikasi tim. Nomor darurat nasional sudah dikonfirmasi (2026-11-17). |
