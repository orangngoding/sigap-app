// Aksi aplikasi yang boleh disarankan Asisten di bawah jawaban (tombol "Buka tab Tas Siaga", "Mulai latihan").
// Model hanya memilih id dari daftar ini; tautan dibuat kode, jadi AI tidak bisa mengarang URL.
import { SKENARIO } from "@/lib/latihan/skenario";
import { SEMUA_ARTIKEL } from "@/lib/pustaka/data";

export interface AksiAplikasi {
  id: string;
  label: string;
  href: string;
}

const DASAR: AksiAplikasi[] = [
  { id: "rencana", label: "Buka Rencana Siaga", href: "/rencana" },
  { id: "rencana-tindakan", label: "Lihat tindakan rencana", href: "/rencana?tab=tindakan" },
  { id: "rencana-tas", label: "Periksa Tas Siaga", href: "/rencana?tab=tas" },
  { id: "kartu", label: "Buat Kartu Siaga", href: "/rencana/kartu" },
  { id: "profil", label: "Ubah profil keluarga", href: "/rencana/profil" },
  { id: "lokasi", label: "Lihat cuaca dan peringatan di lokasi", href: "/lokasi" },
  { id: "darurat", label: "Buka Mode Darurat", href: "/darurat" },
  { id: "latihan", label: "Lihat semua Latihan Siaga", href: "/latihan" },
  { id: "pustaka", label: "Buka Pustaka", href: "/pustaka" },
];

export const SEMUA_AKSI: AksiAplikasi[] = [
  ...DASAR,
  ...SKENARIO.map((s) => ({ id: `latihan-${s.id}`, label: `Latihan: ${s.judul}`, href: `/latihan/${s.id}` })),
  ...SEMUA_ARTIKEL.map((a) => ({ id: `pustaka-${a.slug}`, label: `Baca: ${a.title}`, href: `/pustaka/${a.slug}` })),
];

const PETA = new Map(SEMUA_AKSI.map((a) => [a.id, a]));

/** Daftar ringkas untuk prompt: satu baris "id: label" per aksi. */
export const teksDaftarAksi = (): string => SEMUA_AKSI.map((a) => `${a.id}: ${a.label}`).join("\n");

/** Id dari model -> aksi sah, tanpa duplikat, maksimal 2. Id tak dikenal dibuang. */
export function aksiSah(ids: string[], maks = 2): AksiAplikasi[] {
  const out: AksiAplikasi[] = [];
  for (const id of ids) {
    const a = PETA.get(id.trim());
    if (a && !out.some((x) => x.id === a.id)) out.push(a);
    if (out.length >= maks) break;
  }
  return out;
}

export const aksiDarurat = (): AksiAplikasi[] => [PETA.get("darurat")!];
