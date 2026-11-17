# SIGAP

**SIGAP** adalah aplikasi web kesiapsiagaan bencana untuk keluarga di Indonesia. Pengguna memilih lokasi, mengisi profil rumah tangga, lalu mendapat Rencana Siaga, daftar isi tas siaga, dan Kartu Siaga yang bisa dicetak. Semua panduan berasal dari sumber resmi (BNPB, BMKG, Badan Geologi, Kemenkes) dan setiap tindakan menautkan sumbernya.

> SIGAP bukan sistem peringatan dini resmi dan tidak memprediksi bencana. Ikuti selalu arahan BPBD, BMKG, dan petugas berwenang. Dalam keadaan darurat hubungi **112**.

## Fitur

| Fitur | Rute | Keterangan |
|---|---|---|
| Lokasi | `/lokasi` | Pilih provinsi sampai kelurahan (514 kab/kota) atau pakai lokasi perangkat; peta Leaflet |
| Profil wilayah | `/lokasi` | Prakiraan cuaca BMKG, gempa terkini, peringatan dini cuaca, tren hari hujan lebat tahunan, tautan InaRISK dan kanal resmi per bahaya |
| Profil keluarga | `/rencana/profil` | Anggota, kelompok rentan, bangunan, bahaya yang disiapkan; data pribadi tidak pernah dikirim ke server |
| Rencana Siaga | `/rencana` | Tindakan sebelum, saat, dan sesudah per bahaya; disusun AI dari KB, dengan cadangan templat tanpa AI |
| Tas siaga dan skor | `/rencana` | Jumlah dihitung kode dari profil; checklist dan skor kesiapsiagaan tersimpan di perangkat |
| Kartu Siaga | `/rencana/kartu` | Satu halaman A4/A5, hitam putih, kode QR ke Mode Darurat; cetak atau unduh PDF yang dibuat di perangkat |
| Mode Darurat | `/darurat` | Langkah singkat per bahaya dan nomor darurat; tetap bisa dibuka tanpa internet setelah pernah dibuka |
| Tanya | `/tanya` | Tanya jawab berbasis sumber; menolak prediksi, saran medis, dan lokasi evakuasi spesifik |
| Jelaskan Peringatan | `/tanya` | Menyederhanakan teks peringatan BMKG tanpa menambah fakta |
| Pustaka | `/pustaka` | 11 artikel edukasi yang dibangun dari KB, bisa dicetak |
| Metodologi | `/metodologi` | Cara kerja, sumber data, batasan, dan statistik KB |
| Data Saya | `/data-saya` | Ekspor atau hapus semua data yang tersimpan di perangkat |

Sembilan bahaya dicakup: banjir, longsor, gempa bumi, cuaca ekstrem, tsunami, kekeringan, kebakaran hutan dan lahan, gunung api, serta gelombang tinggi dan abrasi.

## Teknologi

- Next.js 16 (App Router, Cache Components), React 19, TypeScript
- Tailwind CSS 4, komponen Radix UI, ikon lucide-react
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
src/app/          Halaman dan rute API (rencana, tanya, terjemah, cuaca, gempa, peringatan, iklim)
src/components/   Komponen per fitur
src/lib/          ai/ (penyedia, pagar, prompt), kb/ (skema, pencarian), data/ (BMKG), rencana/, kartu/
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

Profil keluarga, kontak, titik kumpul, catatan, dan progres checklist disimpan hanya di perangkat pengguna. Ke server hanya dikirim profil tanpa data pribadi (jumlah anggota, kelompok rentan, jenis bangunan, bahaya) dan nama wilayah, untuk menyusun rencana.

## Tim

SIGAP dikembangkan oleh tim empat orang untuk lomba IT RUSH 2026.

## Lisensi

Lisensi akan ditentukan oleh tim. Konten panduan tetap milik lembaga sumbernya; lihat [docs/attribution.md](docs/attribution.md).
