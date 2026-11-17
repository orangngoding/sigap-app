import { ApiError } from "./api-error";

// Allowlist host keluar (Blueprint 13.1). Tidak ada URL dari masukan pengguna.
const ALLOWED_HOSTS = new Set([
  "api.bmkg.go.id",
  "data.bmkg.go.id",
  "archive-api.open-meteo.com",
  "www.bmkg.go.id", // umpan peringatan dini (RSS/CAP)
]);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface UpstreamOptions {
  timeoutMs?: number; // default 8 detik
  revalidateSeconds?: number; // cache fetch Next.js
}

/**
 * GET JSON dari hulu: timeout 8 dtk, satu kali ulang (jeda 300 ms) untuk 5xx / waktu habis.
 * Melempar ApiError(SUMBER_TIMEOUT | SUMBER_GAGAL).
 */
export async function fetchUpstreamJson<T = unknown>(url: string, opsi: UpstreamOptions = {}): Promise<T> {
  return fetchUpstream<T>(url, "json", opsi);
}

/** GET teks (mis. RSS/CAP XML) dengan aturan yang sama seperti fetchUpstreamJson. */
export async function fetchUpstreamText(url: string, opsi: UpstreamOptions = {}): Promise<string> {
  return fetchUpstream<string>(url, "text", opsi);
}

async function fetchUpstream<T>(
  url: string,
  jenis: "json" | "text",
  { timeoutMs = 8000, revalidateSeconds = 0 }: UpstreamOptions,
): Promise<T> {
  const host = new URL(url).hostname;
  if (!ALLOWED_HOSTS.has(host)) throw new ApiError("GALAT_INTERNAL");

  let lastTimeout = false;
  for (let attempt = 0; attempt < 2; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: { Accept: jenis === "json" ? "application/json" : "application/xml, text/xml, application/rss+xml, */*" },
        next: { revalidate: revalidateSeconds },
      });
      if (res.ok) return (jenis === "json" ? await res.json() : await res.text()) as T;
      lastTimeout = false;
      if (res.status < 500) throw new ApiError("SUMBER_GAGAL"); // 4xx: tidak diulang
    } catch (e) {
      if (e instanceof ApiError) throw e;
      lastTimeout = e instanceof Error && e.name === "AbortError";
    } finally {
      clearTimeout(timer);
    }
    if (attempt === 0) await sleep(300);
  }
  throw new ApiError(lastTimeout ? "SUMBER_TIMEOUT" : "SUMBER_GAGAL");
}
