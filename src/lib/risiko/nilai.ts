// Profil Risiko Lokasi: menilai 9 bahaya untuk satu titik dari DATA, bukan dari tebakan pengguna. Murni (tanpa jaringan)
// agar bisa diuji. Ambang dipilih sederhana dan dapat dijelaskan; hasilnya SARAN persiapan, bukan peta risiko resmi
// (peta resmi: InaRISK BNPB, dan Kawasan Rawan Bencana PVMBG untuk gunung api).
import type { HazardId } from "@/types";

export type TingkatRisiko = "tinggi" | "sedang" | "rendah" | "belum-diketahui";

export interface GunungApi {
  nama: string;
  lat: number;
  lon: number;
  erupsiTerakhir: number | null;
  tinggiM: number;
}
export interface TitikTsunami {
  lat: number;
  lon: number;
  tahun: number;
  tinggiM: number | null;
  nama: string;
}
export interface GempaKuat {
  mag: number;
  tahun: number;
  tempat: string;
  lat: number;
  lon: number;
}

/** Fakta mentah untuk satu lokasi; null = sumbernya tidak terbaca (dikatakan terus terang, tidak ditebak). */
export interface FaktaLokasi {
  gunungApi: { terdekat: GunungApi & { km: number }; dalam50km: number } | null;
  gempa: { jumlahM5: number; radiusKm: number; sejak: number; terkuat: (GempaKuat & { km: number }) | null; adaM7Laut300km: boolean } | null;
  pantaiKm: number | null;
  tsunami: { dalam150km: number; terdekat: (TitikTsunami & { km: number }) | null; tertinggi: (TitikTsunami & { km: number }) | null } | null;
  relief: { elevasiM: number; bedaTinggiM: number } | null;
  iklim: { bulanKering: number; kemarauTerburuk: number; hariHujanEkstrem: number; sumber: string } | null;
  titikPanas7h: number | null;
  provinsiRawanKarhutla: boolean;
}

export interface NilaiBahaya {
  id: HazardId;
  tingkat: TingkatRisiko;
  /** Kalimat fakta (angka, nama, tahun) yang menjadi dasar; kosong bila belum diketahui. */
  alasan: string[];
  /** Nama sumber singkat untuk ditampilkan. */
  sumber: string;
  /** true bila tingkatnya berdasar kejadian umum di Indonesia, bukan data khusus titik ini (ditampilkan setelah yang berdata). */
  umum?: boolean;
  /** Varian banjir yang disarankan data (mis. rob di pesisir rendah). */
  varian?: Array<"rob" | "genangan" | "sungai" | "bandang">;
}

export const AMBANG_RISIKO = {
  gunungApiTinggiKm: 30, // jangkauan umum awan panas, lahar, dan lontaran batu gunung api besar di Indonesia
  gunungApiSedangKm: 80, // hujan abu tebal yang sering terjadi
  erupsiModernSejak: 1900,
  gempaRadiusKm: 150,
  gempaTinggi: 20, // gempa M5+ sejak 1976 dalam 150 km
  gempaSedang: 3,
  pantaiTsunamiKm: 5,
  pantaiAbrasiKm: 2,
  pantaiSedangKm: 10,
  elevasiTsunamiM: 30, // BNPB: evakuasi tsunami ke tempat setinggi 20-30 m atau lebih
  elevasiRobM: 5,
  elevasiRendahM: 10,
  reliefTinggiM: 100, // beda tinggi dalam radius sekitar 600 m (lereng curam)
  reliefSedangM: 40,
  bulanKeringTinggi: 4, // bulan dengan hujan < 60 mm (kriteria BMKG)
  bulanKeringSedang: 2,
  kemarauSedangHari: 45,
  titikPanasRawan: 5,
  titikPanasLuar: 15,
} as const;

const f1 = (v: number) => String(Math.round(v * 10) / 10).replace(".", ",");
const km = (v: number) => (v < 10 ? f1(v) : String(Math.round(v)));
const URUT: Record<TingkatRisiko, number> = { tinggi: 3, sedang: 2, rendah: 1, "belum-diketahui": 0 };

/** Nilai 9 bahaya dari fakta. Urutan hasil: paling tinggi dulu. */
export function nilaiRisiko(f: FaktaLokasi): NilaiBahaya[] {
  const A = AMBANG_RISIKO;
  const hasil: NilaiBahaya[] = [];

  // ---------- Gunung api ----------
  if (f.gunungApi) {
    const g = f.gunungApi.terdekat;
    const aktif = g.erupsiTerakhir !== null && g.erupsiTerakhir >= A.erupsiModernSejak;
    const erupsi = g.erupsiTerakhir !== null ? (g.erupsiTerakhir < 0 ? "erupsi terakhir sebelum Masehi" : `erupsi terakhir ${g.erupsiTerakhir}`) : "belum ada catatan erupsi";
    const dasar = `Gunung api terdekat: ${g.nama}, sekitar ${km(g.km)} km dari lokasi (${erupsi}).`;
    const tingkat: TingkatRisiko = g.km <= A.gunungApiTinggiKm && aktif ? "tinggi" : g.km <= A.gunungApiSedangKm && aktif ? "sedang" : g.km <= A.gunungApiTinggiKm ? "sedang" : "rendah";
    const alasan = [dasar];
    if (f.gunungApi.dalam50km > 1) alasan.push(`${f.gunungApi.dalam50km} gunung api tercatat dalam radius 50 km.`);
    if (tingkat === "sedang" && g.km > A.gunungApiTinggiKm) alasan.push("Di jarak ini yang paling mungkin dirasakan adalah hujan abu, yang mengganggu pernapasan, air, dan atap.");
    if (tingkat === "tinggi") alasan.push("Periksa apakah rumah Anda masuk Kawasan Rawan Bencana (KRB) di peta PVMBG.");
    hasil.push({ id: "gunung_api", tingkat, alasan, sumber: "Smithsonian GVP" });
  } else hasil.push({ id: "gunung_api", tingkat: "belum-diketahui", alasan: [], sumber: "Smithsonian GVP" });

  // ---------- Gempa ----------
  if (f.gempa) {
    const g = f.gempa;
    const tingkat: TingkatRisiko = g.jumlahM5 >= A.gempaTinggi ? "tinggi" : g.jumlahM5 >= A.gempaSedang ? "sedang" : "rendah";
    const alasan = [`${g.jumlahM5} gempa bermagnitudo 5 atau lebih tercatat dalam radius ${g.radiusKm} km sejak ${g.sejak}.`];
    if (g.terkuat) alasan.push(`Terkuat: M${f1(g.terkuat.mag)} pada ${g.terkuat.tahun}, sekitar ${km(g.terkuat.km)} km dari lokasi.`);
    if (tingkat === "rendah") alasan.push("Lebih jarang dari kebanyakan wilayah Indonesia, tetapi gempa tetap mungkin terjadi.");
    hasil.push({ id: "gempa", tingkat, alasan, sumber: "USGS" });
  } else hasil.push({ id: "gempa", tingkat: "belum-diketahui", alasan: [], sumber: "USGS" });

  // ---------- Tsunami ----------
  const elev = f.relief?.elevasiM ?? null;
  if (f.pantaiKm !== null) {
    const pesisir = f.pantaiKm <= A.pantaiTsunamiKm;
    const rendah = elev === null || elev <= A.elevasiTsunamiM;
    const riwayat = (f.tsunami?.dalam150km ?? 0) > 0 || f.gempa?.adaM7Laut300km === true;
    const tingkat: TingkatRisiko = pesisir && rendah && riwayat ? "tinggi" : f.pantaiKm <= A.pantaiSedangKm && rendah ? "sedang" : "rendah";
    const alasan = [`Jarak ke garis pantai sekitar ${km(f.pantaiKm)} km${elev !== null ? `, ketinggian tanah sekitar ${Math.round(elev)} m` : ""}.`];
    const t = f.tsunami?.tertinggi;
    if (t && f.tsunami) alasan.push(`${f.tsunami.dalam150km} titik genangan tsunami tercatat dalam 150 km; tertinggi ${t.tinggiM !== null ? `${f1(t.tinggiM)} m ` : ""}di ${titel(t.nama)} (${t.tahun}).`);
    else if (f.gempa?.adaM7Laut300km) alasan.push("Pernah terjadi gempa M7 atau lebih dalam radius 300 km, yang dapat memicu tsunami.");
    if (tingkat !== "rendah") alasan.push("Kenali jalur evakuasi ke tempat tinggi (20-30 m) atau gedung evakuasi terdekat.");
    hasil.push({ id: "tsunami", tingkat, alasan, sumber: "NOAA NCEI, Natural Earth" });
  } else hasil.push({ id: "tsunami", tingkat: "belum-diketahui", alasan: [], sumber: "NOAA NCEI, Natural Earth" });

  // ---------- Gelombang tinggi dan abrasi ----------
  if (f.pantaiKm !== null) {
    const tingkat: TingkatRisiko = f.pantaiKm <= A.pantaiAbrasiKm ? "tinggi" : f.pantaiKm <= A.pantaiTsunamiKm ? "sedang" : "rendah";
    hasil.push({ id: "gelombang_abrasi", tingkat, alasan: [`Jarak ke garis pantai sekitar ${km(f.pantaiKm)} km.`], sumber: "Natural Earth" });
  } else hasil.push({ id: "gelombang_abrasi", tingkat: "belum-diketahui", alasan: [], sumber: "Natural Earth" });

  // ---------- Banjir ----------
  {
    const alasan: string[] = [];
    const varian: NonNullable<NilaiBahaya["varian"]> = [];
    let tingkat: TingkatRisiko = "sedang"; // bencana yang paling sering terjadi di Indonesia; detail sungai dari pertanyaan
    if (f.pantaiKm !== null && f.pantaiKm <= A.pantaiTsunamiKm && elev !== null && elev <= A.elevasiRobM) {
      tingkat = "tinggi";
      varian.push("rob");
      alasan.push(`Pesisir dengan ketinggian tanah sekitar ${Math.round(elev)} m: rawan banjir rob saat pasang tinggi.`);
    } else if (elev !== null && elev <= A.elevasiRendahM) {
      tingkat = "tinggi";
      varian.push("genangan");
      alasan.push(`Dataran rendah (ketinggian sekitar ${Math.round(elev)} m): air hujan lambat surut.`);
    }
    if (f.iklim && f.iklim.hariHujanEkstrem >= 3) alasan.push(`Rata-rata ${f1(f.iklim.hariHujanEkstrem)} hari hujan sangat lebat per tahun (${f.iklim.sumber}).`);
    const khusus = alasan.length > 0;
    alasan.push("Banjir adalah salah satu bencana yang paling sering terjadi di Indonesia. Sungai kecil dan saluran di dekat rumah tidak terlihat oleh data, jadi perhatikan kondisi sekitar Anda.");
    hasil.push({ id: "banjir", tingkat, alasan, sumber: "SRTM, data iklim", varian, ...(khusus ? {} : { umum: true }) });
  }

  // ---------- Longsor ----------
  if (f.relief) {
    const r = f.relief.bedaTinggiM;
    const tingkat: TingkatRisiko = r >= A.reliefTinggiM ? "tinggi" : r >= A.reliefSedangM ? "sedang" : "rendah";
    const alasan = [`Beda tinggi permukaan tanah sekitar ${Math.round(r)} m dalam radius sekitar 600 m (ketinggian lokasi sekitar ${Math.round(f.relief.elevasiM)} m).`];
    if (tingkat !== "rendah") alasan.push("Lereng dan tebing di sekitar rumah perlu diamati, terutama saat hujan deras berhari-hari.");
    hasil.push({ id: "longsor", tingkat, alasan, sumber: "SRTM (OpenTopoData)" });
  } else hasil.push({ id: "longsor", tingkat: "belum-diketahui", alasan: [], sumber: "SRTM (OpenTopoData)" });

  // ---------- Kekeringan ----------
  if (f.iklim) {
    const i = f.iklim;
    const tingkat: TingkatRisiko = i.bulanKering >= A.bulanKeringTinggi ? "tinggi" : i.bulanKering >= A.bulanKeringSedang || i.kemarauTerburuk >= A.kemarauSedangHari ? "sedang" : "rendah";
    const bulan = i.bulanKering === 0 ? "Tidak ada bulan yang rata-rata hujannya di bawah 60 mm (bulan kering menurut BMKG)" : `${i.bulanKering} bulan per tahun rata-rata hujannya di bawah 60 mm (bulan kering menurut BMKG)`;
    const alasan = [`${bulan}; kemarau terpanjang ${i.kemarauTerburuk} hari tanpa hujan (${i.sumber}, 1991-2020).`];
    if (tingkat !== "rendah") alasan.push("Tahun El Niño membuat kemarau lebih panjang dan sumber air lebih cepat habis.");
    hasil.push({ id: "kekeringan", tingkat, alasan, sumber: i.sumber });
  } else hasil.push({ id: "kekeringan", tingkat: "belum-diketahui", alasan: [], sumber: "data iklim" });

  // ---------- Karhutla ----------
  {
    const tp = f.titikPanas7h;
    const alasan: string[] = [];
    let tingkat: TingkatRisiko = "rendah";
    if (f.provinsiRawanKarhutla) {
      const kemarauPanjang = (f.iklim?.kemarauTerburuk ?? 0) >= A.kemarauSedangHari;
      tingkat = (tp !== null && tp >= A.titikPanasRawan) || kemarauPanjang ? "tinggi" : "sedang";
      alasan.push("Provinsi Anda termasuk prioritas pengendalian kebakaran hutan dan lahan.");
      if (kemarauPanjang) alasan.push(`Kemarau terpanjang di lokasi ini ${f.iklim!.kemarauTerburuk} hari: lahan dan gambut cukup kering untuk terbakar.`);
    } else if (tp !== null && tp >= A.titikPanasLuar) tingkat = "sedang";
    if (tp !== null) alasan.push(`${tp} titik panas satelit dalam radius 50 km selama 7 hari terakhir.`);
    hasil.push({ id: "karhutla", tingkat: tp === null && !f.provinsiRawanKarhutla ? "belum-diketahui" : tingkat, alasan, sumber: "NASA FIRMS, KLHK" });
  }

  // ---------- Cuaca ekstrem ----------
  hasil.push({ id: "cuaca_ekstrem", tingkat: "sedang", umum: true, alasan: ["Hujan lebat, angin kencang, puting beliung, dan petir dapat terjadi di seluruh Indonesia, makin sering dengan perubahan iklim."], sumber: "BMKG" });

  // Tingkat lebih tinggi dulu; pada tingkat sama, yang berdasar data titik ini sebelum yang berdasar kejadian umum.
  return hasil.sort((a, b) => URUT[b.tingkat] - URUT[a.tingkat] || Number(!!a.umum) - Number(!!b.umum));
}

/** Bahaya yang disarankan masuk rencana: tingkat tinggi dan sedang. */
export const disarankanData = (n: NilaiBahaya[]) => n.filter((x) => x.tingkat === "tinggi" || x.tingkat === "sedang");

function titel(s: string): string {
  return s.toLowerCase().replace(/(^|[\s,(-])([a-z])/g, (_, a: string, b: string) => a + b.toUpperCase());
}

// ---------- Geometri ----------
export function jarakKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = Math.PI / 180;
  const dLat = (lat2 - lat1) * r;
  const dLon = (lon2 - lon1) * r;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Gunung api terdekat dan jumlah dalam 50 km. */
export function cariGunungApi(daftar: GunungApi[], lat: number, lon: number): FaktaLokasi["gunungApi"] {
  if (daftar.length === 0) return null;
  let terdekat: (GunungApi & { km: number }) | null = null;
  let dalam50km = 0;
  for (const g of daftar) {
    const d = jarakKm(lat, lon, g.lat, g.lon);
    if (d <= 50) dalam50km++;
    if (!terdekat || d < terdekat.km) terdekat = { ...g, km: d };
  }
  return terdekat ? { terdekat, dalam50km } : null;
}

/** Jarak ke titik garis pantai terdekat. `titik` = [lon*skala, lat*skala, ...]. Kotak cepat dulu, lalu haversine. */
export function jarakPantaiKm(titik: number[], skala: number, lat: number, lon: number): number | null {
  if (titik.length < 2) return null;
  let terbaik = Infinity;
  const cosLat = Math.cos((lat * Math.PI) / 180);
  for (let i = 0; i < titik.length; i += 2) {
    const dx = (titik[i] / skala - lon) * cosLat;
    const dy = titik[i + 1] / skala - lat;
    const d2 = dx * dx + dy * dy;
    if (d2 < terbaik) terbaik = d2;
  }
  return Math.sqrt(terbaik) * 111.2;
}

/** Ringkasan riwayat tsunami dalam 150 km. */
export function cariTsunami(titik: TitikTsunami[], lat: number, lon: number): FaktaLokasi["tsunami"] {
  let dalam = 0;
  let terdekat: (TitikTsunami & { km: number }) | null = null;
  let tertinggi: (TitikTsunami & { km: number }) | null = null;
  for (const t of titik) {
    const d = jarakKm(lat, lon, t.lat, t.lon);
    if (d > 150) continue;
    dalam++;
    if (!terdekat || d < terdekat.km) terdekat = { ...t, km: d };
    if (t.tinggiM !== null && (!tertinggi || (tertinggi.tinggiM ?? 0) < t.tinggiM)) tertinggi = { ...t, km: d };
  }
  return { dalam150km: dalam, terdekat, tertinggi: tertinggi ?? terdekat };
}

/** Ketinggian titik tengah dan beda tinggi maksimum terhadap titik-titik di sekitarnya. */
export function hitungRelief(elevasi: Array<number | null>): FaktaLokasi["relief"] {
  const [tengah, ...sekitar] = elevasi;
  const ada = sekitar.filter((v): v is number => typeof v === "number");
  if (typeof tengah !== "number" || ada.length < 4) return null;
  const semua = [tengah, ...ada];
  return { elevasiM: Math.max(0, tengah), bedaTinggiM: Math.max(...semua) - Math.min(...semua) };
}
