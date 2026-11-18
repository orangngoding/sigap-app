// Ringkasan kondisi BMKG terkini sebagai teks untuk Asisten (dipakai saat pertanyaan menyangkut "sekarang").
// Sinyal dan tingkat dihitung kode yang sama dengan Briefing; AI hanya membaca fakta ini.
import { dataTidakLengkap, hitungSinyal, tingkatKeseluruhan, type DataBriefing } from "./sinyal";

const LABEL_TINGKAT = { tenang: "Tenang", perhatikan: "Perhatikan", waspada: "Waspada" } as const;

/** Waktu WIB yang mudah dibaca, mis. "Rabu, 18 November 2026 pukul 14.20 WIB". */
export function waktuWib(now: Date): string {
  const f = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
  return `${f.format(now)} WIB`;
}

export function teksKondisi(data: DataBriefing, now = new Date()): string {
  const sinyal = hitungSinyal(data, now);
  const tingkat = tingkatKeseluruhan(sinyal);
  const baris = [
    `Waktu sekarang: ${waktuWib(now)}`,
    `Tingkat perhatian versi SIGAP (bukan status resmi): ${LABEL_TINGKAT[tingkat]}`,
    ...(sinyal.length ? sinyal.map((s) => `- [${LABEL_TINGKAT[s.tingkat]}] ${s.judul}: ${s.fakta}`) : ["- Tidak ada sinyal dari data yang terbaca."]),
    ...dataTidakLengkap(data).map((c) => `Catatan: ${c}`),
  ];
  return baris.join("\n");
}
