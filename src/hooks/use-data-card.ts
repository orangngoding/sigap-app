"use client";
import { useQuery } from "@tanstack/react-query";
import type { ApiBase, ApiErrorBody } from "@/types";
import { readCache, writeCache } from "@/lib/storage/safe-storage";

export const TTL = { cuaca: 5 * 60_000, gempa: 5 * 60_000, peringatan: 5 * 60_000, berita: 10 * 60_000, iklim: 24 * 3600_000 };

/**
 * Ambil data kartu; bila jaringan/hulu gagal dan ada cache lokal, tampilkan sebagai data lama
 * (Blueprint 6.4). Tanpa cache -> galat (ErrorState).
 */
export function useDataCard<T extends ApiBase>(route: string, key: string, url: string | null, ttl: number) {
  return useQuery<T>({
    queryKey: [route, key],
    enabled: url !== null,
    staleTime: ttl,
    retry: false,
    queryFn: async () => {
      try {
        const res = await fetch(url as string);
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
          throw new Error(body?.error.code ?? "SUMBER_GAGAL");
        }
        const data = (await res.json()) as T;
        writeCache(route, key, data);
        return data;
      } catch (e) {
        const cached = readCache<T>(route, key);
        if (cached) return { ...cached.data, stale: true };
        throw e;
      }
    },
  });
}
