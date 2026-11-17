"use client";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import type { Lokasi } from "@/types";
import { Combobox, type Opsi } from "./combobox";

/**
 * Kontrak dataset (public/data/wilayah/), disesuaikan setelah dataset dipilih (Blueprint 15.3):
 *  - provinsi.json       : [{ kode, nama }]
 *  - {kodeProvinsi}.json : { kode, nama, kabKota: [{ kode, nama, kecamatan: [{ kode, nama,
 *                            kelurahan: [{ kode, nama, lat, lon }] }] }] }
 *  kode kelurahan harus berformat adm4 BMKG (mis. 31.71.01.1001).
 */
interface Kel extends Opsi { lat: number; lon: number }
interface Kec extends Opsi { kelurahan: Kel[] }
interface Kab extends Opsi { kecamatan: Kec[] }
interface Prov extends Opsi { kabKota: Kab[] }

export function WilayahPicker({ onSubmit }: { onSubmit: (l: Lokasi) => void }) {
  const [provList, setProvList] = useState<Opsi[]>([]);
  const [prov, setProv] = useState<Prov | null>(null);
  const [kab, setKab] = useState<string | null>(null);
  const [kec, setKec] = useState<string | null>(null);
  const [kel, setKel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingProv, setLoadingProv] = useState(false);

  useEffect(() => {
    fetch("/data/wilayah/provinsi.json")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setProvList)
      .catch(() => setError("Daftar wilayah belum dapat dimuat. Muat ulang halaman."));
  }, []);

  async function pilihProvinsi(kode: string) {
    setKab(null); setKec(null); setKel(null); setError(null); setLoadingProv(true);
    try {
      const r = await fetch(`/data/wilayah/${kode}.json`); // dimuat malas per provinsi
      if (!r.ok) throw new Error();
      setProv((await r.json()) as Prov);
    } catch {
      setProv(null);
      setError("Data provinsi ini belum dapat dimuat. Coba lagi.");
    } finally {
      setLoadingProv(false);
    }
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
        onSubmit({
          adm4: kelO.kode, kelurahan: kelO.nama, kecamatan: kecO.nama,
          kabKota: kabO.nama, provinsi: prov.nama, lat: kelO.lat, lon: kelO.lon,
        });
      }}
    >
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
