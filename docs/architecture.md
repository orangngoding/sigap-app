# SIGAP - Arsitektur

## 1. Gambaran umum

SIGAP adalah aplikasi Next.js (App Router) berbahasa Indonesia untuk kesiapsiagaan bencana keluarga. Arsitekturnya memisahkan halaman, komponen antarmuka, logika bisnis, state di perangkat, dan sumber data. Data pribadi tidak punya akun dan tidak punya basis data server: semuanya disimpan di perangkat pengguna.

## 2. Teknologi

- Kerangka: Next.js 16 (App Router, Cache Components, Turbopack), React 19, TypeScript
- Tampilan: Tailwind CSS 4, Radix UI dengan pola shadcn/ui, lucide-react, Motion
- State di perangkat: Zustand (persist ke localStorage), divalidasi Zod saat dibaca kembali
- Pengambilan data: TanStack Query di klien, `fetch` bercache di server
- Validasi: Zod 4 untuk input API dan data tersimpan
- Peta dan grafik: Leaflet (OpenStreetMap), Recharts
- Dokumen: jsPDF dan qrcode (Kartu Siaga)
- AI: Google Gemini lewat REST API langsung (tanpa SDK), penyedia kedua kompatibel OpenAI sebagai cadangan; pencarian KB memakai BM25 buatan sendiri
- Luring dan PWA: service worker manual (`public/sw.js`), manifest (`src/app/manifest.ts`), hook `use-pasang-pwa`
- Uji: `tsx` dengan `node:assert` (30 berkas di `tests/unit/`), ESLint, `tsc`, GitHub Actions
- Hosting: Vercel

## 3. Struktur direktori

| Folder | Isi |
|---|---|
| `src/app` | Halaman, rute API (`api/`), metadata, gambar OpenGraph, manifest |
| `src/components` | Komponen per fitur (beranda, lokasi, risiko, rencana, kartu, iklim, latihan, simulasi, tanya, darurat, pustaka, data-saya, metodologi, global, ui) |
| `src/hooks` | Hook React (suara, penyusunan rencana, hidrasi store, risiko lokasi, keluarga, pasang PWA) |
| `src/lib` | Logika bisnis: `ai/`, `briefing/`, `data/`, `data-saya/`, `darurat/`, `iklim/`, `kartu/`, `keluarga/`, `kb/`, `latihan/`, `simulasi/`, `preparedness/`, `rencana/`, `risiko/`, `storage/`, `ratelimit/`, `http/`, `geo/` |
| `src/stores` | Store Zustand di perangkat (lokasi, profil, rencana, progres, tas, medis, keluarga, kartu, tanya, latihan, simulasi, iklim) |
| `src/types` | Tipe TypeScript bersama |
| `src/generated` | Indeks hasil `build:content` (jangan diedit manual) |
| `content` | Sumber konten: `kb/`, `pustaka/`, `hazards/`, `demo/`, `kontak.json` |
| `public` | Service worker, logo, foto, data wilayah per provinsi |
| `scripts` | Validasi dan pembangunan konten, data wilayah, data risiko, proyeksi kota, evaluasi AI |
| `tests/unit` | Uji unit tanpa jaringan |

## 4. Peta halaman

| Kelompok | Rute |
|---|---|
| Beranda dan lokasi | `/`, `/lokasi` |
| Rencana | `/rencana`, `/rencana/profil`, `/rencana/kartu`, `/rencana/cetak`, `/rencana/keluarga` |
| Siaga Iklim | `/iklim` (tab Minggu ini, Musim ini, Rumah & masa depan) |
| Simulasi dan Asisten | `/latihan`, `/latihan/simulator`, `/latihan/[id]`, `/tanya` |
| Darurat | `/darurat` |
| Pustaka | `/pustaka`, `/pustaka/[slug]`, `/pustaka/berita`, `/pustaka/cuaca` |
| Informasi | `/metodologi`, `/data-saya` |

## 5. Alur data

1. **Konten** di `content/` divalidasi dan diindeks menjadi `src/generated/` (323 potongan panduan, 11 artikel).
2. **Pengguna** memilih lokasi dan mengisi profil; keduanya disimpan di store lokal.
3. **Rute API** mengambil data BMKG dan penyedia terbuka, lalu mengembalikan sinyal yang dihitung kode.
4. **AI** (bila tersedia) hanya menyusun teks dari potongan KB dan sinyal itu. **Pagar** di `src/lib/ai/` memeriksa keluaran; bila gagal atau AI tidak ada, dipakai templat.
5. **Klien** menampilkan hasil, dan semua progres (centang, tas, tanggal kedaluwarsa, hasil latihan) kembali disimpan di perangkat.

## 6. Luring dan pemasangan

- `public/sw.js` menyimpan halaman inti (Mode Darurat, Kartu Siaga, Beranda) beserta JS/CSS yang dirujuk saat pertama dikunjungi, dan memakai strategi jaringan-dulu untuk halaman lain. Rute API dan data pribadi tidak pernah di-cache.
- Manifest menjadikan `/darurat` sebagai halaman awal aplikasi terpasang.
- `use-pasang-pwa` menangkap `beforeinstallprompt`, mendeteksi mode standalone dan platform (Android, iOS, desktop), dan dipakai di `/data-saya` (panduan lengkap) serta `/rencana?tab=bagikan` (Siapkan Mode Darurat).

## 7. Prinsip arsitektur

- Modular dan type-safe; UI dipisahkan dari logika bisnis.
- Angka dan keputusan penting dihitung kode yang bisa diuji; AI hanya merangkai teks.
- Setiap sumber data luar punya cadangan, dan umpan yang gagal dibaca tidak pernah ditampilkan sebagai "aman".
- Data pribadi tetap di perangkat; yang dikirim ke server hanya profil tanpa identitas dan nama wilayah.
- Rute API memvalidasi input, membatasi ukuran dan laju, menolak asal lintas situs, dan hanya mengakses host yang diizinkan.
