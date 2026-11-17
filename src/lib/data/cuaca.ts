import type { CuacaResponse, IntervalCuaca } from "@/types";
import { fetchUpstreamJson } from "@/lib/http/fetch-upstream";
import { toNumber, toPlainText } from "./sanitize";

export const ADM4_PATTERN = /^\d{2}\.\d{2}\.\d{2}\.\d{4}$/; // dipastikan setelah uji hari 1

/**
 * ASUMSI (verifikasi di respons nyata, Blueprint 15.3): deskripsi hujan lebat / petir
 * ditandai lewat substring pada weather_desc. Catat nilai asli di docs/data-sources.md.
 */
const TRIGGER = /hujan lebat|petir/i;

type Raw = Record<string, unknown>;

const ZONA_NAMA: Record<string, string> = {
  "Asia/Jakarta": "+07:00", "Asia/Pontianak": "+07:00", WIB: "+07:00",
  "Asia/Makassar": "+08:00", WITA: "+08:00",
  "Asia/Jayapura": "+09:00", WIT: "+09:00",
};

/** "+0700" -> "+07:00"; nama zona IANA/singkatan Indonesia dipetakan; selain itu WIB. */
function offsetFromTimezone(tz: unknown): string {
  if (typeof tz !== "string") return "+07:00";
  const m = tz.match(/^([+-])(\d{2}):?(\d{2})$/);
  return m ? `${m[1]}${m[2]}:${m[3]}` : (ZONA_NAMA[tz] ?? "+07:00");
}

const NAIF = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/;
const menitNaif = (s: unknown): number | null => {
  const m = typeof s === "string" ? s.trim().match(NAIF) : null;
  return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) / 60_000 : null;
};

/** Offset sebenarnya dari selisih local_datetime dan utc_datetime pada item yang sama (paling andal). */
function offsetFromPair(local: unknown, utc: unknown): string | null {
  const a = menitNaif(local);
  const b = menitNaif(utc);
  if (a === null || b === null) return null;
  const d = a - b;
  if (d < -14 * 60 || d > 14 * 60) return null;
  const abs = Math.abs(d);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d < 0 ? "-" : "+"}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

/** "2026-11-15 09:00:00" + offset -> "2026-11-15T09:00:00+07:00" */
function toIsoLocal(local: unknown, offset: string): string | null {
  if (typeof local !== "string") return null;
  const s = local.trim().replace(" ", "T");
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(s)) return null;
  return `${s.length === 16 ? s + ":00" : s}${offset}`;
}

export function normalizeCuaca(raw: unknown, now = new Date()): CuacaResponse {
  const root = (raw ?? {}) as Raw;
  const lok = (root.lokasi ?? {}) as Raw;
  const timezone = typeof lok.timezone === "string" ? lok.timezone : "+0700";
  const offset = offsetFromTimezone(timezone);

  // data[0].cuaca = array hari -> array interval
  const dataArr = Array.isArray(root.data) ? (root.data as Raw[]) : [];
  const cuacaDays = Array.isArray(dataArr[0]?.cuaca) ? (dataArr[0].cuaca as unknown[]) : [];

  const prakiraan: IntervalCuaca[] = [];
  for (const day of cuacaDays) {
    if (!Array.isArray(day)) continue;
    for (const it of day as Raw[]) {
      const waktu = toIsoLocal(it.local_datetime, offsetFromPair(it.local_datetime, it.utc_datetime) ?? offset);
      if (!waktu) continue;
      prakiraan.push({
        waktu,
        kondisi: toPlainText(it.weather_desc) || "Tidak diketahui",
        // URL ikon BMKG memuat spasi ("hujan ringan-am.svg"); di-encode agar valid di semua peramban.
        ikon: typeof it.image === "string" && it.image.startsWith("https://") ? it.image.trim().replace(/ /g, "%20") : null,
        suhu: toNumber(it.t),
        kelembapan: toNumber(it.hu),
        anginKmj: toNumber(it.ws),
        arahAngin: typeof it.wd === "string" ? it.wd : null,
        jarakPandang: typeof it.vs_text === "string" ? toPlainText(it.vs_text) : null,
      });
    }
  }
  prakiraan.sort((a, b) => a.waktu.localeCompare(b.waktu));

  // Hanya interval yang belum lewat (toleransi 3 jam, interval BMKG 3-jaman) dalam 48 jam ke depan.
  const t0 = now.getTime() - 3 * 3600_000;
  const t1 = now.getTime() + 48 * 3600_000;
  const jendela = prakiraan.filter((p) => {
    const t = Date.parse(p.waktu);
    return t >= t0 && t <= t1;
  });
  const pemicu = jendela.find((p) => TRIGGER.test(p.kondisi));

  const suhu = prakiraan.map((p) => p.suhu).filter((v): v is number => v !== null);

  return {
    sumber: {
      nama: "BMKG",
      url: "https://data.bmkg.go.id/prakiraan-cuaca",
      diambilPada: now.toISOString(),
    },
    stale: false,
    lokasi: {
      desa: toPlainText(lok.desa),
      kecamatan: toPlainText(lok.kecamatan),
      kotkab: toPlainText(lok.kotkab),
      provinsi: toPlainText(lok.provinsi),
      lat: toNumber(lok.lat),
      lon: toNumber(lok.lon),
      timezone,
    },
    prakiraan,
    ringkasan: {
      hujanLebat48j: Boolean(pemicu),
      hujanLebatWaktu: pemicu?.waktu ?? null,
      suhuMin: suhu.length ? Math.min(...suhu) : null,
      suhuMaks: suhu.length ? Math.max(...suhu) : null,
    },
  };
}

export async function fetchCuaca(adm4: string): Promise<CuacaResponse> {
  const url = `https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=${encodeURIComponent(adm4)}`;
  const raw = await fetchUpstreamJson(url, { revalidateSeconds: 600 });
  return normalizeCuaca(raw);
}
