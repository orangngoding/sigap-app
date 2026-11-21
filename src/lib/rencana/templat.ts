import type { Group, HazardId, Phase, ProfilAnonim } from "@/types";
import type { RencanaTersimpan, Tindakan } from "@/types/rencana";
import { hitungFaktorKerentanan } from "@/lib/preparedness/faktor";
import { hitungTas } from "@/lib/preparedness/tas";
import type { Chunk } from "@/lib/kb/schema";
import { hashMasukan } from "./hash";
import { HAZARD_BY_ID } from "@/lib/hazards/hazards";
import type { RisikoRingkas } from "@/lib/ai/schema";

const BOBOT = { tinggi: 3, sedang: 2, rendah: 1 } as const;
const URUT_FASE: Phase[] = ["sebelum", "saat", "sesudah"];
const MAKS_UMUM = 6;

export function kelompokProfil(p: ProfilAnonim): Group[] {
  const g: Group[] = [];
  if (p.lansia > 0) g.push("lansia");
  if (p.balita > 0) g.push("balita");
  if (p.disabilitas > 0) g.push("disabilitas");
  if (p.hamil > 0) g.push("hamil");
  return g;
}

/** Skor kecocokan potongan (Blueprint 9.4). */
export function skorChunk(c: Chunk, p: ProfilAnonim): number {
  const grup = kelompokProfil(p);
  let s = BOBOT[c.priority];
  if (c.audience.some((a) => a !== "umum" && grup.includes(a))) s += 2;
  if (c.hazard !== "umum") s += 1;
  if (c.varian?.some((v) => p.varianBanjir.includes(v))) s += 1;
  return s;
}

export function relevan(c: Chunk, p: ProfilAnonim): boolean {
  if (c.hazard !== "umum" && !p.bahaya.includes(c.hazard as HazardId)) return false;
  // Potongan khusus kelompok hanya tampil bila keluarga memiliki anggota tersebut.
  if (!c.audience.includes("umum")) {
    const grup = kelompokProfil(p);
    if (!c.audience.some((a) => grup.includes(a))) return false;
  }
  if (c.varian && c.hazard === "banjir" && p.varianBanjir.length > 0 && !c.varian.some((v) => p.varianBanjir.includes(v))) return false;
  return true;
}

export function pilihChunk(kb: Chunk[], p: ProfilAnonim): Chunk[] {
  const maks = p.bahaya.length > 2 ? 3 : 5;
  const hasil: Chunk[] = [];
  const urutan = ["umum", ...p.bahaya];
  for (const fase of URUT_FASE) {
    for (const h of urutan) {
      const batas = h === "umum" ? MAKS_UMUM : maks;
      const kandidat = kb
        .filter((c) => c.phase === fase && c.hazard === h && relevan(c, p))
        .map((c, i) => ({ c, s: skorChunk(c, p), i }))
        .sort((a, b) => b.s - a.s || a.i - b.i)
        .slice(0, batas)
        .map((x) => x.c);
      hasil.push(...kandidat);
    }
  }
  return hasil;
}

export const actionIdDari = (c: Chunk): string => `${c.hazard}:${c.phase}:${c.id}`;

export function chunkKeTindakan(c: Chunk): Tindakan {
  return {
    actionId: actionIdDari(c),
    hazard: c.hazard as Tindakan["hazard"],
    phase: c.phase,
    title: c.title,
    detail: c.body,
    priority: c.priority,
    forGroups: c.audience as Group[],
    sourceIds: [c.id],
  };
}

/** Ringkasan risiko templat (Blueprint 9.4 butir 5). Tanpa prediksi. */
export function ringkasanTemplat(namaLokasi: string, bahaya: HazardId[], faktor: string[], risiko?: RisikoRingkas): string {
  const namaBahaya = bahaya.map((h) => HAZARD_BY_ID[h].label.toLowerCase()).join(", ");
  const bagianFaktor = faktor.length > 0 ? ` Faktor yang perlu diperhatikan: ${faktor.join(", ").toLowerCase()}.` : "";
  // Dua fakta risiko tinggi pertama dari data lokasi (untuk bahaya yang ada di rencana), apa adanya.
  const fakta = (risiko ?? []).filter((r) => r.tingkat === "tinggi" && bahaya.includes(r.id) && r.alasan[0]).slice(0, 2).map((r) => r.alasan[0]);
  const bagianData = fakta.length > 0 ? ` Menurut data lokasi: ${fakta.join(" ")}` : "";
  return `Untuk ${namaLokasi}, rencana ini berfokus pada ${namaBahaya}.${bagianData}${bagianFaktor} Rencana disusun dari panduan resmi dan jawaban Anda; periksa peringatan resmi BMKG dan arahan BPBD.`;
}

export interface MasukanTemplat {
  adm4: string;
  /** Nama kelurahan untuk ringkasan risiko; bila kosong dipakai kalimat netral. */
  namaLokasi?: string;
  profil: ProfilAnonim;
  kb: Chunk[];
  sorotan?: string[];
  sekarang?: Date;
  /** Profil Risiko Lokasi: fakta risiko tinggi disebut di ringkasan. */
  risiko?: RisikoRingkas;
}

/** Rencana cadangan tanpa AI: deterministik, hanya memakai potongan KB terverifikasi (Blueprint 9.4). */
export function bangunRencanaTemplat(m: MasukanTemplat): RencanaTersimpan {
  const tindakan = pilihChunk(m.kb, m.profil).map(chunkKeTindakan);
  const faktor = hitungFaktorKerentanan(m.profil);
  const sorotan = m.sorotan ?? [];
  const dasar = ringkasanTemplat(m.namaLokasi ?? "lokasi Anda", m.profil.bahaya, faktor, m.risiko);
  const ringkasan = [dasar, ...sorotan].join(" ");
  return {
    versi: 1,
    dibuatPada: (m.sekarang ?? new Date()).toISOString(),
    mode: "cadangan",
    hashMasukan: hashMasukan(m.adm4, m.profil),
    lokasiAdm4: m.adm4,
    ringkasanRisiko: ringkasan,
    faktorKerentanan: faktor,
    tindakan,
    tas: hitungTas(m.profil),
    rekomendasiEdukasi: [],
    catatanKeterbatasan:
      "Rencana disusun otomatis dari kumpulan panduan yang terbatas dan belum tentu mencakup semua kondisi rumah Anda. Ikuti arahan resmi BNPB, BPBD, dan BMKG.",
    perluDiperbarui: false,
  };
}
