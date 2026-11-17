"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Trash2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { StatusBanner } from "@/components/global/status-banner";
import { useHydrate } from "@/hooks/use-hydrate";
import { finalisasiProfil } from "@/lib/preparedness/profil-schema";
import { useKartuStore } from "@/stores/kartu-store";
import { useLokasiStore } from "@/stores/lokasi-store";
import { useProfilStore } from "@/stores/profil-store";
import { useProgresStore } from "@/stores/progres-store";
import { useRencanaStore } from "@/stores/rencana-store";

const BTN = "inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-semibold hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

/** Hapus semua kunci SIGAP (cache respons, log AI, prefill) selain yang dikelola store. */
function hapusSisaKunci() {
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith("sigap:v1:")) localStorage.removeItem(k);
    sessionStorage.removeItem("sigap:v1:prefill-peringatan");
  } catch {
    /* penyimpanan tidak tersedia: tidak ada yang perlu dihapus */
  }
}

/** Semua isi penyimpanan lokal SIGAP (kunci `sigap:v1:*`) sebagai objek JSON. */
function kumpulkanData(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  try {
    for (const k of Object.keys(localStorage)) {
      if (!k.startsWith("sigap:v1:")) continue;
      const mentah = localStorage.getItem(k);
      try { out[k] = mentah ? JSON.parse(mentah) : null; } catch { out[k] = mentah; }
    }
  } catch {
    /* penyimpanan tidak tersedia */
  }
  return out;
}

const ukuranKb = (data: Record<string, unknown>) => Math.max(1, Math.round(new Blob([JSON.stringify(data)]).size / 1024));

export function DataSayaView() {
  const siap = useHydrate(useLokasiStore, useProfilStore, useProgresStore, useRencanaStore, useKartuStore);
  const lokasi = useLokasiStore((s) => s.lokasi);
  const profil = useProfilStore((s) => s.profil);
  const progres = useProgresStore((s) => s.progres);
  const rencana = useRencanaStore((s) => s.rencana);
  const [selesai, setSelesai] = useState(false);
  const [konfirmasi, setKonfirmasi] = useState(false);
  const router = useRouter();

  const hapusSemua = () => {
    useLokasiStore.getState().clearLokasi();
    useProfilStore.getState().reset();
    useProgresStore.getState().reset();
    useRencanaStore.getState().reset();
    useKartuStore.getState().reset();
    hapusSisaKunci();
    setKonfirmasi(false);
    setSelesai(true);
    // Blueprint 8.6: arahkan ke Beranda dengan toast konfirmasi.
    toast("Semua data SIGAP di perangkat ini sudah dihapus.");
    router.push("/");
  };
  const selesaiCentang = Object.keys(progres).length;

  const ekspor = () => {
    const data = { diekspor: new Date().toISOString(), data: kumpulkanData() };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "data-sigap.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); // dicabut langsung dapat membatalkan unduhan di Safari
    toast("Data diekspor sebagai data-sigap.json.");
  };

  const baris: Array<[string, string]> = [
    ["Lokasi", lokasi ? `${lokasi.kelurahan}, ${lokasi.kecamatan}, ${lokasi.kabKota}` : "Belum dipilih"],
    // Profil awal sudah berisi bahaya bawaan, jadi "terisi" berarti semua langkah wizard sudah valid.
    ["Profil keluarga", finalisasiProfil(profil) ? `${profil.jumlahAnggota} anggota, ${profil.bahaya.length} bahaya dipilih` : "Belum diisi lengkap"],
    ["Rencana siaga", rencana ? `Tersimpan (${rencana.mode === "ai" ? "dengan bantuan AI" : "tanpa AI"})` : "Belum ada"],
    ["Progres", selesaiCentang > 0 ? `${selesaiCentang} butir ditandai selesai` : "Belum ada"],
    ["Perkiraan ukuran data", siap ? `${ukuranKb(kumpulkanData())} KB di perangkat ini` : "Menghitung"],
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Data Saya</h1>
        <p className="mt-2 text-muted-foreground">Semua data Anda disimpan di perangkat ini. SIGAP tidak memakai akun. Untuk menyusun rencana, hanya nama wilayah dan ringkasan profil tanpa identitas yang dikirim ke server.</p>
      </header>
      {selesai && <StatusBanner tone="info">Semua data di perangkat ini sudah dihapus.</StatusBanner>}
      {!siap ? (
        <div className="h-40 animate-pulse rounded-2xl bg-muted" aria-busy="true" />
      ) : (
        <dl className="divide-y divide-border rounded-2xl border border-border bg-surface">
          {baris.map(([k, v]) => (
            <div key={k} className="flex flex-wrap justify-between gap-2 p-4">
              <dt className="font-semibold">{k}</dt>
              <dd className="text-muted-foreground">{v}</dd>
            </div>
          ))}
        </dl>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={ekspor} className={BTN}><Download className="size-4" aria-hidden="true" /> Ekspor data (JSON)</button>
      </div>
      <div aria-live="polite">
        {!konfirmasi ? (
          <button type="button" onClick={() => setKonfirmasi(true)} className={BTN}><Trash2 className="size-4" aria-hidden="true" /> Hapus semua data saya</button>
        ) : (
          <div role="alertdialog" aria-labelledby="judul-hapus" className="rounded-2xl border border-border bg-warning p-4 text-warning-foreground">
            <p id="judul-hapus" className="font-semibold">Hapus lokasi, profil, rencana, dan progres dari perangkat ini? Tindakan ini tidak bisa dibatalkan.</p>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={hapusSemua} className={BTN}>Ya, hapus</button>
              <button type="button" onClick={() => setKonfirmasi(false)} className={BTN}>Batal</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
