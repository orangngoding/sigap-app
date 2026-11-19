// Uji terhadap umpan RSS NYATA Google Berita (diambil 2026-11-18).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pisahJudul, relevan, uraiBerita } from "@/lib/data/berita";

let lulus = 0; const gagal: string[] = [];
const uji = (nama: string, fn: () => void) => { try { fn(); lulus++; console.log("OK   ", nama); } catch (e) { gagal.push(nama); console.log("GAGAL", nama, "->", (e as Error).message.split("\n")[0]); } };
const xml = readFileSync("tests/fixtures/berita-rss.xml", "utf8");
const SEKARANG = new Date("2026-11-18T17:00:00Z");

uji("umpan nyata terurai: ada butir, maksimum 12, urut terbaru", () => {
  const d = uraiBerita(xml, SEKARANG);
  assert.ok(d.length > 0 && d.length <= 12);
  assert.deepEqual(d.map((x) => x.waktu), d.map((x) => x.waktu).sort().reverse());
});
uji("semua tautan https dari news.google.com, judul tanpa akhiran media, tanpa duplikat, maks 3 per media", () => {
  const d = uraiBerita(xml, SEKARANG);
  const per = new Map<string, number>();
  for (const x of d) {
    assert.ok(x.url.startsWith("https://news.google.com/"));
    assert.ok(!x.judul.endsWith(` - ${x.sumber}`));
    per.set(x.sumber, (per.get(x.sumber) ?? 0) + 1);
  }
  assert.ok([...per.values()].every((n) => n <= 3));
  assert.equal(new Set(d.map((x) => x.judul.toLowerCase())).size, d.length);
});
uji("tautan bukan dari host umpan dan tanggal masa depan dibuang", () => {
  const item = (l: string, t: string) => `<item><title>Banjir besar melanda kota - Media</title><link>${l}</link><pubDate>${t}</pubDate><source url="https://x.id">Media</source></item>`;
  assert.equal(uraiBerita(`<rss>${item("https://evil.example/a", "Wed, 18 Nov 2026 11:00:00 GMT")}</rss>`, SEKARANG).length, 0);
  assert.equal(uraiBerita(`<rss>${item("javascript:alert(1)", "Wed, 18 Nov 2026 11:00:00 GMT")}</rss>`, SEKARANG).length, 0);
  assert.equal(uraiBerita(`<rss>${item("https://news.google.com/a", "Wed, 18 Nov 2027 11:00:00 GMT")}</rss>`, SEKARANG).length, 0);
  assert.equal(uraiBerita(`<rss>${item("https://news.google.com/a", "Wed, 18 Nov 2026 11:00:00 GMT")}</rss>`, SEKARANG).length, 1);
});
uji("pisahJudul: dengan dan tanpa elemen source", () => {
  assert.deepEqual(pisahJudul("Banjir di Pidie - BNPB", "BNPB"), { judul: "Banjir di Pidie", sumber: "BNPB" });
  assert.deepEqual(pisahJudul("Banjir di Pidie - Detik", null), { judul: "Banjir di Pidie", sumber: "Detik" });
});
uji("relevan: menyaring berita yang hanya kebetulan menyebut kata bencana", () => {
  for (const j of ["Residu Maggot Jadi Pupuk Anti Kekeringan", "Mahasiswa UMM Kembangkan Riset di Jepang", "Letjen Suharyanto Sudah Diperiksa Terkait Kasus Korupsi BNPB", "Harga Saham Perusahaan Naik"]) assert.equal(relevan(j), false, j);
  for (const j of ["Banjir Bandang Terjang Sitaro, 300 Warga Mengungsi", "Gempa Bumi M5,3 – 6 km TimurLaut WAROPEN-PAPUA", "BMKG Minta Masyarakat Siaga Bencana Hidrometeorologi"]) assert.equal(relevan(j), true, j);
});
console.log(`\n${lulus} lulus, ${gagal.length} gagal`);
process.exit(gagal.length ? 1 : 0);
