// Penyaring data tersimpan (localStorage) sebelum masuk ke store. Data di perangkat dianggap tidak tepercaya: bisa
// berasal dari berkas cadangan yang diedit, versi SIGAP lain, atau penyimpanan yang rusak. Tanpa penyaring, satu
// kolom bertipe salah (mis. koordinat berupa teks) membuat halaman gagal dimuat, termasuk Mode Darurat.
// Prinsip: kolom yang bentuknya salah dibuang dan diganti nilai awal; kolom lain tetap dipakai.
import { z } from "zod";
import type { Lokasi } from "@/types";
import type { ProfilDraft } from "@/types/rencana";

const teks = (maks: number) => z.string().max(maks);

const LokasiSkema = z.object({
  adm4: teks(40),
  kelurahan: teks(120),
  kecamatan: teks(120),
  kabKota: teks(120),
  provinsi: teks(120),
  lat: z.number().finite().min(-90).max(90),
  lon: z.number().finite().min(-180).max(180),
  presisi: z.enum(["desa", "kabkota"]).optional(),
});

/** Lokasi tersimpan yang sah, atau null (pengguna diminta memilih lokasi lagi). */
export function sanitasiLokasi(x: unknown): Lokasi | null {
  const r = LokasiSkema.safeParse(x);
  return r.success ? r.data : null;
}

const angka = z.number().finite();
const daftarTeks = z.array(z.string());
/** Satu skema per kolom profil: diperiksa satu per satu agar kolom yang sah tidak ikut terbuang. */
const KOLOM_PROFIL: { [K in keyof ProfilDraft]-?: z.ZodType } = {
  bahaya: daftarTeks,
  varianBanjir: daftarTeks,
  jawabanPemicu: z.record(z.string(), z.enum(["ya", "tidak", "tidak_tahu"])),
  jumlahAnggota: angka,
  lansia: angka,
  balita: angka,
  hamil: angka,
  disabilitas: angka,
  jenisDisabilitas: daftarTeks,
  obatRutin: z.boolean(),
  jumlahObatRutin: angka,
  hewanPeliharaan: z.boolean(),
  bangunan: z.enum(["rumah_1_lantai", "rumah_bertingkat", "apartemen", "kos", "lainnya"]).nullable(),
  lantaiTinggal: angka.optional(),
  punyaKendaraan: z.boolean().nullable(),
  persediaanHari: z.union([z.literal(3), z.literal(5), z.literal(7)]),
  titikKumpul: z.string().optional(),
  kontakDarurat: z.array(z.object({ nama: z.string(), telepon: z.string() })),
  catatanKhusus: z.string().optional(),
};

/** Kolom profil tersimpan yang bentuknya sah; kolom lain dihilangkan agar diisi nilai awal saat digabung. */
export function sanitasiProfil(x: unknown): Partial<ProfilDraft> {
  if (!x || typeof x !== "object" || Array.isArray(x)) return {};
  const asal = x as Record<string, unknown>;
  const hasil: Record<string, unknown> = {};
  for (const [k, skema] of Object.entries(KOLOM_PROFIL)) {
    if (!(k in asal)) continue;
    const r = skema.safeParse(asal[k]);
    if (r.success) hasil[k] = r.data;
  }
  return hasil as Partial<ProfilDraft>;
}

/** Nilai teks tersimpan, atau "" bila bukan teks. */
export const teksTersimpan = (x: unknown): string => (typeof x === "string" ? x : "");

// ---------- Rencana Siaga ----------
// z.looseObject: kolom tambahan dari versi lain tetap dibawa (tidak dibuang diam-diam); yang diperiksa hanya kolom
// yang dipakai tampilan.
const TindakanSkema = z.looseObject({
  actionId: z.string(),
  hazard: z.string(),
  phase: z.string(),
  title: z.string(),
  detail: z.string(),
  priority: z.string(),
  forGroups: daftarTeks,
  sourceIds: daftarTeks,
});
const ItemTasSkema = z.looseObject({
  id: z.string(),
  kelompok: z.string(),
  nama: z.string(),
  jumlah: angka,
  satuan: z.string(),
  bobot: angka,
});
// Hanya bagian yang menentukan isi rencana yang wajib; kolom keterangan yang hilang atau salah diisi nilai bawaan agar
// rencana dari versi lain tidak ikut terbuang.
const RencanaSkema = z.looseObject({
  versi: z.literal(1).catch(1),
  dibuatPada: z.string().catch(""),
  mode: z.enum(["ai", "cadangan", "contoh"]),
  hashMasukan: z.string().catch(""),
  lokasiAdm4: z.string().catch(""),
  ringkasanRisiko: z.string().catch(""),
  faktorKerentanan: daftarTeks.catch([]),
  tindakan: z.array(z.unknown()),
  tas: z.array(z.unknown()),
  rekomendasiEdukasi: daftarTeks.catch([]),
  catatanKeterbatasan: z.string().catch(""),
  perluDiperbarui: z.boolean().catch(false),
});

/**
 * Rencana tersimpan yang sah, atau null (pengguna diminta menyusun ulang). Butir tindakan atau tas yang rusak dibuang
 * satu per satu; rencana tetap dipakai selama masih ada tindakan yang sah.
 */
export function sanitasiRencana<T>(x: unknown): T | null {
  const r = RencanaSkema.safeParse(x);
  if (!r.success) return null;
  const tindakan = r.data.tindakan.filter((t) => TindakanSkema.safeParse(t).success);
  const tas = r.data.tas.filter((t) => ItemTasSkema.safeParse(t).success);
  if (tindakan.length === 0) return null;
  return { ...r.data, tindakan, tas } as T;
}
