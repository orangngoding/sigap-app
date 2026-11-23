"use client";
import { Copy, Share2 } from "lucide-react";
import type { HazardId, Lokasi } from "@/types";
import type { ItemTas, Tindakan } from "@/types/rencana";
import { tautanWhatsApp, teksBagikan } from "@/lib/rencana/bagikan";
import { toast } from "@/lib/toast";
import { URL_DARURAT } from "@/lib/situs";

const CLS = "inline-flex min-h-12 items-center gap-2 rounded-lg border border-border bg-surface px-5 text-sm font-semibold hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

/** Bagikan ringkasan rencana ke keluarga lewat WhatsApp, atau salin teksnya. Nomor kontak tidak ikut. */
export function TombolBagikan(p: { lokasi: Lokasi; bahaya: HazardId[]; tindakan: Tindakan[]; tas: ItemTas[]; titikKumpul?: string }) {
  const teks = () => teksBagikan({ ...p, urlDarurat: URL_DARURAT });

  const salin = async () => {
    try {
      await navigator.clipboard.writeText(teks());
      toast("Teks rencana disalin. Tempel di grup keluarga.");
    } catch {
      toast("Teks belum dapat disalin di peramban ini.");
    }
  };

  return (
    <>
      <button type="button" onClick={() => window.open(tautanWhatsApp(teks()), "_blank", "noopener,noreferrer")} className={CLS}>
        <Share2 className="size-4" aria-hidden="true" /> Bagikan ke keluarga (WhatsApp)
      </button>
      <button type="button" onClick={() => void salin()} className={CLS}>
        <Copy className="size-4" aria-hidden="true" /> Salin teks rencana
      </button>
    </>
  );
}
