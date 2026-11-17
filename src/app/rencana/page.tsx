import type { Metadata } from "next";
import { Suspense } from "react";
import { RencanaView } from "@/components/rencana/rencana-view";

export const metadata: Metadata = {
  title: "Rencana Siaga",
  description: "Rencana kesiapsiagaan keluarga: skor, faktor yang perlu diperhatikan, dan Tas Siaga sesuai profil Anda.",
};

export default function RencanaPage() {
  return (
    <main id="konten" tabIndex={-1} className="flex-1 focus:outline-none">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        {/* useSearchParams() di komponen klien wajib dibungkus Suspense agar build statis lolos */}
        <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-muted" aria-busy="true" />}>
          <RencanaView />
        </Suspense>
      </div>
    </main>
  );
}
