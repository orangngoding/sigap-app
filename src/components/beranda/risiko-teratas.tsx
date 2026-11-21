"use client";
import Link from "next/link";
import { ArrowRight, Database, MapPin } from "lucide-react";
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
  if (!lokasi)
    return (
      <section aria-labelledby="judul-risiko-teratas" className={BUNGKUS}>
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <div className="flex max-w-2xl items-start gap-3">
            <Database className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
            <div>
              <h2 id="judul-risiko-teratas" className="font-semibold text-foreground">Bencana apa yang mengintai rumahmu?</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                SIGAP menilai 9 bahaya untuk titik rumahmu dari catatan nyata: jarak ke gunung api, gempa sejak 1976, riwayat tsunami, jarak pantai, lereng, pola iklim 30 tahun, dan titik panas satelit. Rencanamu disusun dari hasilnya.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">Sumber: {SUMBER.join(" · ")}</p>
            </div>
          </div>
          <Link href="/lokasi" className="press inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            <MapPin className="size-4" aria-hidden="true" /> Cek risiko lokasimu
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
          <Link href="/lokasi" className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-primary">
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
