import { NextResponse } from "next/server";
import { ApiError, errorResponse } from "@/lib/http/api-error";
import { bacaJson } from "@/lib/http/post-json";
import { enforceRateLimit } from "@/lib/ratelimit/ratelimit";
import { KeputusanIklimRequest } from "@/lib/ai/schema";
import { cacheKeputusan, susunKeputusan } from "@/lib/ai/keputusan-iklim";
import { penyediaDariEnv } from "@/lib/ai/provider";
import { ambilProyeksi } from "@/lib/data/ambil";

export const maxDuration = 60;

/** Siaga Iklim, Penasihat Keputusan: proyeksi diambil dari cache server; uji dan efek dihitung ulang di server. */
export async function POST(req: Request) {
  const started = Date.now();
  try {
    enforceRateLimit(req, "keputusan-iklim", 6, 60_000);
    const p = KeputusanIklimRequest.safeParse(await bacaJson(req, 4_000));
    if (!p.success) throw new ApiError("MASUKAN_TIDAK_VALID");
    const { lokasi, rumah, kendala } = p.data;
    const proyeksi = await ambilProyeksi(lokasi.lat, lokasi.lon);
    const hasil = await susunKeputusan(proyeksi, { kabKota: lokasi.kabKota, provinsi: lokasi.provinsi }, rumah, kendala, { providers: penyediaDariEnv(), cache: cacheKeputusan });
    console.info(JSON.stringify({ route: "/api/keputusan-iklim", status: 200, ms: Date.now() - started, mode: hasil.mode }));
    return NextResponse.json(hasil);
  } catch (err) {
    return errorResponse(err, "/api/keputusan-iklim", started);
  }
}
