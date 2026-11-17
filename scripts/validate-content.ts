// Jalankan: npm run validate:content [-- --strict]
// Tanpa --strict: hanya galat struktur yang menggagalkan. Dengan --strict: kekurangan jumlah/peninjau ikut menggagalkan (untuk rilis).
import { muatKonten } from "./muat-konten";

const strict = process.argv.includes("--strict");
const h = muatKonten();
for (const g of h.galat) console.error("GALAT      ", g);
for (const p of h.peringatan) console.warn(strict ? "GALAT      " : "PERINGATAN ", p);
console.log(`\n${h.chunks.length} potongan dibaca.`);
for (const [k, v] of Object.entries(h.pack)) if (v.jumlah > 0) console.log(`  ${k.padEnd(14)} ${v.jumlah}/${v.minimum}  ditinjau ${v.ditinjau}  ${v.siap ? "SIAP" : "belum siap"}`);
process.exit(h.galat.length > 0 || (strict && h.peringatan.length > 0) ? 1 : 0);
