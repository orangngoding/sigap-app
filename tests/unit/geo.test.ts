import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { kabKotaTerdekat, type KabKotaRingkas } from "@/lib/geo/terdekat";

let lulus = 0; const gagal: string[] = [];
const uji = (nama: string, fn: () => void) => { try { fn(); lulus++; console.log("OK   ", nama); } catch (e) { gagal.push(nama); console.log("GAGAL", nama, "->", (e as Error).message.split("\n")[0]); } };

const daftar = JSON.parse(readFileSync("public/data/wilayah/kabkota.json", "utf8")) as KabKotaRingkas[];
const di = (lat: number, lon: number) => kabKotaTerdekat(lat, lon, daftar)?.kabKota.nama;

uji("wilayah: 514 kab/kota, kode unik, koordinat di Indonesia", () => {
  assert.equal(daftar.length, 514);
  assert.equal(new Set(daftar.map((k) => k.kode)).size, 514);
  for (const k of daftar) assert.ok(k.lat > -12 && k.lat < 7 && k.lon > 94 && k.lon < 142, k.nama);
});
uji("terdekat: Monas -> Jakarta Pusat", () => assert.match(di(-6.1754, 106.8272) ?? "", /Jakarta Pusat/));
uji("terdekat: Malioboro -> Yogyakarta", () => assert.match(di(-7.7926, 110.3658) ?? "", /Yogyakarta/));
uji("terdekat: di luar Indonesia (Tokyo) -> null", () => assert.equal(kabKotaTerdekat(35.68, 139.69, daftar), null));
uji("terdekat: daftar kosong -> null", () => assert.equal(kabKotaTerdekat(-6, 106, []), null));

console.log(`\n${lulus} lulus, ${gagal.length} gagal`);
process.exit(gagal.length ? 1 : 0);
