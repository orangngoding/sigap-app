// Briefing Siaga Hari Ini: sinyal dihitung KODE dari data resmi BMKG, bukan oleh AI.
// AI hanya merangkai kalimat dan memilih tindakan; tingkat perhatian dan fakta tidak pernah dari model.
import type { CuacaResponse, GempaItem, GempaResponse, HazardId, PeringatanResponse } from "@/types";
import type { KonteksTanya } from "@/lib/ai/schema";
import { jamLokal, namaHari, waktuRelatif } from "@/lib/utils/format";

/** Tingkat perhatian versi SIGAP. BUKAN status resmi BMKG/BNPB. */
export type Tingkat = "tenang" | "perhatikan" | "waspada";
export const URUTAN_TINGKAT: Record<Tingkat, number> = { tenang: 0, perhatikan: 1, waspada: 2 };

export type JenisSinyal =
  | "peringatan_lokasi"
  | "peringatan_provinsi"
  | "hujan_lebat"
  | "hujan"
  | "panas"
  | "angin"
  | "cuaca"
  | "gempa_dekat"
  | "gempa_terasa"
  | "tsunami";

export interface Sinyal {
  jenis: JenisSinyal;
  tingkat: Tingkat;
  bahaya: HazardId | "umum";
  judul: string;
  /** Fakta dari data resmi, ditulis kode. Satu-satunya sumber angka yang boleh dipakai AI. */
  fakta: string;
  sumber: "cuaca" | "peringatan" | "gempa";
  url: string;
}

export interface DataBriefing {
  cuaca: CuacaResponse | null;
  gempa: GempaResponse | null;
  peringatan: PeringatanResponse | null;
}

/** Atribut anonim keluarga (tanpa nama, kontak, catatan). */
export type KeluargaBriefing = Omit<KonteksTanya, "wilayah"> & { bahaya?: HazardId[] };

export interface TindakanBriefing {
  judul: string;
  alasan: string;
  /** Tautan internal atau resmi yang membantu mengerjakan tindakan. */
  tautan?: { href: string; label: string };
}

const URL_CUACA = "https://www.bmkg.go.id/cuaca/prakiraan-cuaca";
const URL_GEMPA = "https://www.bmkg.go.id/gempabumi/gempabumi-terkini.bmkg";
const URL_PERINGATAN = "https://www.bmkg.go.id/peringatan-dini";

const AMBANG_PANAS = 35; // °C
const AMBANG_ANGIN = 40; // km/jam
const RADIUS_TERASA = 150; // km
const BERPOTENSI_TSUNAMI = /berpotensi tsunami/i;
const TIDAK_BERPOTENSI = /tidak berpotensi/i;

function dalamJendela(iso: string, now: Date, jamKeDepan: number): boolean {
  const t = Date.parse(iso);
  return t >= now.getTime() - 3 * 3600_000 && t <= now.getTime() + jamKeDepan * 3600_000;
}

function sinyalPeringatan(p: PeringatanResponse | null): Sinyal[] {
  if (!p?.tersedia || p.daftar.length === 0) return [];
  const lokal = p.daftar.filter((x) => x.cakupan === "lokasi");
  if (lokal.length > 0) {
    const x = lokal[0];
    const sampai = x.berlakuSampai ? ` Berlaku sampai ${jamLokal(x.berlakuSampai)} waktu setempat.` : "";
    return [{
      jenis: "peringatan_lokasi", tingkat: "waspada", bahaya: "cuaca_ekstrem",
      judul: "Peringatan dini BMKG menyebut wilayah Anda",
      fakta: `${x.judul}.${sampai}`.replace(/\.\./g, "."),
      sumber: "peringatan", url: x.url || URL_PERINGATAN,
    }];
  }
  return [{
    jenis: "peringatan_provinsi", tingkat: "perhatikan", bahaya: "cuaca_ekstrem",
    judul: "Ada peringatan dini cuaca di provinsi Anda",
    fakta: `${p.daftar.length} peringatan BMKG aktif di tingkat provinsi; kecamatan dan kabupaten/kota Anda tidak disebut langsung.`,
    sumber: "peringatan", url: p.daftar[0].url || URL_PERINGATAN,
  }];
}

function sinyalCuaca(c: CuacaResponse | null, now: Date): Sinyal[] {
  if (!c || c.prakiraan.length === 0) return [];
  const besok = c.prakiraan.filter((p) => dalamJendela(p.waktu, now, 24));
  const jendela = besok.length > 0 ? besok : c.prakiraan.slice(0, 8);
  const out: Sinyal[] = [];

  const lebat = jendela.find((p) => /hujan lebat|petir/i.test(p.kondisi));
  if (lebat) {
    out.push({
      jenis: "hujan_lebat", tingkat: "perhatikan", bahaya: "banjir",
      judul: "Prakiraan hujan lebat atau petir",
      fakta: `Prakiraan BMKG: ${lebat.kondisi.toLowerCase()} pada ${namaHari(lebat.waktu)} sekitar pukul ${jamLokal(lebat.waktu)}.`,
      sumber: "cuaca", url: URL_CUACA,
    });
  } else {
    // Hujan biasa dicatat terpisah hanya bila kondisi saat ini belum hujan (agar tidak dobel dengan "Cuaca hari ini").
    const hujan = jendela.find((p) => /hujan/i.test(p.kondisi));
    if (hujan && !/hujan/i.test(jendela[0].kondisi)) {
      out.push({
        jenis: "hujan", tingkat: "tenang", bahaya: "banjir",
        judul: "Ada prakiraan hujan",
        fakta: `Prakiraan BMKG: ${hujan.kondisi.toLowerCase()} pada ${namaHari(hujan.waktu)} sekitar pukul ${jamLokal(hujan.waktu)}.`,
        sumber: "cuaca", url: URL_CUACA,
      });
    }
  }

  const suhu = jendela.map((p) => p.suhu).filter((v): v is number => v !== null);
  const maks = suhu.length ? Math.max(...suhu) : null;
  const min = suhu.length ? Math.min(...suhu) : null;
  if (maks !== null && maks >= AMBANG_PANAS) {
    out.push({
      jenis: "panas", tingkat: "perhatikan", bahaya: "cuaca_ekstrem",
      judul: "Cuaca panas",
      fakta: `Suhu tertinggi dalam prakiraan BMKG 24 jam ke depan mencapai ${maks}°C.`,
      sumber: "cuaca", url: URL_CUACA,
    });
  }

  const angin = jendela.map((p) => p.anginKmj).filter((v): v is number => v !== null);
  const anginMaks = angin.length ? Math.max(...angin) : null;
  if (anginMaks !== null && anginMaks >= AMBANG_ANGIN) {
    out.push({
      jenis: "angin", tingkat: "perhatikan", bahaya: "cuaca_ekstrem",
      judul: "Angin kencang",
      fakta: `Kecepatan angin dalam prakiraan BMKG mencapai ${anginMaks} km/jam.`,
      sumber: "cuaca", url: URL_CUACA,
    });
  }

  // Gambaran umum hari ini selalu disertakan agar briefing tetap informatif saat tenang.
  const kini = jendela[0];
  out.push({
    jenis: "cuaca", tingkat: "tenang", bahaya: /hujan/i.test(kini.kondisi) ? "banjir" : "umum",
    judul: "Cuaca hari ini",
    fakta: `Prakiraan BMKG saat ini: ${kini.kondisi.toLowerCase()}${min !== null && maks !== null ? `, suhu ${min}–${maks}°C` : ""}.`,
    sumber: "cuaca", url: URL_CUACA,
  });
  return out;
}

const potensiTsunami = (g: GempaItem) => Boolean(g.potensi && BERPOTENSI_TSUNAMI.test(g.potensi) && !TIDAK_BERPOTENSI.test(g.potensi));

function sinyalGempa(g: GempaResponse | null, now: Date): Sinyal[] {
  if (!g) return [];
  const semua = [g.terbaru, ...g.daftar].filter((x): x is GempaItem => Boolean(x));
  const baru = semua.filter((x) => now.getTime() - Date.parse(x.waktu) <= 24 * 3600_000);
  const out: Sinyal[] = [];

  const ts = baru.find((x) => potensiTsunami(x) && now.getTime() - Date.parse(x.waktu) <= 6 * 3600_000);
  if (ts) {
    out.push({
      jenis: "tsunami", tingkat: "waspada", bahaya: "tsunami",
      judul: "BMKG menyatakan gempa berpotensi tsunami",
      fakta: `Gempa M${ts.magnitudo} ${ts.wilayah} (${waktuRelatif(ts.waktu, now.getTime())}): ${ts.potensi}.`,
      sumber: "gempa", url: URL_GEMPA,
    });
  }

  const dekat = baru
    .filter((x) => x.jarakKm !== undefined)
    .sort((a, b) => (a.jarakKm ?? 0) - (b.jarakKm ?? 0));
  const kuat = dekat.find((x) => x.magnitudo >= 5 && (x.jarakKm ?? Infinity) <= 300);
  const terasa = dekat.find((x) => x.magnitudo >= 4 && (x.jarakKm ?? Infinity) <= RADIUS_TERASA);
  const pilih = kuat ?? terasa;
  if (pilih) {
    out.push({
      jenis: kuat ? "gempa_dekat" : "gempa_terasa",
      tingkat: kuat ? "waspada" : "perhatikan",
      bahaya: "gempa",
      judul: kuat ? "Gempa kuat di sekitar wilayah Anda" : "Gempa di sekitar wilayah Anda",
      fakta: `Gempa M${pilih.magnitudo} sekitar ${pilih.jarakKm} km dari lokasi Anda, ${waktuRelatif(pilih.waktu, now.getTime())}.`,
      sumber: "gempa", url: URL_GEMPA,
    });
  }
  return out;
}

/** Semua sinyal, diurutkan dari tingkat tertinggi. */
export function hitungSinyal(d: DataBriefing, now = new Date()): Sinyal[] {
  return [...sinyalPeringatan(d.peringatan), ...sinyalGempa(d.gempa, now), ...sinyalCuaca(d.cuaca, now)]
    .sort((a, b) => URUTAN_TINGKAT[b.tingkat] - URUTAN_TINGKAT[a.tingkat]);
}

export function tingkatKeseluruhan(sinyal: Sinyal[]): Tingkat {
  return sinyal.reduce<Tingkat>((t, s) => (URUTAN_TINGKAT[s.tingkat] > URUTAN_TINGKAT[t] ? s.tingkat : t), "tenang");
}

/** Bagian data yang gagal dibaca: briefing harus jujur bahwa gambaran belum lengkap. */
export function dataTidakLengkap(d: DataBriefing): string[] {
  const out: string[] = [];
  if (!d.cuaca) out.push("Prakiraan cuaca BMKG belum dapat dimuat.");
  if (!d.gempa) out.push("Data gempa BMKG belum dapat dimuat.");
  if (!d.peringatan || !d.peringatan.tersedia) out.push("Umpan peringatan dini BMKG belum dapat dibaca; periksa langsung kanal resmi BMKG.");
  return out;
}

// ---------- Cadangan tanpa AI ----------
const T: Record<JenisSinyal, TindakanBriefing | null> = {
  peringatan_lokasi: {
    judul: "Baca peringatan resmi BMKG sampai selesai",
    alasan: "Peringatan menyebut wilayah Anda. Perhatikan waktu berlakunya dan ikuti arahan BPBD atau kelurahan setempat.",
    tautan: { href: URL_PERINGATAN, label: "Buka peringatan BMKG" },
  },
  peringatan_provinsi: {
    judul: "Pantau kanal resmi BMKG hari ini",
    alasan: "Ada peringatan di provinsi Anda. Periksa apakah kecamatan Anda disebut dan beri tahu keluarga.",
    tautan: { href: URL_PERINGATAN, label: "Buka peringatan BMKG" },
  },
  hujan_lebat: {
    judul: "Bersihkan saluran air dan amankan barang penting",
    alasan: "Hujan lebat dapat memicu genangan. Taruh dokumen penting dan barang elektronik di tempat yang lebih tinggi.",
  },
  hujan: {
    judul: "Siapkan jas hujan dan cek saluran air rumah",
    alasan: "Saluran yang tersumbat membuat air cepat meluap saat hujan turun.",
  },
  panas: {
    judul: "Minum cukup air dan batasi aktivitas di bawah terik",
    alasan: "Suhu tinggi berisiko bagi lansia, balita, dan ibu hamil. Pakai pelindung kepala bila harus keluar.",
  },
  angin: {
    judul: "Amankan benda yang mudah terbawa angin",
    alasan: "Masukkan jemuran dan pot, periksa atap yang longgar, dan jauhi pohon besar atau baliho saat angin kencang.",
  },
  cuaca: null,
  gempa_dekat: {
    judul: "Waspadai gempa susulan",
    alasan: "Periksa retakan dinding sebelum masuk rumah. Bila terasa guncangan: Merunduk, Berlindung, Bertahan.",
    tautan: { href: "/darurat", label: "Langkah saat gempa" },
  },
  gempa_terasa: {
    judul: "Ingat kembali langkah saat gempa",
    alasan: "Kenali tempat berlindung di setiap ruangan: di bawah meja kokoh, jauh dari kaca dan lemari tinggi.",
    tautan: { href: "/darurat", label: "Langkah saat gempa" },
  },
  tsunami: {
    judul: "Bila di dekat pantai, ikuti arahan evakuasi resmi",
    alasan: "BMKG menyatakan potensi tsunami. Jauhi pantai, jangan menunggu air surut, dan ikuti BPBD serta petugas.",
    tautan: { href: "/darurat", label: "Buka Mode Darurat" },
  },
};

const UMUM: TindakanBriefing[] = [
  { judul: "Periksa isi tas siaga keluarga", alasan: "Pastikan air, senter, obat rutin, dan dokumen penting masih lengkap dan belum kedaluwarsa.", tautan: { href: "/rencana", label: "Buka rencana" } },
  { judul: "Pastikan nomor darurat mudah dijangkau", alasan: "Simpan 112 dan kontak keluarga, atau cetak Kartu Siaga dan tempel di rumah.", tautan: { href: "/rencana/kartu", label: "Kartu Siaga" } },
  { judul: "Sepakati titik kumpul keluarga", alasan: "Semua anggota keluarga perlu tahu ke mana berkumpul bila terpisah saat kejadian.", tautan: { href: "/rencana/profil", label: "Profil keluarga" } },
];

function tindakanKeluarga(k: KeluargaBriefing): TindakanBriefing[] {
  const out: TindakanBriefing[] = [];
  if ((k.lansia ?? 0) > 0 || (k.disabilitas ?? 0) > 0) {
    out.push({ judul: "Siapkan kebutuhan anggota lansia dan disabilitas", alasan: "Taruh obat rutin dan alat bantu di dekat pintu keluar agar mudah dibawa, dan tentukan siapa yang mendampingi." });
  }
  if ((k.balita ?? 0) > 0) {
    out.push({ judul: "Lengkapi kebutuhan balita di tas siaga", alasan: "Susu, popok, makanan bayi, dan selimut kecil sering terlupa saat harus keluar rumah cepat." });
  }
  if (k.hewanPeliharaan) {
    out.push({ judul: "Siapkan wadah dan pakan hewan peliharaan", alasan: "Hewan peliharaan perlu kandang angkut dan pakan agar bisa ikut dibawa." });
  }
  return out;
}

/** Tiga tindakan tanpa AI: sinyal terpenting lebih dulu, lalu kebutuhan keluarga, lalu tindakan umum. */
export function tindakanCadangan(sinyal: Sinyal[], k: KeluargaBriefing = {}): TindakanBriefing[] {
  const dariSinyal = sinyal
    .map((s) => (s.jenis === "cuaca" && s.bahaya === "banjir" ? T.hujan : T[s.jenis]))
    .filter((t): t is TindakanBriefing => t !== null);
  const semua = [...dariSinyal, ...tindakanKeluarga(k), ...UMUM];
  return semua.filter((t, i) => semua.findIndex((x) => x.judul === t.judul) === i).slice(0, 3);
}

const KALIMAT_TINGKAT: Record<Tingkat, string> = {
  tenang: "Tidak ada peringatan BMKG yang menyebut wilayah Anda saat ini. Ini waktu yang baik untuk memeriksa kesiapan keluarga.",
  perhatikan: "Ada kondisi yang perlu diperhatikan hari ini.",
  waspada: "Ada informasi resmi yang perlu segera Anda perhatikan.",
};

/** `peringatanTerbaca` false: jangan pernah menyatakan "tidak ada peringatan" (Blueprint 6.2). */
export function ringkasanCadangan(sinyal: Sinyal[], tingkat: Tingkat, peringatanTerbaca = true): string {
  const penting = sinyal.filter((s) => s.tingkat !== "tenang").slice(0, 2).map((s) => s.fakta);
  const cuaca = sinyal.find((s) => s.jenis === "cuaca")?.fakta;
  const pembuka =
    tingkat === "tenang" && !peringatanTerbaca
      ? "Belum ada sinyal bahaya dari data yang terbaca, tetapi umpan peringatan dini BMKG belum dapat diperiksa."
      : KALIMAT_TINGKAT[tingkat];
  return [pembuka, ...penting, penting.length === 0 ? cuaca : undefined].filter(Boolean).join(" ");
}
