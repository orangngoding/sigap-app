import { NextResponse } from "next/server";
import { ApiError, errorResponse } from "@/lib/http/api-error";
import { cachedWithStale } from "@/lib/http/server-cache";
import { enforceRateLimit } from "@/lib/ratelimit/ratelimit";
import { ADM4_PATTERN, fetchCuaca } from "@/lib/data/cuaca";

export async function GET(req: Request) {
  const started = Date.now();
  try {
    enforceRateLimit(req, "cuaca");
    const adm4 = new URL(req.url).searchParams.get("adm4") ?? "";
    if (!ADM4_PATTERN.test(adm4)) throw new ApiError("ADM4_TIDAK_VALID");

    const data = await cachedWithStale(`cuaca:${adm4}`, 10 * 60_000, () => fetchCuaca(adm4));
    return NextResponse.json(data);
  } catch (err) {
    return errorResponse(err, "/api/cuaca", started);
  }
}
