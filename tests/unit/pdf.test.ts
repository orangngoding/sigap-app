// Kartu Siaga PDF (Blueprint 8.1): selalu satu halaman, teks asli; A4 memuat profil terpanjang tanpa terpangkas.
import assert from "node:assert/strict";
import { buatPdfKartu, namaBerkasKartu, type IsiKartuPdf } from "@/lib/kartu/pdf";
import { HAZARDS } from "@/lib/hazards/hazards";
import { SEMUA_CHUNK } from "@/lib/kb/data";
import kontak from "@/generated/kontak.json";

let lulus = 0; const gagal: string[] = [];
const uji = async (nama: string, fn: () => Promise<void> | void) => { try { await fn(); lulus++; console.log("OK   ", nama); } catch (e) { gagal.push(nama); console.log("GAGAL", nama, "->", (e as Error).message.split("\n")[0]); } };

const dasar: IsiKartuPdf = {
  ukuran: "A4",
  namaKeluarga: "Keluarga Contoh",
  dibuat: "17 November 2026",
  lokasi: "Gambir, Kec. Gambir, Kota Administrasi Jakarta Pusat",
  bahaya: ["Banjir", "Gempa Bumi"],
  kontakNasional: kontak.kontak,
  kontakKeluarga: [{ nama: "Ibu", telepon: "0812 0000 0000" }],
  titikKumpul: "Lapangan RW 05",
  langkah: [{ bahaya: "Banjir", langkah: ["Matikan listrik", "Mengungsi lebih awal"] }],
  tas: ["36 liter air minum", "36 porsi makanan siap makan"],
  urlDarurat: "https://sigap.example/darurat",
};

// Kasus terburuk dalam batas blueprint: 9 bahaya, 3 kontak panjang, 10 langkah (judul Saat NYATA terpanjang dari KB),
// 10 item tas, titik kumpul 80 huruf, catatan 200 huruf, nama keluarga 40 huruf.
const judulSaat = SEMUA_CHUNK.filter((c) => c.phase === "saat").map((c) => c.title).sort((a, b) => b.length - a.length);
const terpanjang: IsiKartuPdf = {
  ...dasar,
  namaKeluarga: "K".repeat(40),
  lokasi: "Kelurahan Contoh, Kec. Kecamatan Contoh, Kabupaten Administrasi Kepulauan Seribu",
  bahaya: HAZARDS.map((h) => h.label),
  kontakKeluarga: [1, 2, 3].map(() => ({ nama: "N".repeat(30), telepon: "+62 812 3456 7890" })),
  titikKumpul: "T".repeat(80),
  langkah: HAZARDS.slice(0, 5).map((h, i) => ({ bahaya: h.label, langkah: [judulSaat[i * 2], judulSaat[i * 2 + 1]] })),
  tas: ["36 liter air minum", "36 porsi makanan siap makan", "3 hari susu atau makanan bayi", "1 buah kotak P3K", "7 hari obat rutin", "12 buah masker", "18 buah popok", "1 set perlengkapan ibu hamil", "1 set sabun dan pembersih tangan", "1 set salinan dokumen penting"],
  catatan: "Alergi ".repeat(28).slice(0, 200),
};

const isi = async (x: IsiKartuPdf) => {
  const h = await buatPdfKartu(x);
  const t = Buffer.from(await h.blob.arrayBuffer()).toString("latin1");
  return { ...h, t, halaman: (t.match(/\/Type\s*\/Page\b/g) ?? []).length };
};

(async () => {
  await uji("pdf: profil biasa menghasilkan PDF satu halaman berisi teks asli", async () => {
    const r = await isi(dasar);
    assert.equal(r.halaman, 1);
    assert.equal(r.terpangkas, false);
    assert.ok(r.t.startsWith("%PDF-"));
    assert.ok(r.t.includes("KARTU SIAGA KELUARGA") && r.t.includes("BPBD setempat") && r.t.includes("Jalur keluar"));
  });
  await uji("pdf: A4 memuat profil terpanjang tanpa ada yang terpangkas (kriteria penerimaan 8.1)", async () => {
    const r = await isi(terpanjang);
    assert.equal(r.halaman, 1);
    assert.equal(r.terpangkas, false);
    assert.ok(!r.t.includes("dipangkas agar muat"));
  });
  await uji("pdf: A5 tetap satu halaman; bila tidak muat, dipangkas dengan tanda dan dilaporkan", async () => {
    const r = await isi({ ...terpanjang, ukuran: "A5" });
    assert.equal(r.halaman, 1);
    assert.equal(r.terpangkas, r.t.includes("dipangkas agar muat"));
  });
  await uji("pdf: isi berlebih tidak pernah dipecah ke halaman kedua", async () => {
    const r = await isi({ ...dasar, ukuran: "A5", tas: Array.from({ length: 60 }, (_, i) => `item ${i}`) });
    assert.equal(r.halaman, 1);
    assert.equal(r.terpangkas, true);
  });
  await uji("pdf: nama berkas Kartu-Siaga-{kelurahan}.pdf aman", () => {
    assert.equal(namaBerkasKartu("Gambir"), "Kartu-Siaga-Gambir.pdf");
    assert.equal(namaBerkasKartu("Pulau Panggang / Utara"), "Kartu-Siaga-Pulau-Panggang-Utara.pdf");
    assert.equal(namaBerkasKartu("  "), "Kartu-Siaga-Keluarga.pdf");
  });

  console.log(`\n${lulus} lulus, ${gagal.length} gagal`);
  process.exit(gagal.length ? 1 : 0);
})();
