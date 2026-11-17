import { z } from "zod";

// Kontrak keluaran dan masukan AI (Blueprint 10.4 dan 13.3).

export const HAZARD_IDS = [
  "banjir", "longsor", "gempa", "cuaca_ekstrem", "tsunami",
  "kekeringan", "karhutla", "gunung_api", "gelombang_abrasi",
] as const;
export const HazardId = z.enum(HAZARD_IDS);

// ---------- Keluaran model ----------
export const Action = z.object({
  hazard: z.union([HazardId, z.literal("umum")]),
  phase: z.enum(["sebelum", "saat", "sesudah"]),
  title: z.string().min(3).max(80),
  detail: z.string().min(10).max(280),
  priority: z.enum(["tinggi", "sedang", "rendah"]),
  forGroups: z.array(z.enum(["lansia", "balita", "disabilitas", "hamil", "umum"])).min(1),
  sourceIds: z.array(z.string()).min(1), // id passage basis pengetahuan
});

export const RencanaSiaga = z.object({
  ringkasanRisiko: z.string().max(600),
  tindakan: z.array(Action).min(8).max(60),
  rekomendasiEdukasi: z.array(z.string()).max(5).default([]), // slug artikel Pustaka
  catatanKeterbatasan: z.string(),
});
export type RencanaSiagaKeluaran = z.infer<typeof RencanaSiaga>;

export const TerjemahPeringatan = z.object({
  penjelasan: z.string().max(700),
  tindakan: z.array(z.string().max(160)).min(3).max(5),
});

export const JawabanTanya = z.object({
  jawaban: z.string().max(900),
  sourceIds: z.array(z.string()),
  refused: z.boolean(),
});

// ---------- Masukan API ----------
const hitung = z.number().int().min(0).max(12);
const teks = (maks: number) => z.string().trim().min(1).max(maks);

export const ProfilAnonimSchema = z
  .object({
    bahaya: z.array(HazardId).min(1).max(9),
    varianBanjir: z.array(z.enum(["genangan", "sungai", "bandang", "rob"])).max(4).default([]),
    jawabanPemicu: z.record(z.string().max(40), z.enum(["ya", "tidak", "tidak_tahu"])).default({}),
    jumlahAnggota: z.number().int().min(1).max(12),
    lansia: hitung,
    balita: hitung,
    hamil: hitung,
    disabilitas: hitung,
    jenisDisabilitas: z.array(z.enum(["mobilitas", "penglihatan", "pendengaran", "kognitif", "lainnya"])).max(5).default([]),
    obatRutin: z.boolean(),
    jumlahObatRutin: hitung,
    hewanPeliharaan: z.boolean(),
    bangunan: z.enum(["rumah_1_lantai", "rumah_bertingkat", "apartemen", "kos", "lainnya"]),
    lantaiTinggal: z.number().int().min(1).max(60).optional(),
    punyaKendaraan: z.boolean(),
    persediaanHari: z.union([z.literal(3), z.literal(5), z.literal(7)]),
  })
  .superRefine((p, ctx) => {
    for (const k of ["lansia", "balita", "hamil", "disabilitas", "jumlahObatRutin"] as const) {
      if (p[k] > p.jumlahAnggota) ctx.addIssue({ code: "custom", path: [k], message: "melebihi jumlah anggota" });
    }
  });

export const LokasiAnonimSchema = z.object({
  kelurahan: teks(80),
  kecamatan: teks(80),
  kabKota: teks(80),
  provinsi: teks(80),
});

export const RencanaRequest = z.object({
  lokasi: LokasiAnonimSchema,
  profil: ProfilAnonimSchema,
  ringkasanData: z.object({ hujanLebat48j: z.boolean().default(false), gempaDekat24j: z.boolean().default(false) }).optional(),
  abaikanCache: z.boolean().optional(),
});
export type RencanaRequestT = z.infer<typeof RencanaRequest>;

export const TerjemahRequest = z.object({
  teksPeringatan: z.string().trim().min(20).max(2000),
  profil: z
    .object({
      lansia: hitung.optional(),
      balita: hitung.optional(),
      hamil: hitung.optional(),
      disabilitas: hitung.optional(),
      jumlahAnggota: z.number().int().min(1).max(12).optional(),
    })
    .optional(),
});

export const TanyaRequest = z.object({
  pertanyaan: z.string().trim().min(3).max(300),
  bahaya: z.array(HazardId).max(9).optional(),
});
