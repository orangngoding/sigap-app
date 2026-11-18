// Jalankan: npx tsx tests/unit/latihan.test.ts  (Latihan Siaga, pengingat tas, berbagi rencana, deteksi peringatan)
import assert from "node:assert/strict";
import { CHUNK_BY_ID } from "@/lib/kb/data";
import { SKENARIO } from "@/lib/latihan/skenario";
import { AMBANG_LULUS, cariLangkah, hazardLatihan, hitungHasil, langkahSesudah, type Jawaban } from "@/lib/latihan/mesin";
import { bangunButir, hitungSkor } from "@/lib/preparedness/skor";
import { buatIcs, ringkasPengingat, sisaHari, statusKedaluwarsa, tanggalValid } from "@/lib/rencana/pengingat";
import { MAKS_TEKS_BAGIKAN, tautanWhatsApp, teksBagikan } from "@/lib/rencana/bagikan";
import { tampakPeringatan } from "@/lib/tanya/deteksi";
import { lolosPenyaring } from "@/lib/ai/guardrails";
import type { ItemTas, Tindakan } from "@/types/rencana";

let ok = 0;
const tests: Array<[string, () => void | Promise<void>]> = [];
const t = (n: string, f: () => void | Promise<void>) => tests.push([n, f]);

// ---------- Integritas konten skenario ----------
t("skenario: setiap sumber ada di KB dan sesuai bahayanya atau umum", () => {
  for (const s of SKENARIO) {
    for (const l of [...s.langkah, ...(s.cabang ?? [])]) {
      for (const p of l.pilihan) {
        const c = CHUNK_BY_ID[p.sumber];
        assert.ok(c, `${s.id}/${l.id}: sumber ${p.sumber} tidak ada di KB`);
        assert.ok(["umum", "gempa", s.hazard].includes(c.hazard), `${s.id}/${l.id}: sumber ${p.sumber} beda bahaya`);
      }
    }
  }
});
t("skenario: tiap langkah punya 3 pilihan, tepat satu jawaban terbaik, id unik", () => {
  for (const s of SKENARIO) {
    const semua = [...s.langkah, ...(s.cabang ?? [])];
    assert.equal(new Set(semua.map((l) => l.id)).size, semua.length, s.id);
    for (const l of semua) {
      assert.equal(l.pilihan.length, 3, `${s.id}/${l.id}`);
      assert.equal(l.pilihan.filter((p) => p.nilai === 2).length, 1, `${s.id}/${l.id}`);
      for (const p of l.pilihan) if (p.lanjut) assert.ok(cariLangkah(s, p.lanjut), `${s.id}/${l.id}: lanjut ${p.lanjut} tidak ada`);
    }
  }
});
t("skenario: umpan balik tidak memuat ramalan atau jaminan keselamatan", () => {
  for (const s of SKENARIO) for (const l of [...s.langkah, ...(s.cabang ?? [])]) for (const p of l.pilihan) assert.ok(lolosPenyaring(p.umpanBalik), `${s.id}/${l.id}: ${p.umpanBalik}`);
});
t("skenario: setiap jalur berakhir (tanpa putaran) dan cabang dapat dicapai", () => {
  for (const s of SKENARIO) {
    const dicapai = new Set<string>();
    const jelajah = (id: string, jejak: string[]) => {
      assert.ok(!jejak.includes(id), `${s.id}: putaran di ${id}`);
      dicapai.add(id);
      const l = cariLangkah(s, id)!;
      l.pilihan.forEach((_, i) => { const b = langkahSesudah(s, id, i); if (b) jelajah(b, [...jejak, id]); });
    };
    jelajah(s.langkah[0].id, []);
    for (const c of s.cabang ?? []) assert.ok(dicapai.has(c.id), `${s.id}: cabang ${c.id} tidak dapat dicapai`);
  }
});

// ---------- Mesin ----------
const banjir = SKENARIO.find((s) => s.id === "banjir-kiriman")!;
t("mesin: pilihan menunda banjir membuka cabang, lalu kembali ke alur utama", () => {
  assert.equal(langkahSesudah(banjir, "b1", 1), "b1x");
  assert.equal(langkahSesudah(banjir, "b1x", 0), "b2");
  assert.equal(langkahSesudah(banjir, "b1", 0), "b2");
  assert.equal(langkahSesudah(banjir, "b5", 0), null);
});
t("mesin: nilai persen dan ambang lulus", () => {
  const sempurna: Jawaban[] = banjir.langkah.map((l) => ({ langkahId: l.id, pilihan: l.pilihan.findIndex((p) => p.nilai === 2) }));
  assert.deepEqual(hitungHasil(banjir, sempurna), { poin: 10, maks: 10, persen: 100, lulus: true });
  const buruk: Jawaban[] = banjir.langkah.map((l) => ({ langkahId: l.id, pilihan: l.pilihan.findIndex((p) => p.nilai === 0) }));
  assert.equal(hitungHasil(banjir, buruk).lulus, false);
  assert.equal(AMBANG_LULUS, 70);
  assert.equal(hitungHasil(banjir, []).persen, 0);
});
t("skor: latihan lulus menambah butir dan menaikkan skor", () => {
  const tindakan = [{ actionId: "a", hazard: "banjir", phase: "sebelum", title: "x", detail: "y", priority: "sedang", forGroups: ["umum"], sourceIds: ["banjir-saat-001"] }] as Tindakan[];
  const lat = hazardLatihan([...tindakan, { hazard: "umum" }, { hazard: "kekeringan" }]);
  assert.deepEqual(lat, ["banjir"]); // kekeringan belum punya skenario
  const butir = bangunButir(tindakan, [], lat);
  assert.equal(butir.length, 2);
  assert.ok(hitungSkor(butir, { "latihan:banjir": true }).skor > hitungSkor(butir, {}).skor);
  assert.equal(bangunButir(tindakan, []).length, 1); // pemanggil lama tetap sama
});

// ---------- Pengingat tas ----------
const NOW = new Date(2026, 10, 18, 10, 0); // 18 Nov 2026, waktu lokal
const TAS: ItemTas[] = [
  { id: "air", kelompok: "Air dan makanan", nama: "Air minum", jumlah: 9, satuan: "liter", bobot: 2 },
  { id: "makanan", kelompok: "Air dan makanan", nama: "Makanan siap makan", jumlah: 9, satuan: "porsi", bobot: 2 },
  { id: "baterai", kelompok: "Perlengkapan", nama: "Baterai cadangan", jumlah: 1, satuan: "set", bobot: 1 },
  { id: "senter", kelompok: "Perlengkapan", nama: "Senter", jumlah: 1, satuan: "buah", bobot: 1 },
];
t("pengingat: status lewat, segera, aman, dan validasi tanggal", () => {
  assert.equal(sisaHari("2026-11-25", NOW), 7);
  assert.equal(statusKedaluwarsa("2026-11-17", NOW), "lewat");
  assert.equal(statusKedaluwarsa("2026-12-10", NOW), "segera");
  assert.equal(statusKedaluwarsa("2027-06-01", NOW), "aman");
  assert.ok(tanggalValid("2026-02-28") && !tanggalValid("28-02-2026") && !tanggalValid(""));
  const r = ringkasPengingat(TAS, { air: "2026-11-01", makanan: "2026-12-01", baterai: "2028-01-01", senter: "2026-11-01" }, NOW);
  assert.deepEqual(r.lewat.map((x) => x.id), ["air"]);
  assert.deepEqual(r.segera.map((x) => x.id), ["makanan"]); // senter tidak punya masa berlaku
});
t("pengingat: berkas .ics valid, seminggu sebelum kedaluwarsa, plus pemeriksaan tiap 3 bulan", () => {
  const ics = buatIcs(TAS, { air: "2026-11-01", makanan: "2026-12-20" }, NOW);
  assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\n") && ics.endsWith("END:VCALENDAR\r\n"));
  assert.match(ics, /DTSTART;VALUE=DATE:20261213/); // 20 Des - 7 hari
  assert.doesNotMatch(ics, /tas-air/); // yang sudah lewat tidak dijadwalkan
  assert.match(ics, /RRULE:FREQ=MONTHLY;INTERVAL=3/);
  assert.equal((ics.match(/BEGIN:VEVENT/g) ?? []).length, 2);
  for (const baris of ics.split("\r\n")) assert.ok(baris.length <= 75, baris);
});

// ---------- Berbagi ----------
t("bagikan: memuat 112, titik kumpul, langkah saat; tanpa nomor kontak; dibatasi panjangnya", () => {
  const tindakan = [
    { actionId: "1", hazard: "banjir", phase: "saat", title: "Matikan listrik", detail: "d", priority: "tinggi", forGroups: ["umum"], sourceIds: ["banjir-saat-002"] },
    { actionId: "2", hazard: "banjir", phase: "sebelum", title: "Siapkan tas", detail: "d", priority: "tinggi", forGroups: ["umum"], sourceIds: ["umum-sebelum-005"] },
  ] as Tindakan[];
  const teks = teksBagikan({ lokasi: { kelurahan: "Cawang", kecamatan: "Kramat Jati", kabKota: "Jakarta Timur" }, bahaya: ["banjir"], tindakan, tas: TAS, titikKumpul: "Masjid Al-Ikhlas", urlDarurat: "https://sigap.example/darurat" });
  assert.match(teks, /112/);
  assert.match(teks, /Masjid Al-Ikhlas/);
  assert.match(teks, /Saat banjir:\*\n- Matikan listrik/);
  assert.doesNotMatch(teks, /Siapkan tas/);
  assert.ok(teks.length <= MAKS_TEKS_BAGIKAN);
  assert.ok(tautanWhatsApp(teks).startsWith("https://wa.me/?text=*Rencana%20Siaga"));
});

// ---------- Deteksi teks peringatan ----------
t("deteksi: teks nowcast BMKG dikenali; pertanyaan panjang tidak", () => {
  const nowcast = "Peringatan Dini Cuaca Wilayah Jawa Barat tgl 18 November 2026 pkl 14:20 WIB: Waspada potensi hujan sedang-lebat disertai kilat/petir dan angin kencang pada pkl 14:40 WIB di Kab. Bogor, Kab. Sukabumi.";
  assert.ok(tampakPeringatan(nowcast));
  assert.ok(!tampakPeringatan("Bagaimana cara menyiapkan tas siaga untuk keluarga besar yang punya lansia, balita, dan hewan peliharaan, serta tinggal di daerah rawan banjir dan gempa?"));
  assert.ok(!tampakPeringatan("Apa itu peringatan dini BMKG?"));
});

(async () => {
  for (const [n, f] of tests) {
    try { await f(); ok++; console.log("  ok  ", n); } catch (e) { console.error("  GAGAL", n, "\n", e); process.exitCode = 1; }
  }
  console.log(`${ok}/${tests.length} lulus`);
})();
