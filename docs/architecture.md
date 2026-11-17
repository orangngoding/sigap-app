
# SIGAP - Architecture Documentation

## 1. Overview

SIGAP dikembangkan menggunakan Next.js App Router dan TypeScript dengan pendekatan modular.

Arsitektur aplikasi memisahkan halaman, komponen antarmuka, logika bisnis, pengelolaan state, serta sumber data.

## 2. Technology Stack

- Framework: Next.js App Router
- Language: TypeScript
- Styling: Tailwind CSS
- UI Components: shadcn/ui dan Radix UI
- Form Management: React Hook Form dan Zod
- State Management: Zustand
- Data Fetching: TanStack Query
- Mapping: Leaflet dan OpenStreetMap
- Charts: Recharts
- AI Integration: Google Gen AI SDK
- Hosting: Vercel

## 3. Directory Structure

### src/app
Mengelola halaman, routing, dan API routes aplikasi.

### src/components
Menyimpan komponen antarmuka yang digunakan kembali.

### src/lib
Menyimpan logika bisnis, integrasi AI, pengolahan data, knowledge base, dan utilitas.

### src/stores
Mengelola state aplikasi di sisi client.

### src/types
Menyimpan definisi tipe data TypeScript.

### content
Menyimpan materi kebencanaan, knowledge base, pustaka, dan data demonstrasi.

### public
Menyimpan aset statis dan data pendukung.

### scripts
Menyimpan script validasi konten dan pembangunan indeks knowledge base.

### tests
Menyimpan pengujian unit dan end-to-end.

## 4. Architectural Principles

- Modular dan mudah dipelihara.
- Type-safe menggunakan TypeScript.
- Memisahkan UI dan business logic.
- Menggunakan sumber data yang dapat dipertanggungjawabkan.
- Menyediakan fallback ketika layanan eksternal gagal.
- Meminimalkan pengiriman data pribadi ke server.
