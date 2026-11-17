"use client";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { StatusBanner } from "@/components/global/status-banner";
import { useHydrate } from "@/hooks/use-hydrate";
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

export function DataSayaView() {
  const siap = useHydrate(useLokasiStore, useProfilStore, useProgresStore, useRencanaStore);
  const lokasi = useLokasiStore((s) => s.lokasi);
  const profil = useProfilStore((s) => s.profil);
  const progres = useProgresStore((s) => s.progres);
  const rencana = useRencanaStore((s) => s.rencana);
  const [selesai, setSelesai] = useState(false);
  const [konfirmasi, setKonfirmasi] = useState(false);

  const hapusSemua = () => {
    useLokasiStore.getState().clearLokasi();
    useProfilStore.getState().reset();
    useProgresStore.getState().reset();
    useRencanaStore.getState().reset();
    hapusSisaKunci();
    setKonfirmasi(false);
    setSelesai(true);
  };
  const selesaiCentang = Object.keys(progres).length;

  const baris: Array<[string, string]> = [
    ["Lokasi", lokasi ? `${lokasi.kelurahan}, ${lokasi.kecamatan}, ${lokasi.kabKota}` : "Belum dipilih"],
    ["Profil keluarga", profil.bahaya.length > 0 ? `${profil.jumlahAnggota} anggota, ${profil.bahaya.length} bahaya dipilih` : "Belum diisi"],
    ["Rencana siaga", rencana ? `Tersimpan (${rencana.mode === "ai" ? "dengan bantuan AI" : "tanpa AI"})` : "Belum ada"],
    ["Progres", selesaiCentang > 0 ? `${selesaiCentang} butir ditandai selesai` : "Belum ada"],
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
