import Link from "next/link";
import { Check } from "lucide-react";

const STEPS = [
  { key: "lokasi", label: "Lokasi", href: "/lokasi" },
  { key: "profil", label: "Profil", href: "/rencana/profil" },
  { key: "rencana", label: "Rencana", href: "/rencana" },
] as const;

export type StepKey = (typeof STEPS)[number]["key"];

/** Tiga langkah alur inti; langkah yang sudah selesai dapat diklik (Blueprint 4.2). */
export function StepIndicator({ current, done = [] }: { current: StepKey; done?: StepKey[] }) {
  return (
    <nav aria-label="Kemajuan" className="mb-6">
      <ol className="flex items-center gap-2 text-sm">
        {STEPS.map((s, i) => {
          const isCurrent = s.key === current;
          const isDone = done.includes(s.key);
          const body = (
            <>
              <span
                className={`flex size-7 items-center justify-center rounded-full border text-xs font-semibold ${
                  isCurrent
                    ? "border-primary bg-primary text-primary-foreground"
                    : isDone
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-surface text-muted-foreground"
                }`}
              >
                {isDone && !isCurrent ? <Check className="size-4" aria-hidden="true" /> : i + 1}
              </span>
              <span className={isCurrent ? "font-semibold text-foreground" : "text-muted-foreground"}>{s.label}</span>
            </>
          );
          return (
            <li key={s.key} className="flex items-center gap-2" aria-current={isCurrent ? "step" : undefined}>
              {isDone && !isCurrent ? (
                <Link href={s.href} className="flex items-center gap-2 hover:underline any-pointer-coarse:min-h-11">{body}</Link>
              ) : (
                <span className="flex items-center gap-2">{body}</span>
              )}
              {i < STEPS.length - 1 && <span className="h-px w-6 bg-border sm:w-10" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
