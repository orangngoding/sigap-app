// Jalankan: npx tsx tests/unit/pwa.test.ts (fitur pasang & deteksi platform PWA)
import assert from "node:assert/strict";
import { deteksiPlatform, cekStandalone } from "@/hooks/use-pasang-pwa";

let ok = 0;
const tests: Array<[string, () => void]> = [];
const t = (n: string, f: () => void) => tests.push([n, f]);

t("deteksiPlatform: Android dikenali dengan tepat", () => {
  const uaAndroid = "Mozilla/5.0 (Linux; Android 13; SM-S901B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36";
  assert.equal(deteksiPlatform(uaAndroid, "Linux armv8l", 5), "android");
});

t("deteksiPlatform: iPhone Safari dikenali sebagai ios", () => {
  const uaIphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1";
  assert.equal(deteksiPlatform(uaIphone, "iPhone", 5), "ios");
});

t("deteksiPlatform: iPad di iOS 13+ (MacIntel + maxTouchPoints > 1) dikenali sebagai ios", () => {
  const uaIpad = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15";
  assert.equal(deteksiPlatform(uaIpad, "MacIntel", 5), "ios");
});

t("deteksiPlatform: Desktop Mac tanpa sentuh dikenali sebagai desktop", () => {
  const uaMac = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36";
  assert.equal(deteksiPlatform(uaMac, "MacIntel", 0), "desktop");
});

t("deteksiPlatform: Desktop Windows dikenali sebagai desktop", () => {
  const uaWin = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36";
  assert.equal(deteksiPlatform(uaWin, "Win32", 0), "desktop");
});

t("cekStandalone: bernilai false di lingkungan non-browser (SSR/Node)", () => {
  assert.equal(cekStandalone(), false);
});

for (const [n, f] of tests) {
  try { f(); ok++; console.log("  ok  ", n); } catch (e) { console.error("  GAGAL", n, "\n", e); process.exitCode = 1; }
}
console.log(`${ok}/${tests.length} lulus`);
