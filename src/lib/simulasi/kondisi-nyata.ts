// Kondisi nyata minggu ini untuk Simulator Bencana AI (server). Simulasi dibuka dari prakiraan dan sinyal SUNGGUHAN
// di lokasi pengguna (Siaga Iklim "Minggu ini": hujan, kering, cuaca mudah terbakar, panas, udara) dan status El Niño
// atau La Niña, sehingga yang dilatih adalah kemungkinan nyata minggu ini, bukan cerita umum. Koordinat hanya dipakai
// untuk mengambil data di server; yang diteruskan ke AI hanya kalimat fakta (tanggal dan angka dari data).
import type { HazardId } from "@/types";
import { ambilKondisiGlobal, ambilPrakiraanPekan, ambilTitikPanas } from "@/lib/data/ambil";
import { hitungSiagaPekan, rentangTanggal, type JenisSinyal } from "@/lib/iklim/pekan";
import { teksEnso } from "@/lib/data/iklim-global";

/** Sinyal mingguan yang relevan untuk tiap bahaya simulasi. */
export const SINYAL_UNTUK: Record<HazardId, JenisSinyal[]> = {
  banjir: ["hujan"],
  longsor: ["hujan"],
  gelombang_abrasi: ["hujan"],
  cuaca_ekstrem: ["hujan", "panas"],
  kekeringan: ["kering", "panas"],
  karhutla: ["api", "kering", "udara"],
  gempa: [],
  tsunami: [],
  gunung_api: ["hujan"], // hujan lebat di lereng gunung api memicu lahar
};
/** Arah pengaruh El Niño/La Niña yang relevan untuk tiap bahaya (El Niño = kering, La Niña = basah). */
const PENGARUH_RELEVAN: Partial<Record<HazardId, "kering" | "basah">> = { banjir: "basah", longsor: "basah", cuaca_ekstrem: "basah", gelombang_abrasi: "basah", kekeringan: "kering", karhutla: "kering" };

/**
 * Kalimat fakta kondisi nyata untuk prompt (null bila tidak ada yang relevan atau data gagal). Batas waktu 6 detik:
 * simulasi tidak menunggu data yang lambat.
 */
export async function teksKondisiNyata(hazard: HazardId, lat: number, lon: number, provinsi: string, now = new Date()): Promise<string | null> {
  const kerja = (async () => {
    const [raw, global, panas] = await Promise.all([
      ambilPrakiraanPekan(lat, lon).catch(() => null),
      ambilKondisiGlobal().catch(() => null),
      ambilTitikPanas(lat, lon).catch(() => null),
    ]);
    const baris: string[] = [];
    if (raw) {
      const s = hitungSiagaPekan(raw.prakiraan, raw.udara, { lat: raw.lat, lon: raw.lon, provinsi, global, titikPanas: panas, now });
      for (const x of s.sinyal.filter((x) => SINYAL_UNTUK[hazard].includes(x.jenis)).slice(0, 2)) {
        baris.push(`- [${x.tingkat}] ${x.judul}: ${x.fakta} (${rentangTanggal(x.tanggal)})`);
      }
      if (hazard === "kekeringan" && s.keringKini > 0) baris.push(`- Sudah ${s.keringKini} hari tanpa hujan berarti sampai kemarin; hujan 30 hari terakhir ${s.hujan30Mm} mm.`);
    }
    if (global && PENGARUH_RELEVAN[hazard] && global.pengaruh === PENGARUH_RELEVAN[hazard]) baris.push(`- Kondisi iklim global: ${teksEnso(global.enso)}. ${global.dampak[0] ?? ""}`.trim());
    return baris.length ? baris.join("\n") : null;
  })();
  const batas = new Promise<null>((r) => setTimeout(() => r(null), 6_000));
  return Promise.race([kerja, batas]).catch(() => null);
}
