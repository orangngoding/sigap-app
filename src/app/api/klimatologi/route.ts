import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, errorResponse } from "@/lib/http/api-error";
import { enforceRateLimit } from "@/lib/ratelimit/ratelimit";
import { ambilKlimatologi } from "@/lib/data/ambil";

// Permintaan pertama untuk sebuah grid mengambil 30 tahun data harian ERA5 (beberapa detik); setelah itu di-cache 30 hari.
export const maxDuration = 60;

const Query = z.object({
  lat: z.coerce.number().min(-12).max(7),
  lon: z.coerce.number().min(94).max(142),
});

/** Siaga Iklim, tab Musim ini: pola bulanan iklim saat ini dari pengamatan ERA5 1991-2020 untuk satu lokasi. */
export async function GET(req: Request) {
  const started = Date.now();
  try {
    enforceRateLimit(req, "klimatologi", 10, 60_000);
    const sp = new URL(req.url).searchParams;
    const q = Query.safeParse({ lat: sp.get("lat"), lon: sp.get("lon") });
    if (!q.success) throw new ApiError("MASUKAN_TIDAK_VALID");
    const data = await ambilKlimatologi(q.data.lat, q.data.lon);
    console.info(JSON.stringify({ route: "/api/klimatologi", status: 200, ms: Date.now() - started }));
    return NextResponse.json(data);
  } catch (err) {
    return errorResponse(err, "/api/klimatologi", started);
  }
}
