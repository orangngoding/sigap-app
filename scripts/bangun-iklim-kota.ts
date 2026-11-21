// Membuat data proyeksi iklim bawaan untuk kota-kota utama (src/lib/data/proyeksi-kota.json).
//
// Jalankan SETELAH kuota harian Open-Meteo pulih (reset 00.00 UTC = 07.00 WIB):
//   npm run bangun:iklim-kota              (maksimal 8 kota baru, jeda 2 menit)
//   npm run bangun:iklim-kota -- --maks 14 (lebih banyak bila kuota memungkinkan)
//   npm run bangun:iklim-kota -- --kota Bandung
//   npm run bangun:iklim-kota -- --tunggu 0  (jangan menunggu 20 menit bila ditolak)
//
// Aman dijalankan berulang: kota yang sudah ada dilewati, hasil disimpan setelah tiap kota berhasil, dan skrip berhenti
// rapi bila penyedia menolak. Tiap kota memakai satu permintaan proyeksi 60 tahun (berat), jadi jangan menjalankannya
// bersamaan dengan pengujian lain yang memakai Open-Meteo dari jaringan yang sama.
import fs from "node:fs";
import path from "node:path";
import { fetchProyeksi } from "@/lib/data/proyeksi";
import { KOTA_PRIORITAS, type BerkasProyeksiKota } from "@/lib/data/iklim-kota";
import { ApiError } from "@/lib/http/api-error";

const BERKAS = path.join(process.cwd(), "src/lib/data/proyeksi-kota.json");
const arg = (nama: string) => {
  const i = process.argv.indexOf(`--${nama}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const MAKS = Number(arg("maks") ?? 8);
const JEDA_DETIK = Number(arg("jeda") ?? 120);
const HANYA = arg("kota")?.toLowerCase();
const TUNGGU_MENIT = Number(arg("tunggu") ?? 20); // 0 = langsung berhenti bila ditolak
const tidur = (ms: number) => new Promise((r) => setTimeout(r, ms));

function baca(): BerkasProyeksiKota {
  try {
    const b = JSON.parse(fs.readFileSync(BERKAS, "utf8")) as BerkasProyeksiKota;
    return b.versi === 1 && Array.isArray(b.kota) ? b : { versi: 1, dibuat: null, kota: [] };
  } catch {
    return { versi: 1, dibuat: null, kota: [] };
  }
}

(async () => {
  const berkas = baca();
  const ada = new Set(berkas.kota.map((k) => k.nama));
  const antre = KOTA_PRIORITAS.filter((k) => !ada.has(k.nama) && (!HANYA || k.nama.toLowerCase() === HANYA)).slice(0, MAKS);
  console.log(`Sudah ada ${ada.size} kota; akan dibuat ${antre.length}: ${antre.map((k) => k.nama).join(", ") || "-"}`);

  let berhasil = 0;
  let gagalBerturut = 0;
  for (const [i, k] of antre.entries()) {
    let percobaan = 0;
    for (;;) {
      try {
        process.stdout.write(`[${i + 1}/${antre.length}] ${k.nama} ... `);
        const data = await fetchProyeksi(k.lat, k.lon);
        if (!data.bulanan || !data.kemarauTerburuk || data.tahunan.length < 55) throw new Error("bentuk data tidak lengkap");
        berkas.kota.push({ nama: k.nama, lat: k.lat, lon: k.lon, data });
        berkas.dibuat = new Date().toISOString();
        fs.writeFileSync(BERKAS, `${JSON.stringify(berkas)}\n`);
        console.log(`ok (hari sangat panas ${data.periode[0].metrik.hariSangatPanas.rata} -> ${data.periode[2].metrik.hariSangatPanas.rata} per tahun)`);
        berhasil++;
        gagalBerturut = 0;
        break;
      } catch (e) {
        const kode = e instanceof ApiError ? e.code : (e as Error).message;
        console.log(`gagal (${kode})`);
        // Batas per jam bisa pulih dalam 20 menit; batas harian tidak. Satu kali tunggu, lalu berhenti.
        if (e instanceof ApiError && e.code === "BATAS_HULU" && percobaan === 0 && TUNGGU_MENIT > 0) {
          percobaan++;
          console.log(`Penyedia menolak karena batas pemakaian. Menunggu ${TUNGGU_MENIT} menit lalu mencoba sekali lagi (batas per jam)...`);
          await tidur(TUNGGU_MENIT * 60_000);
          continue;
        }
        gagalBerturut++;
        break;
      }
    }
    if (gagalBerturut >= 2 || (gagalBerturut === 1 && berhasil === 0 && i === 0)) {
      console.log("\nBerhenti: penyedia masih menolak. Jalankan lagi setelah kuota harian pulih (07.00 WIB).");
      break;
    }
    if (i < antre.length - 1) await tidur(JEDA_DETIK * 1000);
  }
  console.log(`\nSelesai: ${berhasil} kota baru. Total di berkas: ${berkas.kota.length}.`);
  if (berhasil > 0) console.log("Commit berkas: git add src/lib/data/proyeksi-kota.json && git commit -m \"data: proyeksi iklim bawaan kota utama\"");
})();
