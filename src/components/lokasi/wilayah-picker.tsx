"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, LocateFixed } from "lucide-react";
import type { Lokasi } from "@/types";
import { kabKotaTerdekat, type KabKotaRingkas } from "@/lib/geo/terdekat";
import { PESAN_TIDAK_AMAN, pesanGalatLokasi } from "@/lib/geo/galat-lokasi";
import { Combobox, type Opsi } from "./combobox";

/**
 * Kontrak dataset (public/data/wilayah/), disesuaikan setelah dataset dipilih (Blueprint 15.3):
 *  - provinsi.json       : [{ kode, nama }]
 *  - {kodeProvinsi}.json : { kode, nama, kabKota: [{ kode, nama, lat, lon, kecamatan: [{ kode, nama,
 *                            kelurahan: [{ kode, nama }] }] }] }
 *  kode kelurahan berformat adm4 BMKG (mis. 31.71.01.1001). Sumber: scripts/bangun-wilayah.ts.
 *  Dataset hanya punya koordinat tingkat kab/kota, jadi kelurahan memakai pusat kab/kota (perkiraan).
 */
interface Kel extends Opsi { lat?: number; lon?: number }
interface Kec extends Opsi { kelurahan: Kel[] }
interface Kab extends Opsi { lat?: number; lon?: number; kecamatan: Kec[] }
interface Prov extends Opsi { kabKota: Kab[] }

export function WilayahPicker({ onSubmit }: { onSubmit: (l: Lokasi) => void }) {
  const [provList, setProvList] = useState<Opsi[]>([]);
  const [prov, setProv] = useState<Prov | null>(null);
  const [kab, setKab] = useState<string | null>(null);
  const [kec, setKec] = useState<string | null>(null);
  const [kel, setKel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingProv, setLoadingProv] = useState(false);
  const [mencari, setMencari] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const permintaanProv = useRef(0);

  useEffect(() => {
    fetch("/data/wilayah/provinsi.json")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setProvList)
      .catch(() => setError("Daftar wilayah belum dapat dimuat. Muat ulang halaman."));
  }, []);

  async function pilihProvinsi(kode: string, kabAwal: string | null = null) {
    // Hanya permintaan terakhir yang boleh mengisi state; jawaban lama yang datang belakangan diabaikan.
    const id = ++permintaanProv.current;
    setKab(kabAwal); setKec(null); setKel(null); setError(null); setLoadingProv(true);
    try {
      const r = await fetch(`/data/wilayah/${kode}.json`); // dimuat malas per provinsi
      if (!r.ok) throw new Error();
      const data = (await r.json()) as Prov;
      if (id === permintaanProv.current) setProv(data);
    } catch {
      if (id !== permintaanProv.current) return;
      setProv(null);
      setKab(null);
      setError("Data provinsi ini belum dapat dimuat. Coba lagi.");
    } finally {
      if (id === permintaanProv.current) setLoadingProv(false);
    }
  }

  /**
   * "Gunakan lokasi saya" (Blueprint 6.1): koordinat peramban hanya dipakai sekali untuk menebak
   * kab/kota terdekat dan tidak disimpan. Kecamatan dan kelurahan tetap dipilih pengguna.
   */
  function gunakanLokasiSaya() {
    setInfo(null); setError(null);
    if (!("geolocation" in navigator)) {
      setError("Peramban ini tidak mendukung lokasi. Pilih wilayah secara manual.");
      return;
    }
    if (!window.isSecureContext) {
      setError(`${PESAN_TIDAK_AMAN} Pilih wilayah secara manual.`);
      return;
    }
    setMencari(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const r = await fetch("/data/wilayah/kabkota.json");
          if (!r.ok) throw new Error();
          const hasil = kabKotaTerdekat(pos.coords.latitude, pos.coords.longitude, (await r.json()) as KabKotaRingkas[]);
          if (!hasil) {
            setError("Lokasi Anda tampaknya di luar wilayah yang tersedia. Pilih wilayah secara manual.");
            return;
          }
          await pilihProvinsi(hasil.kabKota.prov, hasil.kabKota.kode);
          setInfo(`Kami menebak ${hasil.kabKota.nama} berdasarkan lokasi Anda. Pilih kecamatan dan kelurahan/desa, lalu periksa kembali.`);
        } catch {
          setError("Daftar wilayah belum dapat dimuat. Pilih wilayah secara manual.");
        } finally {
          setMencari(false);
        }
      },
      (err) => {
        setMencari(false);
        void pesanGalatLokasi(err, "Atau pilih wilayah secara manual di bawah.").then(setError);
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    );
  }

  const kabO = prov?.kabKota.find((k) => k.kode === kab);
  const kecO = kabO?.kecamatan.find((k) => k.kode === kec);
  const kelO = kecO?.kelurahan.find((k) => k.kode === kel);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!prov || !kabO || !kecO || !kelO) return;
        const lat = kelO.lat ?? kabO.lat;
        const lon = kelO.lon ?? kabO.lon;
        if (lat === undefined || lon === undefined) {
          setError("Koordinat wilayah ini belum tersedia. Pilih wilayah lain di sekitarnya.");
          return;
        }
        onSubmit({
          adm4: kelO.kode, kelurahan: kelO.nama, kecamatan: kecO.nama,
          kabKota: kabO.nama, provinsi: prov.nama, lat, lon,
        });
      }}
    >
      <div>
        <button
          type="button"
          onClick={gunakanLokasiSaya}
          disabled={mencari}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-semibold hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
        >
          <LocateFixed className="size-4" aria-hidden="true" /> {mencari ? "Mencari lokasi…" : "Gunakan lokasi saya"}
        </button>
        {info && <p role="status" className="mt-2 text-sm text-muted-foreground">{info}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Combobox label="Provinsi" options={provList} value={prov?.kode ?? null} onChange={pilihProvinsi} />
        <Combobox label="Kabupaten/Kota" options={prov?.kabKota ?? []} value={kab} disabled={!prov || loadingProv}
          onChange={(v) => { setKab(v); setKec(null); setKel(null); }} />
        <Combobox label="Kecamatan" options={kabO?.kecamatan ?? []} value={kec} disabled={!kabO}
          onChange={(v) => { setKec(v); setKel(null); }} />
        <Combobox label="Kelurahan/Desa" options={kecO?.kelurahan ?? []} value={kel} disabled={!kecO} onChange={setKel} />
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <button
        type="submit" disabled={!kelO}
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
      >
        Lihat Profil Lokasi <ArrowRight className="size-4" aria-hidden="true" />
      </button>
    </form>
  );
}
