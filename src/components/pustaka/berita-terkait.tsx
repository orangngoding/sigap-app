"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ExternalLink, Newspaper } from "lucide-react";
import type { BeritaResponse } from "@/types";
import { readCache, writeCache } from "@/lib/storage/safe-storage";
import { waktuRelatif } from "@/lib/utils/format";

/**
 * Berita terbaru yang sejenis dengan bahaya artikel: menghubungkan panduan dengan kejadian nyata minggu ini.
 * Memakai cache kueri yang sama dengan halaman Berita (tidak menambah panggilan bila sudah dimuat).
 */
export function BeritaTerkait({ hazards }: { hazards: string[] }) {
  const q = useQuery<BeritaResponse>({
    queryKey: ["berita", "umum"],
    staleTime: 10 * 60_000,
    retry: 1,
    queryFn: async () => {
      try {
        const res = await fetch("/api/berita");
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as BeritaResponse;
        writeCache("berita", "umum", data);
        return data;
      } catch (e) {
        const lama = readCache<BeritaResponse>("berita", "umum");
        if (lama) return lama.data;
        throw e;
      }
    },
  });
  const spesifik = hazards.filter((h) => h !== "umum");
  const cocok = (q.data?.daftar ?? []).filter((b) => (spesifik.length ? spesifik.includes(b.jenis ?? "umum") : true)).slice(0, 3);
  if (!q.data?.tersedia || cocok.length === 0) return null;
  const tautan = spesifik.length === 1 ? `/pustaka/berita?jenis=${spesifik[0]}` : "/pustaka/berita";

  return (
    <div className="rounded-3xl border border-border bg-surface p-5">
      <p className="flex items-center gap-2 text-sm font-semibold text-foreground"><Newspaper className="size-4 text-primary" aria-hidden="true" /> Kejadian terkait minggu ini</p>
      <ul className="mt-2 divide-y divide-border">
        {cocok.map((b) => (
          <li key={b.id}>
            <a href={b.url} target="_blank" rel="noopener noreferrer" className="group flex min-h-11 items-start gap-2 py-2.5 focus-visible:outline-2 focus-visible:outline-primary">
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium leading-snug text-foreground group-hover:text-primary">{b.judul}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{b.sumber} · {waktuRelatif(b.waktu)}</span>
              </span>
              <ExternalLink className="mt-1 size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="sr-only">(buka di situs media, tab baru)</span>
            </a>
          </li>
        ))}
      </ul>
      <Link href={tautan} className="mt-2 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary underline underline-offset-2">
        Berita lainnya <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </div>
  );
}
