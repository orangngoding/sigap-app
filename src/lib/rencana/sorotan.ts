import type { CuacaResponse, GempaResponse } from "@/types";

/** Sorotan data hidup untuk ringkasan risiko (Blueprint 9.5). Hanya fakta terukur, tanpa prediksi. */
export function bangunSorotan(cuaca?: CuacaResponse | null, gempa?: GempaResponse | null): string[] {
  const s: string[] = [];
  const r = cuaca?.ringkasan;
  if (r?.hujanLebat48j) s.push("Perkiraan BMKG menunjukkan hujan lebat dalam 48 jam ke depan di sekitar lokasi Anda.");
  if (gempa?.ringkasan?.gempaDekat24j) s.push("BMKG mencatat gempa M5 atau lebih dalam 24 jam terakhir dalam radius 300 km dari lokasi Anda.");
  return s;
}
