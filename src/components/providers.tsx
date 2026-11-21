"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { MotionConfig } from "motion/react";
import { PerbaruiKoordinat } from "./global/perbarui-koordinat";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false } } }),
  );
  // reducedMotion="user": animasi Motion berhenti bila perangkat meminta "kurangi gerakan".
  return (
    <MotionConfig reducedMotion="user">
      <QueryClientProvider client={client}>
        <PerbaruiKoordinat />
        {children}
      </QueryClientProvider>
    </MotionConfig>
  );
}
