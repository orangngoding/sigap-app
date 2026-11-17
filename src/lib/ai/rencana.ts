// Pemrosesan permintaan Rencana Siaga di server (Blueprint 10.2 dan 10.3).
// Urutan: validasi (di rute) -> bagian deterministik -> passage BM25 -> model -> validasi Zod ->
// pasca-proses -> cache. Gagal di titik mana pun berujung ke templat deterministik, bukan galat.
import type { Group, HazardId, ProfilAnonim } from "@/types";
import type { ItemTas, Tindakan } from "@/types/rencana";
import type { Chunk } from "@/lib/kb/schema";
import { indeksUntuk } from "@/lib/kb/search";
import { hitungFaktorKerentanan } from "@/lib/preparedness/faktor";
import { hitungTas } from "@/lib/preparedness/tas";
import { HAZARD_BY_ID } from "@/lib/hazards/hazards";
import { hashMasukan } from "@/lib/rencana/hash";
import { bangunRencanaTemplat, chunkKeTindakan, kelompokProfil, relevan, ringkasanTemplat, skorChunk } from "@/lib/rencana/templat";
import { GalatProvider, type LlmProvider } from "./provider";
import { RencanaSiaga, type RencanaRequestT } from "./schema";
import { bersihkanTeks, lolosPenyaring } from "./guardrails";
import { SISTEM_RENCANA, blokData } from "./prompts";
import { AnggaranHarian, CacheTtl, anggaranGlobal, kunciHari } from "./runtime";

export type AlasanCadangan = "ai_nonaktif" | "anggaran" | "timeout" | "kuota" | "tolak" | "galat" | "keluaran_tidak_valid";

export interface ArtikelRingkas {
  slug: string;
  hazards: string[];
}

export interface SumberRencana {
  id: string;
  judul: string;
  url: string;
}

export interface HasilRencana {
  mode: "ai" | "cadangan";
  dibuatPada: string;
  ringkasanRisiko: string;
  faktorKerentanan: string[];
  tindakan: Tindakan[];
  tas: ItemTas[];
  rekomendasiEdukasi: string[];
  catatanKeterbatasan: string;
  sumber: SumberRencana[];
  meta: { cache: boolean; durasiMs: number; alasanCadangan?: AlasanCadangan };
}

export interface DepsRencana {
  kb: Chunk[];
  providers: LlmProvider[];
  artikel?: ArtikelRingkas[];
  anggaran?: AnggaranHarian;
  cache?: CacheTtl<HasilRencana>;
  sekarang?: () => Date;
  /** Batas waktu server seluruh pemrosesan (Blueprint 13.1: 20 detik). */
  batasWaktuMs?: number;
}

export const CATATAN_AI =
  "Rencana ini dibuat dengan bantuan AI dari panduan resmi yang dikutip. Periksa sumbernya dan ikuti arahan BPBD, BMKG, dan petugas berwenang.";
export const CATATAN_CADANGAN =
  "Rencana disusun otomatis dari kumpulan panduan yang terbatas dan belum tentu mencakup semua kondisi rumah Anda. Ikuti arahan resmi BNPB, BPBD, dan BMKG.";

const cacheBawaan = new CacheTtl<HasilRencana>(6 * 3600_000);

// ---------- Pemilihan passage ----------
const MAKS_PASSAGE = 24;
const KUOTA_UMUM = 6;
const KUOTA_BAHAYA_TOTAL = 18;
const FASE_URUT = ["sebelum", "saat", "sesudah"] as const;

function kueriProfil(p: ProfilAnonim): string {
  const k: string[] = p.bahaya.map((h) => HAZARD_BY_ID[h].label);
  if (p.lansia > 0) k.push("lansia");
  if (p.balita > 0) k.push("balita anak");
  if (p.hamil > 0) k.push("ibu hamil");
  if (p.disabilitas > 0) k.push("disabilitas");
  if (p.varianBanjir.includes("bandang")) k.push("banjir bandang");
  if (p.bangunan === "apartemen" || p.bangunan === "kos") k.push("gedung tangga");
  if (!p.punyaKendaraan) k.push("evakuasi");
  return k.join(" ");
}

/** Passage per bahaya dengan kuota adil, maksimal 24; potongan darurat tidak pernah dibuang lebih dulu. */
export function pilihPassage(kb: Chunk[], p: ProfilAnonim, maks = MAKS_PASSAGE): Chunk[] {
  const bm = new Map<string, number>();
  for (const r of indeksUntuk(kb).cari(kueriProfil(p), { maks: kb.length })) bm.set(r.chunk.id, r.skor);
  const maksBm = Math.max(1, ...bm.values());
  const nilai = (c: Chunk) => skorChunk(c, p) + (2 * (bm.get(c.id) ?? 0)) / maksBm;

  const dipilih: Chunk[] = [];
  for (const h of ["umum", ...p.bahaya] as const) {
    const kuota = h === "umum" ? KUOTA_UMUM : Math.max(3, Math.floor(KUOTA_BAHAYA_TOTAL / p.bahaya.length));
    const kandidat = kb
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => c.hazard === h && relevan(c, p))
      .sort((a, b) => nilai(b.c) - nilai(a.c) || a.i - b.i)
      .map((x) => x.c);
    const ambil: Chunk[] = [];
    for (const f of FASE_URUT) {
      const terbaik = kandidat.find((c) => c.phase === f);
      if (terbaik && ambil.length < kuota) ambil.push(terbaik);
    }
    for (const c of kandidat) if (ambil.length < kuota && !ambil.includes(c)) ambil.push(c);
    dipilih.push(...ambil);
  }
  // Bila melebihi batas, buang yang paling rendah nilainya, potongan darurat dibuang paling akhir.
  while (dipilih.length > maks) {
    let idx = -1;
    let terendah = Infinity;
    dipilih.forEach((c, i) => {
      const n = nilai(c) + (c.darurat ? 100 : 0);
      if (n < terendah) {
        terendah = n;
        idx = i;
      }
    });
    dipilih.splice(idx, 1);
  }
  return dipilih.sort((a, b) => FASE_URUT.indexOf(a.phase) - FASE_URUT.indexOf(b.phase));
}

// ---------- Prompt ----------
export function sorotanDariRingkasan(r?: { hujanLebat48j?: boolean; gempaDekat24j?: boolean }): string[] {
  const s: string[] = [];
  if (r?.hujanLebat48j) s.push("Perkiraan BMKG menunjukkan hujan lebat dalam 48 jam ke depan di sekitar lokasi.");
  if (r?.gempaDekat24j) s.push("BMKG mencatat gempa M5 atau lebih dalam 24 jam terakhir dalam radius 300 km dari lokasi.");
  return s;
}

export function susunPrompt(m: RencanaRequestT, faktor: string[], passages: Chunk[]): string {
  const p = m.profil;
  const data = {
    lokasi: m.lokasi,
    bahaya: p.bahaya,
    varianBanjir: p.varianBanjir,
    jumlahAnggota: p.jumlahAnggota,
    kelompokRentan: { lansia: p.lansia, balita: p.balita, hamil: p.hamil, disabilitas: p.disabilitas, jenisDisabilitas: p.jenisDisabilitas },
    obatRutin: p.obatRutin,
    hewanPeliharaan: p.hewanPeliharaan,
    bangunan: p.bangunan,
    lantaiTinggal: p.lantaiTinggal ?? null,
    punyaKendaraan: p.punyaKendaraan,
    persediaanHari: p.persediaanHari,
    faktorKerentanan: faktor,
    kondisiTerkini: sorotanDariRingkasan(m.ringkasanData),
  };
  const daftar = passages
    .map((c) => `[${c.id}] (${c.hazard}; ${c.phase}; prioritas ${c.priority}; untuk ${c.audience.join("/")}) ${c.title}: ${c.body}`)
    .join("\n");
  return [
    "Susun Rencana Siaga untuk keluarga berikut. Kutip id passage persis di sourceIds.",
    blokData("PROFIL", JSON.stringify(data, null, 1)),
    blokData("PASSAGE", daftar),
  ].join("\n\n");
}

// ---------- Pasca-proses ----------
const GRUP_VALID = new Set<Group>(["lansia", "balita", "disabilitas", "hamil", "umum"]);

/** Hasil validasi model -> tindakan final. null bila terlalu sedikit yang lolos (jatuh ke templat). */
export function pascaProses(
  mentah: { tindakan: Array<{ hazard: string; phase: string; title: string; detail: string; priority: "tinggi" | "sedang" | "rendah"; forGroups: string[]; sourceIds: string[] }> },
  passages: Chunk[],
  kb: Chunk[],
  p: ProfilAnonim,
): Tindakan[] | null {
  const idPassage = new Set(passages.map((c) => c.id));
  const byId = new Map(kb.map((c) => [c.id, c]));
  const hasil: Tindakan[] = [];
  const sudah = new Set<string>();

  for (const a of mentah.tindakan) {
    const src = a.sourceIds.filter((id) => idPassage.has(id));
    if (src.length === 0) continue; // tanpa kutipan valid dibuang
    const utama = byId.get(src[0]);
    if (!utama) continue;
    const title = bersihkanTeks(a.title);
    const detail = bersihkanTeks(a.detail);
    if (title.length < 3 || detail.length < 10) continue;
    if (!lolosPenyaring(`${title} ${detail}`)) continue;
    // hazard dan fase mengikuti potongan sumber (sumber kebenaran), sehingga actionId stabil lintas penyusunan.
    const actionId = `${utama.hazard}:${utama.phase}:${src[0]}`;
    if (sudah.has(actionId)) continue;
    sudah.add(actionId);
    const grup = a.forGroups.filter((g): g is Group => GRUP_VALID.has(g as Group));
    hasil.push({
      actionId,
      hazard: utama.hazard as Tindakan["hazard"],
      phase: utama.phase,
      title: title.slice(0, 80),
      detail: detail.slice(0, 280),
      priority: a.priority,
      forGroups: grup.length > 0 ? grup : ["umum"],
      sourceIds: src,
    });
  }
  if (hasil.length < 8) return null;

  // Langkah darurat fase Saat tidak boleh hilang karena model melewatkannya: lengkapi dari KB (maks 3 per bahaya).
  const bobot = { tinggi: 3, sedang: 2, rendah: 1 } as const;
  for (const h of p.bahaya) {
    const darurat = kb
      .filter((c) => c.hazard === h && c.phase === "saat" && c.darurat && relevan(c, p))
      .sort((x, y) => bobot[y.priority] - bobot[x.priority])
      .slice(0, 3);
    for (const c of darurat) {
      const t = chunkKeTindakan(c);
      if (!sudah.has(t.actionId)) {
        sudah.add(t.actionId);
        hasil.push(t);
      }
    }
  }
  return hasil.slice(0, 60);
}

export function rekomendasiArtikel(bahaya: HazardId[], artikel: ArtikelRingkas[] = []): string[] {
  return artikel
    .map((a, i) => ({ a, i, skor: a.hazards.filter((h) => (bahaya as string[]).includes(h)).length + (a.hazards.includes("umum") ? 0.5 : 0) }))
    .filter((x) => x.skor > 0)
    .sort((x, y) => y.skor - x.skor || x.i - y.i)
    .slice(0, 5)
    .map((x) => x.a.slug);
}

function sumberDari(tindakan: Tindakan[], kb: Chunk[]): SumberRencana[] {
  const byId = new Map(kb.map((c) => [c.id, c]));
  const ids = [...new Set(tindakan.flatMap((t) => t.sourceIds))];
  return ids.flatMap((id) => {
    const c = byId.get(id);
    return c ? [{ id, judul: c.sourceTitle, url: c.sourceUrl }] : [];
  });
}

const namaLokasi = (l: RencanaRequestT["lokasi"]) => l.kelurahan;

// ---------- Orkestrasi ----------
export async function susunRencana(m: RencanaRequestT, d: DepsRencana): Promise<HasilRencana> {
  const mulai = Date.now();
  const sekarang = d.sekarang?.() ?? new Date();
  const profil = m.profil as ProfilAnonim;
  const cache = d.cache ?? cacheBawaan;
  const anggaran = d.anggaran ?? anggaranGlobal;
  const batasWaktu = d.batasWaktuMs ?? 20_000;

  const faktor = hitungFaktorKerentanan(profil);
  const tas = hitungTas(profil);
  const sorotan = sorotanDariRingkasan(m.ringkasanData);
  const kunci = hashMasukan(
    `${m.lokasi.provinsi}|${m.lokasi.kabKota}|${m.lokasi.kecamatan}|${m.lokasi.kelurahan}|${kunciHari(sekarang)}|${sorotan.length}`,
    profil,
  );

  if (!m.abaikanCache) {
    const hit = cache.get(kunci);
    if (hit) return { ...hit, meta: { ...hit.meta, cache: true, durasiMs: Date.now() - mulai } };
  }

  const passages = pilihPassage(d.kb, profil);
  const artikel = rekomendasiArtikel(profil.bahaya, d.artikel);
  let alasan: AlasanCadangan | undefined = d.providers.length === 0 ? "ai_nonaktif" : undefined;

  if (!alasan) {
    const user = susunPrompt(m, faktor, passages);
    penyedia: for (const prov of d.providers) {
      let catatanGalat = "";
      for (let percobaan = 0; percobaan < 2; percobaan++) {
        const sisa = batasWaktu - (Date.now() - mulai);
        if (sisa < 1500) {
          alasan = "timeout";
          break penyedia;
        }
        if (!anggaran.pakai()) {
          alasan = "anggaran";
          break penyedia;
        }
        try {
          const mentah = await prov.hasilJson({
            system: SISTEM_RENCANA,
            user: catatanGalat ? `${user}\n\nCATATAN: keluaran sebelumnya tidak valid (${catatanGalat}). Perbaiki dan keluarkan hanya JSON sesuai bentuk.` : user,
            suhu: 0.3,
            maksTokenKeluaran: 6000,
            timeoutMs: Math.min(sisa, batasWaktu),
          });
          const json: unknown = JSON.parse(mentah);
          const v = RencanaSiaga.safeParse(json);
          if (!v.success) {
            catatanGalat = v.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
            alasan = "keluaran_tidak_valid";
            continue;
          }
          const tindakan = pascaProses(v.data, passages, d.kb, profil);
          if (!tindakan) {
            catatanGalat = "terlalu sedikit tindakan dengan sourceIds valid";
            alasan = "keluaran_tidak_valid";
            continue;
          }
          let ringkasan = bersihkanTeks(v.data.ringkasanRisiko).slice(0, 600);
          if (ringkasan.length < 10 || !lolosPenyaring(ringkasan)) ringkasan = ringkasanTemplat(namaLokasi(m.lokasi), profil.bahaya, faktor);
          const hasil: HasilRencana = {
            mode: "ai",
            dibuatPada: sekarang.toISOString(),
            ringkasanRisiko: ringkasan,
            faktorKerentanan: faktor,
            tindakan,
            tas,
            rekomendasiEdukasi: artikel,
            catatanKeterbatasan: CATATAN_AI,
            sumber: sumberDari(tindakan, d.kb),
            meta: { cache: false, durasiMs: Date.now() - mulai },
          };
          cache.set(kunci, hasil);
          return hasil;
        } catch (e) {
          if (e instanceof GalatProvider) {
            alasan = e.jenis;
            continue penyedia; // penyedia ini gagal: coba penyedia berikutnya
          }
          catatanGalat = "JSON tidak dapat dibaca";
          alasan = "keluaran_tidak_valid";
        }
      }
    }
  }

  // Cadangan deterministik (Blueprint 9.4): hasil identik untuk masukan yang sama.
  const t = bangunRencanaTemplat({ adm4: "", namaLokasi: namaLokasi(m.lokasi), profil, kb: d.kb, sorotan, sekarang });
  return {
    mode: "cadangan",
    dibuatPada: t.dibuatPada,
    ringkasanRisiko: t.ringkasanRisiko,
    faktorKerentanan: t.faktorKerentanan,
    tindakan: t.tindakan,
    tas: t.tas,
    rekomendasiEdukasi: artikel,
    catatanKeterbatasan: CATATAN_CADANGAN,
    sumber: sumberDari(t.tindakan, d.kb),
    meta: { cache: false, durasiMs: Date.now() - mulai, alasanCadangan: alasan ?? "galat" },
  };
}

export { kelompokProfil };
