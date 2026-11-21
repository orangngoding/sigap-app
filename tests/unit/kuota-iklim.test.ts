// Jalankan: npx tsx tests/unit/kuota-iklim.test.ts  (penanganan kuota penyedia data: galat 429 -> 503, grid 0,5°, kota bawaan)
import assert from "node:assert/strict";
import { ApiError, errorResponse } from "@/lib/http/api-error";
import { fetchUpstreamJson } from "@/lib/http/fetch-upstream";
import { snapGrid, snapKasar } from "@/lib/data/iklim-math";
import { hitungProyeksi, type ProyeksiResponse } from "@/lib/data/proyeksi";
import { JARAK_CADANGAN_KM, JARAK_LANGSUNG_KM, KOTA_PRIORITAS, cariKotaTerdekat, dariKota, pilihProyeksi, type ProyeksiKota } from "@/lib/data/iklim-kota";

let ok = 0;
const tests: Array<[string, () => void | Promise<void>]> = [];
const t = (n: string, f: () => void | Promise<void>) => tests.push([n, f]);

/** Respons proyeksi sintetis (pemanasan tetap) untuk menguji pemilihan sumber. */
function proyeksiContoh(): ProyeksiResponse {
  const time: string[] = [];
  const a: number[] = [];
  const b: number[] = [];
  const h: number[] = [];
  for (let d = Date.UTC(1991, 0, 1); d <= Date.UTC(2050, 11, 31); d += 86_400_000) {
    const tgl = new Date(d);
    time.push(tgl.toISOString().slice(0, 10));
    const v = 31 + 0.03 * (tgl.getUTCFullYear() - 1991) + (tgl.getUTCDate() % 5) / 5;
    a.push(v);
    b.push(v - 0.3);
    h.push(tgl.getUTCDate() % 3 === 0 ? 9 : 0.2);
  }
  return hitungProyeksi({ daily: { time, temperature_2m_max_EC_Earth3P_HR: a, temperature_2m_max_MRI_AGCM3_2_S: b, precipitation_sum_EC_Earth3P_HR: h, precipitation_sum_MRI_AGCM3_2_S: h } }, -6.2, 106.85);
}
const DATA = proyeksiContoh();
const JAKARTA: ProyeksiKota = { nama: "Jakarta", lat: -6.2, lon: 106.85, data: DATA };
const SURABAYA: ProyeksiKota = { nama: "Surabaya", lat: -7.25, lon: 112.75, data: DATA };
const DAFTAR = [JAKARTA, SURABAYA];
const gagal = (kode: ConstructorParameters<typeof ApiError>[0]) => async (): Promise<ProyeksiResponse> => { throw new ApiError(kode); };
const langsungOk = async () => ({ ...DATA, stale: false });

t("grid proyeksi 0,5°: lokasi berdekatan jatuh ke sel yang sama; grid cuaca tetap 0,25°", () => {
  assert.equal(snapKasar(-6.25), -6);
  assert.equal(snapKasar(106.87), 107);
  assert.equal(snapKasar(-6.7), -6.5);
  assert.equal(snapKasar(106.6), 106.5);
  // Titik-titik di dalam satu sel 0,5° (batas sel ada di ±0,25°) memakai satu permintaan dan satu cache.
  const sel = new Set([[-6.1, 106.85], [-5.9, 107.0], [-6.2, 107.1], [-6.0, 106.8]].map(([la, lo]) => `${snapKasar(la)},${snapKasar(lo)}`));
  assert.equal(sel.size, 1);
  assert.equal([...sel][0], "-6,107");
  // Dengan grid 0,25° lama, titik yang sama tersebar ke beberapa permintaan.
  assert.ok(new Set([[-6.1, 106.85], [-5.9, 107.0], [-6.2, 107.1], [-6.0, 106.8]].map(([la, lo]) => `${snapGrid(la)},${snapGrid(lo)}`)).size > 1);
  assert.equal(snapGrid(-6.3), -6.25);
});

t("kota terdekat dan jarak: Bekasi ke Jakarta sekitar 20 km, bukan Surabaya", () => {
  const r = cariKotaTerdekat(DAFTAR, -6.24, 106.99);
  assert.equal(r?.kota.nama, "Jakarta");
  assert.ok(r && r.km > 10 && r.km < 30, String(r?.km));
  assert.equal(cariKotaTerdekat([], 0, 100), null);
});

t("dalam jarak langsung: data bawaan dipakai TANPA menghubungi penyedia, diberi label kota-terdekat", async () => {
  let dipanggil = 0;
  const r = await pilihProyeksi(DAFTAR, -6.24, 106.99, async () => { dipanggil++; return DATA; });
  assert.equal(dipanggil, 0);
  assert.equal(r.perkiraan?.kota, "Jakarta");
  assert.equal(r.perkiraan?.alasan, "kota-terdekat");
  assert.ok((r.perkiraan?.km ?? 99) <= JARAK_LANGSUNG_KM);
  assert.deepEqual(r.periode, DATA.periode);
});

t("di luar jarak langsung: dihitung langsung dan tanpa label perkiraan", async () => {
  const r = await pilihProyeksi(DAFTAR, -6.6, 106.8, langsungOk); // Bogor, sekitar 45 km dari Jakarta
  assert.equal(r.perkiraan, undefined);
});

t("penyedia menolak (kuota): kota bawaan yang cukup dekat jadi cadangan berlabel; terlalu jauh = galat diteruskan", async () => {
  const r = await pilihProyeksi(DAFTAR, -6.6, 106.8, gagal("BATAS_HULU"));
  assert.equal(r.perkiraan?.alasan, "cadangan-kuota");
  assert.equal(r.perkiraan?.kota, "Jakarta");
  assert.ok((r.perkiraan?.km ?? 0) > JARAK_LANGSUNG_KM && (r.perkiraan?.km ?? 999) <= JARAK_CADANGAN_KM);
  await assert.rejects(() => pilihProyeksi(DAFTAR, -2.5, 140.7, gagal("BATAS_HULU")), (e: unknown) => e instanceof ApiError && e.code === "BATAS_HULU"); // Jayapura: jauh dari kota bawaan
  await assert.rejects(() => pilihProyeksi([], -6.6, 106.8, gagal("SUMBER_GAGAL")), (e: unknown) => e instanceof ApiError && e.code === "SUMBER_GAGAL");
});

t("data kota bawaan tidak mengubah data aslinya dan selalu stale:false", () => {
  const asli = JSON.stringify(DATA);
  const d = dariKota(JAKARTA, 12.4, "kota-terdekat");
  assert.equal(d.perkiraan?.km, 12);
  assert.equal(d.stale, false);
  assert.equal(JSON.stringify(DATA), asli);
});

t("daftar prioritas: nama unik, koordinat di Indonesia, tersebar luas", () => {
  assert.equal(new Set(KOTA_PRIORITAS.map((k) => k.nama)).size, KOTA_PRIORITAS.length);
  for (const k of KOTA_PRIORITAS) assert.ok(k.lat > -11.5 && k.lat < 6.5 && k.lon > 95 && k.lon < 141.5, k.nama);
  assert.ok(KOTA_PRIORITAS.length >= 25);
  assert.ok(KOTA_PRIORITAS.slice(0, 7).some((k) => k.nama === "Jayapura") && KOTA_PRIORITAS.slice(0, 7).some((k) => k.nama === "Kupang")); // wilayah iklim berbeda lebih dulu
});

t("galat hulu: 429 = BATAS_HULU (tidak diulang), 4xx lain = SUMBER_GAGAL; dan responsnya 503 + Retry-After", async () => {
  const asli = globalThis.fetch;
  let panggilan = 0;
  try {
    globalThis.fetch = (async () => { panggilan++; return new Response("{}", { status: 429 }); }) as typeof fetch;
    await assert.rejects(() => fetchUpstreamJson("https://api.open-meteo.com/v1/forecast?x=1"), (e: unknown) => e instanceof ApiError && e.code === "BATAS_HULU");
    assert.equal(panggilan, 1); // tidak diulang: mengulang kuota yang habis hanya memperburuk
    globalThis.fetch = (async () => new Response("{}", { status: 404 })) as typeof fetch;
    await assert.rejects(() => fetchUpstreamJson("https://api.open-meteo.com/v1/forecast?x=1"), (e: unknown) => e instanceof ApiError && e.code === "SUMBER_GAGAL");
  } finally {
    globalThis.fetch = asli;
  }
  const res = errorResponse(new ApiError("BATAS_HULU"), "/api/x");
  assert.equal(res.status, 503);
  assert.equal(res.headers.get("Retry-After"), "3600");
  const badan = (await res.json()) as { error: { code: string; retryable: boolean } };
  assert.equal(badan.error.code, "BATAS_HULU");
  assert.equal(badan.error.retryable, false);
});

(async () => {
  for (const [n, f] of tests) {
    try { await f(); ok++; console.log("  ok  ", n); } catch (e) { console.error("  GAGAL", n, "\n", e); process.exitCode = 1; }
  }
  console.log(`${ok}/${tests.length} lulus`);
})();
