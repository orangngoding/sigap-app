import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, errorResponse } from "@/lib/http/api-error";
import { enforceRateLimit } from "@/lib/ratelimit/ratelimit";
import { ambilPeringatan } from "@/lib/data/ambil";

const nama = z.string().trim().min(2).max(60).regex(/^[\p{L}0-9 .,'()/\-]+$/u); // dataset memuat mis. "Tiro/Truseb", "Misool (Misool Utara)"
const Query = z.object({ provinsi: nama, kabKota: nama.optional(), kecamatan: nama.optional() });

export async function GET(req: Request) {
  const started = Date.now();
  try {
    enforceRateLimit(req, "peringatan");
    const sp = new URL(req.url).searchParams;
    const q = Query.safeParse({
      provinsi: sp.get("provinsi") ?? undefined,
      kabKota: sp.get("kabKota") ?? undefined,
      kecamatan: sp.get("kecamatan") ?? undefined,
    });
    if (!q.success) throw new ApiError("MASUKAN_TIDAK_VALID");
    // Cache per provinsi (umpan sama untuk semua pengguna); pencocokan lokasi dihitung ulang dari hasil.
    const data = await ambilPeringatan(q.data);
    return NextResponse.json(data);
  } catch (err) {
    return errorResponse(err, "/api/peringatan", started);
  }
}
