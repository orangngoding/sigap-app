// Teks Profil Risiko Lokasi untuk prompt AI (Asisten, Briefing): fakta tersusun per tingkat, tanpa koordinat.
import { HAZARD_BY_ID } from "@/lib/hazards/hazards";
import type { NilaiBahaya } from "./nilai";

const LABEL = { tinggi: "TINGGI", sedang: "PERLU DISIAPKAN", rendah: "RENDAH", "belum-diketahui": "BELUM TERBACA" } as const;

export function teksProfilRisiko(nilai: NilaiBahaya[]): string | null {
  if (!nilai.length) return null;
  const baris = nilai
    .filter((n) => n.tingkat !== "rendah" && n.tingkat !== "belum-diketahui")
    .map((n) => `- ${HAZARD_BY_ID[n.id].label} [${LABEL[n.tingkat]}]: ${n.alasan.join(" ")} (sumber: ${n.sumber})`);
  const rendah = nilai.filter((n) => n.tingkat === "rendah").map((n) => HAZARD_BY_ID[n.id].label);
  const belum = nilai.filter((n) => n.tingkat === "belum-diketahui").map((n) => HAZARD_BY_ID[n.id].label);
  if (rendah.length) baris.push(`- Risiko rendah menurut data: ${rendah.join(", ")}.`);
  if (belum.length) baris.push(`- Data belum terbaca untuk: ${belum.join(", ")} (jangan anggap aman).`);
  baris.push("- Catatan: saran dari data terbuka, bukan peta risiko resmi; kondisi tepat di sekitar rumah (sungai kecil, tebing) tidak terlihat.");
  return baris.join("\n");
}
