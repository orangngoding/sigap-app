import { ApiError } from "@/lib/http/api-error";

// Pembatas laju per IP di memori (upaya terbaik pada serverless — Blueprint 13.1).
const hits = new Map<string, number[]>();

export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  return xff?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "anon";
}

/** Lempar ApiError(BATAS_LAJU) bila melebihi `limit` permintaan dalam `windowMs`. */
export function enforceRateLimit(req: Request, route: string, limit = 60, windowMs = 60_000) {
  const key = `${route}:${clientIp(req)}`;
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    throw new ApiError("BATAS_LAJU");
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear(); // jaga memori
}
