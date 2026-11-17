
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
