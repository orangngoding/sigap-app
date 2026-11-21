// Simulator Bencana AI (server). Urutan: passage KB untuk bahaya + konsep yang terlewat di uji awal -> model menulis
// simulasi yang dipersonalisasi (keluarga, rumah, lokasi) -> KODE memvalidasi dan mengacak pilihan -> skenario siap
// dimainkan oleh mesin Latihan yang sama (notifikasi, hitung mundur, meter keselamatan, hoaks, "Terapkan di rumah").
// Gagal di titik mana pun -> skenario bank yang ditulis tim (mode cadangan), jadi pengguna selalu bisa berlatih.
import type { HazardId, ProfilAnonim } from "@/types";
import type { Chunk } from "@/lib/kb/schema";
import { HAZARD_BY_ID } from "@/lib/hazards/hazards";
import { relevan } from "@/lib/rencana/templat";
import { hashMasukan } from "@/lib/rencana/hash";
import { skenarioUntuk } from "@/lib/latihan/mesin";
import { PESAN, type Pesan } from "@/lib/latihan/pesan";
import type { Langkah, Skenario } from "@/lib/latihan/skenario";
import { acak } from "@/lib/simulasi/uji";
import { LABEL_TINGKAT, PASANGAN_BERUNTUN, bencanaKedua, tantanganUntuk } from "@/lib/simulasi/tingkat";
import { GalatProvider, type LlmProvider } from "./provider";
import { SimulasiKeluaran, type SimulasiKeluaranT, type SimulasiRequestT } from "./schema";
import { bersihkanTeks, lolosPenyaring } from "./guardrails";
import { SISTEM_SIMULASI, blokData } from "./prompts";
import { AnggaranHarian, CacheTtl, anggaranGlobal, kunciHari } from "./runtime";
import { angkaBaru } from "./terjemah";

export interface HasilSimulasi {
  mode: "ai" | "cadangan";
  dibuatPada: string;
  skenario: Skenario;
  pesan: Record<string, Pesan[]>;
  /** Hal yang dipakai untuk personalisasi (ditulis kode, ditampilkan agar pengguna tahu mengapa skenarionya begini). */
  personalisasi: string[];
  meta: { cache: boolean; durasiMs: number; alasanCadangan?: string; /** Aturan validasi terakhir yang menolak (untuk log). */ ditolak?: string };
}

export interface DepsSimulasi {
  kb: Chunk[];
  providers: LlmProvider[];
  anggaran?: AnggaranHarian;
  cache?: CacheTtl<HasilSimulasi>;
  batasWaktuMs?: number;
  sekarang?: () => Date;
  /** Kalimat fakta kondisi nyata minggu ini di lokasi (disediakan rute; null bila tidak ada atau gagal). */
  kondisiNyata?: (m: SimulasiRequestT) => Promise<string | null>;
}

/** Bahan tambahan yang ditentukan kode: bencana kedua, keadaan sulit, dan kondisi nyata minggu ini. */
export interface EkstraSimulasi {
  kedua: HazardId | null;
  tantangan: string[];
  kondisi: string | null;
}

/** Bencana kedua yang sah untuk permintaan ini (hanya dari pasangan yang diizinkan; selain itu dihitung ulang). */
export function keduaUntuk(m: SimulasiRequestT): HazardId | null {
  if (m.tingkat !== "beruntun") return null;
  if (m.kedua && PASANGAN_BERUNTUN[m.hazard].includes(m.kedua)) return m.kedua;
  return bencanaKedua(m.hazard, Object.fromEntries((m.risiko ?? []).map((r) => [r.id, r.tingkat])));
}

export function ekstraDari(m: SimulasiRequestT, kondisi: string | null = null): EkstraSimulasi {
  return { kedua: keduaUntuk(m), tantangan: m.tingkat === "menantang" ? tantanganUntuk(m.hazard, m.varian) : [], kondisi };
}

const cacheBawaan = new CacheTtl<HasilSimulasi>(6 * 3600_000, 200);
const NOMOR_SAH = ["112", "110", "113", "115", "117", "119"];
const FASE = ["saat", "sebelum", "sesudah"] as const;

/** Profil dengan bahaya simulasi ikut terpilih, agar penyaring relevansi KB tidak membuang passage bahaya ini. */
const profilUntuk = (p: ProfilAnonim, h: HazardId): ProfilAnonim => (p.bahaya.includes(h) ? p : { ...p, bahaya: [...p.bahaya, h] });

/** Passage: bahaya ini (saat lebih dulu), beberapa umum, dan semua sumber konsep FOKUS. Maksimal 22. */
export function pilihPassageSimulasi(kb: Chunk[], hazard: HazardId, p: ProfilAnonim, fokusSumber: string[] = [], kedua: HazardId | null = null): Chunk[] {
  const pp = profilUntuk(kedua ? profilUntuk(p, kedua) : p, hazard);
  const bobot = { tinggi: 3, sedang: 2, rendah: 1 } as const;
  const urut = (cs: Chunk[]) => [...cs].sort((a, b) => Number(!!b.darurat) - Number(!!a.darurat) || bobot[b.priority] - bobot[a.priority]);
  const milik = FASE.flatMap((f) => urut(kb.filter((c) => c.hazard === hazard && c.phase === f && relevan(c, pp))).slice(0, f === "saat" ? 8 : 5));
  const umum = urut(kb.filter((c) => c.hazard === "umum" && c.phase !== "sebelum" && relevan(c, pp))).slice(0, 4);
  const fokus = kb.filter((c) => fokusSumber.includes(c.id));
  // Bencana kedua (mode beruntun): langkah saat dan sesudah yang terpenting.
  const keduaC = kedua ? (["saat", "sesudah"] as const).flatMap((f) => urut(kb.filter((c) => c.hazard === kedua && c.phase === f && relevan(c, pp))).slice(0, f === "saat" ? 6 : 2)) : [];
  const semua: Chunk[] = [];
  for (const c of [...fokus, ...milik, ...keduaC, ...umum]) if (!semua.some((x) => x.id === c.id)) semua.push(c);
  return semua.slice(0, kedua ? 28 : 22);
}

/** Atribut keluarga yang dipersonalisasi, dalam kalimat pendek (juga ditampilkan ke pengguna). */
export function personalisasiDari(m: SimulasiRequestT, e: EkstraSimulasi = ekstraDari(m)): string[] {
  const p = m.profil;
  const out: string[] = [];
  const bangunan: Record<string, string> = { rumah_1_lantai: "Rumah satu lantai", rumah_bertingkat: "Rumah bertingkat", apartemen: "Tinggal di apartemen", kos: "Tinggal di kos", lainnya: "Bangunan lain" };
  out.push(`${p.jumlahAnggota} orang di rumah`);
  if (p.lansia) out.push(`${p.lansia} lansia`);
  if (p.balita) out.push(`${p.balita} balita`);
  if (p.hamil) out.push(`${p.hamil} ibu hamil atau menyusui`);
  if (p.disabilitas) out.push(`${p.disabilitas} anggota dengan disabilitas`);
  if (p.obatRutin) out.push("Ada yang berobat rutin");
  if (p.hewanPeliharaan) out.push("Ada hewan peliharaan");
  out.push(bangunan[p.bangunan] ?? "Rumah");
  out.push(p.punyaKendaraan ? "Punya kendaraan" : "Tanpa kendaraan");
  const r = (m.risiko ?? []).find((x) => x.id === m.hazard && x.alasan[0]);
  if (r) out.push(r.alasan[0].replace(/\.$/, ""));
  if (m.fokus.length) out.push(`Menyasar ${m.fokus.length} konsep yang terlewat di uji awal`);
  if (m.tingkat !== "dasar") out.push(`Tingkat: ${LABEL_TINGKAT[m.tingkat].judul.toLowerCase()}`);
  if (e.kedua) out.push(`Disusul ${HAZARD_BY_ID[e.kedua].label.toLowerCase()}`);
  if (e.kondisi) out.push("Dibuka dari prakiraan nyata minggu ini");
  return out;
}

const DATA_PROFIL = (p: ProfilAnonim) => ({
  jumlahAnggota: p.jumlahAnggota,
  lansia: p.lansia,
  balita: p.balita,
  hamil: p.hamil,
  disabilitas: p.disabilitas,
  jenisDisabilitas: p.jenisDisabilitas,
  obatRutin: p.obatRutin,
  hewanPeliharaan: p.hewanPeliharaan,
  bangunan: p.bangunan,
  lantaiTinggal: p.lantaiTinggal ?? null,
  punyaKendaraan: p.punyaKendaraan,
  varianBanjir: p.varianBanjir,
});

export function teksRisikoSimulasi(m: SimulasiRequestT): string {
  return (m.risiko ?? [])
    .filter((r) => (r.id === m.hazard || r.tingkat === "tinggi") && r.alasan.length > 0)
    .map((r) => `- ${HAZARD_BY_ID[r.id].label} (tingkat ${r.tingkat}): ${r.alasan.join(" ")}`)
    .join("\n");
}

export function susunPromptSimulasi(m: SimulasiRequestT, passages: Chunk[], e: EkstraSimulasi = ekstraDari(m)): string {
  const risiko = teksRisikoSimulasi(m);
  const fokus = m.fokus.map((f) => `- ${f.teks} [${f.sumber}]`).join("\n");
  const perintahTingkat =
    e.kedua
      ? `TINGKAT BENCANA BERUNTUN: ${HAZARD_BY_ID[m.hazard].label} memicu ${HAZARD_BY_ID[e.kedua].label} (id ${e.kedua}). Langkah 1-2 bencana pertama; langkah 3 tanda bencana kedua muncul; langkah 4-5 menghadapi keduanya. Minimal satu pilihan keliru harus terdengar tepat untuk bencana pertama tetapi berbahaya untuk bencana kedua, dan umpan baliknya menjelaskan mengapa. Kutip passage kedua bencana.`
      : e.tantangan.length
        ? "TINGKAT MENANTANG: masukkan kedua keadaan di blok TANTANGAN ke dalam situasi, dan buat pilihan yang harus menyesuaikan dengan keadaan itu (misalnya tanpa listrik, sinyal lemah)."
        : "TINGKAT DASAR: satu bencana dalam kondisi biasa.";
  return [
    `Susun simulasi bahaya: ${HAZARD_BY_ID[m.hazard].label} (id ${m.hazard}), variasi ${m.varian}. Wilayah: kelurahan ${m.lokasi.kelurahan}, ${m.lokasi.kabKota}.`,
    perintahTingkat,
    e.kondisi
      ? "KONDISI NYATA: langkah pertama harus berangkat dari blok KONDISI_NYATA (salin tanggal dan angka persis) dan menyebutnya sebagai prakiraan, bukan kepastian. Langkah berikutnya menggambarkan apa yang terjadi BILA prakiraan itu terjadi."
      : "",
    blokData("PROFIL", JSON.stringify(DATA_PROFIL(m.profil), null, 1)),
    risiko ? blokData("RISIKO_LOKASI", risiko) : "",
    e.kondisi ? blokData("KONDISI_NYATA", e.kondisi) : "",
    e.tantangan.length ? blokData("TANTANGAN", e.tantangan.map((x) => `- ${x}`).join("\n")) : "",
    fokus ? blokData("FOKUS", fokus) : "",
    blokData("PASSAGE", passages.map((c) => `[${c.id}] (${c.hazard}; ${c.phase}) ${c.title}: ${c.body}`).join("\n")),
  ].filter(Boolean).join("\n\n");
}

/**
 * Validasi keluaran model menjadi skenario siap main, atau alasan penolakan. Aturan: tepat satu pilihan bernilai 2
 * dan minimal satu bernilai 0 per langkah; kutipan hanya id passage yang diberikan; tepat satu hoaks (medsos/keluarga)
 * yang jawaban terbaiknya tidak meneruskan kabar; angka hanya dari data; teks lolos penyaring ramalan dan jaminan.
 */
export function validasiSimulasi(
  k: SimulasiKeluaranT,
  passages: Chunk[],
  m: SimulasiRequestT,
  idUnik: string,
  e: EkstraSimulasi = ekstraDari(m),
): { skenario: Skenario; pesan: Record<string, Pesan[]> } | { galat: string } {
  const idOk = new Set(passages.map((c) => c.id));
  const sumberAngka = [JSON.stringify(DATA_PROFIL(m.profil)), teksRisikoSimulasi(m), m.lokasi.kelurahan, m.lokasi.kabKota, e.kondisi ?? "", ...e.tantangan, ...passages.map((c) => `${c.title} ${c.body}`), ...m.fokus.map((f) => f.teks)].join(" ");
  /** null = lolos; selain itu alasan singkat yang dikirim balik ke model sebagai catatan perbaikan. */
  const masalah = (t: string): string | null => {
    if (!lolosPenyaring(t)) return `kalimat ramalan atau jaminan keselamatan pada "${t.slice(0, 70)}"`;
    if (angkaBaru(sumberAngka, t, NOMOR_SAH)) return `angka yang tidak ada di DATA pada "${t.slice(0, 70)}" (hapus angkanya)`;
    return null;
  };
  const cek = (t: string) => masalah(t) === null;
  const b = (t: string) => bersihkanTeks(t);
  let hoaks = 0;
  const pesan: Record<string, Pesan[]> = {};
  const langkah: Langkah[] = [];

  for (const [i, l] of k.langkah.entries()) {
    const id = `${idUnik}-${i + 1}`;
    const situasi = b(l.situasi);
    if (!cek(situasi)) return { galat: `langkah ${i + 1}: situasi memuat ${masalah(situasi)}` };
    if (l.pilihan.filter((p) => p.nilai === 2).length !== 1) return { galat: `langkah ${i + 1}: harus tepat satu pilihan bernilai 2` };
    if (!l.pilihan.some((p) => p.nilai === 0)) return { galat: `langkah ${i + 1}: harus ada pilihan berbahaya (nilai 0)` };
    const pilihan = [];
    for (const p of l.pilihan) {
      const src = p.sourceIds.filter((s) => idOk.has(s));
      if (src.length === 0) return { galat: `langkah ${i + 1}: sourceIds tidak ada di PASSAGE` };
      const teks = b(p.teks);
      const umpanBalik = b(p.umpanBalik);
      // Pilihan KELIRU boleh menggambarkan anggapan yang salah ("merasa rumah pasti aman"): itulah yang dilatih dan
      // dikoreksi umpan baliknya. Jadi penyaring ramalan/jaminan hanya untuk tindakan terbaik dan semua umpan balik;
      // pemeriksaan angka karangan tetap berlaku untuk semua teks.
      const masalahTeks = p.nilai === 2 ? masalah(teks) : angkaBaru(sumberAngka, teks, NOMOR_SAH) ? `angka yang tidak ada di DATA pada "${teks.slice(0, 70)}" (hapus angkanya)` : null;
      const masalahUmpan = masalah(umpanBalik);
      if (masalahTeks || masalahUmpan) return { galat: `langkah ${i + 1}: pilihan memuat ${masalahTeks ?? masalahUmpan}` };
      // Kebocoran eksplisit saja ("(benar)", "jawaban tepat", "pilihan salah"); frasa wajar seperti "dengan benar" boleh.
      if (/\((benar|salah|tepat|keliru)\)|^(benar|salah|tepat|keliru)\b|\b(jawaban|pilihan) (yang )?(benar|salah|tepat|keliru)\b/i.test(teks)) return { galat: `langkah ${i + 1}: teks pilihan membocorkan jawaban` };
      pilihan.push({ teks: teks.slice(0, 170), nilai: p.nilai, umpanBalik: umpanBalik.slice(0, 480), sumber: src[0] });
    }
    if (l.pesan) {
      const ps = l.pesan;
      const teks = b(ps.teks);
      if (ps.hoaks) {
        if (!["medsos", "keluarga"].includes(ps.jenis)) return { galat: "hoaks harus dari medsos atau keluarga" };
        const terbaik = pilihan.find((p) => p.nilai === 2)!;
        if (/teruskan|sebarkan|bagikan/i.test(terbaik.teks)) return { galat: "jawaban terbaik di langkah hoaks tidak boleh meneruskan kabar" };
        hoaks++;
      } else if (!cek(teks)) return { galat: `langkah ${i + 1}: pesan memuat ${masalah(teks)}` };
      if (ps.jenis === "resmi" && /https?:|www\.|\b0\d{8,}/.test(teks)) return { galat: "pesan resmi tidak boleh memuat tautan atau nomor telepon" };
      pesan[id] = [{ dari: b(ps.dari).slice(0, 40), jenis: ps.jenis, jam: ps.jam, teks: teks.slice(0, 320), ...(ps.hoaks ? { hoaks: b(ps.hoaks).slice(0, 360) } : {}) }];
    }
    // Urutan diacak kode (benih tetap) agar jawaban terbaik tidak selalu di posisi yang sama.
    langkah.push({ id, situasi: situasi.slice(0, 560), pilihan: acak(pilihan, `${idUnik}:${i}`) });
  }
  if (hoaks !== 1) return { galat: `harus tepat satu pesan hoaks, ada ${hoaks}` };
  if (e.kedua) {
    const sumberKedua = langkah.flatMap((l) => l.pilihan.map((p) => p.sumber)).filter((id) => id.startsWith(`${e.kedua}-`));
    if (sumberKedua.length === 0) return { galat: `mode beruntun: belum ada pilihan yang mengutip passage ${e.kedua}` };
  }
  const judul = b(k.judul);
  const ringkas = b(k.ringkas);
  if (!cek(judul) || !cek(ringkas)) return { galat: `judul atau ringkasan memuat ${masalah(judul) ?? masalah(ringkas)}` };
  return { skenario: { id: idUnik, hazard: m.hazard, judul: judul.slice(0, 80), ringkas: ringkas.slice(0, 200), langkah }, pesan };
}

/** Cadangan: skenario bank yang ditulis tim untuk bahaya ini (selalu tersedia, tanpa AI). */
export function simulasiCadangan(m: SimulasiRequestT, alasan: string, mulai: number, sekarang: Date, ditolak?: string, e: EkstraSimulasi = ekstraDari(m)): HasilSimulasi {
  const s = skenarioUntuk(m.hazard)!;
  const pesan = Object.fromEntries(s.langkah.flatMap((l) => (PESAN[l.id] ? [[l.id, PESAN[l.id]]] : [])));
  return { mode: "cadangan", dibuatPada: sekarang.toISOString(), skenario: s, pesan, personalisasi: personalisasiDari(m, { ...e, kondisi: null }), meta: { cache: false, durasiMs: Date.now() - mulai, alasanCadangan: alasan, ...(ditolak ? { ditolak } : {}) } };
}

export async function susunSimulasi(m: SimulasiRequestT, d: DepsSimulasi): Promise<HasilSimulasi> {
  const mulai = Date.now();
  const sekarang = d.sekarang?.() ?? new Date();
  const cache = d.cache ?? cacheBawaan;
  const anggaran = d.anggaran ?? anggaranGlobal;
  const batas = d.batasWaktuMs ?? 30_000;
  const kondisi = m.titik && d.kondisiNyata ? await d.kondisiNyata(m).catch(() => null) : null;
  const e = ekstraDari(m, kondisi);
  const idUnik = `ai-${m.hazard}-${hashMasukan(`${m.hazard}|${m.varian}|${m.tingkat}|${e.kedua ?? ""}|${kondisi ?? ""}|${JSON.stringify(m.fokus)}|${JSON.stringify(m.risiko ?? [])}|${m.lokasi.kabKota}|${kunciHari(sekarang)}`, m.profil).slice(0, 10)}`;

  const hit = cache.get(idUnik);
  if (hit) return { ...hit, meta: { ...hit.meta, cache: true, durasiMs: Date.now() - mulai } };
  if (d.providers.length === 0) return simulasiCadangan(m, "ai_nonaktif", mulai, sekarang, undefined, e);

  const passages = pilihPassageSimulasi(d.kb, m.hazard, m.profil, m.fokus.map((f) => f.sumber), e.kedua);
  const user = susunPromptSimulasi(m, passages, e);
  let alasan = "galat";
  let terakhirDitolak = "";
  for (const prov of d.providers) {
    let catatan = "";
    // Sampai 3 percobaan selama waktu cukup: alasan penolakan dikirim balik sehingga percobaan berikutnya terarah.
    for (let percobaan = 0; percobaan < 3; percobaan++) {
      const sisa = batas - (Date.now() - mulai);
      if (percobaan > 0 && sisa < 9000) break;
      if (sisa < 3000) return simulasiCadangan(m, "timeout", mulai, sekarang, terakhirDitolak || undefined, e);
      if (!anggaran.pakai()) return simulasiCadangan(m, "anggaran", mulai, sekarang, undefined, e);
      try {
        const mentah = await prov.hasilJson({
          system: SISTEM_SIMULASI,
          user: catatan ? `${user}\n\nCATATAN: keluaran sebelumnya ditolak (${catatan}). Perbaiki dan keluarkan hanya JSON sesuai bentuk.` : user,
          suhu: 0.7,
          maksTokenKeluaran: 7000,
          timeoutMs: sisa,
        });
        const v = SimulasiKeluaran.safeParse(JSON.parse(mentah));
        if (!v.success) {
          catatan = v.error.issues.slice(0, 3).map((x) => `${x.path.join(".")}: ${x.message}`).join("; ");
          terakhirDitolak = `skema: ${catatan}`;
          alasan = "keluaran_tidak_valid";
          continue;
        }
        const hasil = validasiSimulasi(v.data, passages, m, idUnik, e);
        if ("galat" in hasil) {
          catatan = hasil.galat;
          terakhirDitolak = hasil.galat;
          alasan = "keluaran_tidak_valid";
          continue;
        }
        const jadi: HasilSimulasi = { mode: "ai", dibuatPada: sekarang.toISOString(), ...hasil, personalisasi: personalisasiDari(m, e), meta: { cache: false, durasiMs: Date.now() - mulai } };
        cache.set(idUnik, jadi);
        return jadi;
      } catch (e) {
        if (e instanceof GalatProvider) {
          alasan = e.jenis;
          break; // penyedia ini gagal: coba penyedia berikutnya
        }
        catatan = "JSON tidak dapat dibaca";
        alasan = "keluaran_tidak_valid";
      }
    }
  }
  return simulasiCadangan(m, alasan, mulai, sekarang, terakhirDitolak || undefined, e);
}
