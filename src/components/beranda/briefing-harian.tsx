"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Activity, AlertTriangle, ArrowRight, BellRing, CheckCircle2, CloudSun, Database, ExternalLink, Eye, MapPin, RefreshCw, Sparkles, type LucideIcon } from "lucide-react";
import type { HasilBriefing } from "@/lib/ai/briefing";
import type { Sinyal, Tingkat } from "@/lib/briefing/sinyal";
import { useHydrate } from "@/hooks/use-hydrate";
import { readCache, writeCache } from "@/lib/storage/safe-storage";
import { waktuMutlak, waktuRelatif } from "@/lib/utils/format";
import { useLokasiStore } from "@/stores/lokasi-store";
import { useProfilStore } from "@/stores/profil-store";
import { TombolTanya } from "@/components/tanya/tombol-tanya";
import { profilSudahDiisi } from "@/lib/preparedness/profil-awal";

const TINGKAT: Record<Tingkat, { label: string; cls: string; Ikon: LucideIcon }> = {
  tenang: { label: "Tenang", cls: "bg-success text-success-foreground", Ikon: CheckCircle2 },
  perhatikan: { label: "Perhatikan", cls: "bg-warning text-warning-foreground", Ikon: Eye },
  waspada: { label: "Waspada", cls: "bg-danger text-danger-foreground", Ikon: AlertTriangle },
};
const IKON_SUMBER: Record<Sinyal["sumber"], LucideIcon> = { cuaca: CloudSun, gempa: Activity, peringatan: BellRing, risiko: Database };
const TOMBOL_SEKUNDER =
  "inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm font-medium hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50";

type HasilTampil = HasilBriefing & { stale?: boolean };

function TautanTindakan({ href, label }: { href: string; label: string }) {
  const cls = "inline-flex min-h-8 items-center gap-1 text-xs font-semibold text-primary underline underline-offset-2";
  return href.startsWith("/") ? (
    <Link href={href} className={cls}>{label} <ArrowRight className="size-3" aria-hidden="true" /></Link>
  ) : (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
      {label} <ExternalLink className="size-3" aria-hidden="true" /><span className="sr-only">(buka di tab baru)</span>
    </a>
  );
}

/**
 * Briefing Siaga Hari Ini: ringkasan kondisi wilayah dari data BMKG + tiga tindakan untuk keluarga.
 * Tingkat perhatian dan fakta dihitung kode di server; AI hanya merangkai kalimat (cadangan templat tanpa AI).
 */
export function BriefingHarian({ varian = "beranda" }: { varian?: "beranda" | "lokasi" }) {
  const siap = useHydrate(useLokasiStore, useProfilStore);
  const lokasi = useLokasiStore((s) => s.lokasi);
  const profil = useProfilStore((s) => s.profil);

  // Nilai bawaan profil tidak dikirim sebagai fakta keluarga.
  const terisi = profilSudahDiisi(profil);
  const konteks = !terisi ? undefined : {
    jumlahAnggota: profil.jumlahAnggota,
    lansia: profil.lansia,
    balita: profil.balita,
    hamil: profil.hamil,
    disabilitas: profil.disabilitas,
    hewanPeliharaan: profil.hewanPeliharaan,
    bangunan: profil.bangunan ?? undefined,
  };
  const bahaya = terisi && profil.bahaya.length ? profil.bahaya : undefined;
  const kunci = lokasi ? `${lokasi.adm4}:${JSON.stringify([konteks, bahaya])}` : "";

  const q = useQuery<HasilTampil>({
    queryKey: ["briefing", kunci],
    enabled: siap && lokasi !== null,
    staleTime: 15 * 60_000,
    retry: false,
    queryFn: async () => {
      try {
        const res = await fetch("/api/briefing", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            lokasi: lokasi && { adm4: lokasi.adm4, kelurahan: lokasi.kelurahan, kecamatan: lokasi.kecamatan, kabKota: lokasi.kabKota, provinsi: lokasi.provinsi, lat: lokasi.lat, lon: lokasi.lon },
            bahaya,
            konteks,
          }),
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as HasilBriefing;
        writeCache("briefing", lokasi!.adm4, data);
        return data;
      } catch (e) {
        // Offline atau server gagal: tampilkan briefing terakhir dengan penanda data lama.
        const lama = readCache<HasilBriefing>("briefing", lokasi!.adm4);
        if (lama) return { ...lama.data, stale: true };
        throw e;
      }
    },
  });

  const bungkus = varian === "beranda" ? "mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8" : "";

  if (!siap) return <div className={bungkus}><div className="h-40 animate-pulse rounded-2xl bg-muted motion-reduce:animate-none" aria-hidden="true" /></div>;

  if (!lokasi) {
    if (varian !== "beranda") return null;
    return (
      <section aria-label="Briefing Siaga Hari Ini" className={bungkus}>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-5">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
            <div>
              <p className="font-semibold text-foreground">Briefing Siaga Hari Ini</p>
              <p className="text-sm text-muted-foreground">Pilih lokasi untuk mendapat ringkasan cuaca, gempa, dan peringatan BMKG di wilayah Anda, beserta 3 tindakan untuk keluarga.</p>
            </div>
          </div>
          <Link href="/lokasi" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            <MapPin className="size-4" aria-hidden="true" /> Pilih lokasi
          </Link>
        </div>
      </section>
    );
  }

  const d = q.data;
  const t = d ? TINGKAT[d.tingkat] : null;

  return (
    <section aria-labelledby="judul-briefing" className={bungkus}>
      <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="judul-briefing" className="flex items-center gap-2 text-lg font-bold text-foreground">
              <Sparkles className="size-5 text-primary" aria-hidden="true" /> Briefing Siaga Hari Ini
            </h2>
            <p className="text-sm text-muted-foreground">
              {lokasi.kelurahan}, Kec. {lokasi.kecamatan}, {lokasi.kabKota}
              {d ? ` · diperbarui ${waktuRelatif(d.dibuatPada)}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {t && (
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${t.cls} ${d?.tingkat === "waspada" ? "denyut" : ""}`}>
                <t.Ikon className="size-4" aria-hidden="true" /> {t.label}
              </span>
            )}
            <button type="button" onClick={() => void q.refetch()} disabled={q.isFetching} className={TOMBOL_SEKUNDER} aria-label="Muat ulang briefing">
              <RefreshCw className={`size-4 ${q.isFetching ? "animate-spin motion-reduce:animate-none" : ""}`} aria-hidden="true" />
            </button>
          </div>
        </header>

        {q.isLoading && (
          <div className="mt-4 space-y-3" aria-busy="true" aria-label="Menyusun briefing">
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted motion-reduce:animate-none" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted motion-reduce:animate-none" />
            <div className="grid gap-3 sm:grid-cols-3">
              {[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />)}
            </div>
            <p className="text-xs text-muted-foreground">Membaca data BMKG untuk wilayah Anda...</p>
          </div>
        )}

        {q.isError && !d && (
          <div role="alert" className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            <p>Briefing belum dapat disusun.</p>
            <button type="button" onClick={() => void q.refetch()} className={TOMBOL_SEKUNDER}><RefreshCw className="size-4" aria-hidden="true" /> Coba lagi</button>
            <Link href="/lokasi" className="text-primary underline underline-offset-2">Lihat data lokasi</Link>
          </div>
        )}

        {d && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="mt-4 space-y-4">
            {d.stale && (
              <p className="rounded-lg bg-warning px-3 py-2 text-sm text-warning-foreground">
                Briefing lama dari {waktuMutlak(d.dibuatPada)}. Sambungkan internet lalu muat ulang.
              </p>
            )}
            <p className="text-base leading-relaxed text-foreground">{d.ringkasan}</p>

            {d.sinyal.length > 0 && (
              <ul className="grid gap-2 sm:grid-cols-2" aria-label="Sinyal dari data resmi BMKG dan profil risiko lokasi">
                {d.sinyal.map((s) => {
                  const Ikon = IKON_SUMBER[s.sumber];
                  const warna = s.tingkat === "waspada" ? "border-danger-foreground/30 bg-danger/40" : s.tingkat === "perhatikan" ? "border-warning-foreground/30 bg-warning/40" : "border-border bg-background";
                  return (
                    <li key={`${s.jenis}-${s.fakta}`} className={`flex items-start gap-2.5 rounded-xl border p-3 ${warna}`}>
                      <Ikon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <div className="min-w-0 text-sm">
                        <p className="font-semibold text-foreground">{s.judul}</p>
                        <p className="text-muted-foreground">
                          {s.fakta}{" "}
                          {s.sumber === "risiko" ? (
                            <Link href={s.url} className="whitespace-nowrap text-xs font-medium text-primary underline underline-offset-2">
                              Profil risiko<span className="sr-only"> (data lokasi Anda)</span>
                            </Link>
                          ) : (
                            <a href={s.url} target="_blank" rel="noopener noreferrer" className="whitespace-nowrap text-xs font-medium text-primary underline underline-offset-2">
                              BMKG<span className="sr-only"> (sumber, buka di tab baru)</span>
                            </a>
                          )}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            <ol className="grid gap-3 sm:grid-cols-3">
              {d.tindakan.map((x, i) => (
                <motion.li
                  key={x.judul}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.08 * i, ease: [0.2, 0, 0, 1] }}
                  className="flex flex-col rounded-xl border border-border bg-background p-4"
                >
                  <span className="mb-2 flex size-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground" aria-hidden="true">{i + 1}</span>
                  <p className="text-sm font-semibold text-foreground">{x.judul}</p>
                  <p className="mt-1 flex-1 text-sm text-muted-foreground">{x.alasan}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                    {x.tautan && <TautanTindakan href={x.tautan.href} label={x.tautan.label} />}
                    <TombolTanya label="Tanya" pertanyaan={`Dari briefing siaga hari ini: "${x.judul}". ${x.alasan} Bagaimana cara melakukannya untuk keluarga saya?`} />
                  </div>
                </motion.li>
              ))}
            </ol>

            {d.catatan.length > 0 && (
              <ul className="space-y-1 text-xs text-muted-foreground">
                {d.catatan.map((c) => <li key={c} className="flex items-start gap-1.5"><AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" /> {c}</li>)}
              </ul>
            )}

            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
              <p className="text-xs text-muted-foreground">
                {d.mode === "ai" ? "Dirangkum AI dari data BMKG; fakta dan tingkat dihitung aplikasi." : "Disusun otomatis dari data BMKG (tanpa AI)."}{" "}
                Tingkat perhatian versi SIGAP, bukan status resmi BMKG/BNPB.
              </p>
              <TombolTanya label="Tanya kondisi hari ini" pertanyaan={`Briefing siaga wilayah saya hari ini: ${d.ringkasan} Apa yang sebaiknya keluarga saya perhatikan?`} />
            </footer>
          </motion.div>
        )}
      </div>
    </section>
  );
}
