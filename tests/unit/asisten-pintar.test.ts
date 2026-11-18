// Jalankan: npx tsx tests/unit/asisten-pintar.test.ts  (konteks kondisi BMKG, rencana keluarga, aksi aplikasi)
import assert from "node:assert/strict";
import type { CuacaResponse, PeringatanResponse } from "@/types";
import type { Tindakan, ItemTas } from "@/types/rencana";
import { SEMUA_CHUNK } from "@/lib/kb/data";
import { butuhKondisi, jawabPertanyaan, teksRencana, type HasilTanya } from "@/lib/ai/tanya";
import type { LlmProvider, PermintaanLlm } from "@/lib/ai/provider";
import { AnggaranHarian, CacheTtl } from "@/lib/ai/runtime";
import { TanyaRequest } from "@/lib/ai/schema";
import { aksiSah, SEMUA_AKSI } from "@/lib/tanya/aksi";
import { teksKondisi, waktuWib } from "@/lib/briefing/kondisi-teks";
import { ringkasRencana } from "@/lib/tanya/ringkas-rencana";

let ok = 0;
const tests: Array<[string, () => void | Promise<void>]> = [];
const t = (n: string, f: () => void | Promise<void>) => tests.push([n, f]);

const LOK = { adm4: "31.75.03.1001", kecamatan: "Kramat Jati", kabKota: "Jakarta Timur", provinsi: "DKI Jakarta", lat: -6.25, lon: 106.87 };
const jawabanModel = (ekstra: Record<string, unknown> = {}) =>
  JSON.stringify({ jawaban: "Bawa jas hujan dan pantau peringatan BMKG sebelum berangkat.", sourceIds: [], saranLanjutan: ["Apa isi tas siaga?"], aksi: [], refused: false, ...ekstra });

function rekam(keluaran: string) {
  const diminta: PermintaanLlm[] = [];
  const p: LlmProvider = { nama: "palsu", hasilJson: async (r) => { diminta.push(r); return keluaran; } };
  return { p, diminta };
}
const deps = (p: LlmProvider, kondisi?: () => Promise<string | null>) => ({
  kb: SEMUA_CHUNK, providers: [p], anggaran: new AnggaranHarian(() => 100), cache: new CacheTtl<HasilTanya>(60_000), kondisi,
});

t("deteksi pertanyaan yang butuh kondisi terkini", () => {
  for (const q of ["Apakah aman keluar rumah sore ini?", "Bagaimana cuaca hari ini?", "Perlu bawa payung sekarang?", "Ada peringatan BMKG?", "Gempa tadi terasa kuat, apa yang harus dicek?"]) assert.ok(butuhKondisi(q), q);
  for (const q of ["Apa itu BMKG?".replace("BMKG", "BNPB"), "Apa isi tas siaga?", "Bagaimana cara memadamkan api kecil?"]) assert.ok(!butuhKondisi(q), q);
});

t("kondisi BMKG hanya diambil bila perlu, masuk blok DATA, dan ditandai di hasil", async () => {
  let dipanggil = 0;
  const { p, diminta } = rekam(jawabanModel());
  const ambil = async () => { dipanggil++; return "Tingkat perhatian versi SIGAP (bukan status resmi): Perhatikan\n- [Perhatikan] Prakiraan hujan lebat atau petir: hujan lebat pada Rabu sekitar pukul 15:00."; };
  const h = await jawabPertanyaan("Apakah aman keluar rumah sore ini?", { lokasi: LOK }, deps(p, ambil));
  assert.equal(dipanggil, 1);
  assert.match(diminta[0].user, /KONDISI TERKINI DI LOKASI PENGGUNA \(BMKG\)/);
  assert.match(diminta[0].user, /pukul 15:00/);
  assert.doesNotMatch(diminta[0].user, /106\.87|-6\.25/); // koordinat tidak dikirim ke AI
  assert.equal(h.kondisi, true);
  await jawabPertanyaan("Apa isi tas siaga untuk keluarga?", { lokasi: LOK }, deps(rekam(jawabanModel()).p, ambil));
  assert.equal(dipanggil, 1); // pertanyaan umum tidak memicu pengambilan data
});

t("kondisi gagal diambil tidak menggagalkan jawaban", async () => {
  const { p, diminta } = rekam(jawabanModel());
  const h = await jawabPertanyaan("Bagaimana cuaca hari ini?", { lokasi: LOK }, deps(p, async () => { throw new Error("hulu mati"); }));
  assert.equal(h.mode, "ai");
  assert.equal(h.kondisi, false);
  assert.doesNotMatch(diminta[0].user, /KONDISI TERKINI/);
});

t("ringkasan rencana masuk blok DATA; model berpikir dulu dengan anggaran kecil", async () => {
  const { p, diminta } = rekam(jawabanModel());
  await jawabPertanyaan("Apa yang belum saya siapkan?", {
    rencana: { skor: 35, label: "Baru mulai", belumDikerjakan: ["Siapkan obat cadangan untuk lansia"], tasBelumSiap: ["Air minum", "Senter"], tasKedaluwarsa: ["Makanan siap makan (5 hari lagi)"] },
  }, deps(p));
  assert.match(diminta[0].user, /RENCANA KELUARGA/);
  assert.match(diminta[0].user, /Siapkan obat cadangan untuk lansia/);
  assert.match(diminta[0].user, /Makanan siap makan \(5 hari lagi\)/);
  assert.ok((diminta[0].anggaranPikir ?? 0) > 0);
  assert.equal(teksRencana(undefined), "");
});

t("aksi dari model divalidasi: id karangan dibuang, maksimal 2, tanpa duplikat", async () => {
  const { p, diminta } = rekam(jawabanModel({ aksi: ["situs-palsu", "rencana-tas", "rencana-tas", "latihan-banjir-kiriman", "darurat"] }));
  const h = await jawabPertanyaan("Bagaimana menyiapkan tas siaga untuk banjir?", {}, deps(p));
  assert.deepEqual(h.aksi?.map((a) => a.href), ["/rencana?tab=tas", "/latihan/banjir-kiriman"]);
  assert.match(diminta[0].user, /AKSI/);
  assert.ok(SEMUA_AKSI.every((a) => a.href.startsWith("/")));
  assert.deepEqual(aksiSah(["https://jahat.example"]), []);
});

t("id passage yang tertulis di teks jawaban dibuang", async () => {
  const { p } = rekam(jawabanModel({ jawaban: "Tetap di dalam bangunan yang kokoh [cuaca_ekstrem-saat-003] dan pantau BMKG (banjir-saat-002)." }));
  const h = await jawabPertanyaan("Bagaimana bersiap menghadapi petir?", {}, deps(p));
  assert.equal(h.jawaban, "Tetap di dalam bangunan yang kokoh dan pantau BMKG.");
});

t("pertanyaan darurat ditolak kode dengan aksi Mode Darurat", async () => {
  const { p, diminta } = rekam(jawabanModel());
  const h = await jawabPertanyaan("Tolong saya terjebak banjir sekarang", {}, deps(p));
  assert.equal(h.refused, true);
  assert.equal(h.aksi?.[0]?.href, "/darurat");
  assert.equal(diminta.length, 0);
});

t("teks kondisi: waktu WIB, tingkat, sinyal; data hilang dicatat jujur", () => {
  const now = new Date("2026-11-18T07:20:00Z");
  assert.match(waktuWib(now), /14[.:]20 WIB/);
  const cuaca: CuacaResponse = {
    sumber: { nama: "BMKG", url: "x", diambilPada: now.toISOString() }, stale: false,
    lokasi: { desa: "", kecamatan: "", kotkab: "", provinsi: "", lat: null, lon: null, timezone: "+0700" },
    prakiraan: [{ waktu: "2026-11-18T15:00:00+07:00", kondisi: "Hujan Lebat", ikon: null, suhu: 27, kelembapan: 90, anginKmj: 12, arahAngin: "W", jarakPandang: null }],
    ringkasan: { hujanLebat48j: true, hujanLebatWaktu: null, suhuMin: 27, suhuMaks: 27 },
  };
  const pr: PeringatanResponse = { sumber: { nama: "BMKG", url: "x", diambilPada: now.toISOString() }, stale: false, tersedia: false, daftar: [], tautanResmi: "x" };
  const teks = teksKondisi({ cuaca, gempa: null, peringatan: pr }, now);
  assert.match(teks, /Tingkat perhatian versi SIGAP \(bukan status resmi\): Perhatikan/);
  assert.match(teks, /hujan lebat pada Rabu sekitar pukul 15:00/);
  assert.match(teks, /Catatan: Data gempa BMKG belum dapat dimuat/);
  assert.match(teks, /Catatan: Umpan peringatan dini/);
});

t("ringkasan rencana: prioritas tinggi dulu, tanpa fase sesudah, contoh diabaikan", () => {
  const tindakan = [
    { actionId: "a", hazard: "banjir", phase: "sebelum", title: "Bersihkan saluran", detail: "d", priority: "rendah", forGroups: ["umum"], sourceIds: ["x"] },
    { actionId: "b", hazard: "banjir", phase: "saat", title: "Matikan listrik", detail: "d", priority: "tinggi", forGroups: ["umum"], sourceIds: ["x"] },
    { actionId: "c", hazard: "banjir", phase: "sesudah", title: "Bersihkan rumah", detail: "d", priority: "tinggi", forGroups: ["umum"], sourceIds: ["x"] },
  ] as Tindakan[];
  const tas = [{ id: "air", kelompok: "Air dan makanan", nama: "Air minum", jumlah: 9, satuan: "liter", bobot: 2 }] as ItemTas[];
  const r = ringkasRencana({ tindakan, tas, mode: "ai" }, { a: true }, {}, {});
  assert.deepEqual(r?.belumDikerjakan, ["Matikan listrik"]);
  assert.deepEqual(r?.tasBelumSiap, ["Air minum"]);
  assert.equal(r?.latihanTotal, 1);
  assert.equal(ringkasRencana({ tindakan, tas, mode: "contoh" }, {}, {}, {}), undefined);
  assert.equal(ringkasRencana(null, {}, {}, {}), undefined);
});

t("permintaan: lokasi dan rencana divalidasi; isian asing ditolak", () => {
  assert.ok(TanyaRequest.safeParse({ pertanyaan: "Aman keluar?", lokasi: LOK, rencana: { skor: 40, label: "Cukup siap" } }).success);
  assert.ok(!TanyaRequest.safeParse({ pertanyaan: "Aman keluar?", lokasi: { ...LOK, adm4: "../../etc" } }).success);
  assert.ok(!TanyaRequest.safeParse({ pertanyaan: "Aman keluar?", rencana: { skor: 400, label: "x" } }).success);
});

(async () => {
  for (const [n, f] of tests) {
    try { await f(); ok++; console.log("  ok  ", n); } catch (e) { console.error("  GAGAL", n, "\n", e); process.exitCode = 1; }
  }
  console.log(`${ok}/${tests.length} lulus`);
})();
