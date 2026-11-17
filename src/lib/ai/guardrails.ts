// Pagar pengaman AI (Blueprint 10.5 dan 16.5). Murni kode, tanpa AI, dan diuji.

// ---------- Penyaring keluaran: tidak ada prediksi atau jaminan ----------
export const POLA_TERLARANG: RegExp[] = [
  /\bakan terjadi\b/i,
  /\bpasti (terjadi|aman|banjir|longsor|gempa|tsunami|selamat)\b/i,
  /\b(dijamin|terjamin)\b/i,
  /\btidak akan (terjadi|banjir|longsor|gempa|tsunami|meletus|ada bencana)\b/i,
  /\b(bebas|aman) (dari )?(banjir|longsor|gempa|tsunami|bencana)\b/i,
  /\b100 ?% aman\b/i,
  /\bakan (segera )?(banjir|longsor|meletus|datang tsunami)\b/i,
  /\bbencana (besar )?(akan|bakal) (datang|melanda|menimpa)\b/i,
];

export const lolosPenyaring = (teks: string): boolean => !POLA_TERLARANG.some((p) => p.test(teks));

/** Buang markup dan karakter kontrol dari keluaran model; hasil dirender sebagai teks biasa. */
export function bersihkanTeks(teks: string): string {
  return teks
    .replace(/<[^>]*>/g, " ")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .replace(/[*_`#>]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------- Balasan penolakan standar (Blueprint 16.5) ----------
export type KategoriTolak =
  | "prediksi"
  | "medis"
  | "di_luar_topik"
  | "lokasi_evakuasi"
  | "ubah_instruksi"
  | "tanpa_panduan"
  | "sara"
  | "darurat";

export const BALASAN_TOLAK: Record<KategoriTolak, string> = {
  prediksi:
    "SIGAP tidak dapat memprediksi kapan atau di mana bencana terjadi. Untuk informasi resmi, lihat BMKG atau BPBD setempat. Saya bisa bantu menyiapkan rencana siaga Anda.",
  medis:
    "Saya tidak dapat memberi saran medis atau dosis obat. Tanyakan kepada dokter atau tenaga kesehatan. Saya bisa bantu menyiapkan persediaan obat rutin di tas siaga.",
  di_luar_topik:
    "Pertanyaan ini di luar topik kesiapsiagaan bencana dan perubahan iklim. Coba tanyakan tentang tas siaga, langkah saat gempa, atau persiapan banjir.",
  lokasi_evakuasi:
    "SIGAP tidak menentukan lokasi evakuasi. Tanyakan titik kumpul resmi ke BPBD atau kelurahan setempat; Anda dapat mencatat titik kumpul keluarga di profil.",
  ubah_instruksi: "Saya hanya dapat menjawab pertanyaan kesiapsiagaan bencana berdasarkan sumber yang tersedia.",
  tanpa_panduan:
    "Saya belum menemukan panduan bersumber untuk pertanyaan ini. Coba ubah pertanyaan, atau lihat kanal resmi BNPB dan BMKG.",
  sara: "Saya tidak dapat membantu dengan permintaan ini.",
  darurat: "Jika ini keadaan darurat, hubungi 112 sekarang dan ikuti arahan petugas. Buka Mode Darurat untuk langkah singkat.",
};

// ---------- Klasifikasi pertanyaan sebelum memanggil AI ----------
const BENCANA = "banjir|gempa|longsor|tsunami|meletus|letusan|bencana|kebakaran|puting beliung|badai|kekeringan|karhutla";
const KONDISIONAL = /\b(jika|bila|apabila|kalau|ketika|saat|waktu)\b/i;

const RE = {
  ubahInstruksi: [
    /\b(abaikan|lupakan|hiraukan|ignore|disregard|forget)\b[^.?!]{0,60}\b(instruksi|perintah|aturan|petunjuk|instructions?|rules?|prompt)/i,
    /\b(system prompt|prompt sistem|instruksi sistem|developer mode|jailbreak|mode dewa)\b/i,
    /\b(kamu|anda|you)\s+(sekarang|adalah|are now)\b[^.?!]{0,40}\b(bebas|tanpa batas|unrestricted|dan|dan\b)/i,
    /\b(pura-?pura|bertindaklah|berperanlah|act as|pretend)\b/i,
    /\b(tampilkan|bocorkan|ungkapkan|reveal|show)\b[^.?!]{0,30}\b(prompt|instruksi|kunci api|api key)/i,
  ],
  sara: [/\b(bunuh diri|membunuh|pembunuhan|bom rakitan|merakit bom|teroris|pornografi|bokep|judi online|rasis)\b/i],
  medis: [
    /\b(dosis|takaran obat|resep (?:dokter|obat)|antibiotik|infus|diagnosis|diagnosa|overdosis)\b/i,
    /\b(minum|konsumsi|makan)\s+obat\s+(apa|berapa)\b/i,
    /\bobat\s+apa\b/i,
    /\bberapa\s+(mg|miligram|tablet|butir)\b/i,
    /\bcara\s+(mengobati|menyembuhkan|mendiagnosis)\b/i,
  ],
  lokasiEvakuasi: [
    /\b(di ?mana|ke ?mana)\b[^.?!]{0,30}\b(evakuasi|mengungsi|pengungsian|posko|titik kumpul resmi)\b/i,
    /\b(lokasi|tempat|titik|posko|jalur)\s+(evakuasi|pengungsian)\s+(terdekat|resmi|di|untuk|kelurahan|rumah)/i,
    /\b(evakuasi|pengungsian)\s+(terdekat|resmi)\b/i,
  ],
  darurat: [
    /\b(terjebak|tertimbun|tertimpa|terseret arus|hanyut|tenggelam)\b/i,
    new RegExp(`\\b(sedang|lagi|sekarang)\\b[^.?!]{0,25}\\b(${BENCANA})\\b`, "i"),
    /\b(tolong|help)\b[^.?!]{0,20}\b(sekarang|segera|cepat)\b/i,
  ],
  prediksiKuat: [
    /\b(prediksi|ramalan|memprediksi|meramal|ramalkan)\b/i,
    new RegExp(`\\bkapan\\b[^.?!]{0,40}\\b(${BENCANA}|terjadi)\\b`, "i"),
    new RegExp(`\\b(besok|lusa|nanti malam|minggu depan|bulan depan)\\b[^.?!]{0,30}\\b(${BENCANA})\\b`, "i"),
  ],
  prediksiAkan: [new RegExp(`\\b(apakah|akankah|apa)\\b[^.?!]{0,50}\\b(akan|bakal)\\b[^.?!]{0,40}\\b(${BENCANA}|terjadi)\\b`, "i")],
};

export type HasilKlasifikasi = { kategori: KategoriTolak | null };

/** Klasifikasi aturan: kategori bila harus ditolak/dialihkan tanpa AI; null bila boleh dilanjutkan. */
export function klasifikasiPertanyaan(q: string): HasilKlasifikasi {
  const s = q.normalize("NFKC");
  if (RE.ubahInstruksi.some((r) => r.test(s))) return { kategori: "ubah_instruksi" };
  if (RE.sara.some((r) => r.test(s))) return { kategori: "sara" };
  if (RE.darurat.some((r) => r.test(s)) && !KONDISIONAL.test(s)) return { kategori: "darurat" };
  if (RE.medis.some((r) => r.test(s))) return { kategori: "medis" };
  if (RE.lokasiEvakuasi.some((r) => r.test(s))) return { kategori: "lokasi_evakuasi" };
  if (RE.prediksiKuat.some((r) => r.test(s))) return { kategori: "prediksi" };
  if (RE.prediksiAkan.some((r) => r.test(s)) && !KONDISIONAL.test(s)) return { kategori: "prediksi" };
  return { kategori: null };
}

/** Kata kunci topik: dipakai membedakan "di luar topik" dari "tanpa panduan bersumber". */
const TOPIK =
  /\b(bencana|banjir|gempa|longsor|tsunami|gunung|letusan|kekeringan|karhutla|kebakaran|cuaca|hujan|angin|petir|badai|iklim|mitigasi|adaptasi|siaga|tas|evakuasi|darurat|pengungsi|mengungsi|bmkg|bnpb|bpbd|p3k|keluarga|lansia|balita|disabilitas|hamil|rumah|listrik|air bersih|sirine|peringatan|puting|beliung|abrasi|gelombang|asap)\b/i;
export const adaKataTopik = (q: string): boolean => TOPIK.test(q);

/** Jawab tindakan darurat dengan 112: dipakai ketika pertanyaan menggambarkan keadaan sedang berlangsung. */
export const BALASAN_DARURAT_TAUTAN = { href: "/darurat", label: "Buka Mode Darurat" } as const;
