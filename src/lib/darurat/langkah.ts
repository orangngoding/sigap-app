import type { HazardId } from "@/types";
import type { Chunk } from "@/lib/kb/schema";

export interface SumberLangkah {
  judul: string;
  url: string;
}

export interface LangkahDarurat {
  id: string;
  /** Kalimat perintah pendek (judul potongan KB). */
  teks: string;
  /** Satu penjelasan "bagaimana" dari isi potongan; kosong bila isinya hanya mengulang judul. */
  detail?: string;
  /** Keadaan tempat langkah ini berlaku (mis. "Di dalam mobil"); kosong = berlaku umum. */
  keadaan?: string;
  sumber: SumberLangkah;
  /** Catatan bila langkah diturunkan dari panduan bahaya lain; wajib ditampilkan. */
  turunan?: string;
}

export interface KelompokLangkah {
  keadaan: string | null;
  langkah: LangkahDarurat[];
}

export interface PaketDarurat {
  /** Semua langkah "saat" berurutan (dipakai Kartu Siaga, Pandu, dan Bacakan). */
  saat: LangkahDarurat[];
  /** Langkah "saat" dikelompokkan menurut keadaan agar orang panik langsung menemukan yang berlaku untuknya. */
  kelompok: KelompokLangkah[];
  sesudah: LangkahDarurat[];
  /** Sumber unik dari semua langkah di atas, untuk ditampilkan. */
  sumber: SumberLangkah[];
}

const BOBOT = { tinggi: 3, sedang: 2, rendah: 1 } as const;

/**
 * Urutan dan pengelompokan langkah yang ditulis tim untuk bahaya yang langkahnya berbeda menurut tempat. Hanya merujuk
 * id potongan KB (isi dan sumber tetap dari KB): langkah tanpa konteks "di mana" bisa menyesatkan orang yang panik,
 * misalnya "berhenti di tempat terbuka" yang sebenarnya untuk pengemudi mobil.
 */
export const KURASI: Partial<Record<HazardId, Array<{ keadaan: string; ids: string[] }>>> = {
  gempa: [
    { keadaan: "Di dalam bangunan", ids: ["gempa-saat-008", "gempa-saat-001", "gempa-saat-002", "gempa-saat-005"] },
    { keadaan: "Di luar bangunan", ids: ["gempa-saat-003"] },
    { keadaan: "Di dalam mobil", ids: ["gempa-saat-004"] },
    { keadaan: "Di dekat pantai", ids: ["gempa-saat-006"] },
  ],
  banjir: [
    { keadaan: "Air mulai naik di sekitar rumah", ids: ["banjir-saat-003", "banjir-saat-016", "banjir-saat-002", "banjir-saat-008"] },
    { keadaan: "Di jalan atau di luar rumah", ids: ["banjir-saat-006", "banjir-saat-001", "banjir-saat-007"] },
  ],
  cuaca_ekstrem: [
    { keadaan: "Angin kencang atau puting beliung", ids: ["cuaca_ekstrem-saat-005", "cuaca_ekstrem-saat-006", "cuaca_ekstrem-saat-007", "cuaca_ekstrem-saat-004"] },
    { keadaan: "Petir", ids: ["cuaca_ekstrem-saat-003", "cuaca_ekstrem-saat-001", "cuaca_ekstrem-saat-002"] },
  ],
};

/** Urutkan: prioritas tertinggi dulu, lalu urutan di KB (stabil). */
function urut(chunks: Chunk[]): Chunk[] {
  return chunks
    .map((c, i) => ({ c, i }))
    .sort((a, b) => BOBOT[b.c.priority] - BOBOT[a.c.priority] || a.i - b.i)
    .map((x) => x.c);
}

/** Kata umum yang tidak menambah informasi saat membandingkan judul dan isi. */
const KATA_UMUM = new Set(["yang", "dalam", "dengan", "untuk", "atau", "dari", "pada", "bila", "jika", "agar", "akan", "lebih", "juga", "karena", "sudah", "masih", "setiap", "anda", "segera", "lalu", "serta", "tidak", "jangan"]);
const kataInti = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 3 && !KATA_UMUM.has(w));

/** Isi potongan dipakai sebagai penjelasan hanya bila menambah informasi di luar judul. */
export function detailDari(c: Pick<Chunk, "title" | "body">): string | undefined {
  const judul = new Set(kataInti(c.title));
  const baru = kataInti(c.body).filter((w) => !judul.has(w));
  return baru.length >= 3 ? c.body.trim() : undefined;
}

const peta = (c: Chunk, keadaan?: string): LangkahDarurat => {
  const detail = detailDari(c);
  return {
    id: c.id,
    teks: c.title,
    ...(detail ? { detail } : {}),
    ...(keadaan ? { keadaan } : {}),
    sumber: { judul: c.sourceTitle, url: c.sourceUrl },
    ...(c.turunan ? { turunan: c.turunan } : {}),
  };
};

/**
 * Langkah Mode Darurat untuk satu bahaya (Blueprint 8.2): paling banyak 7 langkah "Saat kejadian" dan 3 langkah
 * "Sesudah kejadian", murni dari potongan KB (tanpa rencana, tanpa jaringan). Bahaya di KURASI memakai urutan dan
 * kelompok keadaan dari tim; bahaya lain: potongan bertanda `darurat: true` didahulukan, lalu menurut prioritas.
 */
export function langkahDaruratBahaya(kb: Chunk[], hazard: HazardId, maksSaat = 7, maksSesudah = 3): PaketDarurat {
  const dari = (phase: Chunk["phase"]) => kb.filter((c) => c.hazard === hazard && c.phase === phase);
  const saat = dari("saat");
  const byId = new Map(saat.map((c) => [c.id, c]));
  const kurasi = KURASI[hazard];

  let kelompok: KelompokLangkah[];
  if (kurasi && kurasi.every((k) => k.ids.every((id) => byId.has(id)))) {
    let sisa = maksSaat;
    kelompok = kurasi
      .map((k) => {
        const ambil = k.ids.slice(0, Math.max(0, sisa));
        sisa -= ambil.length;
        return { keadaan: k.keadaan, langkah: ambil.map((id) => peta(byId.get(id)!, k.keadaan)) };
      })
      .filter((k) => k.langkah.length > 0);
  } else {
    const pilih = [...urut(saat.filter((c) => c.darurat)), ...urut(saat.filter((c) => !c.darurat))].slice(0, maksSaat);
    kelompok = pilih.length ? [{ keadaan: null, langkah: pilih.map((c) => peta(c)) }] : [];
  }
  const daftarSaat = kelompok.flatMap((k) => k.langkah);
  const sesudah = urut(dari("sesudah")).slice(0, maksSesudah).map((c) => peta(c));

  return { saat: daftarSaat, kelompok, sesudah, sumber: gabungSumber([...daftarSaat, ...sesudah].map((l) => l.sumber)) };
}

/**
 * Satu baris per dokumen: halaman dari dokumen yang sama digabung ("..., hlm. 16, 17, 20"), agar daftar sumber
 * pendek dan tetap bisa dilacak sampai ke halamannya.
 */
export function gabungSumber(daftar: SumberLangkah[]): SumberLangkah[] {
  const per = new Map<string, { dasar: string; url: string; hlm: string[] }>();
  for (const s of daftar) {
    const m = s.judul.match(/^(.*?),\s*hlm\.\s*(.+)$/);
    const dasar = m ? m[1] : s.judul;
    const kunci = `${dasar}|${s.url}`;
    const x = per.get(kunci) ?? { dasar, url: s.url, hlm: [] };
    if (m && !x.hlm.includes(m[2])) x.hlm.push(m[2]);
    per.set(kunci, x);
  }
  return [...per.values()].map((x) => ({ judul: x.hlm.length ? `${x.dasar}, hlm. ${ringkasHalaman(x.hlm)}` : x.dasar, url: x.url }));
}

/** "36", "36-37", "38" -> "36-38": halaman dan rentang digabung, lalu halaman berurutan diringkas menjadi rentang. */
export function ringkasHalaman(daftar: string[]): string {
  const set = new Set<number>();
  const lain: string[] = [];
  for (const h of daftar) {
    const m = h.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!m) { if (!lain.includes(h)) lain.push(h); continue; }
    const a = Number(m[1]);
    const b = m[2] ? Number(m[2]) : a;
    for (let i = Math.min(a, b); i <= Math.max(a, b); i++) set.add(i);
  }
  const urut = [...set].sort((a, b) => a - b);
  const bagian: string[] = [];
  for (let i = 0; i < urut.length; i++) {
    let j = i;
    while (j + 1 < urut.length && urut[j + 1] === urut[j] + 1) j++;
    bagian.push(i === j ? `${urut[i]}` : `${urut[i]}-${urut[j]}`);
    i = j;
  }
  return [...bagian, ...lain].join(", ");
}

/** Teks satu langkah untuk dibacakan atau dipandu: keadaan, perintah, lalu penjelasannya. */
export function teksLengkap(l: LangkahDarurat): string {
  return `${l.keadaan ? `${l.keadaan}: ` : ""}${l.teks}.${l.detail ? ` ${l.detail}` : ""}`;
}

/** Jumlah kata maksimum per langkah di Mode Darurat (Blueprint 8.2). */
export const MAKS_KATA_LANGKAH = 12;
