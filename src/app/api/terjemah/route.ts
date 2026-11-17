import { NextResponse } from "next/server";
import { ApiError, errorResponse } from "@/lib/http/api-error";
import { bacaJson } from "@/lib/http/post-json";
import { enforceRateLimit } from "@/lib/ratelimit/ratelimit";
import { TerjemahRequest } from "@/lib/ai/schema";
import { terjemahkanPeringatan } from "@/lib/ai/terjemah";
import { penyediaDariEnv } from "@/lib/ai/provider";

export const maxDuration = 30;

export async function POST(req: Request) {
  const started = Date.now();
  try {
    enforceRateLimit(req, "terjemah", 6, 60_000);
    const p = TerjemahRequest.safeParse(await bacaJson(req, 8_000));
    if (!p.success) throw new ApiError("MASUKAN_TIDAK_VALID");
    const hasil = await terjemahkanPeringatan(p.data.teksPeringatan, p.data.profil, { providers: penyediaDariEnv() });
    console.info(JSON.stringify({ route: "/api/terjemah", status: 200, ms: Date.now() - started, mode: hasil.mode }));
    return NextResponse.json(hasil);
  } catch (err) {
    return errorResponse(err, "/api/terjemah", started);
  }
}
