// Cadangan proyeksi untuk SEMUA lokasi bila model resolusi tinggi (Open-Meteo Climate API) tidak tersedia karena kuota:
// "metode delta" (delta change), teknik baku dalam kajian dampak iklim.
//  1. Masa lalu dan saat ini = PENGAMATAN harian NASA POWER di lokasi itu (1991-2010 dan 2011-tahun penuh terakhir).
//  2. 2031-2050 = pola harian 20 tahun pengamatan TERAKHIR di lokasi itu (memuat kemarau El Niño 2015, 2019, 2023).
//     Suhu siang: naik-turun hariannya dipertahankan, tetapi rata-ratanya dipatok ke rata-rata 1991-2010 di lokasi itu
//     DITAMBAH pemanasan menurut ansambel model CMIP6 (World Bank Climate Change Knowledge Portal, rata-rata wilayah
//     Indonesia, SSP5-8.5 agar setara dengan skenario emisi tinggi pada jalur utama). Patokan ini membuat hasil tidak
//     terpengaruh tren semu data reanalisis di satu sel grid. Hujan: dikali sisa persentase perubahan.
//  3. Rentang = persentil 10 dan 90 ansambel (ketidakpastian antar-model), angka utama = median.
// Keterbatasan (ditampilkan di antarmuka): perubahan adalah rata-rata nasional, bukan khusus lokasi; pola kemarau
// masa depan mengikuti 20 tahun terakhir sehingga perubahan panjang kemarau akibat pemanasan tidak tertangkap penuh.
import { ringkasDeret, type DeretModel, type ProyeksiResponse } from "./proyeksi";
import { snapKasar } from "./iklim-math";
import { SUMBER_POWER } from "./nasa-power";

/**
 * Perubahan suhu siang (°C) dan hujan (%) terhadap 1995-2014 untuk periode CCKP 2020-2039 dan 2040-2059, CMIP6 x0.25,
 * SSP5-8.5, agregat nasional Indonesia (IDN). Diambil dari API CCKP pada 19 November 2026:
 * cckpapi.worldbank.org/cckp/v1/cmip6-x0.25_climatology_tasmax,prpercnt_anomaly_annual_{periode}_{persentil}_ssp585_ensemble_all_mean/IDN
 */
export const DELTA_CCKP = {
  sumber: {
    nama: "World Bank Climate Change Knowledge Portal (ansambel CMIP6, SSP5-8.5)",
    url: "https://climateknowledgeportal.worldbank.org/country/indonesia",
    lisensi: "CC BY 4.0",
  },
  /** Titik tengah periode acuan 1995-2014 dan dua periode proyeksi. */
  tengah: { acuan: 2004.5, p2030: 2029.5, p2050: 2049.5 },
  anggota: [
    { nama: "Ansambel CMIP6 persentil 10 (pemanasan rendah)", suhu: [0.38, 0.96], hujan: [-2.81, -3.8] },
    { nama: "Ansambel CMIP6 median", suhu: [0.66, 1.48], hujan: [1.28, 0.39] },
    { nama: "Ansambel CMIP6 persentil 90 (pemanasan tinggi)", suhu: [1.0, 2.09], hujan: [6.24, 8.67] },
  ],
} as const;

const DASAR = { awal: 1991, akhir: 2010 } as const;
const DEPAN = { awal: 2031, akhir: 2050 } as const;

/** Anomali CCKP pada tahun `th` (linear antar titik tengah; 0 pada acuan 1995-2014; sedikit negatif sebelum acuan). */
export function anomaliPada(nilai: readonly [number, number], th: number): number {
  const { acuan, p2030, p2050 } = DELTA_CCKP.tengah;
  if (th <= p2030) return (nilai[0] * (th - acuan)) / (p2030 - acuan);
  return nilai[0] + ((nilai[1] - nilai[0]) * (th - p2030)) / (p2050 - p2030);
}

/**
 * Perubahan yang masih akan terjadi dari titik tengah dasar pengamatan ke titik tengah 2031-2050. Untuk hujan (%),
 * selisih persentase dipakai sebagai pendekatan (perubahannya kecil, beberapa persen).
 */
export function deltaSisa(nilai: readonly [number, number], tengahDasar: number): number {
  const tengahDepan = (DEPAN.awal + DEPAN.akhir) / 2;
  return Math.round((anomaliPada(nilai, tengahDepan) - anomaliPada(nilai, tengahDasar)) * 100) / 100;
}

/** Tahun penuh terakhir dalam deret (minimal 360 hari berisi), agar tahun berjalan yang belum lengkap tidak ikut. */
export function tahunPenuhTerakhir(d: DeretModel): number {
  const isi = new Map<number, number>();
  d.time.forEach((t, i) => {
    if (typeof d.hujan[i] === "number" && typeof d.tmax[i] === "number") isi.set(Number(t.slice(0, 4)), (isi.get(Number(t.slice(0, 4))) ?? 0) + 1);
  });
  return Math.max(0, ...[...isi.entries()].filter(([, n]) => n >= 360).map(([th]) => th));
}

/** Rata-rata suhu siang pada rentang tahun [awal, akhir]. */
function rataSuhu(d: DeretModel, awal: number, akhir: number): number {
  let n = 0;
  let jml = 0;
  d.time.forEach((t, i) => {
    const th = Number(t.slice(0, 4));
    const v = d.tmax[i];
    if (th >= awal && th <= akhir && typeof v === "number") {
      jml += v;
      n++;
    }
  });
  return n ? jml / n : NaN;
}

/**
 * Deret satu anggota: pengamatan apa adanya sampai `akhirAmati`, lalu 2031-2050 = 20 tahun terakhir dengan suhu siang
 * dipatok ke (rata-rata 1991-2010 + `suhuC`) dan hujan dikali (1 + `hujanPersen`/100).
 */
export function deretDelta(d: DeretModel, akhirAmati: number, suhuC: number, hujanPersen: number): DeretModel {
  const out: DeretModel = { time: [], tmax: [], hujan: [] };
  const awalDasar = akhirAmati - 19;
  const koreksi = rataSuhu(d, DASAR.awal, DASAR.akhir) - rataSuhu(d, awalDasar, akhirAmati) + suhuC;
  const geser = DEPAN.awal - awalDasar;
  const faktor = 1 + hujanPersen / 100;
  const masaDepan: DeretModel = { time: [], tmax: [], hujan: [] };
  d.time.forEach((t, i) => {
    const th = Number(t.slice(0, 4));
    if (th <= akhirAmati) {
      out.time.push(t);
      out.tmax.push(d.tmax[i]);
      out.hujan.push(d.hujan[i]);
    }
    if (th >= awalDasar && th <= akhirAmati) {
      if (t.slice(5) === "02-29" && (th + geser) % 4 !== 0) return; // tahun kabisat tidak selalu bergeser bersama
      masaDepan.time.push(`${th + geser}${t.slice(4)}`);
      const tm = d.tmax[i];
      const h = d.hujan[i];
      masaDepan.tmax.push(typeof tm === "number" ? tm + koreksi : null);
      masaDepan.hujan.push(typeof h === "number" ? h * faktor : null);
    }
  });
  out.time.push(...masaDepan.time);
  out.tmax.push(...masaDepan.tmax);
  out.hujan.push(...masaDepan.hujan);
  return out;
}

/** Proyeksi lengkap (struktur sama dengan jalur utama) dari pengamatan lokal + perubahan ansambel CMIP6. */
export function proyeksiDariPengamatan(d: DeretModel, lat: number, lon: number, now = new Date()): ProyeksiResponse {
  const akhirAmati = tahunPenuhTerakhir(d);
  if (akhirAmati < 2015) throw new Error("Pengamatan terlalu pendek untuk metode delta");
  const awalData = Number(d.time[0]?.slice(0, 4));
  if (!(awalData <= DASAR.awal)) throw new Error("Pengamatan harus mencakup 1991-2010");

  // Suhu: pemanasan dari titik tengah 1991-2010 (patokan rata-rata); hujan: sisa perubahan dari titik tengah 20 tahun terakhir.
  const tengahLama = (DASAR.awal + DASAR.akhir) / 2;
  const tengahDasar = akhirAmati - 9.5;
  const anggota = DELTA_CCKP.anggota.map((a) => ({ nama: a.nama, suhuC: deltaSisa(a.suhu, tengahLama), hujanPersen: deltaSisa(a.hujan, tengahDasar) }));

  const hasil = ringkasDeret(
    anggota.map((a) => ({ nama: a.nama, d: deretDelta(d, akhirAmati, a.suhuC, a.hujanPersen) })),
    {
      sumber: { nama: `${SUMBER_POWER.nama} + ${DELTA_CCKP.sumber.nama}`, url: DELTA_CCKP.sumber.url, diambilPada: now.toISOString(), lisensi: `${SUMBER_POWER.lisensi}; CCKP ${DELTA_CCKP.sumber.lisensi}` },
      grid: { lat: snapKasar(lat), lon: snapKasar(lon) },
      periode: { kini: { awal: 2011, akhir: akhirAmati } },
      catatan: `Metode delta: 1991-2010 dan 2011-${akhirAmati} adalah PENGAMATAN NASA POWER di lokasi ini; 2031-2050 adalah pola harian ${akhirAmati - 19}-${akhirAmati} di lokasi ini dengan suhu siang rata-rata 1991-2010 ditambah pemanasan menurut ansambel model CMIP6 (World Bank CCKP, rata-rata Indonesia, skenario emisi tinggi SSP5-8.5). Rentang = persentil 10-90 ansambel.`,
    },
  );
  // Grafik tahunan hanya memuat tahun pengamatan: tahun 2031-2050 metode delta bukan deret tahunan sungguhan.
  hasil.tahunan = hasil.tahunan.filter((t) => t.tahun <= akhirAmati);
  hasil.metode = { id: "pengamatan-delta", akhirAmati, perubahanSuhuC: anggota[1].suhuC, perubahanHujanPersen: anggota[1].hujanPersen };
  return hasil;
}
