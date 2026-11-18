// Briefing Siaga Hari Ini: data BMKG lokasi pengguna -> sinyal (kode) -> ringkasan + 3 tindakan (AI, divalidasi).
// Pagar: tingkat selalu dari kode; angka pada keluaran AI harus ada di data; kalimat ramalan/jaminan ditolak;
// gagal apa pun -> cadangan templat yang tetap memakai sinyal yang sama.
import type { HazardId, SumberData } from "@/types";
import type { Chunk } from "@/lib/kb/schema";
import { indeksUntuk } from "@/lib/kb/search";
import { HAZARD_BY_ID } from "@/lib/hazards/hazards";
import {
  dataTidakLengkap, hitungSinyal, ringkasanCadangan, tindakanCadangan, tingkatKeseluruhan,
  type DataBriefing, type KeluargaBriefing, type Sinyal, type Tingkat, type TindakanBriefing,
} from "@/lib/briefing/sinyal";
import { GalatProvider, type LlmProvider } from "./provider";
import { BriefingKeluaran } from "./schema";
import { bersihkanTeks, buangPenafian, lolosPenyaring } from "./guardrails";
import { SISTEM_BRIEFING, blokData } from "./prompts";
import { AnggaranHarian, CacheTtl, anggaranGlobal } from "./runtime";
import { angkaBaru, NOMOR_DARURAT_DIIZINKAN } from "./terjemah";
import { teksKonteks } from "./tanya";

export interface SumberBriefing extends SumberData {
  stale: boolean;
}

export interface HasilBriefing {
  mode: "ai" | "cadangan";
  tingkat: Tingkat;
  sinyal: Sinyal[];
  ringkasan: string;
  tindakan: TindakanBriefing[];
  /** Data yang gagal dibaca; ditampilkan apa adanya. */
  catatan: string[];
  sumber: SumberBriefing[];
  dibuatPada: string;
}

export interface WilayahBriefing {
  kelurahan?: string;
  kecamatan: string;
  kabKota: string;
  provinsi: string;
}

export interface DepsBriefing {
  kb: Chunk[];
  providers: LlmProvider[];
  anggaran?: AnggaranHarian;
  cache?: CacheTtl<HasilBriefing>;
  batasWaktuMs?: number;
  sekarang?: Date;
}

const MAKS_PASSAGE = 5;

function sumberDari(d: DataBriefing): SumberBriefing[] {
  return [d.cuaca, d.peringatan, d.gempa]
    .filter((x): x is NonNullable<typeof x> => Boolean(x))
    .map((x) => ({ ...x.sumber, stale: x.stale }));
}

/** Passage KB untuk bahaya yang muncul di sinyal (plus bahaya pilihan keluarga), fase sebelum/saat. */
function passageUntuk(kb: Chunk[], sinyal: Sinyal[], bahaya: HazardId[] = []): Chunk[] {
  // Bahaya dari sinyal (urut tingkat) lebih dulu, lalu bahaya pilihan keluarga.
  const target = [...new Set([...sinyal.map((s) => s.bahaya), ...bahaya])]
    .filter((b): b is HazardId => b !== "umum")
    .slice(0, 3);
  const kueri = target.length
    ? target.map((b) => `${HAZARD_BY_ID[b]?.label ?? b} persiapan keluarga`).join(" ")
    : "tas siaga persiapan keluarga rencana darurat";
  return indeksUntuk(kb)
    .cari(kueri, { maks: MAKS_PASSAGE * 2 })
    .map((r) => r.chunk)
    .filter((c) => c.phase !== "sesudah")
    .slice(0, MAKS_PASSAGE);
}

const kunciCache = (w: WilayahBriefing, k: KeluargaBriefing, sinyal: Sinyal[], catatan: string[]) =>
  JSON.stringify([w, k, sinyal.map((s) => `${s.jenis}|${s.fakta}`), catatan.length]);

export async function susunBriefing(data: DataBriefing, wilayah: WilayahBriefing, keluarga: KeluargaBriefing, d: DepsBriefing): Promise<HasilBriefing> {
  const now = d.sekarang ?? new Date();
  const sinyal = hitungSinyal(data, now);
  const tingkat = tingkatKeseluruhan(sinyal);
  const catatan = dataTidakLengkap(data);
  const dasar = { tingkat, sinyal, catatan, sumber: sumberDari(data), dibuatPada: now.toISOString() };
  const peringatanTerbaca = Boolean(data.peringatan?.tersedia);
  const cadangan = (): HasilBriefing => ({
    ...dasar,
    mode: "cadangan",
    ringkasan: ringkasanCadangan(sinyal, tingkat, peringatanTerbaca),
    tindakan: tindakanCadangan(sinyal, keluarga),
  });

  const kunci = kunciCache(wilayah, keluarga, sinyal, catatan);
  const dariCache = d.cache?.get(kunci);
  if (dariCache) return dariCache;

  const anggaran = d.anggaran ?? anggaranGlobal;
  if (d.providers.length === 0 || !anggaran.pakai()) return cadangan();

  const passages = passageUntuk(d.kb, sinyal, keluarga.bahaya);
  // Usulan dari kode (sinyal + kebutuhan keluarga) menjadi jangkar agar tindakan AI tetap relevan dengan hari ini.
  const usulan = tindakanCadangan(sinyal, keluarga);
  const teksSinyal = sinyal.length
    ? sinyal.map((s) => `- [${s.tingkat}] ${s.judul}: ${s.fakta}`).join("\n")
    : "- Tidak ada sinyal dari data yang terbaca.";
  const wil = [wilayah.kelurahan, wilayah.kecamatan, wilayah.kabKota, wilayah.provinsi].filter(Boolean).join(", ");
  const konteks = teksKonteks(keluarga, keluarga.bahaya);
  const teksPassage = passages.map((c) => `[${c.id}] (${c.hazard}; ${c.phase}) ${c.title}: ${c.body}`).join("\n");
  const user = [
    "Tulis Briefing Siaga Hari Ini untuk keluarga ini.",
    blokData("WILAYAH", wil),
    blokData("TINGKAT", tingkat),
    blokData("SINYAL", teksSinyal),
    catatan.length ? blokData("CATATAN DATA", catatan.join("\n")) : "",
    konteks ? blokData("KONTEKS KELUARGA", konteks) : "",
    blokData("USULAN TINDAKAN", usulan.map((t, i) => `${i + 1}. ${t.judul}: ${t.alasan}`).join("\n")),
    passages.length ? blokData("PASSAGE", teksPassage) : "",
  ].filter(Boolean).join("\n\n");

  // Angka yang sah: dari sinyal, konteks keluarga, usulan, passage, dan nomor darurat nasional.
  const sumberAngka = `${teksSinyal}\n${konteks}\n${teksPassage}\n${usulan.map((t) => t.alasan).join("\n")}`;

  for (const p of d.providers) {
    try {
      const mentah = await p.hasilJson({ system: SISTEM_BRIEFING, user, suhu: 0.3, maksTokenKeluaran: 900, timeoutMs: d.batasWaktuMs ?? 15_000 });
      const v = BriefingKeluaran.safeParse(JSON.parse(mentah));
      if (!v.success) continue;
      const ringkasan = buangPenafian(bersihkanTeks(v.data.ringkasan));
      const tindakanAi = v.data.tindakan.slice(0, 3).map((t) => ({ judul: bersihkanTeks(t.judul), alasan: bersihkanTeks(t.alasan) }));
      if (ringkasan.length < 10 || tindakanAi.some((t) => t.judul.length < 3 || t.alasan.length < 5)) continue;
      const semua = [ringkasan, ...tindakanAi.flatMap((t) => [t.judul, t.alasan])].join(" ");
      if (!lolosPenyaring(semua) || angkaBaru(sumberAngka, semua, NOMOR_DARURAT_DIIZINKAN)) {
        // Ditolak penyaring: simpan cadangan agar data yang sama tidak memanggil model berulang kali.
        const c = cadangan();
        d.cache?.set(kunci, c);
        return c;
      }
      // Tautan bantu dipasang dari topik judul (mis. tas siaga -> /rencana) atau dari usulan yang sama persis.
      const tindakan = tindakanAi.map((t) => ({ ...t, tautan: tautanUntuk(t.judul) ?? usulan.find((u) => u.judul === t.judul)?.tautan }));
      const hasil: HasilBriefing = { ...dasar, mode: "ai", ringkasan, tindakan };
      d.cache?.set(kunci, hasil);
      return hasil;
    } catch (e) {
      if (e instanceof GalatProvider || e instanceof SyntaxError) continue;
      throw e;
    }
  }
  return cadangan();
}

/** Tautan internal yang cocok dengan isi tindakan, agar setiap tindakan bisa langsung dikerjakan. */
export function tautanUntuk(judul: string): TindakanBriefing["tautan"] | undefined {
  const j = judul.toLowerCase();
  if (/tas siaga|perlengkapan|persediaan/.test(j)) return { href: "/rencana", label: "Buka rencana" };
  if (/kartu|nomor (darurat|penting)|kontak/.test(j)) return { href: "/rencana/kartu", label: "Kartu Siaga" };
  if (/peringatan/.test(j)) return { href: "https://www.bmkg.go.id/peringatan-dini", label: "Peringatan BMKG" };
  if (/gempa|tsunami|evakuasi|darurat/.test(j)) return { href: "/darurat", label: "Mode Darurat" };
  return undefined;
}

export const cacheBriefing = new CacheTtl<HasilBriefing>(20 * 60_000, 300);
