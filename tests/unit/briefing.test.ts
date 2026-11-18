// Jalankan: npx tsx tests/unit/briefing.test.ts  (tanpa jaringan: data BMKG dan penyedia LLM palsu)
import assert from "node:assert/strict";
import type { CuacaResponse, GempaResponse, IntervalCuaca, PeringatanResponse } from "@/types";
import { SEMUA_CHUNK } from "@/lib/kb/data";
import { dataTidakLengkap, hitungSinyal, ringkasanCadangan, tindakanCadangan, tingkatKeseluruhan } from "@/lib/briefing/sinyal";
import { susunBriefing, tautanUntuk, type HasilBriefing } from "@/lib/ai/briefing";
import { BriefingRequest } from "@/lib/ai/schema";
import type { LlmProvider } from "@/lib/ai/provider";
import { AnggaranHarian, CacheTtl } from "@/lib/ai/runtime";

let ok = 0;
const tests: Array<[string, () => void | Promise<void>]> = [];
const t = (n: string, f: () => void | Promise<void>) => tests.push([n, f]);

const NOW = new Date("2026-11-18T03:00:00Z"); // 10:00 WIB
const sumber = { nama: "BMKG", url: "https://data.bmkg.go.id", diambilPada: NOW.toISOString() };
const jam = (h: number) => `2026-11-18T${String(h).padStart(2, "0")}:00:00+07:00`;
const interval = (h: number, kondisi: string, suhu = 30, angin = 10): IntervalCuaca => ({
  waktu: jam(h), kondisi, ikon: null, suhu, kelembapan: 80, anginKmj: angin, arahAngin: "W", jarakPandang: null,
});
const cuaca = (items: IntervalCuaca[]): CuacaResponse => ({
  sumber, stale: false,
  lokasi: { desa: "Cawang", kecamatan: "Kramat Jati", kotkab: "Jakarta Timur", provinsi: "DKI Jakarta", lat: -6.25, lon: 106.87, timezone: "+0700" },
  prakiraan: items,
  ringkasan: { hujanLebat48j: false, hujanLebatWaktu: null, suhuMin: null, suhuMaks: null },
});
const gempa = (mag: number, jarakKm: number, jamLalu: number, potensi?: string): GempaResponse => ({
  sumber, stale: false,
  terbaru: { waktu: new Date(NOW.getTime() - jamLalu * 3600_000).toISOString(), magnitudo: mag, kedalamanKm: 10, wilayah: "Barat Daya Sukabumi", lat: -7, lon: 106, jarakKm, potensi },
  daftar: [],
  ringkasan: { gempaDekat24j: false },
});
const peringatan = (cakupan: "lokasi" | "provinsi" | null, tersedia = true): PeringatanResponse => ({
  sumber, stale: false, tersedia, tautanResmi: "https://www.bmkg.go.id/peringatan-dini",
  daftar: cakupan
    ? [{ id: "1", judul: "Hujan Lebat disertai Petir di Jakarta Timur", waktuTerbit: jam(9), berlakuSampai: jam(13), wilayah: "Jakarta Timur", ringkasan: "x", teks: "x", url: "https://www.bmkg.go.id/alerts/1", cakupan }]
    : [],
});
const TENANG = { cuaca: cuaca([interval(10, "Cerah Berawan", 31), interval(13, "Berawan", 33)]), gempa: gempa(3.1, 400, 2), peringatan: peringatan(null) };
const wilayah = { kelurahan: "Cawang", kecamatan: "Kramat Jati", kabKota: "Jakarta Timur", provinsi: "DKI Jakarta" };
const palsu = (fn: (u: string) => string): LlmProvider => ({ nama: "palsu", hasilJson: async (r) => fn(r.user) });
const deps = (providers: LlmProvider[] = []) => ({ kb: SEMUA_CHUNK, providers, anggaran: new AnggaranHarian(() => 100), cache: new CacheTtl<HasilBriefing>(60_000), sekarang: NOW });

// ---------- Sinyal (murni kode) ----------
t("sinyal: hari tenang hanya berisi gambaran cuaca, tingkat tenang", () => {
  const s = hitungSinyal(TENANG, NOW);
  assert.deepEqual(s.map((x) => x.jenis), ["cuaca"]);
  assert.equal(tingkatKeseluruhan(s), "tenang");
  assert.match(s[0].fakta, /cerah berawan, suhu 31–33°C/);
});
t("sinyal: peringatan yang menyebut lokasi = waspada dan paling atas", () => {
  const s = hitungSinyal({ ...TENANG, peringatan: peringatan("lokasi") }, NOW);
  assert.equal(s[0].jenis, "peringatan_lokasi");
  assert.equal(tingkatKeseluruhan(s), "waspada");
  assert.match(s[0].fakta, /Berlaku sampai 13:00/);
});
t("sinyal: peringatan tingkat provinsi hanya 'perhatikan'", () => {
  const s = hitungSinyal({ ...TENANG, peringatan: peringatan("provinsi") }, NOW);
  assert.equal(tingkatKeseluruhan(s), "perhatikan");
  assert.ok(s.some((x) => x.jenis === "peringatan_provinsi"));
});
t("sinyal: hujan lebat, panas, dan angin kencang dari prakiraan 24 jam", () => {
  const s = hitungSinyal({ ...TENANG, cuaca: cuaca([interval(13, "Hujan Lebat", 36, 45), interval(16, "Hujan Petir")]) }, NOW);
  const jenis = s.map((x) => x.jenis);
  assert.ok(jenis.includes("hujan_lebat") && jenis.includes("panas") && jenis.includes("angin"));
  assert.match(s.find((x) => x.jenis === "hujan_lebat")!.fakta, /pukul 13:00/);
});
t("sinyal: gempa M5+ dekat dan baru = waspada; jauh atau lama diabaikan", () => {
  assert.equal(hitungSinyal({ ...TENANG, gempa: gempa(5.6, 120, 3) }, NOW)[0].jenis, "gempa_dekat");
  assert.equal(hitungSinyal({ ...TENANG, gempa: gempa(4.2, 80, 3) }, NOW)[0].jenis, "gempa_terasa");
  assert.ok(!hitungSinyal({ ...TENANG, gempa: gempa(6, 900, 3) }, NOW).some((x) => x.bahaya === "gempa"));
  assert.ok(!hitungSinyal({ ...TENANG, gempa: gempa(6, 50, 30) }, NOW).some((x) => x.bahaya === "gempa"));
});
t("sinyal: 'berpotensi tsunami' = waspada, 'tidak berpotensi tsunami' tidak", () => {
  assert.ok(hitungSinyal({ ...TENANG, gempa: gempa(7, 600, 1, "Berpotensi tsunami") }, NOW).some((x) => x.jenis === "tsunami"));
  assert.ok(!hitungSinyal({ ...TENANG, gempa: gempa(7, 600, 1, "Tidak berpotensi tsunami") }, NOW).some((x) => x.jenis === "tsunami"));
});
t("cadangan: tidak pernah menyatakan 'tidak ada peringatan' bila umpan gagal dibaca", () => {
  const data = { ...TENANG, peringatan: peringatan(null, false) };
  const s = hitungSinyal(data, NOW);
  assert.doesNotMatch(ringkasanCadangan(s, "tenang", false), /Tidak ada peringatan/);
  assert.ok(dataTidakLengkap(data).some((c) => /peringatan dini/.test(c)));
  assert.equal(dataTidakLengkap({ cuaca: null, gempa: null, peringatan: null }).length, 3);
});
t("cadangan: 3 tindakan, sinyal terpenting dulu, lalu kebutuhan keluarga", () => {
  const s = hitungSinyal({ ...TENANG, gempa: gempa(5.6, 120, 3) }, NOW);
  const a = tindakanCadangan(s, { balita: 1 });
  assert.equal(a.length, 3);
  assert.match(a[0].judul, /gempa susulan/);
  assert.match(a[1].judul, /balita/);
  assert.equal(tindakanCadangan(hitungSinyal(TENANG, NOW)).length, 3);
});

// ---------- Briefing dengan AI ----------
const AI_OK = JSON.stringify({
  ringkasan: "Ada peringatan hujan lebat disertai petir untuk Jakarta Timur hari ini. Siapkan rumah dan keluarga sejak sekarang.",
  tindakan: [
    { judul: "Bersihkan saluran air di sekitar rumah", alasan: "Hujan lebat bisa membuat air cepat meluap." },
    { judul: "Periksa tas siaga keluarga", alasan: "Pastikan kebutuhan balita ikut tersedia." },
    { judul: "Pantau peringatan resmi BMKG", alasan: "Peringatan berlaku sampai 13:00, ikuti arahan BPBD." },
  ],
});
t("briefing AI: tingkat dari kode, tindakan dari AI, tautan bantu dipasang", async () => {
  const h = await susunBriefing({ ...TENANG, peringatan: peringatan("lokasi") }, wilayah, { balita: 1 }, deps([palsu(() => AI_OK)]));
  assert.equal(h.mode, "ai");
  assert.equal(h.tingkat, "waspada");
  assert.equal(h.tindakan.length, 3);
  assert.equal(h.tindakan[1].tautan?.href, "/rencana");
  assert.equal(h.sumber.length, 3);
});
t("briefing AI: data dan konteks keluarga dikirim di blok DATA, tanpa koordinat", async () => {
  let user = "";
  await susunBriefing({ ...TENANG, peringatan: peringatan("lokasi") }, wilayah, { lansia: 2 }, deps([palsu((u) => { user = u; return AI_OK; })]));
  assert.match(user, /SINYAL/);
  assert.match(user, /2 lansia/);
  assert.match(user, /Kramat Jati/);
  assert.doesNotMatch(user, /106\.87|-6\.25/);
});
t("briefing AI: angka karangan atau ramalan -> cadangan", async () => {
  const angka = JSON.stringify({ ...JSON.parse(AI_OK), ringkasan: "Curah hujan mencapai 150 mm hari ini di Jakarta Timur, harap waspada." });
  assert.equal((await susunBriefing(TENANG, wilayah, {}, deps([palsu(() => angka)]))).mode, "cadangan");
  const ramal = JSON.stringify({ ...JSON.parse(AI_OK), ringkasan: "Banjir akan terjadi siang ini di wilayah Anda, segera bersiap." });
  assert.equal((await susunBriefing(TENANG, wilayah, {}, deps([palsu(() => ramal)]))).mode, "cadangan");
  // Penolakan penyaring di-cache: data yang sama tidak memanggil model lagi.
  let n = 0;
  const d = deps([palsu(() => { n++; return angka; })]);
  await susunBriefing(TENANG, wilayah, {}, d);
  await susunBriefing(TENANG, wilayah, {}, d);
  assert.equal(n, 1);
});
t("briefing: tanpa AI, JSON rusak, atau anggaran habis tetap memberi cadangan lengkap", async () => {
  for (const d of [deps(), deps([palsu(() => "bukan json")]), { ...deps([palsu(() => AI_OK)]), anggaran: new AnggaranHarian(() => 0) }]) {
    const h = await susunBriefing(TENANG, wilayah, {}, d);
    assert.equal(h.mode, "cadangan");
    assert.equal(h.tindakan.length, 3);
    assert.ok(h.ringkasan.length > 20);
  }
});
const AI_TENANG = JSON.stringify({
  ringkasan: "Hari ini cuaca cerah berawan dengan suhu 31–33°C. Manfaatkan waktu tenang untuk memeriksa kesiapan keluarga.",
  tindakan: [
    { judul: "Periksa isi tas siaga keluarga", alasan: "Waktu tenang adalah saat terbaik untuk melengkapi persediaan." },
    { judul: "Simpan nomor darurat 112", alasan: "Pastikan semua anggota keluarga tahu nomor ini." },
    { judul: "Sepakati titik kumpul keluarga", alasan: "Agar tidak bingung bila terpisah saat kejadian." },
  ],
});
t("briefing: hasil AI di-cache untuk sinyal dan keluarga yang sama", async () => {
  let n = 0;
  const d = deps([palsu(() => { n++; return AI_TENANG; })]);
  assert.equal((await susunBriefing(TENANG, wilayah, {}, d)).mode, "ai");
  n = 0;
  await susunBriefing(TENANG, wilayah, {}, d);
  assert.equal(n, 0);
  await susunBriefing(TENANG, wilayah, { balita: 1 }, d);
  assert.equal(n, 1);
});
t("briefing: validasi masukan dan tautan tindakan", () => {
  const lok = { adm4: "31.75.03.1001", kecamatan: "Kramat Jati", kabKota: "Jakarta Timur", provinsi: "DKI Jakarta", lat: -6.25, lon: 106.87 };
  assert.ok(BriefingRequest.safeParse({ lokasi: lok }).success);
  assert.ok(!BriefingRequest.safeParse({ lokasi: { ...lok, adm4: "../x" } }).success);
  assert.ok(!BriefingRequest.safeParse({ lokasi: { ...lok, kecamatan: "<script>" } }).success);
  assert.equal(tautanUntuk("Cetak Kartu Siaga keluarga")?.href, "/rencana/kartu");
  assert.equal(tautanUntuk("Minum air yang cukup"), undefined);
});

(async () => {
  for (const [n, f] of tests) {
    try { await f(); ok++; console.log("  ok  ", n); } catch (e) { console.error("  GAGAL", n, "\n", e); process.exitCode = 1; }
  }
  console.log(`${ok}/${tests.length} lulus`);
})();
