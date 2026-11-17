import type { StateStorage } from "zustand/middleware";

/**
 * Penyimpanan aman: semua baca/tulis dibungkus try/catch (Blueprint 12.2).
 * Bila localStorage tidak tersedia, state tetap hidup di memori.
 */
const memory = new Map<string, string>();
let failed = false;
const listeners = new Set<() => void>();

export const storageFailed = () => failed;
export const onStorageFailure = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
function markFailed() {
  if (!failed) {
    failed = true;
    listeners.forEach((l) => l());
  }
}

export const safeStorage: StateStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name);
    } catch {
      markFailed();
      return memory.get(name) ?? null;
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value);
    } catch {
      markFailed();
      memory.set(name, value);
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
    } catch {
      markFailed();
    }
    memory.delete(name);
  },
};

/** Cache respons API untuk tampilan "data lama" (kunci cache:{rute}:{kunci}). */
export function readCache<T>(route: string, key: string): { data: T; fetchedAt: string } | null {
  try {
    const raw = localStorage.getItem(`sigap:v1:cache:${route}:${key}`);
    return raw ? (JSON.parse(raw) as { data: T; fetchedAt: string }) : null;
  } catch {
    return null;
  }
}
export function writeCache(route: string, key: string, data: unknown) {
  try {
    localStorage.setItem(
      `sigap:v1:cache:${route}:${key}`,
      JSON.stringify({ data, fetchedAt: new Date().toISOString() }),
    );
  } catch {
    /* kuota penuh / diblokir: abaikan */
  }
}
