// Jalankan: npx tsx tests/unit/simulator.test.ts  (Simulator Bencana AI: uji awal, validasi keluaran AI, cadangan)
import assert from "node:assert/strict";
import { JUMLAH_SOAL, fokusDari, nilaiUji, soalUji, soalUjiGabungan } from "@/lib/simulasi/uji";
import { BANK_SOAL } from "@/lib/simulasi/bank-soal";
import { PASANGAN_BERUNTUN, bencanaKedua, tantanganUntuk } from "@/lib/simulasi/tingkat";
import { ekstraDari, keduaUntuk } from "@/lib/ai/simulasi";
import { SimulasiKeluaran } from "@/lib/ai/schema";
import { personalisasiDari, pilihPassageSimulasi, susunPromptSimulasi, susunSimulasi, validasiSimulasi } from "@/lib/ai/simulasi";
import { SimulasiRequest, type SimulasiKeluaranT } from "@/lib/ai/schema";
import { SEMUA_CHUNK } from "@/lib/kb/data";
import { SKENARIO } from "@/lib/latihan/skenario";
import type { LlmProvider, PermintaanLlm } from "@/lib/ai/provider";
import { AnggaranHarian, CacheTtl } from "@/lib/ai/runtime";

let ok = 0;
const tests: Array<[string, () => void | Promise<void>]> = [];
const t = (n: string, f: () => void | Promise<void>) => tests.push([n, f]);

t("bank soal: >=10 soal per bahaya simulasi, id unik, tepat satu terbaik, sumber ada di KB, tidak sama dengan langkah skenario", () => {
  const idKb = new Set(SEMUA_CHUNK.map((c) => c.id));
  const situasiSkenario = new Set(SKENARIO.flatMap((s) => s.langkah.map((l) => l.situasi)));
  assert.equal(new Set(BANK_SOAL.map((s) => s.id)).size, BANK_SOAL.length, "id ganda");
  for (const s of SKENARIO) assert.ok(BANK_SOAL.filter((b) => b.hazard === s.hazard).length >= 10, s.hazard);
  for (const b of BANK_SOAL) {
    assert.ok(idKb.has(b.tepat.sumber), `${b.id}: sumber ${b.tepat.sumber}`);
    assert.ok(b.lain.length >= 2 && b.lain.every((x) => x.nilai !== (2 as number)), b.id);
    assert.ok(!situasiSkenario.has(b.situasi), `${b.id} menyalin skenario`);
    const teks = [b.tepat.teks, ...b.lain.map((x) => x.teks)];
    assert.equal(new Set(teks).size, teks.length, `${b.id}: pilihan kembar`);
  }
});

t("uji awal: 5 soal acak per sesi, soal terakhir dihindari, beruntun tetap 5 soal", () => {
  let x = 7;
  const rnd = () => ((x = (x * 16807) % 2147483647) / 2147483647);
  for (const s of SKENARIO) {
    const a = soalUji(s.hazard, { rnd });
    assert.equal(a.length, JUMLAH_SOAL, s.hazard);
    assert.equal(new Set(a.map((q) => q.id)).size, 5);
    for (const q of a) assert.equal(q.pilihan.filter((p) => p.nilai === 2).length, 1);
    const b = soalUji(s.hazard, { rnd, hindari: a.map((q) => q.id) });
    const tumpang = b.filter((q) => a.some((y) => y.id === q.id)).length;
    const total = BANK_SOAL.filter((q) => q.hazard === s.hazard).length;
    assert.equal(tumpang, Math.max(0, 10 - total), `${s.hazard}: sesi berikutnya mengulang soal`);
  }
  const g = soalUjiGabungan("gempa", "tsunami", { rnd });
  assert.equal(g.length, 5);
  assert.equal(g.filter((q) => q.id.startsWith("q-tsunami")).length, 2);
  // Acak sungguhan: dua sesi tanpa riwayat tidak selalu memberi urutan yang sama.
  const set = new Set(Array.from({ length: 6 }, () => soalUji("banjir").map((q) => q.id).join()));
  assert.ok(set.size > 1);
});

t("nilai uji: benar = tindakan terbaik; konsep keliru dikirim sebagai fokus", () => {
  const soal = soalUji("banjir");
  const terbaik = Object.fromEntries(soal.map((q) => [q.id, q.pilihan.findIndex((p) => p.nilai === 2)]));
  assert.equal(nilaiUji(soal, terbaik).persen, 100);
  const satuSalah = { ...terbaik, [soal[0].id]: soal[0].pilihan.findIndex((p) => p.nilai !== 2) };
  const h = nilaiUji(soal, satuSalah);
  assert.deepEqual(h.salah, [soal[0].id]);
  assert.equal(nilaiUji(soal, {}).persen, 0);
  assert.equal(fokusDari(soal, h.salah)[0].sumber, soal[0].sumberTerbaik);
});

const SOAL = soalUji("banjir");
const REQ = SimulasiRequest.parse({
  hazard: "banjir",
  lokasi: { kelurahan: "Kelapa Gading Timur", kecamatan: "Kelapa Gading", kabKota: "Kota Jakarta Utara", provinsi: "DKI Jakarta" },
  profil: { bahaya: ["cuaca_ekstrem"], varianBanjir: ["genangan"], jumlahAnggota: 3, lansia: 0, balita: 1, hamil: 0, disabilitas: 0, obatRutin: false, jumlahObatRutin: 0, hewanPeliharaan: false, bangunan: "rumah_1_lantai", punyaKendaraan: false, persediaanHari: 3 },
  risiko: [{ id: "banjir", tingkat: "tinggi", alasan: ["Dataran rendah (ketinggian sekitar 5 m): air hujan lambat surut."] }],
  fokus: fokusDari(SOAL, [SOAL[0].id]),
});
const PASSAGES = pilihPassageSimulasi(SEMUA_CHUNK, "banjir", REQ.profil, REQ.fokus.map((f) => f.sumber));
const ID = PASSAGES.filter((c) => c.hazard === "banjir").map((c) => c.id);

/** Keluaran model yang sah: 5 langkah; langkah 4 tentang pesan berantai (ditulis di situasi). */
function keluaranSah(ubah: (k: SimulasiKeluaranT) => void = () => {}): SimulasiKeluaranT {
  const pil = (src: string) => [
    { teks: "Pindahkan dokumen ke tempat tinggi", nilai: 2 as const, umpanBalik: "Tepat, dokumen tetap aman untuk keluarga Anda.", sourceIds: [src] },
    { teks: "Menunggu kabar dari tetangga dulu", nilai: 1 as const, umpanBalik: "Menunggu membuat waktu bersiap makin sempit.", sourceIds: [src] },
    { teks: "Berjalan menembus arus di jalan", nilai: 0 as const, umpanBalik: "Arus dapat menyeret Anda dan balita.", sourceIds: [src] },
  ];
  const k: SimulasiKeluaranT = {
    judul: "Banjir di rumah satu lantai",
    ringkas: "Air naik di dataran rendah dan Anda bersama satu balita harus memutuskan cepat.",
    langkah: [0, 1, 2, 3, 4].map((i) => ({
      situasi: i === 3
        ? "Di grup keluarga beredar pesan berantai bahwa pintu air utama jebol, tanpa menyebut sumber resmi."
        : `Air mulai masuk ke rumah satu lantai Anda di Kelapa Gading Timur, langkah ke-${["satu", "dua", "tiga", "empat", "lima"][i]}.`,
      pilihan: i === 3 ? [
        { teks: "Periksa ke kanal resmi BPBD sebelum bertindak", nilai: 2 as const, umpanBalik: "Tepat, kabar tanpa sumber sering keliru.", sourceIds: [ID[0]] },
        { teks: "Menunggu sampai ada yang memastikan", nilai: 1 as const, umpanBalik: "Lebih baik langsung memeriksa sumber resmi.", sourceIds: [ID[0]] },
        { teks: "Teruskan ke grup keluarga", nilai: 0 as const, umpanBalik: "Meneruskan kabar bohong menimbulkan panik.", sourceIds: [ID[0]] },
      ] : pil(ID[i % ID.length]),
    })),
  };
  ubah(k);
  return k;
}

t("validasi: keluaran sah lolos, pilihan diacak kode, sumber dipetakan, kolom pesan lama diabaikan", () => {
  const r = validasiSimulasi(keluaranSah(), PASSAGES, REQ, "ai-banjir-uji");
  assert.ok(!("galat" in r), JSON.stringify(r));
  if ("galat" in r) return;
  assert.equal(r.skenario.langkah.length, 5);
  assert.equal(r.skenario.hazard, "banjir");
  assert.ok(r.skenario.langkah.some((l) => l.pilihan[0].nilai !== 2), "urutan diacak, jawaban terbaik tidak selalu pertama");
  assert.ok(r.skenario.langkah.every((l) => l.pilihan.every((p) => ID.includes(p.sumber))));
  assert.ok(!("pesan" in r));
  // Model yang masih menulis kolom "pesan" (format lama) tetap diterima; kolomnya tidak dipakai.
  const lama = validasiSimulasi(keluaranSah((k) => { k.langkah[0].pesan = { dari: "Info BMKG", jenis: "resmi", jam: "19.00", teks: "Hujan lebat berpotensi menimbulkan genangan." }; }), PASSAGES, REQ, "x");
  assert.ok(!("galat" in lama), JSON.stringify(lama));
});

t("validasi menolak: dua jawaban terbaik, tanpa pilihan berbahaya, kutipan karangan, angka karangan, tautan, bocoran jawaban", () => {
  const tolak = (f: (k: SimulasiKeluaranT) => void, pola: RegExp) => {
    const r = validasiSimulasi(keluaranSah(f), PASSAGES, REQ, "x");
    assert.ok("galat" in r && pola.test(r.galat), JSON.stringify(r));
  };
  tolak((k) => { k.langkah[0].pilihan[1].nilai = 2; }, /tepat satu pilihan bernilai 2/);
  tolak((k) => { k.langkah[1].pilihan[2].nilai = 1; }, /pilihan berbahaya/);
  tolak((k) => { k.langkah[2].pilihan[0].sourceIds = ["banjir-saat-999"]; }, /sourceIds/);
  tolak((k) => { k.langkah[2].situasi = "Air sudah setinggi 80 cm di rumah Anda dan terus naik dengan cepat sekali."; }, /angka yang tidak ada di DATA/);
  tolak((k) => { k.langkah[3].situasi = "Beredar pesan berantai dengan tautan www.contoh.id yang mengaku dari petugas."; }, /tautan/);
  tolak((k) => { k.langkah[0].pilihan[0].teks = "Pilihan yang benar: pindahkan dokumen"; }, /membocorkan/);
  tolak((k) => { k.langkah[0].pilihan[2].teks = "(Salah) Menunggu di rumah saja"; }, /membocorkan/);
  // Frasa wajar "dengan benar" tidak dianggap bocor.
  assert.ok(!("galat" in validasiSimulasi(keluaranSah((k) => { k.langkah[0].pilihan[0].teks = "Simpan air minum dengan benar di wadah tertutup"; }), PASSAGES, REQ, "x")));
});

t("pilihan keliru boleh menggambarkan anggapan salah; tindakan terbaik dan umpan balik tidak boleh menjamin keselamatan", () => {
  const keliru = validasiSimulasi(keluaranSah((k) => { k.langkah[0].pilihan[2].teks = "Diam di rumah karena merasa pasti aman"; }), PASSAGES, REQ, "x");
  assert.ok(!("galat" in keliru), JSON.stringify(keliru));
  const terbaik = validasiSimulasi(keluaranSah((k) => { k.langkah[0].pilihan[0].teks = "Mengungsi sekarang supaya pasti aman"; }), PASSAGES, REQ, "x");
  assert.ok("galat" in terbaik && /jaminan/.test(terbaik.galat), JSON.stringify(terbaik));
  const umpan = validasiSimulasi(keluaranSah((k) => { k.langkah[0].pilihan[2].umpanBalik = "Tenang saja, keluarga Anda pasti aman di rumah."; }), PASSAGES, REQ, "x");
  assert.ok("galat" in umpan, JSON.stringify(umpan));
});

t("angka dari data boleh: ketinggian 5 m (risiko lokasi) dan nomor darurat 112", () => {
  const r = validasiSimulasi(keluaranSah((k) => { k.langkah[1].situasi = "Rumah Anda di dataran rendah sekitar 5 m, air mulai masuk. Bila darurat, telepon 112."; }), PASSAGES, REQ, "x");
  assert.ok(!("galat" in r), JSON.stringify(r));
});

t("personalisasi dan prompt: atribut keluarga dan fakta lokasi masuk; tanpa koordinat; konsep FOKUS dan passage-nya disertakan", () => {
  const ps = personalisasiDari(REQ);
  assert.ok(ps.includes("1 balita") && ps.includes("Rumah satu lantai") && ps.includes("Tanpa kendaraan"));
  assert.ok(ps.some((x) => /Dataran rendah/.test(x)) && ps.some((x) => /1 konsep/.test(x)));
  const prompt = susunPromptSimulasi(REQ, PASSAGES);
  assert.match(prompt, /PROFIL/);
  assert.match(prompt, /RISIKO_LOKASI/);
  assert.match(prompt, /FOKUS/);
  assert.ok(PASSAGES.some((c) => c.id === REQ.fokus[0].sumber), "passage konsep FOKUS ikut");
  assert.ok(PASSAGES.length <= 22 && PASSAGES.every((c) => c.hazard === "banjir" || c.hazard === "umum"));
  assert.doesNotMatch(prompt, /-6[.,]1|106[.,]9/);
});

const penyedia = (keluaran: string[]) => {
  const diminta: PermintaanLlm[] = [];
  let i = 0;
  const p: LlmProvider = { nama: "palsu", hasilJson: async (r) => { diminta.push(r); return keluaran[Math.min(i++, keluaran.length - 1)]; } };
  return { p, diminta };
};
const deps = (p: LlmProvider) => ({ kb: SEMUA_CHUNK, providers: [p], anggaran: new AnggaranHarian(() => 100), cache: new CacheTtl<never>(60_000) as never, sekarang: () => new Date("2026-11-20T03:00:00Z") });

t("orkestrasi: keluaran sah = mode ai; ditolak lalu diperbaiki memakai catatan alasan; tetap gagal = skenario tim", async () => {
  const { p } = penyedia([JSON.stringify(keluaranSah())]);
  const h = await susunSimulasi(REQ, deps(p));
  assert.equal(h.mode, "ai");
  assert.equal(h.skenario.langkah.length, 5);

  const buruk = JSON.stringify(keluaranSah((k) => { k.langkah[0].pilihan[1].nilai = 2; }));
  const p2 = penyedia([buruk, JSON.stringify(keluaranSah())]);
  const h2 = await susunSimulasi({ ...REQ, varian: 1 }, deps(p2.p));
  assert.equal(h2.mode, "ai");
  assert.match(p2.diminta[1].user, /ditolak \(langkah 1: harus tepat satu pilihan bernilai 2\)/);

  const p3 = penyedia(["{rusak"]);
  const h3 = await susunSimulasi({ ...REQ, varian: 2 }, deps(p3.p));
  assert.equal(h3.mode, "cadangan");
  assert.equal(h3.skenario.id, "banjir-kiriman");
  assert.ok(h3.personalisasi.length > 0);
});

t("tingkat: pasangan beruntun sah; tsunami hanya bila lokasi berisiko tsunami; keadaan sulit bergiliran per variasi", () => {
  assert.equal(bencanaKedua("gempa", { tsunami: "tinggi" }), "tsunami");
  assert.equal(bencanaKedua("gempa", {}), "longsor"); // rumah jauh dari pantai: bukan tsunami
  assert.equal(bencanaKedua("kekeringan"), "karhutla");
  assert.equal(bencanaKedua("cuaca_ekstrem", {}), "banjir");
  for (const [h, daftar] of Object.entries(PASANGAN_BERUNTUN)) assert.ok(daftar.length > 0 && !daftar.includes(h as never), h);
  const a = tantanganUntuk("banjir", 0);
  const b = tantanganUntuk("banjir", 1);
  assert.equal(a.length, 2);
  assert.notEqual(a[0], a[1]);
  assert.notDeepEqual(a, b);
  assert.equal(soalUjiGabungan("gempa", "tsunami").length, JUMLAH_SOAL);
  assert.ok(soalUjiGabungan("gempa", null).every((q) => q.id.startsWith("q-gempa")));
});

t("beruntun: bencana kedua dari klien hanya diterima bila pasangan sah; prompt memuat perintah dan passage kedua bencana", () => {
  const r = SimulasiRequest.parse({ ...REQ, hazard: "gempa", tingkat: "beruntun", kedua: "kekeringan" });
  assert.equal(keduaUntuk(r), "longsor"); // kekeringan bukan pasangan gempa: dihitung ulang
  const r2 = SimulasiRequest.parse({ ...REQ, hazard: "gempa", tingkat: "beruntun", kedua: "tsunami", risiko: [{ id: "tsunami", tingkat: "tinggi", alasan: ["Jarak ke garis pantai sekitar 2 km."] }] });
  const e = ekstraDari(r2);
  assert.equal(e.kedua, "tsunami");
  const ps = pilihPassageSimulasi(SEMUA_CHUNK, "gempa", r2.profil, [], e.kedua);
  assert.ok(ps.some((c) => c.hazard === "tsunami") && ps.some((c) => c.hazard === "gempa"));
  assert.match(susunPromptSimulasi(r2, ps, e), /BENCANA BERUNTUN: Gempa Bumi memicu Tsunami/);
  assert.ok(personalisasiDari(r2, e).includes("Disusul tsunami"));
});

t("beruntun: keluaran yang tidak pernah mengutip panduan bencana kedua ditolak", () => {
  const r = SimulasiRequest.parse({ ...REQ, tingkat: "beruntun", kedua: "longsor" });
  const e = ekstraDari(r);
  const ps = pilihPassageSimulasi(SEMUA_CHUNK, "banjir", r.profil, r.fokus.map((f) => f.sumber), e.kedua);
  const hasil = validasiSimulasi(keluaranSah(), ps, r, "x", e);
  assert.ok("galat" in hasil && /longsor/.test(hasil.galat), JSON.stringify(hasil));
});

t("menantang dan kondisi nyata: keadaan sulit dan fakta prakiraan masuk prompt; angka prakiraan boleh dipakai", () => {
  const r = SimulasiRequest.parse({ ...REQ, tingkat: "menantang", varian: 1 });
  const kondisi = "- [waspada] Hujan sangat lebat: Diprakirakan hujan 52 mm pada Jumat 21 Nov. (Jumat 21 Nov)";
  const e = ekstraDari(r, kondisi);
  const prompt = susunPromptSimulasi(r, PASSAGES, e);
  assert.match(prompt, /TANTANGAN/);
  assert.match(prompt, /KONDISI_NYATA/);
  assert.match(prompt, /52 mm/);
  assert.ok(personalisasiDari(r, e).includes("Dibuka dari prakiraan nyata minggu ini"));
  const ok = validasiSimulasi(keluaranSah((k) => { k.langkah[0].situasi = "BMKG memprakirakan hujan 52 mm pada Jumat 21 Nov di wilayah Anda."; }), PASSAGES, r, "x", e);
  assert.ok(!("galat" in ok), JSON.stringify(ok));
});

t("skema: model yang masih menulis pesan null atau hoaks null (format lama) tetap diterima", () => {
  const k = JSON.parse(JSON.stringify(keluaranSah())) as Record<string, unknown> & { langkah: Array<Record<string, unknown>> };
  k.langkah[1].pesan = null;
  k.langkah[0].pesan = { dari: "Grup RT", jenis: "warga", jam: "19.00", teks: "Warga diminta bersiap.", hoaks: null };
  assert.ok(SimulasiKeluaran.safeParse(k).success);
});

(async () => {
  for (const [n, f] of tests) {
    try { await f(); ok++; console.log("  ok  ", n); } catch (e) { console.error("  GAGAL", n, "\n", e); process.exitCode = 1; }
  }
  console.log(`${ok}/${tests.length} lulus`);
})();
