// Pengambil data BMKG ber-cache yang dipakai bersama oleh rute data (/api/cuaca, /api/gempa, /api/peringatan)
// dan Briefing Siaga. Kunci cache sama, jadi Briefing tidak menambah panggilan ke hulu.
import type { CuacaResponse, GempaResponse, PeringatanResponse } from "@/types";
import { cachedWithStale } from "@/lib/http/server-cache";
import { fetchCuaca } from "./cuaca";
import { buildGempa, fetchGempaRaw } from "./gempa";
import { fetchPeringatan, type LokasiCocok } from "./peringatan";
import { fetchProyeksi, type ProyeksiResponse } from "./proyeksi";
import { snapGrid } from "./iklim-math";

export function ambilCuaca(adm4: string): Promise<CuacaResponse> {
  return cachedWithStale(`cuaca:${adm4}`, 10 * 60_000, () => fetchCuaca(adm4));
}

export async function ambilGempa(ref?: { lat: number; lon: number }): Promise<GempaResponse> {
  // Cache berkas mentah (sama untuk semua pengguna); jarak dihitung per permintaan.
  const raw = await cachedWithStale("gempa:raw", 2 * 60_000, async () => ({
    stale: false,
    fetchedAt: new Date().toISOString(),
    ...(await fetchGempaRaw()),
  }));
  const data = buildGempa(raw.autogempa, raw.terkini, raw.dirasakan, ref, new Date(raw.fetchedAt));
  data.stale = raw.stale;
  return data;
}

export function ambilPeringatan(l: LokasiCocok): Promise<PeringatanResponse> {
  return cachedWithStale(`peringatan:${l.provinsi.toLowerCase()}:${l.kabKota ?? ""}:${l.kecamatan ?? ""}`, 2 * 60_000, () => fetchPeringatan(l));
}

/**
 * Proyeksi iklim 1991-2050 per grid 0,25°: permintaan hulu berat (15-25 detik), jadi di-cache 30 hari dan
 * lokasi berdekatan (satu grid) berbagi hasil.
 */
export function ambilProyeksi(lat: number, lon: number): Promise<ProyeksiResponse> {
  return cachedWithStale(`proyeksi:${snapGrid(lat)}:${snapGrid(lon)}`, 30 * 86_400_000, () => fetchProyeksi(lat, lon));
}
