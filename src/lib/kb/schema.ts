import { z } from "zod";

export const HAZARD_KB = ["umum", "banjir", "longsor", "gempa", "cuaca_ekstrem", "tsunami", "kekeringan", "karhutla", "gunung_api", "gelombang_abrasi"] as const;
export const PHASES = ["sebelum", "saat", "sesudah"] as const;
export const AUDIENCES = ["umum", "lansia", "balita", "disabilitas", "hamil"] as const;

/** Potongan pengetahuan (Blueprint 11.2). Judul maks 80 dan isi maks 280 karakter. */
export const ChunkSchema = z
  .object({
    id: z.string().regex(/^[a-z_]+-(sebelum|saat|sesudah)-\d{3}$/, "id harus {hazard}-{fase}-{nnn}"),
    hazard: z.enum(HAZARD_KB),
    phase: z.enum(PHASES),
    audience: z.array(z.enum(AUDIENCES)).min(1),
    priority: z.enum(["tinggi", "sedang", "rendah"]),
    darurat: z.boolean(),
    varian: z.array(z.enum(["genangan", "sungai", "bandang", "rob"])).optional(),
    title: z.string().min(3).max(80),
    body: z.string().min(10).max(280),
    /** Diisi bila langkah diturunkan dari panduan bahaya lain (bukan panduan resmi khusus bahaya ini); wajib tampil ke pengguna. */
    turunan: z.string().min(5).max(160).optional(),
    sourceTitle: z.string().min(3),
    sourceUrl: z.string().regex(/^https:\/\//, "sourceUrl harus https"),
    accessedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    reviewedBy: z.array(z.string().min(2)).default([]), // opsional sejak revisi tim 2026-11-17
  })
  .superRefine((c, ctx) => {
    if (!c.id.startsWith(`${c.hazard}-${c.phase}-`)) ctx.addIssue({ code: "custom", message: "id tidak cocok dengan hazard/fase" });
  });

export type Chunk = z.infer<typeof ChunkSchema>;

/** Ambang aktivasi hazard pack (Blueprint 2.4): minimum potongan per bahaya. */
export const MIN_POTONGAN: Record<string, number> = {
  umum: 20, banjir: 12, longsor: 12, gempa: 12, cuaca_ekstrem: 12,
  tsunami: 8, kekeringan: 8, karhutla: 8, gunung_api: 6, gelombang_abrasi: 6,
};
/**
 * Jumlah peninjau minimum per potongan. Revisi tim (2026-11-17): proyek tidak mewajibkan peninjau, jadi 0.
 * Ubah ke 2 untuk menghidupkan kembali gerbang tinjauan; seluruh pemeriksaan di scripts/muat-konten.ts mengikutinya.
 */
export const MIN_PENINJAU = 0;
