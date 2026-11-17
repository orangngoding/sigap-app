import kb from "@/generated/kb-index.json";
import type { Chunk } from "./schema";

/** Seluruh potongan KB hasil `npm run build:content` (sudah divalidasi). */
export const SEMUA_CHUNK = kb.chunks as Chunk[];
export const CHUNK_BY_ID: Record<string, Chunk> = Object.fromEntries(SEMUA_CHUNK.map((c) => [c.id, c]));
