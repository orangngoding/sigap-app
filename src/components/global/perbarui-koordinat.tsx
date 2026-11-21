"use client";
import { useEffect, useRef } from "react";
import { useHydrate } from "@/hooks/use-hydrate";
import { useLokasiStore } from "@/stores/lokasi-store";
import { ambilKoordinatDesa } from "@/lib/geo/koordinat-desa";

/**
 * Lokasi yang tersimpan sebelum koordinat desa tersedia masih memakai pusat kabupaten/kota. Komponen ini mengambil
 * koordinat kelurahan/desa dari BMKG SEKALI lalu memperbarui lokasi, sehingga peta, Profil Risiko, Siaga Iklim, dan
 * simulasi memakai titik yang tepat. Tidak menampilkan apa pun; gagal = dicoba lagi pada kunjungan berikutnya.
 */
export function PerbaruiKoordinat() {
  const siap = useHydrate(useLokasiStore);
  const lokasi = useLokasiStore((s) => s.lokasi);
  const sudah = useRef<string | null>(null);

  useEffect(() => {
    if (!siap || !lokasi || lokasi.presisi === "desa" || sudah.current === lokasi.adm4) return;
    // Tanpa pembatalan saat efek dijalankan ulang: store bisa dipulihkan ulang oleh halaman lain (objek lokasi
    // berganti) dan permintaan yang sudah berjalan harus tetap selesai. Hasilnya diperiksa terhadap lokasi terkini.
    sudah.current = lokasi.adm4;
    void ambilKoordinatDesa(lokasi.adm4, { lat: lokasi.lat, lon: lokasi.lon }).then((k) => {
      const kini = useLokasiStore.getState().lokasi;
      if (!kini || kini.adm4 !== lokasi.adm4) return;
      if (!k) {
        sudah.current = null; // gagal (mis. offline): dicoba lagi saat lokasi berubah atau kunjungan berikutnya
        return;
      }
      useLokasiStore.getState().setLokasi({ ...kini, lat: k.lat, lon: k.lon, presisi: "desa" });
    });
  }, [siap, lokasi]);

  return null;
}
