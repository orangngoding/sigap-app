import type { HazardId } from "@/types";

export interface KanalResmi {
  label: string;
  url: string;
}

/** Tanggal terakhir setiap tautan di bawah dibuka dan membalas 200 (Blueprint 15.3: tautan resmi diverifikasi). */
export const KANAL_DIVERIFIKASI = "2026-11-17";

/**
 * Kanal resmi per bahaya (Blueprint 2.2 "Tautan resmi", 6.2 kartu Bahaya Terpilih). Alamat BMKG diambil dari
 * menu situs BMKG sendiri, bukan ditebak. Bahaya level C (gunung api, gelombang) hanya punya tautan ini.
 */
export const KANAL_RESMI: Record<HazardId, KanalResmi[]> = {
  banjir: [
    { label: "Peringatan Dini Curah Hujan (BMKG)", url: "https://www.bmkg.go.id/peringatan-dini/curah-hujan" },
    { label: "Peringatan dini cuaca (BMKG)", url: "https://www.bmkg.go.id/peringatan-dini" },
  ],
  longsor: [
    { label: "MAGMA Indonesia, gerakan tanah (PVMBG)", url: "https://magma.esdm.go.id/" },
    { label: "Peringatan Dini Curah Hujan (BMKG)", url: "https://www.bmkg.go.id/peringatan-dini/curah-hujan" },
  ],
  gempa: [{ label: "Gempa bumi terkini (BMKG)", url: "https://www.bmkg.go.id/gempabumi" }],
  cuaca_ekstrem: [{ label: "Peringatan dini cuaca (BMKG)", url: "https://www.bmkg.go.id/peringatan-dini" }],
  tsunami: [{ label: "Gempa bumi berpotensi tsunami (BMKG)", url: "https://www.bmkg.go.id/gempabumi/berpotensi-tsunami" }],
  kekeringan: [{ label: "Peringatan Dini Kekeringan Meteorologis (BMKG)", url: "https://www.bmkg.go.id/peringatan-dini/kekeringan-meteorologis" }],
  karhutla: [
    { label: "Kebakaran hutan dan lahan (BMKG)", url: "https://www.bmkg.go.id/cuaca/karhutla" },
    { label: "Kualitas udara PM2,5 (BMKG)", url: "https://www.bmkg.go.id/kualitas-udara/pm25" },
  ],
  gunung_api: [
    { label: "MAGMA Indonesia (PVMBG)", url: "https://magma.esdm.go.id/" },
    { label: "PVMBG, Badan Geologi", url: "https://vsi.esdm.go.id/" },
  ],
  gelombang_abrasi: [
    { label: "Peringatan Dini Gelombang Tinggi (BMKG)", url: "https://www.bmkg.go.id/peringatan-dini/gelombang-tinggi" },
    { label: "Peringatan Banjir Pesisir/Rob (BMKG)", url: "https://www.bmkg.go.id/peringatan-dini/banjir-pesisir" },
  ],
};

export const URL_INARISK_RESMI = "https://inarisk.bnpb.go.id/";
