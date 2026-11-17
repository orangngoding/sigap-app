import { AlertTriangle, Info, WifiOff } from "lucide-react";

type Tone = "stale" | "offline" | "info" | "warning";

const TONES: Record<Tone, { cls: string; Icon: typeof Info }> = {
  stale: { cls: "bg-warning text-warning-foreground", Icon: AlertTriangle },
  warning: { cls: "bg-warning text-warning-foreground", Icon: AlertTriangle },
  offline: { cls: "bg-info text-info-foreground", Icon: WifiOff },
  info: { cls: "bg-info text-info-foreground", Icon: Info },
};

/** Pita keadaan: data lama, offline, mode ringkas, batas AI. Ikon + teks (tidak bergantung warna saja). */
export function StatusBanner({
  tone = "info",
  children,
  action,
}: {
  tone?: Tone;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  const { cls, Icon } = TONES[tone];
  return (
    <div role="status" className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-3 py-2 text-sm ${cls}`}>
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <span className="flex-1">{children}</span>
      {action}
    </div>
  );
}
