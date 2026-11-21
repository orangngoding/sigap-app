import { NextResponse } from "next/server";
import { ApiError, errorResponse } from "@/lib/http/api-error";
import { bacaJson } from "@/lib/http/post-json";
import { enforceRateLimit } from "@/lib/ratelimit/ratelimit";
import { RencanaPekanRequest } from "@/lib/ai/schema";
import { cacheRencanaPekan, susunRencanaPekan } from "@/lib/ai/rencana-pekan";
import { penyediaDariEnv } from "@/lib/ai/provider";
import { ambilKondisiGlobal, ambilPrakiraanPekan, ambilTitikPanas } from "@/lib/data/ambil";
import { CATATAN_CADANGAN_PEKAN, SUMBER_CADANGAN_PEKAN } from "@/lib/iklim/pekan-cadangan";
import { hitungSiagaPekan } from "@/lib/iklim/pekan";

export const maxDuration = 60;

/** Siaga Iklim "Minggu ini": rencana 7 hari keluarga dari sinyal prakiraan (dihitung ulang di server dari cache yang sama). */
export async function POST(req: Request) {
  const started = Date.now();
  try {
    enforceRateLimit(req, "rencana-pekan", 6, 60_000);
    const p = RencanaPekanRequest.safeParse(await bacaJson(req, 4_000));
    if (!p.success) throw new ApiError("MASUKAN_TIDAK_VALID");
    const { lokasi, bahaya, konteks } = p.data;
    const [raw, global, titikPanas] = await Promise.all([
      ambilPrakiraanPekan(lokasi.lat, lokasi.lon),
      ambilKondisiGlobal().catch(() => null),
      ambilTitikPanas(lokasi.lat, lokasi.lon).catch(() => null),
    ]);
    const sinyal = hitungSiagaPekan(raw.prakiraan, raw.udara, { lat: raw.lat, lon: raw.lon, provinsi: lokasi.provinsi, bahaya, global, titikPanas, ...(raw.cadangan ? { sumber: SUMBER_CADANGAN_PEKAN, catatan: CATATAN_CADANGAN_PEKAN } : {}) });
    const hasil = await susunRencanaPekan(sinyal, { kabKota: lokasi.kabKota, provinsi: lokasi.provinsi }, konteks ?? {}, { providers: penyediaDariEnv(), cache: cacheRencanaPekan, bahaya });
    console.info(JSON.stringify({ route: "/api/rencana-pekan", status: 200, ms: Date.now() - started, mode: hasil.mode }));
    return NextResponse.json(hasil);
  } catch (err) {
    return errorResponse(err, "/api/rencana-pekan", started);
  }
}
