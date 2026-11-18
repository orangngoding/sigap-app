import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, errorResponse } from "@/lib/http/api-error";
import { enforceRateLimit } from "@/lib/ratelimit/ratelimit";
import { ambilGempa } from "@/lib/data/ambil";

const Query = z.object({
  lat: z.coerce.number().min(-12).max(7).optional(), // sekitar wilayah Indonesia
  lon: z.coerce.number().min(94).max(142).optional(),
});

export async function GET(req: Request) {
  const started = Date.now();
  try {
    enforceRateLimit(req, "gempa");
    const sp = new URL(req.url).searchParams;
    const parsed = Query.safeParse({
      lat: sp.get("lat") ?? undefined,
      lon: sp.get("lon") ?? undefined,
    });
    if (!parsed.success) throw new ApiError("MASUKAN_TIDAK_VALID");
    const { lat, lon } = parsed.data;
    const ref = lat !== undefined && lon !== undefined ? { lat, lon } : undefined;

    const data = await ambilGempa(ref);
    return NextResponse.json(data);
  } catch (err) {
    return errorResponse(err, "/api/gempa", started);
  }
}
