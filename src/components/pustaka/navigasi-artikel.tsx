"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowUp, ListTree } from "lucide-react";

export interface BagianIsi {
  id: string;
  judul: string;
}

/**
 * Bagian artikel yang sedang dibaca: bagian terakhir yang bagian atasnya sudah melewati sepertiga layar.
 * Memakai IntersectionObserver (tanpa pendengar scroll dan tanpa membaca layout pada tiap gulir): garis sepertiga
 * layar menjadi tepi bawah area pantau, dan sebuah bagian dianggap "sudah dimulai" bila ia memotong area itu
 * atau sudah berada di atasnya.
 */
function useBagianAktif(bagian: BagianIsi[]): string | null {
  const [aktif, setAktif] = useState<string | null>(null);
  useEffect(() => {
    const urut = bagian.map((b) => b.id);
    const elemen = urut.map((id) => document.getElementById(id));
    // Satu kali membaca semua posisi (tanpa menulis ke DOM), dipanggil hanya saat ada persilangan atau scroll berhenti.
    const hitung = () => {
      const batas = window.innerHeight * 0.33;
      let terpilih: string | null = null;
      elemen.forEach((el, i) => {
        if (el && el.getBoundingClientRect().top <= batas) terpilih = urut[i];
      });
      setAktif(terpilih);
    };
    const io = new IntersectionObserver(hitung, { rootMargin: "0px 0px -67% 0px" });
    for (const el of elemen) if (el) io.observe(el);
    // IntersectionObserver tidak memberi tahu bila halaman melompat melewati area pantau (mis. "Ke atas" instan).
    window.addEventListener("scrollend", hitung);
    window.addEventListener("resize", hitung);
    return () => {
      io.disconnect();
      window.removeEventListener("scrollend", hitung);
      window.removeEventListener("resize", hitung);
    };
  }, [bagian]);
  return aktif;
}

const keAtas = () => {
  const kurangiGerak = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: 0, behavior: kurangiGerak ? "auto" : "smooth" });
};

/**
 * Bilah navigasi yang menempel di bawah header selama artikel dibaca: kembali ke Pustaka, bagian yang sedang
 * dibaca, daftar isi (di layar sempit, tempat kolom samping jatuh ke bawah isi), dan tombol ke atas.
 */
export function BilahArtikel({ bagian }: { bagian: BagianIsi[] }) {
  const aktif = useBagianAktif(bagian);
  const [buka, setBuka] = useState(false);
  const judulAktif = bagian.find((b) => b.id === aktif)?.judul ?? null;

  useEffect(() => {
    if (!buka) return;
    const tutup = (e: KeyboardEvent) => e.key === "Escape" && setBuka(false);
    document.addEventListener("keydown", tutup);
    return () => document.removeEventListener("keydown", tutup);
  }, [buka]);

  const tombol =
    "inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-semibold text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

  return (
    <div className="bilah-artikel tanpa-cetak kaca sticky top-16 z-30 border-b border-border/70">
      <div className="relative mx-auto flex max-w-7xl items-center gap-1 px-2 py-0.5 sm:px-4 lg:px-6">
        <Link href="/pustaka" className={tombol}>
          <ArrowLeft className="size-4" aria-hidden="true" /> Pustaka
        </Link>
        <p className="min-w-0 flex-1 truncate px-2 text-sm text-muted-foreground" aria-hidden="true">{judulAktif}</p>
        {bagian.length > 1 && (
          <button type="button" aria-expanded={buka} aria-controls="isi-ringkas" onClick={() => setBuka(!buka)} className={`${tombol} lg:hidden`}>
            <ListTree className="size-4" aria-hidden="true" /> Isi
          </button>
        )}
        <button type="button" onClick={keAtas} className={tombol} aria-label="Kembali ke atas halaman">
          <ArrowUp className="size-4" aria-hidden="true" /> <span className="hidden sm:inline">Ke atas</span>
        </button>

        {buka && (
          <nav id="isi-ringkas" aria-label="Daftar isi artikel" className="absolute right-2 top-full z-40 mt-1 w-72 max-w-[calc(100vw-1rem)] rounded-2xl border border-border bg-background p-2 shadow-xl lg:hidden">
            <ol>
              {bagian.map((b) => (
                <li key={b.id}>
                  <a
                    href={`#${b.id}`}
                    onClick={() => setBuka(false)}
                    aria-current={aktif === b.id ? "location" : undefined}
                    className={`flex min-h-11 items-center rounded-lg px-3 text-sm font-medium hover:bg-muted ${aktif === b.id ? "bg-primary/10 text-primary" : "text-foreground"}`}
                  >
                    {b.judul}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}
      </div>
    </div>
  );
}

/** Daftar isi di kolom samping (layar lebar) dengan penanda bagian yang sedang dibaca. */
export function DaftarIsiSamping({ bagian }: { bagian: BagianIsi[] }) {
  const aktif = useBagianAktif(bagian);
  return (
    <nav aria-label="Daftar isi" className="hidden rounded-3xl border border-border bg-surface p-5 lg:block">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Daftar isi</p>
      <ol className="mt-3 space-y-1">
        {bagian.map((b) => (
          <li key={b.id}>
            <a
              href={`#${b.id}`}
              aria-current={aktif === b.id ? "location" : undefined}
              className={`flex min-h-9 items-center rounded-lg px-2 text-sm font-medium hover:bg-muted hover:text-primary ${aktif === b.id ? "bg-primary/10 text-primary" : "text-foreground"}`}
            >
              {b.judul}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
