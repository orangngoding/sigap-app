// Jalankan: npx tsx tests/unit/tanya-sesi.test.ts  (sesi percakapan Asisten dan penggabungan transkrip suara)
import assert from "node:assert/strict";
import { cariSesi, judulSesi, kelompokkanSesi, migrasiTanya, potongSesi, MAKS_SESI, type SesiChat } from "@/lib/tanya/sesi";
import { gabungTranskrip, JEDA_KIRIM_MS, TAMPIL_HITUNG_MS } from "@/hooks/use-suara";

let ok = 0;
const tests: Array<[string, () => void]> = [];
const t = (n: string, f: () => void) => tests.push([n, f]);

const NOW = new Date(2026, 10, 18, 15, 0);
const sesi = (id: string, diubah: Date, judul = id, teks = "halo"): SesiChat => ({
  id, judul, dibuat: diubah.toISOString(), diubah: diubah.toISOString(),
  pesan: [{ id: `${id}-1`, peran: "pengguna", teks, waktu: diubah.toISOString() }],
});

t("judul: satu baris, tanpa format, dipotong rapi", () => {
  assert.equal(judulSesi("  Apa itu **BMKG**?\n\n"), "Apa itu BMKG?");
  assert.equal(judulSesi(""), "Percakapan baru");
  const panjang = judulSesi("a".repeat(100));
  assert.ok(panjang.length <= 60 && panjang.endsWith("…"));
});
t("kelompok waktu: hari ini, kemarin, 7 hari, lebih lama", () => {
  const g = kelompokkanSesi([
    sesi("a", new Date(2026, 10, 18, 9)), sesi("b", new Date(2026, 10, 17, 22)),
    sesi("c", new Date(2026, 10, 13)), sesi("d", new Date(2026, 9, 1)),
  ], NOW);
  assert.deepEqual(g.map((x) => [x.judul, x.sesi.map((s) => s.id)]), [["Hari ini", ["a"]], ["Kemarin", ["b"]], ["7 hari terakhir", ["c"]], ["Lebih lama", ["d"]]]);
});
t("cari: judul atau isi pesan, tidak peka huruf besar", () => {
  const daftar = [sesi("a", NOW, "Tas siaga"), sesi("b", NOW, "Gempa", "apa itu SESAR")];
  assert.deepEqual(cariSesi(daftar, "tas").map((s) => s.id), ["a"]);
  assert.deepEqual(cariSesi(daftar, "sesar").map((s) => s.id), ["b"]);
  assert.equal(cariSesi(daftar, "  ").length, 2);
});
t("batas sesi", () => {
  assert.equal(potongSesi(Array.from({ length: 40 }, (_, i) => sesi(String(i), NOW))).length, MAKS_SESI);
});
t("migrasi v1 -> v2: riwayat lama menjadi satu sesi aktif; data rusak tidak melempar", () => {
  const v1 = { pesan: [
    { id: "1", peran: "pengguna", teks: "Apa itu BMKG?", waktu: "2026-11-17T01:00:00Z" },
    { id: "2", peran: "asisten", teks: "BMKG adalah ...", waktu: "2026-11-17T01:00:05Z" },
  ] };
  const m = migrasiTanya(v1, 1);
  assert.equal(m.sesi.length, 1);
  assert.equal(m.aktif, m.sesi[0].id);
  assert.equal(m.sesi[0].judul, "Apa itu BMKG?");
  assert.equal(m.sesi[0].diubah, "2026-11-17T01:00:05Z");
  assert.deepEqual(migrasiTanya({ pesan: [] }, 1), { sesi: [], aktif: null });
  assert.deepEqual(migrasiTanya(null, 1), { sesi: [], aktif: null });
  assert.deepEqual(migrasiTanya({ sesi: "rusak" }, 2), { sesi: [], aktif: null });
});
t("suara: transkrip digabung rapi dan jeda kirim 5-6 detik", () => {
  assert.equal(gabungTranskrip("apa yang", "", "harus  dilakukan", " saat gempa "), "apa yang harus dilakukan saat gempa");
  assert.ok(JEDA_KIRIM_MS >= 5000 && JEDA_KIRIM_MS <= 6000);
  assert.ok(TAMPIL_HITUNG_MS < JEDA_KIRIM_MS);
});

for (const [n, f] of tests) {
  try { f(); ok++; console.log("  ok  ", n); } catch (e) { console.error("  GAGAL", n, "\n", e); process.exitCode = 1; }
}
console.log(`${ok}/${tests.length} lulus`);
