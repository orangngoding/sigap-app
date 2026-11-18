// Asisten SIGAP (Tanya Jawab, Blueprint 8.3, 10.1, 13.3 yang diperluas).
//
// Alur hibrida:
//   1. Pagar kode lebih dulu (injeksi, SARA, darurat, medis, lokasi evakuasi, prediksi): konsisten, hemat kuota,
//      dan kebal terhadap injeksi prompt. Pertanyaan ini tidak pernah sampai ke model.
//   2. BM25 mencari panduan resmi di KB. Bila ada, model memakai dan mengutipnya (dasar "panduan").
//   3. Bila tidak ada panduan yang cocok (mis. "Apa itu BMKG?"), model menjawab dari pengetahuan umumnya
//      (dasar "umum") dan, bila grounding Google aktif, menyertakan halaman web sumbernya.
//   4. Keluaran divalidasi skema, kutipan karangan dibuang, kalimat ramalan/jaminan ditolak penyaring.
// Riwayat percakapan (maks 8 giliran) dikirim agar pertanyaan lanjutan dipahami.
// Konteks cerdas: bila pertanyaan menyangkut "sekarang" (cuaca, peringatan, aman keluar), kondisi BMKG terkini di
// lokasi pengguna ikut diberikan; ringkasan rencana keluarga (skor, butir belum dikerjakan) juga. Model boleh
// menyarankan aksi aplikasi, tetapi hanya dari daftar yang dibuat kode.
import type { HazardId } from "@/types";
import type { Chunk } from "@/lib/kb/schema";
import { faseDitanya, indeksUntuk } from "@/lib/kb/search";
import { HAZARD_BY_ID } from "@/lib/hazards/hazards";
import { GalatProvider, type GiliranChat, type HasilChat, type LlmProvider, type SumberWeb } from "./provider";
import { JawabanAsisten, type KonteksTanya, type LokasiTanya, type RingkasRencana } from "./schema";
import { aksiDarurat, aksiSah, teksDaftarAksi, type AksiAplikasi } from "@/lib/tanya/aksi";
import { BALASAN_TOLAK, bersihkanTeksChat, buangPenafian, klasifikasiPertanyaan, lolosPenyaring, type KategoriTolak } from "./guardrails";
import { SISTEM_ASISTEN, blokData } from "./prompts";
import { AnggaranHarian, CacheTtl, anggaranGlobal } from "./runtime";

export interface SumberJawaban {
  id: string;
  judul: string;
  url: string;
}

/** Dasar jawaban: panduan KB SIGAP, pengetahuan umum AI, atau keduanya. */
/** "peringatan": penjelasan teks peringatan resmi yang ditempel pengguna (dibuat di klien dari /api/terjemah). */
export type DasarJawaban = "panduan" | "umum" | "campuran" | "peringatan";

export interface HasilTanya {
  mode: "ai" | "cadangan";
  jawaban: string;
  refused: boolean;
  kategori?: KategoriTolak;
  /** Panduan resmi dari basis pengetahuan SIGAP yang dikutip. */
  sumber: SumberJawaban[];
  /** Halaman web dari pencarian Google (hanya bila grounding aktif). */
  sumberWeb: SumberWeb[];
  dasar?: DasarJawaban;
  /** Pertanyaan lanjutan yang disarankan (chip). */
  saran: string[];
  /** true bila pengguna sebaiknya diarahkan ke Mode Darurat. */
  darurat?: boolean;
  /** Tombol aksi aplikasi yang disarankan (divalidasi terhadap daftar SEMUA_AKSI). */
  aksi?: AksiAplikasi[];
  /** true bila jawaban memakai data BMKG terkini di lokasi pengguna. */
  kondisi?: boolean;
}

export interface DepsTanya {
  kb: Chunk[];
  providers: LlmProvider[];
  anggaran?: AnggaranHarian;
  cache?: CacheTtl<HasilTanya>;
  batasWaktuMs?: number;
  /** Ambil ringkasan kondisi BMKG terkini untuk lokasi (disediakan rute; null bila gagal). */
  kondisi?: (l: LokasiTanya) => Promise<string | null>;
}

export interface MasukanTanya {
  bahaya?: HazardId[];
  riwayat?: GiliranChat[];
  konteks?: KonteksTanya;
  rencana?: RingkasRencana;
  lokasi?: LokasiTanya;
}

/** Pertanyaan yang jawabannya bergantung pada kondisi saat ini (memakai data BMKG terkini bila lokasi ada). */
const POLA_KONDISI =
  /\b(hari ini|sekarang|saat ini|malam ini|nanti (malam|sore|siang)|sore ini|pagi ini|besok|lusa|minggu ini|cuaca|hujan|panas|gerah|angin|petir|badai|peringatan|waspada|aman(kah)?|bahaya(kah)?|keluar rumah|bepergian|berangkat|mudik|jemuran|gempa (tadi|barusan|terbaru|baru)|kondisi|situasi|prakiraan|bmkg)\b/i;
export const butuhKondisi = (q: string): boolean => POLA_KONDISI.test(q);

/** Ringkasan rencana keluarga yang aman dikirim ke model (tanpa identitas). */
export function teksRencana(r: RingkasRencana | undefined): string {
  if (!r) return "";
  const baris = [`Skor kesiapsiagaan: ${r.skor} dari 100 (${r.label})`];
  if (r.belumDikerjakan.length) baris.push(`Tindakan penting yang belum dikerjakan: ${r.belumDikerjakan.join("; ")}`);
  if (r.tasBelumSiap.length) baris.push(`Isi tas siaga yang belum siap: ${r.tasBelumSiap.join(", ")}`);
  if (r.tasKedaluwarsa.length) baris.push(`Isi tas yang sudah atau hampir kedaluwarsa: ${r.tasKedaluwarsa.join(", ")}`);
  if (r.latihanTotal) baris.push(`Latihan Siaga lulus: ${r.latihanLulus ?? 0} dari ${r.latihanTotal}`);
  return baris.join("\n");
}

const AMBANG_SKOR = 1.2; // di bawah ini passage dianggap tidak relevan
const MAKS_PASSAGE = 6;
const BOBOT_FASE = 1.6;
const MAKS_RIWAYAT = 8;
const MAKS_TEKS_RIWAYAT = 1200;

export const BALASAN_AI_TIDAK_TERSEDIA =
  "Asisten AI sedang tidak tersedia, dan belum ada panduan SIGAP yang cocok dengan pertanyaan ini. Coba lagi beberapa saat lagi, atau lihat kanal resmi BNPB dan BMKG.";

const SARAN_BAWAAN = ["Apa isi tas siaga keluarga?", "Apa yang dilakukan saat gempa?", "Bagaimana bersiap menghadapi banjir?"];

const tolak = (kategori: KategoriTolak): HasilTanya => ({
  mode: "cadangan",
  jawaban: BALASAN_TOLAK[kategori],
  refused: true,
  kategori,
  sumber: [],
  sumberWeb: [],
  saran: kategori === "darurat" ? [] : SARAN_BAWAAN,
  darurat: kategori === "darurat" ? true : undefined,
  aksi: kategori === "darurat" ? aksiDarurat() : [],
});

const ke = (c: Chunk): SumberJawaban => ({ id: c.id, judul: c.sourceTitle, url: c.sourceUrl });
const unik = (a: SumberJawaban[]) => a.filter((s, i) => a.findIndex((x) => x.id === s.id) === i);

/** Potong riwayat: 8 giliran terakhir, teks dipendekkan, dimulai dari giliran pengguna. */
export function rapikanRiwayat(riwayat: GiliranChat[] = []): GiliranChat[] {
  const r = riwayat.slice(-MAKS_RIWAYAT).map((g) => ({ peran: g.peran, teks: g.teks.slice(0, MAKS_TEKS_RIWAYAT) }));
  while (r.length && r[0].peran !== "pengguna") r.shift();
  return r;
}

/** Ringkasan konteks keluarga yang aman dikirim ke model (hanya atribut anonim). */
export function teksKonteks(k: KonteksTanya | undefined, bahaya: HazardId[] | undefined): string {
  const baris: string[] = [];
  if (k?.wilayah) baris.push(`Wilayah: ${k.wilayah}`);
  if (k?.jumlahAnggota) baris.push(`Jumlah anggota keluarga: ${k.jumlahAnggota}`);
  const rentan = [
    k?.lansia ? `${k.lansia} lansia` : "",
    k?.balita ? `${k.balita} balita` : "",
    k?.hamil ? `${k.hamil} ibu hamil/menyusui` : "",
    k?.disabilitas ? `${k.disabilitas} penyandang disabilitas` : "",
  ].filter(Boolean);
  if (rentan.length) baris.push(`Kelompok rentan: ${rentan.join(", ")}`);
  if (k?.bangunan) baris.push(`Tempat tinggal: ${k.bangunan.replace(/_/g, " ")}`);
  if (k?.hewanPeliharaan) baris.push("Memiliki hewan peliharaan");
  if (bahaya?.length) baris.push(`Bahaya yang dipilih keluarga: ${bahaya.map((b) => HAZARD_BY_ID[b]?.label ?? b).join(", ")}`);
  return baris.join("\n");
}

const kunciCache = (q: string, m: MasukanTanya, kondisi: string | null) =>
  JSON.stringify([q.toLowerCase().trim(), m.bahaya ?? [], rapikanRiwayat(m.riwayat).map((g) => g.teks), m.konteks ?? {}, m.rencana ?? null, kondisi]);

async function panggilModel(p: LlmProvider, system: string, user: string, riwayat: GiliranChat[], timeoutMs: number): Promise<HasilChat> {
  // Anggaran berpikir kecil: jawaban lebih runtut dan personal, tetap sekitar 3 detik pada model flash-lite.
  const req = { system, user, riwayat, suhu: 0.4, maksTokenKeluaran: 3000, anggaranPikir: 1024, timeoutMs };
  if (p.hasilChat) return p.hasilChat(req);
  return { teks: await p.hasilJson(req), sumberWeb: [] };
}

export async function jawabPertanyaan(pertanyaan: string, bahayaAtauMasukan: HazardId[] | MasukanTanya | undefined, d: DepsTanya): Promise<HasilTanya> {
  // Kompatibel dengan pemanggil lama: argumen kedua boleh berupa daftar bahaya saja.
  const m: MasukanTanya = Array.isArray(bahayaAtauMasukan) ? { bahaya: bahayaAtauMasukan } : (bahayaAtauMasukan ?? {});
  const k = klasifikasiPertanyaan(pertanyaan);
  if (k.kategori) return tolak(k.kategori);

  const riwayat = rapikanRiwayat(m.riwayat);
  // Kondisi BMKG terkini hanya diambil bila pertanyaan (atau pertanyaan sebelumnya) menyangkut keadaan sekarang.
  const sebelumnyaUntukKondisi = [...riwayat].reverse().find((g) => g.peran === "pengguna")?.teks ?? "";
  let kondisi: string | null = null;
  if (m.lokasi && d.kondisi && (butuhKondisi(pertanyaan) || butuhKondisi(sebelumnyaUntukKondisi))) {
    try {
      kondisi = await d.kondisi(m.lokasi);
    } catch {
      kondisi = null;
    }
  }
  const kunci = kunciCache(pertanyaan, m, kondisi);
  const dariCache = d.cache?.get(kunci);
  if (dariCache) return dariCache;

  // Pencarian memakai pertanyaan terbaru + pertanyaan pengguna sebelumnya agar "kalau untuk lansia?" tetap bertopik.
  const sebelumnya = [...riwayat].reverse().find((g) => g.peran === "pengguna")?.teks ?? "";
  const fase = faseDitanya(pertanyaan);
  const passages = indeksUntuk(d.kb)
    .cari(`${pertanyaan} ${pertanyaan} ${sebelumnya} ${(m.bahaya ?? []).join(" ")}`, {
      maks: MAKS_PASSAGE,
      bobot: fase ? (c) => (c.phase === fase ? BOBOT_FASE : 1) : undefined,
    })
    .filter((r) => r.skor >= AMBANG_SKOR)
    .map((r) => r.chunk);

  // Cadangan tanpa AI: kutip potongan teratas apa adanya (Blueprint 13.3) atau pesan jujur bila tidak ada.
  const cadangan = (): HasilTanya =>
    passages.length > 0
      ? {
          mode: "cadangan",
          jawaban: passages
            .slice(0, 2)
            .map((c) => `**${c.title}.** ${c.body}`)
            .join("\n\n"),
          refused: false,
          sumber: unik(passages.slice(0, 2).map(ke)),
          sumberWeb: [],
          dasar: "panduan",
          saran: SARAN_BAWAAN,
          aksi: [],
        }
      : { mode: "cadangan", jawaban: BALASAN_AI_TIDAK_TERSEDIA, refused: false, sumber: [], sumberWeb: [], saran: SARAN_BAWAAN, aksi: [] };

  const anggaran = d.anggaran ?? anggaranGlobal;
  if (d.providers.length === 0 || !anggaran.pakai()) return cadangan();

  const konteks = teksKonteks(m.konteks, m.bahaya);
  const rencana = teksRencana(m.rencana);
  const user = [
    passages.length
      ? "Jawab pertanyaan warga. Utamakan PASSAGE bila relevan dan kutip id persisnya di sourceIds."
      : "Tidak ada panduan SIGAP yang cocok. Jawab dari pengetahuanmu sendiri dengan sourceIds kosong.",
    blokData("PERTANYAAN", pertanyaan),
    konteks ? blokData("KONTEKS KELUARGA", konteks) : "",
    kondisi ? blokData("KONDISI TERKINI DI LOKASI PENGGUNA (BMKG)", kondisi) : "",
    rencana ? blokData("RENCANA KELUARGA", rencana) : "",
    blokData("AKSI", teksDaftarAksi()),
    passages.length ? blokData("PASSAGE", passages.map((c) => `[${c.id}] (${c.hazard}; ${c.phase}) ${c.title}: ${c.body}`).join("\n")) : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  for (const p of d.providers) {
    try {
      const { teks, sumberWeb } = await panggilModel(p, SISTEM_ASISTEN, user, riwayat, d.batasWaktuMs ?? 20_000);
      const v = JawabanAsisten.safeParse(JSON.parse(teks));
      if (!v.success) continue;
      if (v.data.refused) return tolak("sara");
      // Id passage hanya untuk sourceIds; bila model menuliskannya di teks ("[banjir-saat-002]"), dibuang.
      const jawab = buangPenafian(bersihkanTeksChat(v.data.jawaban).replace(/\s*[\[(][a-z_]+-(?:sebelum|saat|sesudah)-\d{3}[\])]/g, ""));
      if (jawab.length < 2) continue;
      if (!lolosPenyaring(jawab)) return cadangan(); // ramalan atau jaminan keselamatan: jangan tampilkan
      const idOk = new Set(passages.map((c) => c.id));
      const src = v.data.sourceIds.filter((id) => idOk.has(id)); // kutipan karangan dibuang, bukan dipercaya
      const sumber = unik(passages.filter((c) => src.includes(c.id)).map(ke));
      const dasar: DasarJawaban = sumber.length === 0 ? "umum" : sumberWeb.length > 0 ? "campuran" : "panduan";
      const saran = v.data.saranLanjutan.map((s) => bersihkanTeksChat(s).replace(/\*\*/g, "")).filter((s) => s.length >= 4 && lolosPenyaring(s)).slice(0, 3);
      const aksi = aksiSah(v.data.aksi);
      const hasil: HasilTanya = { mode: "ai", jawaban: jawab, refused: false, sumber, sumberWeb, dasar, saran, aksi, kondisi: Boolean(kondisi) };
      d.cache?.set(kunci, hasil);
      return hasil;
    } catch (e) {
      if (e instanceof GalatProvider || e instanceof SyntaxError) continue;
      throw e;
    }
  }
  return cadangan();
}

/** Cache jawaban di memori server: pertanyaan populer ("Apa itu BMKG?") tidak menghabiskan kuota berulang. */
export const cacheTanya = new CacheTtl<HasilTanya>(60 * 60_000, 300);
