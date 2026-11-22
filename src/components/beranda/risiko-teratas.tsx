"use client";
import Link from "next/link";
import { ArrowRight, Database, MapPin, Sparkles } from "lucide-react";
import { useHydrate } from "@/hooks/use-hydrate";
import { useRisikoLokasi } from "@/hooks/use-risiko-lokasi";
import { useLokasiStore } from "@/stores/lokasi-store";
import { HAZARD_BY_ID } from "@/lib/hazards/hazards";
import { IKON_BAHAYA } from "@/lib/hazards/ikon";
import { disarankanData } from "@/lib/risiko/nilai";
import { LencanaTingkat } from "@/components/risiko/profil-risiko";
import { TeksPihak } from "@/components/rencana/teks-pihak";

const BUNGKUS = "mx-auto max-w-7xl px-4 pb-4 sm:px-6 lg:px-8";
const SUMBER = ["Smithsonian GVP", "USGS", "NOAA NCEI", "SRTM", "NASA"];

/** Beranda: tiga risiko teratas di titik rumah pengguna, dari data (Profil Risiko Lokasi). */
export function RisikoTeratas() {
  const siap = useHydrate(useLokasiStore);
  const lokasi = useLokasiStore((s) => s.lokasi);
  const q = useRisikoLokasi(siap ? lokasi : null);

  if (!siap) return null;
  // Tanpa lokasi: satu kartu, satu tombol. Memilih lokasi sekali membuka briefing harian dan risiko titik rumah.
  if (!lokasi)
    return (
      <section aria-labelledby="judul-risiko-teratas" className="mx-auto max-w-7xl px-4 pb-4 pt-12 sm:px-6 lg:px-8">
        <div className="grid gap-5 rounded-2xl border border-border bg-surface p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <h2 id="judul-risiko-teratas" className="text-lg font-bold text-foreground">Bencana apa yang mengintai rumahmu?</h2>
            <p className="mt-1 text-sm text-muted-foreground">Pilih lokasi sekali, SIGAP langsung menyiapkan dua hal ini:</p>
            <ul className="mt-4 grid gap-3 md:grid-cols-2">
              <li className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Sparkles className="size-4" aria-hidden="true" /></span>
                <span>
                  <span className="block text-sm font-semibold text-foreground">Briefing Siaga Hari Ini</span>
                  <span className="block text-sm leading-relaxed text-muted-foreground">Cuaca, gempa, dan peringatan BMKG di wilayahmu, beserta 3 tindakan untuk keluarga.</span>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Database className="size-4" aria-hidden="true" /></span>
                <span>
                  <span className="block text-sm font-semibold text-foreground">Risiko di titik rumahmu</span>
                  <span className="block text-sm leading-relaxed text-muted-foreground">9 bahaya dinilai dari catatan nyata: gunung api, gempa sejak 1976, tsunami, lereng, dan pola iklim 30 tahun.</span>
                </span>
              </li>
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">Sumber: BMKG · {SUMBER.join(" · ")}</p>
          </div>
          <Link href="/lokasi" className="press inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            <MapPin className="size-4" aria-hidden="true" /> Pilih lokasi
          </Link>
        </div>
      </section>
    );

  const teratas = q.data ? disarankanData(q.data.nilai).filter((n) => n.id !== "cuaca_ekstrem").slice(0, 3) /* urut: tinggi dulu, yang berdata sebelum yang umum */ : [];

  return (
    <section aria-labelledby="judul-risiko-teratas" className={BUNGKUS}>
      <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="judul-risiko-teratas" className="flex items-center gap-2 text-lg font-bold text-foreground">
              <Database className="size-5 text-primary" aria-hidden="true" /> <TeksPihak>Risiko teratas di lokasi Anda</TeksPihak>
            </h2>
            <p className="text-sm text-muted-foreground">{lokasi.kelurahan}, {lokasi.kabKota} · dihitung dari data terbuka, bukan peta risiko resmi</p>
          </div>
          <Link href="/lokasi" className="inline-flex min-h-10 any-pointer-coarse:min-h-11 items-center gap-1 text-sm font-semibold text-primary">
            Lihat 9 bahaya <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </header>

        {q.isPending ? (
          <div className="mt-4 grid gap-3 md:grid-cols-3" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />)}</div>
        ) : q.isError || teratas.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{q.isError ? "Data risiko lokasi belum dapat dimuat. Buka halaman Lokasi untuk mencoba lagi." : "Tidak ada bahaya bertingkat tinggi di titik ini menurut data. Tetap siapkan diri untuk banjir dan cuaca ekstrem."}</p>
        ) : (
          <ul className="mt-4 grid gap-3 md:grid-cols-3">
            {teratas.map((n) => {
              const h = HAZARD_BY_ID[n.id];
              const Ikon = IKON_BAHAYA[n.id];
              return (
                <li key={n.id} className="rounded-xl border border-border p-4">
                  <div className="flex items-center gap-2">
                    <span className={`flex size-8 items-center justify-center rounded-lg ${h.bgClass} ${h.colorClass}`} aria-hidden="true"><Ikon className="size-4" /></span>
                    <p className="font-semibold text-foreground">{h.label}</p>
                    <span className="ml-auto"><LencanaTingkat t={n.tingkat} /></span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground"><TeksPihak>{n.alasan[0]}</TeksPihak></p>
                </li>
              );
            })}
          </ul>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/rencana/profil" className="press inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            Siapkan rencana untuk risiko ini <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <Link href="/latihan" className="press inline-flex min-h-11 items-center rounded-lg border border-border px-4 text-sm font-semibold hover:bg-muted">Latihan sesuai risiko</Link>
        </div>
      </div>
    </section>
  );
}
