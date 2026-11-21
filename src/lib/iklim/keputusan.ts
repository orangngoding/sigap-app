// Bagian Penasihat Keputusan yang MURNI (tanpa AI, tanpa pembaca env), aman dipakai di peramban dan server:
// tipe hasil, perakitan opsi dari katalog, dan urutan cadangan. Dipakai sebagai tampilan awal yang langsung
// muncul (juga saat offline) dan sebagai cadangan bila AI gagal.
import type { ProyeksiResponse } from "@/lib/data/proyeksi";
import { MIN_HARI_CADANGAN_AIR, bulanMulai, efekAir, hitungAir, kemarauDepanStabil, urutkanIntervensi, type BulanMulai, type EfekAir, type HasilUji, type InputRumah, type Intervensi } from "./ketahanan";

export interface OpsiKeputusan {
  id: string;
  judul: string;
  kategori: Intervensi["kategori"];
  target: Intervensi["target"];
  biaya: Intervensi["biaya"];
  ruang: Intervensi["ruang"];
  alasan: string;
  langkahPertama: string;
  /** Dihitung kode, bukan AI. */
  efekAir: EfekAir | null;
  mulai: BulanMulai | null;
}
export interface HasilKeputusan {
  mode: "ai" | "cadangan";
  dibuatPada: string;
  ringkasan: string;
  opsi: OpsiKeputusan[];
}

export const fmt = (v: number) => String(v).replace(".", ",");
export const NAMA_PRIORITAS = { air: "air bersih", panas: "panas", hujan: "hujan lebat dan genangan" } as const;

export function jadiOpsi(iv: Intervensi, alasan: string, langkah: string, i: InputRumah, p: ProyeksiResponse, now: Date): OpsiKeputusan {
  return {
    id: iv.id, judul: iv.judul, kategori: iv.kategori, target: iv.target, biaya: iv.biaya, ruang: iv.ruang,
    alasan, langkahPertama: langkah, efekAir: efekAir(i, iv, p), mulai: bulanMulai(iv.sebelum, p, now),
  };
}

/** Penjelasan cadangan dari kode = deskripsi katalog. Efek air tidak diulang di sini: tampilan menuliskannya di baris "Dampak". */
export function alasanCadangan(iv: Intervensi, _e: EfekAir | null): string {
  void _e;
  return iv.deskripsi;
}

export function keputusanCadangan(i: InputRumah, u: HasilUji, p: ProyeksiResponse, now: Date, kendala?: string): { ringkasan: string; opsi: OpsiKeputusan[] } {
  const pilihan = urutkanIntervensi(i, u, p, 3, kendala);
  const bagian = {
    air: u.air.kurangKini > 0
      ? `saat kemarau terburuk, rumah ini bisa kekurangan air ${u.air.kurangKini} hari, dan ${u.air.kurangDepan} hari bila tren berlanjut 10-25 tahun lagi`
      : `air simpanan cukup untuk kemarau saat ini, tetapi bisa kurang ${u.air.kurangDepan} hari bila tren berlanjut 10-25 tahun lagi`,
    panas: `saat ini sekitar ${fmt(u.panas.hariKini)} hari sangat panas per tahun (1990-an: ${fmt(u.panas.hariDulu)}), dan ${fmt(u.panas.hariDepan)} hari bila tren berlanjut`,
    hujan: `saat ini sekitar ${fmt(u.hujan.hariKini)} hari hujan ekstrem per tahun (1990-an: ${fmt(u.hujan.hariDulu)}), dan ${fmt(u.hujan.hariDepan)} hari bila tren berlanjut`,
  } as const;
  const ringkasan = `Untuk rumah ini, yang paling perlu disiapkan lebih dulu adalah ${NAMA_PRIORITAS[u.prioritas]}: ${bagian[u.prioritas]}. Ini hasil perhitungan dari proyeksi model, bukan kepastian, tetapi bersiap sejak sekarang membuat perubahan lebih mudah dihadapi.`;
  return { ringkasan, opsi: pilihan.map((iv) => jadiOpsi(iv, alasanCadangan(iv, efekAir(i, iv, p)), iv.langkahPertama, i, p, now)) };
}

// ---------- Tingkat keyakinan (dihitung kode, bukan dinilai AI) ----------
export type TingkatYakin = "tinggi" | "sedang" | "rendah";
export interface Keyakinan {
  tingkat: TingkatYakin;
  alasan: string;
}

const METRIK_SASARAN = {
  air: { k: "keringTerpanjang", apa: "kemarau panjang", naik: "makin panjang" },
  panas: { k: "hariSangatPanas", apa: "hari panas terik", naik: "makin sering" },
  hujan: { k: "hariHujanEkstrem", apa: "hujan sangat deras", naik: "makin sering" },
} as const;

/**
 * Seberapa kuat data mendukung risiko yang dijawab sebuah tindakan. Tinggi: nilai kedua model untuk 2031-2050 sama-sama
 * di atas nilai kedua model pada 1990-an. Sedang: rata-rata naik, tetapi kedua model belum sepakat. Rendah: data tidak
 * menunjukkan kenaikan, jadi saran bertumpu pada keadaan rumah. Tindakan umum: sedang (efeknya tidak dihitung).
 */
/** Jawaban pengguna tentang air, ditulis ulang apa adanya (bukan diklaim sebagai fakta). */
const JAWABAN_AIR = { jarang: "jarang sulit", hari: "biasanya sulit beberapa hari", minggu: "biasanya sulit beberapa minggu", kemarau: "sulit hampir sepanjang kemarau" } as const;

export function keyakinan(target: Intervensi["target"], p: ProyeksiResponse, i?: InputRumah): Keyakinan {
  if (target === "umum") return { tingkat: "sedang", alasan: "Berguna untuk semua jenis cuaca ekstrem, tetapi manfaatnya tidak bisa dihitung pasti untuk rumah Anda." };
  // Air saat ini bertumpu pada JAWABAN pengguna (bukan model): disebut sebagai jawaban dan perkiraan, bukan fakta.
  if (target === "air" && i) {
    const air = hitungAir(i, p);
    if (air.kurangKini > 0 && i.airDiketahui !== false)
      return { tingkat: "tinggi", alasan: `Anda menjawab air di rumah ${JAWABAN_AIR[i.gangguanAir]} saat kemarau. Kami perkirakan itu sekitar ${air.perluKini} hari, ${air.hariCukup > 0 ? `sedangkan air simpanan Anda baru cukup ${fmt(air.hariCukup)} hari` : "padahal rumah Anda belum punya air simpanan"}.` };
  }
  const m = METRIK_SASARAN[target];
  const dulu = p.periode[0]?.metrik[m.k];
  const depan = p.periode[p.periode.length - 1]?.metrik[m.k];
  const keadaan =
    target === "hujan" && i?.pernahTergenang ? "rumah Anda pernah tergenang"
    : target === "panas" && i && i.rentan > 0 && i.atap === "seng" ? "ada anggota rentan dan atap rumah dari seng"
    : target === "panas" && i?.atap === "seng" ? "atap rumah Anda dari seng"
    : target === "panas" && i && i.rentan > 0 ? "ada lansia, balita, atau ibu hamil di rumah"
    : target === "air" ? (i?.airDiketahui === false ? `setiap rumah sebaiknya punya cadangan air minimal ${MIN_HARI_CADANGAN_AIR} hari` : "jawaban Anda tentang air di rumah")
    : "keadaan rumah Anda";
  const asal = p.perkiraan ? ` (memakai data ${p.perkiraan.kota}, sekitar ${p.perkiraan.km} km dari lokasi Anda)` : "";
  // Air: angka di layar memakai kemarau TAHUN TERBURUK; dasar saran harus sejalan dengannya.
  if (target === "air" && p.kemarauTerburuk) {
    const kini = p.kemarauTerburuk.kini;
    const nanti = kemarauDepanStabil(kini, p.kemarauTerburuk["2050"]);
    const naikRata = Boolean(dulu && depan && depan.rata > dulu.rata);
    if (nanti <= kini) return { tingkat: "rendah", alasan: `Kemarau panjang diperkirakan tidak bertambah. Saran ini tetap berguna karena ${keadaan}.` };
    if (!naikRata) return { tingkat: "sedang", alasan: `Di tahun yang paling kering, kemarau bisa sedikit lebih panjang (sekitar ${kini} menjadi ${nanti} hari), tetapi di tahun biasa tidak banyak berubah${asal}.${i?.airDiketahui === false ? ` Saran ini mengikuti anjuran bahwa ${keadaan}.` : ""}` };
  }
  if (!dulu || !depan || depan.rata <= dulu.rata) return { tingkat: "rendah", alasan: `Data belum menunjukkan ${m.apa} ${m.naik}. Saran ini tetap berguna karena ${keadaan}.` };
  // Metode delta: pembanding 1990-an adalah pengamatan, dan rentang masa depan adalah persentil 10-90 ansambel CMIP6.
  const delta = p.metode?.id === "pengamatan-delta";
  if (depan.min > dulu.maks)
    return {
      tingkat: "tinggi",
      alasan: delta
        ? `Catatan cuaca di lokasi Anda dan perkiraan iklim dunia sama-sama menunjukkan ${m.apa} ${m.naik}.`
        : `${p.model.length >= 2 ? `${p.model.length === 2 ? "Dua" : "Semua"} model iklim dunia sama-sama memperkirakan` : "Model iklim memperkirakan"} ${m.apa} ${m.naik}${asal}.`,
    };
  return { tingkat: "sedang", alasan: `Kemungkinan ${m.apa} ${m.naik}, tetapi seberapa banyak belum pasti${asal}.` };
}

/** Teks rentang bulan: "Mei–Juli", "Desember–Februari" (berputar tahun), atau "Maret dan Mei". */
export function rentangBulan(nama: string[], indeks: number[]): string {
  const ada = new Set(indeks);
  if (ada.size === 0) return "tidak ada";
  if (ada.size === 12) return "sepanjang tahun";
  const kelompok: string[] = [];
  for (const i of [...ada].sort((a, b) => a - b)) {
    if (ada.has((i + 11) % 12)) continue; // bukan awal rentang
    let akhir = i;
    while (ada.has((akhir + 1) % 12)) akhir = (akhir + 1) % 12;
    const panjang = ((akhir - i + 12) % 12) + 1;
    kelompok.push(panjang === 1 ? nama[i] : panjang === 2 ? `${nama[i]} dan ${nama[akhir]}` : `${nama[i]}–${nama[akhir]}`);
  }
  return kelompok.join(", ");
}
