"use client";
import { useState } from "react";
import { ChevronDown, Database, ExternalLink, Plus, RefreshCw } from "lucide-react";
import type { HazardId, Lokasi, VarianBanjir } from "@/types";
import { useRisikoLokasi } from "@/hooks/use-risiko-lokasi";
import { disarankanData, type NilaiBahaya, type TingkatRisiko } from "@/lib/risiko/nilai";
import { HAZARD_BY_ID } from "@/lib/hazards/hazards";
import { IKON_BAHAYA } from "@/lib/hazards/ikon";
import { URL_INARISK } from "@/lib/hazards/pertanyaan";

const GAYA: Record<TingkatRisiko, { label: string; kelas: string }> = {
  tinggi: { label: "Tinggi", kelas: "bg-danger text-danger-foreground" },
  sedang: { label: "Perlu disiapkan", kelas: "bg-warning text-warning-foreground" },
  rendah: { label: "Rendah", kelas: "bg-muted text-muted-foreground" },
  "belum-diketahui": { label: "Belum terbaca", kelas: "border border-dashed border-border text-muted-foreground" },
};

/** Lencana tingkat risiko. */
export function LencanaTingkat({ t }: { t: TingkatRisiko }) {
  return <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${GAYA[t].kelas}`}>{GAYA[t].label}</span>;
}

interface Props {
  lokasi: Pick<Lokasi, "lat" | "lon" | "provinsi" | "kelurahan">;
  /** Bahaya yang sudah ada di rencana; yang disarankan data tetapi belum ada ditandai dan bisa ditambahkan. */
  terpilih?: HazardId[];
  onTambah?: (ids: HazardId[], varian: VarianBanjir[]) => void;
  /** Ringkas: hanya bahaya tinggi dan perlu disiapkan, sisanya dilipat. */
  ringkas?: boolean;
  judul?: string;
  idJudul?: string;
}

function Baris({ n, belumAda, onTambah }: { n: NilaiBahaya; belumAda: boolean; onTambah?: () => void }) {
  const h = HAZARD_BY_ID[n.id];
  const Ikon = IKON_BAHAYA[n.id];
  return (
    <li className="flex gap-3 py-3.5">
      <span className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl ${h.bgClass} ${h.colorClass}`} aria-hidden="true">
        <Ikon className="size-4.5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-foreground">{h.label}</p>
          <LencanaTingkat t={n.tingkat} />
          {belumAda && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">Belum ada di rencana</span>}
        </div>
        {n.alasan.length > 0 ? (
          <ul className="mt-1 space-y-0.5 text-sm leading-relaxed text-muted-foreground">
            {n.alasan.map((a) => <li key={a}>{a}</li>)}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">Sumber data ({n.sumber}) belum terbaca saat ini; jawab pertanyaan swa-penilaian atau cek InaRISK.</p>
        )}
        <p className="mt-1 text-xs text-muted-foreground/80">Sumber: {n.sumber}</p>
        {belumAda && onTambah && (
          <button type="button" onClick={onTambah} className="press mt-2 inline-flex h-9 items-center gap-1 rounded-lg border border-border px-3 text-sm font-semibold hover:bg-muted sm:hidden">
            <Plus className="size-4" aria-hidden="true" /> Tambah ke rencana
          </button>
        )}
      </div>
      {belumAda && onTambah && (
        <button type="button" onClick={onTambah} className="press hidden h-9 shrink-0 items-center gap-1 self-start rounded-lg border border-border px-3 text-sm font-semibold hover:bg-muted sm:inline-flex">
          <Plus className="size-4" aria-hidden="true" /> Tambah
        </button>
      )}
    </li>
  );
}

/** Panel "Risiko di lokasi Anda": 9 bahaya dinilai dari data terbuka, dengan alasan berupa angka dan sumber. */
export function ProfilRisiko({ lokasi, terpilih, onTambah, ringkas = false, judul = "Risiko di lokasi Anda menurut data", idJudul = "judul-profil-risiko" }: Props) {
  const q = useRisikoLokasi(lokasi);
  const [buka, setBuka] = useState(!ringkas);
  const ada = new Set(terpilih ?? []);

  if (q.isPending)
    return (
      <section aria-labelledby={idJudul} aria-busy="true" className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 id={idJudul} className="text-lg font-bold text-foreground">{judul}</h2>
        <p className="mt-1 text-sm text-muted-foreground">Membaca data gunung api, gempa sejak 1976, riwayat tsunami, garis pantai, lereng, dan pola iklim untuk titik {lokasi.kelurahan}…</p>
        <div className="mt-4 space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />)}</div>
      </section>
    );
  if (q.isError || !q.data)
    return (
      <section aria-labelledby={idJudul} className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 id={idJudul} className="text-lg font-bold text-foreground">{judul}</h2>
        <p className="mt-1 text-sm text-muted-foreground">Data risiko lokasi belum dapat dimuat. Anda tetap bisa memilih bahaya secara manual, atau cek peta resmi InaRISK.</p>
        <button type="button" onClick={() => q.refetch()} className="press mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm font-semibold hover:bg-muted">
          <RefreshCw className="size-4" aria-hidden="true" /> Coba lagi
        </button>
      </section>
    );

  const nilai = q.data.nilai;
  const saran = disarankanData(nilai);
  const belum = terpilih ? saran.filter((n) => !ada.has(n.id)) : [];
  const utama = ringkas ? saran : nilai;
  const sisa = ringkas ? nilai.filter((n) => !saran.includes(n)) : [];
  const tambah = (ns: NilaiBahaya[]) => onTambah?.(ns.map((n) => n.id), [...new Set(ns.flatMap((n) => n.varian ?? []))]);

  return (
    <section aria-labelledby={idJudul} className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id={idJudul} className="flex items-center gap-2 text-lg font-bold text-foreground">
            <Database className="size-5 text-primary" aria-hidden="true" /> {judul}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {saran.length} dari 9 bahaya perlu disiapkan di titik {lokasi.kelurahan}, dihitung dari catatan nyata: gunung api, gempa sejak 1976, riwayat tsunami, jarak pantai, lereng, pola iklim 30 tahun, dan titik panas satelit.
          </p>
        </div>
        {onTambah && belum.length > 0 && (
          <button type="button" onClick={() => tambah(belum)} className="press inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            <Plus className="size-4" aria-hidden="true" /> Tambahkan {belum.length} bahaya ke rencana
          </button>
        )}
      </div>

      <ul className="mt-2 divide-y divide-border">
        {utama.map((n) => <Baris key={n.id} n={n} belumAda={!!terpilih && saran.includes(n) && !ada.has(n.id)} onTambah={onTambah ? () => tambah([n]) : undefined} />)}
      </ul>

      {sisa.length > 0 && (
        <div className="border-t border-border pt-2">
          <button type="button" aria-expanded={buka} onClick={() => setBuka((b) => !b)} className="inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-primary">
            <ChevronDown className={`size-4 transition-transform ${buka ? "rotate-180" : ""}`} aria-hidden="true" /> {buka ? "Sembunyikan" : "Lihat"} {sisa.length} bahaya berisiko rendah
          </button>
          {buka && <ul className="divide-y divide-border">{sisa.map((n) => <Baris key={n.id} n={n} belumAda={false} />)}</ul>}
        </div>
      )}

      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        {q.data.catatan}{" "}
        <a href={URL_INARISK} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary underline-offset-2 hover:underline">
          Buka InaRISK <ExternalLink className="size-3" aria-hidden="true" /><span className="sr-only">(tab baru)</span>
        </a>
        {q.data.stale ? " Menampilkan data tersimpan terakhir." : ""}
      </p>
    </section>
  );
}
