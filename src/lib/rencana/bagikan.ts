// Teks Rencana Siaga untuk dibagikan ke keluarga (WhatsApp atau menu Bagikan perangkat).
// Dibuat di perangkat; hanya dikirim bila pengguna sendiri menekan Bagikan. Nomor kontak keluarga tidak disertakan.
import type { HazardId, Lokasi } from "@/types";
import type { ItemTas, Tindakan } from "@/types/rencana";
import { HAZARD_BY_ID } from "@/lib/hazards/hazards";
import { langkahSaat } from "./ringkas-saat";

export const MAKS_TEKS_BAGIKAN = 1800;

export interface MasukanBagikan {
  lokasi: Pick<Lokasi, "kelurahan" | "kecamatan" | "kabKota">;
  bahaya: HazardId[];
  tindakan: Tindakan[];
  tas: ItemTas[];
  titikKumpul?: string;
  urlDarurat?: string;
}

export function teksBagikan(m: MasukanBagikan): string {
  const baris: string[] = [
    "*Rencana Siaga Keluarga* (SIGAP)",
    `${m.lokasi.kelurahan}, Kec. ${m.lokasi.kecamatan}, ${m.lokasi.kabKota}`,
    "",
    "Darurat: *112*",
  ];
  if (m.titikKumpul?.trim()) baris.push(`Titik kumpul keluarga: *${m.titikKumpul.trim()}*`);
  for (const g of langkahSaat(m.tindakan, m.bahaya, 2)) {
    if (g.hazard === "umum") continue;
    baris.push("", `*Saat ${HAZARD_BY_ID[g.hazard].label.toLowerCase()}:*`, ...g.langkah.map((t) => `- ${t.title}`));
  }
  const tas = m.tas.slice(0, 8).map((i) => i.nama.replace(/\s*\(.*\)$/, "")).join(", ");
  if (tas) baris.push("", `*Isi tas siaga:* ${tas}${m.tas.length > 8 ? ", dll." : "."}`);
  if (m.urlDarurat) baris.push("", `Langkah darurat (bisa dibuka tanpa internet setelah sekali dibuka): ${m.urlDarurat}`);
  baris.push("", "Ikuti selalu arahan BPBD, BMKG, dan petugas setempat.");
  let teks = baris.join("\n");
  if (teks.length > MAKS_TEKS_BAGIKAN) teks = `${teks.slice(0, MAKS_TEKS_BAGIKAN - 1).trimEnd()}…`;
  return teks;
}

export const tautanWhatsApp = (teks: string) => `https://wa.me/?text=${encodeURIComponent(teks)}`;
