import type { HazardId, VarianBanjir } from "@/types";

/** Pertanyaan swa-penilaian wizard langkah 1 (Blueprint 2.3 dan 7.1). */
export interface PertanyaanPemicu {
  id: string;
  teks: string;
  bantuan: string;
  menyarankan: HazardId[];
  varianAktif: VarianBanjir[];
  alasan: string; // dipakai pada "Disarankan karena ..."
}

export const PERTANYAAN_PEMICU: PertanyaanPemicu[] = [
  {
    id: "q-sungai",
    teks: "Apakah rumah Anda dekat sungai, kanal, atau saluran besar, atau pernah tergenang?",
    bantuan: "Pilih Ya bila air pernah masuk ke rumah atau jalan di depan rumah.",
    menyarankan: ["banjir"],
    varianAktif: ["sungai", "genangan"],
    alasan: "rumah dekat sungai atau saluran besar, atau pernah tergenang",
  },
  {
    id: "q-lereng",
    teks: "Apakah rumah berada di bawah atau di atas lereng, tebing, atau pernah ada retakan tanah?",
    bantuan: "Pilih Ya bila ada tebing atau tanah miring di dekat rumah, atau tanah pernah retak.",
    menyarankan: ["longsor"],
    varianAktif: [],
    alasan: "rumah dekat lereng atau tebing",
  },
  {
    id: "q-pesisir",
    teks: "Apakah Anda tinggal di pesisir atau dataran rendah dekat laut?",
    bantuan: "Pilih Ya bila rumah dekat pantai atau pernah terkena air pasang.",
    menyarankan: ["tsunami", "gelombang_abrasi"],
    varianAktif: ["rob"],
    alasan: "tinggal di pesisir atau dataran rendah dekat laut",
  },
  {
    id: "q-gunung-api",
    teks: "Apakah rumah berada dekat gunung api aktif atau di kawasan yang pernah terdampak abu atau lahar?",
    bantuan: "Pilih Ya bila wilayah Anda pernah terkena abu, lahar, atau diungsikan karena gunung api.",
    menyarankan: ["gunung_api"],
    varianAktif: [],
    alasan: "rumah dekat gunung api aktif",
  },
  {
    id: "q-hutan",
    teks: "Apakah di sekitar Anda ada hutan, kebun luas, atau lahan gambut yang pernah terbakar atau berasap?",
    bantuan: "Pilih Ya bila lahan di sekitar Anda pernah terbakar atau menimbulkan kabut asap.",
    menyarankan: ["karhutla"],
    varianAktif: [],
    alasan: "ada hutan, kebun luas, atau lahan gambut di sekitar rumah",
  },
  {
    id: "q-air",
    teks: "Apakah wilayah Anda sering kesulitan air bersih saat kemarau?",
    bantuan: "Pilih Ya bila sumur kering atau air bersih sulit didapat saat kemarau panjang.",
    menyarankan: ["kekeringan"],
    varianAktif: [],
    alasan: "wilayah sering kesulitan air bersih saat kemarau",
  },
  {
    id: "q-dataran-tinggi",
    teks: "Apakah Anda tinggal di dataran tinggi atau di sekitar bukit di kawasan yang pernah banjir bandang?",
    bantuan: "Pilih Ya bila air dari hulu pernah datang tiba-tiba dan deras ke wilayah Anda.",
    menyarankan: ["banjir"],
    varianAktif: ["bandang"],
    alasan: "tinggal di kawasan yang pernah terkena banjir bandang",
  },
];

/** Gempa dan cuaca ekstrem disarankan untuk semua pengguna (Blueprint 2.3). */
export const SELALU_DISARANKAN: HazardId[] = ["gempa", "cuaca_ekstrem"];
export const ALASAN_SELALU = "penting untuk semua keluarga di Indonesia";

export const URL_INARISK = "https://inarisk.bnpb.go.id/"; // verifikasi tim sebelum rilis (Blueprint 11.2)
