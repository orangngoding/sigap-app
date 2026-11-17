// Cache memori sederhana di sisi server (upaya terbaik pada serverless).
// Dipakai untuk penanda stale: bila hulu gagal dan ada cache lama, kembalikan cache itu
// dengan stale: true dan diambilPada asli (Blueprint 13.1).
interface Entry<T> {
  value: T;
  at: number;
  /** Bila hulu baru saja gagal: sampai kapan data lama langsung dipakai tanpa mencoba hulu lagi. */
  jedaSampai?: number;
}

const store = new Map<string, Entry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();
const MAX_ENTRIES = 500;
/** Jeda sebelum mencoba hulu lagi setelah gagal, agar tiap permintaan tidak menunggu timeout hulu. */
const JEDA_ULANG_MS = 60_000;

export async function cachedWithStale<T extends { stale: boolean }>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
): Promise<T> {
  const hit = store.get(key) as Entry<T> | undefined;
  const now = Date.now();
  if (hit && now - hit.at < ttlMs) return hit.value;
  if (hit?.jedaSampai && now < hit.jedaSampai) return { ...hit.value, stale: true };

  // Gabungkan permintaan serentak untuk kunci yang sama menjadi satu panggilan hulu.
  const berjalan = inflight.get(key) as Promise<T> | undefined;
  if (berjalan) return berjalan;

  const p = (async () => {
    try {
      const value = await loader();
      if (!store.has(key) && store.size >= MAX_ENTRIES) {
        const oldest = store.keys().next().value;
        if (oldest !== undefined) store.delete(oldest);
      }
      store.set(key, { value, at: Date.now() });
      return value;
    } catch (err) {
      const lama = store.get(key) as Entry<T> | undefined;
      if (lama) {
        lama.jedaSampai = Date.now() + Math.min(JEDA_ULANG_MS, ttlMs);
        return { ...lama.value, stale: true };
      }
      throw err;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, p);
  return p;
}

export function clearServerCache() {
  store.clear();
  inflight.clear();
}
