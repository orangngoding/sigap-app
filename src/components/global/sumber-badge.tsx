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
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-primary"
    >
      <span className="font-semibold text-foreground">{sumber.nama}</span>
      <span>· {waktuRelatif(sumber.diambilPada)}</span>
      <ExternalLink className="size-3" aria-hidden="true" />
    </a>
  );
}
