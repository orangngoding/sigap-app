import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, errorResponse } from "@/lib/http/api-error";
import { cachedWithStale } from "@/lib/http/server-cache";
import { enforceRateLimit } from "@/lib/ratelimit/ratelimit";
import { fetchIklim, snapGrid } from "@/lib/data/iklim";

const Query = z.object({
  lat: z.coerce.number().min(-12).max(7),
  lon: z.coerce.number().min(94).max(142),
});

export async function GET(req: Request) {
  const started = Date.now();
  try {
    enforceRateLimit(req, "iklim");
    const sp = new URL(req.url).searchParams;
    const parsed = Query.safeParse({ lat: sp.get("lat"), lon: sp.get("lon") });
    if (!parsed.success) throw new ApiError("MASUKAN_TIDAK_VALID");
    const { lat, lon } = parsed.data;

    // Kunci cache = grid 0,25° sehingga lokasi berdekatan berbagi hasil (hemat batas Open-Meteo)
    const key = `iklim:${snapGrid(lat)}:${snapGrid(lon)}`;
    const data = await cachedWithStale(key, 7 * 24 * 3600_000, () => fetchIklim(lat, lon));
    return NextResponse.json(data);
  } catch (err) {
    return errorResponse(err, "/api/iklim", started);
  }
}
