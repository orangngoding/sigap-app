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
import { ambilRisikoLokasi } from "@/lib/risiko/ambil";
import { teksProfilRisiko } from "@/lib/risiko/teks";

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

/** Profil Risiko Lokasi (cache sama dengan halaman Lokasi dan Rencana). Koordinat tidak dikirim ke AI. */
async function risikoLokasi(l: LokasiTanya): Promise<string | null> {
  // Lokasi baru bisa butuh beberapa detik (USGS, SRTM, iklim): dibatasi agar jawaban tetap cepat; lain kali dari cache.
  const batas = new Promise<null>((r) => setTimeout(() => r(null), 8_000));
  const r = await Promise.race([ambilRisikoLokasi(l.lat, l.lon, l.provinsi), batas]);
  return r ? teksProfilRisiko(r.nilai) : null;
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
      { kb: SEMUA_CHUNK, providers: penyediaDariEnv(), cache: cacheTanya, kondisi: kondisiTerkini, risiko: risikoLokasi, batasWaktuMs: 22_000 },
    );
    console.info(JSON.stringify({ route: "/api/tanya", status: 200, ms: Date.now() - started, mode: hasil.mode, dasar: hasil.dasar, kondisi: hasil.kondisi, risiko: hasil.risiko, aksi: hasil.aksi?.length ?? 0, refused: hasil.refused, kategori: hasil.kategori }));
    return NextResponse.json(hasil);
  } catch (err) {
    return errorResponse(err, "/api/tanya", started);
  }
}
