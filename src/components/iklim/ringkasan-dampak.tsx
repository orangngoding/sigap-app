"use client";
import { ArrowDown, Clock } from "lucide-react";
import type { IklimResponse } from "@/types";
import type { HasilUji } from "@/lib/iklim/ketahanan";
import { fmt, type HasilKeputusan } from "@/lib/iklim/keputusan";
import { kemarauTerjadi, TAHUN_PENGAMATAN } from "@/lib/iklim/pengamatan";
import { useDataCard, TTL } from "@/hooks/use-data-card";
import { snapGrid } from "@/lib/data/iklim-math";
import { waktuMulai } from "./penasihat-keputusan";

interface Props {
  uji: HasilUji;
  keputusan: HasilKeputusan;
  namaWilayah: string;
  lat: number;
  lon: number;
  /** Jawaban masih bawaan aplikasi (belum diisi pengguna): angka adalah contoh. */
  contoh: boolean;
}

const A = ({ children }: { children: React.ReactNode }) => <span className="text-primary">{children}</span>;

/** Satu angka dampak utama untuk SAAT INI (2011-2030); 2031-2050 hanya sebagai arah tren di kalimat kedua. */
function pokok(u: HasilUji, w: string): { judul: React.ReactNode; sub: string } {
  const { air, panas, hujan } = u;
  const simpanan = air.hariCukup > 0 ? `Air simpanan Anda cukup ${fmt(air.hariCukup)} hari` : "Rumah Anda belum punya air simpanan";
  if (u.prioritas === "air" && air.kurangKini > 0)
    return {
      judul: <>Saat kemarau terburuk, rumah Anda bisa <A>{air.kurangKini} hari</A> tanpa cukup air bersih.</>,
      sub: `${simpanan}, sedangkan air bisa sulit sekitar ${air.perluKini} hari. Bila tren berlanjut 10-25 tahun lagi (2031-2050), kekurangannya menjadi ${air.kurangDepan} hari.`,
    };
  if (u.prioritas === "air" && air.kurangDepan > 0)
    return {
      judul: <>Air simpanan Anda cukup untuk kemarau saat ini, tetapi bisa kurang <A>{air.kurangDepan} hari</A> dalam 10-25 tahun lagi.</>,
      sub: `Kemarau terpanjang di wilayah ini diproyeksikan ${air.kemarauKini} hari saat ini dan ${air.kemarauDepan} hari pada 2031-2050. Tandon dan drum dipakai belasan tahun, jadi bersiap sekarang tetap berarti.`,
    };
  if (u.prioritas === "panas")
    return {
      judul: <>Saat ini, {w} mengalami sekitar <A>{fmt(panas.hariKini)} hari sangat panas</A> per tahun.</>,
      sub: `Pada 1990-an sekitar ${fmt(panas.hariDulu)} hari; bila tren berlanjut 10-25 tahun lagi, sekitar ${fmt(panas.hariDepan)} hari. Panas terik paling berat bagi lansia, balita, dan rumah beratap seng.`,
    };
  if (u.prioritas === "hujan")
    return {
      judul: <>Saat ini, {w} mengalami sekitar <A>{fmt(hujan.hariKini)} hari hujan ekstrem</A> per tahun.</>,
      sub: `Pada 1990-an sekitar ${fmt(hujan.hariDulu)} hari; bila tren berlanjut 10-25 tahun lagi, sekitar ${fmt(hujan.hariDepan)} hari.${hujan.rawanGenang ? " Rumah Anda pernah tergenang, jadi persiapan sebelum bulan puncak lebih penting." : ""}`,
    };
  return {
    judul: <>Air simpanan rumah Anda cukup <A>{fmt(air.hariCukup)} hari</A>, lebih lama dari masa air sulit saat ini.</>,
    sub: `Air diperkirakan sulit sekitar ${air.perluKini} hari saat ini dan ${air.perluDepan} hari pada 2031-2050. Jaga simpanan ini, dan siapkan diri menghadapi panas dan hujan lebat.`,
  };
}

/** Kemarau terpanjang yang benar-benar tercatat (ERA5). Gagal dimuat = dikatakan terus terang, bukan disembunyikan diam-diam. */
function SudahTerjadi({ lat, lon, proyeksiKini }: { lat: number; lon: number; proyeksiKini: number }) {
  const q = useDataCard<IklimResponse>("iklim", `${snapGrid(lat)},${snapGrid(lon)}`, `/api/iklim?lat=${lat}&lon=${lon}`, TTL.iklim);
  if (q.isPending) return <p className="h-5 w-3/4 animate-pulse rounded bg-muted motion-reduce:animate-none" aria-hidden="true" />;
  const k = kemarauTerjadi(q.data, proyeksiKini);
  if (q.isError || !k) return <p className="text-sm text-muted-foreground">Catatan kemarau beberapa tahun terakhir belum dapat dimuat. Angka di atas tetap dari proyeksi model.</p>;
  const banding = {
    lebih: <> Itu lebih panjang dari proyeksi model untuk tahun terburuk saat ini ({proyeksiKini} hari), jadi anggap angka di atas sebagai batas bawah.</>,
    sekitar: <> Sejalan dengan proyeksi model untuk tahun terburuk saat ini ({proyeksiKini} hari).</>,
    kurang: <> Proyeksi tahun terburuk saat ini lebih panjang ({proyeksiKini} hari); kemarau sepanjang itu belum terjadi dalam {TAHUN_PENGAMATAN} tahun terakhir, tetapi tetap mungkin.</>,
  }[k.banding];
  return (
    <p className="text-sm leading-relaxed">
      <strong>Yang sudah terjadi:</strong> kemarau terpanjang di wilayah Anda dalam {TAHUN_PENGAMATAN} tahun terakhir ({k.tahunAwal}-{k.tahunAkhir}) adalah <strong>{k.hari} hari tanpa hujan</strong>, pada {k.tahun}.
      <span className="text-muted-foreground">{banding} Sumber: data pengamatan ERA5 (Open-Meteo){q.data?.stale ? ", tersimpan terakhir" : ""}.</span>
    </p>
  );
}

export function RingkasanDampak({ uji, keputusan, namaWilayah, lat, lon, contoh }: Props) {
  const { judul, sub } = pokok(uji, namaWilayah);
  const utama = keputusan.opsi[0];
  const e = utama?.efekAir ?? null;
  const waktu = utama ? waktuMulai(utama) : null;

  let efek: React.ReactNode = null;
  if (e && e.tutupKini > 0)
    efek = <>Menutup <strong>{e.tutupKini} dari {e.tutupKini + e.kurangKiniBaru} hari</strong> kekurangan air saat ini{e.kurangKiniBaru === 0 ? ", sehingga air rumah Anda cukup" : ""}.</>;
  else if (e && e.tutup > 0)
    efek = <>Menutup <strong>{e.tutup} dari {e.tutup + e.kurangDepanBaru} hari</strong> kekurangan air pada 2031-2050.</>;

  return (
    <section aria-labelledby="judul-dampak" className="rounded-3xl border border-border bg-surface p-6 sm:p-8">
      <h2 id="judul-dampak" className="max-w-3xl text-2xl font-bold leading-snug tracking-tight text-balance sm:text-3xl">{judul}</h2>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">{sub}</p>
      <div className="mt-3 max-w-2xl"><SudahTerjadi lat={lat} lon={lon} proyeksiKini={uji.air.kemarauKini} /></div>

      {utama && (
        <div className="mt-6 grid gap-x-10 gap-y-5 border-t border-border pt-5 md:grid-cols-2">
          <div>
            <p className="text-sm font-semibold text-muted-foreground">Tindakan pertama</p>
            <p className="mt-1 text-lg font-bold leading-snug">{utama.judul}</p>
            {efek ? <p className="mt-1 text-sm leading-relaxed">{efek}</p> : <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{utama.alasan}</p>}
            {waktu && <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-primary"><Clock className="size-4" aria-hidden="true" /> {waktu}</p>}
          </div>
          <div>
            <p className="text-sm font-semibold text-muted-foreground">Bisa dilakukan hari ini</p>
            <p className="mt-1 text-base leading-relaxed">{utama.langkahPertama}</p>
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <a href="#judul-keputusan" className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-primary underline underline-offset-2">
          <ArrowDown className="size-4" aria-hidden="true" /> Lihat tiga tindakan dan alasannya
        </a>
        <p className="text-muted-foreground">
          {contoh
            ? <>Contoh dari jawaban bawaan (tanpa air simpanan). <a href="#judul-uji" className="font-semibold text-foreground underline underline-offset-2">Isi keadaan rumah Anda</a> agar angka ini tepat.</>
            : <>Dihitung dari proyeksi dua model iklim dan jawaban Anda. <a href="#judul-uji" className="font-semibold text-foreground underline underline-offset-2">Ubah jawaban</a></>}
        </p>
      </div>
    </section>
  );
}
