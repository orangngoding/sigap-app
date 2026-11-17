
# SIGAP

**SIGAP** adalah aplikasi web kesiapsiagaan bencana yang membantu pengguna memahami risiko bencana dan menyusun rencana kesiapsiagaan berdasarkan lokasi serta profil rumah tangga.

## Tujuan Proyek

SIGAP dirancang untuk memberikan informasi dan rekomendasi kesiapsiagaan bencana yang kontekstual, mudah dipahami, dan dapat diterapkan oleh masyarakat.

Aplikasi memanfaatkan data resmi dan terbuka serta teknologi AI untuk membantu menyusun rencana kesiapsiagaan personal.

## Fitur Utama

- Pemilihan lokasi dan informasi profil wilayah.
- Informasi cuaca, gempa bumi, dan peringatan dini.
- Profil rumah tangga.
- Rencana kesiapsiagaan berbantuan AI.
- Kalkulator tas siaga bencana.
- Skor dan checklist kesiapsiagaan.
- Kartu kesiapsiagaan yang dapat dicetak.
- Mode darurat dan dukungan offline.
- Pustaka edukasi kebencanaan.

## Tech Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- React
- Zustand
- TanStack Query
- Google Gen AI SDK
- Leaflet
- Recharts

## Getting Started

### Prerequisites

- Node.js
- npm
- Git

### Installation

Clone repository:

```bash
git clone https://github.com/orangngoding/sigap-app.git
cd sigap-app
```

Install dependencies:

```bash
npm install
```

Copy `.env.example` menjadi `.env.local`, kemudian isi konfigurasi yang diperlukan.

Jalankan development server:

```bash
npm run dev
```

Buka http://localhost:3000 melalui browser.

## Environment Variables

Konfigurasi environment disimpan secara lokal melalui `.env.local`.

Gunakan `.env.example` sebagai referensi konfigurasi.

**Jangan pernah mengunggah API key atau informasi rahasia ke repository.**

## Project Structure

```text
src/
  app/
  components/
  lib/
  stores/
  types/

content/
public/
scripts/
tests/
docs/
```

## Team

SIGAP dikembangkan oleh tim yang terdiri dari empat anggota.

## Disclaimer

SIGAP merupakan aplikasi pendukung kesiapsiagaan bencana, bukan sistem peringatan dini resmi dan bukan alat untuk memprediksi kejadian bencana.

Pengguna tetap harus mengikuti informasi dan arahan dari instansi resmi.

## License

License information will be determined by the project team.
