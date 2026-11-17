import type { ProfilAnonim, ProfilRumahTangga } from "@/types";

/** Buang isian pribadi: nama, telepon, titik kumpul, catatan tidak pernah keluar dari perangkat. */
export function anonimkan(p: ProfilRumahTangga): ProfilAnonim {
  const { titikKumpul: _t, kontakDarurat: _k, catatanKhusus: _c, ...sisa } = p;
  void _t; void _k; void _c;
  return sisa;
}

function urut(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(urut);
  if (v && typeof v === "object") {
    return Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, x]) => [k, urut(x)]));
  }
  return v;
}

/** FNV-1a 32-bit atas JSON terurut; cukup untuk mendeteksi perubahan masukan. */
export function hashMasukan(adm4: string, p: ProfilAnonim): string {
  const bahaya = [...p.bahaya].sort();
  const s = JSON.stringify(urut({ adm4, ...p, bahaya, varianBanjir: [...p.varianBanjir].sort(), jenisDisabilitas: [...p.jenisDisabilitas].sort() }));
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}
