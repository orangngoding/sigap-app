// Jalankan: npx tsx tests/unit/rencana.test.ts
import assert from "node:assert/strict";
import { SEMUA_CHUNK } from "@/lib/kb/data";
import { ChunkSchema } from "@/lib/kb/schema";
import { anonimkan, hashMasukan } from "@/lib/rencana/hash";
import { bangunSorotan } from "@/lib/rencana/sorotan";
import type { Chunk } from "@/lib/kb/schema";
import { actionIdDari, bangunRencanaTemplat, pilihChunk, skorChunk } from "@/lib/rencana/templat";
import { bangunButir, hitungSkor } from "@/lib/preparedness/skor";
import { buatProfilContoh } from "@/lib/preparedness/profil-awal";
import { finalisasiProfil } from "@/lib/preparedness/profil-schema";

let ok = 0;
function t(nama: string, fn: () => void) {
  try { fn(); ok++; console.log("  ok  ", nama); } catch (e) { console.error("  GAGAL", nama, "\n", e); process.exitCode = 1; }
}

const lengkap = finalisasiProfil(buatProfilContoh());
assert.ok(lengkap, "profil contoh harus lengkap");
const anon = anonimkan(lengkap);

t("KB: semua potongan lolos skema dan id unik", () => {
  assert.ok(SEMUA_CHUNK.length >= 40);
  for (const c of SEMUA_CHUNK) assert.ok(ChunkSchema.safeParse(c).success, c.id);
  assert.equal(new Set(SEMUA_CHUNK.map((c) => c.id)).size, SEMUA_CHUNK.length);
});
t("anonimkan membuang data pribadi", () => {
  const a = anonimkan({ ...lengkap, titikKumpul: "Lapangan", catatanKhusus: "rahasia", kontakDarurat: [{ nama: "Budi", telepon: "0812" }] }) as Record<string, unknown>;
  assert.ok(!("titikKumpul" in a) && !("catatanKhusus" in a) && !("kontakDarurat" in a));
  assert.ok(!JSON.stringify(a).includes("Budi"));
});
t("hash stabil dan peka terhadap perubahan", () => {
  const h1 = hashMasukan("31.71.01.1001", anon);
  assert.equal(h1, hashMasukan("31.71.01.1001", { ...anon, bahaya: [...anon.bahaya].reverse() }));
  assert.notEqual(h1, hashMasukan("31.71.01.1001", { ...anon, jumlahAnggota: anon.jumlahAnggota + 1 }));
  assert.notEqual(h1, hashMasukan("31.71.01.1002", anon));
});
t("rencana: hanya hazard terpilih + umum, actionId sesuai format", () => {
  const r = bangunRencanaTemplat({ adm4: "x", profil: { ...anon, bahaya: ["banjir"] }, kb: SEMUA_CHUNK });
  assert.ok(r.tindakan.length > 0);
  for (const x of r.tindakan) {
    assert.ok(x.hazard === "banjir" || x.hazard === "umum");
    assert.equal(x.actionId, `${x.hazard}:${x.phase}:${x.sourceIds[0]}`);
  }
  assert.equal(new Set(r.tindakan.map((x) => x.actionId)).size, r.tindakan.length);
  assert.equal(r.mode, "cadangan");
});
t("batas per hazard per fase: 5 (<=2 bahaya) dan 3 (>2 bahaya)", () => {
  const hit = (cs: ReturnType<typeof pilihChunk>, h: string, f: string) => cs.filter((c) => c.hazard === h && c.phase === f).length;
  const dua = pilihChunk(SEMUA_CHUNK, { ...anon, bahaya: ["gempa", "banjir"] });
  assert.ok(hit(dua, "gempa", "saat") <= 5 && hit(dua, "gempa", "saat") === 5);
  const tiga = pilihChunk(SEMUA_CHUNK, { ...anon, bahaya: ["gempa", "banjir", "longsor"] });
  assert.equal(hit(tiga, "gempa", "saat"), 3);
  for (const f of ["sebelum", "saat", "sesudah"]) assert.ok(hit(tiga, "umum", f) <= 6);
});
t("urutan dalam satu kelompok menurut skor kecocokan", () => {
  const cs = pilihChunk(SEMUA_CHUNK, { ...anon, bahaya: ["gempa"] }).filter((c) => c.hazard === "gempa" && c.phase === "saat");
  for (let i = 1; i < cs.length; i++) assert.ok(skorChunk(cs[i - 1], anon) >= skorChunk(cs[i], anon));
  assert.ok(cs.some((c) => c.priority === "tinggi"));
});
t("potongan khusus kelompok disaring sesuai profil", () => {
  const khusus: Chunk = { ...SEMUA_CHUNK.find((c) => c.hazard === "banjir")!, id: "banjir-sebelum-999", audience: ["lansia"] };
  const kb = [...SEMUA_CHUNK, khusus];
  const ada = (p: typeof anon) => pilihChunk(kb, { ...p, bahaya: ["banjir"] }).some((c) => c.id === khusus.id);
  assert.equal(ada({ ...anon, lansia: 0 }), false);
  assert.equal(ada({ ...anon, lansia: 1 }), true);
});
t("skor memakai tindakan Sebelum dan Saat saja", () => {
  const r = bangunRencanaTemplat({ adm4: "x", profil: anon, kb: SEMUA_CHUNK });
  const butir = bangunButir(r.tindakan, r.tas);
  assert.equal(butir.filter((b) => b.phase !== "tas").length, r.tindakan.filter((x) => x.phase !== "sesudah").length);
  const semua = Object.fromEntries(butir.map((b) => [b.key, true as const]));
  assert.equal(hitungSkor(butir, semua).skor, 100);
  assert.equal(hitungSkor(butir, {}).skor, 0);
});
t("sorotan hanya fakta terukur", () => {
  assert.deepEqual(bangunSorotan(null, null), []);
  const s = bangunSorotan({ ringkasan: { hujanLebat48j: true } } as never, { ringkasan: { gempaDekat24j: true } } as never);
  assert.equal(s.length, 2);
  for (const x of s) assert.ok(!/akan terjadi|pasti/i.test(x));
});
t("setiap tindakan punya sumber https di KB", () => {
  for (const c of SEMUA_CHUNK) { assert.ok(c.sourceUrl.startsWith("https://")); assert.ok(actionIdDari(c).includes(c.id)); }
});
console.log(`\n${ok} uji lulus`);

import { langkahSaat } from "@/lib/rencana/ringkas-saat";
t("langkahSaat: maks 3 per bahaya, hanya fase Saat, prioritas tinggi dulu", () => {
  const r = bangunRencanaTemplat({ adm4: "x", profil: { ...anon, bahaya: ["gempa", "banjir"] }, kb: SEMUA_CHUNK });
  const g = langkahSaat(r.tindakan, ["gempa", "banjir", "umum"]);
  assert.equal(g.length, 2);
  for (const x of g) { assert.ok(x.langkah.length <= 3); assert.ok(x.langkah.every((l) => l.phase === "saat" && l.hazard === x.hazard)); assert.equal(x.langkah[0].priority, "tinggi"); }
});
