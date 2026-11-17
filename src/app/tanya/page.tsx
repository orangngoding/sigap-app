import type { Metadata } from "next";
import { Suspense } from "react";
import { TanyaView } from "@/components/tanya/tanya-view";

export const metadata: Metadata = {
  title: "Tanya SIGAP",
  description: "Tanya jawab kesiapsiagaan bencana berdasarkan sumber resmi, dan penjelasan sederhana untuk teks peringatan dini.",
};

export default function TanyaPage() {
  return (
    <main id="konten" tabIndex={-1} className="flex-1 focus:outline-none">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-muted" aria-busy="true" />}>
          <TanyaView />
        </Suspense>
      </div>
    </main>
  );
}
