import type { Lokasi } from "@/types";
import type { JawabanPemicu, ProfilDraft } from "@/types/rencana";
import { PERTANYAAN_PEMICU, SELALU_DISARANKAN } from "@/lib/hazards/pertanyaan";
import { BATAS_PROFIL as B } from "./constants";

export function buatProfilAwal(): ProfilDraft {
  const jawabanPemicu: Record<string, JawabanPemicu> = {};
  for (const q of PERTANYAAN_PEMICU) jawabanPemicu[q.id] = "tidak_tahu"; // bawaan (Blueprint 7.1)
  return {
    bahaya: [...SELALU_DISARANKAN],
    varianBanjir: [],
    jawabanPemicu,
    jumlahAnggota: 1,
    lansia: 0,
    balita: 0,
    hamil: 0,
    disabilitas: 0,
    jenisDisabilitas: [],
    obatRutin: false,
    jumlahObatRutin: 0,
    hewanPeliharaan: false,
    bangunan: null,
    lantaiTinggal: undefined,
    punyaKendaraan: null,
    persediaanHari: 3,
    titikKumpul: "",
    kontakDarurat: [],
    catatanKhusus: "",
  };
}

const bulat = (x: unknown): number => (typeof x === "number" && Number.isFinite(x) ? Math.trunc(x) : 0);
const jepit = (x: number, min: number, maks: number) => Math.min(maks, Math.max(min, x));

/**
 * Jaga konsistensi isian setelah tiap perubahan: hitungan tidak melebihi jumlah anggota,
 * field yang bergantung pada pilihan lain dikosongkan bila pilihannya dicabut.
 */
export function rapikanProfil(p: ProfilDraft): ProfilDraft {
  const n = jepit(bulat(p.jumlahAnggota), B.anggotaMin, B.anggotaMaks);
  const disabilitas = jepit(bulat(p.disabilitas), 0, n);
  return {
    ...p,
    jumlahAnggota: n,
    lansia: jepit(bulat(p.lansia), 0, n),
    balita: jepit(bulat(p.balita), 0, n),
    hamil: jepit(bulat(p.hamil), 0, n),
    disabilitas,
    jenisDisabilitas: disabilitas > 0 ? p.jenisDisabilitas : [],
    jumlahObatRutin: p.obatRutin ? jepit(bulat(p.jumlahObatRutin) || 1, 1, n) : 0,
    varianBanjir: p.bahaya.includes("banjir") ? p.varianBanjir : [],
    lantaiTinggal: p.bangunan === "apartemen" || p.bangunan === "kos" ? p.lantaiTinggal : undefined,
    kontakDarurat: p.kontakDarurat.slice(0, B.kontakMaks),
  };
}

// ---------- Data contoh (jalan pintas "Coba dengan data contoh", Blueprint 5.2) ----------
// Lokasi diambil dari berkas wilayah contoh (public/data/wilayah/31.json).
export const LOKASI_CONTOH: Lokasi = {
  adm4: "31.71.01.1001",
  kelurahan: "Gambir",
  kecamatan: "Gambir",
  kabKota: "Kota Administrasi Jakarta Pusat",
  provinsi: "DKI Jakarta",
  lat: -6.17,
  lon: 106.8228,
};

export function buatProfilContoh(): ProfilDraft {
  return {
    ...buatProfilAwal(),
    bahaya: ["banjir", "gempa", "cuaca_ekstrem"],
    varianBanjir: ["sungai"],
    jawabanPemicu: { ...buatProfilAwal().jawabanPemicu, "q-sungai": "ya" },
    jumlahAnggota: 4,
    lansia: 1,
    balita: 1,
    obatRutin: true,
    jumlahObatRutin: 1,
    bangunan: "rumah_bertingkat",
    punyaKendaraan: true,
    persediaanHari: 3,
    kontakDarurat: [],
  };
}
