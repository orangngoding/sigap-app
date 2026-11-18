import { NextResponse } from "next/server";
import { ApiError, errorResponse } from "@/lib/http/api-error";
import { bacaJson } from "@/lib/http/post-json";
import { enforceRateLimit } from "@/lib/ratelimit/ratelimit";
import { AdaptasiRequest } from "@/lib/ai/schema";
import { cacheAdaptasi, susunAdaptasi } from "@/lib/ai/adaptasi";
import { penyediaDariEnv } from "@/lib/ai/provider";
import { ambilProyeksi } from "@/lib/data/ambil";

export const maxDuration = 60;

/** Rencana adaptasi keluarga dari proyeksi iklim lokasi (proyeksi diambil dari cache server yang sama). */
export async function POST(req: Request) {
  const started = Date.now();
  try {
    enforceRateLimit(req, "adaptasi", 6, 60_000);
    const p = AdaptasiRequest.safeParse(await bacaJson(req, 4_000));
    if (!p.success) throw new ApiError("MASUKAN_TIDAK_VALID");
    const { lokasi, bahaya, konteks } = p.data;
    const proyeksi = await ambilProyeksi(lokasi.lat, lokasi.lon);
    const hasil = await susunAdaptasi(proyeksi, { kabKota: lokasi.kabKota, provinsi: lokasi.provinsi }, { ...konteks, bahaya }, { providers: penyediaDariEnv(), cache: cacheAdaptasi, bahaya });
    console.info(JSON.stringify({ route: "/api/adaptasi", status: 200, ms: Date.now() - started, mode: hasil.mode }));
    return NextResponse.json(hasil);
  } catch (err) {
    return errorResponse(err, "/api/adaptasi", started);
  }
}
