// Pembantu sisi klien untuk /api/rencana (Blueprint 9.2, 9.5, 13.1).
import type { CuacaResponse, GempaResponse, Lokasi, ProfilAnonim } from "@/types";
import type { RencanaTersimpan } from "@/types/rencana";
import type { HasilRencana } from "@/lib/ai/rencana";
import { readCache } from "@/lib/storage/safe-storage";
import { bangunSorotan } from "./sorotan";
import { hashMasukan } from "./hash";

const KUNCI_LOG = "sigap:v1:ai-log";
const BATAS_PER_JAM = 3; // Blueprint: Susun ulang dibatasi 3 kali per jam di klien
const JAM = 3_600_000;

function bacaLog(sekarang: number): number[] {
  try {
    const mentah = JSON.parse(localStorage.getItem(KUNCI_LOG) ?? "[]") as unknown;
    return Array.isArray(mentah) ? mentah.filter((x): x is number => typeof x === "number" && sekarang - x < JAM) : [];
  } catch {
    return [];
  }
}

/** Sisa jatah penyusunan ulang di jam ini dan waktu jatah berikutnya pulih (ms). */
export function jatahPenyusunan(sekarang = Date.now()): { sisa: number; pulihDalamMs: number } {
  const log = bacaLog(sekarang);
  return { sisa: Math.max(0, BATAS_PER_JAM - log.length), pulihDalamMs: log.length >= BATAS_PER_JAM ? JAM - (sekarang - Math.min(...log)) : 0 };
}

export function catatPenyusunan(sekarang = Date.now()) {
  try {
    localStorage.setItem(KUNCI_LOG, JSON.stringify([...bacaLog(sekarang), sekarang]));
  } catch {
    /* penyimpanan tidak tersedia: jatah tidak dicatat */
  }
}

/** Sorotan hidup dari cache lokal kartu Cuaca dan Gempa (tanpa permintaan jaringan baru). */
export function bacaRingkasanLokal(l: Pick<Lokasi, "adm4" | "lat" | "lon">) {
  const cuaca = readCache<CuacaResponse>("cuaca", l.adm4)?.data ?? null;
  const gempa = readCache<GempaResponse>("gempa", `${l.lat.toFixed(3)},${l.lon.toFixed(3)}`)?.data ?? null;
  return {
    sorotan: bangunSorotan(cuaca, gempa),
    ringkasanData: { hujanLebat48j: !!cuaca?.ringkasan?.hujanLebat48j, gempaDekat24j: !!gempa?.ringkasan?.gempaDekat24j },
  };
}

export function bangunPermintaan(l: Lokasi, profil: ProfilAnonim, ringkasanData: { hujanLebat48j: boolean; gempaDekat24j: boolean }, abaikanCache: boolean) {
  return {
    lokasi: { kelurahan: l.kelurahan, kecamatan: l.kecamatan, kabKota: l.kabKota, provinsi: l.provinsi },
    profil,
    ringkasanData,
    abaikanCache,
  };
}

export function kePenyimpanan(d: HasilRencana, adm4: string, profil: ProfilAnonim): RencanaTersimpan {
  return {
    versi: 1,
    dibuatPada: d.dibuatPada,
    mode: d.mode,
    hashMasukan: hashMasukan(adm4, profil),
    lokasiAdm4: adm4,
    ringkasanRisiko: d.ringkasanRisiko,
    faktorKerentanan: d.faktorKerentanan,
    tindakan: d.tindakan,
    tas: d.tas,
    rekomendasiEdukasi: d.rekomendasiEdukasi,
    catatanKeterbatasan: d.catatanKeterbatasan,
    perluDiperbarui: false,
  };
}
