// Jalankan: npx tsx tests/unit/cuaca-jam.test.ts  (Lokasi: cuaca per jam, zona waktu, koordinat desa)
import assert from "node:assert/strict";
import { dariKodeWmo, dariSimbolMet, jamMulaiSekarang, kategoriUv, uraiMetJam, uraiOpenMeteoJam, waktuLokal, zonaUntukProvinsi, type RawOpenMeteoJam } from "@/lib/data/cuaca-jam";
import { koordinatWajar } from "@/lib/geo/koordinat-desa";

let ok = 0;
const tests: Array<[string, () => void]> = [];
const t = (n: string, f: () => void) => tests.push([n, f]);

const jam = Array.from({ length: 72 }, (_, i) => `2026-11-${String(20 + Math.floor(i / 24)).padStart(2, "0")}T${String(i % 24).padStart(2, "0")}:00`);
const RAW: RawOpenMeteoJam = {
  hourly: { time: jam, temperature_2m: jam.map((_, i) => 25 + (i % 24 > 6 && i % 24 < 18 ? 6 : 0)), apparent_temperature: jam.map(() => 33.4), precipitation_probability: jam.map((_, i) => (i % 24 === 15 ? 90 : 10)), precipitation: jam.map(() => 0), weather_code: jam.map((_, i) => (i % 24 === 15 ? 95 : 2)), wind_speed_10m: jam.map(() => 8.4), wind_direction_10m: jam.map(() => 180), relative_humidity_2m: jam.map(() => 80), uv_index: jam.map(() => 7.2), is_day: jam.map((_, i) => (i % 24 >= 6 && i % 24 < 18 ? 1 : 0)) },
  daily: { time: ["2026-11-20", "2026-11-21", "2026-11-22"], weather_code: [95, 2, 61], temperature_2m_max: [31, 31, 30], temperature_2m_min: [25, 25, 24], precipitation_probability_max: [90, 10, 60], precipitation_sum: [12.3, 0, 4], sunrise: ["2026-11-20T05:09", null, null], sunset: ["2026-11-20T17:41", null, null], uv_index_max: [9, 8, 7] },
};

t("Open-Meteo: 72 jam dan 3 hari terurai; kode WMO menjadi kondisi Indonesia; siang/malam", () => {
  const r = uraiOpenMeteoJam(RAW, "Asia/Jakarta", new Date("2026-11-20T07:30:00Z"));
  assert.equal(r.jam.length, 72);
  assert.equal(r.hari.length, 3);
  assert.equal(r.jam[15].kondisi, "Hujan petir");
  assert.equal(r.jam[15].ikon, "petir");
  assert.equal(r.jam[2].siang, false);
  assert.equal(r.hari[0].terbit, "05:09");
  assert.equal(r.jam[10].terasa, 33.4);
  assert.throws(() => uraiOpenMeteoJam({}, "Asia/Jakarta"));
});

t("jam mulai sekarang: jam berjalan dihitung 'sekarang' dalam zona lokasi (14.30 WIB = jam 14)", () => {
  const r = uraiOpenMeteoJam(RAW, "Asia/Jakarta");
  const m = jamMulaiSekarang(r.jam, "Asia/Jakarta", new Date("2026-11-20T07:30:00Z"));
  assert.equal(m[0].waktu, "2026-11-20T14:00");
  assert.equal(m.length, 72 - 14);
  assert.equal(waktuLokal("2026-11-20T07:30:00Z", "Asia/Jayapura"), "2026-11-20T16:00");
});

t("MET Norway cadangan: hanya bagian per jam; waktu UTC diubah ke WITA; angin m/s ke km/jam; simbol ke kondisi", () => {
  const ts = [
    { time: "2026-11-20T00:00:00Z", data: { instant: { details: { air_temperature: 27, relative_humidity: 80, wind_speed: 5, wind_from_direction: 90 } }, next_1_hours: { summary: { symbol_code: "lightrain_showers_day" }, details: { precipitation_amount: 0.4 } } } },
    { time: "2026-11-20T01:00:00Z", data: { instant: { details: { air_temperature: 28 } }, next_1_hours: { summary: { symbol_code: "partlycloudy_night" }, details: {} } } },
    { time: "2026-11-22T06:00:00Z", data: { instant: { details: { air_temperature: 26 } }, next_6_hours: { summary: { symbol_code: "rain" }, details: {} } } },
  ];
  const r = uraiMetJam({ properties: { timeseries: ts } }, "Asia/Makassar");
  assert.equal(r.jam.length, 2);
  assert.equal(r.jam[0].waktu, "2026-11-20T08:00");
  assert.equal(r.jam[0].anginKmj, 18);
  assert.equal(r.jam[0].kondisi, "Hujan ringan");
  assert.equal(r.jam[1].siang, false);
  assert.equal(r.hari[0].maks, 28);
  assert.match(r.catatan, /MET Norway/);
  assert.equal(dariSimbolMet("heavyrainandthunder_day").ikon, "petir");
  assert.equal(dariKodeWmo(0).kondisi, "Cerah");
});

t("zona waktu dari provinsi: WIB, WITA, WIT (termasuk Kalimantan yang terbelah)", () => {
  assert.equal(zonaUntukProvinsi("DKI Jakarta"), "Asia/Jakarta");
  assert.equal(zonaUntukProvinsi("Kalimantan Barat"), "Asia/Jakarta");
  assert.equal(zonaUntukProvinsi("Kalimantan Timur"), "Asia/Makassar");
  assert.equal(zonaUntukProvinsi("Nusa Tenggara Timur"), "Asia/Makassar");
  assert.equal(zonaUntukProvinsi("Papua Selatan"), "Asia/Jayapura");
  assert.equal(zonaUntukProvinsi("Maluku Utara"), "Asia/Jayapura");
  assert.equal(kategoriUv(9), "sangat tinggi");
});

t("koordinat desa: dipakai bila di Indonesia dan dekat pusat kab/kota; data rusak atau jauh ditolak", () => {
  const pusat = { lat: -7.80, lon: 110.36 };
  assert.ok(koordinatWajar({ lat: -7.7736, lon: 110.3572 }, pusat));
  assert.ok(!koordinatWajar({ lat: null, lon: 110.3 }, pusat));
  assert.ok(!koordinatWajar({ lat: 1.3, lon: 103.8 }, pusat)); // Singapura: jauh dari pusat kab/kota
  assert.ok(!koordinatWajar({ lat: 40, lon: 110 }, pusat));
});

for (const [n, f] of tests) {
  try { f(); ok++; console.log("  ok  ", n); } catch (e) { console.error("  GAGAL", n, "\n", e); process.exitCode = 1; }
}
console.log(`${ok}/${tests.length} lulus`);
