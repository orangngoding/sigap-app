// Jalankan: npx tsx tests/unit/cadangan.test.ts  (cadangan dan pemulihan data di perangkat)
import assert from "node:assert/strict";
import { bacaCadangan, ringkasIsi, MAKS_BYTE_CADANGAN } from "@/lib/data-saya/cadangan";

let ok = 0;
const tests: Array<[string, () => void]> = [];
const t = (n: string, f: () => void) => tests.push([n, f]);

const file = (data: Record<string, unknown>, diekspor = "2026-11-18T08:00:00.000Z") => JSON.stringify({ aplikasi: "SIGAP", diekspor, data });

t("cadangan sah: kunci store dipulihkan sebagai JSON, cache dan kunci asing dilewati", () => {
  const h = bacaCadangan(file({
    "sigap:v1:lokasi": { state: { lokasi: { kelurahan: "Cawang" } }, version: 1 },
    "sigap:v1:tanya": { state: { sesi: [], aktif: null }, version: 2 },
    "sigap:v1:cache:cuaca:31.75": { data: {} },
    "kunci-lain": { state: {} },
  }));
  assert.ok(h.ok);
  if (!h.ok) return;
  assert.deepEqual(Object.keys(h.isi.kunci).sort(), ["sigap:v1:lokasi", "sigap:v1:tanya"]);
  assert.equal(JSON.parse(h.isi.kunci["sigap:v1:lokasi"]).state.lokasi.kelurahan, "Cawang");
  assert.deepEqual(h.isi.dilewati.sort(), ["kunci-lain", "sigap:v1:cache:cuaca:31.75"]);
  assert.deepEqual(ringkasIsi(h.isi), ["lokasi", "riwayat Asisten"]);
  assert.equal(h.isi.diekspor, "2026-11-18T08:00:00.000Z");
});
t("file rusak, bukan cadangan, kosong, atau nilai bukan store ditolak dengan pesan jelas", () => {
  assert.equal(bacaCadangan("bukan json").ok, false);
  assert.equal(bacaCadangan(JSON.stringify([1, 2])).ok, false);
  assert.equal(bacaCadangan(JSON.stringify({ data: [] })).ok, false);
  assert.equal(bacaCadangan(file({})).ok, false);
  assert.equal(bacaCadangan(file({ "sigap:v1:profil": "<script>" })).ok, false);
  const h = bacaCadangan(file({ "sigap:v1:profil": { state: {} } }, "bukan tanggal"));
  assert.ok(h.ok && h.isi.diekspor === null);
});
t("file terlalu besar ditolak", () => {
  assert.equal(bacaCadangan("x".repeat(MAKS_BYTE_CADANGAN + 1)).ok, false);
});

for (const [n, f] of tests) {
  try { f(); ok++; console.log("  ok  ", n); } catch (e) { console.error("  GAGAL", n, "\n", e); process.exitCode = 1; }
}
console.log(`${ok}/${tests.length} lulus`);
