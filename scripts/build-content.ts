// Jalankan: npm run build:content  -> menulis src/generated/kb-index.json
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { muatKonten } from "./muat-konten";

const h = muatKonten();
if (h.galat.length > 0) {
  for (const g of h.galat) console.error("GALAT", g);
  process.exit(1);
}
const out = join(process.cwd(), "src", "generated");
mkdirSync(out, { recursive: true });
writeFileSync(join(out, "kb-index.json"), JSON.stringify({ chunks: h.chunks, pack: h.pack }, null, 2) + "\n");
writeFileSync(join(out, "pack-status.json"), JSON.stringify(Object.fromEntries(Object.entries(h.pack).map(([k, v]) => [k, { jumlah: v.jumlah, minimum: v.minimum }])), null, 2) + "\n");
copyFileSync(join(process.cwd(), "content", "kontak.json"), join(out, "kontak.json"));
console.log(`kb-index.json: ${h.chunks.length} potongan`);

// ---------- Pustaka: artikel disusun dari potongan KB terverifikasi (tanpa klaim baru) ----------
const Artikel = z.array(
  z.object({
    slug: z.string().regex(/^[a-z0-9-]+$/),
    title: z.string().min(5).max(90),
    ringkasan: z.string().min(10).max(160),
    hazards: z.array(z.string()).min(1),
    kategori: z.enum(["Bencana", "Iklim", "Keluarga", "Komunitas"]), // Blueprint 8.4
    intro: z.string().min(10).max(300),
    bagian: z
      .array(
        z.object({
          judul: z.string().min(3).max(60),
          hazard: z.string().optional(),
          phase: z.enum(["sebelum", "saat", "sesudah"]).optional(),
          audienceKhusus: z.boolean().optional(),
          maks: z.number().int().min(1).max(12).optional(), // bawaan MAKS_BUTIR agar artikel tetap pendek
        }),
      )
      .min(1),
  }),
);
// Blueprint 8.4: artikel maksimal sekitar 500 kata. Butir berprioritas tinggi didahulukan, urutan KB dipertahankan.
const MAKS_BUTIR = 5;
const BOBOT = { tinggi: 3, sedang: 2, rendah: 1 } as const;
const artikel = Artikel.parse(JSON.parse(readFileSync(join(process.cwd(), "content", "pustaka", "artikel.json"), "utf8")));
const ada = new Set<string>();
const hasilArtikel = artikel.map((a) => {
  if (ada.has(a.slug)) throw new Error(`slug ganda: ${a.slug}`);
  ada.add(a.slug);
  const sumber = new Map<string, { judul: string; url: string }>();
  const bagian = a.bagian.map((b) => {
    const butir = h.chunks
      .filter((c) => (b.audienceKhusus ? c.audience.some((g) => g !== "umum") : c.hazard === b.hazard && c.phase === b.phase))
      .map((c, i) => ({ c, i }))
      .sort((x, y) => BOBOT[y.c.priority] - BOBOT[x.c.priority] || x.i - y.i)
      .slice(0, b.maks ?? MAKS_BUTIR)
      .map(({ c }) => {
        sumber.set(c.sourceUrl, { judul: c.sourceTitle.replace(/,?\s*hlm\..*$/, ""), url: c.sourceUrl });
        return { id: c.id, judul: c.title, isi: c.body, darurat: c.darurat, ...(c.turunan ? { turunan: c.turunan } : {}) };
      });
    if (butir.length === 0) throw new Error(`artikel ${a.slug}, bagian "${b.judul}" kosong`);
    return { judul: b.judul, butir };
  });
  const jumlahKata = bagian.flatMap((b) => b.butir).reduce((n, x) => n + (x.judul + " " + x.isi).split(/\s+/).length, 0);
  return { slug: a.slug, title: a.title, ringkasan: a.ringkasan, hazards: a.hazards, kategori: a.kategori, intro: a.intro, menit: Math.max(1, Math.round(jumlahKata / 180)), bagian, sumber: [...sumber.values()] };
});
writeFileSync(join(out, "pustaka-index.json"), JSON.stringify(hasilArtikel, null, 2) + "\n");
console.log(`pustaka-index.json: ${hasilArtikel.length} artikel`);
