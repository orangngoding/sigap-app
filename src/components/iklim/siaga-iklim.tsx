"use client";
import Link from "next/link";
import Image from "next/image";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPin, RefreshCw } from "lucide-react";
import type { ProyeksiResponse } from "@/lib/data/proyeksi";
import { useHydrate } from "@/hooks/use-hydrate";
import { readCache, writeCache } from "@/lib/storage/safe-storage";
import { useLokasiStore } from "@/stores/lokasi-store";
import { useProfilStore } from "@/stores/profil-store";
import { useIklimRumahStore } from "@/stores/iklim-rumah-store";
import { profilSudahDiisi } from "@/lib/preparedness/profil-awal";
import { snapGrid } from "@/lib/data/iklim-math";
import { ujiKetahanan, type InputRumah } from "@/lib/iklim/ketahanan";
import { FOTO } from "@/lib/gambar";
import { KalenderRisiko, RingkasanKalender } from "./kalender-risiko";
import { FormRumah, HasilUjiRumah } from "./uji-rumah";
import { PenasihatKeputusan, usePenasihat } from "./penasihat-keputusan";
import { RingkasanDampak } from "./ringkasan-dampak";
import { JAWABAN_AWAL } from "@/stores/iklim-rumah-store";
import { DataLengkap } from "./data-lengkap";

type Tampil<T> = T & { stale?: boolean };

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
  const siap = useHydrate(useLokasiStore, useProfilStore, useIklimRumahStore);
  const lokasi = useLokasiStore((s) => s.lokasi);
  const profil = useProfilStore((s) => s.profil);
  const jawaban = useIklimRumahStore((s) => s.jawaban);

  const grid = lokasi ? `${snapGrid(lokasi.lat)},${snapGrid(lokasi.lon)}` : "";
  const proyeksi = useQuery<Tampil<ProyeksiResponse>>({
    queryKey: ["proyeksi", "v2", grid],
    enabled: siap && lokasi !== null,
    staleTime: Infinity,
    retry: 1,
    retryDelay: 4000,
    queryFn: async () => {
      try {
        const res = await fetch(`/api/proyeksi?lat=${lokasi!.lat}&lon=${lokasi!.lon}`);
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as ProyeksiResponse;
        if (!lengkap(data)) throw new Error("bentuk data lama");
        writeCache("proyeksi", grid, data);
        return data;
      } catch (e) {
        const lama = readCache<ProyeksiResponse>("proyeksi", grid);
        if (lama && lengkap(lama.data)) return { ...lama.data, stale: true };
        throw e;
      }
    },
  });

  const terisi = profilSudahDiisi(profil);
  const dariProfil = terisi && (jawaban.anggota === null || jawaban.adaRentan === null);
  const input = useMemo<InputRumah>(
    () => ({
      anggota: jawaban.anggota ?? (terisi ? profil.jumlahAnggota : 4),
      rentan: jawaban.adaRentan === null ? (terisi ? profil.lansia + profil.balita + profil.hamil : 0) : jawaban.adaRentan ? Math.max(1, terisi ? profil.lansia + profil.balita + profil.hamil : 1) : 0,
      litersTersimpan: jawaban.litersTersimpan,
      atap: jawaban.atap,
      sumberAir: jawaban.sumberAir,
      gangguanAir: jawaban.gangguanAir,
      pernahTergenang: jawaban.pernahTergenang,
    }),
    [jawaban, terisi, profil],
  );
  const p = proyeksi.data;
  const uji = useMemo(() => (p ? ujiKetahanan(input, p) : null), [p, input]);
  const ps = usePenasihat(p, lokasi, input, uji);
  const contoh = JSON.stringify(jawaban) === JSON.stringify(JAWABAN_AWAL);

  if (!siap) return <div className="h-80 animate-pulse rounded-3xl bg-muted motion-reduce:animate-none" aria-busy="true" />;
  if (!lokasi) return <TanpaLokasi />;
  if (proyeksi.isPending) return <Menghitung />;
  if (proyeksi.isError || !p || !uji || !ps.tampil)
    return (
      <div role="alert" className="rounded-3xl border border-border bg-surface p-6">
        <p className="font-semibold">Data proyeksi iklim belum dapat dimuat.</p>
        <p className="mt-1 text-sm text-muted-foreground">Penyedia data mungkin sedang sibuk. Coba lagi sebentar lagi.</p>
        <button type="button" onClick={() => proyeksi.refetch()} className="press mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold hover:bg-muted">
          <RefreshCw className="size-4" aria-hidden="true" /> Coba lagi
        </button>
      </div>
    );

  return (
    <div className="space-y-14">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="inline-flex items-center gap-2 text-muted-foreground">
          <MapPin className="size-4 text-primary" aria-hidden="true" />
          {lokasi.kabKota}, {lokasi.provinsi}
        </p>
        <Link href="/lokasi" className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-2">Ganti lokasi</Link>
      </div>
      <div className="-mt-10 space-y-4">
        {p.stale && <p className="rounded-xl bg-warning px-4 py-2 text-sm text-warning-foreground">Menampilkan data tersimpan terakhir karena perangkat sedang offline atau server tidak terjangkau.</p>}
        <RingkasanDampak uji={uji} keputusan={ps.tampil} namaWilayah={lokasi.kabKota} lat={lokasi.lat} lon={lokasi.lon} contoh={contoh} />
      </div>

      <Bagian
        id="judul-keputusan"
        judul="Apa yang dilakukan lebih dulu?"
        pengantar="Diurutkan dari hasil uji rumah Anda. Tiap tindakan memuat alasan, seberapa kuat data mendukungnya, dan langkah yang bisa dimulai hari ini."
      >
        <PenasihatKeputusan p={p} lokasi={lokasi} input={input} uji={uji} ps={ps} />
      </Bagian>

      <Bagian
        id="judul-uji"
        judul="Keadaan rumah Anda"
        pengantar="Angka di atas berubah seketika saat Anda mengubah jawaban. Hitungan dilakukan di perangkat ini."
      >
        <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start">
          <FormRumah input={input} dariProfil={dariProfil} />
          <HasilUjiRumah u={uji} input={input} />
        </div>
      </Bagian>

      <Bagian id="judul-bulan-rawan" judul="Bulan mana yang rawan?">
        <RingkasanKalender p={p} namaWilayah={lokasi.kabKota} />
        <details className="group mt-5">
          <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-sm font-semibold text-primary underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-primary">
            <span className="group-open:hidden">Lihat angka 12 bulan</span>
            <span className="hidden group-open:inline">Sembunyikan angka 12 bulan</span>
          </summary>
          <div className="mt-4"><KalenderRisiko p={p} /></div>
        </details>
      </Bagian>

      <details className="group rounded-2xl border border-border bg-surface">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 text-base font-bold focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary">
          Data iklim lengkap dan cara membacanya
          <span className="text-sm font-medium text-muted-foreground group-open:hidden">Buka</span>
          <span className="hidden text-sm font-medium text-muted-foreground group-open:inline">Tutup</span>
        </summary>
        <div className="border-t border-border p-5">
          <DataLengkap p={p} />
        </div>
      </details>
    </div>
  );
}
