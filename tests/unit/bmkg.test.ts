// Uji terhadap respons NYATA BMKG (diambil tim 2026-11-17 dari peramban), bukan contoh tiruan.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normalizeCuaca } from "@/lib/data/cuaca";
import { buildGempa } from "@/lib/data/gempa";
import { cakupanUntuk, cocokProvinsi, gabungkan, uraiCap, uraiRss } from "@/lib/data/peringatan";
import { lolosPenyaring, lolosPenyaringKutipan } from "@/lib/ai/guardrails";

const baca = (n: string) => JSON.parse(readFileSync(`tests/fixtures/${n}`, "utf8")) as unknown;
let lulus = 0; const gagal: string[] = [];
const uji = (nama: string, fn: () => void) => { try { fn(); lulus++; console.log("OK   ", nama); } catch (e) { gagal.push(nama); console.log("GAGAL", nama, "->", (e as Error).message.split("\n")[0]); } };

// ---------- Cuaca nyata: adm4 31.71.01.1001 ----------
const cuaca = baca("bmkg-cuaca-31.71.01.1001.json");
const SEKARANG = new Date("2026-11-17T06:50:00Z"); // 13.50 WIB, saat data diambil

uji("cuaca nyata: 20 interval, urut, waktu lokal +07:00", () => {
  const c = normalizeCuaca(cuaca, SEKARANG);
  assert.equal(c.prakiraan.length, 20);
  assert.equal(c.prakiraan[0].waktu, "2026-11-17T14:00:00+07:00");
  assert.equal(c.prakiraan[19].waktu, "2026-11-19T23:00:00+07:00");
  assert.deepEqual([...c.prakiraan].map((p) => p.waktu), [...c.prakiraan].map((p) => p.waktu).sort());
});
uji("cuaca nyata: lokasi dan zona dari objek lokasi tingkat atas", () => {
  const c = normalizeCuaca(cuaca, SEKARANG);
  assert.equal(c.lokasi.desa, "Gambir");
  assert.equal(c.lokasi.kotkab, "Kota Adm. Jakarta Pusat");
  assert.equal(c.lokasi.timezone, "Asia/Jakarta");
});
uji("cuaca nyata: suhu, kelembapan, angin, kondisi terbaca", () => {
  const p = normalizeCuaca(cuaca, SEKARANG).prakiraan[0];
  assert.equal(p.kondisi, "Hujan Ringan");
  assert.equal(p.suhu, 32);
  assert.equal(p.kelembapan, 65);
  assert.equal(p.anginKmj, 8);
  assert.equal(p.arahAngin, "NW");
  assert.equal(p.jarakPandang, null); // vs_text bernilai null pada data nyata
});
uji("cuaca nyata: URL ikon BMKG memuat spasi, harus di-encode agar valid", () => {
  const ikon = normalizeCuaca(cuaca, SEKARANG).prakiraan[0].ikon;
  assert.ok(ikon && ikon.startsWith("https://") && !ikon.includes(" "), String(ikon));
  assert.ok(ikon!.endsWith("hujan%20ringan-am.svg"));
});
uji("cuaca nyata: ringkasan suhu 24-32", () => {
  const r = normalizeCuaca(cuaca, SEKARANG).ringkasan;
  assert.equal(r.suhuMin, 24);
  assert.equal(r.suhuMaks, 32);
});
uji("cuaca nyata: petir pada 19 Nov 17.00 WIB di luar 48 jam dari 17 Nov 13.50 WIB", () => {
  assert.equal(normalizeCuaca(cuaca, SEKARANG).ringkasan.hujanLebat48j, false);
});
uji("cuaca nyata: sehari kemudian, 'Hujan Petir' masuk jendela 48 jam", () => {
  const r = normalizeCuaca(cuaca, new Date("2026-11-18T06:00:00Z")).ringkasan;
  assert.equal(r.hujanLebat48j, true);
  assert.equal(r.hujanLebatWaktu, "2026-11-19T17:00:00+07:00");
});

// ---------- Gempa nyata: autogempa ----------
const auto = baca("bmkg-gempa-autogempa.json");
uji("gempa nyata: terbaca lengkap, Shakemap diberi awalan static.bmkg.go.id", () => {
  const g = buildGempa(auto, null, null, undefined, new Date("2026-11-17T01:00:00Z"));
  const t = g.terbaru!;
  assert.equal(t.magnitudo, 4.8);
  assert.equal(t.kedalamanKm, 2);
  assert.equal(t.lat, -8.22);
  assert.equal(t.lon, 120.66);
  assert.equal(t.waktu, "2026-11-17T00:49:17+00:00");
  assert.equal(t.shakemapUrl, "https://static.bmkg.go.id/20261117074917.mmi.jpg");
  assert.match(t.wilayah, /Ruteng/);
  assert.equal(t.dirasakan, "III Kab. Manggarai");
});
uji("gempa nyata: jarak dari Jakarta dibulatkan 10 km; M4.8 bukan 'gempa dekat'", () => {
  const g = buildGempa(auto, null, null, { lat: -6.1764, lon: 106.8267 }, new Date("2026-11-17T01:00:00Z"));
  const j = g.terbaru!.jarakKm!;
  assert.ok(j > 1500 && j < 1700 && j % 10 === 0, String(j));
  assert.equal(g.ringkasan.gempaDekat24j, false);
});

// ---------- Peringatan dini: dua butir nyata dari umpan RSS ----------
const RSS = `<?xml version="1.0"?><rss version="2.0"><channel><title>Peringatan Dini Cuaca BMKG</title>
<item><title>Hujan Lebat disertai Petir di Kalimantan Tengah</title><pubDate>Tue, 17 Nov 2026 13:41:00 +0700</pubDate><author>cuaca.ekstrem@bmkg.go.id (BMKG)</author><category>Met</category><guid>2.49.0.1.360.0.2026.11.17.06.62.003</guid><link>https://www.bmkg.go.id/alerts/nowcast/id/CKG20261117003_alert.xml</link><description>Hujan lebat disertai petir akan terjadi pada 17 November 2026, 13:50 WIB di sebagian wilayah Kalimantan Tengah, khususnya di KUMAI, TEWANG SANGALANG GARING. Kondisi ini berpotensi menimbulkan dampak berupa jarak pandang berkurang, angin kencang, dan banjir lokal.</description></item>
<item><title>Hujan Lebat disertai Petir di Gorontalo</title><pubDate>Tue, 17 Nov 2026 14:35:00 +0800</pubDate><author>cuaca.ekstrem@bmkg.go.id (BMKG)</author><category>Met</category><guid>2.49.0.1.360.0.2026.11.17.06.75.006</guid><link>https://www.bmkg.go.id/alerts/nowcast/id/CGT20261117006_alert.xml</link><description>Hujan lebat disertai petir akan terjadi pada 17 November 2026, 14:50 WITA di sebagian wilayah Gorontalo, khususnya di ASPARAGA, BONEPANTAI, BOTUMOITA, DANAU LIMBOTO, DULUPI, KABILA, KOTA TENGAH, LIMBOTO. Kondisi ini berpotensi menimbulkan dampak berupa jarak pandang berkurang, angin kencang, dan banjir lokal.</description></item>
<item><title>Hujan Lebat disertai Petir di Kepulauan Riau</title><pubDate>Tue, 17 Nov 2026 14:00:00 +0700</pubDate><guid>x.kepri</guid><link>https://www.bmkg.go.id/alerts/nowcast/id/KRI1_alert.xml</link><description>Wilayah Kepulauan Riau, termasuk sebagian daerah yang berbatasan dengan Riau.</description></item>
<item><title>Hujan Lebat disertai Petir di Papua Barat Daya</title><pubDate>Tue, 17 Nov 2026 14:00:00 +0900</pubDate><guid>x.pbd</guid><link>https://www.bmkg.go.id/alerts/nowcast/id/PBD1_alert.xml</link><description>Papua Barat Daya</description></item>
</channel></rss>`;
const item = uraiRss(RSS);

uji("peringatan nyata: empat butir terurai, tanggal RFC 822 terbaca", () => {
  assert.equal(item.length, 4);
  assert.equal(item[0].judul, "Hujan Lebat disertai Petir di Kalimantan Tengah");
  assert.ok(Number.isFinite(Date.parse(item[0].tanggal!)));
  assert.equal(item[0].link, "https://www.bmkg.go.id/alerts/nowcast/id/CKG20261117003_alert.xml");
});
uji("peringatan: cocok provinsi berdasarkan judul 'di <provinsi>'", () => {
  assert.ok(cocokProvinsi(item[0], "Kalimantan Tengah"));
  assert.ok(!cocokProvinsi(item[0], "Kalimantan Utara"));
  assert.ok(cocokProvinsi(item[1], "Gorontalo"));
});
uji("peringatan: 'Riau' tidak boleh cocok dengan butir 'Kepulauan Riau'", () => {
  assert.ok(!cocokProvinsi(item[2], "Riau"));
  assert.ok(cocokProvinsi(item[2], "Kepulauan Riau"));
});
uji("peringatan: 'Papua Barat' tidak boleh cocok dengan butir 'Papua Barat Daya'", () => {
  assert.ok(!cocokProvinsi(item[3], "Papua Barat"));
  assert.ok(!cocokProvinsi(item[3], "Papua"));
  assert.ok(cocokProvinsi(item[3], "Papua Barat Daya"));
});
uji("peringatan: kecamatan huruf besar di teks BMKG tetap dikenali ('lokasi')", () => {
  assert.equal(cakupanUntuk(item[1].deskripsi, { provinsi: "Gorontalo", kecamatan: "Asparaga" }), "lokasi");
  assert.equal(cakupanUntuk(item[1].deskripsi, { provinsi: "Gorontalo", kecamatan: "Telaga" }), "provinsi");
});


// ---------- CAP nyata: CKG20261117003 (polygon dipersingkat pada fixture) ----------
const capXml = readFileSync("tests/fixtures/bmkg-cap-CKG20261117003.xml", "utf8");
uji("CAP nyata: judul, kejadian, waktu berlaku, wilayah terbaca walau ada xmlns dan polygon", () => {
  const c = uraiCap(capXml)!;
  assert.equal(c.headline, "Hujan Lebat disertai Petir di Kalimantan Tengah");
  assert.equal(c.event, "Hujan Lebat dan Petir");
  assert.equal(c.effective, "2026-11-17T13:50:00+07:00");
  assert.equal(c.expires, "2026-11-17T16:00:00+07:00");
  assert.equal(c.sent, "2026-11-17T13:41:00+07:00");
  assert.equal(c.wilayah, "Kalimantan Tengah");
  assert.equal(c.web, "https://nowcasting.bmkg.go.id/infografis/CKG/2026/11/17/infografis.jpg");
});
uji("CAP nyata: deskripsi satu paragraf tanpa baris baru, kecamatan huruf besar utuh", () => {
  const d = uraiCap(capXml)!.deskripsi!;
  assert.ok(!d.includes("\n") && !/\s{2,}/.test(d));
  assert.ok(d.includes("KUMAI, TEWANG SANGALANG GARING"));
  assert.ok(d.endsWith("16:00 WIB."));
});
uji("CAP nyata: areaDesc hanya provinsi, tetapi kecamatan di deskripsi menjadikan cakupan 'lokasi'", () => {
  const g = gabungkan(item[0], uraiCap(capXml), { provinsi: "Kalimantan Tengah", kecamatan: "Kumai" });
  assert.equal(g.cakupan, "lokasi");
  assert.equal(g.berlakuSampai, "2026-11-17T09:00:00.000Z");
  assert.equal(g.waktuTerbit, "2026-11-17T06:50:00.000Z");
  const lain = gabungkan(item[0], uraiCap(capXml), { provinsi: "Kalimantan Tengah", kecamatan: "Kapuas Hulu" });
  assert.equal(lain.cakupan, "provinsi");
});

// ---------- Gempa nyata: gempaterkini dan gempadirasakan digabung ----------
const terkini = baca("bmkg-gempa-terkini.json");
const rasa = baca("bmkg-gempa-dirasakan.json");
const SAAT_INI = new Date("2026-11-17T06:50:00Z");
uji("gempa nyata: gempa terbaru tidak muncul lagi di daftar", () => {
  const g = buildGempa(auto, terkini, rasa, undefined, SAAT_INI);
  assert.equal(g.terbaru!.waktu, "2026-11-17T00:49:17+00:00");
  assert.ok(!g.daftar.some((x) => x.waktu === g.terbaru!.waktu), "terbaru duplikat di daftar");
});
uji("gempa nyata: daftar lima butir, terbaru dulu, tanpa duplikat", () => {
  const g = buildGempa(auto, terkini, rasa, undefined, SAAT_INI);
  assert.equal(g.daftar.length, 5);
  const w = g.daftar.map((x) => Date.parse(x.waktu));
  assert.deepEqual([...w].sort((a, b) => b - a), w);
  assert.equal(new Set(g.daftar.map((x) => x.waktu)).size, 5);
  assert.equal(g.daftar[0].magnitudo, 2.6); // Sukabumi, dirasakan
});
uji("gempa nyata: M7.1 muncul di dua berkas, digabung: potensi tsunami dan daftar wilayah dirasakan sama-sama ada", () => {
  const m = buildGempa(auto, terkini, rasa, undefined, SAAT_INI).daftar.find((x) => x.magnitudo === 7.1)!;
  assert.equal(m.potensi, "Tidak berpotensi tsunami");
  assert.match(m.dirasakan ?? "", /Saumlaki/);
  assert.equal(m.kedalamanKm, 115);
});
uji("gempa nyata: pengguna di Saumlaki (<300 km dari M7.1, <24 jam) memicu gempaDekat24j; Jakarta tidak", () => {
  assert.equal(buildGempa(auto, terkini, rasa, { lat: -7.98, lon: 131.3 }, SAAT_INI).ringkasan.gempaDekat24j, true);
  assert.equal(buildGempa(auto, terkini, rasa, { lat: -6.1764, lon: 106.8267 }, SAAT_INI).ringkasan.gempaDekat24j, false);
});
uji("gempa nyata: M7.1 yang sudah lewat 24 jam tidak lagi memicu gempaDekat24j", () => {
  assert.equal(buildGempa(auto, terkini, rasa, { lat: -7.98, lon: 131.3 }, new Date("2026-11-18T06:50:00Z")).ringkasan.gempaDekat24j, false);
});

// ---------- Penyaring: kutipan dari teks resmi BMKG ----------
const RESMI = item[0].deskripsi; // memuat "akan terjadi", kalimat resmi BMKG
uji("penyaring: 'akan terjadi' dari AI sendiri tetap ditolak", () => {
  assert.equal(lolosPenyaring("Banjir akan terjadi besok."), false);
  assert.equal(lolosPenyaringKutipan("Banjir akan terjadi besok.", RESMI), false);
});
uji("penyaring: mengulang kalimat resmi BMKG ('akan terjadi pada 17 November') diperbolehkan", () => {
  assert.equal(lolosPenyaring("Menurut BMKG, hujan lebat disertai petir akan terjadi pada 17 November 2026."), false);
  assert.equal(lolosPenyaringKutipan("Menurut BMKG, hujan lebat disertai petir akan terjadi pada 17 November 2026.", RESMI), true);
});
uji("penyaring: jaminan keselamatan tetap ditolak walau teks sumber ada frasa lain", () => {
  assert.equal(lolosPenyaringKutipan("Rumah Anda pasti aman.", RESMI), false);
});

console.log(`\n${lulus} lulus, ${gagal.length} gagal`);
process.exit(gagal.length ? 1 : 0);
