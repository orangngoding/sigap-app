"use client";
import { useState } from "react";
import { ExternalLink, Newspaper } from "lucide-react";
import type { BeritaResponse } from "@/types";
import { useDataCard, TTL } from "@/hooks/use-data-card";
import { waktuRelatif } from "@/lib/utils/format";
import { DataCard } from "@/components/lokasi/data-card";

const takeaway = (d: BeritaResponse) =>
  !d.tersedia
    ? "Daftar berita sedang tidak dapat dimuat. Periksa kanal resmi BNPB dan BMKG."
    : d.daftar.length > 0
      ? `${d.daftar.length} berita bencana dalam 3 hari terakhir dari media Indonesia.`
      : "Belum ada berita bencana yang terbaca dalam 3 hari terakhir. Periksa kanal resmi untuk keadaan terbaru.";

const AWAL = 6;

/** Berita bencana terkini. Hanya judul, nama media, dan waktu; pembaca dibawa ke situs medianya. */
export function BeritaTerkini() {
  const [semua, setSemua] = useState(false);
  const query = useDataCard<BeritaResponse>("berita", "umum", "/api/berita", TTL.berita);
  return (
    <DataCard title="Berita bencana terkini" icon={Newspaper} query={query} officialUrl="https://bnpb.go.id/berita" minHeight="min-h-56" takeaway={takeaway}>
      {(d) => (
        <>
          {d.daftar.length > 0 && (
            <ul className="divide-y divide-border">
              {(semua ? d.daftar : d.daftar.slice(0, AWAL)).map((b) => (
                <li key={b.id}>
                  <a href={b.url} target="_blank" rel="noopener noreferrer" className="group flex min-h-11 items-start gap-3 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold leading-snug text-foreground group-hover:text-primary">{b.judul}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">{b.sumber} · {waktuRelatif(b.waktu)}</span>
                    </span>
                    <ExternalLink className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className="sr-only">(buka di situs media, tab baru)</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
          {d.daftar.length > AWAL && (
            <button type="button" aria-expanded={semua} onClick={() => setSemua(!semua)} className="min-h-11 text-sm font-semibold text-primary underline underline-offset-2 hover:text-primary/80 focus-visible:outline-2 focus-visible:outline-primary">
              {semua ? "Tampilkan lebih sedikit" : `Tampilkan semua (${d.daftar.length})`}
            </button>
          )}
          <p className="text-xs text-muted-foreground">Berita berasal dari media dan belum tentu diverifikasi. Untuk peringatan resmi, andalkan BMKG dan BNPB.</p>
        </>
      )}
    </DataCard>
  );
}
