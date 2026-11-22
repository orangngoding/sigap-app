import { ExternalLink } from "lucide-react";
import type { SumberData } from "@/types";
import { waktuMutlak, waktuRelatif } from "@/lib/utils/format";

/** Lencana sumber: nama, waktu pengambilan (relatif; mutlak saat disorot), tautan. Wajib di setiap kartu data. */
export function SumberBadge({ sumber }: { sumber: SumberData }) {
  return (
    <a
      href={sumber.url}
      target="_blank"
      rel="noreferrer"
      title={`Diambil ${waktuMutlak(sumber.diambilPada)}${sumber.lisensi ? ` · ${sumber.lisensi}` : ""}`}
      // Nama dan waktu satu aliran teks: bila nama panjang, teks terlipat rapi seperti kalimat (bukan kolom sempit);
      // waktu tidak pernah dipecah. Sudut membulat tetap rapi baik satu maupun dua baris.
      className="inline-flex max-w-full items-start gap-1.5 rounded-xl border border-border bg-muted px-2.5 py-1 text-xs leading-snug text-muted-foreground transition-colors hover:text-primary"
    >
      <span className="min-w-0">
        <span className="font-semibold text-foreground">{sumber.nama}</span>{" "}
        <span className="whitespace-nowrap">· {waktuRelatif(sumber.diambilPada)}</span>
      </span>
      <ExternalLink className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
    </a>
  );
}
