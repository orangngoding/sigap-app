// Jalankan: npx tsx tests/unit/cadangan-iklim.test.ts  (Siaga Iklim tetap tampil di SEMUA lokasi saat Open-Meteo penuh:
// NASA POWER, metode delta CMIP6, MET Norway, dan pemutus kuota)
import assert from "node:assert/strict";
import { potongTahun, uraiPower, type RawPower } from "@/lib/data/nasa-power";
import { klimatologiDariPower } from "@/lib/data/klimatologi";
import { DELTA_CCKP, anomaliPada, deltaSisa, proyeksiDariPengamatan, tahunPenuhTerakhir } from "@/lib/data/proyeksi-delta";
import { iklimDariPower } from "@/lib/data/iklim";
import { pilihProyeksi, type ProyeksiKota } from "@/lib/data/iklim-kota";
import { harianMetNo, rawDariCadangan, SUMBER_CADANGAN_PEKAN, type RawMetNo } from "@/lib/iklim/pekan-cadangan";
import { hitungSiagaPekan } from "@/lib/iklim/pekan";
import { adaptasiCadangan, teksProyeksi } from "@/lib/ai/adaptasi";
import { AdaptasiKeluaran } from "@/lib/ai/schema";
import { ApiError } from "@/lib/http/api-error";
import type { DeretModel, ProyeksiResponse } from "@/lib/data/proyeksi";

let ok = 0;
const tests: Array<[string, () => void | Promise<void>]> = [];
const t = (n: string, f: () => void | Promise<void>) => tests.push([n, f]);

/** Pengamatan sintetis 1991-2025: musim kering Juli-September (tanpa hujan), suhu naik 0,01°C/tahun. */
function pengamatan(akhir = 2025): DeretModel {
  const d: DeretModel = { time: [], tmax: [], hujan: [] };
  for (let ms = Date.UTC(1991, 0, 1); ms <= Date.UTC(akhir, 11, 31); ms += 86_400_000) {
    const x = new Date(ms);
    const th = x.getUTCFullYear();
    const b = x.getUTCMonth();
    const hari = Math.floor(ms / 86_400_000);
    d.time.push(x.toISOString().slice(0, 10));
    d.tmax.push(31 + 0.01 * (th - 1991) + ((hari * 7919) % 17) / 10 - 0.8);
    d.hujan.push(b >= 6 && b <= 8 ? 0 : hari % 3 === 0 ? 4 + (hari % 37) : 0.3);
  }
  return d;
}
const OBS = pengamatan();

t("NASA POWER: tanggal diurutkan dan diubah ke ISO; nilai isian -999 menjadi null", () => {
  const raw: RawPower = { properties: { parameter: { PRECTOTCORR: { "20261117": -999, "20261115": 3.2, "20261116": 0 }, T2M_MAX: { "20261115": 31.4, "20261116": 32, "20261117": -999 } } } };
  const d = uraiPower(raw);
  assert.deepEqual(d.time, ["2026-11-15", "2026-11-16", "2026-11-17"]);
  assert.deepEqual(d.hujan, [3.2, 0, null]);
  assert.deepEqual(d.tmax, [31.4, 32, null]);
  assert.throws(() => uraiPower({ properties: { parameter: {} } }));
  assert.equal(potongTahun(OBS, 1991, 2020).time.at(-1), "2020-12-31");
});

t("Musim ini dari NASA POWER: 1991-2020, bulan kering Juli-September terbaca, sumber diberi nama jelas", () => {
  const k = klimatologiDariPower(OBS, -10.17, 123.6, new Date("2026-11-19T00:00:00Z"));
  assert.deepEqual(k.periode, { awal: 1991, akhir: 2020, label: "1991-2020" });
  assert.equal(k.bulanan.length, 12);
  assert.equal(k.bulanan[7].hujanMm, 0);
  assert.ok(k.bulanan[0].hujanMm > 60);
  assert.ok(k.kemarauTerburuk >= 92);
  assert.match(k.sumber.nama, /NASA POWER/);
  assert.match(k.catatan, /ERA5 sedang penuh/);
  assert.deepEqual(k.grid, { lat: -10, lon: 123.5 });
});

t("anomali CCKP: nol pada acuan, sama dengan nilai CCKP di titik tengah periode, sisa pemanasan positif", () => {
  const m = DELTA_CCKP.anggota[1];
  assert.equal(anomaliPada(m.suhu, 2004.5), 0);
  assert.ok(anomaliPada(m.suhu, 2000.5) < 0 && anomaliPada(m.suhu, 2000.5) > -0.2); // 1991-2010 sedikit lebih dingin dari acuan
  assert.equal(anomaliPada(m.suhu, 2029.5), 0.66);
  assert.ok(Math.abs(anomaliPada(m.suhu, 2049.5) - 1.48) < 1e-9);
  const sisa = deltaSisa(m.suhu, 2015.5);
  assert.ok(sisa > 0.6 && sisa < 0.9, String(sisa)); // sebagian pemanasan sudah terjadi pada 20 tahun terakhir
  // Urutan anggota: persentil 10 < median < persentil 90.
  const s = DELTA_CCKP.anggota.map((a) => deltaSisa(a.suhu, 2015.5));
  assert.ok(s[0] < s[1] && s[1] < s[2]);
});

t("metode delta: struktur sama dengan proyeksi utama, saat ini = pengamatan, 2031-2050 lebih panas dengan rentang", () => {
  const p = proyeksiDariPengamatan(OBS, -6.2, 106.85, new Date("2026-11-19T00:00:00Z"));
  assert.equal(tahunPenuhTerakhir(OBS), 2025);
  assert.equal(p.metode?.id, "pengamatan-delta");
  assert.equal(p.metode?.akhirAmati, 2025);
  assert.deepEqual(p.periode.map((x) => [x.awal, x.akhir]), [[1991, 2010], [2011, 2025], [2031, 2050]]);
  const [dulu, kini, depan] = p.periode;
  assert.ok(depan.metrik.suhuMaksRata.rata > kini.metrik.suhuMaksRata.rata);
  assert.ok(depan.metrik.hariSangatPanas.rata > dulu.metrik.hariSangatPanas.rata);
  assert.ok(depan.metrik.suhuMaksRata.min < depan.metrik.suhuMaksRata.maks, "rentang persentil 10-90");
  assert.equal(kini.metrik.suhuMaksRata.min, kini.metrik.suhuMaksRata.maks, "pengamatan tidak punya rentang model");
  // Grafik tahunan hanya tahun pengamatan, bukan tahun "buatan" 2031-2050.
  assert.equal(p.tahunan.at(-1)?.tahun, 2025);
  assert.equal(p.tahunan.length, 35);
  // Kemarau masa depan berbasis 20 tahun terakhir: tidak tampak memendek dibanding saat ini.
  assert.ok(p.kemarauTerburuk["2050"] >= p.kemarauTerburuk.kini - 3, JSON.stringify(p.kemarauTerburuk));
  assert.match(p.catatan, /PENGAMATAN NASA POWER/);
  assert.match(p.sumber.nama, /Climate Change Knowledge Portal/);
  assert.throws(() => proyeksiDariPengamatan(pengamatan(2012), 0, 100));
  // Pemanasan 2031-2050 dipatok ke 1991-2010 + delta CCKP penuh (sekitar 1,2°C median), tidak bergantung tren lokal data.
  const naik = depan.metrik.suhuMaksRata.rata - dulu.metrik.suhuMaksRata.rata;
  assert.ok(Math.abs(naik - (p.metode?.perubahanSuhuC ?? 0)) < 0.15, String(naik));
  assert.ok((p.metode?.perubahanSuhuC ?? 0) > 1 && (p.metode?.perubahanSuhuC ?? 0) < 1.3);
  // Data dengan tren lokal MENURUN (artefak reanalisis) tetap memberi masa depan lebih panas dari 1990-an.
  const turun = pengamatan();
  turun.tmax = turun.tmax.map((v, i) => (v as number) - 0.04 * (Number(turun.time[i].slice(0, 4)) - 1991));
  const pt = proyeksiDariPengamatan(turun, 0, 100);
  assert.ok(pt.periode[2].metrik.hariSangatPanas.rata > pt.periode[0].metrik.hariSangatPanas.rata);
});

t("metode delta tetap bisa dipakai rencana adaptasi (teks AI dan cadangan templat lolos skema)", () => {
  const p = proyeksiDariPengamatan(OBS, -6.2, 106.85);
  assert.match(teksProyeksi(p), /2011-2025/);
  assert.ok(AdaptasiKeluaran.safeParse(adaptasiCadangan(p, { lansia: 1 })).success);
});

t("Lokasi 'Yang sudah terjadi' dari NASA POWER: deret tahunan sampai tahun lalu", () => {
  const r = iklimDariPower(OBS, new Date("2026-11-19T00:00:00Z"));
  assert.equal(r.periode.akhir, 2025);
  assert.equal(r.tahunan[0].tahun, 1991);
  assert.ok(r.tahunan.every((y) => y.hariKeringBeruntunMaks >= 92));
  assert.match(r.sumber.nama, /NASA POWER/);
});

const KOTA: ProyeksiKota[] = [{ nama: "Jakarta", lat: -6.2, lon: 106.85, data: proyeksiDariPengamatan(OBS, -6.2, 106.85) }];
const tolak = async (): Promise<ProyeksiResponse> => { throw new ApiError("BATAS_HULU"); };

t("pilih proyeksi: penyedia menolak -> cadangan lokal dulu; lokal gagal -> kota bawaan; semua gagal -> galat asli", async () => {
  const lokal = proyeksiDariPengamatan(OBS, -6.6, 106.8);
  const r = await pilihProyeksi(KOTA, -6.6, 106.8, tolak, async () => lokal);
  assert.equal(r.metode?.id, "pengamatan-delta");
  assert.equal(r.perkiraan, undefined);
  const r2 = await pilihProyeksi(KOTA, -6.6, 106.8, tolak, async () => { throw new Error("POWER mati"); });
  assert.equal(r2.perkiraan?.alasan, "cadangan-kuota");
  // Jayapura: jauh dari kota bawaan, tetapi cadangan lokal membuatnya tetap tampil.
  const r3 = await pilihProyeksi(KOTA, -2.53, 140.7, tolak, async () => lokal);
  assert.equal(r3.metode?.id, "pengamatan-delta");
  await assert.rejects(() => pilihProyeksi(KOTA, -2.53, 140.7, tolak, async () => { throw new Error("x"); }), (e: unknown) => e instanceof ApiError && e.code === "BATAS_HULU");
});

/** Deret MET Norway sintetis: per jam selama 48 jam, lalu per 6 jam sampai 9 hari (seperti layanan aslinya). */
function metContoh(mulai = Date.UTC(2026, 10, 19, 0)): RawMetNo {
  const ts: NonNullable<NonNullable<RawMetNo["properties"]>["timeseries"]> = [];
  for (let j = 0; j < 48; j++) {
    const ms = mulai + j * 3_600_000;
    ts.push({ time: new Date(ms).toISOString(), data: { instant: { details: { air_temperature: 26 + (j % 24 < 8 ? 6 : 0), apparent_air_temperature: 30, relative_humidity: 70, wind_speed: 5 } }, next_1_hours: { details: { precipitation_amount: 1 } }, next_6_hours: { details: { precipitation_amount: 6, air_temperature_max: 31 } } } });
  }
  for (let j = 48; j <= 9 * 24; j += 6) {
    const ms = mulai + j * 3_600_000;
    ts.push({ time: new Date(ms).toISOString(), data: { instant: { details: { air_temperature: 28, relative_humidity: 40, wind_speed: 2 } }, next_6_hours: { details: { precipitation_amount: 0, air_temperature_max: 33 } } } });
  }
  return { properties: { timeseries: ts } };
}

t("MET Norway: hujan per jam tidak dihitung dobel dengan nilai 6 jam; angin m/s -> km/jam; hari terpotong dibuang", () => {
  const now = new Date(Date.UTC(2026, 10, 18, 17)); // 19 Nov 00:00 WIB
  const h = harianMetNo(metContoh(), now);
  const hari = [...h.keys()];
  assert.equal(hari[0], "2026-11-19");
  const pertama = h.get("2026-11-19")!;
  assert.equal(pertama.hujan, 17); // 17 jam pertama (07:00 WIB ke atas) berupa per jam, 1 mm per jam
  assert.equal(pertama.angin, 18); // 5 m/s
  assert.equal(pertama.tmax, 32);
  // Hari terakhir yang hanya tertutup sebagian (kurang dari 18 jam) tidak ditampilkan sebagai hari kering palsu.
  for (const v of h.values()) assert.ok(v.jamHujan >= 18 || v === pertama);
});

t("cadangan Minggu ini: 30 hari NASA POWER + prakiraan MET; hari tanpa data tidak memutus deret kering; sumber diganti", () => {
  const now = new Date(Date.UTC(2026, 10, 19, 1)); // 19 Nov 08:00 WIB
  const lampau: DeretModel = { time: [], tmax: [], hujan: [] };
  for (let k = 31; k >= 1; k--) {
    lampau.time.push(new Date(Date.UTC(2026, 10, 19) - k * 86_400_000).toISOString().slice(0, 10));
    lampau.tmax.push(33);
    lampau.hujan.push(k <= 3 ? null : 0); // tiga hari terakhir belum tersedia di NASA POWER
  }
  const raw = rawDariCadangan(metContoh(Date.UTC(2026, 10, 18, 17)), lampau, now);
  assert.equal(raw.daily?.time?.[0], "2026-10-20");
  assert.equal(raw.daily?.time?.[30], "2026-11-19");
  const s = hitungSiagaPekan(raw, null, { lat: -10, lon: 123.5, provinsi: "NUSA TENGGARA TIMUR", now, sumber: SUMBER_CADANGAN_PEKAN, catatan: "x" });
  assert.equal(s.keringKini, 27); // 27 hari kering yang diketahui; 3 hari tanpa data tidak dihitung dan tidak memutus
  assert.match(s.sumber.nama, /MET Norway/);
  assert.equal(s.catatan, "x");
  assert.ok(s.sinyal.some((x) => x.jenis === "kering"));
  assert.throws(() => rawDariCadangan({ properties: { timeseries: [] } }, null, now));
});

t("pemutus kuota: setelah Open-Meteo menolak, permintaan berikutnya langsung ke NASA POWER tanpa menghubungi Open-Meteo", async () => {
  const asli = globalThis.fetch;
  const dipanggil: string[] = [];
  const isi: Record<string, Record<string, number>> = { PRECTOTCORR: {}, T2M_MAX: {} };
  OBS.time.forEach((x, i) => {
    const k = x.replaceAll("-", "");
    isi.PRECTOTCORR[k] = OBS.hujan[i] as number;
    isi.T2M_MAX[k] = OBS.tmax[i] as number;
  });
  try {
    globalThis.fetch = (async (u: string | URL) => {
      const host = new URL(String(u)).hostname;
      dipanggil.push(host);
      if (host.endsWith("open-meteo.com")) return new Response('{"error":true,"reason":"Daily API request limit exceeded"}', { status: 429 });
      if (host === "power.larc.nasa.gov") return Response.json({ properties: { parameter: isi } });
      return new Response("", { status: 404 });
    }) as typeof fetch;
    const { ambilKlimatologi, ambilProyeksi } = await import("@/lib/data/ambil");
    const k1 = await ambilKlimatologi(-3.1, 129.4); // Seram: jauh dari kota bawaan mana pun
    assert.match(k1.sumber.nama, /NASA POWER/);
    const omSetelahPertama = dipanggil.filter((h) => h.endsWith("open-meteo.com")).length;
    assert.equal(omSetelahPertama, 1);
    const k2 = await ambilKlimatologi(-4.1, 131.1); // lokasi lain: Open-Meteo tidak dihubungi lagi
    assert.match(k2.sumber.nama, /NASA POWER/);
    assert.equal(dipanggil.filter((h) => h.endsWith("open-meteo.com")).length, omSetelahPertama);
    const p = await ambilProyeksi(-3.1, 129.4);
    assert.equal(p.metode?.id, "pengamatan-delta");
    assert.equal(dipanggil.filter((h) => h === "power.larc.nasa.gov").length, 2, "satu unduhan NASA POWER per sel dipakai bersama");
  } finally {
    globalThis.fetch = asli;
  }
});

(async () => {
  for (const [n, f] of tests) {
    try { await f(); ok++; console.log("  ok  ", n); } catch (e) { console.error("  GAGAL", n, "\n", e); process.exitCode = 1; }
  }
  console.log(`${ok}/${tests.length} lulus`);
})();
