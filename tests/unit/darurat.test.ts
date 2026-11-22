// Jalankan: npx tsx tests/unit/darurat.test.ts  (Mode Darurat: situasi kritis, kabar SMS, nomor penting, risiko offline)
import assert from "node:assert/strict";
import { KETUKAN_RJP_PER_MENIT, SITUASI, kanonNomor, nomorUnik, pakaiIos, rapikanNomor, tautanSms, teksKabar } from "@/lib/darurat/situasi";
import { bacaRisikoTersimpan } from "@/hooks/use-risiko-lokasi";
import { lolosPenyaring } from "@/lib/ai/guardrails";
import kontak from "@/generated/kontak.json";
import kontakSumber from "../../content/kontak.json";
import { KURASI, detailDari, gabungSumber, langkahDaruratBahaya, ringkasHalaman, teksLengkap } from "@/lib/darurat/langkah";
import { SEMUA_CHUNK } from "@/lib/kb/data";
import { HAZARDS } from "@/lib/hazards/hazards";
import { isHazardAktif } from "@/lib/hazards/pack-status";

let ok = 0;
const tests: Array<[string, () => void]> = [];
const t = (n: string, f: () => void) => tests.push([n, f]);
const semuaNomor = new Set([...kontak.kontak, ...kontak.lainnya].map((k) => k.nomor));

t("situasi kritis: 7 situasi unik, langkah pendek dan jelas, tanpa obat atau dosis, bersumber resmi", () => {
  assert.equal(SITUASI.length, 7);
  assert.equal(new Set(SITUASI.map((s) => s.id)).size, 7);
  for (const s of SITUASI) {
    assert.ok(s.langkah.length >= 4 && s.langkah.length <= 7, `${s.id}: ${s.langkah.length} langkah`);
    for (const l of s.langkah) {
      assert.ok(l.split(/\s+/).length <= 22, `${s.id}: langkah terlalu panjang: ${l}`);
      assert.doesNotMatch(l, /\b(mg|tablet|dosis|paracetamol|antibiotik)\b/i, `${s.id}: ${l}`);
      assert.ok(lolosPenyaring(l), `${s.id}: ${l}`);
    }
    assert.ok(s.sumber.length >= 1 && s.sumber.every((x) => x.url.startsWith("https://")), s.id);
    assert.ok(semuaNomor.has(s.nomor.nomor), `${s.id}: nomor ${s.nomor.nomor} tidak ada di daftar resmi`);
  }
});

t("isi kunci sesuai panduan: RJP 100-120 per menit, terjebak memakai peluit, kebakaran ke 113, terpisah ke BNPB 117", () => {
  assert.ok(KETUKAN_RJP_PER_MENIT >= 100 && KETUKAN_RJP_PER_MENIT <= 120);
  const by = Object.fromEntries(SITUASI.map((s) => [s.id, s]));
  assert.equal(by["tidak-bernapas"].alat, "ketukan-rjp");
  assert.match(by["tidak-bernapas"].langkah.join(" "), /100 sampai 120/);
  assert.equal(by.terjebak.alat, "peluit");
  assert.match(by.terjebak.langkah.join(" "), /Ketuk pipa atau dinding/);
  assert.equal(by.kebakaran.nomor.nomor, "113");
  assert.equal(by.terpisah.nomor.nomor, "117");
  assert.match(by["bau-gas"].langkah.join(" "), /saklar/);
  assert.match(by["arus-banjir"].langkah.join(" "), /15 cm/);
});

t("nomor penting: 112 tetap utama; nomor tambahan terverifikasi dengan sumber; berkas sumber dan hasil sama", () => {
  assert.equal(kontak.kontak[0].nomor, "112");
  assert.deepEqual(kontak.lainnya.map((k) => k.nomor), ["117", "123", "1500533"]);
  assert.match(kontak.sumberLainnya.url, /^https:\/\/indonesiabaik\.id\//);
  assert.deepEqual(kontak, kontakSumber);
});

t("kabar SMS: selamat/butuh bantuan, lokasi bila ada, titik kumpul hanya saat selamat, ringkas (sekitar 2 SMS)", () => {
  const posisi = { lat: -7.680123, lon: 110.420456, akurasi: 18.4 };
  const s = teksKabar("selamat", { posisi, titikKumpul: "Lapangan balai desa", jam: "14.05", jumlahOrang: 4 });
  assert.match(s, /^SIGAP: Saya SELAMAT\. Bersama 4 orang\./);
  assert.match(s, /maps\.google\.com\/\?q=-7\.68012,110\.42046 \(akurasi 18 m\)/);
  assert.match(s, /Menuju titik kumpul: Lapangan balai desa/);
  assert.ok(s.length <= 300, String(s.length));
  const b = teksKabar("butuh-bantuan", { posisi: null, titikKumpul: "Lapangan", jam: "14.05" });
  assert.match(b, /BUTUH BANTUAN/);
  assert.match(b, /112/);
  assert.doesNotMatch(b, /maps|titik kumpul/i);
});

t("tautan SMS Android: nomor dibakukan, beberapa penerima dipisah koma, isi dikodekan", () => {
  const u = tautanSms(["0812-3456-7890", "+62 813 1111 2222", "12"], "Saya SELAMAT & aman");
  assert.equal(u, "sms:081234567890,081311112222?body=Saya%20SELAMAT%20%26%20aman");
  assert.equal(tautanSms([], "x"), "sms:?body=x");
});

t("tautan SMS iOS: satu penerima memakai &body=, banyak penerima memakai /open?addresses=", () => {
  assert.equal(tautanSms(["0812 3456 7890"], "a b", true), "sms:081234567890&body=a%20b");
  assert.equal(tautanSms(["0812 3456 7890", "0813 1111 2222"], "x", true), "sms:/open?addresses=081234567890,081311112222&body=x");
  assert.equal(tautanSms([], "x", true), "sms:&body=x");
  assert.ok(pakaiIos("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)"));
  assert.ok(pakaiIos("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 5)); // iPadOS
  assert.ok(!pakaiIos("Mozilla/5.0 (Linux; Android 14; SM-A156E)", 5));
});

t("nomor sama dalam bentuk berbeda (08.. / +628.. / 628..) dianggap satu penerima", () => {
  assert.equal(kanonNomor("+62 812-3456-7890"), "081234567890");
  assert.equal(kanonNomor("6281234567890"), "081234567890");
  assert.equal(kanonNomor("+1 555 0100"), "+15550100"); // luar negeri tetap
  assert.deepEqual(nomorUnik(["0812 3456 7890", "+6281234567890", "62 812 3456 7890", "0813 1111 2222"]), ["081234567890", "081311112222"]);
});

t("nomor lain yang diketik: spasi/tanda hubung dibuang, 6-15 digit, huruf ditolak", () => {
  assert.equal(rapikanNomor(" 0812-3456 7890 "), "081234567890");
  assert.equal(rapikanNomor("+62 (813) 1111-2222"), "081311112222");
  assert.equal(rapikanNomor("12345"), null);
  assert.equal(rapikanNomor("0812abc"), null);
  assert.equal(rapikanNomor("1234567890123456"), null);
  assert.equal(rapikanNomor("08+12"), null);
});

t("risiko tersimpan untuk offline: hanya dipakai untuk lokasi yang sama; data rusak = null", () => {
  const isi = JSON.stringify({ lat: -7.68, lon: 110.42, diambilPada: "2026-11-19T00:00:00Z", nilai: [{ id: "gunung_api", tingkat: "tinggi", alasan: "Merapi 16 km" }] });
  assert.equal(bacaRisikoTersimpan(isi, { lat: -7.681, lon: 110.421 })?.nilai[0].id, "gunung_api");
  assert.equal(bacaRisikoTersimpan(isi, { lat: -6.2, lon: 106.8 }), null);
  assert.equal(bacaRisikoTersimpan("{rusak", { lat: -7.68, lon: 110.42 }), null);
  assert.equal(bacaRisikoTersimpan(null, { lat: -7.68, lon: 110.42 }), null);
});

t("langkah per bencana: dikelompokkan menurut keadaan, ada penjelasan 'bagaimana', dan setiap langkah bersumber", () => {
  const g = langkahDaruratBahaya(SEMUA_CHUNK, "gempa");
  assert.deepEqual(g.kelompok.map((k) => k.keadaan), ["Di dalam bangunan", "Di luar bangunan", "Di dalam mobil", "Di dekat pantai"]);
  assert.match(g.saat[0].teks, /^Merunduk, berlindung, bertahan/);
  const mobil = g.saat.find((l) => l.keadaan === "Di dalam mobil")!;
  assert.match(mobil.teks, /mobil/i); // konteks tidak hilang lagi ("Berhenti di tempat terbuka")
  assert.match(teksLengkap(mobil), /^Di dalam mobil: .*jembatan/); // dibacakan/dipandu lengkap dengan penjelasan
  const kompor = g.saat.find((l) => l.id === "gempa-saat-002")!;
  assert.match(kompor.teks, /sedang memasak/);
  assert.match(kompor.sumber.judul, /2019\), hlm\. 16/);
  const c = langkahDaruratBahaya(SEMUA_CHUNK, "cuaca_ekstrem");
  assert.deepEqual(c.kelompok.map((k) => k.keadaan), ["Angin kencang atau puting beliung", "Petir"]);
  assert.match(c.saat.find((l) => l.id === "cuaca_ekstrem-saat-001")!.teks, /membungkuk, duduk, peluk lutut/);
  for (const h of HAZARDS.filter((x) => isHazardAktif(x.id))) {
    const pk = langkahDaruratBahaya(SEMUA_CHUNK, h.id);
    assert.ok(pk.saat.length >= 1 && pk.saat.length <= 7, h.id);
    assert.ok(pk.sumber.length >= 1 && pk.sumber.every((x) => x.url.startsWith("https://")), h.id);
    assert.ok([...pk.saat, ...pk.sesudah].every((l) => l.sumber.judul.length > 3), h.id);
  }
  // Semua id kurasi ada di KB (kurasi rusak = jatuh ke urutan otomatis, tetapi itu harus ketahuan di tes).
  for (const [hz, kel] of Object.entries(KURASI)) for (const k of kel!) for (const id of k.ids) assert.ok(SEMUA_CHUNK.some((x) => x.id === id && x.hazard === hz), id);
});

t("kutipan Buku Saku BNPB edisi 2019 selalu menyebut halaman agar bisa dilacak", () => {
  const kutip = SEMUA_CHUNK.filter((c) => c.sourceTitle.includes("cetakan keempat, 2019"));
  assert.ok(kutip.length >= 100);
  for (const c of kutip) assert.match(c.sourceTitle, /, hlm\. \d+/, c.id);
});

t("sumber digabung per dokumen dengan daftar halaman", () => {
  const u = "https://contoh.go.id/a.pdf";
  assert.deepEqual(gabungSumber([{ judul: "Buku A (2019), hlm. 37", url: u }, { judul: "Buku A (2019), hlm. 16", url: u }, { judul: "Buku A (2019), hlm. 37", url: u }, { judul: "BMKG", url: "https://bmkg.go.id" }]),
    [{ judul: "Buku A (2019), hlm. 16, 37", url: u }, { judul: "BMKG", url: "https://bmkg.go.id" }]);
  assert.equal(ringkasHalaman(["36", "36-37", "37", "38"]), "36-38");
  assert.equal(ringkasHalaman(["44", "44-45"]), "44-45");
  assert.equal(ringkasHalaman(["20", "16", "17"]), "16-17, 20");
  const g = langkahDaruratBahaya(SEMUA_CHUNK, "gempa");
  assert.equal(g.sumber.filter((x) => x.judul.includes("cetakan keempat")).length, 1);
});

t("langkah pengisi tidak masuk Mode Darurat; penjelasan hanya bila menambah informasi", () => {
  assert.ok(!langkahDaruratBahaya(SEMUA_CHUNK, "longsor").saat.some((l) => /tetap tenang/i.test(l.teks)));
  assert.equal(detailDari({ title: "Masuk ke bangunan kokoh", body: "Berlindunglah di dalam bangunan yang kokoh." }), undefined); // hanya mengulang judul
  assert.ok(detailDari({ title: "Petir dekat", body: "Segera membungkuk, duduk, dan peluk lutut ke dada. Jangan tiarap." }));
});

for (const [n, f] of tests) {
  try { f(); ok++; console.log("  ok  ", n); } catch (e) { console.error("  GAGAL", n, "\n", e); process.exitCode = 1; }
}
console.log(`${ok}/${tests.length} lulus`);
