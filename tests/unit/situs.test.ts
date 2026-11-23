// URL situs untuk QR Kartu Siaga dan metadata: selalu https dan domain produksi.
import assert from "node:assert/strict";
import { URL_PRODUKSI, rapikanUrlSitus } from "@/lib/situs";

let ok = 0;
function t(nama: string, fn: () => void) {
  try { fn(); ok++; console.log("  ok  ", nama); } catch (e) { console.error("  GAGAL", nama, "\n", e); process.exitCode = 1; }
}

t("domain lama atau pratinjau Vercel -> domain produksi https", () => {
  assert.equal(rapikanUrlSitus("http://sigap-app.vercel.app"), URL_PRODUKSI);
  assert.equal(rapikanUrlSitus("sigap-app-git-main-tim.vercel.app/"), URL_PRODUKSI);
  assert.equal(rapikanUrlSitus("http://sigap-app-itrush.vercel.app/"), URL_PRODUKSI);
});

t("domain lain dipaksa https tanpa garis miring akhir; localhost tetap http", () => {
  assert.equal(rapikanUrlSitus("http://sigap.id/"), "https://sigap.id");
  assert.equal(rapikanUrlSitus("http://localhost:3000"), "http://localhost:3000");
});

t("kosong atau tidak sah -> null", () => {
  assert.equal(rapikanUrlSitus(undefined), null);
  assert.equal(rapikanUrlSitus("  "), null);
  assert.equal(rapikanUrlSitus("http://"), null);
});

console.log(`\n${ok}/3 lulus`);
