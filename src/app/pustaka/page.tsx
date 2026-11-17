import type { Metadata } from "next";
import Link from "next/link";
import { Clock } from "lucide-react";
import { SEMUA_ARTIKEL } from "@/lib/pustaka/data";
import { HAZARD_BY_ID } from "@/lib/hazards/hazards";
import type { HazardId } from "@/types";

export const metadata: Metadata = {
  title: "Pustaka",
  description: "Panduan singkat kesiapsiagaan bencana yang disusun dari sumber resmi BNPB dan BMKG.",
};

export default function PustakaPage() {
  return (
    <main id="konten" tabIndex={-1} className="flex-1 focus:outline-none">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Pustaka</h1>
        <p className="mt-2 text-muted-foreground">Panduan singkat yang bisa dibaca tanpa mengisi profil. Setiap butir menyebut sumbernya.</p>
        <ul className="mt-8 space-y-4">
          {SEMUA_ARTIKEL.map((a) => (
            <li key={a.slug}>
              <Link href={`/pustaka/${a.slug}`} className="block rounded-2xl border border-border bg-surface p-5 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                <h2 className="text-lg font-bold">{a.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{a.ringkasan}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Clock className="size-3.5" aria-hidden="true" /> {a.menit} menit baca</span>
                  {a.hazards.map((h) => (
                    <span key={h} className="rounded-full bg-muted px-2 py-0.5">{h === "umum" ? "Umum" : (HAZARD_BY_ID[h as HazardId]?.label ?? h)}</span>
                  ))}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
