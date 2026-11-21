// Jalankan: npx tsx tests/unit/iklim-masa-depan.test.ts  (Mesin Waktu Iklim: proyeksi + rencana adaptasi)
import assert from "node:assert/strict";
import { hitungProyeksi, persentil, deretDariRaw, type ProyeksiResponse } from "@/lib/data/proyeksi";
import { adaptasiCadangan, susunAdaptasi, teksProyeksi, type HasilAdaptasi } from "@/lib/ai/adaptasi";
import { AdaptasiKeluaran, AdaptasiRequest } from "@/lib/ai/schema";
import type { LlmProvider, PermintaanLlm } from "@/lib/ai/provider";
import { AnggaranHarian, CacheTtl } from "@/lib/ai/runtime";

let ok = 0;
const tests: Array<[string, () => void | Promise<void>]> = [];
const t = (n: string, f: () => void | Promise<void>) => tests.push([n, f]);

/** Deret harian sintetis 1991-2050: suhu naik linear `laju` °C per tahun, musim kering tiap Agustus. */
function rawSintetis(laju = 0.03) {
  const time: string[] = [];
  const a: number[] = [];
  const b: number[] = [];
  const hA: number[] = [];
  const hB: number[] = [];
  for (let d = Date.UTC(1991, 0, 1); d <= Date.UTC(2050, 11, 31); d += 86_400_000) {
    const tgl = new Date(d);
    const th = tgl.getUTCFullYear();
    const hari = Math.floor((d - Date.UTC(th, 0, 1)) / 86_400_000);
    time.push(tgl.toISOString().slice(0, 10));
    const musim = 2 * Math.sin((hari / 365) * 2 * Math.PI);
    const dasar = 31 + musim + laju * (th - 1991) + ((hari * 7919) % 13) / 10; // variasi deterministik
    a.push(dasar);
    b.push(dasar - 0.4);
    const kering = tgl.getUTCMonth() === 7;
    const hujan = kering ? 0 : hari % 3 === 0 ? 5 + (hari % 40) : 0.2;
    hA.push(hujan);
    hB.push(hujan);
  }
  return {
    daily: {
      time,
      temperature_2m_max_EC_Earth3P_HR: a,
      temperature_2m_max_MRI_AGCM3_2_S: b,
      precipitation_sum_EC_Earth3P_HR: hA,
      precipitation_sum_MRI_AGCM3_2_S: hB,
    },
  };
}

const NOW = new Date("2026-11-18T08:00:00Z");
const P = hitungProyeksi(rawSintetis(), -6.25, 106.87, NOW);

t("persentil interpolasi linear", () => {
  assert.equal(persentil([1, 2, 3, 4, 5], 50), 3);
  assert.equal(persentil([10, 20], 25), 12.5);
  assert.ok(Number.isNaN(persentil([], 90)));
});

t("kolom multi-model bersufiks dibaca per model; kolom hilang -> null", () => {
  const raw = rawSintetis();
  assert.ok(deretDariRaw(raw, "EC_Earth3P_HR", false));
  assert.equal(deretDariRaw({ daily: { time: ["2000-01-01"] } }, "EC_Earth3P_HR", false), null);
  assert.throws(() => hitungProyeksi({ daily: { time: [] } }, 0, 100));
});

t("tiga periode 20 tahun; pemanasan terbaca pada suhu dan hari sangat panas", () => {
  assert.deepEqual(P.periode.map((p) => [p.awal, p.akhir]), [[1991, 2010], [2011, 2030], [2031, 2050]]);
  const [dulu, kini, depan] = P.periode;
  // Laju 0,03°C/tahun selama 40 tahun antar-titik tengah periode = sekitar 1,2°C.
  assert.ok(Math.abs(P.perubahan.suhuMaksRata - 1.2) < 0.15, String(P.perubahan.suhuMaksRata));
  assert.ok(dulu.metrik.hariSangatPanas.rata < kini.metrik.hariSangatPanas.rata);
  assert.ok(kini.metrik.hariSangatPanas.rata < depan.metrik.hariSangatPanas.rata);
  // Ambang "sangat panas" = persentil 95 masa lalu, jadi masa lalu sekitar 5% hari (sekitar 18 hari).
  assert.ok(Math.abs(dulu.metrik.hariSangatPanas.rata - 18.3) < 3, String(dulu.metrik.hariSangatPanas.rata));
  // Model kedua 0,4°C lebih dingin namun ambangnya relatif per model: rentang tetap sempit.
  assert.ok(depan.metrik.suhuMaksRata.min < depan.metrik.suhuMaksRata.maks);
});

t("musim kering Agustus terdeteksi sebagai kemarau terpanjang 31 hari", () => {
  for (const p of P.periode) assert.ok(p.metrik.keringTerpanjang.rata >= 31, String(p.metrik.keringTerpanjang.rata));
});

t("deret tahunan 60 tahun untuk grafik; sumber dan lisensi tercatat", () => {
  assert.equal(P.tahunan.length, 60);
  assert.equal(P.tahunan[0].tahun, 1991);
  assert.equal(P.sumber.lisensi, "CC BY 4.0");
  assert.equal(P.model.length, 2);
  assert.equal(P.grid.lat, -6.25); // grid proyeksi 0,25° (resolusi model): sel terdekat, bukan sel pesisir 0,5°
});

t("teks proyeksi memuat angka periode yang dihitung kode", () => {
  const teks = teksProyeksi(P);
  assert.match(teks, /1991-2010/);
  assert.match(teks, new RegExp(String(P.periode[2].metrik.hariSangatPanas.rata).replace(".", ",")));
});

// ---------- Rencana adaptasi ----------
const keluaran = (ekstra: Record<string, unknown> = {}) => JSON.stringify({
  ringkasan: "Menuju 2050 wilayah ini diproyeksikan lebih panas, sehingga rumah dan kebiasaan keluarga perlu disiapkan bertahap.",
  dampak: [
    { judul: "Siang makin terik", isi: "Hari sangat panas diproyeksikan lebih sering, berat bagi lansia." },
    { judul: "Air lebih berharga", isi: "Kemarau tetap panjang, cadangan air penting." },
  ],
  langkah: [
    { kategori: "kesehatan", judul: "Atur jam aktivitas", alasan: "Hindari siang terik.", kapan: "sekarang", biaya: "rendah" },
    { kategori: "rumah", judul: "Pasang peneduh jendela", alasan: "Mengurangi panas di dalam rumah.", kapan: "1-5 tahun", biaya: "sedang" },
    { kategori: "air", judul: "Tampung air hujan", alasan: "Cadangan saat kemarau.", kapan: "1-5 tahun", biaya: "sedang" },
    { kategori: "komunitas", judul: "Tanam pohon bersama warga", alasan: "Menurunkan suhu lingkungan.", kapan: "jangka panjang", biaya: "rendah" },
  ],
  ...ekstra,
});
function penyedia(teks: string) {
  const diminta: PermintaanLlm[] = [];
  const p: LlmProvider = { nama: "palsu", hasilJson: async (r) => { diminta.push(r); return teks; } };
  return { p, diminta };
}
const W = { kabKota: "Jakarta Timur", provinsi: "DKI Jakarta" };
const deps = (p: LlmProvider) => ({ providers: [p], anggaran: new AnggaranHarian(() => 100), cache: new CacheTtl<HasilAdaptasi>(60_000), sekarang: NOW });

t("AI: proyeksi dan konteks keluarga masuk blok DATA; koordinat tidak dikirim", async () => {
  const { p, diminta } = penyedia(keluaran());
  const h = await susunAdaptasi(P, W, { lansia: 1, jumlahAnggota: 4 }, deps(p));
  assert.equal(h.mode, "ai");
  assert.equal(h.langkah.length, 4);
  assert.match(diminta[0].user, /PROYEKSI/);
  assert.match(diminta[0].user, /Jakarta Timur/);
  assert.doesNotMatch(diminta[0].user, /106[.,]87/);
});

t("AI menyebut angka karangan -> cadangan templat", async () => {
  const { p } = penyedia(keluaran({ ringkasan: "Pada 2050 akan ada 73 hari sangat panas di wilayah ini, jadi keluarga perlu bersiap dari sekarang." }));
  const h = await susunAdaptasi(P, W, {}, deps(p));
  assert.equal(h.mode, "cadangan");
});

t("AI menyebut rupiah -> cadangan templat", async () => {
  const { p } = penyedia(keluaran({ ringkasan: "Siapkan dana sekitar Rp 500 ribu untuk peneduh agar rumah tetap sejuk menuju 2050 nanti." }));
  assert.equal((await susunAdaptasi(P, W, {}, deps(p))).mode, "cadangan");
});

t("JSON rusak atau skema salah -> cadangan; anggaran habis tidak memanggil AI", async () => {
  assert.equal((await susunAdaptasi(P, W, {}, deps(penyedia("{bukan json").p))).mode, "cadangan");
  assert.equal((await susunAdaptasi(P, W, {}, deps(penyedia(JSON.stringify({ ringkasan: "x" })).p))).mode, "cadangan");
  const { p, diminta } = penyedia(keluaran());
  const h = await susunAdaptasi(P, W, {}, { ...deps(p), anggaran: new AnggaranHarian(() => 0) });
  assert.equal(h.mode, "cadangan");
  assert.equal(diminta.length, 0);
});

t("hasil di-cache per grid dan keluarga", async () => {
  const { p, diminta } = penyedia(keluaran());
  const d = deps(p);
  await susunAdaptasi(P, W, { balita: 1 }, d);
  await susunAdaptasi(P, W, { balita: 1 }, d);
  assert.equal(diminta.length, 1);
  await susunAdaptasi(P, W, { balita: 2 }, d);
  assert.equal(diminta.length, 2);
});

t("cadangan: mengikuti arah perubahan, lolos skema, menyebut kelompok rentan", () => {
  const c = adaptasiCadangan(P, { lansia: 1 });
  assert.ok(c.dampak.length >= 2 && c.dampak.length <= 3);
  assert.ok(c.langkah.length >= 4 && c.langkah.length <= 6);
  assert.ok(c.langkah.some((l) => l.kategori === "kesehatan"));
  assert.match(c.dampak[0].isi, /lansia/i);
  assert.ok(AdaptasiKeluaran.safeParse(c).success, "cadangan harus lolos skema keluaran");
  // Iklim tanpa perubahan: tetap 2 dampak dan langkah dasar.
  const datar: ProyeksiResponse = hitungProyeksi(rawSintetis(0), 0, 100, NOW);
  const d = adaptasiCadangan(datar);
  assert.equal(d.dampak.length, 2);
  assert.ok(d.langkah.length >= 4);
  assert.ok(AdaptasiKeluaran.safeParse(d).success);
});

t("permintaan adaptasi divalidasi (koordinat di luar Indonesia ditolak)", () => {
  assert.ok(AdaptasiRequest.safeParse({ lokasi: { lat: -6.25, lon: 106.87, ...W } }).success);
  assert.ok(!AdaptasiRequest.safeParse({ lokasi: { lat: 40, lon: 106.87, ...W } }).success);
  assert.ok(!AdaptasiRequest.safeParse({ lokasi: { lat: -6.25, lon: 106.87, kabKota: "<script>", provinsi: "x" } }).success);
});

(async () => {
  for (const [n, f] of tests) {
    try { await f(); ok++; console.log("  ok  ", n); } catch (e) { console.error("  GAGAL", n, "\n", e); process.exitCode = 1; }
  }
  console.log(`${ok}/${tests.length} lulus`);
})();
