import { NextResponse } from "next/server";
import { ApiError, errorResponse } from "@/lib/http/api-error";
import { bacaJson } from "@/lib/http/post-json";
import { enforceRateLimit } from "@/lib/ratelimit/ratelimit";
import { TanyaRequest } from "@/lib/ai/schema";
import { jawabPertanyaan } from "@/lib/ai/tanya";
import { penyediaDariEnv } from "@/lib/ai/provider";
import { SEMUA_CHUNK } from "@/lib/kb/data";

export const maxDuration = 30;

export async function POST(req: Request) {
  const started = Date.now();
  try {
    enforceRateLimit(req, "tanya", 10, 60_000);
    const p = TanyaRequest.safeParse(await bacaJson(req, 4_000));
    if (!p.success) throw new ApiError("MASUKAN_TIDAK_VALID");
    const hasil = await jawabPertanyaan(p.data.pertanyaan, p.data.bahaya, { kb: SEMUA_CHUNK, providers: penyediaDariEnv() });
    console.info(JSON.stringify({ route: "/api/tanya", status: 200, ms: Date.now() - started, mode: hasil.mode, refused: hasil.refused, kategori: hasil.kategori }));
    return NextResponse.json(hasil);
  } catch (err) {
    return errorResponse(err, "/api/tanya", started);
  }
}
