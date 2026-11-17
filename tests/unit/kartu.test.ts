import assert from "node:assert/strict";
import { SEMUA_CHUNK } from "@/lib/kb/data";
import { HAZARDS } from "@/lib/hazards/hazards";
import { isHazardAktif } from "@/lib/hazards/pack-status";
import { langkahDaruratBahaya, MAKS_KATA_LANGKAH } from "@/lib/darurat/langkah";
import { langkahKunciKartu, tasRingkasKartu, BATAS_KARTU } from "@/lib/kartu/isi";
import { hitungTas } from "@/lib/preparedness/tas";
import type { Tindakan } from "@/types/rencana";

let lulus = 0; const gagal: string[] = [];
const uji = (nama: string, fn: () => void) => { try { fn(); lulus++; console.log("OK   ", nama); } catch (e) { gagal.push(nama); console.log("GAGAL", nama, "->", (e as Error).message.split("\n")[0]); } };

uji("darurat: tiap bahaya aktif punya langkah Saat (<=7) dan Sesudah (<=3), tiap langkah <=12 kata", () => {
  for (const h of HAZARDS.filter((x) => isHazardAktif(x.id))) {
    const p = langkahDaruratBahaya(SEMUA_CHUNK, h.id);
    assert.ok(p.saat.length >= 1 && p.saat.length <= 7, `${h.id} saat=${p.saat.length}`);
    assert.ok(p.sesudah.length <= 3, `${h.id} sesudah`);
    for (const l of [...p.saat, ...p.sesudah]) assert.ok(l.teks.split(/\s+/).length <= MAKS_KATA_LANGKAH, `${l.id}: ${l.teks}`);
  }
});
uji("darurat: potongan bertanda darurat didahulukan", () => {
  const p = langkahDaruratBahaya(SEMUA_CHUNK, "gempa", 3);
  const darurat = new Set(SEMUA_CHUNK.filter((c) => c.darurat).map((c) => c.id));
  assert.ok(p.saat.every((l) => darurat.has(l.id)));
});
uji("darurat: bahaya tanpa potongan -> kosong, tidak error", () => {
  const p = langkahDaruratBahaya([], "gunung_api"); // KB kosong (mis. bahaya baru yang belum punya potongan)
  assert.equal(p.saat.length, 0);
  assert.equal(p.sesudah.length, 0);
});

const t = (hazard: Tindakan["hazard"], n: number, priority: Tindakan["priority"]): Tindakan => ({ actionId: `${hazard}:saat:${hazard}-saat-${n}`, hazard, phase: "saat", title: `t${n}`, detail: "", priority, forGroups: ["umum"], sourceIds: [`${hazard}-saat-${n}`] });
uji("kartu: dua langkah per bahaya", () => {
  const g = langkahKunciKartu([t("banjir", 1, "tinggi"), t("banjir", 2, "tinggi"), t("banjir", 3, "tinggi")], ["banjir"]);
  assert.equal(g[0].langkah.length, BATAS_KARTU.langkahPerBahaya);
});
uji("kartu: maksimal 10 langkah, prioritas rendah dipangkas dulu", () => {
  const hz = ["banjir", "longsor", "gempa", "cuaca_ekstrem", "tsunami", "kekeringan"] as const;
  const tindakan = hz.flatMap((h, i) => [t(h, 1, "tinggi"), t(h, 2, i < 2 ? "rendah" : "tinggi")]);
  const g = langkahKunciKartu(tindakan, [...hz]);
  const total = g.reduce((a, x) => a + x.langkah.length, 0);
  assert.equal(total, 10);
  assert.ok(!g.flatMap((x) => x.langkah).some((x) => x.priority === "rendah" && g.length > 0 && x.hazard === "banjir"));
});
uji("kartu: tas ringkas 10 item, kelompok bobot 2 dulu", () => {
  const tas = hitungTas({ bahaya: ["gempa"], jumlahAnggota: 4, persediaanHari: 3, lansia: 1, balita: 1, hamil: 1, disabilitas: 1, obatRutin: true, jumlahObatRutin: 1, hewanPeliharaan: true });
  const r = tasRingkasKartu(tas);
  assert.equal(r.length, BATAS_KARTU.itemTas);
  assert.ok(r.every((x) => x.bobot === 2));
});

uji("gelombang/abrasi: kini aktif, punya langkah Saat 5-7 dan Sesudah, tiga fase terisi", () => {
  assert.equal(isHazardAktif("gelombang_abrasi"), true);
  const p = langkahDaruratBahaya(SEMUA_CHUNK, "gelombang_abrasi");
  assert.ok(p.saat.length >= 5 && p.saat.length <= 7, `saat=${p.saat.length}`);
  assert.equal(p.sesudah.length, 3);
});
uji("turunan: langkah Saat/Sesudah gelombang_abrasi selain 'jauhi pantai' wajib berlabel turunan (tidak ada panduan resmi khusus)", () => {
  const tanpaLabel = SEMUA_CHUNK.filter((c) => c.hazard === "gelombang_abrasi" && c.phase !== "sebelum" && !c.turunan);
  assert.deepEqual(tanpaLabel.map((c) => c.id), ["gelombang_abrasi-saat-001"]); // satu-satunya langkah Saat resmi (BNPB 2012 hlm 33)
  assert.match(tanpaLabel[0].title, /pantai/i);
});
uji("turunan: label ikut terbawa ke Mode Darurat", () => {
  const p = langkahDaruratBahaya(SEMUA_CHUNK, "gelombang_abrasi");
  assert.ok(p.saat.some((l) => l.turunan) && p.sesudah.every((l) => l.turunan));
  assert.ok(!p.saat.find((l) => l.id === "gelombang_abrasi-saat-001")!.turunan);
});
uji("kb: setiap potongan punya sumber https; turunan hanya pada potongan yang memang turunan (mengutip panduan banjir)", () => {
  for (const c of SEMUA_CHUNK) assert.ok(c.sourceUrl.startsWith("https://"), c.id);
  for (const c of SEMUA_CHUNK.filter((x) => x.turunan)) assert.match(c.turunan!, /banjir/i, c.id);
});

console.log(`\n${lulus} lulus, ${gagal.length} gagal`);
process.exit(gagal.length ? 1 : 0);
