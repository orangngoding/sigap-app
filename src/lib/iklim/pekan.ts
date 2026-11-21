// Siaga Iklim, "Minggu ini": prakiraan 16 hari (Open-Meteo, model cuaca global) + kualitas udara (CAMS) diubah
// KODE menjadi sinyal per bahaya. Murni (tanpa jaringan) agar bisa diuji. Ambang diambil dari acuan resmi:
//  - Hujan: kategori BMKG (sedang 20-50 mm/hari, lebat 50-100, sangat lebat >100).
//  - Panas: suhu maksimum 35°C ke atas; suhu terasa (heat index) 41°C ke atas = "bahaya" menurut NWS/NOAA.
//  - Udara: PM2.5 rata-rata harian, kategori ISPU (Permen LHK P.14/2020): >55,4 tidak sehat, >150,4 sangat tidak sehat.
//  - Kering dan cuaca mudah terbakar: hari berturut-turut hujan <1 mm, kelembapan minimum <45%, angin kencang.
// Ini indikator SIGAP, bukan peringatan resmi; peringatan resmi tetap dari BMKG dan BPBD.

import { teksEnso, type KondisiGlobal } from "@/lib/data/iklim-global";
import type { RingkasTitikPanas } from "@/lib/data/titik-panas";

export type Tingkat = "aman" | "perhatikan" | "waspada";
export type JenisSinyal = "hujan" | "panas" | "kering" | "api" | "udara";

export const AMBANG = {
  hujanSedangMm: 20,
  hujanLebatMm: 50,
  peluangMin: 70,
  tmaxPanasC: 35,
  terasaBahayaC: 41,
  keringMm: 1,
  keringPerhatikan: 7,
  keringWaspada: 14,
  rhKeringPersen: 45,
  apiDeretMin: 5,
  anginKencangKmj: 20,
  pm25TidakSehat: 55.5,
  pm25SangatTidakSehat: 150.5,
} as const;

/** Provinsi prioritas pengendalian karhutla (KLHK/BRGM) ditambah wilayah sabana yang sering terbakar. */
export const PROVINSI_RAWAN_KARHUTLA = [
  "RIAU", "JAMBI", "SUMATERA SELATAN", "KALIMANTAN BARAT", "KALIMANTAN TENGAH", "KALIMANTAN SELATAN",
  "KALIMANTAN TIMUR", "KALIMANTAN UTARA", "PAPUA SELATAN", "NUSA TENGGARA TIMUR",
];
export const rawanKarhutla = (provinsi: string, bahaya: string[] = []) =>
  bahaya.includes("karhutla") || PROVINSI_RAWAN_KARHUTLA.includes(provinsi.trim().toUpperCase());

export interface HariPekan {
  tanggal: string; // YYYY-MM-DD (WIB)
  tmax: number | null;
  terasa: number | null;
  hujan: number | null;
  peluang: number | null;
  rhMin: number | null;
  angin: number | null;
  pm25: number | null; // rata-rata harian; hanya sekitar 5 hari pertama
  /** PM2.5 sangat tinggi dianggap pasti hanya bila ada titik panas di sekitar; model udara global kasar di kota besar. */
  udaraPasti: boolean;
  deretKering: number; // hari kering berturut-turut sampai hari ini (termasuk hari-hari sebelumnya)
  jenis: JenisSinyal[];
  tingkat: Tingkat;
}

export interface SinyalPekan {
  jenis: JenisSinyal;
  tingkat: Exclude<Tingkat, "aman">;
  judul: string;
  /** Kalimat fakta dari data (angka dan tanggal). */
  fakta: string;
  tanggal: string[];
  tindakan: string[];
}

export interface SiagaPekanResponse {
  sumber: { nama: string; url: string; diambilPada: string; lisensi: string };
  stale: boolean;
  grid: { lat: number; lon: number };
  hari: HariPekan[];
  /** Hari kering berturut-turut sampai hari ini (dari 30 hari terakhir). */
  keringKini: number;
  hujan30Mm: number;
  rawanKarhutla: boolean;
  sinyal: SinyalPekan[];
  tingkat: Tingkat;
  /** Status El Niño/La Niña dan IOD (NOAA) yang membingkai musim ini; null bila tidak terbaca. */
  global: KondisiGlobal | null;
  /** Titik panas satelit di sekitar lokasi; null bila umpan tidak terbaca. */
  titikPanas: RingkasTitikPanas | null;
  catatan: string;
}

type Deret = Array<number | null | undefined>;
export interface RawPrakiraan {
  daily?: { time?: string[]; temperature_2m_max?: Deret; apparent_temperature_max?: Deret; precipitation_sum?: Deret; precipitation_probability_max?: Deret; relative_humidity_2m_min?: Deret; wind_speed_10m_max?: Deret };
}
export interface RawUdara {
  hourly?: { time?: string[]; pm2_5?: Deret };
}

const angka = (v: number | null | undefined) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const r1 = (v: number) => Math.round(v * 10) / 10;
const fmt = (v: number) => String(r1(v)).replace(".", ",");
const URUT: Record<Tingkat, number> = { aman: 0, perhatikan: 1, waspada: 2 };
const lebihBerat = (a: Tingkat, b: Tingkat): Tingkat => (URUT[a] >= URUT[b] ? a : b);

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
/** "Sabtu 22 Nov" dari YYYY-MM-DD (tanggal kalender, tanpa zona waktu). */
export function namaTanggal(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const hari = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${HARI[hari]} ${d} ${BLN[m - 1]}`;
}
/** Rentang ringkas: "Sabtu 22 Nov", "Sabtu 22 Nov - Senin 24 Nov", atau "4 hari: Sabtu 22 Nov, ...". */
export function rentangTanggal(t: string[]): string {
  if (t.length === 0) return "";
  if (t.length === 1) return namaTanggal(t[0]);
  const berurutan = t.every((x, i) => i === 0 || (Date.parse(x) - Date.parse(t[i - 1])) === 86_400_000);
  if (berurutan) return `${namaTanggal(t[0])} - ${namaTanggal(t.at(-1)!)}`;
  return t.length <= 3 ? t.map(namaTanggal).join(", ") : `${t.length} hari, mulai ${namaTanggal(t[0])}`;
}

export const tanggalWib = (d: Date) => new Date(d.getTime() + 7 * 3_600_000).toISOString().slice(0, 10);

const TINDAKAN: Record<JenisSinyal, (o: { karhutla: boolean }) => string[]> = {
  hujan: () => [
    "Bersihkan saluran air dan talang di sekitar rumah sebelum hari hujan.",
    "Simpan dokumen penting dan barang elektronik di tempat tinggi dan wadah kedap air.",
    "Pantau peringatan dini BMKG; bila air mulai naik, matikan listrik dari meteran.",
  ],
  panas: () => [
    "Minum air lebih sering walau tidak haus; hindari aktivitas berat di luar pukul 10.00-16.00.",
    "Pastikan lansia, balita, dan ibu hamil berada di ruangan sejuk dan cukup minum.",
    "Kenali tanda sengatan panas (pusing, kulit panas kering, bingung); bawa ke fasilitas kesehatan atau hubungi 112.",
  ],
  kering: ({ karhutla }) => [
    "Mulai hemat dan tampung air; isi wadah cadangan selagi pasokan lancar.",
    karhutla ? "Jangan membakar sampah atau membuka lahan dengan api; percikan kecil mudah menjadi kebakaran." : "Jangan membakar sampah; rumput dan daun kering mudah terbakar.",
    "Siram tanaman pagi atau sore agar air tidak cepat menguap.",
  ],
  api: ({ karhutla }) => [
    "Jangan membakar sampah, lahan, atau membuang puntung rokok sembarangan.",
    karhutla ? "Bila melihat api atau asap di lahan, laporkan ke 112, BPBD, atau Manggala Agni setempat." : "Bila melihat api di lahan kosong, laporkan ke 112 atau pemadam kebakaran.",
    "Siapkan masker N95/KN95 dan rencana tempat aman bila asap datang.",
  ],
  udara: () => [
    "Kurangi aktivitas di luar ruangan, terutama olahraga dan bagi anak, lansia, serta penderita asma.",
    "Pakai masker N95/KN95 bila harus keluar; masker kain kurang menyaring partikel halus.",
    "Tutup jendela saat udara buruk dan buka kembali saat udara membaik.",
  ],
};

/** Ringkas prakiraan dan kualitas udara menjadi sinyal per bahaya. `now` menentukan "hari ini" (WIB). */
export function hitungSiagaPekan(
  raw: RawPrakiraan,
  udara: RawUdara | null,
  opsi: {
    lat: number;
    lon: number;
    provinsi: string;
    bahaya?: string[];
    now?: Date;
    global?: KondisiGlobal | null;
    titikPanas?: RingkasTitikPanas | null;
    /** Sumber dan catatan pengganti bila data berasal dari penyedia cadangan (MET Norway + NASA POWER). */
    sumber?: { nama: string; url: string; lisensi: string };
    catatan?: string;
  },
): SiagaPekanResponse {
  const now = opsi.now ?? new Date();
  const d = raw.daily;
  if (!d?.time?.length) throw new Error("Prakiraan tidak berisi data harian");
  const tp = opsi.titikPanas ?? null;
  const rawanProv = rawanKarhutla(opsi.provinsi, opsi.bahaya);
  const karhutla = rawanProv || (tp?.dalam7h ?? 0) >= 20;
  const udaraPasti = (tp?.dalam7h ?? 0) >= 5;
  const hariIni = tanggalWib(now);
  let i0 = d.time.indexOf(hariIni);
  if (i0 < 0) i0 = Math.max(0, d.time.findIndex((t) => t > hariIni));

  // PM2.5 rata-rata harian dari data per jam.
  const pm: Record<string, number> = {};
  if (udara?.hourly?.time && udara.hourly.pm2_5) {
    const kumpul: Record<string, number[]> = {};
    udara.hourly.time.forEach((t, j) => {
      const v = angka(udara.hourly!.pm2_5![j]);
      if (v !== null) (kumpul[t.slice(0, 10)] ??= []).push(v);
    });
    for (const [k, v] of Object.entries(kumpul)) if (v.length >= 12) pm[k] = r1(v.reduce((a, b) => a + b, 0) / v.length);
  }

  // Hari kering berturut-turut, dihitung dari data 30 hari terakhir lalu dilanjutkan ke prakiraan.
  let deret = 0;
  let hujan30 = 0;
  const deretPada: number[] = [];
  for (let i = 0; i < d.time.length; i++) {
    const h = angka(d.precipitation_sum?.[i]);
    if (i < i0 && h !== null) hujan30 += h;
    // Hari tanpa data (mis. beberapa hari terakhir yang belum tersedia di sumber cadangan) tidak dihitung kering
    // dan tidak memutus deret: tidak menebak ke arah mana pun.
    if (h !== null) deret = h < AMBANG.keringMm ? deret + 1 : 0;
    deretPada.push(deret);
  }
  const keringKini = i0 > 0 ? deretPada[i0 - 1] : 0;

  const hari: HariPekan[] = [];
  for (let i = i0; i < Math.min(d.time.length, i0 + 16); i++) {
    const h: HariPekan = {
      tanggal: d.time[i],
      tmax: angka(d.temperature_2m_max?.[i]),
      terasa: angka(d.apparent_temperature_max?.[i]),
      hujan: angka(d.precipitation_sum?.[i]),
      peluang: angka(d.precipitation_probability_max?.[i]),
      rhMin: angka(d.relative_humidity_2m_min?.[i]),
      angin: angka(d.wind_speed_10m_max?.[i]),
      pm25: pm[d.time[i]] ?? null,
      udaraPasti,
      deretKering: deretPada[i],
      jenis: [],
      tingkat: "aman",
    };
    const tandai = (j: JenisSinyal, t: Exclude<Tingkat, "aman">) => {
      if (!h.jenis.includes(j)) h.jenis.push(j);
      h.tingkat = lebihBerat(h.tingkat, t);
    };
    if (h.hujan !== null && h.hujan >= AMBANG.hujanLebatMm) tandai("hujan", "waspada");
    else if (h.hujan !== null && h.hujan >= AMBANG.hujanSedangMm && (h.peluang ?? 100) >= AMBANG.peluangMin) tandai("hujan", "perhatikan");
    if (h.terasa !== null && h.terasa >= AMBANG.terasaBahayaC) tandai("panas", "waspada");
    else if (h.tmax !== null && h.tmax >= AMBANG.tmaxPanasC) tandai("panas", "perhatikan");
    if (h.deretKering >= AMBANG.keringWaspada) tandai("kering", "waspada");
    else if (h.deretKering >= AMBANG.keringPerhatikan) tandai("kering", "perhatikan");
    const kering = h.hujan !== null && h.hujan < AMBANG.keringMm && h.rhMin !== null && h.rhMin < AMBANG.rhKeringPersen && h.deretKering >= AMBANG.apiDeretMin;
    if (kering) tandai("api", (h.angin ?? 0) >= AMBANG.anginKencangKmj || h.deretKering >= 10 ? "waspada" : "perhatikan");
    if (h.pm25 !== null && h.pm25 >= AMBANG.pm25SangatTidakSehat) tandai("udara", udaraPasti ? "waspada" : "perhatikan");
    else if (h.pm25 !== null && h.pm25 >= AMBANG.pm25TidakSehat) tandai("udara", "perhatikan");
    hari.push(h);
  }

  const sinyal: SinyalPekan[] = [];
  const kumpulkan = (j: JenisSinyal) => {
    const hs = hari.filter((h) => h.jenis.includes(j));
    if (!hs.length) return null;
    const waspada = hs.some((h) => tingkatJenis(h, j) === "waspada");
    return { hs, tingkat: (waspada ? "waspada" : "perhatikan") as Exclude<Tingkat, "aman"> };
  };
  const tambah = (j: JenisSinyal, judul: string, fakta: (hs: HariPekan[]) => string) => {
    const k = kumpulkan(j);
    if (k) sinyal.push({ jenis: j, tingkat: k.tingkat, judul, fakta: fakta(k.hs), tanggal: k.hs.map((h) => h.tanggal), tindakan: TINDAKAN[j]({ karhutla }) });
  };

  tambah("hujan", "Hujan sedang sampai lebat", (hs) => {
    const maks = hs.reduce((a, h) => ((h.hujan ?? 0) > (a.hujan ?? 0) ? h : a));
    return `Diprakirakan ${hs.length} hari dengan hujan ${AMBANG.hujanSedangMm} mm/hari atau lebih; terbanyak ${fmt(maks.hujan ?? 0)} mm pada ${namaTanggal(maks.tanggal)}.`;
  });
  tambah("panas", "Siang yang sangat panas", (hs) => {
    const maks = hs.reduce((a, h) => ((h.terasa ?? 0) > (a.terasa ?? 0) ? h : a));
    return `${hs.length} hari dengan suhu ${AMBANG.tmaxPanasC}°C atau lebih, atau suhu terasa ${AMBANG.terasaBahayaC}°C atau lebih; terpanas terasa ${fmt(maks.terasa ?? 0)}°C pada ${namaTanggal(maks.tanggal)}.`;
  });
  tambah("kering", "Hari tanpa hujan berturut-turut", (hs) => {
    const maks = Math.max(...hs.map((h) => h.deretKering));
    return `Tidak ada hujan berarti (di bawah ${AMBANG.keringMm} mm) hingga ${maks} hari berturut-turut; tanah, rumput, dan sumber air mulai mengering.`;
  });
  tambah("api", karhutla ? "Cuaca mudah terbakar (risiko karhutla)" : "Cuaca mudah terbakar", (hs) => {
    const rh = Math.min(...hs.map((h) => h.rhMin ?? 100));
    return `${hs.length} hari kering dengan kelembapan terendah ${fmt(rh)}% setelah ${AMBANG.apiDeretMin} hari atau lebih tanpa hujan: api dan asap mudah menyebar.`;
  });
  tambah("udara", "Kualitas udara tidak sehat", (hs) => {
    const maks = hs.reduce((a, h) => ((h.pm25 ?? 0) > (a.pm25 ?? 0) ? h : a));
    return `Partikel halus PM2.5 diperkirakan rata-rata ${fmt(maks.pm25 ?? 0)} µg/m³ pada ${namaTanggal(maks.tanggal)} (kategori ISPU ${(maks.pm25 ?? 0) >= AMBANG.pm25SangatTidakSehat ? "sangat tidak sehat" : "tidak sehat"}). Ini perkiraan model global beresolusi kasar dan dapat berbeda dari stasiun ISPU di dekat Anda.`;
  });

  // Titik panas satelit: bukti nyata ada api di sekitar. "Waspada" hanya bila banyak dan cuaca 3 hari ke depan kering.
  // Di luar provinsi rawan karhutla (mis. kota besar) titik panas sering berasal dari pembakaran sampah atau industri,
  // jadi baru ditampilkan bila jumlahnya jauh lebih banyak.
  if (tp && tp.dalam7h >= (rawanProv ? 3 : 15)) {
    const cuacaKering = hari.slice(0, 3).every((h) => (h.hujan ?? 0) < 5);
    const banyak = tp.dalam24j >= 10 || tp.dalam7h >= 50;
    const tingkatTp: "perhatikan" | "waspada" = banyak && cuacaKering ? "waspada" : "perhatikan";
    const fakta = `Satelit mendeteksi ${tp.dalam7h} titik panas dalam radius ${tp.radiusKm} km selama 7 hari terakhir (${tp.dalam24j} dalam 24 jam)${tp.terdekat ? `, terdekat ${tp.terdekat.km} km ke arah ${tp.terdekat.arah}` : ""}.${cuacaKering ? " Tiga hari ke depan diprakirakan kering, sehingga api mudah menyebar." : ""}`;
    const ada = sinyal.find((x) => x.jenis === "api");
    if (ada) {
      ada.fakta = `${fakta} ${ada.fakta}`;
      if (tingkatTp === "waspada") ada.tingkat = "waspada";
    } else {
      sinyal.push({ jenis: "api", tingkat: tingkatTp, judul: karhutla ? "Titik panas di sekitar Anda (risiko karhutla)" : "Titik panas di sekitar Anda", fakta, tanggal: [hariIni], tindakan: TINDAKAN.api({ karhutla }) });
    }
  }

  // Urutkan: waspada dulu, lalu yang paling dekat waktunya.
  sinyal.sort((a, b) => URUT[b.tingkat] - URUT[a.tingkat] || a.tanggal[0].localeCompare(b.tanggal[0]));
  const tingkat = sinyal.reduce<Tingkat>((t, s) => lebihBerat(t, s.tingkat), "aman");

  return {
    sumber: { ...(opsi.sumber ?? { nama: "Open-Meteo (prakiraan cuaca dan kualitas udara CAMS)", url: "https://open-meteo.com/", lisensi: "CC BY 4.0" }), diambilPada: now.toISOString() },
    stale: false,
    grid: { lat: opsi.lat, lon: opsi.lon },
    hari,
    keringKini,
    hujan30Mm: Math.round(hujan30),
    rawanKarhutla: karhutla,
    sinyal,
    tingkat,
    global: opsi.global ?? null,
    titikPanas: tp,
    catatan: opsi.catatan ??
      "Prakiraan model cuaca global (sekitar 10-25 km) untuk 16 hari dan kualitas udara untuk sekitar 5 hari. Makin jauh harinya, makin tidak pasti. Suhu terasa dari Open-Meteo; BMKG belum menetapkan kategori panas resmi, jadi ambang 41°C (acuan Heat Advisory NWS/NOAA) adalah indikator SIGAP. Ini bukan peringatan resmi: ikuti peringatan dini BMKG dan arahan BPBD.",
  };
}

/** Tingkat satu jenis bahaya pada satu hari (untuk membedakan hari waspada karena hujan vs karena panas). */
export function tingkatJenis(h: HariPekan, j: JenisSinyal): Tingkat {
  switch (j) {
    case "hujan":
      return h.hujan !== null && h.hujan >= AMBANG.hujanLebatMm ? "waspada" : h.jenis.includes("hujan") ? "perhatikan" : "aman";
    case "panas":
      return h.terasa !== null && h.terasa >= AMBANG.terasaBahayaC ? "waspada" : h.jenis.includes("panas") ? "perhatikan" : "aman";
    case "kering":
      return h.deretKering >= AMBANG.keringWaspada ? "waspada" : h.jenis.includes("kering") ? "perhatikan" : "aman";
    case "api":
      return h.jenis.includes("api") && ((h.angin ?? 0) >= AMBANG.anginKencangKmj || h.deretKering >= 10) ? "waspada" : h.jenis.includes("api") ? "perhatikan" : "aman";
    case "udara":
      return h.pm25 !== null && h.pm25 >= AMBANG.pm25SangatTidakSehat && h.udaraPasti ? "waspada" : h.jenis.includes("udara") ? "perhatikan" : "aman";
  }
}

/** Teks sinyal untuk prompt AI; juga satu-satunya sumber angka dan tanggal yang sah bagi keluaran AI. */
export function teksPekan(s: SiagaPekanResponse, hariIni: string): string {
  const baris = [`Hari ini: ${namaTanggal(hariIni)}. Tingkat keseluruhan versi SIGAP: ${s.tingkat}.`];
  baris.push(`Hujan 30 hari terakhir: ${s.hujan30Mm} mm. Hari kering berturut-turut sampai kemarin: ${s.keringKini}.`);
  baris.push(`Wilayah rawan karhutla: ${s.rawanKarhutla ? "ya" : "tidak"}.`);
  if (s.global) {
    const g = s.global;
    baris.push(`Kondisi iklim global: ${teksEnso(g.enso)}.${g.iod ? ` IOD ${g.iod.fase} (DMI ${String(g.iod.nilai).replace(".", ",")} pada ${g.iod.bulan}).` : ""} Dampak untuk Indonesia: ${g.dampak.join(" ")}`);
  }
  if (s.titikPanas) baris.push(`Titik panas satelit dalam radius ${s.titikPanas.radiusKm} km: ${s.titikPanas.dalam7h} dalam 7 hari, ${s.titikPanas.dalam24j} dalam 24 jam. Total di Indonesia 7 hari: ${s.titikPanas.nasional.total}.`);
  if (!s.sinyal.length) baris.push("Sinyal: tidak ada sinyal menonjol dalam 16 hari ke depan.");
  for (const x of s.sinyal) baris.push(`- [${x.tingkat}] ${x.judul}: ${x.fakta} Tanggal: ${x.tanggal.map(namaTanggal).join(", ")}.`);
  return baris.join("\n");
}
