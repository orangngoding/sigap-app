import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, errorResponse } from "@/lib/http/api-error";
import { enforceRateLimit } from "@/lib/ratelimit/ratelimit";
import { ambilRisikoLokasi } from "@/lib/risiko/ambil";

export const maxDuration = 30;

const Query = z.object({
  lat: z.coerce.number().min(-12).max(7),
  lon: z.coerce.number().min(94).max(142),
  provinsi: z.string().trim().min(2).max(60).regex(/^[\p{L} .'-]+$/u),
});

/** Profil Risiko Lokasi: 9 bahaya dinilai dari data terbuka (gunung api, gempa, tsunami, pantai, lereng, iklim, titik panas). */
export async function GET(req: Request) {
  const started = Date.now();
  try {
    enforceRateLimit(req, "risiko-lokasi", 10, 60_000);
    const sp = new URL(req.url).searchParams;
    const q = Query.safeParse({ lat: sp.get("lat"), lon: sp.get("lon"), provinsi: sp.get("provinsi") });
    if (!q.success) throw new ApiError("MASUKAN_TIDAK_VALID");
    const data = await ambilRisikoLokasi(q.data.lat, q.data.lon, q.data.provinsi);
    console.info(JSON.stringify({ route: "/api/risiko-lokasi", status: 200, ms: Date.now() - started }));
    return NextResponse.json(data, { headers: { "Cache-Control": "private, max-age=3600" } });
  } catch (err) {
    return errorResponse(err, "/api/risiko-lokasi", started);
  }
}
