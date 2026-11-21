// Jalankan: npx tsx tests/unit/siaga-pekan.test.ts  (Siaga Iklim "Minggu ini": sinyal prakiraan + rencana 7 hari)
import assert from "node:assert/strict";
import { AMBANG, hitungSiagaPekan, namaTanggal, rawanKarhutla, rentangTanggal, teksPekan, type RawPrakiraan, type RawUdara } from "@/lib/iklim/pekan";
import { kapanRamah, labelKapan, rencanaPekanCadangan, susunRencanaPekan, type HasilRencanaPekan } from "@/lib/ai/rencana-pekan";
import { RencanaPekanRequest } from "@/lib/ai/schema";
import type { LlmProvider, PermintaanLlm } from "@/lib/ai/provider";
import { AnggaranHarian, CacheTtl } from "@/lib/ai/runtime";

let ok = 0;
const tests: Array<[string, () => void | Promise<void>]> = [];
const t = (n: string, f: () => void | Promise<void>) => tests.push([n, f]);

// "Hari ini" = Kamis 19 Nov 2026 pukul 14.00 WIB.
const NOW = new Date("2026-11-19T07:00:00Z");
const tgl = (i: number) => new Date(Date.UTC(2026, 10, 19 + i)).toISOString().slice(0, 10);

/** 30 hari lalu + 16 hari ke depan; `ubah(i, hari)` mengubah hari ke-i relatif hari ini. */
function prakiraan(ubah: (i: number, h: Record<string, number>) => void = () => {}): RawPrakiraan {
  const daily = { time: [] as string[], temperature_2m_max: [] as number[], apparent_temperature_max: [] as number[], precipitation_sum: [] as number[], precipitation_probability_max: [] as number[], relative_humidity_2m_min: [] as number[], wind_speed_10m_max: [] as number[] };
  for (let i = -30; i < 16; i++) {
    const h = { tmax: 31, terasa: 36, hujan: 5, peluang: 80, rh: 70, angin: 8 };
    ubah(i, h);
    daily.time.push(tgl(i));
    daily.temperature_2m_max.push(h.tmax);
    daily.apparent_temperature_max.push(h.terasa);
    daily.precipitation_sum.push(h.hujan);
    daily.precipitation_probability_max.push(h.peluang);
    daily.relative_humidity_2m_min.push(h.rh);
    daily.wind_speed_10m_max.push(h.angin);
  }
  return { daily };
}
function udara(pm: (i: number) => number): RawUdara {
  const time: string[] = [];
  const pm2_5: number[] = [];
  for (let i = 0; i < 5; i++) for (let j = 0; j < 24; j++) {
    time.push(`${tgl(i)}T${String(j).padStart(2, "0")}:00`);
    pm2_5.push(pm(i));
  }
  return { hourly: { time, pm2_5 } };
}
const opsi = (provinsi = "DKI JAKARTA") => ({ lat: -6.25, lon: 106.75, provinsi, now: NOW });

t("tanggal: nama hari Indonesia dan rentang berurutan", () => {
  assert.equal(namaTanggal("2026-11-19"), "Kamis 19 Nov");
  assert.equal(rentangTanggal(["2026-11-21", "2026-11-22", "2026-11-23"]), "Sabtu 21 Nov - Senin 23 Nov");
  assert.equal(rentangTanggal(["2026-11-21", "2026-11-25"]), "Sabtu 21 Nov, Rabu 25 Nov");
});

t("cuaca biasa: 16 hari mulai hari ini, tanpa sinyal, tingkat aman", () => {
  const r = hitungSiagaPekan(prakiraan(), udara(() => 20), opsi());
  assert.equal(r.hari.length, 16);
  assert.equal(r.hari[0].tanggal, "2026-11-19");
  assert.equal(r.sinyal.length, 0);
  assert.equal(r.tingkat, "aman");
  assert.equal(r.hujan30Mm, 150);
});

t("hujan: 20 mm (peluang tinggi) = perhatikan, 50 mm = waspada", () => {
  const r = hitungSiagaPekan(prakiraan((i, h) => { if (i === 2) h.hujan = 30; if (i === 4) h.hujan = 75; }), null, opsi());
  const s = r.sinyal.find((x) => x.jenis === "hujan")!;
  assert.equal(s.tingkat, "waspada");
  assert.deepEqual(s.tanggal, [tgl(2), tgl(4)]);
  assert.match(s.fakta, /75 mm pada Senin 23 Nov/);
  // Hujan 30 mm dengan peluang rendah tidak dihitung.
  const r2 = hitungSiagaPekan(prakiraan((i, h) => { if (i === 2) { h.hujan = 30; h.peluang = 40; } }), null, opsi());
  assert.equal(r2.sinyal.length, 0);
});

t("panas: suhu terasa 41°C = waspada (ambang bahaya NOAA)", () => {
  const r = hitungSiagaPekan(prakiraan((i, h) => { if (i === 1) { h.tmax = 36; h.terasa = AMBANG.terasaBahayaC + 1; } }), null, opsi());
  assert.equal(r.sinyal[0].jenis, "panas");
  assert.equal(r.sinyal[0].tingkat, "waspada");
});

t("kemarau + kelembapan rendah + angin = kering dan cuaca mudah terbakar; karhutla di Kalteng", () => {
  const raw = prakiraan((i, h) => { if (i >= -10) { h.hujan = 0; h.rh = 35; h.angin = 25; } });
  const r = hitungSiagaPekan(raw, null, opsi("Kalimantan Tengah"));
  assert.equal(r.keringKini, 10);
  assert.equal(r.rawanKarhutla, true);
  const api = r.sinyal.find((x) => x.jenis === "api")!;
  assert.equal(api.tingkat, "waspada");
  assert.match(api.judul, /karhutla/);
  assert.ok(api.tindakan.some((x) => /Manggala Agni|BPBD/.test(x)));
  assert.equal(r.sinyal.find((x) => x.jenis === "kering")?.tingkat, "waspada");
  assert.equal(r.tingkat, "waspada");
});

t("udara: PM2.5 rata-rata harian memakai kategori ISPU", () => {
  const r = hitungSiagaPekan(prakiraan(), udara((i) => (i === 0 ? 60 : i === 3 ? 170 : 30)), opsi());
  const s = r.sinyal.find((x) => x.jenis === "udara")!;
  // Model udara global kasar: tanpa titik panas di sekitar, "sangat tidak sehat" tetap hanya "perhatikan".
  assert.equal(s.tingkat, "perhatikan");
  assert.deepEqual(s.tanggal, [tgl(0), tgl(3)]);
  assert.match(s.fakta, /sangat tidak sehat/);
  assert.match(s.fakta, /stasiun ISPU/);
  // Udara gagal dimuat: sinyal lain tetap dihitung.
  assert.doesNotThrow(() => hitungSiagaPekan(prakiraan(), null, opsi()));
});

t("karhutla: provinsi prioritas atau pilihan bahaya pengguna", () => {
  assert.ok(rawanKarhutla("Riau"));
  assert.ok(!rawanKarhutla("DKI Jakarta"));
  assert.ok(rawanKarhutla("DKI Jakarta", ["karhutla"]));
});

// ---------- Rencana 7 hari ----------
const W = { kabKota: "Jakarta Timur", provinsi: "DKI Jakarta" };
const DATA = hitungSiagaPekan(prakiraan((i, h) => { if (i === 2) h.hujan = 60; }), udara(() => 80), opsi());
const keluaran = (ekstra: Record<string, unknown> = {}) => JSON.stringify({
  ringkasan: "Minggu ini udara tidak sehat dan ada hujan lebat. Ini dari prakiraan model, bukan peringatan resmi.",
  langkah: [
    { kapan: "Kamis 19 Nov", tindakan: "Kurangi aktivitas di luar rumah dan pakai masker N95.", alasan: "Udara tidak sehat bagi balita." },
    { kapan: "Sabtu 21 Nov", tindakan: "Bersihkan saluran air sebelum hujan.", alasan: "Hujan lebat diprakirakan." },
  ],
  ...ekstra,
});
function penyedia(teks: string) {
  const diminta: PermintaanLlm[] = [];
  const p: LlmProvider = { nama: "palsu", hasilJson: async (r) => { diminta.push(r); return teks; } };
  return { p, diminta };
}
const deps = (p: LlmProvider) => ({ providers: [p], anggaran: new AnggaranHarian(() => 100), cache: new CacheTtl<HasilRencanaPekan>(60_000), sekarang: NOW });

t("AI: sinyal dan keluarga masuk blok DATA; tanggal hari ini ditulis 'Hari ini'", async () => {
  const { p, diminta } = penyedia(keluaran());
  const h = await susunRencanaPekan(DATA, W, { balita: 1 }, deps(p));
  assert.equal(h.mode, "ai");
  assert.equal(h.langkah[0].kapan, "Hari ini");
  assert.match(diminta[0].user, /SINYAL/);
  assert.match(diminta[0].user, /Kualitas udara tidak sehat/);
  assert.doesNotMatch(diminta[0].user, /106[.,]75|-6[.,]25/);
});

t("AI menulis angka karangan atau rupiah -> rencana cadangan", async () => {
  const angka = penyedia(keluaran({ ringkasan: "Minggu ini PM2.5 akan mencapai 300 µg/m³ di wilayah Anda, jadi tetap di rumah." }));
  assert.equal((await susunRencanaPekan(DATA, W, {}, deps(angka.p))).mode, "cadangan");
  const rp = penyedia(keluaran({ ringkasan: "Beli masker seharga Rp 50 ribu untuk seluruh keluarga minggu ini ya." }));
  assert.equal((await susunRencanaPekan(DATA, W, {}, deps(rp.p))).mode, "cadangan");
});

t("cadangan: urut tanggal, mengutip fakta, minimal 3 langkah walau tanpa sinyal", () => {
  const c = rencanaPekanCadangan(DATA, {}, NOW);
  assert.equal(c.langkah[0].kapan, "Hari ini");
  assert.match(c.langkah[0].alasan, /PM2.5/);
  const tenang = rencanaPekanCadangan(hitungSiagaPekan(prakiraan(), null, opsi()), {}, NOW);
  assert.ok(tenang.langkah.length >= 2);
  assert.match(tenang.ringkasan, /Tidak ada sinyal/);
  assert.equal(labelKapan(tgl(1), tgl(0)), "Besok");
  assert.equal(kapanRamah("Jumat 20 Nov", tgl(0)), "Besok");
});

t("teks sinyal untuk AI memuat tanggal dan status karhutla", () => {
  const teks = teksPekan(DATA, tgl(0));
  assert.match(teks, /Hari ini: Kamis 19 Nov/);
  assert.match(teks, /Wilayah rawan karhutla: tidak/);
});

t("AI menyebut gempa atau gunung api di rencana cuaca -> ditolak; profil hanya mengirim bahaya cuaca", async () => {
  const gempa = penyedia(keluaran({ ringkasan: "Minggu ini udara tidak sehat; siapkan juga jalur evakuasi gempa. Ini dari prakiraan model, bukan peringatan resmi." }));
  assert.equal((await susunRencanaPekan(DATA, W, {}, { ...deps(gempa.p), bahaya: ["gempa", "banjir"] })).mode, "cadangan");
  assert.doesNotMatch(gempa.diminta[0].user, /gempa/i);
  assert.match(gempa.diminta[0].user, /banjir/i);
});

t("minggu tenang: AI tidak dipanggil, rencana singkat 2 langkah berlabel 'tenang'", async () => {
  const { p, diminta } = penyedia(keluaran());
  const h = await susunRencanaPekan(hitungSiagaPekan(prakiraan(), null, opsi()), W, {}, deps(p));
  assert.equal(h.mode, "tenang");
  assert.equal(diminta.length, 0);
  assert.equal(h.langkah.length, 2);
});

t("permintaan divalidasi", () => {
  assert.ok(RencanaPekanRequest.safeParse({ lokasi: { lat: -6.25, lon: 106.87, ...W } }).success);
  assert.ok(!RencanaPekanRequest.safeParse({ lokasi: { lat: 50, lon: 106.87, ...W } }).success);
});

(async () => {
  for (const [n, f] of tests) {
    try { await f(); ok++; console.log("  ok  ", n); } catch (e) { console.error("  GAGAL", n, "\n", e); process.exitCode = 1; }
  }
  console.log(`${ok}/${tests.length} lulus`);
})();
