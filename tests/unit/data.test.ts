import assert from "node:assert/strict";
import { haversineKm, jarakBulat10 } from "@/lib/geo/haversine";
import { normalizeCuaca } from "@/lib/data/cuaca";
import { buildGempa, parseKoordinat } from "@/lib/data/gempa";
import { aggregateAnnual, buildIklim, slope, snapGrid } from "@/lib/data/iklim";
import { toPlainText } from "@/lib/data/sanitize";

// --- haversine: Jakarta -> Bandung ~ 116 km
const d = haversineKm(-6.2088, 106.8456, -6.9175, 107.6191);
assert.ok(d > 110 && d < 125, `jarak ${d}`);
assert.equal(jarakBulat10(116.4), 120);

// --- sanitasi
assert.equal(toPlainText("<b>Hujan</b> &amp; petir<script>x</script>"), "Hujan & petir");

// --- cuaca (bentuk mengikuti dokumentasi infoBMKG; nilai tiruan)
const now = new Date("2026-11-15T02:00:00Z"); // 09:00 WIB
const mk = (dt: string, desc: string, t: number) => ({
  local_datetime: dt, weather_desc: desc, image: "https://api-apps.bmkg.go.id/storage/icon/cuaca/x.svg",
  t, hu: 80, ws: 9, wd: "BD", vs_text: "> 10 km",
});
const cuaca = normalizeCuaca({
  lokasi: { desa: "Test", kecamatan: "K", kotkab: "Kota", provinsi: "Prov", lat: -6.1, lon: 106.8, timezone: "+0700" },
  data: [{ cuaca: [
    [mk("2026-11-15 09:00:00", "Cerah Berawan", 30), mk("2026-11-15 12:00:00", "Hujan Ringan", 28)],
    [mk("2026-11-16 15:00:00", "Hujan Petir", 25)],
    [mk("2026-11-19 15:00:00", "Hujan Lebat", 24)], // di luar 48 jam
  ] }],
}, now);
assert.equal(cuaca.prakiraan.length, 4);
assert.equal(cuaca.prakiraan[0].waktu, "2026-11-15T09:00:00+07:00");
assert.equal(cuaca.ringkasan.hujanLebat48j, true);
assert.equal(cuaca.ringkasan.hujanLebatWaktu, "2026-11-16T15:00:00+07:00");
assert.equal(cuaca.ringkasan.suhuMin, 24);
const aman = normalizeCuaca({ lokasi: {}, data: [{ cuaca: [[mk("2026-11-19 15:00:00", "Hujan Lebat", 24)]] }] }, now);
assert.equal(aman.ringkasan.hujanLebat48j, false);
assert.equal(normalizeCuaca(null, now).prakiraan.length, 0); // tahan terhadap bentuk tak terduga

// --- gempa
assert.deepEqual(parseKoordinat({ Coordinates: "-7.2,110.1" }), { lat: -7.2, lon: 110.1 });
assert.deepEqual(parseKoordinat({ Lintang: "6.12 LS", Bujur: "106.5 BT" }), { lat: -6.12, lon: 106.5 });
const g = (dt: string, mag: string, c: string) => ({
  DateTime: dt, Magnitude: mag, Kedalaman: "10 km", Wilayah: "Test", Coordinates: c,
  Potensi: "Tidak berpotensi tsunami", Shakemap: "abc.mmi.jpg",
});
const gempa = buildGempa(
  { Infogempa: { gempa: g("2026-11-15T01:00:00+00:00", "5.1", "-6.5,106.9") } },
  { Infogempa: { gempa: [g("2026-11-14T10:00:00+00:00", "5.3", "-8.0,112.0")] } },
  { Infogempa: { gempa: [g("2026-11-15T01:00:00+00:00", "5.1", "-6.5,106.9")] } },
  { lat: -6.1, lon: 106.8 }, now,
);
assert.equal(gempa.terbaru?.magnitudo, 5.1);
assert.equal(gempa.terbaru?.shakemapUrl, "https://static.bmkg.go.id/abc.mmi.jpg");
assert.ok((gempa.terbaru?.jarakKm ?? 0) % 10 === 0);
assert.equal(gempa.daftar.length, 2); // duplikat digabung
assert.equal(gempa.ringkasan.gempaDekat24j, true);
assert.equal(buildGempa(null, null, null, undefined, now).terbaru, null);
assert.equal(buildGempa(null, null, null, undefined, now).ringkasan.gempaDekat24j, false);

// --- iklim
assert.equal(snapGrid(-6.2088), -6.25);
assert.equal(snapGrid(106.8456), 106.75);
assert.equal(slope([1, 2, 3], [2, 4, 6]), 2);
const daily = { time: [] as string[], precipitation_sum: [] as (number | null)[], temperature_2m_max: [] as (number | null)[] };
const push = (t: string, p: number | null, tm: number | null) => { daily.time.push(t); daily.precipitation_sum.push(p); daily.temperature_2m_max.push(tm); };
push("2000-01-01", 0, 30); push("2000-01-02", 0.5, 30); push("2000-01-03", 0, 30); // streak 3
push("2000-01-04", 60, 28); // hujan lebat, memutus
push("2000-01-05", 0, 30); push("2000-01-06", null, null); push("2000-01-07", 0, 30); // null memutus
push("2001-01-01", 51, 31);
const ann = aggregateAnnual(daily);
assert.equal(ann[0].hariHujanLebat, 1);
assert.equal(ann[0].hariKeringBeruntunMaks, 3);
assert.equal(ann[1].hariHujanLebat, 1);
const ik = buildIklim(daily, 2025, now);
assert.equal(ik.ambang.hujanLebatMm, 50);
assert.ok(ik.catatan.includes("ERA5"));

console.log("semua uji lolos");
