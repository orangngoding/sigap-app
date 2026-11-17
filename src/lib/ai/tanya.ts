// Tanya Jawab berbasis sumber (Blueprint 8.3, 10.1, 13.3). Penolakan dan pengalihan darurat dilakukan KODE
// sebelum AI dipanggil agar konsisten, hemat kuota, dan kebal terhadap injeksi prompt.
import type { HazardId } from "@/types";
import type { Chunk } from "@/lib/kb/schema";
import { faseDitanya, indeksUntuk } from "@/lib/kb/search";
import { GalatProvider, type LlmProvider } from "./provider";
import { JawabanTanya } from "./schema";
import { BALASAN_TOLAK, adaKataTopik, bersihkanTeks, buangPenafian, klasifikasiPertanyaan, lolosPenyaring, type KategoriTolak } from "./guardrails";
import { SISTEM_TANYA, blokData } from "./prompts";
import { AnggaranHarian, anggaranGlobal } from "./runtime";

export interface SumberJawaban {
  id: string;
  judul: string;
  url: string;
}

export interface HasilTanya {
  mode: "ai" | "cadangan";
  jawaban: string;
  refused: boolean;
  kategori?: KategoriTolak;
  sumber: SumberJawaban[];
  /** true bila pengguna sebaiknya diarahkan ke Mode Darurat. */
  darurat?: boolean;
}

export interface DepsTanya {
  kb: Chunk[];
  providers: LlmProvider[];
  anggaran?: AnggaranHarian;
  batasWaktuMs?: number;
}

const AMBANG_SKOR = 1.2; // di bawah ini dianggap tidak ada panduan yang relevan
const MAKS_PASSAGE = 6;
const BOBOT_FASE = 1.6;

const tolak = (kategori: KategoriTolak): HasilTanya => ({
  mode: "cadangan",
  jawaban: BALASAN_TOLAK[kategori],
  refused: true,
  kategori,
  sumber: [],
  darurat: kategori === "darurat" ? true : undefined,
});

const ke = (c: Chunk): SumberJawaban => ({ id: c.id, judul: c.sourceTitle, url: c.sourceUrl });
const unik = (a: SumberJawaban[]) => a.filter((s, i) => a.findIndex((x) => x.id === s.id) === i);

export async function jawabPertanyaan(pertanyaan: string, bahaya: HazardId[] | undefined, d: DepsTanya): Promise<HasilTanya> {
  const k = klasifikasiPertanyaan(pertanyaan);
  if (k.kategori) return tolak(k.kategori);

  // Pertanyaan boleh menyangkut bahaya mana pun; `bahaya` hanya memberi bobot lewat kueri, bukan menyaring.
  // Fase yang ditanyakan ("saat gempa", "setelah banjir") diberi bobot; fase lain tetap bisa muncul.
  const fase = faseDitanya(pertanyaan);
  const hasil = indeksUntuk(d.kb)
    .cari(`${pertanyaan} ${(bahaya ?? []).join(" ")}`, { maks: MAKS_PASSAGE, bobot: fase ? (c) => (c.phase === fase ? BOBOT_FASE : 1) : undefined })
    .filter((r) => r.skor >= AMBANG_SKOR);

  if (hasil.length === 0) return tolak(adaKataTopik(pertanyaan) ? "tanpa_panduan" : "di_luar_topik");
  const passages = hasil.map((r) => r.chunk);

  // Cadangan: tampilkan potongan teratas apa adanya (Blueprint 13.3), tanpa narasi AI.
  const cadangan = (): HasilTanya => ({
    mode: "cadangan",
    jawaban: passages
      .slice(0, 2)
      .map((c) => `${c.title}. ${c.body}`)
      .join(" "),
    refused: false,
    sumber: unik(passages.slice(0, 2).map(ke)),
  });

  const anggaran = d.anggaran ?? anggaranGlobal;
  if (d.providers.length === 0 || !anggaran.pakai()) return cadangan();

  const user = [
    "Jawab pertanyaan warga memakai PASSAGE. Kutip id persis di sourceIds.",
    blokData("PERTANYAAN", pertanyaan),
    blokData("PASSAGE", passages.map((c) => `[${c.id}] (${c.hazard}; ${c.phase}) ${c.title}: ${c.body}`).join("\n")),
  ].join("\n\n");

  for (const p of d.providers) {
    try {
      const mentah = await p.hasilJson({ system: SISTEM_TANYA, user, suhu: 0.2, maksTokenKeluaran: 800, timeoutMs: d.batasWaktuMs ?? 15_000 });
      const v = JawabanTanya.safeParse(JSON.parse(mentah));
      if (!v.success) continue;
      const idOk = new Set(passages.map((c) => c.id));
      const src = v.data.sourceIds.filter((id) => idOk.has(id));
      const jawab = buangPenafian(bersihkanTeks(v.data.jawaban));
      if (v.data.refused || jawab.length < 10) return tolak("tanpa_panduan");
      if (src.length === 0 || !lolosPenyaring(jawab)) return cadangan(); // tanpa kutipan valid atau melanggar pagar
      return { mode: "ai", jawaban: jawab, refused: false, sumber: unik(passages.filter((c) => src.includes(c.id)).map(ke)) };
    } catch (e) {
      if (e instanceof GalatProvider || e instanceof SyntaxError) continue;
      throw e;
    }
  }
  return cadangan();
}
