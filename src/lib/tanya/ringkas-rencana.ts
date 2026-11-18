// Ringkasan rencana keluarga untuk Asisten: hanya judul tindakan, nama isi tas, dan angka. Tanpa nama, kontak,
// titik kumpul, atau catatan. Murni agar bisa diuji.
import type { RingkasRencana } from "@/lib/ai/schema";
import type { Progres, RencanaTersimpan } from "@/types/rencana";
import { bangunButir, hitungSkor } from "@/lib/preparedness/skor";
import { AMBANG_LULUS, hazardLatihan } from "@/lib/latihan/mesin";
import { SKENARIO } from "@/lib/latihan/skenario";
import { ringkasPengingat, type PetaKedaluwarsa } from "@/lib/rencana/pengingat";

const URUT_PRIORITAS = { tinggi: 0, sedang: 1, rendah: 2 } as const;
const potong = (s: string) => (s.length > 110 ? `${s.slice(0, 109)}…` : s);

export function ringkasRencana(
  rencana: Pick<RencanaTersimpan, "tindakan" | "tas" | "mode"> | null,
  progres: Progres,
  kedaluwarsa: PetaKedaluwarsa,
  hasilLatihan: Record<string, { terbaik: number }>,
  now = new Date(),
): RingkasRencana | undefined {
  if (!rencana || rencana.mode === "contoh") return undefined;
  const latihan = hazardLatihan(rencana.tindakan);
  const skor = hitungSkor(bangunButir(rencana.tindakan, rencana.tas, latihan), progres);
  const belum = rencana.tindakan
    .filter((t) => t.phase !== "sesudah" && !progres[t.actionId])
    .sort((a, b) => URUT_PRIORITAS[a.priority] - URUT_PRIORITAS[b.priority])
    .slice(0, 6)
    .map((t) => potong(t.title));
  const tasBelum = rencana.tas.filter((i) => !progres[`tas:${i.id}`]).slice(0, 8).map((i) => potong(i.nama));
  const p = ringkasPengingat(rencana.tas, kedaluwarsa, now);
  const tasKedaluwarsa = [...p.lewat.map((i) => `${i.nama} (sudah lewat)`), ...p.segera.map((i) => `${i.nama} (${i.sisa} hari lagi)`)].slice(0, 6).map(potong);
  const skenario = SKENARIO.filter((s) => latihan.includes(s.hazard));
  return {
    skor: skor.skor,
    label: skor.label,
    belumDikerjakan: belum,
    tasBelumSiap: tasBelum,
    tasKedaluwarsa,
    latihanTotal: skenario.length || undefined,
    latihanLulus: skenario.length ? skenario.filter((s) => (hasilLatihan[s.id]?.terbaik ?? 0) >= AMBANG_LULUS).length : undefined,
  };
}
