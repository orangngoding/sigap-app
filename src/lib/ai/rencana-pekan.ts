// Siaga Iklim "Minggu ini": sinyal prakiraan (dihitung KODE di lib/iklim/pekan.ts) -> rencana 7 hari keluarga (AI).
// Pagar: angka dan tanggal harus ada di teks sinyal atau konteks; tanpa rupiah; tanpa kalimat ramalan pasti;
// gagal apa pun -> rencana cadangan dari kode (tindakan pertama tiap sinyal, diurutkan menurut tanggal).
import type { HazardId } from "@/types";
import type { KonteksTanya } from "./schema";
import { namaTanggal, tanggalWib, teksPekan, type SiagaPekanResponse } from "@/lib/iklim/pekan";
import { GalatProvider, type LlmProvider } from "./provider";
import { RencanaPekanKeluaran, type RencanaPekanKeluaranT } from "./schema";
import { bersihkanTeks, buangPenafian, lolosPenyaring, rapikanKapital } from "./guardrails";
import { SISTEM_RENCANA_PEKAN, blokData } from "./prompts";
import { AnggaranHarian, CacheTtl, anggaranGlobal } from "./runtime";
import { angkaBaru, NOMOR_DARURAT_DIIZINKAN } from "./terjemah";
import { teksKonteks } from "./tanya";

export interface HasilRencanaPekan extends RencanaPekanKeluaranT {
  /** "tenang": tidak ada sinyal dalam 7 hari, jadi AI sengaja tidak dipanggil (rencana singkat dari kode). */
  mode: "ai" | "cadangan" | "tenang";
  dibuatPada: string;
}

/** Bahaya profil yang terkait cuaca mingguan. Gempa, tsunami, dan gunung api tidak dipengaruhi prakiraan cuaca, jadi tidak dikirim ke AI. */
export const BAHAYA_CUACA: readonly HazardId[] = ["banjir", "longsor", "cuaca_ekstrem", "kekeringan", "karhutla", "gelombang_abrasi"];
/** Bahaya non-cuaca yang tidak boleh muncul di rencana cuaca mingguan. */
export const POLA_NON_CUACA = /\b(gempa|tsunami|gunung\s*api|erupsi|letusan|vulkan\w*)\b/i;

/** Ada sinyal cuaca dalam 7 hari ke depan? */
export function adaSinyal7Hari(s: SiagaPekanResponse, hariIni: string): boolean {
  return s.sinyal.some((x) => x.tanggal.some((t) => (Date.parse(t) - Date.parse(hariIni)) / 86_400_000 < 7));
}

export interface DepsRencanaPekan {
  providers: LlmProvider[];
  anggaran?: AnggaranHarian;
  cache?: CacheTtl<HasilRencanaPekan>;
  batasWaktuMs?: number;
  sekarang?: Date;
}

/** "Hari ini", "Besok", atau "Sabtu 21 Nov" dari tanggal sinyal. */
export function labelKapan(tanggal: string, hariIni: string): string {
  const selisih = Math.round((Date.parse(tanggal) - Date.parse(hariIni)) / 86_400_000);
  return selisih <= 0 ? "Hari ini" : selisih === 1 ? "Besok" : namaTanggal(tanggal);
}

/** "Kamis 19 Nov" yang ternyata hari ini atau besok ditulis ulang menjadi "Hari ini" / "Besok". */
export function kapanRamah(kapan: string, hariIni: string): string {
  const besok = new Date(Date.parse(hariIni) + 86_400_000).toISOString().slice(0, 10);
  if (kapan.toLowerCase() === namaTanggal(hariIni).toLowerCase()) return "Hari ini";
  if (kapan.toLowerCase() === namaTanggal(besok).toLowerCase()) return "Besok";
  return kapan;
}

/** Rencana tanpa AI: satu tindakan utama per sinyal (paling dekat dulu), lalu persiapan umum bila sinyal sedikit. */
export function rencanaPekanCadangan(s: SiagaPekanResponse, k: KonteksTanya = {}, now = new Date()): RencanaPekanKeluaranT {
  const hariIni = tanggalWib(now);
  const rentan = (k.lansia ?? 0) + (k.balita ?? 0) + (k.hamil ?? 0) > 0;
  const dalam7 = s.sinyal
    .map((x) => ({ x, t: x.tanggal.find((t) => (Date.parse(t) - Date.parse(hariIni)) / 86_400_000 < 7) }))
    .filter((v): v is { x: (typeof s.sinyal)[number]; t: string } => Boolean(v.t))
    .sort((a, b) => a.t.localeCompare(b.t));

  const langkah: RencanaPekanKeluaranT["langkah"] = dalam7.slice(0, 4).map(({ x, t }) => ({
    kapan: labelKapan(t, hariIni),
    tindakan: x.tindakan[x.jenis === "panas" && rentan ? 1 : 0],
    alasan: x.fakta,
  }));
  if (langkah.length < 3)
    langkah.push({ kapan: "Minggu ini", tindakan: "Periksa isi tas siaga: air minum, senter, obat rutin, dan salinan dokumen.", alasan: "Persiapan ringan saat cuaca tenang membuat keluarga lebih cepat bertindak bila cuaca berubah." });
  if (langkah.length < 3)
    langkah.push({ kapan: "Minggu ini", tindakan: "Simpan nomor darurat 112 dan nomor BPBD setempat di ponsel semua anggota keluarga.", alasan: "Saat keadaan mendesak, tidak ada waktu mencari nomor." });

  const utama = dalam7[0]?.x;
  const ringkasan = utama
    ? `Hal terpenting minggu ini: ${utama.judul.toLowerCase()} (${labelKapan(dalam7[0].t, hariIni).toLowerCase()}). Rencana ini disusun dari prakiraan model cuaca, bukan peringatan resmi; tetap pantau BMKG.`
    : "Tidak ada sinyal cuaca menonjol dalam 7 hari ke depan, jadi cukup dua persiapan ringan. Ini dari prakiraan model cuaca, bukan peringatan resmi; tetap pantau BMKG.";
  return { ringkasan, langkah: (utama ? langkah : langkah.slice(0, 2)).slice(0, 5) };
}

const kunciCache = (s: SiagaPekanResponse, k: KonteksTanya, hariIni: string) => JSON.stringify([s.grid, hariIni, s.sinyal.map((x) => [x.jenis, x.tingkat, x.tanggal]), k]);

export async function susunRencanaPekan(
  s: SiagaPekanResponse,
  wilayah: { kabKota: string; provinsi: string },
  k: KonteksTanya,
  d: DepsRencanaPekan & { bahaya?: HazardId[] },
): Promise<HasilRencanaPekan> {
  const now = d.sekarang ?? new Date();
  const hariIni = tanggalWib(now);
  const cadangan = (): HasilRencanaPekan => ({ ...rencanaPekanCadangan(s, k, now), mode: "cadangan", dibuatPada: now.toISOString() });
  const kunci = kunciCache(s, k, hariIni);
  const ada = d.cache?.get(kunci);
  if (ada) return ada;

  // Minggu tenang: AI tidak perlu dipanggil. Rencana singkat dari kode lebih jujur daripada paragraf panjang yang umum.
  if (!adaSinyal7Hari(s, hariIni)) return { ...rencanaPekanCadangan(s, k, now), mode: "tenang", dibuatPada: now.toISOString() };

  const anggaran = d.anggaran ?? anggaranGlobal;
  if (d.providers.length === 0 || !anggaran.pakai()) return cadangan();

  const sinyal = teksPekan(s, hariIni);
  const bahayaCuaca = d.bahaya?.filter((b) => BAHAYA_CUACA.includes(b));
  const konteks = teksKonteks(k, bahayaCuaca?.length ? bahayaCuaca : undefined);
  const user = [
    "Susun rencana 7 hari ke depan untuk keluarga ini.",
    blokData("WILAYAH", `${wilayah.kabKota}, ${wilayah.provinsi}`),
    blokData("SINYAL", sinyal),
    konteks ? blokData("KONTEKS KELUARGA", konteks) : "",
  ].filter(Boolean).join("\n\n");
  // Angka yang sah: sinyal, konteks, dan teks tindakan bawaan kode (mis. masker N95/KN95, pukul 10.00-16.00).
  const sumberAngka = `${sinyal}\n${konteks}\n${s.sinyal.flatMap((x) => x.tindakan).join("\n")}\nN95 KN95`;

  // Tiap penyedia diberi dua kesempatan: keluaran yang ditolak pagar (angka di luar data, skema) sesekali terjadi.
  const percobaan = d.providers.flatMap((p) => [p, p]);
  for (const prov of percobaan) {
    try {
      const mentah = await prov.hasilJson({ system: SISTEM_RENCANA_PEKAN, user, suhu: 0.3, maksTokenKeluaran: 2000, anggaranPikir: 512, timeoutMs: d.batasWaktuMs ?? 20_000 });
      const v = RencanaPekanKeluaran.safeParse(JSON.parse(mentah));
      if (!v.success) continue;
      const bersih: RencanaPekanKeluaranT = {
        ringkasan: rapikanKapital(buangPenafian(bersihkanTeks(v.data.ringkasan))),
        langkah: v.data.langkah.slice(0, 5).map((x) => ({
          kapan: kapanRamah(bersihkanTeks(x.kapan), hariIni),
          tindakan: rapikanKapital(bersihkanTeks(x.tindakan)),
          alasan: rapikanKapital(bersihkanTeks(x.alasan)),
        })),
      };
      const semua = [bersih.ringkasan, ...bersih.langkah.flatMap((x) => [x.kapan, x.tindakan, x.alasan])].join(" ");
      // Rupiah, ramalan pasti, atau angka di luar data: coba lagi; cadangan tidak di-cache agar AI dicoba lagi nanti.
      // Bahaya non-cuaca (gempa, gunung api) tidak relevan untuk prakiraan mingguan: tolak, kecuali memang ada di data.
      if (POLA_NON_CUACA.test(semua) && !POLA_NON_CUACA.test(sinyal)) continue;
      if (/\brp\.?\s*\d|rupiah/i.test(semua) || !lolosPenyaring(semua) || angkaBaru(sumberAngka, semua, NOMOR_DARURAT_DIIZINKAN)) continue;
      const hasil: HasilRencanaPekan = { ...bersih, mode: "ai", dibuatPada: now.toISOString() };
      d.cache?.set(kunci, hasil);
      return hasil;
    } catch (e) {
      if (e instanceof GalatProvider || e instanceof SyntaxError) continue;
      throw e;
    }
  }
  return cadangan();
}

export const cacheRencanaPekan = new CacheTtl<HasilRencanaPekan>(3 * 3_600_000, 300);
