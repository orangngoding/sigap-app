"use client";
import { useQuery } from "@tanstack/react-query";
import type { HazardId, Lokasi } from "@/types";
import type { RisikoLokasiResponse } from "@/lib/risiko/ambil";
import type { TingkatRisiko } from "@/lib/risiko/nilai";

/** Ringkasan Profil Risiko di perangkat (kunci `sigap:v1:risiko`): dipakai Mode Darurat saat OFFLINE. */
export const KUNCI_RISIKO = "sigap:v1:risiko";
export interface RisikoTersimpan {
  lat: number;
  lon: number;
  diambilPada: string;
  nilai: Array<{ id: HazardId; tingkat: TingkatRisiko; alasan: string }>;
}

function simpanRingkas(lokasi: Pick<Lokasi, "lat" | "lon">, r: RisikoLokasiResponse) {
  try {
    const isi: RisikoTersimpan = { lat: lokasi.lat, lon: lokasi.lon, diambilPada: r.diambilPada, nilai: r.nilai.map((n) => ({ id: n.id, tingkat: n.tingkat, alasan: n.alasan[0] ?? "" })) };
    localStorage.setItem(KUNCI_RISIKO, JSON.stringify(isi));
  } catch {
    /* penyimpanan tidak tersedia: Mode Darurat memakai urutan bawaan */
  }
}

/** Baca ringkasan tersimpan untuk lokasi ini (null bila tidak ada atau untuk lokasi lain). */
export function bacaRisikoTersimpan(mentah: string | null, lokasi: Pick<Lokasi, "lat" | "lon"> | null): RisikoTersimpan | null {
  if (!mentah || !lokasi) return null;
  try {
    const r = JSON.parse(mentah) as RisikoTersimpan;
    if (!Array.isArray(r.nilai) || Math.abs(r.lat - lokasi.lat) > 0.01 || Math.abs(r.lon - lokasi.lon) > 0.01) return null;
    return r;
  } catch {
    return null;
  }
}

/** Profil risiko per titik lokasi (dibagi antarhalaman lewat cache TanStack Query; berubah sangat lambat). */
export function useRisikoLokasi(lokasi: Pick<Lokasi, "lat" | "lon" | "provinsi"> | null) {
  return useQuery<RisikoLokasiResponse>({
    queryKey: ["risiko-lokasi", lokasi ? lokasi.lat.toFixed(3) : "", lokasi ? lokasi.lon.toFixed(3) : "", lokasi?.provinsi ?? ""],
    enabled: !!lokasi,
    staleTime: 24 * 3_600_000,
    gcTime: 24 * 3_600_000,
    retry: 1,
    queryFn: async ({ signal }) => {
      const q = new URLSearchParams({ lat: String(lokasi!.lat), lon: String(lokasi!.lon), provinsi: lokasi!.provinsi });
      const res = await fetch(`/api/risiko-lokasi?${q}`, { signal });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as RisikoLokasiResponse;
      simpanRingkas(lokasi!, data);
      return data;
    },
  });
}
