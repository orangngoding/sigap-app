import { z } from "zod";
import type { ProfilRumahTangga } from "@/types";
import type { ErrorMap, ProfilDraft } from "@/types/rencana";
import { HAZARD_BY_ID } from "@/lib/hazards/hazards";
import { isHazardAktif } from "@/lib/hazards/pack-status";
import { BATAS_PROFIL as B } from "./constants";
import { rapikanProfil } from "./profil-awal";

const HAZARD_IDS = [
  "banjir", "longsor", "gempa", "cuaca_ekstrem", "tsunami",
  "kekeringan", "karhutla", "gunung_api", "gelombang_abrasi",
] as const;
const BANGUNAN = ["rumah_1_lantai", "rumah_bertingkat", "apartemen", "kos", "lainnya"] as const;

const hitungan = z
  .number({ message: "Isi dengan angka." })
  .int("Gunakan bilangan bulat.")
  .min(0, "Tidak boleh kurang dari 0.");

// ---------- Langkah 1: bahaya ----------
const Langkah1 = z
  .object({
    bahaya: z.array(z.enum(HAZARD_IDS)).min(1, "Pilih setidaknya satu bahaya."),
    varianBanjir: z.array(z.enum(["genangan", "sungai", "bandang", "rob"])),
    jawabanPemicu: z.record(z.string(), z.enum(["ya", "tidak", "tidak_tahu"])),
  })
  .superRefine((v, ctx) => {
    for (const id of v.bahaya) {
      if (!isHazardAktif(id)) {
        ctx.addIssue({ code: "custom", path: ["bahaya"], message: `${HAZARD_BY_ID[id].label} belum tersedia dan tidak dapat dipilih.` });
        break;
      }
    }
  });

// ---------- Langkah 2: keluarga ----------
const Langkah2 = z
  .object({
    jumlahAnggota: z
      .number({ message: "Isi jumlah anggota keluarga." })
      .int("Gunakan bilangan bulat.")
      .min(B.anggotaMin, `Jumlah anggota minimal ${B.anggotaMin}.`)
      .max(B.anggotaMaks, `Jumlah anggota maksimal ${B.anggotaMaks}.`),
    lansia: hitungan,
    balita: hitungan,
    hamil: hitungan,
    disabilitas: hitungan,
    jenisDisabilitas: z.array(z.enum(["mobilitas", "penglihatan", "pendengaran", "kognitif", "lainnya"])),
    obatRutin: z.boolean(),
    jumlahObatRutin: z.number().int(),
    hewanPeliharaan: z.boolean(),
  })
  .superRefine((v, ctx) => {
    for (const k of ["lansia", "balita", "hamil", "disabilitas"] as const) {
      if (v[k] > v.jumlahAnggota) {
        ctx.addIssue({ code: "custom", path: [k], message: `Tidak boleh melebihi jumlah anggota (${v.jumlahAnggota}).` });
      }
    }
    if (v.obatRutin && (v.jumlahObatRutin < 1 || v.jumlahObatRutin > v.jumlahAnggota)) {
      ctx.addIssue({ code: "custom", path: ["jumlahObatRutin"], message: `Isi 1 sampai ${v.jumlahAnggota} orang.` });
    }
  });

// ---------- Langkah 3: rumah dan kondisi ----------
const Kontak = z.object({
  nama: z.string().trim().min(1, "Isi nama kontak.").max(B.namaKontakMaks, `Nama maksimal ${B.namaKontakMaks} karakter.`),
  telepon: z
    .string()
    .trim()
    .regex(/^[0-9+\- ]{6,16}$/, `Nomor ${B.teleponMin}-${B.teleponMaks} karakter: hanya angka, +, spasi, atau minus.`),
});

const Langkah3 = z
  .object({
    bangunan: z.enum(BANGUNAN).nullable(),
    lantaiTinggal: z
      .number({ message: "Isi dengan angka." })
      .int("Gunakan bilangan bulat.")
      .min(B.lantaiMin, `Lantai minimal ${B.lantaiMin}.`)
      .max(B.lantaiMaks, `Lantai maksimal ${B.lantaiMaks}.`)
      .optional(),
    punyaKendaraan: z.boolean().nullable(),
    persediaanHari: z.union([z.literal(3), z.literal(5), z.literal(7)], { message: "Pilih 3, 5, atau 7 hari." }),
    titikKumpul: z.string().max(B.titikKumpulMaks, `Maksimal ${B.titikKumpulMaks} karakter.`).optional(),
    kontakDarurat: z.array(Kontak).max(B.kontakMaks, `Maksimal ${B.kontakMaks} kontak.`),
    catatanKhusus: z.string().max(B.catatanMaks, `Maksimal ${B.catatanMaks} karakter.`).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.bangunan === null) ctx.addIssue({ code: "custom", path: ["bangunan"], message: "Pilih jenis bangunan tempat tinggal." });
    if (v.punyaKendaraan === null) ctx.addIssue({ code: "custom", path: ["punyaKendaraan"], message: "Pilih Ya atau Tidak." });
  });

const SKEMA = { 1: Langkah1, 2: Langkah2, 3: Langkah3 } as const;

/** Peta galat per field; urutan kunci mengikuti urutan field pada skema (untuk fokus ke galat pertama). */
export function validasiLangkah(langkah: 1 | 2 | 3, profil: ProfilDraft): ErrorMap {
  const hasil = SKEMA[langkah].safeParse(profil);
  if (hasil.success) return {};
  const out: ErrorMap = {};
  for (const isu of hasil.error.issues) {
    const kunci = isu.path.join(".");
    if (!(kunci in out)) out[kunci] = isu.message;
  }
  return out;
}

export const profilLengkap = (profil: ProfilDraft): boolean =>
  ([1, 2, 3] as const).every((l) => Object.keys(validasiLangkah(l, rapikanProfil(profil))).length === 0);

/** Ubah isian menjadi ProfilRumahTangga penuh; null bila masih ada langkah yang belum valid. */
export function finalisasiProfil(draft: ProfilDraft): ProfilRumahTangga | null {
  const p = rapikanProfil(draft);
  if (!profilLengkap(p) || p.bangunan === null || p.punyaKendaraan === null) return null;
  const titik = p.titikKumpul?.trim();
  const catatan = p.catatanKhusus?.trim();
  return {
    ...p,
    bangunan: p.bangunan,
    punyaKendaraan: p.punyaKendaraan,
    titikKumpul: titik ? titik : undefined,
    catatanKhusus: catatan ? catatan : undefined,
    kontakDarurat: p.kontakDarurat.map((k) => ({ nama: k.nama.trim(), telepon: k.telepon.trim() })),
  };
}
