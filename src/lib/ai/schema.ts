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

/** Keluaran Asisten SIGAP (percakapan): boleh memakai panduan KB dan pengetahuan umum model. */
export const JawabanAsisten = z.object({
  jawaban: z.string().min(1).max(2400),
  sourceIds: z.array(z.string()).max(8).default([]),
  // Saran dan aksi berlebih cukup dipotong, dan aksi yang rusak diabaikan: tidak boleh membuang jawaban yang baik.
  saranLanjutan: z.array(z.string().max(90)).default([]).transform((x) => x.slice(0, 3)),
  /** Id aksi aplikasi yang relevan, dipilih dari daftar AKSI yang diberikan (divalidasi kode). */
  aksi: z.array(z.string().max(60)).default([]).transform((x) => x.slice(0, 5)).catch([]),
  refused: z.boolean().default(false),
});

/** Keluaran Briefing Siaga Hari Ini: AI hanya merangkai kalimat dari sinyal yang dihitung kode. */
export const BriefingKeluaran = z.object({
  ringkasan: z.string().min(10).max(480),
  tindakan: z
    .array(z.object({ judul: z.string().min(3).max(90), alasan: z.string().min(5).max(220) }))
    .min(3)
    .max(4),
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

export const GiliranSchema = z.object({
  peran: z.enum(["pengguna", "asisten"]),
  teks: z.string().trim().min(1).max(2400),
});

/** Konteks anonim keluarga untuk personalisasi jawaban (Blueprint 12.3: tanpa nama, kontak, catatan). */
export const KonteksTanyaSchema = z.object({
  wilayah: z.string().trim().max(160).optional(),
  jumlahAnggota: z.number().int().min(1).max(12).optional(),
  lansia: hitung.optional(),
  balita: hitung.optional(),
  hamil: hitung.optional(),
  disabilitas: hitung.optional(),
  hewanPeliharaan: z.boolean().optional(),
  bangunan: z.enum(["rumah_1_lantai", "rumah_bertingkat", "apartemen", "kos", "lainnya"]).optional(),
});
export type KonteksTanya = z.infer<typeof KonteksTanyaSchema>;

const teksPendek = z.string().trim().min(1).max(120);

/** Ringkasan rencana keluarga tanpa identitas (judul tindakan dan nama isi tas saja). */
export const RingkasRencanaSchema = z.object({
  skor: z.number().int().min(0).max(100),
  label: z.string().max(30),
  belumDikerjakan: z.array(teksPendek).max(8).default([]),
  tasBelumSiap: z.array(teksPendek).max(10).default([]),
  tasKedaluwarsa: z.array(teksPendek).max(8).default([]),
  latihanLulus: z.number().int().min(0).max(20).optional(),
  latihanTotal: z.number().int().min(0).max(20).optional(),
});
export type RingkasRencana = z.infer<typeof RingkasRencanaSchema>;

const namaWilayahTanya = z.string().trim().min(2).max(60).regex(/^[\p{L}0-9 .,'()/\-]+$/u);
/** Lokasi untuk membaca kondisi BMKG terkini. Koordinat hanya dipakai server, tidak dikirim ke AI. */
export const LokasiTanyaSchema = z.object({
  adm4: z.string().regex(/^\d{2}\.\d{2}\.\d{2}\.\d{4}$/),
  kecamatan: namaWilayahTanya,
  kabKota: namaWilayahTanya,
  provinsi: namaWilayahTanya,
  lat: z.number().min(-12).max(7),
  lon: z.number().min(94).max(142),
});
export type LokasiTanya = z.infer<typeof LokasiTanyaSchema>;

export const TanyaRequest = z.object({
  pertanyaan: z.string().trim().min(2).max(500),
  bahaya: z.array(HazardId).max(9).optional(),
  /** Giliran sebelumnya; hanya 8 terakhir yang dipakai. */
  riwayat: z.array(GiliranSchema).max(20).optional(),
  konteks: KonteksTanyaSchema.optional(),
  rencana: RingkasRencanaSchema.optional(),
  lokasi: LokasiTanyaSchema.optional(),
});

const namaWilayah = z.string().trim().min(2).max(60).regex(/^[\p{L}0-9 .,'()/\-]+$/u);

export const BriefingRequest = z.object({
  lokasi: z.object({
    adm4: z.string().regex(/^\d{2}\.\d{2}\.\d{2}\.\d{4}$/),
    kelurahan: namaWilayah.optional(),
    kecamatan: namaWilayah,
    kabKota: namaWilayah,
    provinsi: namaWilayah,
    lat: z.number().min(-12).max(7),
    lon: z.number().min(94).max(142),
  }),
  bahaya: z.array(HazardId).max(9).optional(),
  konteks: KonteksTanyaSchema.omit({ wilayah: true }).optional(),
});
export type BriefingRequestT = z.infer<typeof BriefingRequest>;

// ---------- Mesin Waktu Iklim: rencana adaptasi keluarga ----------
export const KATEGORI_ADAPTASI = ["rumah", "air", "kesehatan", "ekonomi", "komunitas"] as const;
export const KAPAN_ADAPTASI = ["sekarang", "1-5 tahun", "jangka panjang"] as const;
export const BIAYA_ADAPTASI = ["rendah", "sedang", "tinggi"] as const;

export const AdaptasiKeluaran = z.object({
  ringkasan: z.string().min(20).max(600),
  dampak: z.array(z.object({ judul: z.string().min(3).max(80), isi: z.string().min(10).max(260) })).min(2).max(4),
  langkah: z
    .array(
      z.object({
        kategori: z.enum(KATEGORI_ADAPTASI),
        judul: z.string().min(3).max(100),
        alasan: z.string().min(10).max(260),
        kapan: z.enum(KAPAN_ADAPTASI),
        biaya: z.enum(BIAYA_ADAPTASI),
      }),
    )
    .min(4)
    .max(7),
});
export type AdaptasiKeluaranT = z.infer<typeof AdaptasiKeluaran>;

export const AdaptasiRequest = z.object({
  lokasi: z.object({
    lat: z.number().min(-12).max(7),
    lon: z.number().min(94).max(142),
    kabKota: namaWilayahTanya,
    provinsi: namaWilayahTanya,
  }),
  bahaya: z.array(HazardId).max(9).optional(),
  konteks: KonteksTanyaSchema.omit({ wilayah: true }).optional(),
});
