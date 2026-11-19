import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http/api-error";
import { enforceRateLimit } from "@/lib/ratelimit/ratelimit";
import { ambilBerita } from "@/lib/data/ambil";

export async function GET(req: Request) {
  const started = Date.now();
  try {
    enforceRateLimit(req, "berita");
    return NextResponse.json(await ambilBerita());
  } catch (err) {
    return errorResponse(err, "/api/berita", started);
  }
}
