// Mesin Waktu Iklim: metrik proyeksi (dihitung kode) -> rencana adaptasi keluarga (AI, divalidasi).
// Pagar: angka pada keluaran harus ada di data proyeksi atau konteks; tanpa rupiah; kalimat ramalan pasti ditolak;
// gagal apa pun -> cadangan templat dari aturan berbasis besarnya perubahan.
import type { HazardId } from "@/types";
import type { ProyeksiResponse } from "@/lib/data/proyeksi";
import type { KeluargaBriefing } from "@/lib/briefing/sinyal";
import { GalatProvider, type LlmProvider } from "./provider";
import { AdaptasiKeluaran, type AdaptasiKeluaranT } from "./schema";
import { bersihkanTeks, buangPenafian, lolosPenyaring } from "./guardrails";
import { SISTEM_ADAPTASI, blokData } from "./prompts";
import { AnggaranHarian, CacheTtl, anggaranGlobal } from "./runtime";
import { angkaBaru, NOMOR_DARURAT_DIIZINKAN } from "./terjemah";
import { teksKonteks } from "./tanya";

export type LangkahAdaptasi = AdaptasiKeluaranT["langkah"][number];
export interface HasilAdaptasi extends AdaptasiKeluaranT {
  mode: "ai" | "cadangan";
  dibuatPada: string;
}

export interface DepsAdaptasi {
  providers: LlmProvider[];
  anggaran?: AnggaranHarian;
  cache?: CacheTtl<HasilAdaptasi>;
  batasWaktuMs?: number;
  sekarang?: Date;
}

const fmt = (v: number) => String(v).replace(".", ",");
const tanda = (v: number) => (v > 0 ? `+${fmt(v)}` : fmt(v));

/** Teks metrik proyeksi untuk prompt; juga satu-satunya sumber angka yang sah bagi keluaran AI. */
export function teksProyeksi(p: ProyeksiResponse): string {
  const [dulu, kini, depan] = p.periode;
  const baris = (label: string, k: keyof (typeof dulu)["metrik"], satuan: string) =>
    `- ${label}: ${dulu.label} ${fmt(dulu.metrik[k].rata)}${satuan}; ${kini.label} ${fmt(kini.metrik[k].rata)}${satuan}; ${depan.label} ${fmt(depan.metrik[k].rata)}${satuan} (rentang model ${fmt(depan.metrik[k].min)}-${fmt(depan.metrik[k].maks)}); perubahan ${tanda(p.perubahan[k])}${satuan}`;
  return [
    `Periode: ${dulu.label} = ${dulu.awal}-${dulu.akhir}, ${kini.label} = ${kini.awal}-${kini.akhir}, ${depan.label} = ${depan.awal}-${depan.akhir}.`,
    baris("Rata-rata suhu maksimum harian", "suhuMaksRata", "°C"),
    baris(`Hari sangat panas per tahun (di atas ${fmt(p.ambang.sangatPanasC)}°C, terpanas 5% di masa lalu)`, "hariSangatPanas", " hari"),
    baris(`Hari dengan suhu ${p.ambang.panasC}°C atau lebih per tahun`, "hariPanas", " hari"),
    baris("Curah hujan tahunan", "hujanTahunan", " mm"),
    baris(`Hari hujan ekstrem per tahun (di atas ${p.ambang.hujanEkstremMm} mm/hari)`, "hariHujanEkstrem", " hari"),
    baris("Musim kering terpanjang per tahun (hari berturut-turut tanpa hujan)", "keringTerpanjang", " hari"),
    `Model: ${p.model.join("; ")}. ${p.catatan}`,
  ].join("\n");
}

// ---------- Cadangan tanpa AI ----------
export function adaptasiCadangan(p: ProyeksiResponse, k: KeluargaBriefing = {}): AdaptasiKeluaranT {
  const ch = p.perubahan;
  const depan = p.periode[2].metrik;
  const dulu = p.periode[0].metrik;
  const rentan = (k.lansia ?? 0) + (k.balita ?? 0) + (k.hamil ?? 0) > 0;
  const lebihPanas = ch.hariSangatPanas >= 5 || ch.suhuMaksRata >= 0.5;
  const lebihKering = ch.hujanTahunan <= -50 || ch.keringTerpanjang >= 2;
  const lebihBasah = ch.hariHujanEkstrem >= 0.5 || ch.hujanTahunan >= 50;

  const dampak: AdaptasiKeluaranT["dampak"] = [];
  if (lebihPanas)
    dampak.push({
      judul: "Hari sangat panas makin sering",
      isi: `Hari sangat panas diproyeksikan dari sekitar ${fmt(dulu.hariSangatPanas.rata)} menjadi ${fmt(depan.hariSangatPanas.rata)} hari per tahun.${rentan ? " Lansia, balita, dan ibu hamil paling rentan terhadap panas." : ""}`,
    });
  if (lebihKering)
    dampak.push({ judul: "Air bisa lebih sulit di musim kemarau", isi: `Curah hujan tahunan cenderung berubah ${tanda(ch.hujanTahunan)} mm, sehingga cadangan air rumah tangga makin penting.` });
  if (lebihBasah)
    dampak.push({ judul: "Hujan ekstrem dan genangan", isi: `Hari hujan ekstrem cenderung berubah ${tanda(ch.hariHujanEkstrem)} hari per tahun; saluran yang tersumbat mudah meluap.` });
  if (dampak.length < 2)
    dampak.push({ judul: "Iklim berubah perlahan", isi: `Rata-rata suhu maksimum diproyeksikan berubah ${tanda(ch.suhuMaksRata)}°C; persiapan bertahap lebih ringan daripada mendadak.` });
  if (dampak.length < 2)
    dampak.push({ judul: "Cuaca ekstrem tetap mungkin", isi: "Walau rata-rata berubah sedikit, kejadian ekstrem tetap bisa terjadi. Rencana siaga keluarga tetap perlu diperbarui." });

  const langkah: LangkahAdaptasi[] = [];
  if (lebihPanas) {
    langkah.push({ kategori: "kesehatan", judul: "Atur jadwal aktivitas saat siang terik", alasan: `Hindari aktivitas berat di luar pada siang hari, sediakan air minum, dan pantau ${rentan ? "lansia dan balita" : "anggota keluarga"} saat panas.`, kapan: "sekarang", biaya: "rendah" });
    langkah.push({ kategori: "rumah", judul: "Buat rumah lebih sejuk tanpa banyak listrik", alasan: "Ventilasi silang, peneduh jendela, tanaman, dan atap berwarna terang menurunkan panas di dalam rumah.", kapan: "1-5 tahun", biaya: "sedang" });
  }
  if (lebihKering || !lebihBasah)
    langkah.push({ kategori: "air", judul: "Tampung dan hemat air hujan", alasan: "Wadah penampung air hujan dan kebiasaan hemat air membantu saat kemarau lebih panjang.", kapan: "1-5 tahun", biaya: "sedang" });
  if (lebihBasah || !lebihKering)
    langkah.push({ kategori: "rumah", judul: "Buat lubang biopori dan rawat saluran air", alasan: "Biopori dan saluran bersih membantu air hujan meresap dan mengurangi genangan saat hujan ekstrem.", kapan: "sekarang", biaya: "rendah" });
  langkah.push({ kategori: "ekonomi", judul: "Sisihkan dana darurat iklim keluarga", alasan: "Tabungan kecil rutin membantu saat harga air, listrik, atau pangan naik ketika cuaca ekstrem.", kapan: "jangka panjang", biaya: "rendah" });
  langkah.push({ kategori: "komunitas", judul: "Tanam pohon peneduh bersama warga", alasan: "Pohon di lingkungan menurunkan suhu sekitar dan membantu resapan air; ajak RT atau RW.", kapan: "jangka panjang", biaya: "rendah" });

  const ringkasan = `Menurut proyeksi model iklim untuk wilayah ini, rata-rata suhu maksimum menuju 2050 berubah ${tanda(ch.suhuMaksRata)}°C dan hari sangat panas menjadi sekitar ${fmt(depan.hariSangatPanas.rata)} hari per tahun. Ini proyeksi, bukan kepastian, tetapi menyiapkan rumah dan kebiasaan keluarga sejak sekarang membuat perubahan lebih mudah dihadapi.`;
  return { ringkasan, dampak: dampak.slice(0, 3), langkah: langkah.slice(0, 6) };
}

const kunciCache = (p: ProyeksiResponse, k: KeluargaBriefing) => JSON.stringify([p.grid, p.perubahan, k]);

export async function susunAdaptasi(p: ProyeksiResponse, wilayah: { kabKota: string; provinsi: string }, k: KeluargaBriefing, d: DepsAdaptasi & { bahaya?: HazardId[] }): Promise<HasilAdaptasi> {
  const now = d.sekarang ?? new Date();
  const cadangan = (): HasilAdaptasi => ({ ...adaptasiCadangan(p, k), mode: "cadangan", dibuatPada: now.toISOString() });
  const kunci = kunciCache(p, k);
  const ada = d.cache?.get(kunci);
  if (ada) return ada;

  const anggaran = d.anggaran ?? anggaranGlobal;
  if (d.providers.length === 0 || !anggaran.pakai()) return cadangan();

  const proyeksi = teksProyeksi(p);
  const konteks = teksKonteks(k, d.bahaya ?? k.bahaya);
  const user = [
    "Susun rencana adaptasi perubahan iklim untuk keluarga ini.",
    blokData("WILAYAH", `${wilayah.kabKota}, ${wilayah.provinsi}`),
    blokData("PROYEKSI", proyeksi),
    konteks ? blokData("KONTEKS KELUARGA", konteks) : "",
  ].filter(Boolean).join("\n\n");
  const sumberAngka = `${proyeksi}\n${konteks}`;

  for (const prov of d.providers) {
    try {
      const mentah = await prov.hasilJson({ system: SISTEM_ADAPTASI, user, suhu: 0.4, maksTokenKeluaran: 3000, anggaranPikir: 1024, timeoutMs: d.batasWaktuMs ?? 25_000 });
      const v = AdaptasiKeluaran.safeParse(JSON.parse(mentah));
      if (!v.success) continue;
      const bersih: AdaptasiKeluaranT = {
        ringkasan: buangPenafian(bersihkanTeks(v.data.ringkasan)),
        dampak: v.data.dampak.slice(0, 3).map((x) => ({ judul: bersihkanTeks(x.judul), isi: bersihkanTeks(x.isi) })),
        langkah: v.data.langkah.slice(0, 6).map((x) => ({ ...x, judul: bersihkanTeks(x.judul), alasan: bersihkanTeks(x.alasan) })),
      };
      const semua = [bersih.ringkasan, ...bersih.dampak.flatMap((x) => [x.judul, x.isi]), ...bersih.langkah.flatMap((x) => [x.judul, x.alasan])].join(" ");
      // Rupiah, ramalan pasti, atau angka yang tidak ada di data proyeksi: pakai cadangan (dan simpan agar tidak diulang).
      if (/\brp\.?\s*\d|rupiah/i.test(semua) || !lolosPenyaring(semua) || angkaBaru(sumberAngka, semua, NOMOR_DARURAT_DIIZINKAN)) {
        const c = cadangan();
        d.cache?.set(kunci, c);
        return c;
      }
      const hasil: HasilAdaptasi = { ...bersih, mode: "ai", dibuatPada: now.toISOString() };
      d.cache?.set(kunci, hasil);
      return hasil;
    } catch (e) {
      if (e instanceof GalatProvider || e instanceof SyntaxError) continue;
      throw e;
    }
  }
  return cadangan();
}

export const cacheAdaptasi = new CacheTtl<HasilAdaptasi>(7 * 86_400_000, 300);
