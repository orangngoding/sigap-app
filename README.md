# SIGAP

**SIGAP** adalah aplikasi web kesiapsiagaan bencana untuk keluarga di Indonesia. Pengguna memilih lokasi, mengisi profil rumah tangga, lalu mendapat Rencana Siaga, daftar isi tas siaga, dan Kartu Siaga yang bisa dicetak. Semua panduan berasal dari sumber resmi (BNPB, BMKG, Badan Geologi, Kemenkes) dan setiap tindakan menautkan sumbernya.

> SIGAP bukan sistem peringatan dini resmi dan tidak memprediksi bencana. Ikuti selalu arahan BPBD, BMKG, dan petugas berwenang. Dalam keadaan darurat hubungi **112**.

## Fitur

| Fitur | Rute | Keterangan |
|---|---|---|
| Briefing Siaga Hari Ini | `/`, `/lokasi` | Ringkasan cuaca, peringatan dini, dan gempa BMKG untuk lokasi pengguna, tingkat perhatian (Tenang/Perhatikan/Waspada) yang dihitung kode, dan 3 tindakan hari ini yang disesuaikan dengan keluarga; dirangkum AI dengan cadangan templat |
| Iklim 2050 (Mesin Waktu Iklim) | `/iklim` | Proyeksi iklim lokasi pengguna dari dua model CMIP6 HighResMIP (Open-Meteo Climate API): hari sangat panas, hari 35°C+, suhu siang, curah hujan, hari hujan ekstrem, dan kemarau terpanjang untuk 1990-an, kini, dan menuju 2050, dengan rentang antar-model dan grafik 60 tahun. Metrik dihitung kode; AI menyusun dampak dan langkah adaptasi keluarga (rumah, air, kesehatan, ekonomi, komunitas), ditolak bila memuat angka di luar data atau rupiah, dengan cadangan templat |
| Lokasi | `/lokasi` | Pilih provinsi sampai kelurahan (514 kab/kota) atau pakai lokasi perangkat; peta Leaflet |
| Profil wilayah | `/lokasi` | Prakiraan cuaca BMKG, gempa terkini, peringatan dini cuaca, tren hari hujan lebat tahunan, tautan InaRISK dan kanal resmi per bahaya |
| Profil keluarga | `/rencana/profil` | Anggota, kelompok rentan, bangunan, bahaya yang disiapkan; data pribadi tidak pernah dikirim ke server |
| Rencana Siaga | `/rencana` | Tindakan sebelum, saat, dan sesudah per bahaya; disusun AI dari KB, dengan cadangan templat tanpa AI |
| Tas siaga dan skor | `/rencana` | Jumlah dihitung kode dari profil; checklist dan skor kesiapsiagaan tersimpan di perangkat |
| Pengingat kedaluwarsa | `/rencana` | Tanggal kedaluwarsa air, makanan, obat, dan baterai; peringatan di Rencana dan Beranda; unduh pengingat kalender (.ics) seminggu sebelum kedaluwarsa plus pemeriksaan tiap 3 bulan |
| Bagikan ke keluarga | `/rencana` | Ringkasan rencana (112, titik kumpul, langkah saat kejadian, isi tas) lewat WhatsApp atau salin teks; nomor kontak tidak ikut |
| Latihan Siaga | `/latihan` | Enam simulasi keputusan bercabang (gempa, banjir, tsunami, cuaca ekstrem, asap karhutla, longsor); umpan balik mengutip panduan KB; lulus (nilai 70+) menaikkan skor kesiapsiagaan |
| Kartu Siaga | `/rencana/kartu` | Satu halaman A4/A5, hitam putih, kode QR ke Mode Darurat; cetak atau unduh PDF yang dibuat di perangkat |
| Mode Darurat | `/darurat` | Langkah singkat per bahaya dan nomor darurat, bisa dibacakan; tetap bisa dibuka tanpa internet setelah pernah dibuka |
| Asisten SIGAP | `/tanya` | Asisten AI yang sadar konteks: membaca kondisi BMKG terkini di lokasi pengguna bila pertanyaan menyangkut keadaan sekarang, memakai ringkasan rencana keluarga (butir belum dikerjakan, isi tas hampir kedaluwarsa), dan menyarankan tombol aksi aplikasi. Percakapan seperti Gemini: banyak sesi (baru, riwayat, cari, ganti nama, hapus), ubah pertanyaan lalu kirim ulang, buat ulang jawaban, hentikan jawaban; dikte suara yang tetap mendengar saat jeda dan terkirim otomatis setelah sekitar 5,5 detik hening; jawaban bisa dibacakan (ingat konteks, personal ke profil keluarga). Hibrida: panduan resmi KB beserta kutipan bila cocok, pengetahuan umum Gemini bila tidak; saran pertanyaan lanjutan; menolak prediksi, saran medis, dan lokasi evakuasi spesifik |
| Asisten di mana saja | semua halaman | Tombol Asisten melayang, serta tombol "Tanya" di tindakan rencana, kartu data lokasi, dan briefing yang langsung menanyakan konteks itu |
| Jelaskan Peringatan | `/tanya`, kartu Peringatan | Menyatu di Asisten: teks peringatan BMKG yang ditempel otomatis disederhanakan tanpa menambah fakta |
| Pustaka | `/pustaka` | 11 artikel edukasi yang dibangun dari KB, bisa dicetak |
| Metodologi | `/metodologi` | Cara kerja, sumber data, batasan, dan statistik KB |
| Data Saya | `/data-saya` | Ringkasan data di perangkat, unduh cadangan dan pulihkan di perangkat lain (pindah HP), atau hapus semua data |

Sembilan bahaya dicakup: banjir, longsor, gempa bumi, cuaca ekstrem, tsunami, kekeringan, kebakaran hutan dan lahan, gunung api, serta gelombang tinggi dan abrasi.

## Teknologi

- Next.js 16 (App Router, Cache Components), React 19, TypeScript
- Tailwind CSS 4, komponen Radix UI, ikon lucide-react, animasi Motion (menghormati pengaturan "kurangi gerakan")
- Zustand (penyimpanan lokal di perangkat), TanStack Query, Zod
- Leaflet dan react-leaflet untuk peta, Recharts untuk grafik tren iklim
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

## Tim

SIGAP dikembangkan oleh tim empat orang untuk lomba IT RUSH 2026.

## Lisensi

Lisensi akan ditentukan oleh tim. Konten panduan tetap milik lembaga sumbernya; lihat [docs/attribution.md](docs/attribution.md).
