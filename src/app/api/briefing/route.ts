import { NextResponse } from "next/server";
import { ApiError, errorResponse } from "@/lib/http/api-error";
import { bacaJson } from "@/lib/http/post-json";
import { enforceRateLimit } from "@/lib/ratelimit/ratelimit";
import { BriefingRequest } from "@/lib/ai/schema";
import { cacheBriefing, susunBriefing } from "@/lib/ai/briefing";
import { penyediaDariEnv } from "@/lib/ai/provider";
import { ambilCuaca, ambilGempa, ambilPeringatan } from "@/lib/data/ambil";
import { SEMUA_CHUNK } from "@/lib/kb/data";
import { ambilRisikoLokasi } from "@/lib/risiko/ambil";

/** Profil Risiko Lokasi dibatasi 6 detik: briefing tidak menunggu lokasi yang baru pertama dihitung. */
const risikoBerbatas = (lat: number, lon: number, provinsi: string) =>
  Promise.race([ambilRisikoLokasi(lat, lon, provinsi).then((r) => r.nilai), new Promise<null>((r) => setTimeout(() => r(null), 6_000))]);

export const maxDuration = 30;

const nilai = <T,>(r: PromiseSettledResult<T>): T | null => (r.status === "fulfilled" ? r.value : null);

/** Briefing Siaga Hari Ini untuk satu lokasi. Satu permintaan klien = tiga data BMKG ber-cache + satu panggilan AI. */
export async function POST(req: Request) {
  const started = Date.now();
  try {
    enforceRateLimit(req, "briefing", 10, 60_000);
    const p = BriefingRequest.safeParse(await bacaJson(req, 4_000));
    if (!p.success) throw new ApiError("MASUKAN_TIDAK_VALID");
    const { lokasi, bahaya, konteks } = p.data;

    // Data yang gagal tidak menggagalkan briefing; bagian itu dilaporkan sebagai catatan.
    const [cuaca, gempa, peringatan, risiko] = await Promise.allSettled([
      ambilCuaca(lokasi.adm4),
      ambilGempa({ lat: lokasi.lat, lon: lokasi.lon }),
      ambilPeringatan({ provinsi: lokasi.provinsi, kabKota: lokasi.kabKota, kecamatan: lokasi.kecamatan }),
      risikoBerbatas(lokasi.lat, lokasi.lon, lokasi.provinsi),
    ]);
    const hasil = await susunBriefing(
      { cuaca: nilai(cuaca), gempa: nilai(gempa), peringatan: nilai(peringatan), risiko: nilai(risiko) },
      { kelurahan: lokasi.kelurahan, kecamatan: lokasi.kecamatan, kabKota: lokasi.kabKota, provinsi: lokasi.provinsi },
      { ...konteks, bahaya },
      { kb: SEMUA_CHUNK, providers: penyediaDariEnv(), cache: cacheBriefing },
    );
    console.info(JSON.stringify({ route: "/api/briefing", status: 200, ms: Date.now() - started, mode: hasil.mode, tingkat: hasil.tingkat, sinyal: hasil.sinyal.length }));
    return NextResponse.json(hasil);
  } catch (err) {
    return errorResponse(err, "/api/briefing", started);
  }
}
