// Uji terhadap umpan RSS NYATA Google Berita (diambil 2026-11-18).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { gabungBerita, gambarItem, jenisBerita, rapikanJudul, judulGdacs, pisahJudul, relevan, uraiAntara, uraiBerita, uraiGdacs, uraiMedia, UMPAN_MEDIA } from "@/lib/data/berita";

let lulus = 0; const gagal: string[] = [];
const uji = (nama: string, fn: () => void) => { try { fn(); lulus++; console.log("OK   ", nama); } catch (e) { gagal.push(nama); console.log("GAGAL", nama, "->", (e as Error).message.split("\n")[0]); } };
const xml = readFileSync("tests/fixtures/berita-rss.xml", "utf8");
const SEKARANG = new Date("2026-11-18T17:00:00Z");

uji("umpan nyata terurai lalu digabung: ada butir, maksimum 60, urut terbaru, berjenis", () => {
  const d = gabungBerita([uraiBerita(xml, SEKARANG)]);
  assert.ok(d.length > 0 && d.length <= 60);
  assert.ok(d.every((x) => x.jenis));
  assert.deepEqual(d.map((x) => x.waktu), d.map((x) => x.waktu).sort().reverse());
});
uji("semua tautan https dari news.google.com, judul tanpa akhiran media, tanpa duplikat, maks 6 per media", () => {
  const d = gabungBerita([uraiBerita(xml, SEKARANG), uraiBerita(xml, SEKARANG)]); // dua pencarian berisi sama: tetap tanpa kembar
  const per = new Map<string, number>();
  for (const x of d) {
    assert.ok(x.url.startsWith("https://news.google.com/"));
    assert.ok(!x.judul.endsWith(` - ${x.sumber}`));
    per.set(x.sumber, (per.get(x.sumber) ?? 0) + 1);
  }
  assert.ok([...per.values()].every((n) => n <= 6));
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
uji("relevan: pengungsian akibat perang bukan berita bencana alam", () => {
  assert.equal(relevan("Operasi Israel picu pengungsian Palestina dari Deir al-Balah di Gaza"), false);
  assert.equal(relevan("Banjir rendam 3 desa, ratusan warga mengungsi"), true);
});
uji("jenis bencana dari judul: yang spesifik menang", () => {
  assert.equal(jenisBerita("Gempa M6,1 guncang Maluku, BMKG: tidak berpotensi tsunami"), "tsunami");
  assert.equal(jenisBerita("Erupsi Gunung Lewotobi, warga diminta waspada lahar"), "gunung_api");
  assert.equal(jenisBerita("BPBD Riau pantau titik panas, karhutla meluas"), "karhutla");
  assert.equal(jenisBerita("Puting beliung rusak 20 rumah di Sidoarjo"), "cuaca_ekstrem");
  assert.equal(jenisBerita("BNPB gelar rapat koordinasi siaga darurat"), "umum");
});
uji("ANTARA: hanya berita relevan, tautan antaranews.com, foto https dari img.antaranews.com", () => {
  const it = (judul: string, link: string, img: string) => `<item><title><![CDATA[${judul}]]></title><link>${link}</link><pubDate>Thu, 19 Nov 2026 13:29:17 +0700</pubDate><enclosure length="0" type="image/jpeg" url="${img}"/></item>`;
  const xmlA = `<rss><channel>${it("BPBD Agam pantau hulu sungai antisipasi banjir", "https://www.antaranews.com/berita/1", "https://img.antaranews.com/cache/800x533/a.jpg")}${it("Gubernur resmikan hutan kota", "https://www.antaranews.com/berita/2", "https://img.antaranews.com/b.jpg")}${it("Banjir rob di Semarang", "https://evil.example/3", "https://img.antaranews.com/c.jpg")}${it("Longsor tutup jalan provinsi", "https://www.antaranews.com/berita/4", "http://img.example/d.jpg")}</channel></rss>`;
  const d = uraiAntara(xmlA, new Date("2026-11-19T09:00:00Z"));
  assert.deepEqual(d.map((x) => x.url), ["https://www.antaranews.com/berita/1", "https://www.antaranews.com/berita/4"]);
  assert.equal(d[0].gambar, "https://img.antaranews.com/cache/800x533/a.jpg");
  assert.equal(d[1].gambar, undefined); // foto bukan dari domain ANTARA tidak dipakai
  assert.equal(d[0].sumber, "ANTARA");
});
uji("GDACS: hanya Indonesia, 30 hari terakhir, tautan https gdacs.org, judul diterjemahkan kode", () => {
  const it = (judul: string, tipe: string, level: string, tgl: string) => `<item><title>${judul}</title><link>http://www.gdacs.org/report.aspx?eventtype=${tipe}&amp;eventid=1</link><pubDate>${tgl}</pubDate><gdacs:alertlevel>${level}</gdacs:alertlevel><gdacs:eventtype>${tipe}</gdacs:eventtype><guid>${judul}</guid></item>`;
  const xmlG = `<rss><channel>${it("Green earthquake (Magnitude 5.8M, Depth:10km) in Indonesia 18/11/2026 04:41 UTC", "EQ", "Green", "Wed, 18 Nov 2026 04:57:51 GMT")}${it("Orange flood alert in Indonesia", "FL", "Orange", "Mon, 16 Nov 2026 01:00:00 GMT")}${it("Green earthquake in Japan", "EQ", "Green", "Wed, 18 Nov 2026 04:00:00 GMT")}${it("Green flood alert in Indonesia", "FL", "Green", "Thu, 01 Oct 2026 09:00:00 GMT")}</channel></rss>`;
  const d = uraiGdacs(xmlG, SEKARANG);
  assert.equal(d.length, 2);
  assert.equal(d[0].judul, "Gempa M5,8 (kedalaman 10 km) di Indonesia");
  assert.equal(d[0].level, "hijau");
  assert.equal(d[1].judul, "Banjir di Indonesia");
  assert.equal(d[1].level, "oranye");
  assert.ok(d.every((x) => x.url.startsWith("https://www.gdacs.org/")));
  assert.equal(judulGdacs("Drought is on going in Brunei, Indonesia", "kekeringan"), "Kekeringan berlangsung di Indonesia dan negara sekitar");
});
uji("judul tanpa ekor domain; situs partai politik tidak dipakai", () => {
  assert.equal(rapikanJudul("Pemprov Jabar Tetapkan Status Siaga Darurat Bencana - kumparan.com"), "Pemprov Jabar Tetapkan Status Siaga Darurat Bencana");
  assert.equal(rapikanJudul("Gempa M5,4 guncang Nias - Sumatera Utara"), "Gempa M5,4 guncang Nias - Sumatera Utara");
  const it = `<item><title>Banjir rendam 3 desa - PKS - Partai Keadilan Sejahtera</title><link>https://news.google.com/a</link><pubDate>Wed, 18 Nov 2026 11:00:00 GMT</pubDate><source url="https://pks.id">PKS - Partai Keadilan Sejahtera</source></item>`;
  assert.equal(uraiBerita(`<rss>${it}</rss>`, SEKARANG).length, 0);
});
uji("umpan media berfoto: VIVA (img di deskripsi CDATA), Tempo (<img>URL</img>), foto dari domain lain ditolak", () => {
  const media = (nama: string) => UMPAN_MEDIA.find((u) => u.nama === nama)!;
  const [tempo, okezone] = [media("Tempo"), media("Okezone")];
  const itViva = `<item><title><![CDATA[Banjir rendam 200 rumah di Bekasi]]></title><link>https://www.viva.co.id/berita/nasional/1</link><pubDate>Wed, 18 Nov 2026 11:00:00 +0700</pubDate><description><![CDATA[ <img src="https://thumb.viva.co.id/media/a.jpg?w=360&amp;q=90"/> Isi]]></description></item>`;
  const a = uraiMedia(`<rss>${itViva}</rss>`, media("VIVA"), SEKARANG);
  assert.equal(a.length, 1);
  assert.equal(a[0].sumber, "VIVA");
  assert.equal(a[0].gambar, "https://thumb.viva.co.id/media/a.jpg?w=360&q=90");
  const itTempo = `<item><title>Longsor tutup jalan Garut</title><img>https://statik.tempo.co/data/x_720.jpg</img><link>https://nasional.tempo.co/read/1/longsor</link><pubDate>Wed, 18 Nov 2026 11:00:00 +0700</pubDate></item>`;
  assert.equal(uraiMedia(`<rss>${itTempo}</rss>`, tempo, SEKARANG)[0].gambar, "https://statik.tempo.co/data/x_720.jpg");
  const itAsing = `<item><title>Gempa M5 guncang Sukabumi</title><link>https://news.okezone.com/read/1</link><pubDate>Wed, 18 Nov 2026 11:00:00 +0700</pubDate><media:content url="https://contoh-asing.example/a.jpg"/></item>`;
  const c = uraiMedia(`<rss>${itAsing}</rss>`, okezone, SEKARANG);
  assert.equal(c.length, 1);
  assert.equal(c[0].gambar, undefined);
  assert.equal(gambarItem(`<description>&lt;img src=&quot;https://img.okezone.com/a.jpg&quot;&gt;</description>`), "https://img.okezone.com/a.jpg");
});
uji("judul kembar: versi berfoto yang dipakai, data masukan tidak diubah", () => {
  const tanpa = { id: "g", judul: "Banjir rendam 200 rumah di Bekasi", sumber: "Kompas", waktu: "2026-11-18T05:00:00.000Z", url: "https://news.google.com/a" };
  const dengan = { ...tanpa, id: "v", sumber: "VIVA", waktu: "2026-11-18T04:00:00.000Z", url: "https://www.viva.co.id/a", gambar: "https://thumb.viva.co.id/a.jpg" };
  const d = gabungBerita([[tanpa], [dengan]]);
  assert.equal(d.length, 1);
  assert.equal(d[0].id, "v");
  assert.equal(d[0].gambar, "https://thumb.viva.co.id/a.jpg");
  assert.equal("gambar" in tanpa, false);
});

uji("berita berfoto didahulukan saat memilih 60, hasil tetap urut terbaru", () => {
  const jam = (h: number) => new Date(Date.UTC(2026, 10, 18, h)).toISOString();
  const google = Array.from({ length: 70 }, (_, i) => ({ id: `g${i}`, judul: `Banjir rendam kampung${i} sungai${i} warga${i}x`, sumber: `Media ${i}`, waktu: jam(12), url: "https://news.google.com/a" }));
  const foto = Array.from({ length: 5 }, (_, i) => ({ id: `f${i}`, judul: `Longsor tutup jalan${i} bukit${i} desa${i}y`, sumber: "detikcom", waktu: jam(1 + i), url: "https://news.detik.com/a", gambar: "https://akcdn.detik.net.id/a.jpg" }));
  const d = gabungBerita([foto, google]);
  assert.equal(d.length, 60);
  assert.equal(d.filter((b) => b.gambar).length, 5); // berita berfoto yang lebih lama tetap masuk
  assert.ok(d.every((b, i) => i === 0 || Date.parse(d[i - 1].waktu) >= Date.parse(b.waktu)));
});

uji("kata kunci tidak salah tangkap: robot, iklim usaha, kiasan, luar negeri, galian ambles", () => {
  assert.ok(!relevan("Vingroup Ciptakan Robot Humanoid, Ambisi Vietnam Kuasai Teknologi Masa Depan"));
  assert.ok(!relevan("Kepastian Hukum Jadi Kunci Iklim Usaha, Akses Layanan Legal Perlu Dipermudah"));
  assert.ok(!relevan("Film terbaru banjir pujian penonton"));
  assert.ok(!relevan("Badai Terjang Brasil, Sejumlah Bangunan Rusak Diterjang Angin Kencang"));
  assert.ok(!relevan("Bekas Galian PDAM Dibiarkan Ambles, Warga Keluhkan Saat Hujan"));
  assert.ok(relevan("Banjir rob genangi pesisir Jakarta Utara"));
  assert.equal(jenisBerita("Banjir rob genangi pesisir Jakarta Utara"), "gelombang_abrasi");
  assert.equal(jenisBerita("Robinsar ajak warga cegah banjir"), "banjir");
});

uji("kejadian sama dengan kalimat berbeda digabung jadi satu", () => {
  const x = (id: string, judul: string, sumber: string) => ({ id, judul, sumber, waktu: "2026-11-22T01:00:00.000Z", url: "https://news.google.com/" + id, jenis: jenisBerita(judul) });
  const d = gabungBerita([[
    x("a", "Gunung Semeru dan Ibu Meletus, Lontarkan Abu Vulkanik Ratusan Meter", "A"),
    x("b", "Semeru dan Gunung Ibu Erupsi Beruntun, Kolom Abu Vulkanik Ratusan Meter", "B"),
    x("c", "Gunung Ibu dan Semeru Meletus Beruntun, Abu 400 Meter", "C"),
    x("d", "Gempa M4,8 Guncang Sentani, Papua", "D"),
  ]]);
  assert.equal(d.length, 2);
});

uji("berita cuaca dan iklim: kategori sendiri; bahaya spesifik tetap didahulukan", () => {
  assert.equal(jenisBerita("Prakiraan Cuaca Semarang Minggu, BMKG Sebut Berpotensi Hujan"), "iklim");
  assert.equal(jenisBerita("El Nino Tekan Curah Hujan tetapi BMKG Ingatkan Hujan Ekstrem"), "iklim");
  assert.equal(jenisBerita("BMKG peringatkan hujan lebat di sejumlah wilayah"), "cuaca_ekstrem");
  assert.equal(jenisBerita("Musim kemarau, warga mulai kesulitan air bersih"), "kekeringan");
  assert.ok(relevan("Prakiraan cuaca Jakarta hari ini"));
  assert.ok(!relevan("Harga cabai naik saat musim hujan"));
});
console.log(`\n${lulus} lulus, ${gagal.length} gagal`);
process.exit(gagal.length ? 1 : 0);
