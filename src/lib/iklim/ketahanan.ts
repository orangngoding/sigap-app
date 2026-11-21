// Siaga Iklim: dari proyeksi iklim lokasi (data) dan keadaan rumah (jawaban pengguna) menjadi
//  (1) Kalender Risiko 12 bulan, (2) Uji Ketahanan Rumah (air, panas, hujan), dan (3) katalog tindakan beserta
//  efeknya pada uji itu. SEMUA angka di sini dihitung kode dan bisa diuji; AI (lib/ai/keputusan-iklim.ts) hanya
//  memilih dan menjelaskan tindakan dari katalog. Ambang pada bagian KONSTANTA adalah asumsi awal yang
//  ditampilkan di Metodologi dan boleh disesuaikan tim.
import type { IdPeriode, MetrikBulan, ProyeksiResponse } from "@/lib/data/proyeksi";
import { acara, lipat } from "@/lib/rencana/pengingat";

// ---------- KONSTANTA (asumsi, tercatat di Metodologi) ----------
/** Kebutuhan air dasar per orang per hari (minum, masak, kebersihan); mengacu pada standar kemanusiaan Sphere. Verifikasi tim. */
export const LITER_PER_ORANG_HARI = 15;
/** Bulan dengan hujan di bawah ini dianggap bulan kering (asumsi awal; verifikasi dengan kriteria BMKG). */
export const AMBANG_BULAN_KERING_MM = 60;
/** Penghematan air yang dipakai pada skenario "hemat air" (skenario hitungan, bukan janji hasil). */
export const HEMAT_AIR_PERSEN = 20;
/** Batas selisih hari sangat panas per tahun (2050 dibanding 1990-an): di bawah `sedikit` = aman, di atas `banyak` = waspada. */
export const SELISIH_PANAS = { sedikit: 5, banyak: 20 } as const;
/** Batas selisih hari hujan ekstrem per tahun. */
export const SELISIH_HUJAN = { sedikit: 0.5, banyak: 2 } as const;
/** Cadangan air minimum (hari) yang tetap perlu ada walau air jarang sulit; sama dengan persediaan dasar Tas Siaga. */
export const MIN_HARI_CADANGAN_AIR = 3;
/** Lama gangguan pasokan air (hari) menurut pengalaman pengguna saat kemarau ini. Tanpa asumsi pasokan putus sepanjang kemarau. */
export const HARI_GANGGUAN_AIR = { jarang: 0, hari: 7, minggu: 21 } as const;
/** Gangguan air diperkirakan memanjang atau memendek sebanding dengan kemarau terpanjang, dibatasi agar tidak ekstrem. */
export const BATAS_RASIO_KEMARAU = { min: 0.5, maks: 2 } as const;
/**
 * "Tahun terburuk dalam 20 tahun" bergantung pada satu tahun ekstrem, jadi naik-turun kecilnya bukan sinyal. Perubahan
 * kemarau 2031-2050 dalam batas ini (10 persen, paling sedikit 3 hari) dianggap tidak berubah berarti.
 */
export const TOLERANSI_KEMARAU = { persen: 10, minHari: 3 } as const;

/** Kemarau 2031-2050 setelah perubahan kecil (dalam batas ketidakpastian) diratakan ke nilai saat ini. */
export function kemarauDepanStabil(kini: number, depan: number): number {
  const batas = Math.max(TOLERANSI_KEMARAU.minHari, (kini * TOLERANSI_KEMARAU.persen) / 100);
  return Math.abs(depan - kini) <= batas ? kini : depan;
}

/** Kalimat perubahan kemarau terpanjang, jujur bila perubahannya tidak berarti. */
export function teksPerubahanKemarau(kini: number, depan: number): string {
  if (depan === kini) return `sekitar ${kini} hari tanpa hujan, dan diperkirakan tidak banyak berubah 10-25 tahun lagi`;
  return `sekitar ${kini} hari tanpa hujan, dan 10-25 tahun lagi sekitar ${depan} hari (${depan > kini ? "lebih panjang" : "lebih pendek"})`;
}

/** Arah jumlah hari 10-25 tahun lagi dalam bahasa sehari-hari; perubahan kecil (10 persen, paling sedikit 1 hari) = tidak banyak berubah. */
export function teksKeDepan(kini: number, depan: number): string {
  if (Math.abs(depan - kini) <= Math.max(1, kini * 0.1)) return "10-25 tahun lagi diperkirakan tidak banyak berubah";
  const d = Math.round(depan);
  return `10-25 tahun lagi bisa sekitar ${d < 1 ? "kurang dari 1" : d} hari`;
}

/** Kekurangan air (hari) di atas ini = waspada. */
export const KURANG_AIR_WASPADA_HARI = 7;
/** Bulan dianggap puncak bila termasuk 3 tertinggi DAN melewati nilai minimum ini (agar bulan "nol hari" tidak ditandai). */
export const MIN_PUNCAK = { panas: 2, hujan: 0.25 } as const;

/**
 * Acuan waktu. "Kini" (2011-2030) mencakup tahun ini dan menjadi acuan utama angka di layar; "depan" (2031-2050)
 * adalah arah tren selama umur pakai tandon, atap, dan saluran air. Model iklim hanya andal sebagai rata-rata
 * 20 tahun, jadi tidak ada angka untuk tahun tertentu.
 */
/** Label pendek per periode untuk tabel dan grafik (dari klien, karena data tersimpan lama membawa label "Menuju 2050"). */
export const LABEL_PERIODE: Record<string, string> = { dulu: "1990-an", kini: "Saat ini", "2050": "10-25 tahun lagi" };

export const NAMA_BULAN =["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"] as const;

export type Atap = "seng" | "genteng" | "beton" | "lainnya";
export type SumberAir = "pdam" | "sumur" | "beli" | "lainnya";
export type Tingkat = "aman" | "perhatikan" | "waspada";
export type Periode = IdPeriode;
/** Seberapa lama air biasanya sulit saat kemarau: jarang, beberapa hari, beberapa minggu, atau hampir sepanjang kemarau. */
export type GangguanAir = "jarang" | "hari" | "minggu" | "kemarau";

export interface InputRumah {
  anggota: number; // 1-12
  rentan: number; // lansia + balita + ibu hamil
  litersTersimpan: number; // kapasitas air simpanan sendiri (tandon, drum, ember besar)
  atap: Atap;
  sumberAir: SumberAir;
  gangguanAir: GangguanAir;
  pernahTergenang: boolean;
  /** false = pengguna belum menjawab soal air: dipakai cadangan dasar, dan tidak disebut "pengalaman Anda". */
  airDiketahui?: boolean;
}

const r1 = (v: number) => Math.round(v * 10) / 10;
const urutTingkat: Tingkat[] = ["aman", "perhatikan", "waspada"];
const naik = (t: Tingkat): Tingkat => urutTingkat[Math.min(2, urutTingkat.indexOf(t) + 1)];
export const lebihParah = (a: Tingkat, b: Tingkat) => urutTingkat.indexOf(a) - urutTingkat.indexOf(b);

/** Bulan berjalan (0-11) menurut WIB, agar hasil server dan klien sama. */
export const bulanWib = (now: Date) => new Date(now.getTime() + 7 * 3600_000).getUTCMonth();

// ---------- 1. Kalender risiko ----------
export interface BarisBulan {
  bulan: number;
  nama: string;
  hariSangatPanas: number;
  hariHujanEkstrem: number;
  hujanMm: number;
  puncakPanas: boolean;
  puncakHujan: boolean;
  /** Hujan bulan ini di bawah ambang bulan kering (60 mm). */
  kering: boolean;
  /** Tiga bulan terkering yang juga di bawah rata-rata bulanan; dipakai bila tidak ada bulan di bawah ambang (mis. Bandung). */
  palingKering: boolean;
}

function puncak(nilai: number[], minimum: number): boolean[] {
  const urut = nilai.map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v || a.i - b.i).slice(0, 3);
  const ya = new Set(urut.filter((x) => x.v >= minimum).map((x) => x.i));
  return nilai.map((_, i) => ya.has(i));
}

/** Tiga bulan dengan hujan terendah, hanya yang di bawah rata-rata bulanan (bulan yang sama dengan rata-rata bukan "paling kering"). */
function palingKering(hujan: number[]): boolean[] {
  const rata = hujan.reduce((a, b) => a + b, 0) / Math.max(1, hujan.length);
  const urut = hujan.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v || a.i - b.i).slice(0, 3);
  const ya = new Set(urut.filter((x) => x.v < rata).map((x) => x.i));
  return hujan.map((_, i) => ya.has(i));
}

/** Kalender dari 12 nilai bulanan mana pun (pengamatan atau proyeksi). */
export function kalenderDariBulanan(m: MetrikBulan[]): BarisBulan[] {
  const pk = palingKering(m.map((x) => x.hujanMm));
  const pp = puncak(m.map((x) => x.hariSangatPanas), MIN_PUNCAK.panas);
  const ph = puncak(m.map((x) => x.hariHujanEkstrem), MIN_PUNCAK.hujan);
  return m.map((x, i) => ({ bulan: i, nama: NAMA_BULAN[i], ...x, puncakPanas: pp[i], puncakHujan: ph[i], kering: x.hujanMm < AMBANG_BULAN_KERING_MM, palingKering: pk[i] }));
}

export function kalenderRisiko(p: ProyeksiResponse, periode: Periode): BarisBulan[] {
  return kalenderDariBulanan(p.bulanan[periode]);
}

// ---------- 2. Uji ketahanan rumah ----------
export interface HasilAir {
  kebutuhanLiterPerHari: number;
  hariCukup: number;
  kemarauKini: number;
  kemarauDepan: number;
  /** Hari air perlu ditutup (gangguan pasokan menurut pengalaman pengguna, disesuaikan dengan perubahan kemarau). */
  perluKini: number;
  perluDepan: number;
  kurangKini: number;
  kurangDepan: number;
  tingkat: Tingkat;
  /** Lama air sulit berasal dari jawaban pengguna (bukan cadangan dasar). */
  dariPengguna: boolean;
}
export interface HasilPanas {
  /** Ambang "hari sangat panas" (°C): suhu siang tertinggi 5 persen hari 1991-2010 di grid ini. */
  ambangC: number;
  hariDulu: number;
  hariKini: number;
  hariDepan: number;
  selisih: number;
  bulanPuncak: string[];
  tingkat: Tingkat;
  rentan: boolean;
  atapPanas: boolean;
}
export interface HasilHujan {
  /** Ambang "hari hujan sangat deras" (mm/hari): 1 persen hari basah terderas 1991-2010 di grid ini. */
  ambangMm: number;
  hariDulu: number;
  hariKini: number;
  hariDepan: number;
  selisih: number;
  bulanPuncak: string[];
  tingkat: Tingkat;
  rawanGenang: boolean;
}
export interface HasilUji {
  air: HasilAir;
  panas: HasilPanas;
  hujan: HasilHujan;
  prioritas: "air" | "panas" | "hujan";
}

const kurang = (perlu: number, hariCukup: number) => Math.max(0, Math.ceil(perlu - hariCukup));

/** Hari air yang perlu ditutup kini dan menuju 2050. "Kemarau" memakai kemarau terpanjang apa adanya; selain itu pengalaman pengguna diskalakan dengan perubahan kemarau. */
export function hariPerluAir(g: GangguanAir, kemarauKini: number, kemarauDepan: number): { kini: number; depan: number } {
  if (g === "kemarau") return { kini: Math.max(MIN_HARI_CADANGAN_AIR, kemarauKini), depan: Math.max(MIN_HARI_CADANGAN_AIR, kemarauDepan) };
  const dasar = HARI_GANGGUAN_AIR[g];
  // Tanpa data kemarau kini, perubahan tidak diketahui: rasio 1 (jangan menyusutkan gangguan tanpa dasar).
  const rasio = kemarauKini <= 0 ? 1 : Math.min(BATAS_RASIO_KEMARAU.maks, Math.max(BATAS_RASIO_KEMARAU.min, kemarauDepan / kemarauKini));
  return { kini: Math.max(MIN_HARI_CADANGAN_AIR, dasar), depan: Math.max(MIN_HARI_CADANGAN_AIR, Math.round(dasar * rasio)) };
}

export function hitungAir(i: InputRumah, p: ProyeksiResponse, tambahLiter = 0, hematPersen = 0): HasilAir {
  const kebutuhan = Math.max(1, i.anggota) * LITER_PER_ORANG_HARI * (1 - hematPersen / 100);
  const hariCukup = r1((i.litersTersimpan + tambahLiter) / kebutuhan);
  const kemarauKini = p.kemarauTerburuk.kini;
  const kemarauDepan = kemarauDepanStabil(kemarauKini, p.kemarauTerburuk["2050"]);
  const perlu = hariPerluAir(i.gangguanAir, kemarauKini, kemarauDepan);
  const kurangDepan = kurang(perlu.depan, hariCukup);
  return {
    kebutuhanLiterPerHari: Math.round(kebutuhan),
    hariCukup,
    kemarauKini,
    kemarauDepan,
    perluKini: perlu.kini,
    perluDepan: perlu.depan,
    kurangKini: kurang(perlu.kini, hariCukup),
    kurangDepan,
    tingkat: kurangDepan === 0 ? "aman" : kurangDepan <= KURANG_AIR_WASPADA_HARI ? "perhatikan" : "waspada",
    dariPengguna: i.airDiketahui !== false,
  };
}

export function ujiKetahanan(i: InputRumah, p: ProyeksiResponse): HasilUji {
  const air = hitungAir(i, p);
  const [dulu, kini, depan] = p.periode;

  const selisihPanas = r1(depan.metrik.hariSangatPanas.rata - dulu.metrik.hariSangatPanas.rata);
  let tp: Tingkat = selisihPanas < SELISIH_PANAS.sedikit ? "aman" : selisihPanas < SELISIH_PANAS.banyak ? "perhatikan" : "waspada";
  const rentan = i.rentan > 0;
  const atapPanas = i.atap === "seng";
  if (tp !== "aman" && (rentan || atapPanas)) tp = naik(tp);
  // Bulan puncak dari iklim saat ini: itulah bulan yang perlu disiapkan tahun ini (dan dipakai jadwal tindakan).
  const kalKini = kalenderRisiko(p, "kini");
  const panas: HasilPanas = {
    ambangC: p.ambang.sangatPanasC,
    hariDulu: dulu.metrik.hariSangatPanas.rata,
    hariKini: kini.metrik.hariSangatPanas.rata,
    hariDepan: depan.metrik.hariSangatPanas.rata,
    selisih: selisihPanas,
    bulanPuncak: kalKini.filter((b) => b.puncakPanas).map((b) => b.nama),
    tingkat: tp,
    rentan,
    atapPanas,
  };

  const selisihHujan = r1(depan.metrik.hariHujanEkstrem.rata - dulu.metrik.hariHujanEkstrem.rata);
  let th: Tingkat = selisihHujan < SELISIH_HUJAN.sedikit ? "aman" : selisihHujan < SELISIH_HUJAN.banyak ? "perhatikan" : "waspada";
  // Rumah yang pernah tergenang tidak pernah "aman" hanya karena hujan ekstrem diproyeksikan berkurang.
  if (i.pernahTergenang) th = th === "aman" ? "perhatikan" : naik(th);
  const hujan: HasilHujan = {
    ambangMm: p.ambang.hujanEkstremMm,
    hariDulu: dulu.metrik.hariHujanEkstrem.rata,
    hariKini: kini.metrik.hariHujanEkstrem.rata,
    hariDepan: depan.metrik.hariHujanEkstrem.rata,
    selisih: selisihHujan,
    bulanPuncak: kalKini.filter((b) => b.puncakHujan).map((b) => b.nama),
    tingkat: th,
    rawanGenang: i.pernahTergenang,
  };

  // Prioritas: yang paling parah; sama parah, urutan air, panas, hujan (air paling cepat berdampak pada kesehatan).
  const kandidat: Array<["air" | "panas" | "hujan", Tingkat]> = [["air", air.tingkat], ["panas", panas.tingkat], ["hujan", hujan.tingkat]];
  const prioritas = kandidat.reduce((a, b) => (lebihParah(b[1], a[1]) > 0 ? b : a))[0];
  return { air, panas, hujan, prioritas };
}

// ---------- 3. Katalog tindakan ----------
export type KategoriIntervensi = "air" | "panas" | "hujan" | "ekonomi" | "komunitas";
export type TargetIntervensi = "air" | "panas" | "hujan" | "umum";
export type Biaya = "rendah" | "sedang" | "tinggi";
export type Ruang = "tidak" | "kecil" | "sedang" | "besar";

export interface Intervensi {
  id: string;
  judul: string;
  kategori: KategoriIntervensi;
  target: TargetIntervensi;
  biaya: Biaya;
  ruang: Ruang;
  deskripsi: string;
  langkahPertama: string;
  /** Efek terhitung pada air simpanan (hanya tindakan air yang punya). */
  tambahLiter?: number;
  hematPersen?: number;
  /** Mulai sebelum puncak risiko apa; null = kapan saja. */
  sebelum: "kering" | "panas" | "hujan" | null;
  /**
   * Perkiraan biaya kasar, ditulis tim dari harga toko daring (Tokopedia, Indotrading) November 2026. Bukan harga
   * resmi; ditampilkan dengan catatan bahwa harga di daerah pengguna bisa berbeda. AI tidak menulis angka rupiah.
   */
  kisaranBiaya: string;
  berlaku: (i: InputRumah, u: HasilUji) => boolean;
}

export const KATALOG: Intervensi[] = [
  { id: "tandon-500", judul: "Pasang tandon air 500 liter", kategori: "air", target: "air", biaya: "sedang", ruang: "sedang", tambahLiter: 500, sebelum: "kering",
    deskripsi: "Menambah air simpanan sendiri 500 liter untuk bertahan saat pasokan terganggu.",
    langkahPertama: "Ukur lahan di samping atau belakang rumah, lalu tanyakan harga tandon 500 liter di toko bangunan terdekat.", kisaranBiaya: "sekitar Rp600 ribu sampai Rp1,5 juta untuk tandon plastik 500-550 liter, belum termasuk pipa dan ongkos pasang", berlaku: () => true },
  { id: "tandon-1000", judul: "Pasang tandon air 1.000 liter", kategori: "air", target: "air", biaya: "tinggi", ruang: "besar", tambahLiter: 1000, sebelum: "kering",
    deskripsi: "Menambah air simpanan 1.000 liter; cocok bila masih ada kekurangan air dan ada tempat.",
    langkahPertama: "Pastikan ada lahan datar dan kuat, lalu bandingkan satu tandon besar dengan dua tandon kecil.", kisaranBiaya: "sekitar Rp1 juta sampai Rp2,2 juta untuk tandon plastik 1.000 liter, belum termasuk dudukan dan ongkos pasang", berlaku: (_i, u) => u.air.kurangDepan > 0 },
  { id: "drum-hujan", judul: "Tampung air hujan di drum 200 liter", kategori: "air", target: "air", biaya: "rendah", ruang: "kecil", tambahLiter: 200, sebelum: null,
    deskripsi: "Satu drum di bawah talang menambah air simpanan 200 liter untuk menyiram, mencuci, dan cadangan.",
    langkahPertama: "Pasang satu drum bertutup di bawah talang, dan tutup rapat agar tidak jadi sarang nyamuk.", kisaranBiaya: "sekitar Rp300 ribu sampai Rp450 ribu untuk drum plastik 200 liter bertutup", berlaku: () => true },
  { id: "hemat-air", judul: "Hemat air di rumah", kategori: "air", target: "air", biaya: "rendah", ruang: "tidak", hematPersen: HEMAT_AIR_PERSEN, sebelum: "kering",
    deskripsi: `Kalau pemakaian air turun ${HEMAT_AIR_PERSEN} persen, air simpanan bertahan lebih lama: mandi dengan gayung, perbaiki kran bocor, pakai ulang air cucian untuk menyiram.`,
    langkahPertama: "Periksa semua kran dan toilet yang bocor hari ini, lalu sepakati satu kebiasaan hemat air bersama keluarga.", kisaranBiaya: "hampir tanpa biaya; karet atau kran pengganti biasanya puluhan ribu rupiah", berlaku: () => true },
  { id: "peneduh-ventilasi", judul: "Peneduh jendela dan ventilasi silang", kategori: "panas", target: "panas", biaya: "rendah", ruang: "tidak", sebelum: "panas",
    deskripsi: "Menahan panas matahari di jendela dan membuka aliran udara agar rumah lebih sejuk tanpa banyak listrik.",
    langkahPertama: "Pasang tirai tebal atau tanaman rambat di sisi barat, dan buka dua jendela berhadapan setiap pagi.", kisaranBiaya: "puluhan sampai ratusan ribu rupiah untuk tirai tebal, atau bibit tanaman rambat", berlaku: () => true },
  { id: "atap-terang", judul: "Cat atap dengan warna terang", kategori: "panas", target: "panas", biaya: "sedang", ruang: "tidak", sebelum: "panas",
    deskripsi: "Atap seng gelap memanaskan seisi rumah; cat terang atau lapisan pemantul panas membantu mengurangi panas di bawahnya.",
    langkahPertama: "Tanyakan cat atap pemantul panas di toko cat, dan pilih hari kering untuk mengecat.", kisaranBiaya: "ratusan ribu sampai jutaan rupiah, tergantung luas atap dan jenis cat", berlaku: (i) => i.atap === "seng" },
  { id: "jadwal-panas", judul: "Atur aktivitas saat siang terik dan jaga anggota rentan", kategori: "panas", target: "panas", biaya: "rendah", ruang: "tidak", sebelum: "panas",
    deskripsi: "Hindari kerja berat di luar saat terik, sediakan air minum, dan cek lansia, balita, atau ibu hamil lebih sering.",
    langkahPertama: "Tulis jadwal: kerja luar di pagi atau sore, dan tentukan siapa yang mengecek anggota rentan tiap siang.", kisaranBiaya: "tanpa biaya", berlaku: (i, u) => i.rentan > 0 || u.panas.tingkat !== "aman" },
  { id: "biopori-saluran", judul: "Buat lubang biopori dan bersihkan saluran air", kategori: "hujan", target: "hujan", biaya: "rendah", ruang: "kecil", sebelum: "hujan",
    deskripsi: "Biopori membantu air hujan meresap, dan saluran yang bersih mencegah luapan saat hujan lebat.",
    langkahPertama: "Bersihkan saluran di depan rumah dari sampah dan lumpur, lalu buat dua lubang biopori di halaman.", kisaranBiaya: "puluhan sampai ratusan ribu rupiah untuk bor biopori; tanyakan apakah bisa dipinjam dari RT atau kelurahan", berlaku: () => true },
  { id: "naikkan-barang", judul: "Naikkan dokumen dan colokan listrik dari lantai", kategori: "hujan", target: "hujan", biaya: "rendah", ruang: "tidak", sebelum: "hujan",
    deskripsi: "Rumah yang pernah tergenang perlu menaruh dokumen, obat, dan alat listrik di tempat yang lebih tinggi.",
    langkahPertama: "Pindahkan dokumen penting ke kantong kedap air di rak atas, dan catat letak sakelar utama listrik.", kisaranBiaya: "tanpa biaya sampai puluhan ribu rupiah untuk kantong kedap air", berlaku: (i) => i.pernahTergenang },
  { id: "dana-iklim", judul: "Sisihkan dana darurat iklim keluarga", kategori: "ekonomi", target: "umum", biaya: "rendah", ruang: "tidak", sebelum: null,
    deskripsi: "Tabungan kecil rutin membantu saat harga air, listrik, atau pangan naik ketika cuaca ekstrem.",
    langkahPertama: "Tentukan jumlah kecil yang bisa disisihkan tiap minggu dan simpan terpisah dari uang harian.", kisaranBiaya: "sesuai kemampuan keluarga", berlaku: () => true },
  { id: "pohon-warga", judul: "Tanam pohon peneduh bersama warga", kategori: "komunitas", target: "umum", biaya: "rendah", ruang: "besar", sebelum: "hujan",
    deskripsi: "Pohon di lingkungan menurunkan suhu sekitar dan membantu resapan air; ajak RT atau RW.",
    langkahPertama: "Bicarakan di pertemuan RT: pilih satu lahan umum dan tanggal tanam di awal musim hujan.", kisaranBiaya: "bibit pohon umumnya murah; tanyakan program bibit gratis di kelurahan", berlaku: () => true },
];

export const intervensiById = (id: string): Intervensi | undefined => KATALOG.find((k) => k.id === id);

export interface EfekAir {
  hariCukupBaru: number;
  kurangDepanBaru: number;
  /** Berapa hari kekurangan 2031-2050 yang tertutup oleh tindakan ini (dipakai untuk mengurutkan). */
  tutup: number;
  /** Kekurangan saat ini sesudah tindakan, dan berapa hari yang tertutup (acuan utama di layar). */
  kurangKiniBaru: number;
  tutupKini: number;
}

export function efekAir(i: InputRumah, iv: Intervensi, p: ProyeksiResponse): EfekAir | null {
  if (iv.tambahLiter === undefined && iv.hematPersen === undefined) return null;
  const sebelum = hitungAir(i, p);
  const sesudah = hitungAir(i, p, iv.tambahLiter ?? 0, iv.hematPersen ?? 0);
  return {
    hariCukupBaru: sesudah.hariCukup,
    kurangDepanBaru: sesudah.kurangDepan,
    tutup: sebelum.kurangDepan - sesudah.kurangDepan,
    kurangKiniBaru: sesudah.kurangKini,
    tutupKini: sebelum.kurangKini - sesudah.kurangKini,
  };
}

// ---------- Waktu tindakan ----------
export interface BulanMulai {
  /** Selesaikan sebelum bulan ini (0-11). */
  bulan: number;
  nama: string;
  /** Berapa bulan lagi dari sekarang (0 = sedang berlangsung). */
  bulanLagi: number;
}

/** Puncak risiko berikutnya (berputar dari bulan ini) untuk jenis tindakan itu; null bila tidak ada puncak. */
export function bulanMulai(sebelum: Intervensi["sebelum"], p: ProyeksiResponse, now: Date): BulanMulai | null {
  if (sebelum === null) return null;
  const kal = kalenderRisiko(p, "kini");
  const adaKering = kal.some((b) => b.kering);
  const cocok = (b: BarisBulan) => (sebelum === "kering" ? (adaKering ? b.kering : b.palingKering) : sebelum === "panas" ? b.puncakPanas : b.puncakHujan);
  const sekarang = bulanWib(now);
  for (let d = 0; d < 12; d++) {
    const b = kal[(sekarang + d) % 12];
    if (cocok(b)) return { bulan: b.bulan, nama: b.nama, bulanLagi: d };
  }
  return null;
}

// ---------- Urutan tindakan tanpa AI ----------
/** Kendala yang jelas terbaca dari tulisan pengguna (kata kunci sederhana); AI menangani kalimat yang lebih halus. */
export function bacaKendala(teks?: string): { ruangSempit: boolean; hemat: boolean } {
  const t = (teks ?? "").toLowerCase();
  return {
    ruangSempit: /sempit|lahan kecil|tidak (ada|punya) (lahan|tempat)|kontrak|sewa|kos|apartemen/.test(t),
    hemat: /anggaran|murah|hemat|terbatas|tidak (ada|punya) (uang|biaya)|biaya/.test(t),
  };
}

export function urutkanIntervensi(i: InputRumah, u: HasilUji, p: ProyeksiResponse, maks = 3, kendala?: string): Intervensi[] {
  const kd = bacaKendala(kendala);
  const tingkatTarget = (t: TargetIntervensi): Tingkat => (t === "air" ? u.air.tingkat : t === "panas" ? u.panas.tingkat : t === "hujan" ? u.hujan.tingkat : "aman");
  const skor = (iv: Intervensi): number => {
    let s = 0;
    if (iv.target === u.prioritas) s += 4;
    const t = tingkatTarget(iv.target);
    s += t === "waspada" ? 3 : t === "perhatikan" ? 1.5 : 0;
    s += iv.biaya === "rendah" ? 2 : iv.biaya === "sedang" ? 1 : 0;
    const e = efekAir(i, iv, p);
    if (e && e.tutup > 0) s += 2 + Math.min(3, (e.tutup / Math.max(1, u.air.kurangDepan)) * 3);
    if (iv.target === "umum") s -= 1;
    if (kd.ruangSempit) s -= iv.ruang === "besar" ? 8 : iv.ruang === "sedang" ? 4 : 0;
    if (kd.hemat) s -= iv.biaya === "tinggi" ? 6 : iv.biaya === "sedang" ? 3 : 0;
    return s;
  };
  const urut = KATALOG.filter((iv) => iv.berlaku(i, u)).map((iv) => ({ iv, s: skor(iv) })).sort((a, b) => b.s - a.s);
  const hasil: Intervensi[] = [];
  const perTarget = new Map<TargetIntervensi, number>();
  for (const { iv } of urut) {
    if ((perTarget.get(iv.target) ?? 0) >= 2) continue; // beragam: paling banyak dua per sasaran
    hasil.push(iv);
    perTarget.set(iv.target, (perTarget.get(iv.target) ?? 0) + 1);
    if (hasil.length >= maks) break;
  }
  return hasil;
}

// ---------- Pengingat kalender (.ics) ----------
export interface ItemKalender {
  id: string;
  judul: string;
  langkahPertama: string;
  bulan: BulanMulai | null;
}

const hariUtc = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

/** Satu pengingat per tindakan: tanggal 1 sebulan sebelum puncak risiko, atau besok bila puncaknya sudah dekat atau tidak ada. */
export function buatIcsIklim(items: ItemKalender[], now = new Date()): string {
  const baris = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//SIGAP//Siaga Iklim//ID", "CALSCALE:GREGORIAN"];
  const hariIni = hariUtc(new Date(now.getTime() + 7 * 3600_000));
  for (const it of items) {
    let tanggal = new Date(hariIni.getTime() + 86_400_000);
    if (it.bulan && it.bulan.bulanLagi >= 2) tanggal = new Date(Date.UTC(hariIni.getUTCFullYear(), hariIni.getUTCMonth() + it.bulan.bulanLagi - 1, 1));
    baris.push(
      ...acara(
        { uid: `iklim-${it.id}-${tanggal.toISOString().slice(0, 10)}`, tanggal, judul: `Siaga Iklim: ${it.judul}`, ket: `${it.langkahPertama}${it.bulan ? ` Selesaikan sebelum ${it.bulan.nama}.` : ""} (SIGAP)` },
        now,
      ),
    );
  }
  baris.push("END:VCALENDAR");
  return baris.map(lipat).join("\r\n") + "\r\n";
}
