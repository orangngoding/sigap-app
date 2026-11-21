// Jalankan: npx tsx tests/unit/keluarga.test.ts  (Rencana untuk banyak keluarga, tanpa login)
import assert from "node:assert/strict";
import {
  KUNCI_KELUARGA, MAKS_KELUARGA, bacaDaftar, gantiAnda, bersihkanDaftar, hapusKeluarga, pindahKe, profilMilikSaya, rekap,
  ringkasKeluarga, tambahKeluarga, ubahNama, type Penyimpanan,
} from "@/lib/keluarga/keluarga";
import { bacaCadangan } from "@/lib/data-saya/cadangan";

let ok = 0;
const tests: Array<[string, () => void]> = [];
const t = (n: string, f: () => void) => tests.push([n, f]);

function penyimpanan(awal: Record<string, string> = {}): Penyimpanan & { m: Map<string, string> } {
  const m = new Map(Object.entries(awal));
  return { m, getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
}
const lokasi = (kelurahan: string) => JSON.stringify({ state: { lokasi: { adm4: "34.71.01.1001", kelurahan, kecamatan: "Tegalrejo", kabKota: "Kota Yogyakarta", provinsi: "DI Yogyakarta", lat: -7.77, lon: 110.36 } }, version: 1 });
const profil = (o: Record<string, unknown>) => JSON.stringify({ state: { langkah: 4, profil: { jumlahAnggota: 4, lansia: 0, balita: 0, hamil: 0, disabilitas: 0, titikKumpul: "", kontakDarurat: [], ...o } }, version: 1 });
const rencana = (ids: string[]) => JSON.stringify({ state: { rencana: { tindakan: ids.map((id) => ({ actionId: id, phase: "sebelum" })) } }, version: 1 });

t("tanpa daftar: data yang sudah ada menjadi 'Keluarga saya' (milik pemilik ponsel) dan langsung tersimpan", () => {
  const st = penyimpanan({ "sigap:v1:lokasi": lokasi("Kricak") });
  const d = bacaDaftar(st);
  assert.equal(d.daftar.length, 1);
  assert.equal(d.daftar[0].nama, "Keluarga saya");
  assert.ok(d.daftar[0].milikSaya);
  assert.equal(bacaDaftar(st).aktif, d.aktif); // id stabil
  assert.equal(st.getItem("sigap:v1:lokasi"), lokasi("Kricak")); // data aktif tidak tersentuh
});

t("tambah keluarga: data aktif disimpan ke slotnya, keluarga baru mulai kosong; lokasi bisa disalin", () => {
  const st = penyimpanan({ "sigap:v1:lokasi": lokasi("Kricak"), "sigap:v1:profil": profil({ jumlahAnggota: 3 }), "sigap:v1:medis": "{\"saya\":1}" });
  const saya = bacaDaftar(st).aktif;
  const r = tambahKeluarga(st, "  Keluarga   Bu Sari, RT 03 ", { salinLokasi: true });
  assert.ok(r.ok);
  assert.equal(st.getItem("sigap:v1:lokasi"), lokasi("Kricak")); // lokasi sama (satu RT)
  assert.equal(st.getItem("sigap:v1:profil"), null); // profil baru
  assert.equal(st.getItem("sigap:v1:medis"), "{\"saya\":1}"); // info medis tetap milik pemilik ponsel
  assert.match(st.getItem("sigap:v1:kartu")!, /Keluarga Bu Sari, RT 03/); // nama langsung ke Kartu Siaga
  const d = bacaDaftar(st);
  assert.equal(d.daftar.length, 2);
  assert.equal(d.daftar.find((k) => k.id === saya)!.data["sigap:v1:profil"], profil({ jumlahAnggota: 3 }));
  assert.equal(tambahKeluarga(st, "x").ok, false); // nama terlalu pendek
});

t("berganti keluarga bolak-balik tidak menghilangkan atau mencampur data", () => {
  const st = penyimpanan({ "sigap:v1:profil": profil({ jumlahAnggota: 3 }), "sigap:v1:rencana": rencana(["a"]) });
  const saya = bacaDaftar(st).aktif;
  const r = tambahKeluarga(st, "Keluarga Pak Budi");
  assert.ok(r.ok && r.id);
  st.setItem("sigap:v1:profil", profil({ jumlahAnggota: 6 }));
  assert.ok(pindahKe(st, saya));
  assert.equal(st.getItem("sigap:v1:profil"), profil({ jumlahAnggota: 3 }));
  assert.equal(st.getItem("sigap:v1:rencana"), rencana(["a"]));
  assert.ok(r.ok && pindahKe(st, r.id));
  assert.equal(st.getItem("sigap:v1:profil"), profil({ jumlahAnggota: 6 }));
  assert.equal(st.getItem("sigap:v1:rencana"), null); // keluarga ini belum punya rencana
  assert.equal(pindahKe(st, "tidakada"), false);
});

t("ringkasan dan rekap warga: jumlah orang, kelompok rentan, dan kesiapan rencana", () => {
  const st = penyimpanan({ "sigap:v1:lokasi": lokasi("Kricak"), "sigap:v1:profil": profil({ jumlahAnggota: 4, lansia: 1, balita: 1 }), "sigap:v1:rencana": rencana(["a", "b"]), "sigap:v1:progres": JSON.stringify({ state: { progres: { a: true } }, version: 1 }) });
  tambahKeluarga(st, "Keluarga Bu Sari", { salinLokasi: true });
  st.setItem("sigap:v1:profil", profil({ jumlahAnggota: 2, lansia: 2, disabilitas: 1 }));
  const d = bacaDaftar(st);
  const rs = d.daftar.map((k) => ringkasKeluarga(st, d, k));
  assert.deepEqual([rs[0].tindakan, rs[0].tindakanSiap, rs[0].kelurahan], [2, 1, "Kricak"]);
  assert.equal(rs[1].adaRencana, false);
  assert.deepEqual(rekap(rs), { keluarga: 2, denganRencana: 1, orang: 6, lansia: 3, balita: 1, hamil: 0, disabilitas: 1 });
});

t("hapus dan ubah nama: keluarga milik sendiri dan yang aktif tidak bisa dihapus", () => {
  const st = penyimpanan();
  const saya = bacaDaftar(st).aktif;
  const r = tambahKeluarga(st, "Keluarga A");
  assert.ok(r.ok);
  assert.equal(hapusKeluarga(st, saya), false);
  assert.equal(hapusKeluarga(st, r.ok ? r.id : ""), false); // sedang aktif
  pindahKe(st, saya);
  assert.ok(ubahNama(st, r.ok ? r.id : "", "Keluarga A (RT 03)"));
  assert.ok(hapusKeluarga(st, r.ok ? r.id : ""));
  assert.equal(bacaDaftar(st).daftar.length, 1);
});

t("Mode Darurat memakai keluarga pemilik ponsel saat yang aktif keluarga lain", () => {
  const st = penyimpanan({ "sigap:v1:profil": profil({ titikKumpul: "Lapangan Kricak", kontakDarurat: [{ nama: "Ibu", telepon: "0812" }] }) });
  assert.equal(profilMilikSaya(st), null); // belum ada daftar = pemilik ponsel aktif
  tambahKeluarga(st, "Keluarga Warga");
  const p = profilMilikSaya(st)!;
  assert.equal(p.titikKumpul, "Lapangan Kricak");
  assert.deepEqual(p.kontakDarurat, [{ nama: "Ibu", telepon: "0812" }]);
});

t("isi daftar dari berkas cadangan dibersihkan: kunci asing dibuang, tepat satu milik sendiri, batas jumlah", () => {
  const d = bersihkanDaftar({ aktif: "zzzz", daftar: [
    { id: "aaaa1", nama: "A", milikSaya: false, data: { "sigap:v1:profil": "{}", "sigap:v1:tanya": "rahasia", lain: "x" } },
    { id: "bbbb2", nama: "B", milikSaya: true, data: {} },
    { id: "bbbb2", nama: "duplikat", data: {} },
    { id: "../x", nama: "jahat", data: {} },
  ] })!;
  assert.deepEqual(d.daftar.map((k) => k.id), ["aaaa1", "bbbb2"]);
  assert.deepEqual(Object.keys(d.daftar[0].data), ["sigap:v1:profil"]);
  assert.deepEqual(d.daftar.map((k) => k.milikSaya), [false, true]);
  assert.equal(d.aktif, "aaaa1"); // aktif tidak dikenal -> yang pertama
  assert.equal(bersihkanDaftar({ daftar: [] }), null);
  const st = penyimpanan();
  for (let i = 0; i < MAKS_KELUARGA; i++) tambahKeluarga(st, `Keluarga ${i}`);
  assert.equal(tambahKeluarga(st, "Satu lagi").ok, false);
  assert.ok(st.getItem(KUNCI_KELUARGA));
});

t("sebutan: kalimat tentang data keluarga menyebut nama keluarga yang dibuka; kalimat lain tetap", () => {
  const n = "Keluarga Bu Sari";
  assert.equal(gantiAnda("Ada 1 peringatan BMKG di tingkat provinsi. Periksa apakah wilayah Anda disebut.", n), "Ada 1 peringatan BMKG di tingkat provinsi. Periksa apakah wilayah Keluarga Bu Sari disebut.");
  assert.equal(gantiAnda("Rencana 7 hari untuk keluarga Anda", n), "Rencana 7 hari untuk Keluarga Bu Sari");
  assert.equal(gantiAnda("Jumlah orang dari profil keluarga Anda di Rencana", n), "Jumlah orang dari profil Keluarga Bu Sari di Rencana");
  assert.equal(gantiAnda("Apa artinya bagi keluarga saya? Data tren iklim di wilayah saya.", n), "Apa artinya bagi Keluarga Bu Sari? Data tren iklim di wilayah Keluarga Bu Sari.");
  assert.equal(gantiAnda("Atap rumah Anda dari apa?", n), "Atap rumah Keluarga Bu Sari dari apa?");
  assert.equal(gantiAnda("Rumah Anda bisa berjarak beberapa ratus meter.", n), "Rumah Keluarga Bu Sari bisa berjarak beberapa ratus meter.");
  assert.equal(gantiAnda("Anda bisa bersiap sedikit demi sedikit.", n), "Anda bisa bersiap sedikit demi sedikit."); // bukan data keluarga
  assert.equal(gantiAnda("Periksa apakah wilayah Anda disebut.", null), "Periksa apakah wilayah Anda disebut."); // keluarga sendiri
  assert.equal(gantiAnda("Air simpanan Anda cukup untuk 0 hari.", n), "Air simpanan Keluarga Bu Sari cukup untuk 0 hari.");
  assert.equal(gantiAnda("Risiko di lokasi Anda menurut data", n), "Risiko di lokasi Keluarga Bu Sari menurut data");
  assert.equal(gantiAnda("Titik panas di sekitar Anda", n), "Titik panas di sekitar lokasi Keluarga Bu Sari");
  assert.equal(gantiAnda("Saran ini berasal dari jawaban Anda.", n), "Saran ini berasal dari jawaban untuk Keluarga Bu Sari.");
  assert.equal(gantiAnda("Apakah Anda tinggal di pesisir?", n), "Apakah Keluarga Bu Sari tinggal di pesisir?");
  assert.equal(gantiAnda("Siapa saja yang tinggal bersama Anda?", n), "Siapa saja anggota Keluarga Bu Sari?");
  assert.equal(gantiAnda("Jumlah anggota keluarga (termasuk Anda)", n), "Jumlah anggota keluarga");
  assert.equal(gantiAnda("Hanya untuk Kartu Siaga Anda", n), "Hanya untuk Kartu Siaga Keluarga Bu Sari");
  assert.equal(gantiAnda("Ada peringatan di provinsi Anda. Periksa apakah kecamatan Anda disebut.", n), "Ada peringatan di provinsi Keluarga Bu Sari. Periksa apakah kecamatan Keluarga Bu Sari disebut.");
  assert.equal(gantiAnda("Anda menjawab air di rumah sering sulit.", n), "Untuk Keluarga Bu Sari dijawab air di rumah sering sulit.");
  assert.equal(gantiAnda("Anda sedang offline.", n), "Anda sedang offline."); // tentang pengguna, bukan data keluarga
});

t("penyimpanan penuh saat berganti atau menambah keluarga: data keluarga asal tidak hilang", () => {
  const st = penyimpanan({ "sigap:v1:lokasi": lokasi("Kricak"), "sigap:v1:profil": profil({ jumlahAnggota: 3 }) });
  const saya = bacaDaftar(st).aktif;
  assert.ok(tambahKeluarga(st, "Keluarga Bu Sari").ok);
  st.setItem("sigap:v1:profil", profil({ jumlahAnggota: 6 }));
  // Daftar keluarga tidak bisa ditulis lagi (kuota habis).
  const asli = st.setItem;
  st.setItem = (k, v) => { if (k === KUNCI_KELUARGA) throw new Error("QuotaExceededError"); asli(k, v); };
  assert.equal(pindahKe(st, saya), false);
  assert.equal(tambahKeluarga(st, "Keluarga Pak Budi").ok, false);
  st.setItem = asli;
  assert.equal(st.getItem("sigap:v1:profil"), profil({ jumlahAnggota: 6 })); // data Bu Sari tetap di kunci aktif
  assert.ok(pindahKe(st, saya));
  assert.equal(st.getItem("sigap:v1:profil"), profil({ jumlahAnggota: 3 })); // data saya utuh
  assert.equal(bacaDaftar(st).daftar.length, 2);
});

t("cadangan: daftar keluarga ikut dipulihkan (bukan store zustand), isinya tetap dibersihkan", () => {
  const st = penyimpanan({ "sigap:v1:profil": profil({ jumlahAnggota: 3 }) });
  bacaDaftar(st);
  tambahKeluarga(st, "Keluarga Bu Sari");
  const data: Record<string, unknown> = {};
  for (const [k, v] of st.m) data[k] = JSON.parse(v);
  const h = bacaCadangan(JSON.stringify({ diekspor: new Date().toISOString(), data }));
  assert.ok(h.ok);
  if (!h.ok) return;
  assert.ok(h.isi.kunci[KUNCI_KELUARGA], "daftar keluarga harus ikut");
  const d = JSON.parse(h.isi.kunci[KUNCI_KELUARGA]);
  assert.equal(d.daftar.length, 2);
  assert.match(d.daftar[0].data["sigap:v1:profil"], /"jumlahAnggota":3/);
  const rusak = bacaCadangan(JSON.stringify({ data: { [KUNCI_KELUARGA]: { daftar: "bukan daftar" }, "sigap:v1:profil": { state: {} } } }));
  assert.ok(rusak.ok && !rusak.isi.kunci[KUNCI_KELUARGA] && rusak.isi.dilewati.includes(KUNCI_KELUARGA));
});

t("ubah nama keluarga: nama di Kartu Siaga selalu ikut berubah", () => {
  const kartu = (s: Penyimpanan, data?: string | null) => JSON.parse(data ?? s.getItem("sigap:v1:kartu")!).state.namaKeluarga;
  const st = penyimpanan();
  bacaDaftar(st);
  const r = tambahKeluarga(st, "Keluarga Aura");
  assert.ok(r.ok);
  if (!r.ok) return;
  // Keluarga aktif: kunci aktif diperbarui.
  assert.ok(ubahNama(st, r.id, "Keluarga Aura RT 4"));
  assert.equal(kartu(st), "Keluarga Aura RT 4");
  // Keluarga tidak aktif: salinan di slotnya diperbarui.
  const saya = bacaDaftar(st).daftar.find((k) => k.milikSaya)!.id;
  pindahKe(st, saya);
  assert.ok(ubahNama(st, r.id, "Keluarga Aura RT 05"));
  assert.equal(kartu(st, bacaDaftar(st).daftar.find((k) => k.id === r.id)!.data["sigap:v1:kartu"]), "Keluarga Aura RT 05");
  pindahKe(st, r.id);
  assert.equal(kartu(st), "Keluarga Aura RT 05");
  // Nama kartu yang berbeda (mis. beda huruf besar-kecil) tetap mengikuti nama baru; pengaturan lain tetap.
  st.setItem("sigap:v1:kartu", JSON.stringify({ state: { namaKeluarga: "Keluarga AURA", ukuran: "A5", tampilkanCatatan: true }, version: 1 }));
  assert.ok(ubahNama(st, r.id, "Keluarga Aura RT 6"));
  assert.equal(kartu(st), "Keluarga Aura RT 6");
  assert.equal(JSON.parse(st.getItem("sigap:v1:kartu")!).state.ukuran, "A5");
  // Keluarga tanpa nama kartu (mis. "Keluarga saya") mendapat nama baru, pengaturan lain tetap.
  assert.ok(ubahNama(st, saya, "Keluarga Pak Kuro"));
  pindahKe(st, saya);
  assert.equal(kartu(st), "Keluarga Pak Kuro");
});

t("nama keluarga dengan tanda $ tidak dibaca sebagai pola ganti", () => {
  assert.equal(gantiAnda("Rencana 7 hari untuk keluarga Anda", "Keluarga $1 & $&"), "Rencana 7 hari untuk Keluarga $1 & $&");
  assert.equal(gantiAnda("Atap rumah Anda", "Pak $$"), "Atap rumah Pak $$");
});

t("Mode Darurat: bahaya dan risiko lokasi juga dari keluarga pemilik ponsel", () => {
  const risiko = JSON.stringify({ lat: -7.77, lon: 110.36, diambilPada: "2026-11-21T00:00:00Z", nilai: [{ id: "gunung_api", tingkat: "tinggi", alasan: "x" }] });
  const st = penyimpanan({ "sigap:v1:lokasi": lokasi("Kricak"), "sigap:v1:profil": profil({ bahaya: ["gunung_api", "gempa"] }), "sigap:v1:risiko": risiko });
  bacaDaftar(st);
  tambahKeluarga(st, "Keluarga Bu Sari");
  const m = profilMilikSaya(st)!;
  assert.deepEqual(m.bahaya, ["gunung_api", "gempa"]);
  assert.deepEqual(m.titik, { lat: -7.77, lon: 110.36 });
  assert.equal(m.risikoMentah, risiko);
  assert.ok(m.id);
});

for (const [n, f] of tests) {
  try { f(); ok++; console.log("  ok  ", n); } catch (e) { console.error("  GAGAL", n, "\n", e); process.exitCode = 1; }
}
console.log(`${ok}/${tests.length} lulus`);
