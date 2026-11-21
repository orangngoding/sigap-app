import { NextResponse } from "next/server";
import { ApiError, errorResponse } from "@/lib/http/api-error";
import { bacaJson } from "@/lib/http/post-json";
import { enforceRateLimit } from "@/lib/ratelimit/ratelimit";
import { SimulasiRequest } from "@/lib/ai/schema";
import { susunSimulasi } from "@/lib/ai/simulasi";
import { penyediaDariEnv } from "@/lib/ai/provider";
import { isHazardAktif } from "@/lib/hazards/pack-status";
import { skenarioUntuk } from "@/lib/latihan/mesin";
import { SEMUA_CHUNK } from "@/lib/kb/data";
import { teksKondisiNyata } from "@/lib/simulasi/kondisi-nyata";

// Satu simulasi = satu panggilan model yang cukup panjang (5 langkah x 3 pilihan + umpan balik), dengan satu
// percobaan perbaikan bila validasi menolak. Batas server 28 detik; cadangan skenario tim selalu tersedia.
export const maxDuration = 45;

/** Simulator Bencana AI: skenario keputusan yang dipersonalisasi untuk keluarga, lokasi, dan konsep yang terlewat. */
export async function POST(req: Request) {
  const started = Date.now();
  try {
    enforceRateLimit(req, "simulasi-menit", 4, 60_000);
    enforceRateLimit(req, "simulasi-jam", 15, 3_600_000);
    const p = SimulasiRequest.safeParse(await bacaJson(req, 12_000));
    if (!p.success) throw new ApiError(p.error.issues.some((i) => i.path[0] === "profil") ? "PROFIL_TIDAK_VALID" : "MASUKAN_TIDAK_VALID");
    if (!isHazardAktif(p.data.hazard) || !skenarioUntuk(p.data.hazard)) throw new ApiError("BAHAYA_TIDAK_AKTIF");
    const hasil = await susunSimulasi(p.data, {
      kb: SEMUA_CHUNK,
      providers: penyediaDariEnv(),
      // Prakiraan nyata minggu ini di lokasi: koordinat hanya dipakai di server untuk mengambil data.
      kondisiNyata: (m) => (m.titik ? teksKondisiNyata(m.hazard, m.titik.lat, m.titik.lon, m.lokasi.provinsi) : Promise.resolve(null)),
    });
    console.info(JSON.stringify({ route: "/api/simulasi", status: 200, ms: Date.now() - started, mode: hasil.mode, cache: hasil.meta.cache, alasan: hasil.meta.alasanCadangan, ditolak: hasil.meta.ditolak, hazard: p.data.hazard, tingkat: p.data.tingkat, fokus: p.data.fokus.length, nyata: hasil.personalisasi.includes("Dibuka dari prakiraan nyata minggu ini") }));
    return NextResponse.json(hasil);
  } catch (err) {
    return errorResponse(err, "/api/simulasi", started);
  }
}
