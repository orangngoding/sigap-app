"use client";
import { useEffect, useState } from "react";
import { motion } from "motion/react";

/** Daftar isi yang menyorot bagian yang sedang dibaca (IntersectionObserver, tanpa mengubah scroll). */
export function DaftarIsi({ butir }: { butir: Array<{ id: string; judul: string }> }) {
  const [aktif, setAktif] = useState(butir[0]?.id);

  useEffect(() => {
    const amati = new IntersectionObserver(
      (entri) => {
        const terlihat = entri.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (terlihat[0]) setAktif(terlihat[0].target.id);
      },
      { rootMargin: "-20% 0px -65% 0px" },
    );
    for (const b of butir) {
      const el = document.getElementById(b.id);
      if (el) amati.observe(el);
    }
    return () => amati.disconnect();
  }, [butir]);

  return (
    <nav aria-label="Isi halaman" className="tanpa-cetak">
      <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Isi halaman</p>
      <ol className="mt-2 space-y-0.5">
        {butir.map((b, i) => (
          <li key={b.id} className="relative">
            {aktif === b.id && <motion.span layoutId="daftar-isi-aktif" className="absolute inset-0 rounded-lg bg-primary/10" transition={{ type: "spring", stiffness: 420, damping: 36 }} />}
            <a
              href={`#${b.id}`} aria-current={aktif === b.id ? "location" : undefined}
              className={`relative flex min-h-9 any-pointer-coarse:min-h-11 items-center gap-2 rounded-lg px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-primary ${aktif === b.id ? "font-semibold text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              <span className="w-5 text-xs tabular-nums opacity-60">{i + 1}</span> {b.judul}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
