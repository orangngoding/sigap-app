import type { Metadata } from "next";
import { Suspense } from "react";
import { TanyaView } from "@/components/tanya/tanya-view";

export const metadata: Metadata = {
  title: "Asisten SIGAP",
  description: "Asisten AI kesiapsiagaan bencana: tanya dengan teks atau suara, dan minta penjelasan sederhana untuk teks peringatan dini BMKG.",
};

export default function TanyaPage() {
  return (
    <main id="konten" tabIndex={-1} data-halaman-chat className="flex-1 focus:outline-none">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-muted" aria-busy="true" />}>
          <TanyaView />
        </Suspense>
      </div>
    </main>
  );
}
