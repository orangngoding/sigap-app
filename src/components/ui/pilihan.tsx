"use client";
import { Select } from "radix-ui";
import { Check, ChevronDown, type LucideIcon } from "lucide-react";

export interface OpsiPilihan {
  nilai: string;
  label: string;
  Ikon?: LucideIcon;
  /** Kelas warna ikon (mis. warna bahaya). */
  warnaIkon?: string;
  /** Angka kecil di kanan (mis. jumlah artikel). */
  jumlah?: number;
}

/**
 * Menu pilihan bergaya SIGAP (Radix Select): pemicu berbentuk pil, panel bersudut bulat dengan ikon, jumlah,
 * dan tanda centang. Bisa dipakai dengan papan ketik (panah, Enter, Esc, ketik huruf awal) dan pembaca layar.
 */
export function Pilihan({
  id, nilai, onUbah, opsi, labelAria, className = "",
}: { id?: string; nilai: string; onUbah: (v: string) => void; opsi: OpsiPilihan[]; labelAria?: string; className?: string }) {
  const aktif = opsi.find((o) => o.nilai === nilai);
  return (
    <Select.Root value={nilai} onValueChange={onUbah}>
      <Select.Trigger
        id={id}
        aria-label={labelAria}
        className={`group inline-flex min-h-11 items-center justify-between gap-2 rounded-full border border-border bg-surface pl-4 pr-3 text-sm font-semibold text-foreground shadow-sm transition-colors hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary data-[state=open]:border-primary ${className}`}
      >
        <span className="flex min-w-0 items-center gap-2">
          {aktif?.Ikon && <aktif.Ikon className={`size-4 shrink-0 ${aktif.warnaIkon ?? "text-muted-foreground"}`} aria-hidden="true" />}
          <span className="truncate"><Select.Value /></span>
        </span>
        <Select.Icon asChild>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          position="popper"
          sideOffset={6}
          collisionPadding={16}
          className="z-50 max-h-[min(22rem,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-2xl border border-border bg-surface shadow-xl shadow-ink/10 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <Select.Viewport className="p-1.5">
            {opsi.map((o) => (
              <Select.Item
                key={o.nilai}
                value={o.nilai}
                className="relative flex min-h-11 cursor-pointer select-none items-center gap-3 rounded-xl py-2 pl-3 pr-9 text-sm text-foreground outline-none data-[highlighted]:bg-muted data-[state=checked]:font-semibold data-[state=checked]:text-primary"
              >
                {o.Ikon && (
                  <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-muted/70" aria-hidden="true">
                    <o.Ikon className={`size-4 ${o.warnaIkon ?? "text-muted-foreground"}`} />
                  </span>
                )}
                <Select.ItemText>{o.label}</Select.ItemText>
                {o.jumlah !== undefined && <span className="ml-auto text-xs tabular-nums text-muted-foreground" aria-hidden="true">{o.jumlah}</span>}
                <Select.ItemIndicator className="absolute right-3 inline-flex">
                  <Check className="size-4 text-primary" strokeWidth={2.5} aria-hidden="true" />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
