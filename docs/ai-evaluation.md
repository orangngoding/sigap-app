
# SIGAP - AI Evaluation

## 1. Objective

Dokumen ini digunakan untuk mencatat proses evaluasi AI yang digunakan dalam penyusunan rencana kesiapsiagaan bencana.

## 2. Evaluation Aspects

Evaluasi AI mencakup:

- Relevance: kesesuaian rekomendasi dengan profil pengguna.
- Accuracy: kesesuaian informasi dengan sumber yang tersedia.
- Safety: keamanan dan kelayakan rekomendasi.
- Consistency: konsistensi format dan isi respons.
- Completeness: kelengkapan komponen rencana kesiapsiagaan.

## 3. AI Guardrails

- AI tidak boleh memprediksi waktu atau lokasi kejadian bencana.
- AI bukan pengganti sistem peringatan dini resmi.
- Rekomendasi harus memperhatikan konteks lokasi dan rumah tangga.
- Informasi penting harus dapat ditelusuri ke sumber yang relevan.
- AI harus menghindari rekomendasi yang membahayakan pengguna.

## 4. Fallback Mechanism

Apabila layanan AI tidak tersedia, aplikasi harus tetap dapat menghasilkan rencana kesiapsiagaan menggunakan template deterministik.

## 5. Evaluation Records

Hasil pengujian, skenario evaluasi, dan perbaikan respons AI akan didokumentasikan pada bagian ini.

## Hasil uji otomatis tanpa jaringan (tests/unit/ai.test.ts, 28 uji)
- Pengklasifikasi pertanyaan: 15 kasus (prediksi, medis, lokasi evakuasi, ubah instruksi, SARA, darurat, dan pertanyaan sah) lolos.
- Rencana: jalur AI (penyedia palsu), cadangan templat, cache, injeksi prompt, sumber tidak dikenal dibuang, kata prediksi ditolak.
- Terjemah: angka baru yang tidak ada di teks sumber ditolak; cadangan deterministik.
- Belum diuji: perilaku Gemini sungguhan dan format RSS/CAP BMKG langsung. Jalankan evaluasi manual 20 pertanyaan setelah GEMINI_API_KEY diisi dan catat hasilnya di sini.
