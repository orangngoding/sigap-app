// src/types/index.ts — sesuai Blueprint SIGAP bagian 12.1
export type HazardId =
  | "banjir"
  | "longsor"
  | "gempa"
  | "cuaca_ekstrem"
  | "tsunami"
  | "kekeringan"
  | "karhutla"
  | "gunung_api"
  | "gelombang_abrasi";
export type Phase = "sebelum" | "saat" | "sesudah";
export type Group = "lansia" | "balita" | "disabilitas" | "hamil" | "umum";
export type VarianBanjir = "genangan" | "sungai" | "bandang" | "rob";

export interface Lokasi {
  adm4: string; // kode kelurahan untuk BMKG
  kelurahan: string;
  kecamatan: string;
  kabKota: string;
  provinsi: string;
  lat: number;
  lon: number;
}

export interface ProfilRumahTangga {
  bahaya: HazardId[]; // minimal 1
  varianBanjir: VarianBanjir[];
  jawabanPemicu: Record<string, "ya" | "tidak" | "tidak_tahu">;
  jumlahAnggota: number; // 1-12
  lansia: number;
  balita: number;
  hamil: number;
  disabilitas: number;
  jenisDisabilitas: Array<
    "mobilitas" | "penglihatan" | "pendengaran" | "kognitif" | "lainnya"
  >;
  obatRutin: boolean;
  jumlahObatRutin: number;
  hewanPeliharaan: boolean;
  bangunan:
    | "rumah_1_lantai"
    | "rumah_bertingkat"
    | "apartemen"
    | "kos"
    | "lainnya";
  lantaiTinggal?: number; // 1-60
  punyaKendaraan: boolean;
  persediaanHari: 3 | 5 | 7;
  // --- hanya lokal, tidak pernah dikirim ke server atau AI ---
  titikKumpul?: string; // maks 80
  kontakDarurat: Array<{ nama: string; telepon: string }>; // maks 3
  catatanKhusus?: string; // maks 200
}

export type ProfilAnonim = Omit<
  ProfilRumahTangga,
  "titikKumpul" | "kontakDarurat" | "catatanKhusus"
>;

// ---------- Bentuk respons API data (bagian 13.2) ----------
export interface SumberData {
  nama: string;
  url: string;
  diambilPada: string; // ISO 8601
  lisensi?: string;
}

export interface ApiBase {
  sumber: SumberData;
  stale: boolean;
}

export interface IntervalCuaca {
  waktu: string;
  kondisi: string;
  ikon: string | null;
  suhu: number | null;
  kelembapan: number | null;
  anginKmj: number | null;
  arahAngin: string | null;
  jarakPandang: string | null;
}

export interface CuacaResponse extends ApiBase {
  lokasi: {
    desa: string;
    kecamatan: string;
    kotkab: string;
    provinsi: string;
    lat: number | null;
    lon: number | null;
    timezone: string;
  };
  prakiraan: IntervalCuaca[];
  ringkasan: {
    hujanLebat48j: boolean;
    hujanLebatWaktu: string | null; // interval pertama yang memicu
    suhuMin: number | null;
    suhuMaks: number | null;
  };
}

export interface GempaItem {
  waktu: string;
  magnitudo: number;
  kedalamanKm: number | null;
  wilayah: string;
  lat: number | null;
  lon: number | null;
  potensi?: string;
  dirasakan?: string;
  shakemapUrl?: string;
  jenis?: "terbaru" | "m5" | "dirasakan";
  jarakKm?: number;
}

export interface GempaResponse extends ApiBase {
  terbaru: GempaItem | null;
  daftar: GempaItem[];
  ringkasan: { gempaDekat24j: boolean };
}

export interface IklimTahunan {
  tahun: number;
  hariHujanLebat: number;
  hariKeringBeruntunMaks: number;
  suhuMaksRata: number | null;
}

export interface IklimResponse extends ApiBase {
  periode: { awal: number; akhir: number };
  ambang: { hujanLebatMm: number; hariKeringMm: number };
  tahunan: IklimTahunan[];
  tren: { hariHujanLebatPerDekade: number };
  pembanding: {
    awal: { periode: string; rataHariHujanLebat: number };
    akhir: { periode: string; rataHariHujanLebat: number };
  };
  catatan: string;
}

export interface PeringatanItem {
  id: string;
  judul: string;
  waktuTerbit: string | null;
  berlakuSampai: string | null;
  wilayah: string;
  ringkasan: string;
  teks: string;
  url: string;
  /** "lokasi" bila nama kecamatan/kab-kota Anda disebut; "provinsi" bila hanya tingkat provinsi (jangan klaim lokasi terdampak). */
  cakupan: "lokasi" | "provinsi";
}

export interface PeringatanResponse extends ApiBase {
  /** false = umpan tidak dapat dibaca; UI harus mengarahkan ke kanal resmi, BUKAN menyatakan tidak ada peringatan. */
  tersedia: boolean;
  daftar: PeringatanItem[];
  tautanResmi: string;
}

export interface BeritaItem {
  id: string;
  judul: string;
  /** Nama media penerbit. */
  sumber: string;
  waktu: string;
  /** Tautan keluar (https) ke berita. */
  url: string;
}

export interface BeritaResponse extends ApiBase {
  /** false = umpan tidak terbaca; UI tidak boleh menyatakan "tidak ada berita". */
  tersedia: boolean;
  daftar: BeritaItem[];
}

export interface ApiErrorBody {
  error: { code: string; message: string; retryable: boolean };
}
