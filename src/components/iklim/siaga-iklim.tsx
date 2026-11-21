"use client";
import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, CalendarRange, Home, MapPin, RefreshCw } from "lucide-react";
import type { ProyeksiResponse } from "@/lib/data/proyeksi";
import type { KlimatologiResponse } from "@/lib/data/klimatologi";
import { useHydrate } from "@/hooks/use-hydrate";
import { readCache, writeCache } from "@/lib/storage/safe-storage";
import { useLokasiStore } from "@/stores/lokasi-store";
import { useProfilStore } from "@/stores/profil-store";
import { useIklimRumahStore } from "@/stores/iklim-rumah-store";
import { profilSudahDiisi } from "@/lib/preparedness/profil-awal";
import { snapGrid, snapProyeksi } from "@/lib/data/iklim-math";
import { ujiKetahanan, type InputRumah } from "@/lib/iklim/ketahanan";
import { FOTO } from "@/lib/gambar";
import { KalenderRisiko, RingkasanKalender } from "./kalender-risiko";
import { FormRumah, HasilUjiRumah, PertanyaanRumah } from "./uji-rumah";
import { PenasihatKeputusan, usePenasihat } from "./penasihat-keputusan";
import { RingkasanDampak } from "./ringkasan-dampak";
import { airDijawab, rumahDijawab } from "@/stores/iklim-rumah-store";
import { useAksiIklimStore } from "@/stores/aksi-iklim-store";
import { DataLengkap } from "./data-lengkap";
import { SiagaPekan, useSinyalPekan } from "./siaga-pekan";
import { KartuGlobal } from "./konteks-global";
import { TigaBulan } from "./tiga-bulan";

type TabId = "pekan" | "musim" | "jangka";
const TAB: Array<{ id: TabId; label: string; sub: string; Ikon: typeof Home }> = [
  { id: "pekan", label: "Minggu ini", sub: "16 hari", Ikon: CalendarDays },
  { id: "musim", label: "Musim ini", sub: "3-12 bulan", Ikon: CalendarRange },
  { id: "jangka", label: "Rumah & masa depan", sub: "10-25 tahun", Ikon: Home },
];
const tabSah = (x: string | null): x is TabId => TAB.some((t) => t.id === x);

type Tampil<T> = T & { stale?: boolean };

/** Penyedia data menolak karena batas pemakaian (bukan galat sementara): jangan diulang otomatis. */
class GalatKuota extends Error {}
async function bacaApi<T>(res: Response): Promise<T> {
  if (res.ok) return (await res.json()) as T;
  const badan = (await res.json().catch(() => null)) as { error?: { code?: string } } | null;
  throw badan?.error?.code === "BATAS_HULU" ? new GalatKuota("kuota") : new Error(String(res.status));
}
const ulangiBiasa = (n: number, e: Error) => !(e instanceof GalatKuota) && n < 1;

/** Proyeksi dari versi lama tidak punya pola per bulan; data seperti itu tidak boleh dipakai. */
const lengkap = (p: ProyeksiResponse | undefined): p is ProyeksiResponse => Boolean(p && p.bulanan && p.kemarauTerburuk);

function Menghitung() {
  return (
    <div role="status" aria-live="polite" className="rounded-3xl border border-border bg-surface p-6 sm:p-8">
      <p className="text-lg font-bold">Menghitung iklim wilayah Anda…</p>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
        Kami meringkas sekitar 60 tahun data dari dua model iklim global untuk wilayah Anda. Pertama kali bisa memakan 15-30 detik; setelah itu tersimpan di perangkat dan langsung tampil.
      </p>
      <div className="mt-5 space-y-3" aria-hidden="true">
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted motion-reduce:animate-none" />
        <div className="h-40 animate-pulse rounded-2xl bg-muted motion-reduce:animate-none" />
      </div>
    </div>
  );
}

function TanpaLokasi() {
  return (
    <div className="grid overflow-hidden rounded-3xl border border-border bg-surface md:grid-cols-2">
      <div className="relative min-h-56">
        <Image src={FOTO.kekeringan.src} alt="" fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
      </div>
      <div className="p-6 sm:p-8">
        <h2 className="text-2xl font-bold">Pilih lokasi untuk melihat bulan rawan di wilayah Anda</h2>
        <p className="mt-3 text-muted-foreground">Proyeksi dihitung per grid sekitar 25 km. Lokasi hanya disimpan di perangkat ini; koordinat dibulatkan sebelum dikirim ke penyedia data.</p>
        <Link href="/lokasi" className="press mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          <MapPin className="size-4" aria-hidden="true" /> Pilih lokasi
        </Link>
      </div>
    </div>
  );
}

function Bagian({ id, judul, pengantar, children }: { id: string; judul: string; pengantar?: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="scroll-mt-24">
      <h2 id={id} className="text-2xl font-bold tracking-tight">{judul}</h2>
      {pengantar && <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-muted-foreground">{pengantar}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function SiagaIklim() {
  const siap = useHydrate(useLokasiStore, useProfilStore, useIklimRumahStore, useAksiIklimStore);
  const lokasi = useLokasiStore((s) => s.lokasi);
  const profil = useProfilStore((s) => s.profil);
  const jawaban = useIklimRumahStore((s) => s.jawaban);

  const grid = lokasi ? `${snapGrid(lokasi.lat)},${snapGrid(lokasi.lon)}` : "";
  const gridKasar = lokasi ? `${snapProyeksi(lokasi.lat)},${snapProyeksi(lokasi.lon)}` : "";
  const tabAwal = useSearchParams().get("tab");
  const [tab, setTab] = useState<TabId>(tabSah(tabAwal) ? tabAwal : "pekan");
  const pilihTab = (t: TabId) => {
    setTab(t);
    const u = new URL(window.location.href);
    u.searchParams.set("tab", t);
    window.history.replaceState(null, "", u);
  };

  const proyeksi = useQuery<Tampil<ProyeksiResponse>>({
    queryKey: ["proyeksi", "v4", gridKasar],
    // Permintaan berat (bobot sekitar 600 dari kuota harian 10.000): hanya saat tab Rumah & masa depan dibuka.
    enabled: siap && lokasi !== null && tab === "jangka",
    staleTime: Infinity,
    retry: ulangiBiasa,
    retryDelay: 4000,
    queryFn: async () => {
      try {
        const data = await bacaApi<ProyeksiResponse>(await fetch(`/api/proyeksi?lat=${lokasi!.lat}&lon=${lokasi!.lon}`));
        if (!lengkap(data)) throw new Error("bentuk data lama");
        writeCache("proyeksi", gridKasar, data);
        return data;
      } catch (e) {
        const lama = readCache<ProyeksiResponse>("proyeksi", gridKasar);
        if (lama && lengkap(lama.data)) return { ...lama.data, stale: true };
        throw e;
      }
    },
  });

  // Pola bulanan dari PENGAMATAN ERA5 1991-2020: ringan, dan tidak ikut gagal bila proyeksi berat sedang tak tersedia.
  const klimatologi = useQuery<Tampil<KlimatologiResponse>>({
    queryKey: ["klimatologi", "v1", grid],
    enabled: siap && lokasi !== null && tab === "musim",
    staleTime: Infinity,
    retry: ulangiBiasa,
    retryDelay: 4000,
    queryFn: async () => {
      try {
        const data = await bacaApi<KlimatologiResponse>(await fetch(`/api/klimatologi?lat=${lokasi!.lat}&lon=${lokasi!.lon}`));
        writeCache("klimatologi", grid, data);
        return data;
      } catch (e) {
        const lama = readCache<KlimatologiResponse>("klimatologi", grid);
        if (lama) return { ...lama.data, stale: true };
        throw e;
      }
    },
  });
  // Kondisi El Niño/La Niña dan IOD ikut respons sinyal pekan (kunci kueri sama dengan tab Minggu ini: satu panggilan).
  const pekan = useSinyalPekan(lokasi);
  const global = pekan.sinyal.data?.global ?? null;

  const terisi = profilSudahDiisi(profil);
  const dariProfil = terisi && (jawaban.anggota === null || jawaban.adaRentan === null);
  const input = useMemo<InputRumah>(
    () => ({
      anggota: jawaban.anggota ?? (terisi ? profil.jumlahAnggota : 4),
      rentan: jawaban.adaRentan === null ? (terisi ? profil.lansia + profil.balita + profil.hamil : 0) : jawaban.adaRentan ? Math.max(1, terisi ? profil.lansia + profil.balita + profil.hamil : 1) : 0,
      // Soal air belum dijawab: tanpa air simpanan, dan hanya cadangan dasar (bukan tebakan lama air sulit).
      litersTersimpan: jawaban.litersTersimpan ?? 0,
      atap: jawaban.atap ?? "genteng",
      sumberAir: jawaban.sumberAir,
      gangguanAir: jawaban.gangguanAir ?? "jarang",
      airDiketahui: airDijawab(jawaban),
      pernahTergenang: jawaban.pernahTergenang,
    }),
    [jawaban, terisi, profil],
  );
  const p = proyeksi.data;
  const uji = useMemo(() => (p ? ujiKetahanan(input, p) : null), [p, input]);
  const ps = usePenasihat(p, lokasi, input, uji);
  const dijawab = rumahDijawab(jawaban);

  if (!siap) return <div className="h-80 animate-pulse rounded-3xl bg-muted motion-reduce:animate-none" aria-busy="true" />;
  if (!lokasi) return <TanpaLokasi />;

  /** Isi yang butuh proyeksi (tab Musim dan Rumah): menunggu, galat, atau isinya. */
  const butuhProyeksi = (isi: () => React.ReactNode) => {
    if (proyeksi.isPending) return <Menghitung />;
    if (proyeksi.isError || !p || !uji || !ps.tampil)
      return (
        <div role="alert" className="rounded-3xl border border-border bg-surface p-6">
          <p className="font-semibold">{proyeksi.error instanceof GalatKuota ? "Proyeksi untuk lokasi ini belum bisa dihitung hari ini." : "Data proyeksi iklim belum dapat dimuat."}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {proyeksi.error instanceof GalatKuota
              ? "Penyedia model iklim sedang melebihi batas pemakaian hariannya, dan sumber cadangan (NASA POWER) juga sedang tidak terjangkau. Tab Minggu ini tetap bisa dipakai; coba lagi beberapa saat lagi."
              : "Penyedia data mungkin sedang sibuk. Coba lagi sebentar lagi."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => proyeksi.refetch()} className="press inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold hover:bg-muted">
              <RefreshCw className="size-4" aria-hidden="true" /> Coba lagi
            </button>
            <button type="button" onClick={() => pilihTab("pekan")} className="press inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Lihat prakiraan minggu ini</button>
          </div>
        </div>
      );
    return isi();
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="inline-flex items-center gap-2 text-muted-foreground">
          <MapPin className="size-4 text-primary" aria-hidden="true" />
          {lokasi.kabKota}, {lokasi.provinsi}
        </p>
        <Link href="/lokasi" className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-2">Ganti lokasi</Link>
      </div>

      <div className="tanpa-cetak bilah-lengket sticky top-16 z-30 -mx-4 px-4 py-2 sm:mx-0 sm:px-0">
        <div role="tablist" aria-label="Rentang waktu" className="kaca isolate grid grid-cols-3 gap-1 rounded-2xl border border-border/70 p-1 shadow-sm">
          {TAB.map(({ id, label, sub, Ikon }) => {
            const aktif = tab === id;
            return (
              <button
                key={id} type="button" role="tab" id={`tab-${id}`} aria-selected={aktif} aria-controls={`panel-${id}`} onClick={() => pilihTab(id)}
                className={`relative flex min-h-14 flex-col items-center justify-center rounded-xl px-2 text-center transition-colors focus-visible:outline-2 focus-visible:outline-primary sm:flex-row sm:gap-2 ${aktif ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {aktif && <motion.span layoutId="tab-iklim" className="absolute inset-0 -z-10 rounded-xl bg-primary shadow-sm shadow-primary/30" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                <Ikon className="hidden size-4 sm:block" aria-hidden="true" />
                <span className="text-sm font-semibold leading-tight">{label}</span>
                <span className={`text-[11px] leading-tight sm:hidden ${aktif ? "text-primary-foreground/80" : ""}`}>{sub}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div id="panel-pekan" role="tabpanel" aria-labelledby="tab-pekan" className={tab === "pekan" ? "panel-masuk" : "hidden print:block"}>
        <Bagian id="judul-pekan" judul="Cuaca dan udara 16 hari ke depan" pengantar="Hujan lebat, panas berbahaya, hari kering, cuaca mudah terbakar (karhutla), dan asap atau polusi udara di wilayah Anda, beserta apa yang perlu dilakukan dan kapan.">
          <SiagaPekan lokasi={lokasi} onBukaMusim={() => pilihTab("musim")} />
        </Bagian>
      </div>

      <div id="panel-musim" role="tabpanel" aria-labelledby="tab-musim" className={tab === "musim" ? "panel-masuk space-y-12" : "hidden space-y-12 print:mt-12 print:block"}>
        {global && (
          <Bagian id="judul-global" judul="Kondisi iklim tahun ini" pengantar="Dua pola laut yang paling menentukan apakah musim di Indonesia berjalan normal, lebih kering, atau lebih basah.">
            <KartuGlobal g={global} />
          </Bagian>
        )}
        {klimatologi.isPending ? (
          <div role="status" aria-busy="true" className="space-y-3">
            <p className="text-sm text-muted-foreground">Membaca 30 tahun data pengamatan iklim di wilayah Anda…</p>
            <div className="grid gap-3 md:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-40 animate-pulse rounded-2xl bg-muted motion-reduce:animate-none" />)}</div>
          </div>
        ) : klimatologi.isError ? (
          <div role="alert" className="rounded-3xl border border-border bg-surface p-6">
            <p className="font-semibold">Pola iklim wilayah Anda belum dapat dimuat.</p>
            <p className="mt-1 text-sm text-muted-foreground">{klimatologi.error instanceof GalatKuota ? "Penyedia data utama sedang melebihi batas pemakaian hariannya dan sumber cadangan (NASA POWER) juga sedang tidak terjangkau. Informasi kondisi iklim tahun ini di atas tetap berlaku; coba lagi beberapa saat lagi." : "Penyedia data mungkin sedang sibuk. Informasi kondisi iklim tahun ini di atas tetap berlaku; coba lagi nanti."}</p>
            <button type="button" onClick={() => klimatologi.refetch()} className="press mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold hover:bg-muted">
              <RefreshCw className="size-4" aria-hidden="true" /> Coba lagi
            </button>
          </div>
        ) : (
          <>
            {klimatologi.data.stale && <p className="rounded-xl bg-warning px-4 py-2 text-sm text-warning-foreground">Menampilkan data tersimpan terakhir karena perangkat sedang offline atau server tidak terjangkau.</p>}
            <Bagian id="judul-tiga-bulan" judul="Tiga bulan ke depan" pengantar={`Menurut pola iklim pengamatan ${klimatologi.data.periode.label} di wilayah Anda${global && global.pengaruh !== "netral" ? ", disesuaikan dengan kondisi tahun ini" : ""}. Siapkan rumah sebelum bulan rawan tiba.`}>
              <TigaBulan k={klimatologi.data} provinsi={lokasi.provinsi} bahaya={terisi ? profil.bahaya : undefined} global={global} />
            </Bagian>
            <Bagian id="judul-bulan-rawan" judul="Bulan rawan sepanjang tahun">
              <RingkasanKalender k={klimatologi.data} namaWilayah={lokasi.kabKota} global={global} />
              <details className="group mt-5">
                <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-sm font-semibold text-primary underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-primary">
                  <span className="group-open:hidden">Lihat angka 12 bulan</span>
                  <span className="hidden group-open:inline">Sembunyikan angka 12 bulan</span>
                </summary>
                <div className="mt-4"><KalenderRisiko k={klimatologi.data} /></div>
              </details>
            </Bagian>
          </>
        )}
      </div>

      <div id="panel-jangka" role="tabpanel" aria-labelledby="tab-jangka" className={tab === "jangka" ? "panel-masuk space-y-14" : "hidden space-y-14 print:mt-12 print:block"}>
        {butuhProyeksi(() => (
          <>
            <div className="space-y-4">
              {p!.stale && <p className="rounded-xl bg-warning px-4 py-2 text-sm text-warning-foreground">Menampilkan data tersimpan terakhir karena perangkat sedang offline atau server tidak terjangkau.</p>}
              {p!.perkiraan && (
                <p className="rounded-xl bg-muted px-4 py-2 text-sm leading-relaxed" role="note">
                  {p!.perkiraan.alasan === "cadangan-kuota"
                    ? `Lokasi Anda belum bisa dihitung langsung karena penyedia data sedang melebihi batas pemakaian, jadi ini data iklim kota terdekat: ${p!.perkiraan.kota} (sekitar ${p!.perkiraan.km} km). Pola umumnya serupa, tetapi angkanya perkiraan.`
                    : `Data iklim kota terdekat: ${p!.perkiraan.kota} (sekitar ${p!.perkiraan.km} km). Model iklim beresolusi 25-50 km, jadi hasilnya serupa untuk sekitar kota ini.`}
                </p>
              )}
              {p!.metode?.id === "pengamatan-delta" && (
                <p className="rounded-xl bg-muted px-4 py-2 text-sm leading-relaxed" role="note">
                  Dihitung dari data pengamatan lokasi Anda (NASA POWER, 1991-{p!.metode.akhirAmati}) karena model iklim resolusi tinggi sedang penuh. Angka 2031-2050 = pola cuaca {p!.metode.akhirAmati - 19}-{p!.metode.akhirAmati} di lokasi ini dengan suhu siang sekitar {String(p!.metode.perubahanSuhuC).replace(".", ",")}°C di atas rata-rata 1991-2010, sesuai proyeksi ansambel model CMIP6 untuk Indonesia (World Bank). Arah dan besarnya dapat dipercaya; detail per lokasi sedikit lebih kasar.
                </p>
              )}
              {/* Urutan untuk pembaca awam: tanya dulu, lalu hasil, lalu tindakan, lalu rinciannya. */}
              <PertanyaanRumah namaWilayah={lokasi.kabKota} />
              <RingkasanDampak uji={uji!} namaWilayah={lokasi.kabKota} lat={lokasi.lat} lon={lokasi.lon} dijawab={dijawab} profil={terisi ? { anggota: input.anggota, rentan: input.rentan } : null} tindakanUtama={ps.tampil?.opsi[0]?.judul} />
            </div>

            <Bagian
              id="judul-keputusan"
              judul="Apa yang dilakukan lebih dulu?"
              pengantar="Tiga tindakan yang paling membantu rumah Anda, masing-masing dengan alasan dan langkah kecil yang bisa dimulai hari ini."
            >
              <PenasihatKeputusan p={p!} lokasi={lokasi} input={input} uji={uji!} ps={ps} />
            </Bagian>

            <Bagian
              id="judul-uji"
              judul="Rincian air, panas, dan hujan"
              pengantar="Dasar hitungan tindakan di atas. Angka berubah seketika saat jawaban diubah."
            >
              <div className="space-y-4">
                <HasilUjiRumah u={uji!} input={input} />
                <details id="detail-rumah" className="group rounded-2xl border border-border bg-surface">
                  <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 text-sm font-semibold focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary">
                    Ubah detail rumah (jumlah orang, anggota rentan, sumber air, genangan)
                    <span className="shrink-0 text-muted-foreground group-open:hidden">Buka</span>
                    <span className="hidden shrink-0 text-muted-foreground group-open:inline">Tutup</span>
                  </summary>
                  <div className="border-t border-border p-5"><FormRumah input={input} dariProfil={dariProfil} /></div>
                </details>
              </div>
            </Bagian>

            <details className="group rounded-2xl border border-border bg-surface">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 text-base font-bold focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary">
                Data iklim lengkap dan cara membacanya
                <span className="text-sm font-medium text-muted-foreground group-open:hidden">Buka</span>
                <span className="hidden text-sm font-medium text-muted-foreground group-open:inline">Tutup</span>
              </summary>
              <div className="border-t border-border p-5">
                <DataLengkap p={p!} />
              </div>
            </details>
          </>
        ))}
      </div>
    </div>
  );
}
