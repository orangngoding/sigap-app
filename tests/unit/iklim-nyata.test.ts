// Jalankan: npx tsx tests/unit/iklim-nyata.test.ts  (El Niño/IOD, titik panas satelit, dan pengaruhnya pada sinyal Siaga Iklim)
import assert from "node:assert/strict";
import { dampakGlobal, faseEnso, faseIod, hitungKondisiGlobal, kekuatanEnso, teksEnso, uraiBulananPsl, uraiOni } from "@/lib/data/iklim-global";
import { arahMataAngin, buangGanda, jarakKm, ringkasTitikPanas, uraiFirms } from "@/lib/data/titik-panas";
import { hitungSiagaPekan, teksPekan, type RawPrakiraan } from "@/lib/iklim/pekan";

let ok = 0;
const tests: Array<[string, () => void | Promise<void>]> = [];
const t = (n: string, f: () => void | Promise<void>) => tests.push([n, f]);

const NOW = new Date("2026-11-19T07:00:00Z");
// Cuplikan format nyata berkas NOAA (ONI CPC, deret bulanan PSL dengan nilai tak valid di bulan belum terbit).
const ONI = " SEAS  YR   TOTAL   ANOM\n JJA 2026  29.09   1.80\n JAS 2026  29.12   2.16\n ASO 2026  29.23   2.46\n";
const NINO = "  1948        2026\n 2025    -0.65   -0.40    0.16   -0.04    0.02    0.11    0.08   -0.27   -0.45   -0.52   -0.65   -0.58\n 2026    -0.64   -0.21    0.01    0.50    0.96    1.56    1.89    2.21    2.54    2.72  -99.99  -99.99\n";
const DMI = " 1870 2026 1870\n 2026     0.123     0.529     0.285     0.279     0.146     0.265     0.539 -9999.000 -9999.000 -9999.000 -9999.000 -9999.000\n";

t("ONI dan ambang: El Niño sejak +0,5, kekuatan lemah/sedang/kuat/sangat kuat", () => {
  assert.deepEqual(uraiOni(ONI), { musim: "ASO", tahun: 2026, oni: 2.46 });
  assert.equal(uraiOni("tidak ada data"), null);
  assert.equal(faseEnso(0.49), "netral");
  assert.equal(faseEnso(0.5), "el_nino");
  assert.equal(faseEnso(-0.6), "la_nina");
  assert.deepEqual([0.4, 0.7, 1.2, 1.6, 2.0, -2.3].map(kekuatanEnso), [null, "lemah", "sedang", "kuat", "sangat_kuat", "sangat_kuat"]);
  assert.deepEqual([0.5, -0.45, 0.1].map(faseIod), ["positif", "negatif", "netral"]);
});

t("deret PSL: nilai tak valid dilewati, bulan valid terakhir diambil", () => {
  assert.deepEqual(uraiBulananPsl(NINO), { tahun: 2026, bulan: 9, nilai: 2.72 });
  assert.deepEqual(uraiBulananPsl(DMI), { tahun: 2026, bulan: 6, nilai: 0.539 });
});

t("kondisi global dari berkas nyata: El Niño sangat kuat, IOD positif berusia 4 bulan, dampak kering", () => {
  const k = hitungKondisiGlobal(ONI, NINO, DMI, NOW);
  assert.equal(k.enso.fase, "el_nino");
  assert.equal(k.enso.kekuatan, "sangat_kuat");
  assert.equal(k.enso.periode, "Agustus-Oktober 2026");
  assert.equal(k.enso.bulanTerakhir?.bulan, "Oktober 2026");
  assert.equal(k.iod?.fase, "positif");
  assert.equal(k.iod?.usiaBulan, 4);
  assert.equal(k.pengaruh, "kering");
  assert.match(teksEnso(k.enso), /El Niño sangat kuat \(ONI \+2,46 pada Agustus-Oktober 2026\)/);
  assert.ok(k.dampak.some((d) => /karhutla/.test(d)));
  assert.throws(() => hitungKondisiGlobal("rusak", null, null, NOW));
});

t("La Niña kuat: dampak basah (banjir, longsor); IOD tak terbaca tidak menggagalkan", () => {
  const k = hitungKondisiGlobal(" SEAS YR TOTAL ANOM\n OND 2025 25.0 -1.6\n", null, null, NOW);
  assert.equal(k.pengaruh, "basah");
  assert.equal(k.iod, null);
  assert.ok(k.dampak.some((d) => /banjir/i.test(d)));
  const netral = dampakGlobal({ fase: "netral", kekuatan: null, oni: 0.1, periode: "x", bulanTerakhir: null }, null);
  assert.equal(netral.pengaruh, "netral");
});

const CSV = [
  "latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,confidence,version,bright_ti5,frp,daynight",
  "-2.30,113.90,330,0.4,0.4,2026-11-18,0630,N20,nominal,2.0NRT,300,5,D",
  "-2.30,113.90,331,0.4,0.4,2026-11-18,0710,N21,nominal,2.0NRT,300,6,D",
  "-2.31,113.95,340,0.4,0.4,2026-11-19,0100,N20,high,2.0NRT,300,9,D",
  "-2.20,113.92,320,0.4,0.4,2026-11-19,0200,N20,low,2.0NRT,300,2,D",
  "35.0,139.0,330,0.4,0.4,2026-11-19,0100,N20,nominal,2.0NRT,300,5,D",
  "-6.25,106.80,330,0.4,0.4,2026-11-10,0100,N20,nominal,2.0NRT,300,5,D",
].join("\n");

t("FIRMS: kepercayaan rendah dan luar Indonesia dibuang, deteksi ganda satelit digabung", () => {
  const titik = uraiFirms(CSV);
  assert.equal(titik.length, 4); // 2 ganda + 1 + 1 (Jakarta lama); baris low dan Jepang dibuang
  assert.equal(buangGanda(titik).length, 3);
  assert.deepEqual(uraiFirms("bukan,csv"), []);
});

t("ringkasan titik panas: radius, 24 jam, titik terdekat dan arahnya, hanya 7 hari terakhir", () => {
  const r = ringkasTitikPanas(buangGanda(uraiFirms(CSV)), -2.21, 113.92, NOW);
  assert.equal(r.dalam7h, 2);
  assert.equal(r.dalam24j, 1);
  assert.ok(r.terdekat && r.terdekat.km < 20);
  assert.equal(r.nasional.total, 2);
  assert.equal(r.nasional.perWilayah[0].wilayah, "Kalimantan");
  assert.ok(Math.abs(jarakKm(-6.2, 106.8, -6.2, 107.8) - 110.5) < 2);
  assert.equal(arahMataAngin(0, 0, 1, 0), "utara");
  assert.equal(arahMataAngin(0, 0, 0, 1), "timur");
  assert.equal(arahMataAngin(0, 0, -1, -1), "barat daya");
});

// ---------- Pengaruh pada sinyal pekan ----------
const tgl = (i: number) => new Date(Date.UTC(2026, 10, 19 + i)).toISOString().slice(0, 10);
function prakiraan(hujan: (i: number) => number): RawPrakiraan {
  const d = { time: [] as string[], temperature_2m_max: [] as number[], apparent_temperature_max: [] as number[], precipitation_sum: [] as number[], precipitation_probability_max: [] as number[], relative_humidity_2m_min: [] as number[], wind_speed_10m_max: [] as number[] };
  for (let i = -30; i < 16; i++) {
    d.time.push(tgl(i));
    d.temperature_2m_max.push(33);
    d.apparent_temperature_max.push(37);
    d.precipitation_sum.push(hujan(i));
    d.precipitation_probability_max.push(20);
    d.relative_humidity_2m_min.push(55);
    d.wind_speed_10m_max.push(10);
  }
  return { daily: d };
}
const tp = (dalam7h: number, dalam24j: number) => ({ sumber: { nama: "FIRMS", url: "x", diambilPada: NOW.toISOString(), lisensi: "x" }, stale: false, radiusKm: 50, dalam24j, dalam7h, terdekat: { km: 12, arah: "barat" }, nasional: { total: 5000, perWilayah: [] }, catatan: "" });
const o = (provinsi: string, titikPanas: ReturnType<typeof tp> | null) => ({ lat: -2.2, lon: 113.9, provinsi, now: NOW, global: hitungKondisiGlobal(ONI, NINO, DMI, NOW), titikPanas });

t("karhutla: banyak titik panas + cuaca kering 3 hari = waspada; cuaca basah = hanya perhatikan", () => {
  const kering = hitungSiagaPekan(prakiraan(() => 0), null, o("Kalimantan Tengah", tp(60, 12)));
  const api = kering.sinyal.find((x) => x.jenis === "api")!;
  assert.equal(api.tingkat, "waspada");
  assert.match(api.fakta, /60 titik panas dalam radius 50 km/);
  assert.match(api.fakta, /terdekat 12 km ke arah barat/);
  const basah = hitungSiagaPekan(prakiraan(() => 20), null, o("Kalimantan Tengah", tp(60, 12)));
  assert.equal(basah.sinyal.find((x) => x.jenis === "api")?.tingkat, "perhatikan");
  assert.match(basah.sinyal.find((x) => x.jenis === "api")?.judul ?? "", /karhutla/);
});

t("kota besar: sedikit titik panas (pembakaran sampah, industri) tidak jadi peringatan; sangat banyak baru tampil", () => {
  assert.equal(hitungSiagaPekan(prakiraan(() => 5), null, o("DKI Jakarta", tp(7, 0))).sinyal.some((x) => x.jenis === "api"), false);
  assert.equal(hitungSiagaPekan(prakiraan(() => 5), null, o("DKI Jakarta", tp(16, 0))).sinyal.some((x) => x.jenis === "api"), true);
  assert.equal(hitungSiagaPekan(prakiraan(() => 5), null, o("Kalimantan Tengah", tp(2, 0))).sinyal.some((x) => x.jenis === "api"), false);
});

t("PM2.5 sangat tinggi menjadi waspada hanya bila titik panas membenarkan", () => {
  const udara = { hourly: { time: Array.from({ length: 24 }, (_, j) => `${tgl(0)}T${String(j).padStart(2, "0")}:00`), pm2_5: Array.from({ length: 24 }, () => 180) } };
  const tanpa = hitungSiagaPekan(prakiraan(() => 5), udara, o("Riau", tp(0, 0)));
  assert.equal(tanpa.sinyal.find((x) => x.jenis === "udara")?.tingkat, "perhatikan");
  const dengan = hitungSiagaPekan(prakiraan(() => 5), udara, o("Riau", tp(20, 5)));
  assert.equal(dengan.sinyal.find((x) => x.jenis === "udara")?.tingkat, "waspada");
});

t("teks untuk AI memuat El Niño, IOD, dan jumlah titik panas persis", () => {
  const r = hitungSiagaPekan(prakiraan(() => 5), null, o("Kalimantan Tengah", tp(8, 1)));
  const teks = teksPekan(r, tgl(0));
  assert.match(teks, /Kondisi iklim global: El Niño sangat kuat \(ONI \+2,46/);
  assert.match(teks, /IOD positif \(DMI 0,539 pada Juli 2026\)/);
  assert.match(teks, /8 dalam 7 hari, 1 dalam 24 jam/);
  assert.equal(r.global?.enso.fase, "el_nino");
  assert.equal(r.titikPanas?.dalam7h, 8);
});

// ---------- Klimatologi pengamatan (ERA5 1991-2020) ----------
function arsipSintetis(tahunAwal: number, tahunAkhir: number) {
  const time: string[] = [];
  const hujan: number[] = [];
  const suhu: number[] = [];
  for (let d = Date.UTC(tahunAwal, 0, 1); d <= Date.UTC(tahunAkhir, 11, 31); d += 86_400_000) {
    const tgl = new Date(d);
    const bulan = tgl.getUTCMonth();
    time.push(tgl.toISOString().slice(0, 10));
    const basah = bulan === 11 || bulan <= 2; // Des-Mar: musim hujan, hampir tiap hari hujan deras
    const kering = bulan === 6 || bulan === 7; // Jul-Agu: tanpa hujan
    hujan.push(kering ? 0 : basah ? 14 + (tgl.getUTCDate() % 7) * 3 : tgl.getUTCDate() % 4 === 0 ? 8 : 0.3);
    suhu.push(30 + (bulan >= 7 && bulan <= 9 ? 2 : 0) + ((tgl.getUTCDate() * 7) % 5) / 5);
  }
  return { daily: { time, temperature_2m_max: suhu, precipitation_sum: hujan } };
}

t("klimatologi: pola bulanan, bulan kering BMKG (<60 mm), puncak hujan, dan kemarau terpanjang", async () => {
  const { hitungKlimatologi } = await import("@/lib/data/klimatologi");
  const { kalenderDariBulanan } = await import("@/lib/iklim/ketahanan");
  const k = hitungKlimatologi(arsipSintetis(1991, 2020), -6.25, 106.87, NOW);
  assert.equal(k.bulanan.length, 12);
  assert.equal(k.periode.label, "1991-2020");
  assert.ok(k.bulanan[0].hujanMm > 400 && k.bulanan[6].hujanMm === 0);
  const kal = kalenderDariBulanan(k.bulanan);
  assert.equal(kal[6].kering && kal[7].kering, true);
  assert.equal(kal[0].kering, false);
  assert.ok(kal.filter((b) => b.puncakHujan).every((b) => [11, 0, 1, 2].includes(b.bulan)));
  assert.ok(k.kemarauTerburuk >= 62, `kemarau terburuk ${k.kemarauTerburuk}`); // Juli + Agustus = 62 hari
  assert.equal(k.sumber.lisensi, "CC BY 4.0");
});

t("klimatologi: data kurang dari 25 tahun atau tanpa kolom ditolak", async () => {
  const { hitungKlimatologi } = await import("@/lib/data/klimatologi");
  assert.throws(() => hitungKlimatologi(arsipSintetis(2011, 2020), 0, 100, NOW), /kurang dari 25 tahun/);
  assert.throws(() => hitungKlimatologi({ daily: { time: ["2000-01-01"] } }, 0, 100, NOW));
});

(async () => {
for (const [n, f] of tests) {
  try { await f(); ok++; console.log("  ok  ", n); } catch (e) { console.error("  GAGAL", n, "\n", e); process.exitCode = 1; }
}
console.log(`${ok}/${tests.length} lulus`);
})();
