// Penyaring data tersimpan: data sah lewat utuh, data rusak dibersihkan tanpa membuang bagian yang masih sah.
import assert from "node:assert/strict";
import { SEMUA_CHUNK } from "@/lib/kb/data";
import { anonimkan } from "@/lib/rencana/hash";
import { bangunRencanaTemplat } from "@/lib/rencana/templat";
import { LOKASI_CONTOH, buatProfilAwal, buatProfilContoh } from "@/lib/preparedness/profil-awal";
import { finalisasiProfil } from "@/lib/preparedness/profil-schema";
import { sanitasiLokasi, sanitasiProfil, sanitasiRencana } from "@/lib/storage/sanitasi";

let ok = 0;
function t(nama: string, fn: () => void) {
  try { fn(); ok++; console.log("  ok  ", nama); } catch (e) { console.error("  GAGAL", nama, "\n", e); process.exitCode = 1; }
}

const salin = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const lengkap = finalisasiProfil(buatProfilContoh());
assert.ok(lengkap);

t("lokasi sah lewat utuh; koordinat berupa teks, di luar batas, atau bukan objek -> null", () => {
  assert.deepEqual(sanitasiLokasi(salin(LOKASI_CONTOH)), LOKASI_CONTOH);
  assert.equal(sanitasiLokasi({ ...LOKASI_CONTOH, lat: "angka?" }), null);
  assert.equal(sanitasiLokasi({ ...LOKASI_CONTOH, lon: 999 }), null);
  assert.equal(sanitasiLokasi("bukan-objek"), null);
  assert.equal(sanitasiLokasi(null), null);
});

t("profil sah lewat utuh (contoh dan awal)", () => {
  for (const p of [buatProfilContoh(), buatProfilAwal()]) {
    const bersih = sanitasiProfil(salin(p));
    for (const [k, v] of Object.entries(salin(p))) assert.deepEqual((bersih as Record<string, unknown>)[k], v, k);
  }
});

t("profil rusak: hanya kolom yang salah yang dibuang", () => {
  const p = { ...salin(buatProfilContoh()), bahaya: "bukan-array", jumlahAnggota: "angka?", kontakDarurat: [{ nama: 1 }], titikKumpul: "Balai RW" };
  const b = sanitasiProfil(p);
  assert.ok(!("bahaya" in b) && !("jumlahAnggota" in b) && !("kontakDarurat" in b));
  assert.equal(b.titikKumpul, "Balai RW");
  assert.deepEqual(sanitasiProfil("bukan-objek"), {});
});

t("rencana sah (semua bahaya) lewat utuh", () => {
  const anon = anonimkan(lengkap);
  for (const bahaya of [["banjir"], ["gempa", "banjir", "longsor"], anon.bahaya] as const) {
    const r = bangunRencanaTemplat({ adm4: "31.71.01.1001", profil: { ...anon, bahaya: [...bahaya] }, kb: SEMUA_CHUNK });
    assert.deepEqual(sanitasiRencana(salin(r)), salin(r));
  }
});

t("rencana: butir rusak dibuang satu per satu, kolom keterangan yang hilang diisi bawaan", () => {
  const r = salin(bangunRencanaTemplat({ adm4: "x", profil: anonimkan(lengkap), kb: SEMUA_CHUNK })) as unknown as Record<string, unknown>;
  const tindakan = r.tindakan as unknown[];
  const tas = r.tas as unknown[];
  const rusak = { ...r, tindakan: [...tindakan, { actionId: 5 }], tas: [...tas, "x"], perluDiperbarui: undefined, faktorKerentanan: "x" };
  const b = sanitasiRencana<Record<string, unknown>>(rusak);
  assert.ok(b);
  assert.equal((b.tindakan as unknown[]).length, tindakan.length);
  assert.equal((b.tas as unknown[]).length, tas.length);
  assert.equal(b.perluDiperbarui, false);
  assert.deepEqual(b.faktorKerentanan, []);
});

t("rencana tanpa daftar tindakan, mode tak dikenal, atau bukan objek -> null", () => {
  const r = salin(bangunRencanaTemplat({ adm4: "x", profil: anonimkan(lengkap), kb: SEMUA_CHUNK }));
  assert.equal(sanitasiRencana({ ...r, tindakan: "bukan-array" }), null);
  assert.equal(sanitasiRencana({ ...r, tindakan: [] }), null);
  assert.equal(sanitasiRencana({ ...r, mode: "lain" }), null);
  assert.equal(sanitasiRencana(null), null);
});

console.log(`\n${ok}/6 lulus`);
