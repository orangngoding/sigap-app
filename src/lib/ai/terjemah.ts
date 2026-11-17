// Terjemah Peringatan (Blueprint 8.3, 10.1, 13.3): AI hanya menyederhanakan teks resmi.
import { GalatProvider, type LlmProvider } from "./provider";
import { TerjemahPeringatan } from "./schema";
import { bersihkanTeks, buangPenafian, klasifikasiPertanyaan, lolosPenyaringKutipan } from "./guardrails";
import { SISTEM_TERJEMAH, blokData } from "./prompts";
import { AnggaranHarian, anggaranGlobal } from "./runtime";
import kontak from "@/generated/kontak.json";

export interface HasilTerjemah {
  mode: "ai" | "cadangan";
  penjelasan: string;
  tindakan: string[];
  tautanResmi: string;
}

export const TAUTAN_PERINGATAN = "https://www.bmkg.go.id/peringatan-dini";

export const CADANGAN_TERJEMAH: Omit<HasilTerjemah, "mode"> = {
  penjelasan:
    "Penjelasan otomatis belum tersedia. Yang berlaku adalah teks resmi di samping. Baca sampai selesai dan periksa kanal resmi BMKG serta arahan BPBD setempat.",
  tindakan: [
    "Baca teks peringatan resmi sampai selesai dan perhatikan wilayah serta waktu yang disebut.",
    "Pantau informasi terbaru dari BMKG dan arahan BPBD atau kelurahan setempat.",
    "Periksa tas siaga dan jalur keluar rumah, lalu beri tahu seluruh anggota keluarga.",
  ],
  tautanResmi: TAUTAN_PERINGATAN,
};

export interface DepsTerjemah {
  providers: LlmProvider[];
  anggaran?: AnggaranHarian;
  batasWaktuMs?: number;
}

/** Nomor darurat nasional yang juga tampil di aplikasi dan Kartu Siaga; boleh disebut walau tidak ada di teks. */
export const NOMOR_DARURAT_DIIZINKAN: readonly string[] = kontak.kontak.map((k) => k.nomor);

/** Angka, jam, dan tanggal pada keluaran harus ada di teks sumber: AI tidak boleh menambah fakta baru. */
export function angkaBaru(sumber: string, keluaran: string, diizinkan: readonly string[] = NOMOR_DARURAT_DIIZINKAN): boolean {
  const ambil = (s: string) => new Set((s.match(/\d+(?:[.,:]\d+)*/g) ?? []).map((x) => x.replace(/^0+(?=\d)/, "")));
  const asal = ambil(sumber);
  for (const n of diizinkan) asal.add(n);
  for (const a of ambil(keluaran)) if (!asal.has(a)) return true;
  return false;
}

export async function terjemahkanPeringatan(
  teks: string,
  profil: { lansia?: number; balita?: number; hamil?: number; disabilitas?: number } | undefined,
  d: DepsTerjemah,
): Promise<HasilTerjemah> {
  const cadangan = (): HasilTerjemah => ({ mode: "cadangan", ...CADANGAN_TERJEMAH });
  const anggaran = d.anggaran ?? anggaranGlobal;
  // Teks yang mencoba mengubah instruksi tidak dikirim ke model sama sekali.
  if (klasifikasiPertanyaan(teks).kategori === "ubah_instruksi") return cadangan();
  if (d.providers.length === 0 || !anggaran.pakai()) return cadangan();

  const user = [
    "Sederhanakan teks peringatan resmi berikut untuk keluarga awam. Jangan menambah fakta.",
    blokData("TEKS PERINGATAN", teks),
    blokData("PROFIL KELUARGA", JSON.stringify(profil ?? {})),
  ].join("\n\n");

  for (const p of d.providers) {
    try {
      const mentah = await p.hasilJson({ system: SISTEM_TERJEMAH, user, suhu: 0.2, maksTokenKeluaran: 900, timeoutMs: d.batasWaktuMs ?? 15_000 });
      const json = JSON.parse(mentah) as { tindakan?: unknown };
      // Satu tindakan yang kepanjangan cukup dibuang, tidak perlu menggagalkan seluruh jawaban (minimal 3 tetap dicek skema).
      if (Array.isArray(json?.tindakan)) json.tindakan = json.tindakan.filter((t) => typeof t !== "string" || t.length <= 160);
      const v = TerjemahPeringatan.safeParse(json);
      if (!v.success) continue;
      const penjelasan = buangPenafian(bersihkanTeks(v.data.penjelasan));
      const tindakan = v.data.tindakan.map(bersihkanTeks).filter((t) => t.length > 0);
      const semua = [penjelasan, ...tindakan].join(" ");
      if (penjelasan.length < 10 || tindakan.length < 3) continue;
      // Kalimat resmi BMKG memakai "akan terjadi"; mengulangnya apa adanya boleh, menambah klaim sendiri tidak.
      if (!lolosPenyaringKutipan(semua, teks) || angkaBaru(teks, semua)) return cadangan();
      return { mode: "ai", penjelasan, tindakan: tindakan.slice(0, 5), tautanResmi: TAUTAN_PERINGATAN };
    } catch (e) {
      if (e instanceof GalatProvider || e instanceof SyntaxError) continue;
      throw e;
    }
  }
  return cadangan();
}
