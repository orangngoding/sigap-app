// Pesan galat geolokasi: alamat tidak aman, izin diblokir, izin belum diberikan, waktu habis.
import assert from "node:assert/strict";
import { PESAN_TIDAK_AMAN, pesanGalatLokasi } from "@/lib/geo/galat-lokasi";

let lulus = 0; const gagal: string[] = [];
const uji = async (nama: string, fn: () => Promise<void>) => { try { await fn(); lulus++; console.log("OK   ", nama); } catch (e) { gagal.push(nama); console.log("GAGAL", nama, "->", (e as Error).message.split("\n")[0]); } };

const galat = (code: number) => ({ code, message: "", PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 }) as unknown as GeolocationPositionError;
const siapkan = (aman: boolean, izin: string | "galat") => {
  const g = globalThis as unknown as Record<string, unknown>;
  g.window = { isSecureContext: aman };
  // `navigator` di Node 21+ adalah getter; ganti lewat defineProperty.
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { permissions: { query: async () => { if (izin === "galat") throw new Error("tidak ada"); return { state: izin }; } } } });
};

(async () => {
  await uji("alamat tidak aman: pesan khusus, bukan 'izin ditolak', walau kodenya PERMISSION_DENIED", async () => {
    siapkan(false, "granted");
    const p = await pesanGalatLokasi(galat(1), "Pilih manual.");
    assert.ok(p.startsWith(PESAN_TIDAK_AMAN) && p.endsWith("Pilih manual.") && !/diblokir|belum diberikan/.test(p));
  });
  await uji("izin diblokir: ada petunjuk gembok", async () => {
    siapkan(true, "denied");
    assert.match(await pesanGalatLokasi(galat(1)), /diblokir.*gembok/);
  });
  await uji("izin belum diberikan (prompt) dan Permissions API tidak tersedia", async () => {
    siapkan(true, "prompt");
    assert.match(await pesanGalatLokasi(galat(1)), /belum diberikan/);
    siapkan(true, "galat");
    assert.match(await pesanGalatLokasi(galat(1)), /belum diberikan/);
  });
  await uji("waktu habis dan posisi tak tersedia", async () => {
    siapkan(true, "granted");
    assert.match(await pesanGalatLokasi(galat(3)), /terlalu lama/);
    assert.match(await pesanGalatLokasi(galat(2)), /belum dapat ditentukan/);
  });
  console.log(`\n${lulus} lulus, ${gagal.length} gagal`);
  process.exit(gagal.length ? 1 : 0);
})();
