// Kondisi iklim global yang paling menentukan musim di Indonesia: ENSO (El Niño / La Niña) dan IOD (Indian Ocean
// Dipole). Data bulanan resmi NOAA; klasifikasi dan dampaknya dihitung KODE (bukan AI), dengan acuan:
//  - ENSO: Oceanic Niño Index (ONI) NOAA CPC; fase bila ONI mencapai +0,5 (El Niño) atau -0,5 (La Niña).
//    Kekuatan memakai pembagian umum: lemah 0,5-0,9, sedang 1,0-1,4, kuat 1,5-1,9, sangat kuat 2,0 ke atas.
//  - IOD: Dipole Mode Index (DMI) NOAA PSL dari HadISST; positif bila DMI 0,4 ke atas, negatif bila -0,4 ke bawah
//    (ambang yang dipakai Biro Meteorologi Australia).
// Dampak dirumuskan sebagai kecenderungan menurut penjelasan BMKG (El Niño: awal musim hujan mundur, kekeringan dan
// karhutla naik; La Niña: hujan di atas normal). Data IOD biasanya terbit lebih lambat dari ENSO; bulan terakhir
// yang valid selalu ditampilkan bersama usianya.

export const URL_ONI = "https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt";
export const URL_NINO34_BULANAN = "https://psl.noaa.gov/data/correlation/nina34.anom.data";
export const URL_DMI = "https://psl.noaa.gov/data/timeseries/month/data/dmi.had.long.data";
export const URL_BMKG_IKLIM = "https://www.bmkg.go.id/iklim/prakiraan-musim.bmkg";

export type FaseEnso = "el_nino" | "la_nina" | "netral";
export type KekuatanEnso = "lemah" | "sedang" | "kuat" | "sangat_kuat";
export type FaseIod = "positif" | "negatif" | "netral";

export interface KondisiEnso {
  fase: FaseEnso;
  kekuatan: KekuatanEnso | null;
  /** ONI musim terakhir (rata-rata 3 bulan). */
  oni: number;
  /** Label musim, mis. "Agustus-Oktober 2026". */
  periode: string;
  /** Anomali Niño 3.4 bulan terakhir (bila tersedia). */
  bulanTerakhir: { nilai: number; bulan: string } | null;
}
export interface KondisiIod {
  fase: FaseIod;
  nilai: number;
  bulan: string; // mis. "Juli 2026"
  /** Berapa bulan data terakhir tertinggal dari bulan berjalan. */
  usiaBulan: number;
}
export interface KondisiGlobal {
  sumber: { nama: string; url: string; diambilPada: string };
  stale: boolean;
  enso: KondisiEnso;
  iod: KondisiIod | null;
  /** Ringkasan dampak untuk Indonesia, disusun kode dari fase dan kekuatan. */
  dampak: string[];
  /** Tingkat pengaruh pada musim di Indonesia: dipakai untuk menandai bulan yang "tidak sesuai pola". */
  pengaruh: "kering" | "basah" | "netral";
}

const NAMA_BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
/** Musim tiga bulanan ONI -> label berbahasa Indonesia. */
const MUSIM_ONI: Record<string, [number, number]> = {
  DJF: [11, 1], JFM: [0, 2], FMA: [1, 3], MAM: [2, 4], AMJ: [3, 5], MJJ: [4, 6], JJA: [5, 7], JAS: [6, 8], ASO: [7, 9], SON: [8, 10], OND: [9, 11], NDJ: [10, 0],
};

export function kekuatanEnso(oni: number): KekuatanEnso | null {
  const a = Math.abs(oni);
  if (a < 0.5) return null;
  return a >= 2 ? "sangat_kuat" : a >= 1.5 ? "kuat" : a >= 1 ? "sedang" : "lemah";
}
export const faseEnso = (oni: number): FaseEnso => (oni >= 0.5 ? "el_nino" : oni <= -0.5 ? "la_nina" : "netral");
export const faseIod = (dmi: number): FaseIod => (dmi >= 0.4 ? "positif" : dmi <= -0.4 ? "negatif" : "netral");

/** Baris terakhir ONI yang valid: "ASO 2026 29.23 2.46". */
export function uraiOni(teks: string): { musim: string; tahun: number; oni: number } | null {
  const baris = teks.split(/\r?\n/).map((b) => b.trim().split(/\s+/)).filter((p) => p.length >= 4 && p[0] in MUSIM_ONI && /^\d{4}$/.test(p[1]));
  const akhir = baris.at(-1);
  if (!akhir) return null;
  const oni = Number(akhir[3]);
  return Number.isFinite(oni) && Math.abs(oni) < 10 ? { musim: akhir[0], tahun: Number(akhir[1]), oni } : null;
}
export function labelMusimOni(musim: string, tahun: number): string {
  const [a, b] = MUSIM_ONI[musim] ?? [0, 0];
  // Musim yang melewati pergantian tahun (DJF, NDJ, OND): ONI di berkas diberi tahun bulan tengah.
  return `${NAMA_BULAN[a]}-${NAMA_BULAN[b]} ${tahun}`;
}

/** Deret bulanan format PSL: "TAHUN v1..v12"; nilai tak valid -99.99 atau -9999. Mengembalikan bulan valid terakhir. */
export function uraiBulananPsl(teks: string): { tahun: number; bulan: number; nilai: number } | null {
  let hasil: { tahun: number; bulan: number; nilai: number } | null = null;
  for (const b of teks.split(/\r?\n/)) {
    const p = b.trim().split(/\s+/);
    if (p.length < 13 || !/^\d{4}$/.test(p[0])) continue;
    for (let i = 1; i <= 12; i++) {
      const v = Number(p[i]);
      if (Number.isFinite(v) && Math.abs(v) < 50) hasil = { tahun: Number(p[0]), bulan: i - 1, nilai: v };
    }
  }
  return hasil;
}

const f1 = (v: number) => v.toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 2, signDisplay: "exceptZero" });

/** Dampak untuk Indonesia (kecenderungan, bukan kepastian), dari fase dan kekuatan ENSO serta fase IOD. */
export function dampakGlobal(enso: KondisiEnso, iod: KondisiIod | null): { dampak: string[]; pengaruh: KondisiGlobal["pengaruh"] } {
  const dampak: string[] = [];
  let pengaruh: KondisiGlobal["pengaruh"] = "netral";
  const kuat = enso.kekuatan === "kuat" || enso.kekuatan === "sangat_kuat";
  if (enso.fase === "el_nino") {
    pengaruh = "kering";
    dampak.push(`Hujan cenderung di bawah normal dan awal musim hujan bisa mundur di sebagian besar Indonesia, terutama di selatan khatulistiwa (Jawa, Bali, Nusa Tenggara, Sulawesi, Kalimantan, dan Sumatra bagian selatan).`);
    dampak.push(`Risiko kekeringan, kekurangan air bersih, dan kebakaran hutan dan lahan (karhutla) naik${kuat ? "; pada El Niño sekuat ini kekeringan bisa berlanjut hingga awal musim hujan" : ""}.`);
    dampak.push("Suhu siang cenderung lebih panas dari biasanya. Hujan lebat tetap bisa terjadi singkat dan lokal, sehingga saluran air tetap perlu dirawat.");
  } else if (enso.fase === "la_nina") {
    pengaruh = "basah";
    dampak.push("Hujan cenderung di atas normal di sebagian besar Indonesia, dan musim hujan bisa lebih lama.");
    dampak.push(`Risiko banjir, tanah longsor, dan cuaca ekstrem naik${kuat ? ", terutama saat puncak musim hujan" : ""}; risiko karhutla cenderung turun.`);
  } else {
    dampak.push("Tidak ada pengaruh ENSO yang menonjol; musim cenderung mengikuti pola rata-rata.");
  }
  if (iod && iod.fase === "positif") {
    dampak.push("IOD positif memperkuat pengeringan di Indonesia bagian barat (Sumatra, Jawa, Kalimantan) pada musim kemarau hingga awal musim hujan.");
    if (pengaruh === "netral") pengaruh = "kering";
  } else if (iod && iod.fase === "negatif") {
    dampak.push("IOD negatif menambah hujan di Indonesia bagian barat.");
    if (pengaruh === "netral") pengaruh = "basah";
  }
  return { dampak, pengaruh };
}

export function hitungKondisiGlobal(oniTeks: string, ninoTeks: string | null, dmiTeks: string | null, now = new Date()): KondisiGlobal {
  const o = uraiOni(oniTeks);
  if (!o) throw new Error("Berkas ONI tidak terbaca");
  const nino = ninoTeks ? uraiBulananPsl(ninoTeks) : null;
  const enso: KondisiEnso = {
    fase: faseEnso(o.oni),
    kekuatan: kekuatanEnso(o.oni),
    oni: o.oni,
    periode: labelMusimOni(o.musim, o.tahun),
    bulanTerakhir: nino ? { nilai: nino.nilai, bulan: `${NAMA_BULAN[nino.bulan]} ${nino.tahun}` } : null,
  };
  const d = dmiTeks ? uraiBulananPsl(dmiTeks) : null;
  const iod: KondisiIod | null = d
    ? { fase: faseIod(d.nilai), nilai: d.nilai, bulan: `${NAMA_BULAN[d.bulan]} ${d.tahun}`, usiaBulan: (now.getUTCFullYear() - d.tahun) * 12 + (now.getUTCMonth() - d.bulan) }
    : null;
  const { dampak, pengaruh } = dampakGlobal(enso, iod);
  return {
    sumber: { nama: "NOAA CPC (ONI) dan NOAA PSL (Niño 3.4, DMI)", url: "https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/ensostuff/ONI_v5.php", diambilPada: now.toISOString() },
    stale: false,
    enso,
    iod,
    dampak,
    pengaruh,
  };
}

/** Teks ringkas untuk label dan prompt AI. */
export function teksEnso(e: KondisiEnso): string {
  const nama = e.fase === "el_nino" ? "El Niño" : e.fase === "la_nina" ? "La Niña" : "ENSO netral";
  const kuat = e.kekuatan ? ` ${e.kekuatan.replace("_", " ")}` : "";
  return `${nama}${e.fase === "netral" ? "" : kuat} (ONI ${f1(e.oni)} pada ${e.periode})`;
}
