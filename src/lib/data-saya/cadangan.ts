// Cadangan data SIGAP di perangkat: ekspor ke JSON dan pulihkan di perangkat lain (ganti HP, peramban baru).
// Murni (tanpa DOM) agar bisa diuji. File cadangan dianggap tidak tepercaya: hanya kunci `sigap:v1:*`
// yang dikenal yang dipulihkan, ukurannya dibatasi, dan isinya harus JSON.
import { KUNCI_KELUARGA, bersihkanDaftar } from "@/lib/keluarga/keluarga";

export const AWALAN = "sigap:v1:";
/** Batas ukuran file cadangan (byte). Data SIGAP biasanya puluhan KB. */
export const MAKS_BYTE_CADANGAN = 2 * 1024 * 1024;

/** Kunci yang boleh dipulihkan. Cache respons data dan antrean toast tidak ikut (bisa dibuat ulang). */
const POLA_KUNCI = /^sigap:v1:(lokasi|profil|progres|rencana|kartu|tanya|latihan|tas|iklimrumah|medis|simulasi|aksiiklim|keluarga)$/;

export interface IsiCadangan {
  diekspor: string | null;
  /** kunci -> nilai siap ditulis ke localStorage (string JSON). */
  kunci: Record<string, string>;
  dilewati: string[];
}

export type HasilBaca = { ok: true; isi: IsiCadangan } | { ok: false; pesan: string };

export function bacaCadangan(teks: string): HasilBaca {
  if (new TextEncoder().encode(teks).length > MAKS_BYTE_CADANGAN) return { ok: false, pesan: "Berkas terlalu besar untuk data SIGAP." };
  let json: unknown;
  try {
    json = JSON.parse(teks);
  } catch {
    return { ok: false, pesan: "Berkas ini bukan data SIGAP. Pilih berkas “Data-SIGAP…” yang Anda simpan dari HP lama." };
  }
  const o = json as { diekspor?: unknown; data?: unknown };
  if (!o || typeof o !== "object" || !o.data || typeof o.data !== "object" || Array.isArray(o.data)) {
    return { ok: false, pesan: "Isi berkas tidak dikenali sebagai data SIGAP." };
  }
  const kunci: Record<string, string> = {};
  const dilewati: string[] = [];
  for (const [k, v] of Object.entries(o.data as Record<string, unknown>)) {
    if (!POLA_KUNCI.test(k)) {
      dilewati.push(k);
      continue;
    }
    // Daftar keluarga bukan store zustand ({ versi, aktif, daftar }): diperiksa dengan pembersihnya sendiri.
    // Sebelumnya ikut ditolak oleh pemeriksaan { state } di bawah, sehingga semua keluarga lain hilang saat dipulihkan.
    if (k === KUNCI_KELUARGA) {
      const d = bersihkanDaftar(v);
      if (d) kunci[k] = JSON.stringify(d);
      else dilewati.push(k);
      continue;
    }
    // Store zustand menyimpan { state, version }; nilai lain tidak dipulihkan.
    if (!v || typeof v !== "object" || !("state" in v)) {
      dilewati.push(k);
      continue;
    }
    kunci[k] = JSON.stringify(v);
  }
  if (Object.keys(kunci).length === 0) return { ok: false, pesan: "Tidak ada data SIGAP yang bisa dipulihkan dari berkas ini." };
  const diekspor = typeof o.diekspor === "string" && !Number.isNaN(Date.parse(o.diekspor)) ? o.diekspor : null;
  return { ok: true, isi: { diekspor, kunci, dilewati } };
}

const LABEL: Record<string, string> = {
  lokasi: "lokasi",
  profil: "profil keluarga",
  progres: "centang rencana",
  rencana: "rencana siaga",
  kartu: "pengaturan Kartu Siaga",
  tanya: "riwayat Asisten",
  latihan: "hasil Latihan Siaga",
  tas: "kedaluwarsa tas siaga",
  iklimrumah: "jawaban Siaga Iklim",
  aksiiklim: "tindakan dari Siaga Iklim",
  keluarga: "daftar keluarga yang didampingi",
  medis: "info medis darurat",
  simulasi: "riwayat Simulasi",
};

/** Daftar isi cadangan yang mudah dibaca, untuk konfirmasi sebelum memulihkan. */
export const ringkasIsi = (isi: IsiCadangan): string[] => Object.keys(isi.kunci).map((k) => LABEL[k.slice(AWALAN.length)] ?? k);
