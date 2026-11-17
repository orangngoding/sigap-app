// Cache memori sederhana di sisi server (upaya terbaik pada serverless).
// Dipakai untuk penanda stale: bila hulu gagal dan ada cache lama, kembalikan cache itu
// dengan stale: true dan diambilPada asli (Blueprint 13.1).
interface Entry<T> {
  value: T;
  at: number;
}

const store = new Map<string, Entry<unknown>>();
const MAX_ENTRIES = 500;

export async function cachedWithStale<T extends { stale: boolean }>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
): Promise<T> {
  const hit = store.get(key) as Entry<T> | undefined;
  if (hit && Date.now() - hit.at < ttlMs) return hit.value;

  try {
    const value = await loader();
    if (store.size >= MAX_ENTRIES) {
      const oldest = store.keys().next().value;
      if (oldest !== undefined) store.delete(oldest);
    }
    store.set(key, { value, at: Date.now() });
    return value;
  } catch (err) {
    if (hit) return { ...hit.value, stale: true };
    throw err;
  }
}

export function clearServerCache() {
  store.clear();
}
