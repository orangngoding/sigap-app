// Pemuat dan pemeriksa konten KB. Dipakai validate-content.ts dan build-content.ts.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ChunkSchema, MIN_PENINJAU, MIN_POTONGAN, type Chunk } from "../src/lib/kb/schema";

export interface HasilMuat {
  chunks: Chunk[];
  galat: string[];
  peringatan: string[];
  pack: Record<string, { jumlah: number; minimum: number; ditinjau: number; siap: boolean }>;
}

export function muatKonten(root = process.cwd()): HasilMuat {
  const dir = join(root, "content", "kb");
  const galat: string[] = [];
  const peringatan: string[] = [];
  const chunks: Chunk[] = [];
  const idSudah = new Set<string>();

  for (const f of readdirSync(dir).filter((n) => n.endsWith(".json")).sort()) {
    let mentah: unknown;
    try {
      mentah = JSON.parse(readFileSync(join(dir, f), "utf8"));
    } catch (e) {
      galat.push(`${f}: JSON tidak valid (${(e as Error).message})`);
      continue;
    }
    if (!Array.isArray(mentah)) {
      galat.push(`${f}: isi berkas harus berupa larik potongan`);
      continue;
    }
    mentah.forEach((m, i) => {
      const r = ChunkSchema.safeParse(m);
      const label = `${f}[${i}]${(m as { id?: string })?.id ? ` (${(m as { id: string }).id})` : ""}`;
      if (!r.success) {
        for (const is of r.error.issues) galat.push(`${label}: ${is.path.join(".")} ${is.message}`);
        return;
      }
      const c = r.data;
      if (idSudah.has(c.id)) galat.push(`${label}: id ganda`);
      idSudah.add(c.id);
      if (f !== `${c.hazard}.json`) galat.push(`${label}: hazard "${c.hazard}" berada di berkas yang salah`);
      if (/akan terjadi|pasti aman|dijamin/i.test(`${c.title} ${c.body}`)) galat.push(`${label}: memuat kata janji/prediksi yang dilarang`);
      if (c.accessedAt > new Date().toISOString().slice(0, 10)) galat.push(`${label}: accessedAt di masa depan`);
      chunks.push(c);
    });
  }

  const pack: HasilMuat["pack"] = {};
  for (const [h, minimum] of Object.entries(MIN_POTONGAN)) {
    const milik = chunks.filter((c) => c.hazard === h);
    const ditinjau = milik.filter((c) => c.reviewedBy.length >= MIN_PENINJAU).length;
    const siap = milik.length >= minimum && ditinjau === milik.length && milik.length > 0;
    pack[h] = { jumlah: milik.length, minimum, ditinjau, siap };
    if (milik.length < minimum) peringatan.push(`${h}: ${milik.length}/${minimum} potongan`);
    if (milik.length > 0 && ditinjau < milik.length) peringatan.push(`${h}: ${milik.length - ditinjau} potongan belum punya ${MIN_PENINJAU} peninjau`);
  }
  return { chunks, galat, peringatan, pack };
}
