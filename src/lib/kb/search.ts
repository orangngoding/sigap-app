import type { Chunk } from "./schema";

/**
 * Pencarian leksikal BM25 atas potongan KB (Blueprint 10.2). Tanpa embedding dan tanpa dependensi:
 * cukup untuk ~100-300 potongan, deterministik, dan mudah diuji.
 */

const STOPWORD = new Set(
  "yang dan di ke dari untuk pada dengan atau itu ini adalah akan agar saat bila jika juga serta dalam oleh ada tidak bisa dapat para sebagai apa bagaimana kapan mengapa siapa saya anda kita kami mereka lebih sudah belum masih harus perlu sebuah suatu karena sehingga namun tetapi lalu kemudian setelah sebelum sesudah terjadi dilakukan lakukan melakukan berada".split(" "),
);

/** Kata yang maknanya berubah bila dipotong ("bangunan" = gedung, "bangun" = membangun / terjaga). */
const TANPA_STEM = new Set(["bangunan"]);

/** Stem ringan bahasa Indonesia: cukup agar "mematikan", "dimatikan", dan "matikan" bertemu. */
export function stem(kata: string): string {
  if (TANPA_STEM.has(kata)) return kata;
  let k = kata;
  if (k.length > 5) k = k.replace(/(nya|lah|kah|pun)$/, "");
  if (k.length > 6) {
    k = k.replace(
      /^(?:(?:me|pe)(?:ng(?=[gkhaiueo])|ny(?=[aiueo])|m(?=[bpf])|n(?=[cdjtsz]))|me|pe|ber|ter|di|ke|se)/,
      "",
    );
  }
  if (k.length > 5) k = k.replace(/(kan|an|i)$/, "");
  return k;
}

export function tokenisasi(teks: string): string[] {
  return teks
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOPWORD.has(t))
    .map(stem)
    .filter((t) => t.length > 1);
}

const ALIAS_HAZARD: Record<string, string> = {
  banjir: "banjir genangan luapan air",
  longsor: "longsor tanah lereng tebing",
  gempa: "gempa guncangan bumi",
  cuaca_ekstrem: "cuaca ekstrem angin puting beliung petir hujan lebat",
  tsunami: "tsunami gelombang laut pantai",
  gunung_api: "gunung api letusan erupsi abu vulkanik",
  kekeringan: "kekeringan kemarau air bersih",
  karhutla: "kebakaran hutan lahan asap kabut",
  gelombang_abrasi: "gelombang tinggi abrasi pantai pesisir",
  umum: "tas siaga keluarga darurat",
};

/** Sinonim sisi kueri: warga menulis "rumah", panduan resmi menulis "bangunan". Indeks tidak diubah. */
const SINONIM: Record<string, string> = {
  rumah: "bangunan",
  kemarau: "kekeringan",
  asap: "udara masker",
  balita: "bayi anak",
  bayi: "balita",
  lansia: "orang tua",
  "kursi roda": "disabilitas",
};

export function perluasKueri(kueri: string): string {
  const s = kueri.toLowerCase();
  const tambah = Object.entries(SINONIM)
    .filter(([k]) => new RegExp(`\\b${k}\\b`).test(s))
    .map(([, v]) => v);
  return tambah.length ? `${kueri} ${tambah.join(" ")}` : kueri;
}

export interface HasilCari {
  chunk: Chunk;
  skor: number;
}

export class IndeksBm25 {
  private tf: Array<Map<string, number>> = [];
  private df = new Map<string, number>();
  private panjang: number[] = [];
  private rata = 0;

  constructor(
    private chunks: Chunk[],
    private k1 = 1.5,
    private b = 0.75,
  ) {
    for (const c of chunks) {
      // judul dihitung dua kali agar lebih berbobot
      const tokens = tokenisasi(`${c.title} ${c.title} ${c.body} ${ALIAS_HAZARD[c.hazard] ?? c.hazard}`);
      const m = new Map<string, number>();
      for (const t of tokens) m.set(t, (m.get(t) ?? 0) + 1);
      this.tf.push(m);
      this.panjang.push(tokens.length);
      for (const t of m.keys()) this.df.set(t, (this.df.get(t) ?? 0) + 1);
    }
    this.rata = this.panjang.reduce((a, b2) => a + b2, 0) / Math.max(1, this.panjang.length);
  }

  /**
   * Cari potongan; `saring` membatasi kandidat (hazard, fase, audience), `bobot` mengalikan skor
   * (mis. menaikkan fase yang ditanyakan). Skor 0 dibuang.
   */
  cari(
    kueri: string,
    { maks = 5, saring, bobot }: { maks?: number; saring?: (c: Chunk) => boolean; bobot?: (c: Chunk) => number } = {},
  ): HasilCari[] {
    const q = [...new Set(tokenisasi(perluasKueri(kueri)))];
    const N = this.chunks.length;
    const hasil: HasilCari[] = [];
    this.chunks.forEach((c, i) => {
      if (saring && !saring(c)) return;
      let skor = 0;
      for (const t of q) {
        const f = this.tf[i].get(t);
        if (!f) continue;
        const n = this.df.get(t) ?? 0;
        const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
        skor += (idf * f * (this.k1 + 1)) / (f + this.k1 * (1 - this.b + (this.b * this.panjang[i]) / (this.rata || 1)));
      }
      if (skor > 0) hasil.push({ chunk: c, skor: bobot ? skor * bobot(c) : skor });
    });
    // urutan stabil: skor turun, lalu urutan asli
    return hasil.sort((a, b2) => b2.skor - a.skor || this.chunks.indexOf(a.chunk) - this.chunks.indexOf(b2.chunk)).slice(0, maks);
  }
}

/**
 * Fase yang ditanyakan. Kata "saat", "sebelum", "setelah" adalah stopword sehingga tidak ikut dicocokkan BM25;
 * fungsi ini membaca maksud waktu pertanyaan agar potongan fase yang tepat diberi bobot lebih.
 */
export function faseDitanya(q: string): Chunk["phase"] | null {
  const s = q.toLowerCase();
  if (/\b(setelah|sesudah|usai|pasca|surut|reda|kembali ke rumah)\b/.test(s)) return "sesudah";
  if (/\b(saat|ketika|sedang|selama|tengah)\b/.test(s)) return "saat";
  if (/\b(sebelum|menyiapkan|siapkan|persiapan|mencegah|bersiap)\b/.test(s)) return "sebelum";
  return null;
}

const cache = new WeakMap<Chunk[], IndeksBm25>();
export function indeksUntuk(chunks: Chunk[]): IndeksBm25 {
  let ix = cache.get(chunks);
  if (!ix) {
    ix = new IndeksBm25(chunks);
    cache.set(chunks, ix);
  }
  return ix;
}
