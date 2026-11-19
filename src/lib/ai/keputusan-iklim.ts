// Siaga Iklim, Penasihat Keputusan: AI memilih dan menjelaskan tindakan dari KATALOG tetap sesuai kendala pengguna.
// Pembagian tugas (prinsip produk "kode menghitung, AI menjelaskan"):
//  - KODE: uji ketahanan rumah, efek tiap tindakan, waktu mulai, urutan cadangan (lib/iklim/ketahanan.ts).
//  - AI  : memilih 2-3 id dari katalog, mengurutkannya menurut kendala, menulis alasan dan langkah pertama.
// Pagar: id di luar katalog dibuang; angka pada teks harus ada di data; tanpa rupiah; tanpa kalimat ramalan pasti;
// gagal apa pun -> urutan cadangan dari kode (tanpa AI).
import type { ProyeksiResponse } from "@/lib/data/proyeksi";
import { KATALOG, efekAir, intervensiById, ujiKetahanan, type HasilUji, type InputRumah, type Intervensi } from "@/lib/iklim/ketahanan";
import { NAMA_PRIORITAS, fmt, jadiOpsi, keputusanCadangan, type HasilKeputusan, type OpsiKeputusan } from "@/lib/iklim/keputusan";
import { GalatProvider, type LlmProvider } from "./provider";
import { KeputusanIklimKeluaran } from "./schema";
import { bersihkanTeks, buangPenafian, lolosPenyaring, rapikanKapital } from "./guardrails";
import { SISTEM_KEPUTUSAN_IKLIM, blokData } from "./prompts";
import { AnggaranHarian, CacheTtl, anggaranGlobal } from "./runtime";
import { angkaBaru, NOMOR_DARURAT_DIIZINKAN } from "./terjemah";

export interface DepsKeputusan {
  providers: LlmProvider[];
  anggaran?: AnggaranHarian;
  cache?: CacheTtl<HasilKeputusan>;
  batasWaktuMs?: number;
  sekarang?: Date;
}

const NAMA_TINGKAT = { aman: "aman", perhatikan: "perlu diperhatikan", waspada: "waspada" } as const;
const NAMA_ATAP = { seng: "seng", genteng: "genteng", beton: "beton", lainnya: "lainnya" } as const;
const NAMA_GANGGUAN = { jarang: "jarang sulit", hari: "biasanya sulit beberapa hari", minggu: "biasanya sulit beberapa minggu", kemarau: "hampir sepanjang kemarau sulit" } as const;
const NAMA_SUMBER = { pdam: "PDAM", sumur: "sumur", beli: "beli air atau tangki", lainnya: "lainnya" } as const;

/** Hasil uji dalam teks: dipakai di prompt dan menjadi satu-satunya sumber angka yang sah bagi keluaran AI. */
export function teksUji(i: InputRumah, u: HasilUji): string {
  const { air, panas, hujan } = u;
  return [
    `Rumah: ${i.anggota} orang, ${i.rentan > 0 ? "ada anggota rentan (lansia, balita, atau ibu hamil)" : "tanpa anggota rentan"}, atap ${NAMA_ATAP[i.atap]}, air simpanan sendiri ${i.litersTersimpan} liter, sumber air ${NAMA_SUMBER[i.sumberAir]}, ${i.pernahTergenang ? "pernah tergenang" : "belum pernah tergenang"}.`,
    `Air: kebutuhan ${air.kebutuhanLiterPerHari} liter per hari; air simpanan cukup ${fmt(air.hariCukup)} hari. Saat kemarau air di rumah ini ${NAMA_GANGGUAN[i.gangguanAir]}. Kemarau terpanjang di tahun terburuk: ${air.kemarauKini} hari (saat ini, 2011-2030), ${air.kemarauDepan} hari (10-25 tahun lagi, 2031-2050). Hari air perlu ditutup: ${air.perluKini} hari (saat ini), ${air.perluDepan} hari (2031-2050). Kekurangan yang harus ditutup pasokan luar: ${air.kurangKini} hari (saat ini), ${air.kurangDepan} hari (2031-2050). Tingkat: ${NAMA_TINGKAT[air.tingkat]}.`,
    `Panas: hari sangat panas per tahun ${fmt(panas.hariDulu)} (1990-an), ${fmt(panas.hariKini)} (saat ini), ${fmt(panas.hariDepan)} (2031-2050), selisih ${fmt(panas.selisih)}. Bulan puncak saat ini: ${panas.bulanPuncak.join(", ") || "tidak ada"}. Tingkat: ${NAMA_TINGKAT[panas.tingkat]}.`,
    `Hujan lebat: hari hujan ekstrem per tahun ${fmt(hujan.hariDulu)} (1990-an), ${fmt(hujan.hariKini)} (saat ini), ${fmt(hujan.hariDepan)} (2031-2050), selisih ${fmt(hujan.selisih)}. Bulan puncak saat ini: ${hujan.bulanPuncak.join(", ") || "tidak ada"}. Tingkat: ${NAMA_TINGKAT[hujan.tingkat]}.`,
    `Acuan: utamakan angka saat ini; angka 2031-2050 adalah arah tren bila perubahan berlanjut, bukan ramalan tahun tertentu.`,
    `Prioritas utama: ${NAMA_PRIORITAS[u.prioritas]}.`,
  ].join("\n");
}

function teksKatalog(i: InputRumah, u: HasilUji, p: ProyeksiResponse, layak: Intervensi[]): string {
  return layak
    .map((iv) => {
      const e = efekAir(i, iv, p);
      const efek = e ? ` | efek terhitung: air cukup ${fmt(e.hariCukupBaru)} hari, kekurangan saat ini menjadi ${e.kurangKiniBaru} hari (menutup ${e.tutupKini} hari), kekurangan 2031-2050 menjadi ${e.kurangDepanBaru} hari (menutup ${e.tutup} hari)` : "";
      return `- ${iv.id} | ${iv.judul} | biaya ${iv.biaya} | ruang ${iv.ruang}${efek} | ${iv.deskripsi} | langkah: ${iv.langkahPertama}`;
    })
    .join("\n");
}

const kunciCache = (p: ProyeksiResponse, i: InputRumah, kendala: string) => JSON.stringify([p.grid, p.kemarauTerburuk, p.periode.map((x) => x.metrik.hariSangatPanas.rata), i, kendala]);

export async function susunKeputusan(
  p: ProyeksiResponse,
  wilayah: { kabKota: string; provinsi: string },
  i: InputRumah,
  kendalaMentah: string | undefined,
  d: DepsKeputusan,
): Promise<HasilKeputusan> {
  const now = d.sekarang ?? new Date();
  const u = ujiKetahanan(i, p);
  const kendala = (kendalaMentah ?? "").replace(/\s+/g, " ").trim();
  const cadangan = (): HasilKeputusan => ({ mode: "cadangan", dibuatPada: now.toISOString(), ...keputusanCadangan(i, u, p, now, kendala) });
  const kunci = kunciCache(p, i, kendala);
  const ada = d.cache?.get(kunci);
  if (ada) return ada;

  const anggaran = d.anggaran ?? anggaranGlobal;
  if (d.providers.length === 0 || !anggaran.pakai()) return cadangan();

  const layak = KATALOG.filter((iv) => iv.berlaku(i, u));
  const idLayak = new Set(layak.map((x) => x.id));
  const uji = teksUji(i, u);
  const katalog = teksKatalog(i, u, p, layak);
  const user = [
    "Pilih tindakan adaptasi iklim untuk rumah tangga ini.",
    blokData("WILAYAH", `${wilayah.kabKota}, ${wilayah.provinsi}`),
    blokData("HASIL UJI", uji),
    blokData("KATALOG", katalog),
    blokData("KENDALA PENGGUNA", kendala || "(tidak ada)"),
  ].join("\n\n");
  const sumberAngka = `${uji}\n${katalog}`;

  for (const prov of d.providers) {
    try {
      const mentah = await prov.hasilJson({ system: SISTEM_KEPUTUSAN_IKLIM, user, suhu: 0.3, maksTokenKeluaran: 2000, anggaranPikir: 512, timeoutMs: d.batasWaktuMs ?? 25_000 });
      const v = KeputusanIklimKeluaran.safeParse(JSON.parse(mentah));
      if (!v.success) continue;

      const dipakai = new Set<string>();
      const opsi: OpsiKeputusan[] = [];
      for (const o of v.data.opsi) {
        const iv = intervensiById(o.id);
        if (!iv || !idLayak.has(iv.id) || dipakai.has(iv.id)) continue; // id karangan, tidak berlaku, atau ganda: dibuang
        dipakai.add(iv.id);
        opsi.push(jadiOpsi(iv, rapikanKapital(buangPenafian(bersihkanTeks(o.alasan))), rapikanKapital(bersihkanTeks(o.langkahPertama)), i, p, now));
      }
      const ringkasan = rapikanKapital(buangPenafian(bersihkanTeks(v.data.ringkasan)));
      if (opsi.length === 0) continue;

      const semua = [ringkasan, ...opsi.flatMap((x) => [x.alasan, x.langkahPertama])].join(" ");
      // Rupiah, ramalan pasti, atau angka yang tidak ada di data: pakai cadangan (dan simpan agar tidak diulang).
      if (/\brp\.?\s*\d|rupiah/i.test(semua) || !lolosPenyaring(semua) || angkaBaru(sumberAngka, semua, NOMOR_DARURAT_DIIZINKAN)) {
        const c = cadangan();
        d.cache?.set(kunci, c);
        return c;
      }
      const hasil: HasilKeputusan = { mode: "ai", dibuatPada: now.toISOString(), ringkasan, opsi };
      d.cache?.set(kunci, hasil);
      return hasil;
    } catch (e) {
      if (e instanceof GalatProvider || e instanceof SyntaxError) continue;
      throw e;
    }
  }
  return cadangan();
}

export const cacheKeputusan = new CacheTtl<HasilKeputusan>(24 * 3_600_000, 300);
