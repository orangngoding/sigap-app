import { NextResponse } from "next/server";
import { ApiError, errorResponse } from "@/lib/http/api-error";
import { bacaJson } from "@/lib/http/post-json";
import { enforceRateLimit } from "@/lib/ratelimit/ratelimit";
import { TanyaRequest, type LokasiTanya } from "@/lib/ai/schema";
import { cacheTanya, jawabPertanyaan } from "@/lib/ai/tanya";
import { penyediaDariEnv } from "@/lib/ai/provider";
import { SEMUA_CHUNK } from "@/lib/kb/data";
import { ambilCuaca, ambilGempa, ambilPeringatan } from "@/lib/data/ambil";
import { teksKondisi } from "@/lib/briefing/kondisi-teks";

export const maxDuration = 30;

const nilai = <T,>(r: PromiseSettledResult<T>): T | null => (r.status === "fulfilled" ? r.value : null);

/** Kondisi BMKG terkini (cache yang sama dengan Briefing dan kartu Lokasi). Koordinat tidak dikirim ke AI. */
async function kondisiTerkini(l: LokasiTanya): Promise<string | null> {
  const [cuaca, gempa, peringatan] = await Promise.allSettled([
    ambilCuaca(l.adm4),
    ambilGempa({ lat: l.lat, lon: l.lon }),
    ambilPeringatan({ provinsi: l.provinsi, kabKota: l.kabKota, kecamatan: l.kecamatan }),
  ]);
  const data = { cuaca: nilai(cuaca), gempa: nilai(gempa), peringatan: nilai(peringatan) };
  if (!data.cuaca && !data.gempa && !data.peringatan) return null;
  return teksKondisi(data);
}

export async function POST(req: Request) {
  const started = Date.now();
  try {
    enforceRateLimit(req, "tanya", 12, 60_000);
    // Riwayat percakapan dan ringkasan rencana ikut dikirim, jadi batas badan lebih besar daripada satu pertanyaan.
    const p = TanyaRequest.safeParse(await bacaJson(req, 48_000));
    if (!p.success) throw new ApiError("MASUKAN_TIDAK_VALID");
    const { pertanyaan, bahaya, riwayat, konteks, rencana, lokasi } = p.data;
    const hasil = await jawabPertanyaan(
      pertanyaan,
      { bahaya, riwayat, konteks, rencana, lokasi },
      { kb: SEMUA_CHUNK, providers: penyediaDariEnv(), cache: cacheTanya, kondisi: kondisiTerkini, batasWaktuMs: 22_000 },
    );
    console.info(JSON.stringify({ route: "/api/tanya", status: 200, ms: Date.now() - started, mode: hasil.mode, dasar: hasil.dasar, kondisi: hasil.kondisi, aksi: hasil.aksi?.length ?? 0, refused: hasil.refused, kategori: hasil.kategori }));
    return NextResponse.json(hasil);
  } catch (err) {
    return errorResponse(err, "/api/tanya", started);
  }
}
