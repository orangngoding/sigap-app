"use client";
import type { UseQueryResult } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import type { ApiBase } from "@/types";
import { SumberBadge } from "@/components/global/sumber-badge";
import { waktuMutlak } from "@/lib/utils/format";

interface Props<T extends ApiBase> {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  query: UseQueryResult<T>;
  /** Tautan sumber resmi bila galat tanpa cache */
  officialUrl: string;
  /** Tinggi minimum agar tidak ada lompatan tata letak */
  minHeight?: string;
  /** Kalimat takeaway dibuat kode, bukan AI (Blueprint 6.2) */
  takeaway: (d: T) => string;
  children: (d: T) => React.ReactNode;
}

/** Kerangka kartu dengan lima keadaan: memuat, berhasil, data lama, galat, kosong (Blueprint 6.4). */
export function DataCard<T extends ApiBase>({
  title, icon: Icon, query, officialUrl, minHeight = "min-h-48", takeaway, children,
}: Props<T>) {
  const { data, isLoading, isError, refetch, isFetching } = query;
  const judulId = `k-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <section aria-labelledby={judulId} className={`rounded-2xl border border-border bg-surface p-5 ${minHeight}`}>
      <header className="mb-3 flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-5" />
        </span>
        <h2 id={judulId} className="text-base font-bold text-foreground">{title}</h2>
      </header>

      {isLoading && (
        <div className="animate-pulse space-y-3" aria-busy="true" aria-label={`Memuat ${title}`}>
          <div className="h-4 w-3/4 rounded bg-muted" />
          <div className="h-20 rounded bg-muted" />
          <div className="h-4 w-1/2 rounded bg-muted" />
        </div>
      )}

      {isError && !data && (
        <div role="alert" className="space-y-3 text-sm">
          <p className="text-foreground">Data belum dapat dimuat.</p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 font-medium hover:bg-muted"
            >
              <RefreshCw className="size-4" aria-hidden="true" /> Coba lagi
            </button>
            <a href={officialUrl} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">
              Buka sumber resmi
            </a>
          </div>
        </div>
      )}

      {data && (
        <div className="space-y-3">
          {data.stale && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg bg-warning px-3 py-2 text-sm text-warning-foreground">
              <span className="flex-1">Data lama, diperbarui {waktuMutlak(data.sumber.diambilPada)}</span>
              <button type="button" onClick={() => refetch()} disabled={isFetching} className="font-semibold underline disabled:opacity-50">
                Muat ulang
              </button>
            </div>
          )}
          <p className="text-sm font-medium text-foreground">{takeaway(data)}</p>
          {children(data)}
          <SumberBadge sumber={data.sumber} />
        </div>
      )}
    </section>
  );
}
