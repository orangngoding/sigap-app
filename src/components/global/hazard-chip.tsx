import type { HazardId } from "@/types";
import { HAZARD_BY_ID } from "@/lib/hazards/hazards";

/** Chip bahaya. `segera` = konten belum memenuhi minimum: tampil, tetapi tidak dapat dipilih. */
export function HazardChip({
  id,
  selected,
  segera,
  onToggle,
}: {
  id: HazardId;
  selected?: boolean;
  segera?: boolean;
  onToggle?: (id: HazardId) => void;
}) {
  const h = HAZARD_BY_ID[id];
  const interactive = Boolean(onToggle) && !segera;
  return (
    <button
      type="button"
      disabled={!interactive}
      aria-pressed={interactive ? Boolean(selected) : undefined}
      onClick={() => onToggle?.(id)}
      className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-default ${
        selected ? "border-primary bg-primary/10 text-foreground" : "border-border bg-surface text-foreground"
      } ${segera ? "opacity-60" : ""}`}
    >
      <span className={`size-2.5 rounded-full bg-current ${h.colorClass}`} aria-hidden="true" />
      {h.label}
      {segera && <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">Segera hadir</span>}
    </button>
  );
}
