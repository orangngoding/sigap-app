import { NextResponse } from "next/server";
import { ApiError, errorResponse } from "@/lib/http/api-error";
import { enforceRateLimit } from "@/lib/ratelimit/ratelimit";
import { ADM4_PATTERN } from "@/lib/data/cuaca";
import { ambilCuaca } from "@/lib/data/ambil";

export async function GET(req: Request) {
  const started = Date.now();
  try {
    enforceRateLimit(req, "cuaca");
    const adm4 = new URL(req.url).searchParams.get("adm4") ?? "";
    if (!ADM4_PATTERN.test(adm4)) throw new ApiError("ADM4_TIDAK_VALID");

    const data = await ambilCuaca(adm4);
    return NextResponse.json(data);
  } catch (err) {
    return errorResponse(err, "/api/cuaca", started);
  }
}
