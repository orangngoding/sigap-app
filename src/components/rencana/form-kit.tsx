"use client";
import { AlertCircle, Check, Minus, Plus } from "lucide-react";

/** id elemen untuk sebuah kunci galat, mis. "kontakDarurat.0.nama" -> "field-kontakDarurat-0-nama". */
export const fieldId = (kunci: string) => `field-${kunci.replace(/\./g, "-")}`;

const FOKUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 flex items-start gap-1.5 text-sm font-medium text-danger-foreground">
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
}

const describedBy = (id: string, bantuan?: string, error?: string) =>
  [bantuan ? `${id}-bantuan` : null, error ? `${id}-galat` : null].filter(Boolean).join(" ") || undefined;

/** Stepper angka: tombol plus/minus 44 px + kolom isian (Blueprint 16.3). */
export function NumberStepper({
  name, label, bantuan, value, min, max, onChange, error,
}: {
  name: string; label: string; bantuan?: string; value: number; min: number; max: number;
  onChange: (v: number) => void; error?: string;
}) {
  const id = fieldId(name);
  const set = (v: number) => onChange(Math.min(max, Math.max(min, v)));
  const tombol = `inline-flex size-11 items-center justify-center rounded-lg border border-border bg-surface text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 ${FOKUS}`;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-foreground">{label}</label>
      {bantuan && <p id={`${id}-bantuan`} className="mt-0.5 text-sm text-muted-foreground">{bantuan}</p>}
      <div className="mt-2 inline-flex items-center gap-2">
        <button type="button" className={tombol} disabled={value <= min} onClick={() => set(value - 1)} aria-label={`Kurangi ${label}`}>
          <Minus className="size-4" aria-hidden="true" />
        </button>
        <input
          id={id} type="number" inputMode="numeric" min={min} max={max} value={value}
          aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, bantuan, error)}
          onChange={(e) => { const n = e.target.valueAsNumber; if (Number.isFinite(n)) set(Math.trunc(n)); }}
          className={`h-11 w-16 rounded-lg border bg-surface text-center text-base font-semibold tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${error ? "border-destructive" : "border-input"} ${FOKUS}`}
        />
        <button type="button" className={tombol} disabled={value >= max} onClick={() => set(value + 1)} aria-label={`Tambah ${label}`}>
          <Plus className="size-4" aria-hidden="true" />
        </button>
      </div>
      <FieldError id={`${id}-galat`} message={error} />
    </div>
  );
}

const OPSI = "group inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:checked]:ring-1 has-[:checked]:ring-primary has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary";
const CENTANG = <Check className="hidden size-4 text-primary group-has-[:checked]:block" aria-hidden="true" />;

/** Pilihan tunggal berbentuk kartu (radio asli, dapat dioperasikan dengan keyboard). Terpilih = garis + centang, bukan hanya warna. */
export function RadioGroup<T extends string | number>({
  name, legend, bantuan, options, value, onChange, error, tampilLegend = true,
}: {
  name: string; legend: string; bantuan?: string; options: ReadonlyArray<{ value: T; label: string }>;
  value: T | null; onChange: (v: T) => void; error?: string; tampilLegend?: boolean;
}) {
  const id = fieldId(name);
  return (
    <fieldset id={id} tabIndex={-1} aria-describedby={describedBy(id, bantuan, error)} className="min-w-0 focus:outline-none">
      <legend className={tampilLegend ? "text-sm font-semibold text-foreground" : "sr-only"}>{legend}</legend>
      {bantuan && <p id={`${id}-bantuan`} className="mt-0.5 text-sm text-muted-foreground">{bantuan}</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((o) => (
          <label key={String(o.value)} className={OPSI}>
            <input
              type="radio" name={name} className="sr-only" value={String(o.value)}
              checked={value !== null && String(value) === String(o.value)} onChange={() => onChange(o.value)}
            />
            {CENTANG}
            {o.label}
          </label>
        ))}
      </div>
      <FieldError id={`${id}-galat`} message={error} />
    </fieldset>
  );
}

export const YA_TIDAK = [
  { value: "ya", label: "Ya" },
  { value: "tidak", label: "Tidak" },
] as const;

/** Ya/Tidak untuk nilai boolean (null = belum dipilih). */
export function YaTidak({
  name, legend, bantuan, value, onChange, error,
}: {
  name: string; legend: string; bantuan?: string; value: boolean | null; onChange: (v: boolean) => void; error?: string;
}) {
  return (
    <RadioGroup
      name={name} legend={legend} bantuan={bantuan} options={YA_TIDAK} error={error}
      value={value === null ? null : value ? "ya" : "tidak"} onChange={(v) => onChange(v === "ya")}
    />
  );
}

/** Pilihan ganda (checkbox asli) dengan gaya yang sama. */
export function CheckboxGroup<T extends string>({
  name, legend, bantuan, options, value, onChange, error,
}: {
  name: string; legend: string; bantuan?: string; options: ReadonlyArray<{ value: T; label: string }>;
  value: T[]; onChange: (v: T[]) => void; error?: string;
}) {
  const id = fieldId(name);
  return (
    <fieldset id={id} tabIndex={-1} aria-describedby={describedBy(id, bantuan, error)} className="min-w-0 focus:outline-none">
      <legend className="text-sm font-semibold text-foreground">{legend}</legend>
      {bantuan && <p id={`${id}-bantuan`} className="mt-0.5 text-sm text-muted-foreground">{bantuan}</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((o) => {
          const aktif = value.includes(o.value);
          return (
            <label key={o.value} className={OPSI}>
              <input
                type="checkbox" className="sr-only" checked={aktif}
                onChange={() => onChange(aktif ? value.filter((x) => x !== o.value) : [...value, o.value])}
              />
              {CENTANG}
              {o.label}
            </label>
          );
        })}
      </div>
      <FieldError id={`${id}-galat`} message={error} />
    </fieldset>
  );
}

/** Kolom teks dengan label di atas, bantuan, dan galat terhubung lewat ARIA (Blueprint 16.6). */
export function TextField({
  name, label, bantuan, value, onChange, error, maxLength, multiline, inputMode, placeholder, autoComplete,
}: {
  name: string; label: string; bantuan?: string; value: string; onChange: (v: string) => void; error?: string;
  maxLength?: number; multiline?: boolean; inputMode?: "text" | "tel" | "numeric"; placeholder?: string; autoComplete?: string;
}) {
  const id = fieldId(name);
  const cls = `mt-2 w-full rounded-lg border bg-surface px-3 py-2.5 text-base text-foreground placeholder:text-muted-foreground ${error ? "border-destructive" : "border-input"} ${FOKUS}`;
  const umum = {
    id, value, maxLength, placeholder, autoComplete,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy(id, bantuan, error),
  } as const;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-foreground">{label}</label>
      {bantuan && <p id={`${id}-bantuan`} className="mt-0.5 text-sm text-muted-foreground">{bantuan}</p>}
      {multiline ? (
        <textarea {...umum} rows={3} onChange={(e) => onChange(e.target.value)} className={cls} />
      ) : (
        <input {...umum} type="text" inputMode={inputMode} onChange={(e) => onChange(e.target.value)} className={`${cls} min-h-11`} />
      )}
      {maxLength && <p className="mt-1 text-right text-xs text-muted-foreground" aria-hidden="true">{value.length}/{maxLength}</p>}
      <FieldError id={`${id}-galat`} message={error} />
    </div>
  );
}
