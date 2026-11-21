import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, errorResponse } from "@/lib/http/api-error";
import { enforceRateLimit } from "@/lib/ratelimit/ratelimit";
import { ambilIklimTahunan } from "@/lib/data/ambil";

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

    // Cache per grid 0,25° (ERA5); bila Open-Meteo penuh, cadangan NASA POWER dengan definisi yang sama.
    const data = await ambilIklimTahunan(lat, lon);
    return NextResponse.json(data);
  } catch (err) {
    return errorResponse(err, "/api/iklim", started);
  }
}
