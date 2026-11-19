import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, errorResponse } from "@/lib/http/api-error";
import { enforceRateLimit } from "@/lib/ratelimit/ratelimit";
import { ambilProyeksi } from "@/lib/data/ambil";

// Permintaan pertama untuk sebuah grid bisa memakan 15-25 detik (data harian 60 tahun, dua model).
export const maxDuration = 60;

const Query = z.object({
  lat: z.coerce.number().min(-12).max(7),
  lon: z.coerce.number().min(94).max(142),
});

/** Siaga Iklim: metrik proyeksi iklim (tahunan dan per bulan) 1990-an, saat ini (2011-2030), dan 2031-2050 untuk satu lokasi. */
export async function GET(req: Request) {
  const started = Date.now();
  try {
    enforceRateLimit(req, "proyeksi", 6, 60_000);
    const sp = new URL(req.url).searchParams;
    const q = Query.safeParse({ lat: sp.get("lat"), lon: sp.get("lon") });
    if (!q.success) throw new ApiError("MASUKAN_TIDAK_VALID");
    const data = await ambilProyeksi(q.data.lat, q.data.lon);
    console.info(JSON.stringify({ route: "/api/proyeksi", status: 200, ms: Date.now() - started }));
    return NextResponse.json(data);
  } catch (err) {
    return errorResponse(err, "/api/proyeksi", started);
  }
}
