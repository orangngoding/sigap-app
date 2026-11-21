// Siaga Iklim, Penasihat Keputusan: AI memilih dan menjelaskan tindakan dari KATALOG tetap sesuai kendala pengguna.
// Pembagian tugas (prinsip produk "kode menghitung, AI menjelaskan"):
//  - KODE: uji ketahanan rumah, efek tiap tindakan, waktu mulai, urutan cadangan (lib/iklim/ketahanan.ts).
//  - AI  : memilih 2-3 id dari katalog, mengurutkannya menurut kendala, menulis alasan dan langkah pertama.
// Pagar: id di luar katalog dibuang; angka pada teks harus ada di data; tanpa rupiah; tanpa kalimat ramalan pasti;
// gagal apa pun -> urutan cadangan dari kode (tanpa AI).
import type { ProyeksiResponse } from "@/lib/data/proyeksi";
import { KATALOG, bacaKendala, efekAir, intervensiById, ujiKetahanan, type HasilUji, type InputRumah, type Intervensi } from "@/lib/iklim/ketahanan";
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
    `Air: kebutuhan ${air.kebutuhanLiterPerHari} liter per hari; air simpanan cukup ${fmt(air.hariCukup)} hari. ${i.airDiketahui === false ? `Pengguna BELUM menjawab soal air (lama air sulit dan air simpanan), jadi yang dihitung hanya cadangan dasar ${air.perluKini} hari; jangan menyebut pengalaman pengguna tentang air.` : `Saat kemarau air di rumah ini ${NAMA_GANGGUAN[i.gangguanAir]}.`} Kemarau terpanjang di tahun paling kering: ${air.kemarauKini} hari (sekarang), ${air.kemarauDepan} hari (10-25 tahun lagi). Perkiraan air sulit: ${air.perluKini} hari (sekarang), ${air.perluDepan} hari (10-25 tahun lagi). Kekurangan yang perlu air dari luar: ${air.kurangKini} hari (sekarang), ${air.kurangDepan} hari (10-25 tahun lagi). Tingkat: ${NAMA_TINGKAT[air.tingkat]}.`,
    `Panas: hari panas terik (siang di atas sekitar ${Math.round(panas.ambangC)}°C) per tahun ${Math.round(panas.hariDulu)} (1990-an), ${Math.round(panas.hariKini)} (sekarang), ${Math.round(panas.hariDepan)} (10-25 tahun lagi). Bulan puncak saat ini: ${panas.bulanPuncak.join(", ") || "tidak ada"}. Tingkat: ${NAMA_TINGKAT[panas.tingkat]}.`,
    `Hujan: hari hujan sangat deras (lebih dari ${Math.round(hujan.ambangMm)} mm sehari) per tahun ${Math.round(hujan.hariDulu)} (1990-an), ${Math.round(hujan.hariKini)} (sekarang), ${Math.round(hujan.hariDepan)} (10-25 tahun lagi). Bulan puncak saat ini: ${hujan.bulanPuncak.join(", ") || "tidak ada"}. Tingkat: ${NAMA_TINGKAT[hujan.tingkat]}.`,
    `Acuan: utamakan angka sekarang; angka 10-25 tahun lagi hanya arah perkiraan, bukan ramalan.`,
    `Prioritas utama: ${NAMA_PRIORITAS[u.prioritas]}.`,
  ].join("\n");
}

function teksKatalog(i: InputRumah, u: HasilUji, p: ProyeksiResponse, layak: Intervensi[]): string {
  return layak
    .map((iv) => {
      const e = efekAir(i, iv, p);
      const efek = e ? ` | efek terhitung: air cukup ${fmt(e.hariCukupBaru)} hari, kekurangan sekarang menjadi ${e.kurangKiniBaru} hari (menutup ${e.tutupKini} hari), kekurangan 10-25 tahun lagi menjadi ${e.kurangDepanBaru} hari (menutup ${e.tutup} hari)` : "";
      return `- ${iv.id} | ${iv.judul} | biaya ${iv.biaya} | ruang ${iv.ruang}${efek} | ${iv.deskripsi} | langkah: ${iv.langkahPertama}`;
    })
    .join("\n");
}

/** Istilah teknis yang membingungkan orang awam. */
const POLA_ISTILAH = /\b(proyeksi|diproyeksikan|skenario|ansambel|persentil|model iklim|tren)\b/i;
/** Klaim berlebihan atau menakut-nakuti. */
const POLA_LEBAY = /pengalaman anda sendiri|pasti terjadi|krisis|bahaya besar|sangat berbahaya|mengancam jiwa/i;
/** Sebab-akibat keliru: fenomena cuaca "karena" ada anggota rentan (contoh nyata dari model: "panas terjadi karena ada lansia"). */
const POLA_SEBAB_KELIRU = /(panas|terik|air|kemarau|hujan)[^.]{0,80}\bkarena\s+(ada\s+)?(anggota[^.]{0,20}rentan|lansia|balita|ibu hamil)/i;
const MAKS_KATA_KALIMAT = 32;

/**
 * Pagar mutu keluaran AI Penasihat Keputusan (dihitung kode). null = lolos; selain itu alasan singkat yang dikirim balik
 * ke model sebagai catatan perbaikan. Memeriksa: tindakan yang bertentangan dengan batasan pengguna padahal ada pilihan
 * yang cocok, istilah teknis, klaim berlebihan, sebab-akibat keliru, dan kalimat yang terlalu panjang untuk orang awam.
 */
export function periksaKeputusan(ringkasan: string, opsi: Array<{ id: string; alasan: string; langkahPertama: string }>, kendala: string, layak: Intervensi[]): string | null {
  const kd = bacaKendala(kendala);
  for (const o of opsi) {
    const iv = intervensiById(o.id);
    if (!iv) continue;
    const pengganti = (cocok: (x: Intervensi) => boolean) => layak.find((x) => x.target === iv.target && x.id !== iv.id && cocok(x));
    if (kd.ruangSempit && (iv.ruang === "besar" || iv.ruang === "sedang")) {
      const alt = pengganti((x) => x.ruang === "tidak" || x.ruang === "kecil");
      if (alt) return `pengguna menulis lahan sempit, tetapi "${iv.id}" perlu lahan; pilih "${alt.id}" atau tindakan lain tanpa lahan`;
    }
    if (kd.hemat && iv.biaya === "tinggi") {
      const alt = pengganti((x) => x.biaya === "rendah");
      if (alt) return `pengguna menulis anggaran terbatas, tetapi "${iv.id}" berbiaya tinggi; pilih "${alt.id}" atau tindakan lain berbiaya rendah`;
    }
  }
  const semua = [ringkasan, ...opsi.flatMap((x) => [x.alasan, x.langkahPertama])].join(" ");
  const istilah = semua.match(POLA_ISTILAH);
  if (istilah) return `ada istilah teknis "${istilah[0]}"; ganti dengan bahasa sehari-hari ("perkiraan", "sekarang", "10-25 tahun lagi")`;
  const lebay = semua.match(POLA_LEBAY);
  if (lebay) return `ada kata berlebihan "${lebay[0]}"; tulis dengan nada tenang dan sebut angka air sebagai "menurut jawaban Anda"`;
  if (POLA_SEBAB_KELIRU.test(semua)) return `ada sebab-akibat keliru (cuaca terjadi "karena" anggota rentan); tulis "makin sering, dan ini paling berat bagi lansia dan balita"`;
  const panjang = semua.split(/(?<=[.!?])\s+/).find((k) => k.split(/\s+/).length > MAKS_KATA_KALIMAT);
  if (panjang) return `ada kalimat lebih dari ${MAKS_KATA_KALIMAT} kata; pecah menjadi kalimat pendek`;
  return null;
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

  // Tiap penyedia: sampai 3 percobaan. Keluaran yang ditolak pagar mutu dikirim balik dengan alasannya agar AI
  // memperbaikinya sendiri (pola yang sama dengan Simulator); bila tetap gagal, dipakai urutan dari kode.
  const PERCOBAAN = 3;
  for (const prov of d.providers) {
    let catatan = "";
    for (let k = 0; k < PERCOBAAN; k++) {
    try {
      const mentah = await prov.hasilJson({ system: SISTEM_KEPUTUSAN_IKLIM, user: catatan ? `${user}\n\nCATATAN: jawaban sebelumnya ditolak karena ${catatan}. Perbaiki dan keluarkan hanya JSON sesuai bentuk.` : user, suhu: 0.3, maksTokenKeluaran: 2000, anggaranPikir: 512, timeoutMs: d.batasWaktuMs ?? 25_000 });
      const v = KeputusanIklimKeluaran.safeParse(JSON.parse(mentah));
      if (!v.success) { catatan = "bentuk JSON tidak sesuai"; continue; }

      const dipakai = new Set<string>();
      const opsi: OpsiKeputusan[] = [];
      for (const o of v.data.opsi) {
        const iv = intervensiById(o.id);
        if (!iv || !idLayak.has(iv.id) || dipakai.has(iv.id)) continue; // id karangan, tidak berlaku, atau ganda: dibuang
        dipakai.add(iv.id);
        opsi.push(jadiOpsi(iv, rapikanKapital(buangPenafian(bersihkanTeks(o.alasan))), rapikanKapital(bersihkanTeks(o.langkahPertama)), i, p, now));
      }
      const ringkasan = rapikanKapital(buangPenafian(bersihkanTeks(v.data.ringkasan)));
      if (opsi.length === 0) { catatan = "tidak ada id yang sah dari KATALOG"; continue; }

      const semua = [ringkasan, ...opsi.flatMap((x) => [x.alasan, x.langkahPertama])].join(" ");
      // Rupiah, ramalan pasti, atau angka yang tidak ada di data: diperbaiki lewat catatan; tetap gagal = cadangan.
      if (/\brp\.?\s*\d|rupiah/i.test(semua)) { catatan = "menyebut harga atau rupiah"; continue; }
      if (!lolosPenyaring(semua)) { catatan = "ada kalimat ramalan pasti atau tidak pantas"; continue; }
      if (angkaBaru(sumberAngka, semua, NOMOR_DARURAT_DIIZINKAN)) { catatan = "ada angka yang tidak ada di HASIL UJI atau KATALOG; salin angka persis"; continue; }
      const mutu = periksaKeputusan(ringkasan, opsi, kendala, layak);
      if (mutu) { catatan = mutu; continue; }
      const hasil: HasilKeputusan = { mode: "ai", dibuatPada: now.toISOString(), ringkasan, opsi };
      d.cache?.set(kunci, hasil);
      return hasil;
    } catch (e) {
      if (e instanceof GalatProvider) break; // penyedia gagal: coba penyedia berikutnya
      if (e instanceof SyntaxError) { catatan = "bukan JSON yang sah"; continue; }
      throw e;
    }
    }
  }
  // Semua percobaan ditolak: urutan dari kode (disimpan agar tidak diulang terus).
  const c = cadangan();
  d.cache?.set(kunci, c);
  return c;
}

export const cacheKeputusan = new CacheTtl<HasilKeputusan>(24 * 3_600_000, 300);
