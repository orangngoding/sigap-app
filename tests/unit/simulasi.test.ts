// Jalankan: npx tsx tests/unit/simulasi.test.ts  (Simulasi: situasi berdiri sendiri, meter keselamatan, terapkan di rumah)
import assert from "node:assert/strict";
import { SKENARIO, SKENARIO_BY_ID } from "@/lib/latihan/skenario";
import { cariLangkah, pelajaranDari, teksBagikanLatihan, type Jawaban } from "@/lib/latihan/mesin";
import { AWAL_KESELAMATAN, meterKeselamatan } from "@/lib/latihan/keselamatan";
import { lolosPenyaring } from "@/lib/ai/guardrails";
import type { Tindakan } from "@/types/rencana";

let ok = 0;
const tests: Array<[string, () => void]> = [];
const t = (n: string, f: () => void) => tests.push([n, f]);

t("situasi berdiri sendiri (tanpa notifikasi terpisah): tidak merujuk 'pesan itu', tanpa tautan, lolos penyaring", () => {
  for (const s of SKENARIO) for (const l of [...s.langkah, ...(s.cabang ?? [])]) {
    assert.doesNotMatch(l.situasi, /\b(pesan|kabar|notifikasi) (itu|tadi|tersebut)\b/i, `${l.id}: ${l.situasi}`);
    assert.doesNotMatch(l.situasi, /https?:|www\./, l.id);
    assert.ok(lolosPenyaring(l.situasi), `${l.id}: ${l.situasi}`);
  }
});

t("langkah tentang pesan berantai: jawaban terbaik tidak menyebarkannya", () => {
  for (const s of SKENARIO) for (const l of [...s.langkah, ...(s.cabang ?? [])]) {
    if (!/pesan berantai/i.test(l.situasi)) continue;
    const terbaik = l.pilihan.find((p) => p.nilai === 2)!;
    assert.doesNotMatch(terbaik.teks, /teruskan|sebarkan|bagikan/i, `${s.id}/${l.id}: ${terbaik.teks}`);
  }
});

t("meter keselamatan: tepat +15, kurang tepat -5, berbahaya -20, dibatasi 0-100", () => {
  assert.deepEqual(meterKeselamatan([2, 2, 2]), [75, 90, 100]);
  assert.deepEqual(meterKeselamatan([0, 0, 0, 0]), [40, 20, 0, 0]);
  assert.deepEqual(meterKeselamatan([1]), [AWAL_KESELAMATAN - 5]);
});

const gempa = SKENARIO_BY_ID["gempa-malam"];
const idxNilai = (langkahId: string, nilai: 0 | 1 | 2) => cariLangkah(gempa, langkahId)!.pilihan.findIndex((p) => p.nilai === nilai);

t("terapkan di rumah: keputusan keliru dicocokkan ke tindakan rencana yang bersumber sama", () => {
  const g2Terbaik = cariLangkah(gempa, "g2")!.pilihan.find((p) => p.nilai === 2)!;
  const tindakan = [
    { actionId: "gempa:sesudah:x", hazard: "gempa", phase: "sesudah", title: "Keluar lewat tangga, bukan lift", detail: "d", priority: "tinggi", forGroups: ["umum"], sourceIds: [g2Terbaik.sumber] },
    { actionId: "banjir:sebelum:y", hazard: "banjir", phase: "sebelum", title: "Bersihkan saluran", detail: "d", priority: "rendah", forGroups: ["umum"], sourceIds: ["banjir-sebelum-001"] },
  ] as Tindakan[];
  const jawaban: Jawaban[] = [{ langkahId: "g1", pilihan: idxNilai("g1", 2) }, { langkahId: "g2", pilihan: idxNilai("g2", 0) }];
  const p = pelajaranDari(gempa, jawaban, tindakan);
  assert.equal(p.length, 1);
  assert.equal(p[0].langkahId, "g2");
  assert.deepEqual(p[0].tindakan.map((x) => x.actionId), ["gempa:sesudah:x"]);
  assert.equal(pelajaranDari(gempa, jawaban).at(0)?.tindakan.length, 0); // tanpa rencana: tetap ada pelajaran
});

t("teks berbagi: hal yang perlu diingat, tanpa data pribadi", () => {
  const jawaban: Jawaban[] = [{ langkahId: "g2", pilihan: idxNilai("g2", 0) }];
  const teks = teksBagikanLatihan(gempa, jawaban);
  assert.match(teks, /Yang perlu kita ingat/);
  assert.match(teks, /tangga/i);
  const sempurna = teksBagikanLatihan(gempa, gempa.langkah.map((l) => ({ langkahId: l.id, pilihan: idxNilai(l.id, 2) })));
  assert.equal(sempurna.split("\n").filter((x) => /^\d\./.test(x)).length, 3);
});

for (const [n, f] of tests) {
  try { f(); ok++; console.log("  ok  ", n); } catch (e) { console.error("  GAGAL", n, "\n", e); process.exitCode = 1; }
}
console.log(`${ok}/${tests.length} lulus`);
