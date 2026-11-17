
"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export interface Opsi {
  kode: string;
  nama: string;
}

/** Combobox ARIA 1.2: ketik untuk mencari, panah atas/bawah, Enter memilih, Esc menutup. */
export function Combobox({
  label,
  options,
  value,
  onChange,
  disabled,
  placeholder = "Ketik untuk mencari…",
}: {
  label: string;
  options: Opsi[];
  value: string | null;
  onChange: (kode: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const id = useId();
  const selected = options.find((o) => o.kode === value) ?? null;

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const wrap = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return (
      q
        ? options.filter((o) => o.nama.toLowerCase().includes(q))
        : options
    ).slice(0, 100);
  }, [options, query]);

  // Menutup dropdown ketika pengguna mengklik di luar komponen.
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", close);

    return () => {
      document.removeEventListener("mousedown", close);
    };
  }, []);

  function pick(o: Opsi) {
    onChange(o.kode);
    setQuery("");
    setActive(0);
    setOpen(false);
  }

  return (
    <div ref={wrap} className="relative">
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-foreground"
      >
        {label}
      </label>

      <div className="relative">
        <input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-activedescendant={
            open && filtered[active]
              ? `${id}-o${active}`
              : undefined
          }
          disabled={disabled}
          autoComplete="off"
          value={open ? query : selected?.nama ?? ""}
          placeholder={
            disabled
              ? "Pilih tingkat sebelumnya dulu"
              : placeholder
          }
          onFocus={() => {
            setActive(0);
            setOpen(true);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();

              if (!open) {
                setActive(0);
                setOpen(true);
              } else {
                setActive((a) =>
                  Math.min(a + 1, Math.max(filtered.length - 1, 0))
                );
              }
            } else if (e.key === "ArrowUp") {
              e.preventDefault();

              setActive((a) => Math.max(a - 1, 0));
            } else if (
              e.key === "Enter" &&
              open &&
              filtered[active]
            ) {
              e.preventDefault();
              pick(filtered[active]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          className="h-12 w-full rounded-lg border border-border bg-surface px-3 pr-9 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
        />

        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
      </div>

      {open && !disabled && (
        <ul
          id={`${id}-list`}
          role="listbox"
          aria-label={label}
          className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-border bg-surface p-1 shadow-lg"
        >
          {filtered.length === 0 && (
            <li className="px-3 py-2 text-sm text-muted-foreground">
              Tidak ditemukan
            </li>
          )}

          {filtered.map((o, i) => (
            <li
              key={o.kode}
              id={`${id}-o${i}`}
              role="option"
              aria-selected={o.kode === value}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(o);
              }}
              onMouseEnter={() => setActive(i)}
              className={`min-h-11 cursor-pointer rounded-md px-3 py-2.5 text-sm ${
                i === active
                  ? "bg-accent text-accent-foreground"
                  : ""
              } ${
                o.kode === value ? "font-semibold" : ""
              }`}
            >
              {o.nama}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
