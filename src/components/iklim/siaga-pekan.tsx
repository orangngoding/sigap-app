"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, CloudRain, ExternalLink, Eye, Flame, RefreshCw, Sparkles, Sun, Thermometer, Wind, type LucideIcon } from "lucide-react";
import type { Lokasi } from "@/types";
import type { HasilRencanaPekan } from "@/lib/ai/rencana-pekan";
import { AMBANG, namaTanggal, rentangTanggal, tingkatJenis, type HariPekan, type JenisSinyal, type SiagaPekanResponse, type Tingkat } from "@/lib/iklim/pekan";
import { snapGrid } from "@/lib/data/iklim-math";
import { readCache, writeCache } from "@/lib/storage/safe-storage";
import { useProfilStore } from "@/stores/profil-store";
import { profilSudahDiisi } from "@/lib/preparedness/profil-awal";
import { TombolTanya } from "@/components/tanya/tombol-tanya";
import { PanelTitikPanas, SorotanGlobal } from "./konteks-global";
import type { CuacaResponse } from "@/types";
import { TTL, useDataCard } from "@/hooks/use-data-card";
import { statusHujanLebat, teksStatusHujan } from "@/components/lokasi/cuaca-card";

type Tampil<T> = T & { stale?: boolean };

const JENIS: Record<JenisSinyal, { label: string; Ikon: LucideIcon }> = {
  hujan: { label: "Hujan lebat", Ikon: CloudRain },
  panas: { label: "Panas", Ikon: Thermometer },
  kering: { label: "Hari kering", Ikon: Sun },
  api: { label: "Cuaca mudah terbakar", Ikon: Flame },
  udara: { label: "Kualitas udara", Ikon: Wind },
};
const URUTAN: JenisSinyal[] = ["hujan", "panas", "kering", "api", "udara"];

const TINGKAT: Record<Tingkat, { label: string; chip: string; sel: string; Ikon: LucideIcon }> = {
  aman: { label: "Aman", chip: "bg-success text-success-foreground", sel: "border-border", Ikon: CheckCircle2 },
  perhatikan: { label: "Perhatikan", chip: "bg-warning text-warning-foreground", sel: "border-amber-400 bg-warning/40", Ikon: Eye },
  waspada: { label: "Waspada", chip: "bg-danger text-danger-foreground", sel: "border-red-500 bg-danger/40", Ikon: AlertTriangle },
};

const fmt = (v: number) => v.toLocaleString("id-ID", { maximumFractionDigits: 1 });

/** Kalimat "aman" per bahaya agar pengguna tahu bahaya itu sudah diperiksa, bukan terlupa. */
function teksAman(j: JenisSinyal, d: SiagaPekanResponse): string {
  switch (j) {
    case "hujan": return `Model cuaca 16 hari: tidak ada hari dengan hujan ${AMBANG.hujanSedangMm} mm/hari atau lebih (kategori BMKG: sedang 20-50, lebat 50 ke atas).`;
    case "panas": return `Suhu siang diprakirakan di bawah ${AMBANG.tmaxPanasC}°C.`;
    case "kering": return d.keringKini > 0 ? `${d.keringKini} hari tanpa hujan sampai kemarin; belum sampai ${AMBANG.keringPerhatikan} hari.` : "Hujan masih turun; tanah dan sumber air tidak sedang mengering.";
    case "api": return d.rawanKarhutla ? `Cuaca masih basah (${fmt(d.hujan30Mm)} mm hujan dalam 30 hari), risiko karhutla rendah untuk saat ini.${d.global?.pengaruh === "kering" ? " Namun El Niño membuat api mudah menyebar begitu hujan berhenti; tetap pantau." : ""}` : "Cuaca tidak kering; api tidak mudah menyebar.";
    case "udara": return d.hari.some((h) => h.pm25 !== null) ? "PM2.5 diperkirakan baik sampai sedang (kategori ISPU) dalam 5 hari." : "Data kualitas udara sedang tidak tersedia.";
  }
}

function SelHari({ h }: { h: HariPekan }) {
  const t = TINGKAT[h.tingkat];
  const Ikon = h.jenis[0] ? JENIS[h.jenis[0]].Ikon : null;
  const [hari, tgl, bln] = namaTanggal(h.tanggal).split(" ");
  return (
    <li className={`flex w-[4.6rem] shrink-0 flex-col items-center gap-1 rounded-2xl border p-2 text-center ${t.sel}`}>
      <span className="text-[11px] font-semibold text-muted-foreground">{hari.slice(0, 3)}</span>
      <span className="text-sm font-bold">{tgl} {bln}</span>
      <span className="flex h-5 items-center" aria-hidden="true">{Ikon ? <Ikon className="size-4" /> : <CheckCircle2 className="size-4 text-success-foreground" />}</span>
      <span className="text-[11px] tabular-nums text-muted-foreground">{h.tmax !== null ? `${Math.round(h.tmax)}°` : "-"} · {h.hujan !== null ? `${Math.round(h.hujan)} mm` : "-"}</span>
      <span className="sr-only">{t.label}{h.jenis.length ? `: ${h.jenis.map((j) => JENIS[j].label).join(", ")}` : ""}</span>
    </li>
  );
}

type LokasiPekan = Pick<Lokasi, "lat" | "lon" | "kabKota" | "provinsi">;

interface ItemStatus { j: JenisSinyal; tingkat: Tingkat; label: string; teks: string }

function KartuStatus({ x }: { x: ItemStatus }) {
  const t = TINGKAT[x.tingkat];
  const { Ikon } = JENIS[x.j];
  return (
    <li className={`cetak-utuh rounded-2xl border p-4 ${t.sel}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold"><Ikon className="size-4 text-primary" aria-hidden="true" /> {x.label}</p>
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${t.chip}`}><t.Ikon className="size-3" aria-hidden="true" /> {t.label}</span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{x.teks}</p>
    </li>
  );
}

/** Sinyal pekan untuk satu lokasi; dipakai bersama oleh tab Minggu ini dan Musim ini (kunci kueri sama, satu panggilan). */
export function useSinyalPekan(lokasi: LokasiPekan | null) {
  const profil = useProfilStore((s) => s.profil);
  const terisi = profilSudahDiisi(profil);
  const bahaya = terisi && profil.bahaya.length ? profil.bahaya : undefined;
  const konteks = !terisi ? undefined : {
    jumlahAnggota: profil.jumlahAnggota, lansia: profil.lansia, balita: profil.balita, hamil: profil.hamil,
    disabilitas: profil.disabilitas, hewanPeliharaan: profil.hewanPeliharaan, bangunan: profil.bangunan ?? undefined,
  };
  const grid = lokasi ? `${snapGrid(lokasi.lat)},${snapGrid(lokasi.lon)}` : "";
  const kunciSinyal = `${grid}:${lokasi?.provinsi ?? ""}:${(bahaya ?? []).join(",")}`;

  const sinyal = useQuery<Tampil<SiagaPekanResponse>>({
    queryKey: ["siaga-pekan", kunciSinyal],
    enabled: lokasi !== null,
    staleTime: 30 * 60_000,
    retry: (n, e) => e.message !== "503" && n < 1, // kuota habis: mengulang hanya memperburuk
    queryFn: async () => {
      try {
        const q = new URLSearchParams({ lat: String(lokasi!.lat), lon: String(lokasi!.lon), provinsi: lokasi!.provinsi });
        if (bahaya) q.set("bahaya", bahaya.join(","));
        const res = await fetch(`/api/siaga-pekan?${q}`);
        if (!res.ok) throw new Error(String(res.status)); // 503 = penyedia data melebihi batas pemakaian
        const data = (await res.json()) as SiagaPekanResponse;
        writeCache("siaga-pekan", kunciSinyal, data);
        return data;
      } catch (e) {
        const lama = readCache<SiagaPekanResponse>("siaga-pekan", kunciSinyal);
        if (lama) return { ...lama.data, stale: true };
        throw e;
      }
    },
  });
  return { sinyal, bahaya, konteks, kunciSinyal, terisi };
}

export function SiagaPekan({ lokasi, onBukaMusim }: { lokasi: LokasiPekan & { adm4?: string }; onBukaMusim?: () => void }) {
  const { sinyal, bahaya, konteks, kunciSinyal, terisi } = useSinyalPekan(lokasi);
  // 3 hari pertama memakai status yang SAMA dengan kartu Cuaca di Lokasi (prakiraan resmi BMKG; kunci cache sama).
  const adm4 = lokasi.adm4 ?? "";
  const qBmkg = useDataCard<CuacaResponse>("cuaca", adm4, adm4 ? `/api/cuaca?adm4=${encodeURIComponent(adm4)}` : null, TTL.cuaca);
  const stBmkg = qBmkg.data ? statusHujanLebat(qBmkg.data) : null;

  const kunciRencana = `${kunciSinyal}:${JSON.stringify(konteks)}:${new Date().toDateString()}`;
  const rencana = useQuery<HasilRencanaPekan>({
    queryKey: ["rencana-pekan", kunciRencana],
    enabled: sinyal.isSuccess && !sinyal.data.stale,
    staleTime: 60 * 60_000,
    retry: false,
    queryFn: async () => {
      const res = await fetch("/api/rencana-pekan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lokasi: { lat: lokasi.lat, lon: lokasi.lon, kabKota: lokasi.kabKota, provinsi: lokasi.provinsi }, bahaya, konteks }),
      });
      if (!res.ok) throw new Error(String(res.status));
      return (await res.json()) as HasilRencanaPekan;
    },
  });

  if (sinyal.isPending)
    return (
      <div className="space-y-3" aria-busy="true" role="status">
        <p className="text-sm text-muted-foreground">Membaca prakiraan 16 hari dan kualitas udara di wilayah Anda…</p>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">{URUTAN.map((j) => <div key={j} className="h-24 animate-pulse rounded-2xl bg-muted motion-reduce:animate-none" />)}</div>
        <div className="h-28 animate-pulse rounded-2xl bg-muted motion-reduce:animate-none" />
      </div>
    );
  if (sinyal.isError)
    return (
      <div role="alert" className="rounded-3xl border border-border bg-surface p-6">
        <p className="font-semibold">Prakiraan minggu ini belum dapat dimuat.</p>
        {sinyal.error?.message === "503" && <p className="mt-1 text-sm text-muted-foreground">Penyedia data cuaca gratis kami sedang melebihi batas pemakaiannya. Coba lagi beberapa saat lagi; peringatan resmi tetap tersedia di BMKG.</p>}
        <button type="button" onClick={() => sinyal.refetch()} className="press mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold hover:bg-muted">
          <RefreshCw className="size-4" aria-hidden="true" /> Coba lagi
        </button>
      </div>
    );

  const d = sinyal.data;
  const perJenis = (j: JenisSinyal) => d.sinyal.find((s) => s.jenis === j);
  const tampilJenis = URUTAN.filter((j) => j !== "api" || d.rawanKarhutla || perJenis("api"));
  const status: ItemStatus[] = tampilJenis.map((j) => {
    const s = perJenis(j);
    // Hujan: BMKG resmi memprakirakan hujan lebat/petir dalam 3 hari = minimal "Perhatikan", walau model harian tidak.
    const resmiLebat = j === "hujan" && Boolean(stBmkg?.resmi.length);
    const tingkat: Tingkat = s?.tingkat ?? (resmiLebat ? "perhatikan" : "aman");
    const tambahanResmi = j === "hujan" && stBmkg ? ` ${teksStatusHujan(stBmkg)}` : "";
    const teks = `${s ? `${rentangTanggal(s.tanggal)}${j === "hujan" ? " (model cuaca)" : ""}.` : teksAman(j, d)}${tambahanResmi}`;
    return { j, tingkat, label: j === "api" && d.rawanKarhutla ? "Karhutla" : JENIS[j].label, teks };
  });
  // Yang aman diringkas satu baris; hanya yang perlu diperhatikan tampil sebagai kartu.
  const berisiko = status.filter((x) => x.tingkat !== "aman");
  const aman = status.filter((x) => x.tingkat === "aman");
  const hariRisiko = d.hari.filter((h) => h.tingkat !== "aman").length;

  return (
    <div className="space-y-10">
      {d.stale && <p className="rounded-xl bg-warning px-4 py-2 text-sm text-warning-foreground">Menampilkan prakiraan tersimpan terakhir karena perangkat sedang offline.</p>}

      {d.global && <SorotanGlobal g={d.global} onBuka={onBukaMusim} harian />}

      <section aria-labelledby="judul-status-pekan">
        <h3 id="judul-status-pekan" className="text-lg font-bold">Status 16 hari ke depan</h3>
        <p className="mt-1 text-sm text-muted-foreground">Setiap bahaya diperiksa kode dari prakiraan. Untuk cuaca per jam dan 3 hari ke depan, lihat <Link href="/lokasi" className="font-semibold text-primary underline underline-offset-2">kartu Cuaca di Lokasi</Link>.</p>
        {berisiko.length > 0 && (
          <ul className={`mt-4 grid gap-3 sm:grid-cols-2 ${berisiko.length >= 3 ? "lg:grid-cols-3" : ""}`}>
            {berisiko.map((x) => <KartuStatus key={x.j} x={x} />)}
          </ul>
        )}
        {aman.length > 0 && (
          <div className="cetak-utuh mt-3 rounded-2xl border border-border bg-surface p-4">
            <p className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success-foreground" aria-hidden="true" />
              <span><strong>{berisiko.length ? "Lainnya aman" : "Aman"}, sudah dicek:</strong> {aman.map((x) => x.label.toLowerCase()).join(", ")}.</span>
            </p>
            <details className="mt-2 pl-6 text-sm">
              <summary className="min-h-8 cursor-pointer font-semibold text-primary">Lihat rinciannya</summary>
              <ul className="mt-2 space-y-1.5 text-muted-foreground">
                {aman.map((x) => <li key={x.j}><strong className="text-foreground">{x.label}:</strong> {x.teks}</li>)}
              </ul>
            </details>
          </div>
        )}
      </section>

      <section aria-labelledby="judul-hari-pekan">
        <h3 id="judul-hari-pekan" className="text-lg font-bold">Hari per hari</h3>
        <details open={hariRisiko > 0} className="mt-1">
          <summary className="min-h-8 cursor-pointer text-sm text-muted-foreground">
            {hariRisiko > 0 ? `${hariRisiko} dari ${d.hari.length} hari perlu diperhatikan (berwarna). ` : `Tidak ada hari berisiko dalam ${d.hari.length} hari. `}
            <span className="font-semibold text-primary">Suhu dan hujan per hari</span>
          </summary>
          {/* relative: teks sr-only (position absolute) di tiap sel ikut terpotong wadah gulir, tidak melebarkan halaman. */}
          <ol className="relative mt-3 flex gap-2 overflow-x-auto pb-2" aria-label="Prakiraan 16 hari">
            {d.hari.map((h) => <SelHari key={h.tanggal} h={h} />)}
          </ol>
        </details>
      </section>

      {/* Di luar wilayah rawan karhutla, titik panas kota (sampah, industri) baru relevan bila banyak: ambang sama dengan sinyal. */}
      {d.titikPanas && (d.rawanKarhutla || d.titikPanas.dalam7h >= 15) && <PanelTitikPanas tp={d.titikPanas} rawan={d.rawanKarhutla} />}

      <section aria-labelledby="judul-rencana-pekan" className="rounded-3xl bg-ink p-6 text-ink-foreground sm:p-8 cetak-panel">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 id="judul-rencana-pekan" className="text-xl font-bold text-white">Rencana 7 hari untuk keluarga Anda</h3>
          {rencana.data && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-emerald-200">
              <Sparkles className="size-3.5" aria-hidden="true" /> {rencana.data.mode === "ai" ? "Disusun AI dari sinyal di atas, diperiksa kode" : rencana.data.mode === "tenang" ? "Minggu tenang: cukup persiapan ringan" : "Disusun dari aturan (AI sedang tidak tersedia)"}
            </span>
          )}
        </div>
        {!terisi && <p className="mt-2 text-sm text-ink-muted">Isi profil keluarga di Rencana agar langkah disesuaikan dengan lansia, balita, atau ibu hamil.</p>}
        {rencana.isPending ? (
          <div className="mt-5 space-y-3" aria-busy="true">
            <p className="flex items-center gap-2 text-sm text-emerald-200"><Sparkles className="size-4 animate-pulse" aria-hidden="true" /> AI sedang menyusun rencana dari prakiraan…</p>
            {[0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-2xl bg-white/10 motion-reduce:animate-none" />)}
          </div>
        ) : rencana.isError ? (
          <p className="mt-4 text-sm text-ink-muted">Rencana belum dapat disusun. Tindakan per bahaya di bawah tetap berlaku.</p>
        ) : rencana.data ? (
          <>
            <p className="mt-4 max-w-3xl leading-relaxed text-white">{rencana.data.ringkasan}</p>
            <ol className="mt-5 space-y-3">
              {rencana.data.langkah.map((l, i) => (
                <li key={i} className="flex gap-4 rounded-2xl bg-white/5 p-4">
                  <span className="h-fit shrink-0 rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-bold text-emerald-200">{l.kapan}</span>
                  <div>
                    <p className="font-semibold text-white">{l.tindakan}</p>
                    <p className="mt-1 text-sm leading-relaxed text-ink-muted">{l.alasan}</p>
                  </div>
                </li>
              ))}
            </ol>
            {rencana.data.mode === "cadangan" && (
              <button type="button" onClick={() => rencana.refetch()} disabled={rencana.isFetching} className="press mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 px-4 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-60">
                <RefreshCw className={`size-4 ${rencana.isFetching ? "animate-spin motion-reduce:animate-none" : ""}`} aria-hidden="true" /> {rencana.isFetching ? "Menyusun…" : "Coba susun dengan AI"}
              </button>
            )}
          </>
        ) : null}
      </section>

      {d.sinyal.length > 0 && (
        <section aria-labelledby="judul-sinyal-pekan">
          <h3 id="judul-sinyal-pekan" className="text-lg font-bold">Yang perlu disiapkan per bahaya</h3>
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {d.sinyal.map((s) => {
              const t = TINGKAT[s.tingkat];
              const { Ikon } = JENIS[s.jenis];
              const waspadaHari = d.hari.filter((h) => tingkatJenis(h, s.jenis) === "waspada").length;
              return (
                <li key={s.jenis} className="cetak-utuh rounded-2xl border border-border bg-surface p-5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="flex items-center gap-2 font-semibold"><Ikon className="size-5 text-primary" aria-hidden="true" /> {s.judul}</p>
                    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${t.chip}`}><t.Ikon className="size-3" aria-hidden="true" /> {t.label}{waspadaHari > 0 && s.tingkat === "waspada" ? ` (${waspadaHari} hari)` : ""}</span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.fakta}</p>
                  <ul className="mt-3 space-y-1.5 text-sm">
                    {s.tindakan.map((x) => (
                      <li key={x} className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" /> {x}</li>
                    ))}
                  </ul>
                  <TombolTanya className="mt-4" pertanyaan={`${s.fakta} Apa yang sebaiknya keluarga saya lakukan?`} />
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <aside className="rounded-2xl border border-border bg-muted/50 p-5 text-sm leading-relaxed text-muted-foreground">
        <p>{d.catatan}</p>
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          <a href="https://www.bmkg.go.id/cuaca/peringatan-dini-cuaca" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary underline underline-offset-2">Peringatan dini BMKG <ExternalLink className="size-3.5" aria-hidden="true" /></a>
          <a href="https://ispu.menlhk.go.id/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary underline underline-offset-2">ISPU KLHK (kualitas udara resmi) <ExternalLink className="size-3.5" aria-hidden="true" /></a>
          {d.rawanKarhutla && (
            <a href="https://sipongi.menlhk.go.id/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary underline underline-offset-2">SiPongi: titik panas karhutla <ExternalLink className="size-3.5" aria-hidden="true" /></a>
          )}
        </p>
        <p className="mt-2">Sumber: {d.sumber.nama} ({d.sumber.lisensi}). Diperbarui tiap jam.</p>
      </aside>
    </div>
  );
}
