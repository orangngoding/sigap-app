import { ShieldAlert } from "lucide-react";

export const PENAFIAN_STANDAR =
  "SIGAP membantu menyusun rencana kesiapsiagaan dari panduan umum, data resmi, dan jawaban Anda. SIGAP bukan sistem peringatan dini, tidak memprediksi bencana, dan bukan pengganti arahan BPBD, BMKG, atau petugas berwenang. Dalam keadaan darurat hubungi 112 dan ikuti arahan resmi.";
export const PENAFIAN_RINGKAS = "Bukan pengganti arahan BPBD, BMKG, atau petugas berwenang.";

/** Kotak penafian standar (Blueprint 5.1 dan 16.5). */
export function DisclaimerBox() {
  return (
    <aside className="flex items-start gap-3 rounded-xl border border-border bg-muted p-4 text-sm text-muted-foreground">
      <ShieldAlert className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
      <p>{PENAFIAN_STANDAR}</p>
    </aside>
  );
}
