import { NextResponse } from "next/server";
import type { ApiErrorBody } from "@/types";

// Kode galat sesuai Blueprint 13.4
const CATALOG = {
  MASUKAN_TIDAK_VALID: { status: 400, message: "Periksa isian Anda dan coba lagi", retryable: false },
  PROFIL_TIDAK_VALID: { status: 400, message: "Profil belum lengkap atau tidak valid. Periksa isian Anda", retryable: false },
  BAHAYA_TIDAK_AKTIF: { status: 400, message: "Salah satu bahaya yang dipilih belum tersedia", retryable: false },
  ASAL_DITOLAK: { status: 403, message: "Permintaan ditolak", retryable: false },
  TERLALU_BESAR: { status: 413, message: "Isian terlalu panjang", retryable: false },
  ADM4_TIDAK_VALID: { status: 400, message: "Pilih ulang lokasi", retryable: false },
  BATAS_LAJU: { status: 429, message: "Terlalu banyak permintaan. Coba lagi dalam beberapa saat", retryable: true },
  SUMBER_GAGAL: { status: 502, message: "Data belum dapat dimuat", retryable: true },
  SUMBER_TIMEOUT: { status: 504, message: "Layanan sedang lambat. Coba lagi", retryable: true },
  GALAT_INTERNAL: { status: 500, message: "Terjadi kesalahan. Coba lagi", retryable: true },
} as const;

export type ApiErrorCode = keyof typeof CATALOG;

/** Galat yang boleh dilempar dari lib; dipetakan ke respons oleh errorResponse(). */
export class ApiError extends Error {
  constructor(public code: ApiErrorCode) {
    super(code);
    this.name = "ApiError";
  }
}

export function errorResponse(err: unknown, route: string, startedAt?: number) {
  const code: ApiErrorCode = err instanceof ApiError ? err.code : "GALAT_INTERNAL";
  const def = CATALOG[code];
  // Log hanya rute, status, durasi, kode galat (tanpa isi permintaan) — Blueprint 13.1
  console.error(
    JSON.stringify({ route, status: def.status, ms: startedAt ? Date.now() - startedAt : undefined, code }),
  );
  const body: ApiErrorBody = {
    error: { code, message: def.message, retryable: def.retryable },
  };
  return NextResponse.json(body, {
    status: def.status,
    headers: code === "BATAS_LAJU" ? { "Retry-After": "30" } : undefined,
  });
}
