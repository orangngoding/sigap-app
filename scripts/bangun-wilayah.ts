/**
 * Ubah dataset kode wilayah (MIT, github.com/cahyadsn/wilayah, Kepmendagri No 300.2.2-2138 Tahun 2025)
 * menjadi berkas JSON per provinsi di public/data/wilayah/ (Blueprint 12.4).
 *
 * Pemakaian:
 *   npx tsx scripts/bangun-wilayah.ts <wilayah.sql> <wilayah_level_1_2.sql>
 *
 * Catatan koordinat: dataset hanya memuat koordinat sampai tingkat kab/kota. Kelurahan/desa memakai
 * koordinat pusat kab/kota-nya (perkiraan) lewat pewarisan di sisi pemilih lokasi, jadi berkas ini
 * hanya menyimpan lat/lon di tingkat kab/kota.
 */
import { mkdirSync, readFileSync, writeFileSync, rmSync, readdirSync } from "node:fs";
import { join } from "node:path";

const [sqlKode, sqlKoordinat] = process.argv.slice(2);
if (!sqlKode || !sqlKoordinat) {
  console.error("Pemakaian: npx tsx scripts/bangun-wilayah.ts <wilayah.sql> <wilayah_level_1_2.sql>");
  process.exit(1);
}

const lepas = (s: string) => s.replace(/\\'/g, "'").replace(/''/g, "'").replace(/\s+/g, " ").trim();
// Beberapa nama di dataset huruf besar semua; rapikan ke huruf kapital di awal kata.
const KECIL = new Set(["dan", "di", "ke", "dari", "yang", "atau"]);
function rapikanNama(s: string): string {
  return s
    .toLowerCase()
    .replace(/(^|[\s\-/(.])([a-z])/g, (_m, a: string, b: string) => a + b.toUpperCase())
    .split(" ")
    .map((w, i) => (i > 0 && KECIL.has(w.toLowerCase()) ? w.toLowerCase() : w))
    .join(" ")
    .replace(/\b(Dki|Diy|Ntb|Ntt|Pt|Ii|Iii|Iv|Vi|Vii|Viii|Ix|Xi|Xii|Xiii|Xiv|Xv)\b/g, (m) => m.toUpperCase());
}

// ---- wilayah.sql: ('kode','NAMA') ----
const baris = /\('((?:[^'\\]|\\.|'')*)','((?:[^'\\]|\\.|'')*)'\)/g;
const semua = new Map<string, string>();
for (const m of readFileSync(sqlKode, "utf8").matchAll(baris)) {
  const kode = lepas(m[1]);
  if (/^\d{2}(\.\d{2}){0,2}(\.\d{4})?$/.test(kode)) semua.set(kode, rapikanNama(lepas(m[2])));
}

// ---- wilayah_level_1_2.sql: ('kode','nama','ibukota', lat, lng, ... ----
const koordinat = new Map<string, { lat: number; lon: number }>();
const awalBaris = /^\('([\d.]+)','(?:[^'\\]|\\.|'')*',\s*(?:'(?:[^'\\]|\\.|'')*'|NULL),\s*(-?[\d.]+|NULL),\s*(-?[\d.]+|NULL)/;
for (const l of readFileSync(sqlKoordinat, "utf8").split("\n")) {
  const m = awalBaris.exec(l);
  if (!m || m[2] === "NULL" || m[3] === "NULL") continue;
  koordinat.set(m[1], { lat: Math.round(Number(m[2]) * 1e4) / 1e4, lon: Math.round(Number(m[3]) * 1e4) / 1e4 });
}

interface Kel { kode: string; nama: string }
interface Kec { kode: string; nama: string; kelurahan: Kel[] }
interface Kab { kode: string; nama: string; lat?: number; lon?: number; kecamatan: Kec[] }
interface Prov { kode: string; nama: string; kabKota: Kab[] }

const urut = <T extends { kode: string }>(a: T[]) => a.sort((x, y) => x.kode.localeCompare(y.kode));
const provMap = new Map<string, Prov>();
const kabMap = new Map<string, Kab>();
const kecMap = new Map<string, Kec>();
let jumlahKel = 0;
const kode = [...semua.keys()].sort();

for (const k of kode) {
  const p = k.split(".");
  const nama = semua.get(k)!;
  if (p.length === 1) provMap.set(k, { kode: k, nama, kabKota: [] });
  else if (p.length === 2) {
    const kab: Kab = { kode: k, nama, ...(koordinat.get(k) ?? {}), kecamatan: [] };
    kabMap.set(k, kab);
    provMap.get(p[0])?.kabKota.push(kab);
  } else if (p.length === 3) {
    const kec: Kec = { kode: k, nama, kelurahan: [] };
    kecMap.set(k, kec);
    kabMap.get(`${p[0]}.${p[1]}`)?.kecamatan.push(kec);
  } else {
    kecMap.get(`${p[0]}.${p[1]}.${p[2]}`)?.kelurahan.push({ kode: k, nama });
    jumlahKel++;
  }
}

// Koreksi kesalahan data sumber (dilaporkan ke pengelola dataset). Setiap koreksi wajib berkomentar alasan.
const KOREKSI_KOORDINAT: Record<string, { lat?: number; lon?: number }> = {
  // Sumber menulis lon 23.5389 (di Afrika); poligon batas di baris yang sama berada di sekitar 123.58.
  "74.07": { lon: 123.5389 },
};
for (const [k, fix] of Object.entries(KOREKSI_KOORDINAT)) {
  const kab = kabMap.get(k);
  if (kab) Object.assign(kab, fix);
}
// Jaga kewajaran: semua kab/kota harus berada di kotak batas Indonesia, bila tidak build data gagal.
const diLuar = [...kabMap.values()].filter((k) => k.lat !== undefined && k.lon !== undefined && !(k.lat > -12 && k.lat < 7 && k.lon > 94 && k.lon < 142));
if (diLuar.length) {
  console.error(`GAGAL: koordinat di luar Indonesia: ${diLuar.map((k) => `${k.nama} (${k.lat}, ${k.lon})`).join("; ")}`);
  process.exit(1);
}

const tanpaKoordinat =[...kabMap.values()].filter((k) => k.lat === undefined);
const keluar = join(process.cwd(), "public", "data", "wilayah");
mkdirSync(keluar, { recursive: true });
for (const f of readdirSync(keluar)) if (f.endsWith(".json")) rmSync(join(keluar, f));

const daftar = urut([...provMap.values()]);
for (const p of daftar) {
  urut(p.kabKota).forEach((kab) => urut(kab.kecamatan).forEach((kec) => urut(kec.kelurahan)));
  writeFileSync(join(keluar, `${p.kode}.json`), JSON.stringify(p));
}
writeFileSync(join(keluar, "provinsi.json"), JSON.stringify(daftar.map((p) => ({ kode: p.kode, nama: p.nama }))));
// Indeks ringan seluruh kab/kota untuk "Gunakan lokasi saya" (kab/kota terdekat dari koordinat peramban).
writeFileSync(
  join(keluar, "kabkota.json"),
  JSON.stringify(
    daftar.flatMap((p) =>
      p.kabKota.filter((k) => k.lat !== undefined && k.lon !== undefined).map((k) => ({ kode: k.kode, nama: k.nama, prov: p.kode, lat: k.lat, lon: k.lon })),
    ),
  ),
);

console.log(`${daftar.length} provinsi, ${kabMap.size} kab/kota, ${kecMap.size} kecamatan, ${jumlahKel} kelurahan/desa.`);
if (tanpaKoordinat.length) console.warn(`PERINGATAN: ${tanpaKoordinat.length} kab/kota tanpa koordinat: ${tanpaKoordinat.slice(0, 5).map((k) => k.nama).join(", ")}`);
