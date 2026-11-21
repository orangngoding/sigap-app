// Tingkat kesulitan Simulator Bencana AI (murni, dipakai bersama server dan klien).
//  - dasar: satu bencana, kondisi biasa.
//  - menantang: satu bencana dengan dua keadaan sulit yang sering terjadi sungguhan (malam hari dan listrik padam,
//    sinyal lemah, anggota dewasa sedang di luar rumah, jalan utama tergenang), dipilih kode per variasi.
//  - beruntun: bencana yang memicu bencana kedua (compound hazard), misalnya gempa lalu tsunami, hujan ekstrem lalu
//    banjir, kemarau lalu kebakaran lahan. Kejadian beruntun makin sering seiring perubahan iklim (IPCC AR6 menyebut
//    kenaikan "compound events"), dan keputusan yang tepat untuk bencana pertama bisa keliru untuk bencana kedua.
import type { HazardId } from "@/types";

export const TINGKAT_SIMULASI = ["dasar", "menantang", "beruntun"] as const;
export type TingkatSimulasi = (typeof TINGKAT_SIMULASI)[number];

export const LABEL_TINGKAT: Record<TingkatSimulasi, { judul: string; isi: string }> = {
  dasar: { judul: "Dasar", isi: "Satu bencana dalam kondisi biasa." },
  menantang: { judul: "Menantang", isi: "Ditambah keadaan sulit: malam hari, listrik padam, sinyal lemah, atau anggota keluarga tidak di rumah." },
  beruntun: { judul: "Bencana beruntun", isi: "Bencana pertama memicu bencana kedua. Keputusan harus menimbang keduanya." },
};

/** Bencana kedua yang lazim dipicu bencana pertama, urut dari yang paling lazim. */
export const PASANGAN_BERUNTUN: Record<HazardId, HazardId[]> = {
  gempa: ["tsunami", "longsor"],
  tsunami: ["gempa"],
  cuaca_ekstrem: ["banjir", "longsor"],
  banjir: ["longsor", "cuaca_ekstrem"],
  longsor: ["banjir"],
  kekeringan: ["karhutla"],
  karhutla: ["kekeringan"],
  gunung_api: ["gempa"],
  gelombang_abrasi: ["banjir"],
};

/**
 * Bencana kedua untuk mode beruntun: yang berisiko tinggi atau perlu disiapkan di lokasi lebih dulu; tsunami hanya
 * dipilih bila lokasi memang berisiko tsunami (bukan untuk rumah jauh dari pantai).
 */
export function bencanaKedua(h: HazardId, tingkatRisiko: Partial<Record<HazardId, string>> = {}): HazardId {
  const calon = PASANGAN_BERUNTUN[h];
  const berisiko = calon.filter((c) => tingkatRisiko[c] === "tinggi" || tingkatRisiko[c] === "sedang");
  const layak = calon.filter((c) => c !== "tsunami" || berisiko.includes("tsunami"));
  return berisiko.find((c) => layak.includes(c)) ?? layak[0] ?? calon[calon.length - 1];
}

const TANTANGAN_UMUM = [
  "Kejadian berlangsung malam hari dan listrik padam, jadi hanya ada senter dan cahaya ponsel.",
  "Sinyal ponsel lemah: telepon sulit tersambung, hanya SMS yang kadang terkirim.",
  "Satu anggota keluarga dewasa sedang di luar rumah dan belum bisa dihubungi.",
  "Baterai ponsel tinggal sedikit dan tidak ada tempat mengisi daya.",
];
const TANTANGAN_BAHAYA: Partial<Record<HazardId, string>> = {
  banjir: "Jalan utama di depan gang sudah tergenang, jadi jalur keluar terbatas.",
  longsor: "Jalan desa tertutup material dari tebing, jadi kendaraan tidak bisa lewat.",
  gempa: "Tangga gedung tertutup sebagian puing kecil, jadi jalan keluar lebih lambat.",
  tsunami: "Jalan ke tempat tinggi dipenuhi warga dan kendaraan.",
  karhutla: "Asap tebal membuat jarak pandang di jalan sangat pendek.",
  kekeringan: "Mobil tangki air bersih terlambat datang beberapa hari.",
  gunung_api: "Hujan abu turun tebal sehingga jalan licin dan pandangan terbatas.",
  cuaca_ekstrem: "Pohon tumbang menutup jalan keluar kompleks.",
  gelombang_abrasi: "Pasang naik bersamaan dengan hujan deras sehingga air cepat meninggi.",
};

/** Dua keadaan sulit untuk mode menantang, ditentukan kode dari variasi (bergiliran, tidak acak saat render). */
export function tantanganUntuk(h: HazardId, varian: number): string[] {
  const daftar = [TANTANGAN_BAHAYA[h], ...TANTANGAN_UMUM].filter((x): x is string => Boolean(x));
  const a = daftar[varian % daftar.length];
  const b = daftar[(varian + 1 + Math.floor(varian / daftar.length)) % daftar.length];
  return a === b ? [a, daftar[(varian + 2) % daftar.length]] : [a, b];
}
