// Pengingat isi tas siaga: tanggal kedaluwarsa per item (disimpan di perangkat) dan berkas kalender .ics
// yang dibuat di perangkat, sehingga pengingat tetap berbunyi lewat aplikasi kalender tanpa server atau akun.
// Dasar: panduan BNPB "Periksa kembali isi tas siaga setiap 3 bulan" (umum-sebelum-028).
import type { ItemTas } from "@/types/rencana";

/** Item tas yang punya masa berlaku dan perlu diganti berkala. */
export const BISA_KEDALUWARSA = new Set(["air", "makanan", "susu-bayi", "obat-rutin", "p3k", "baterai", "hewan", "popok"]);
export const HARI_SEGERA = 30;
const HARI_MS = 86_400_000;

export type StatusKedaluwarsa = "lewat" | "segera" | "aman";
export type PetaKedaluwarsa = Record<string, string>; // id item -> "YYYY-MM-DD"

const TANGGAL = /^\d{4}-\d{2}-\d{2}$/;
export const tanggalValid = (t: string | undefined): t is string => Boolean(t && TANGGAL.test(t) && !Number.isNaN(Date.parse(`${t}T00:00:00Z`)));

/** Selisih hari kalender (zona waktu lokal perangkat) dari `now` ke tanggal. */
export function sisaHari(tanggal: string, now = new Date()): number {
  const [y, m, d] = tanggal.split("-").map(Number);
  const target = Date.UTC(y, m - 1, d);
  const hariIni = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - hariIni) / HARI_MS);
}

export function statusKedaluwarsa(tanggal: string, now = new Date()): StatusKedaluwarsa {
  const s = sisaHari(tanggal, now);
  return s < 0 ? "lewat" : s <= HARI_SEGERA ? "segera" : "aman";
}

export interface RingkasPengingat {
  lewat: Array<ItemTas & { tanggal: string }>;
  segera: Array<ItemTas & { tanggal: string; sisa: number }>;
}

export function ringkasPengingat(tas: ItemTas[], peta: PetaKedaluwarsa, now = new Date()): RingkasPengingat {
  const out: RingkasPengingat = { lewat: [], segera: [] };
  for (const i of tas) {
    const t = peta[i.id];
    if (!BISA_KEDALUWARSA.has(i.id) || !tanggalValid(t)) continue;
    const st = statusKedaluwarsa(t, now);
    if (st === "lewat") out.lewat.push({ ...i, tanggal: t });
    else if (st === "segera") out.segera.push({ ...i, tanggal: t, sisa: sisaHari(t, now) });
  }
  out.segera.sort((a, b) => a.sisa - b.sisa);
  return out;
}

// ---------- Kalender (RFC 5545) ----------
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const ymd = (d: Date) => `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
/** Baris lebih dari 75 oktet dilipat sesuai RFC 5545. */
export const lipat = (baris: string) => {
  const out: string[] = [];
  let sisa = baris;
  while (sisa.length > 73) {
    out.push(sisa.slice(0, 73));
    sisa = ` ${sisa.slice(73)}`;
  }
  out.push(sisa);
  return out.join("\r\n");
};

export interface AcaraIcs {
  uid: string;
  tanggal: Date; // hari (UTC tengah malam)
  judul: string;
  ket: string;
  rrule?: string;
}

export function acara(a: AcaraIcs, now: Date): string[] {
  const akhir = new Date(a.tanggal.getTime() + HARI_MS);
  return [
    "BEGIN:VEVENT",
    `UID:${a.uid}@sigap`,
    `DTSTAMP:${stamp(now)}`,
    `DTSTART;VALUE=DATE:${ymd(a.tanggal)}`,
    `DTEND;VALUE=DATE:${ymd(akhir)}`,
    ...(a.rrule ? [`RRULE:${a.rrule}`] : []),
    `SUMMARY:${esc(a.judul)}`,
    `DESCRIPTION:${esc(a.ket)}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "TRIGGER:PT9H", // pukul 09.00 pada hari itu
    `DESCRIPTION:${esc(a.judul)}`,
    "END:VALARM",
    "END:VEVENT",
  ];
}

const hariUtc = (d: Date) => new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));

/**
 * Berkas .ics: satu pengingat seminggu sebelum tiap item kedaluwarsa, ditambah pemeriksaan rutin
 * isi tas siaga setiap 3 bulan.
 */
export function buatIcs(tas: ItemTas[], peta: PetaKedaluwarsa, now = new Date()): string {
  const baris = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//SIGAP//Pengingat Tas Siaga//ID", "CALSCALE:GREGORIAN"];
  for (const i of tas) {
    const t = peta[i.id];
    if (!BISA_KEDALUWARSA.has(i.id) || !tanggalValid(t) || statusKedaluwarsa(t, now) === "lewat") continue;
    const [y, m, d] = t.split("-").map(Number);
    const hari = new Date(Date.UTC(y, m - 1, d) - 7 * HARI_MS);
    const mulai = hari.getTime() < hariUtc(now).getTime() ? hariUtc(now) : hari;
    baris.push(...acara({ uid: `tas-${i.id}-${t}`, tanggal: mulai, judul: `Ganti ${i.nama.toLowerCase()} di tas siaga`, ket: `${i.nama} di tas siaga kedaluwarsa pada ${t}. Ganti dengan yang baru. (SIGAP)` }, now));
  }
  const rutin = new Date(hariUtc(now).getTime());
  rutin.setUTCMonth(rutin.getUTCMonth() + 3);
  baris.push(...acara({ uid: "tas-periksa-rutin", tanggal: rutin, rrule: "FREQ=MONTHLY;INTERVAL=3", judul: "Periksa isi tas siaga keluarga", ket: "Periksa kembali isi tas siaga setiap 3 bulan dan ganti makanan serta minuman dengan masa berlaku yang lebih baru (panduan BNPB). Buka SIGAP untuk daftar lengkap." }, now));
  baris.push("END:VCALENDAR");
  return baris.map(lipat).join("\r\n") + "\r\n";
}
