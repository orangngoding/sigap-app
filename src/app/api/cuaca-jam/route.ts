import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, errorResponse } from "@/lib/http/api-error";
import { enforceRateLimit } from "@/lib/ratelimit/ratelimit";
import { ambilCuacaJam } from "@/lib/data/ambil";
import { ZONA } from "@/lib/data/cuaca-jam";

const Query = z.object({
  lat: z.coerce.number().min(-12).max(7),
  lon: z.coerce.number().min(94).max(142),
  zona: z.enum(ZONA).default("Asia/Jakarta"),
});

/** Cuaca per jam 3 hari untuk titik kelurahan (melengkapi prakiraan resmi BMKG per 3 jam). */
export async function GET(req: Request) {
  const started = Date.now();
  try {
    enforceRateLimit(req, "cuaca-jam", 20, 60_000);
    const sp = new URL(req.url).searchParams;
    const q = Query.safeParse({ lat: sp.get("lat"), lon: sp.get("lon"), zona: sp.get("zona") ?? undefined });
    if (!q.success) throw new ApiError("MASUKAN_TIDAK_VALID");
    const data = await ambilCuacaJam(q.data.lat, q.data.lon, q.data.zona);
    return NextResponse.json(data);
  } catch (err) {
    return errorResponse(err, "/api/cuaca-jam", started);
  }
}
