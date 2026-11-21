import { NextResponse } from "next/server";
import { ApiError, errorResponse } from "@/lib/http/api-error";
import { bacaJson } from "@/lib/http/post-json";
import { enforceRateLimit } from "@/lib/ratelimit/ratelimit";
import { RencanaRequest } from "@/lib/ai/schema";
import { susunRencana } from "@/lib/ai/rencana";
import { penyediaDariEnv } from "@/lib/ai/provider";
import { isHazardAktif } from "@/lib/hazards/pack-status";
import { SEMUA_CHUNK } from "@/lib/kb/data";
import { ARTIKEL_RINGKAS } from "@/lib/pustaka/data";

export const maxDuration = 40; // lebih besar dari batas server 26 dtk agar jalur cadangan sempat berjalan

export async function POST(req: Request) {
  const started = Date.now();
  try {
    enforceRateLimit(req, "rencana-menit", 6, 60_000);
    enforceRateLimit(req, "rencana-jam", 20, 3_600_000);
    const body = await bacaJson(req, 16_000);
    const p = RencanaRequest.safeParse(body);
    if (!p.success) throw new ApiError(p.error.issues.some((i) => i.path[0] === "profil") ? "PROFIL_TIDAK_VALID" : "MASUKAN_TIDAK_VALID");
    if (!p.data.profil.bahaya.every(isHazardAktif)) throw new ApiError("BAHAYA_TIDAK_AKTIF");

    const hasil = await susunRencana(p.data, { kb: SEMUA_CHUNK, providers: penyediaDariEnv(), artikel: ARTIKEL_RINGKAS });
    // Log hanya rute, status, durasi, mode (tanpa isi permintaan)
    console.info(JSON.stringify({ route: "/api/rencana", status: 200, ms: Date.now() - started, mode: hasil.mode, cache: hasil.meta.cache, alasan: hasil.meta.alasanCadangan }));
    return NextResponse.json(hasil);
  } catch (err) {
    return errorResponse(err, "/api/rencana", started);
  }
}
