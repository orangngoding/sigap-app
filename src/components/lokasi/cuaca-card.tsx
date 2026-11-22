"use client";
// Kartu Cuaca (satu kartu, dua sumber dengan peran jelas):
//  - PER JAM untuk titik kelurahan (model cuaca global, Open-Meteo; cadangan MET Norway): sekarang, tiga jam ke depan,
//    dan 24 jam penuh per hari, seperti aplikasi cuaca di ponsel.
//  - RESMI BMKG (dirilis per 3 jam): disisipkan di tempatnya, yaitu peringatan hujan lebat di atas, ringkasan resmi
//    per hari, dan label "BMKG" pada jam-jam yang dirilis BMKG.
// Bila prakiraan per jam gagal, kartu menampilkan prakiraan BMKG per 3 jam; bila BMKG gagal, per jam tetap tampil.
import { useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudMoon, CloudRain, CloudRainWind, CloudSun, Droplets, Moon, RefreshCw, ShieldCheck, Sun, Sunrise, Sunset, Umbrella, Wind, type LucideIcon } from "lucide-react";
import type { CuacaResponse, IntervalCuaca } from "@/types";
import { TTL, useDataCard } from "@/hooks/use-data-card";
import { hariTanggal, jamLokal, namaHari, tanggalLokal } from "@/lib/utils/format";
import { SINGKATAN_ZONA, arahMataAngin, jamMulaiSekarang, kategoriUv, waktuLokal, zonaUntukProvinsi, type CuacaJamResponse, type IkonCuaca, type JamCuaca } from "@/lib/data/cuaca-jam";
import { TombolTanya } from "@/components/tanya/tombol-tanya";

const IKON: Record<IkonCuaca, [LucideIcon, LucideIcon]> = {
  cerah: [Sun, Moon],
  "cerah-berawan": [CloudSun, CloudMoon],
  berawan: [Cloud, Cloud],
  kabut: [CloudFog, CloudFog],
  gerimis: [CloudDrizzle, CloudDrizzle],
  hujan: [CloudRain, CloudRain],
  "hujan-lebat": [CloudRainWind, CloudRainWind],
  petir: [CloudLightning, CloudLightning],
};
const WARNA: Record<IkonCuaca, string> = {
  cerah: "text-amber-500", "cerah-berawan": "text-amber-500", berawan: "text-slate-500", kabut: "text-slate-400",
  gerimis: "text-sky-500", hujan: "text-sky-600", "hujan-lebat": "text-blue-700", petir: "text-violet-600",
};

function IkonCuacaJam({ j, className }: { j: Pick<JamCuaca, "ikon" | "siang">; className: string }) {
  const Ikon = IKON[j.ikon][j.siang ? 0 : 1];
  return <Ikon className={`${className} ${j.siang ? WARNA[j.ikon] : "text-indigo-400"}`} aria-hidden="true" />;
}

const fmt = (v: number | null, s = "") => (v === null ? "–" : `${String(Math.round(v))}${s}`);
const jamTitik = (iso: string) => jamLokal(iso).replace(":", ".");

/** Kode BMKG yang dianggap hujan lebat (sama dengan ringkasan prakiraan BMKG di server). */
const POLA_LEBAT = /hujan lebat|petir/i;
const JAM_STATUS = 72;

export interface StatusHujanLebat {
  /** Prakiraan resmi BMKG terbaca. */
  resmiTerbaca: boolean;
  /** Interval BMKG berhujan lebat/petir dalam 3 hari ke depan, urut waktu. */
  resmi: IntervalCuaca[];
  /** Jam pertama yang menurut model per jam berhujan lebat (hanya bila BMKG tidak memprakirakannya). */
  model: JamCuaca | null;
}

/**
 * Status hujan lebat 3 hari ke depan, dihitung kode dari prakiraan resmi BMKG (kondisi "hujan lebat" atau "petir"),
 * dilengkapi model per jam (ikon hujan lebat/petir atau hujan 10 mm/jam ke atas) sebagai catatan bukan resmi.
 */
export function statusHujanLebat(bmkg: CuacaResponse | undefined, jam: JamCuaca[] = [], now = new Date()): StatusHujanLebat {
  const t0 = now.getTime() - 3 * 3_600_000;
  const t1 = now.getTime() + JAM_STATUS * 3_600_000;
  const resmi = (bmkg?.prakiraan ?? []).filter((x) => {
    const t = Date.parse(x.waktu);
    return t >= t0 && t <= t1 && POLA_LEBAT.test(x.kondisi);
  });
  const model = resmi.length ? null : (jam.find((j) => j.ikon === "hujan-lebat" || j.ikon === "petir" || (j.hujanMm ?? 0) >= 10) ?? null);
  return { resmiTerbaca: Boolean(bmkg), resmi, model };
}

const namaJam = (iso: string) => `${namaHari(iso)} pukul ${jamTitik(iso)}`;

/** Kalimat status untuk kartu dan pertanyaan Asisten, selalu dengan sumbernya. */
export function teksStatusHujan(st: StatusHujanLebat): string {
  if (st.resmi.length) {
    const hari = [...new Set(st.resmi.map((x) => namaHari(x.waktu)))];
    return `Prakiraan resmi BMKG: ada ${st.resmi[0].kondisi.toLowerCase()} dalam 3 hari ke depan, pertama ${namaJam(st.resmi[0].waktu)}${hari.length > 1 ? ` (juga ${hari.slice(1).join(", ")})` : ""}.`;
  }
  if (!st.resmiTerbaca) return "Prakiraan resmi BMKG belum dapat dibaca, jadi status hujan lebat belum bisa dipastikan.";
  return "Prakiraan resmi BMKG: tidak ada hujan lebat dalam 3 hari ke depan.";
}


/** Ringkasan resmi BMKG per tanggal: kondisi tengah hari dan rentang suhu. */
type RingkasBmkg = { kondisi: string; min: number | null; maks: number | null; jumlah: number; waktuPertama: string };
function ringkasBmkg(items: IntervalCuaca[]): Map<string, RingkasBmkg> {
  const per = new Map<string, IntervalCuaca[]>();
  for (const it of items) per.set(tanggalLokal(it.waktu), [...(per.get(tanggalLokal(it.waktu)) ?? []), it]);
  const out = new Map<string, RingkasBmkg>();
  for (const [t, xs] of per) {
    const suhu = xs.map((x) => x.suhu).filter((v): v is number => v !== null);
    out.set(t, { kondisi: xs[Math.floor(xs.length / 2)].kondisi, min: suhu.length ? Math.min(...suhu) : null, maks: suhu.length ? Math.max(...suhu) : null, jumlah: xs.length, waktuPertama: xs[0].waktu });
  }
  return out;
}

/**
 * Kalimat ringkasan resmi: rentang suhu hanya bermakna bila ada cukup prakiraan tersisa hari itu (malam hari tinggal
 * satu-dua); bila sedikit, sebut jam prakiraan resmi berikutnya.
 */
function teksResmi(r: RingkasBmkg): string {
  if (r.jumlah < 3) return `pukul ${jamTitik(r.waktuPertama)}: ${r.kondisi.toLowerCase()}${r.min !== null ? `, ${r.min}°C` : ""}`;
  return `${r.kondisi.toLowerCase()}${r.min !== null ? `, ${r.min === r.maks ? `${r.min}` : `${r.min}–${r.maks}`}°C` : ""}`;
}

/** Cadangan bila prakiraan per jam gagal: prakiraan resmi BMKG per 3 jam, per hari. */
function DaftarBmkg({ d }: { d: CuacaResponse }) {
  const hari = [...new Set(d.prakiraan.map((x) => tanggalLokal(x.waktu)))].slice(0, 3);
  return (
    <div className="space-y-2">
      {hari.map((t, idx) => {
        const xs = d.prakiraan.filter((x) => tanggalLokal(x.waktu) === t);
        return (
          <details key={t} className="rounded-xl border border-border p-3" open={idx === 0}>
            <summary className="cursor-pointer text-sm font-semibold">{hariTanggal(t)}</summary>
            <ul className="mt-2 divide-y divide-border text-sm">
              {xs.map((x) => (
                <li key={x.waktu} className="flex items-center gap-3 py-2">
                  <span className="w-12 font-medium tabular-nums">{jamTitik(x.waktu)}</span>
                  <span className="flex-1">{x.kondisi}</span>
                  <span className="tabular-nums">{x.suhu ?? "–"}°C</span>
                  <span className="hidden items-center gap-1 text-muted-foreground sm:flex"><Droplets className="size-3.5" aria-hidden="true" />{x.kelembapan ?? "–"}%</span>
                </li>
              ))}
            </ul>
          </details>
        );
      })}
    </div>
  );
}

export function CuacaCard({ adm4, lat, lon, provinsi, nama }: { adm4: string; lat: number; lon: number; provinsi: string; nama: string }) {
  const zona = zonaUntukProvinsi(provinsi);
  const qJam = useDataCard<CuacaJamResponse>("cuaca-jam", `${lat.toFixed(2)},${lon.toFixed(2)},${zona}`, `/api/cuaca-jam?lat=${lat}&lon=${lon}&zona=${encodeURIComponent(zona)}`, 30 * 60_000);
  const qBmkg = useDataCard<CuacaResponse>("cuaca", adm4, `/api/cuaca?adm4=${encodeURIComponent(adm4)}`, TTL.cuaca);
  const [buka, setBuka] = useState(false);
  const [hariDipilih, setHariDipilih] = useState(0);
  const bmkg = qBmkg.data;
  const bmkgPerJam = useMemo(() => new Map((bmkg?.prakiraan ?? []).map((x) => [x.waktu.slice(0, 13), x])), [bmkg]);
  const bmkgPerHari = useMemo(() => ringkasBmkg(bmkg?.prakiraan ?? []), [bmkg]);
  const z = SINGKATAN_ZONA[zona];

  const kerangka = (isi: React.ReactNode) => (
    <section aria-labelledby="judul-cuaca" className="rounded-2xl border border-border bg-surface p-5">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="judul-cuaca" className="text-base font-bold">Cuaca di {nama}</h2>
        <span className="text-xs text-muted-foreground">Waktu {z}</span>
      </header>
      {isi}
    </section>
  );

  if (qJam.isPending && qBmkg.isPending)
    return kerangka(
      <div className="mt-3 grid gap-3 sm:grid-cols-[1.2fr_2fr]" aria-busy="true" aria-label="Memuat cuaca">
        <div className="h-32 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
        <div className="h-32 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
      </div>,
    );

  // Status hujan lebat 3 hari SELALU tampil (ada atau tidak ada), dengan sumbernya, agar pengguna tahu asal informasinya.
  // Hanya jam yang akan datang (72 jam): jam yang sudah lewat tidak boleh memicu catatan.
  const st = statusHujanLebat(bmkg, qJam.data ? jamMulaiSekarang(qJam.data.jam, zona).slice(0, 72) : []);
  const teksSt = teksStatusHujan(st);
  const peringatan = (
    <div role="status" className={`mt-3 rounded-xl border px-3 py-2 text-sm ${st.resmi.length ? "border-warning-foreground/30 bg-warning font-medium text-warning-foreground" : "border-border bg-muted/50"}`}>
      <p className="flex items-start gap-2">
        {st.resmi.length ? <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> : <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />}
        <span>
          <span className="block text-xs font-semibold uppercase tracking-wide opacity-80">Hujan lebat 3 hari ke depan</span>
          {teksSt}{st.resmi.length ? " Bersihkan saluran air, amankan barang penting, dan pantau peringatan dini BMKG." : ""}
        </span>
      </p>
      {st.model && (
        <p className="mt-1 pl-6 text-xs text-muted-foreground">
          Catatan: model cuaca per jam (bukan prakiraan resmi) memperkirakan {st.model.kondisi.toLowerCase()} sekitar {namaJam(st.model.waktu)}. Pantau pembaruan BMKG.
        </p>
      )}
    </div>
  );
  const tanya = bmkg ? <TombolTanya label="Apa artinya bagi keluarga saya?" pertanyaan={`Untuk kelurahan saya, ${teksSt.charAt(0).toLowerCase()}${teksSt.slice(1)} Apa artinya bagi keluarga saya dan apa yang perlu disiapkan hari ini?`} /> : null;
  const sumber = (
    <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
      {qJam.data && <>Per jam: <a href={qJam.data.sumber.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">{qJam.data.sumber.nama}</a> untuk titik kelurahan (resolusi beberapa kilometer). </>}
      Prakiraan resmi: <a href="https://www.bmkg.go.id/cuaca/prakiraan-cuaca" target="_blank" rel="noreferrer" className="underline underline-offset-2">BMKG</a>, dirilis per 3 jam{bmkg ? "" : " (belum dapat dimuat)"}. Ini prakiraan, bukan peringatan dini; ikuti peringatan resmi BMKG.
      {(qJam.data?.stale || bmkg?.stale) && " Sebagian data adalah salinan tersimpan terakhir."}
    </p>
  );

  // Prakiraan per jam gagal: tampilkan prakiraan resmi BMKG per 3 jam.
  if (!qJam.data) {
    if (qJam.isPending) return kerangka(<div className="mt-3 h-40 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" aria-busy="true" />);
    if (!bmkg)
      return kerangka(
        <div role="alert" className="mt-3 space-y-3 text-sm">
          <p>Data cuaca belum dapat dimuat.</p>
          <button type="button" onClick={() => { void qJam.refetch(); void qBmkg.refetch(); }} className="inline-flex min-h-10 any-pointer-coarse:min-h-11 items-center gap-2 rounded-lg border border-border px-3 font-medium hover:bg-muted"><RefreshCw className="size-4" aria-hidden="true" /> Coba lagi</button>
        </div>,
      );
    return kerangka(<>{peringatan}<p className="mt-3 text-sm text-muted-foreground">Prakiraan per jam sedang tidak tersedia; berikut prakiraan resmi BMKG per 3 jam.</p><div className="mt-3"><DaftarBmkg d={bmkg} /></div>{tanya && <div className="mt-3">{tanya}</div>}{sumber}</>);
  }

  const d = qJam.data;
  const kiniDate = new Date();
  const mendatang = jamMulaiSekarang(d.jam, zona, kiniDate);
  const kini = mendatang[0];
  if (!kini) return kerangka(<>{bmkg ? <div className="mt-3"><DaftarBmkg d={bmkg} /></div> : null}{sumber}</>);
  const tiga = mendatang.slice(0, 3);
  const hari = d.hari.slice(0, 3);
  const tglDipilih = hari[hariDipilih]?.tanggal ?? hari[0]?.tanggal ?? "";
  const jamHari = d.jam.filter((j) => j.waktu.startsWith(tglDipilih));
  const jamKini = waktuLokal(kiniDate.toISOString(), zona).slice(0, 13);
  const hariIni = hari[0];
  const uv = kategoriUv(kini.uv);
  const resmiKini = bmkgPerHari.get(hariIni?.tanggal ?? "");
  const resmiDipilih = bmkgPerHari.get(tglDipilih);

  return kerangka(
    <>
      {peringatan}

      <div className="mt-3 grid gap-4 md:grid-cols-[1.1fr_2fr] md:items-center">
        <div className="flex items-center gap-4">
          <IkonCuacaJam j={kini} className="size-16 shrink-0" />
          <div>
            <p className="text-5xl font-extrabold tabular-nums leading-none">{fmt(kini.suhu, "°")}</p>
            <p className="mt-1 font-semibold">{kini.kondisi}</p>
            <p className="text-sm text-muted-foreground">
              {kini.terasa !== null && `Terasa ${fmt(kini.terasa, "°")} · `}
              {hariIni && `${fmt(hariIni.min, "°")} / ${fmt(hariIni.maks, "°")}`}
            </p>
          </div>
        </div>
        <ul className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4" aria-label="Rincian saat ini">
          <li className="rounded-xl bg-muted/60 p-2.5"><span className="flex items-center gap-1 text-xs text-muted-foreground"><Umbrella className="size-3.5" aria-hidden="true" /> Peluang hujan</span><span className="font-bold tabular-nums">{fmt(kini.peluangHujan, "%")}</span></li>
          <li className="rounded-xl bg-muted/60 p-2.5"><span className="flex items-center gap-1 text-xs text-muted-foreground"><Droplets className="size-3.5" aria-hidden="true" /> Kelembapan</span><span className="font-bold tabular-nums">{fmt(kini.kelembapan, "%")}</span></li>
          <li className="rounded-xl bg-muted/60 p-2.5"><span className="flex items-center gap-1 text-xs text-muted-foreground"><Wind className="size-3.5" aria-hidden="true" /> Angin</span><span className="font-bold tabular-nums">{fmt(kini.anginKmj, " km/j")}</span>{kini.arahAngin !== null && <span className="block text-xs text-muted-foreground">dari {arahMataAngin(kini.arahAngin)}</span>}</li>
          <li className="rounded-xl bg-muted/60 p-2.5"><span className="flex items-center gap-1 text-xs text-muted-foreground"><Sun className="size-3.5" aria-hidden="true" /> Indeks UV</span><span className="font-bold tabular-nums">{kini.uv === null ? "–" : Math.round(kini.uv)}</span>{uv && <span className="block text-xs text-muted-foreground">{uv}</span>}</li>
        </ul>
      </div>

      {resmiKini && (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-muted/50 px-3 py-2 text-sm">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <span><strong>{resmiKini.jumlah < 3 ? "Resmi BMKG berikutnya" : "Resmi BMKG hari ini"}</strong> {teksResmi(resmiKini)}.</span>
        </p>
      )}

      <ol className="mt-3 grid grid-cols-3 gap-2" aria-label="Tiga jam ke depan">
        {tiga.map((j, i) => (
          <li key={j.waktu} className={`rounded-xl border p-3 text-center ${i === 0 ? "border-primary/40 bg-primary/5" : "border-border"}`}>
            <p className="text-xs font-semibold text-muted-foreground">{i === 0 ? "Sekarang" : jamTitik(j.waktu)}</p>
            <IkonCuacaJam j={j} className="mx-auto mt-1 size-7" />
            <p className="mt-1 font-bold tabular-nums">{fmt(j.suhu, "°")}</p>
            <p className="text-xs tabular-nums text-sky-700 dark:text-sky-300">{j.peluangHujan !== null ? `${j.peluangHujan}% hujan` : j.kondisi}</p>
          </li>
        ))}
      </ol>

      <button type="button" aria-expanded={buka} aria-controls="cuaca-24-jam" onClick={() => setBuka((b) => !b)} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-border text-sm font-semibold text-primary hover:bg-muted">
        <ChevronDown className={`size-4 transition-transform ${buka ? "rotate-180" : ""}`} aria-hidden="true" /> {buka ? "Tutup prakiraan per jam" : "Lihat per jam, 24 jam penuh"}
      </button>

      {buka && (
        <div id="cuaca-24-jam" className="mt-3">
          <div role="tablist" aria-label="Pilih hari" className="grid grid-cols-3 gap-2">
            {hari.map((h, i) => (
              <button key={h.tanggal} type="button" role="tab" aria-selected={i === hariDipilih} onClick={() => setHariDipilih(i)} className={`rounded-xl border p-2 text-left text-xs focus-visible:outline-2 focus-visible:outline-primary ${i === hariDipilih ? "border-primary bg-primary/10" : "border-border hover:bg-muted"}`}>
                <span className="block font-bold">{i === 0 ? "Hari ini" : i === 1 ? "Besok" : hariTanggal(h.tanggal).split(",")[0]}</span>
                <span className="mt-0.5 flex items-center gap-1"><IkonCuacaJam j={{ ikon: h.ikon, siang: true }} className="size-4" /> <span className="tabular-nums">{fmt(h.min, "°")}/{fmt(h.maks, "°")}</span></span>
                {h.peluangHujan !== null && <span className="block text-sky-700 dark:text-sky-300">{h.peluangHujan}% hujan</span>}
              </button>
            ))}
          </div>
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {resmiDipilih && <span className="inline-flex items-center gap-1"><ShieldCheck className="size-3.5 text-primary" aria-hidden="true" /> BMKG {teksResmi(resmiDipilih)}</span>}
            {hari[hariDipilih]?.terbit && <span className="inline-flex items-center gap-1"><Sunrise className="size-3.5" aria-hidden="true" /> Terbit {hari[hariDipilih].terbit!.replace(":", ".")}</span>}
            {hari[hariDipilih]?.terbenam && <span className="inline-flex items-center gap-1"><Sunset className="size-3.5" aria-hidden="true" /> Terbenam {hari[hariDipilih].terbenam!.replace(":", ".")}</span>}
            {hari[hariDipilih]?.uvMaks !== null && hari[hariDipilih]?.uvMaks !== undefined && <span>UV tertinggi {Math.round(hari[hariDipilih].uvMaks!)} ({kategoriUv(hari[hariDipilih].uvMaks)})</span>}
          </p>
          <ul className="mt-2 max-h-[30rem] divide-y divide-border overflow-y-auto rounded-xl border border-border" role="tabpanel" aria-label={`Per jam, ${hariTanggal(tglDipilih)}`}>
            {jamHari.map((j) => {
              const lewat = j.waktu.slice(0, 13) < jamKini;
              const sekarang = j.waktu.slice(0, 13) === jamKini;
              const resmi = bmkgPerJam.get(j.waktu.slice(0, 13));
              return (
                <li key={j.waktu} className={`grid grid-cols-[3.25rem_1.75rem_1fr_3rem_4rem] items-center gap-2 px-3 py-2 text-sm ${sekarang ? "bg-primary/10 font-semibold" : lewat ? "text-muted-foreground opacity-60" : ""}`}>
                  <span className="tabular-nums">{sekarang ? "Kini" : jamTitik(j.waktu)}</span>
                  <IkonCuacaJam j={j} className="size-5" />
                  <span className="leading-tight">
                    {j.kondisi}
                    {resmi && <span className="block text-xs font-normal text-primary">BMKG: {resmi.kondisi.toLowerCase()}{resmi.suhu !== null ? `, ${resmi.suhu}°` : ""}</span>}
                  </span>
                  <span className="text-right font-semibold tabular-nums">{fmt(j.suhu, "°")}</span>
                  <span className="flex items-center justify-end gap-1 text-xs tabular-nums text-sky-700 dark:text-sky-300">
                    {j.peluangHujan !== null ? <><Umbrella className="size-3" aria-hidden="true" />{j.peluangHujan}%</> : j.hujanMm ? `${j.hujanMm} mm` : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {tanya && <div className="mt-3">{tanya}</div>}
      {sumber}
    </>,
  );
}
