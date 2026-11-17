import { ApiError } from "./api-error";

/**
 * Baca badan POST JSON dengan pemeriksaan dasar (Blueprint 17.3): hanya JSON, batas ukuran,
 * dan asal permintaan harus situs sendiri bila header Origin ada. Tidak ada cookie sesi.
 */
export async function bacaJson(req: Request, maksByte: number): Promise<unknown> {
  const asal = req.headers.get("origin");
  if (asal) {
    let host: string;
    try {
      host = new URL(asal).host;
    } catch {
      throw new ApiError("ASAL_DITOLAK");
    }
    const tuan = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    if (tuan && host !== tuan) throw new ApiError("ASAL_DITOLAK");
  }
  if (!(req.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) throw new ApiError("MASUKAN_TIDAK_VALID");
  const panjang = Number(req.headers.get("content-length") ?? "0");
  if (panjang > maksByte) throw new ApiError("TERLALU_BESAR");

  const teks = await req.text();
  if (new TextEncoder().encode(teks).length > maksByte) throw new ApiError("TERLALU_BESAR");
  try {
    return JSON.parse(teks);
  } catch {
    throw new ApiError("MASUKAN_TIDAK_VALID");
  }
}
