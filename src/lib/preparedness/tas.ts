import type { HazardId, ProfilRumahTangga } from "@/types";
import type { ItemTas, KelompokTas } from "@/types/rencana";
import { ASUMSI } from "./constants";

export type TasInput = Pick<
  ProfilRumahTangga,
  | "bahaya"
  | "jumlahAnggota"
  | "persediaanHari"
  | "lansia"
  | "balita"
  | "hamil"
  | "disabilitas"
  | "obatRutin"
  | "jumlahObatRutin"
  | "hewanPeliharaan"
>;

export const URUTAN_KELOMPOK_TAS: KelompokTas[] = [
  "Air dan makanan",
  "Kesehatan",
  "Dokumen dan uang",
  "Perlengkapan",
  "Khusus keluarga",
];

/** Bobot skor per kelompok (Blueprint 9.1). */
export const BOBOT_KELOMPOK: Record<KelompokTas, 1 | 2> = {
  "Air dan makanan": 2,
  Kesehatan: 2,
  "Dokumen dan uang": 2,
  Perlengkapan: 1,
  "Khusus keluarga": 1,
};

/**
 * Kalkulator Tas Siaga (Blueprint 9.1), murni kode. Semua jumlah dibulatkan ke atas.
 * Id item stabil karena dipakai sebagai kunci progres (`tas:${id}`).
 */
export function hitungTas(p: TasInput): ItemTas[] {
  const n = p.jumlahAnggota;
  const d = p.persediaanHari;
  const L = p.lansia;
  const B = p.balita;
  const H = p.hamil;
  const D = p.disabilitas;
  const R = p.obatRutin ? p.jumlahObatRutin : 0;
  const ada = (...ids: HazardId[]) => ids.some((h) => p.bahaya.includes(h));
  const setengah = Math.ceil(n / 2);

  const out: ItemTas[] = [];
  const tambah = (id: string, kelompok: KelompokTas, nama: string, jumlah: number, satuan: string) =>
    out.push({ id, kelompok, nama, jumlah: Math.ceil(jumlah), satuan, bobot: BOBOT_KELOMPOK[kelompok] });

  // Air dan makanan
  tambah("air", "Air dan makanan", "Air minum", n * d * ASUMSI.airLiterPerOrangHari, "liter");
  tambah("makanan", "Air dan makanan", "Makanan siap makan", n * d * ASUMSI.porsiPerOrangHari, "porsi");
  if (B > 0) tambah("susu-bayi", "Air dan makanan", "Susu atau makanan bayi", d, "hari");

  // Kesehatan
  tambah("p3k", "Kesehatan", "Kotak P3K", 1, "buah");
  if (R > 0) tambah("obat-rutin", "Kesehatan", "Persediaan obat rutin (sesuai anjuran dokter)", Math.max(d, ASUMSI.minHariObatRutin), "hari");
  if (ada("gempa", "gunung_api", "karhutla")) tambah("masker", "Kesehatan", "Masker", n * ASUMSI.maskerPerOrang, "buah");
  if (B > 0) tambah("popok", "Kesehatan", "Popok", B * d * ASUMSI.popokPerBalitaHari, "buah");
  if (H > 0) tambah("perlengkapan-hamil", "Kesehatan", "Perlengkapan ibu hamil atau menyusui", 1, "set");
  tambah("sabun", "Kesehatan", "Sabun dan pembersih tangan", 1, "set");

  // Dokumen dan uang
  tambah("dokumen", "Dokumen dan uang", "Salinan dokumen penting dalam kantong kedap air", 1, "set");
  tambah("uang-tunai", "Dokumen dan uang", "Uang tunai secukupnya (nominal Anda tentukan sendiri)", 1, "set");
  tambah("daftar-kontak", "Dokumen dan uang", "Daftar kontak tercetak (Kartu Siaga)", 1, "set");

  // Perlengkapan
  tambah("senter", "Perlengkapan", "Senter", setengah, "buah");
  tambah("baterai", "Perlengkapan", "Baterai cadangan", setengah, "set");
  tambah("power-bank", "Perlengkapan", "Power bank", setengah, "buah");
  tambah("radio", "Perlengkapan", "Radio berbaterai", 1, "buah");
  tambah("pakaian", "Perlengkapan", "Pakaian ganti", n * ASUMSI.pakaianSetPerOrang, "set");
  tambah("selimut", "Perlengkapan", "Selimut atau jaket", n, "buah");
  if (ada("gempa", "tsunami", "longsor")) tambah("peluit", "Perlengkapan", "Peluit", n, "buah");
  if (ada("cuaca_ekstrem", "banjir")) tambah("jas-hujan", "Perlengkapan", "Jas hujan", n, "buah");
  if (ada("banjir", "tsunami", "gelombang_abrasi")) tambah("dry-bag", "Perlengkapan", "Kantong kedap air (dry bag)", 1, "buah");
  if (ada("gempa")) tambah("sepatu", "Perlengkapan", "Sepatu tertutup bersol tebal", n, "pasang");

  // Khusus keluarga
  if (L > 0) tambah("perlengkapan-lansia", "Khusus keluarga", "Perlengkapan lansia (kacamata cadangan, tongkat, alat bantu dengar sesuai kebutuhan)", 1, "set");
  if (D > 0) tambah("alat-disabilitas", "Khusus keluarga", "Alat bantu disabilitas sesuai jenis", 1, "set");
  if (B > 0) tambah("perlengkapan-bayi", "Khusus keluarga", "Perlengkapan bayi (botol, selimut)", B, "set");
  if (p.hewanPeliharaan) tambah("hewan", "Khusus keluarga", "Makanan dan perlengkapan hewan peliharaan", d, "hari");

  return out;
}

export function kelompokkanTas(tas: ItemTas[]): Array<{ kelompok: KelompokTas; item: ItemTas[] }> {
  return URUTAN_KELOMPOK_TAS.map((kelompok) => ({ kelompok, item: tas.filter((t) => t.kelompok === kelompok) })).filter(
    (g) => g.item.length > 0,
  );
}
