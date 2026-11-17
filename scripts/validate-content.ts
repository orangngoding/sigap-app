// Jalankan: npm run validate:content
// Hanya galat struktur (skema, id ganda, berkas salah tempat, kata terlarang) yang menggagalkan.
// Jumlah potongan di bawah minimum hanya peringatan: bahaya itu otomatis berstatus "Segera" (Blueprint 2.4).
import { MIN_PENINJAU } from "../src/lib/kb/schema";
import { muatKonten } from "./muat-konten";

const h = muatKonten();
for (const g of h.galat) console.error("GALAT      ", g);
for (const p of h.peringatan) console.warn("PERINGATAN ", p);
console.log(`\n${h.chunks.length} potongan dibaca.`);
for (const [k, v] of Object.entries(h.pack)) {
  if (v.jumlah === 0) continue;
  const tinjau = MIN_PENINJAU > 0 ? `  ditinjau ${v.ditinjau}` : "";
  console.log(`  ${k.padEnd(16)} ${v.jumlah}/${v.minimum}${tinjau}  ${v.siap ? "AKTIF" : "segera"}`);
}
process.exit(h.galat.length > 0 ? 1 : 0);
