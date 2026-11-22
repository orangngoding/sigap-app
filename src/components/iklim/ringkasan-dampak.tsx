"use client";
import type { IklimResponse } from "@/types";
import { lebihParah, teksKeDepan, type HasilUji } from "@/lib/iklim/ketahanan";
import { fmt } from "@/lib/iklim/keputusan";
import { kemarauTerjadi, TAHUN_PENGAMATAN } from "@/lib/iklim/pengamatan";
import { useDataCard, TTL } from "@/hooks/use-data-card";
import { snapGrid } from "@/lib/data/iklim-math";
import { TombolTanya } from "@/components/tanya/tombol-tanya";
import { TeksPihak } from "@/components/rencana/teks-pihak";

interface Props {
  uji: HasilUji;
  namaWilayah: string;
  lat: number;
  lon: number;
  /** Tiga pertanyaan utama sudah dijawab. */
  dijawab: boolean;
  /** Profil keluarga dari Rencana yang dipakai untuk anggota dan anggota rentan (null bila profil belum diisi). */
  profil?: { anggota: number; rentan: number } | null;
  /** Judul tindakan nomor 1 (untuk pertanyaan ke Asisten). */
  tindakanUtama?: string;
}

/**
 * Kalimat fakta hasil (dihitung kode) untuk pertanyaan "Jelaskan untuk keluarga saya": Asisten hanya menerjemahkan
 * angka ini ke bahasa sehari-hari, bukan menghitung ulang.
 */
export function faktaUntukAsisten(u: HasilUji): string {
  const { air, panas, hujan } = u;
  const f = [`sekitar ${Math.round(panas.hariKini)} hari sangat panas per tahun saat ini (siang di atas sekitar ${Math.round(panas.ambangC)}°C), bisa sekitar ${Math.round(panas.hariDepan)} hari 10-25 tahun lagi`];
  if (air.dariPengguna) f.push(air.kurangKini > 0 ? `saat kemarau terburuk air bersih rumah kami bisa kurang ${air.kurangKini} hari` : `air simpanan kami cukup ${fmt(air.hariCukup)} hari`);
  else f.push("kami belum menjawab pertanyaan tentang air di rumah");
  f.push(`kemarau terpanjang pada tahun terburuk sekitar ${air.kemarauKini} hari`);
  if (hujan.tingkat !== "aman") f.push(`hujan sangat deras perlu diperhatikan`);
  return f.join("; ");
}

const A = ({ children }: { children: React.ReactNode }) => <span className="text-primary">{children}</span>;

/** Satu angka dampak utama untuk SAAT INI (2011-2030); 2031-2050 hanya sebagai arah tren di kalimat kedua. */
function pokok(u: HasilUji, w: string): { judul: React.ReactNode; sub: string } {
  const { air, panas, hujan } = u;
  const simpanan = air.hariCukup > 0 ? `air simpanan Anda cukup ${fmt(air.hariCukup)} hari` : "rumah Anda belum punya air simpanan";
  // Soal air belum dijawab: judul tidak boleh berupa hasil air dari isian bawaan. Pakai temuan dari data iklim.
  const prioritas = air.dariPengguna ? u.prioritas : lebihParah(u.hujan.tingkat, u.panas.tingkat) > 0 ? "hujan" : "panas";
  const ke = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
  if (prioritas === "air" && air.kurangKini > 0)
    return {
      judul: <>Saat kemarau panjang, rumah Anda mungkin perlu air dari luar sekitar <A>{air.kurangKini} hari</A>.</>,
      sub: `Perkiraan ini dari jawaban Anda tentang air di rumah, dan ${simpanan}. Bila kemarau makin panjang, 10-25 tahun lagi bisa sekitar ${air.kurangDepan} hari.`,
    };
  if (prioritas === "air" && air.kurangDepan > 0)
    return {
      judul: <>Air simpanan Anda cukup untuk sekarang, tetapi 10-25 tahun lagi mungkin kurang sekitar <A>{air.kurangDepan} hari</A>.</>,
      sub: "Di tahun yang paling kering, kemarau diperkirakan sedikit lebih panjang. Tandon atau drum bisa dipakai belasan tahun, jadi menyiapkannya dari sekarang tetap berguna.",
    };
  if (prioritas === "panas")
    return {
      judul: <>{w} sekarang punya sekitar <A>{Math.round(panas.hariKini)} hari panas terik</A> dalam setahun.</>,
      sub: `Maksudnya hari yang siangnya lebih dari ${Math.round(panas.ambangC)}°C. Dulu (tahun 1990-an) sekitar ${Math.round(panas.hariDulu)} hari, dan ${teksKeDepan(panas.hariKini, panas.hariDepan)}. Lansia, balita, dan rumah beratap seng paling merasakannya.`,
    };
  if (prioritas === "hujan")
    return {
      judul: <>{w} sekarang punya sekitar <A>{Math.max(1, Math.round(hujan.hariKini))} hari hujan sangat deras</A> dalam setahun.</>,
      sub: `Maksudnya hujan lebih dari ${Math.round(hujan.ambangMm)} mm dalam sehari, yang bisa membuat saluran meluap. ${ke(teksKeDepan(hujan.hariKini, hujan.hariDepan))}.${hujan.rawanGenang ? " Rumah Anda pernah tergenang, jadi siapkan sebelum bulan-bulan hujan." : ""}`,
    };
  return {
    judul: <>Air simpanan rumah Anda cukup <A>{fmt(air.hariCukup)} hari</A>, lebih lama dari perkiraan air sulit.</>,
    sub: `Air diperkirakan sulit sekitar ${air.perluKini} hari saat kemarau, dan sekitar ${air.perluDepan} hari 10-25 tahun lagi. Jaga simpanan ini, dan siapkan diri untuk panas terik dan hujan deras.`,
  };
}

/** Kemarau terpanjang yang benar-benar tercatat (ERA5, cadangan NASA POWER). Gagal dimuat = dikatakan terus terang, bukan disembunyikan diam-diam. */
function SudahTerjadi({ lat, lon, proyeksiKini }: { lat: number; lon: number; proyeksiKini: number }) {
  const q = useDataCard<IklimResponse>("iklim", `${snapGrid(lat)},${snapGrid(lon)}`, `/api/iklim?lat=${lat}&lon=${lon}`, TTL.iklim);
  if (q.isPending) return <p className="h-5 w-3/4 animate-pulse rounded bg-muted motion-reduce:animate-none" aria-hidden="true" />;
  const k = kemarauTerjadi(q.data, proyeksiKini);
  if (q.isError || !k) return <p className="text-sm text-muted-foreground">Catatan kemarau beberapa tahun terakhir belum dapat dimuat. Angka di atas tetap dari proyeksi model.</p>;
  const banding = {
    lebih: <> Yang sudah terjadi ternyata lebih panjang dari perkiraan ({proyeksiKini} hari), jadi anggap perkiraan itu angka paling ringan.</>,
    sekitar: <> Hasilnya mirip dengan perkiraan ({proyeksiKini} hari).</>,
    kurang: <> Perkiraan untuk tahun yang paling kering lebih panjang ({proyeksiKini} hari). Kemarau sepanjang itu belum terjadi dalam {TAHUN_PENGAMATAN} tahun terakhir, tetapi tetap bisa terjadi.</>,
  }[k.banding];
  return (
    <div className="text-sm leading-relaxed">
      <p><strong>Yang sudah terjadi:</strong> <TeksPihak>dalam {TAHUN_PENGAMATAN} tahun terakhir, kemarau terpanjang di wilayah Anda</TeksPihak> <strong>{k.hari} hari tanpa hujan</strong> ({k.tahun}).</p>
      <details className="mt-1">
        <summary className="min-h-8 any-pointer-coarse:min-h-11 cursor-pointer font-semibold text-primary">Kenapa berbeda dari angka perkiraan?</summary>
        <p className="mt-1 text-muted-foreground">
          Angka perkiraan menggambarkan tahun yang paling kering dalam 20 tahun, sedangkan catatan ini hanya {TAHUN_PENGAMATAN} tahun ({k.tahunAwal}-{k.tahunAkhir}).{banding} Sumber: catatan cuaca {q.data?.sumber.nama.startsWith("NASA") ? "NASA POWER" : "ERA5 (Open-Meteo)"}{q.data?.stale ? ", tersimpan terakhir" : ""}.
        </p>
      </details>
    </div>
  );
}

export function RingkasanDampak({ uji, namaWilayah, lat, lon, dijawab, profil, tindakanUtama }: Props) {
  const { judul, sub } = pokok(uji, namaWilayah);
  const keluarga = profil ? `${profil.anggota} orang${profil.rentan ? ", ada lansia, balita, atau ibu hamil" : ""}` : "keluarga kami";
  const pertanyaan = `Jelaskan dengan 3 kalimat sederhana, tanpa istilah teknis, untuk keluarga saya di ${namaWilayah} (${keluarga}). Hasil Siaga Iklim rumah kami: ${faktaUntukAsisten(uji)}.${tindakanUtama ? ` Tindakan pertama yang disarankan: ${tindakanUtama}.` : ""} Apa artinya bagi kami, dan apa satu hal terpenting yang bisa kami lakukan minggu ini?`;
  return (
    <section aria-labelledby="judul-dampak" className="rounded-3xl border border-border bg-surface p-6 sm:p-8">
      <p className="text-sm font-semibold text-muted-foreground"><TeksPihak>{dijawab ? "Hasil untuk rumah Anda" : "Yang sudah terlihat dari data iklim wilayah Anda"}</TeksPihak></p>
      <h2 id="judul-dampak" className="mt-1 max-w-3xl text-2xl font-bold leading-snug tracking-tight text-balance sm:text-3xl"><TeksPihak>{judul}</TeksPihak></h2>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground"><TeksPihak>{sub}</TeksPihak></p>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Ini perkiraan kasar, bukan ramalan pasti. Gunanya agar Anda bisa bersiap sedikit demi sedikit, bukan untuk khawatir.</p>
      <div className="mt-3 max-w-2xl"><SudahTerjadi lat={lat} lon={lon} proyeksiKini={uji.air.kemarauKini} /></div>
      <div className="mt-4"><TombolTanya label="Jelaskan untuk keluarga saya" pertanyaan={pertanyaan} className="text-sm" /></div>
      <p className="mt-5 max-w-2xl border-t border-border pt-4 text-sm text-muted-foreground">
        <TeksPihak>{profil ? `Jumlah orang dan anggota rentan dari profil keluarga Anda di Rencana (${profil.anggota} orang${profil.rentan ? `, ${profil.rentan} anggota rentan` : ""}). ` : ""}</TeksPihak>
        {dijawab ? "Hitungan dilakukan di perangkat ini." : "Angka air dan atap menyesuaikan setelah pertanyaan di atas dijawab."}{" "}
        <a
          href="#detail-rumah" className="font-semibold text-foreground underline underline-offset-2"
          onClick={() => { const d = document.getElementById("detail-rumah"); if (d instanceof HTMLDetailsElement) d.open = true; }}
        >Ubah detail rumah</a>
      </p>
    </section>
  );
}
