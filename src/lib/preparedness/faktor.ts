import type { ProfilRumahTangga } from "@/types";
import { FAKTOR } from "./constants";

export type FaktorInput = Pick<
  ProfilRumahTangga,
  | "lansia"
  | "balita"
  | "hamil"
  | "disabilitas"
  | "obatRutin"
  | "punyaKendaraan"
  | "bangunan"
  | "lantaiTinggal"
  | "jumlahAnggota"
  | "hewanPeliharaan"
>;

/**
 * Faktor kerentanan (Blueprint 9.3): aturan, bukan AI. Urutan mengikuti tabel;
 * maksimal enam faktor (batas untuk masukan AI), tampilan penuh memakai `semuaFaktor`.
 */
export function semuaFaktor(p: FaktorInput): string[] {
  const out: string[] = [];
  if (p.lansia > 0) out.push("Ada anggota lansia");
  if (p.balita > 0) out.push("Ada balita");
  if (p.hamil > 0) out.push("Ada ibu hamil atau menyusui");
  if (p.disabilitas > 0) out.push("Ada anggota dengan disabilitas");
  if (p.obatRutin) out.push("Ada anggota yang membutuhkan obat rutin");
  if (!p.punyaKendaraan) out.push("Tidak memiliki kendaraan untuk evakuasi");
  if (
    (p.bangunan === "apartemen" || p.bangunan === "kos") &&
    (p.lantaiTinggal ?? 0) >= FAKTOR.lantaiTinggiMin
  ) {
    out.push("Tinggal di lantai tinggi");
  }
  if (p.jumlahAnggota >= FAKTOR.keluargaBesarMin) out.push("Keluarga besar");
  if (p.hewanPeliharaan) out.push("Memiliki hewan peliharaan");
  return out;
}

export function hitungFaktorKerentanan(p: FaktorInput): string[] {
  return semuaFaktor(p).slice(0, FAKTOR.maksDikirim);
}
