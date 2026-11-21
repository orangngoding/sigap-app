import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, errorResponse } from "@/lib/http/api-error";
import { enforceRateLimit } from "@/lib/ratelimit/ratelimit";
import { ambilKondisiGlobal, ambilPrakiraanPekan, ambilTitikPanas } from "@/lib/data/ambil";
import { hitungSiagaPekan } from "@/lib/iklim/pekan";
import { CATATAN_CADANGAN_PEKAN, SUMBER_CADANGAN_PEKAN } from "@/lib/iklim/pekan-cadangan";
import { HazardId } from "@/lib/ai/schema";

const Query = z.object({
  lat: z.coerce.number().min(-12).max(7),
  lon: z.coerce.number().min(94).max(142),
  provinsi: z.string().trim().min(2).max(60).regex(/^[\p{L} .'-]+$/u),
  bahaya: z.array(HazardId).max(9).optional(),
});

/** Siaga Iklim "Minggu ini": sinyal hujan, panas, kering, cuaca mudah terbakar, dan kualitas udara 16 hari ke depan. */
export async function GET(req: Request) {
  const started = Date.now();
  try {
    enforceRateLimit(req, "siaga-pekan", 20, 60_000);
    const sp = new URL(req.url).searchParams;
    const q = Query.safeParse({ lat: sp.get("lat"), lon: sp.get("lon"), provinsi: sp.get("provinsi"), bahaya: sp.get("bahaya")?.split(",").filter(Boolean) });
    if (!q.success) throw new ApiError("MASUKAN_TIDAK_VALID");
    // Prakiraan wajib ada; kondisi global dan titik panas pelengkap (gagal = sinyal cuaca tetap tampil).
    const [raw, global, titikPanas] = await Promise.all([
      ambilPrakiraanPekan(q.data.lat, q.data.lon),
      ambilKondisiGlobal().catch(() => null),
      ambilTitikPanas(q.data.lat, q.data.lon).catch(() => null),
    ]);
    const data = hitungSiagaPekan(raw.prakiraan, raw.udara, { lat: raw.lat, lon: raw.lon, provinsi: q.data.provinsi, bahaya: q.data.bahaya, global, titikPanas, ...(raw.cadangan ? { sumber: SUMBER_CADANGAN_PEKAN, catatan: CATATAN_CADANGAN_PEKAN } : {}) });
    data.stale = raw.stale;
    data.sumber.diambilPada = raw.diambilPada;
    console.info(JSON.stringify({ route: "/api/siaga-pekan", status: 200, ms: Date.now() - started, sinyal: data.sinyal.length }));
    return NextResponse.json(data);
  } catch (err) {
    return errorResponse(err, "/api/siaga-pekan", started);
  }
}
