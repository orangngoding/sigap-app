"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Loader2, Send, Sparkles } from "lucide-react";
import type { HasilTanya } from "@/lib/ai/tanya";
import type { HasilTerjemah } from "@/lib/ai/terjemah";
import { DisclaimerBox } from "@/components/global/disclaimer-box";
import { StatusBanner } from "@/components/global/status-banner";
import { useProfilStore } from "@/stores/profil-store";

type Tab = "tanya" | "terjemah";
type Keadaan<T> = { fase: "diam" } | { fase: "memuat" } | { fase: "ok"; hasil: T } | { fase: "galat"; pesan: string };

const CONTOH = ["Apa isi tas siaga keluarga?", "Apa yang harus dilakukan saat gempa?", "Bagaimana mempersiapkan rumah menghadapi banjir?"];
const TOMBOL = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50";

async function kirim<T>(url: string, badan: unknown, sinyal: AbortSignal): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(badan), signal: sinyal });
  if (!res.ok) {
    const b = (await res.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null;
    throw new Error(res.status === 429 ? "Terlalu banyak permintaan. Coba lagi sebentar lagi." : (b?.error?.message ?? "Layanan belum dapat dipakai. Coba lagi nanti."));
  }
  return (await res.json()) as T;
}

function useKirim<T>() {
  const [s, setS] = useState<Keadaan<T>>({ fase: "diam" });
  const ctrl = useRef<AbortController | null>(null);
  useEffect(() => () => ctrl.current?.abort(), []);
  const jalankan = async (url: string, badan: unknown) => {
    ctrl.current?.abort();
    const c = new AbortController();
    ctrl.current = c;
    setS({ fase: "memuat" });
    try {
      setS({ fase: "ok", hasil: await kirim<T>(url, badan, c.signal) });
    } catch (e) {
      if (c.signal.aborted) return;
      setS({ fase: "galat", pesan: navigator.onLine ? (e instanceof Error ? e.message : "Terjadi galat.") : "Anda sedang offline. Sambungkan internet untuk memakai fitur ini." });
    }
  };
  return [s, jalankan] as const;
}

function Memuat({ teks }: { teks: string }) {
  return (
    <p role="status" className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> {teks}
    </p>
  );
}

function PanelTanya() {
  const profil = useProfilStore((s) => s.profil);
  const [q, setQ] = useState("");
  const [s, jalankan] = useKirim<HasilTanya>();
  const bahaya = profil.bahaya.length > 0 ? profil.bahaya : undefined;
  const tanya = (teks: string) => {
    if (teks.trim().length < 3) return;
    void jalankan("/api/tanya", { pertanyaan: teks.trim(), bahaya });
  };
  return (
    <div>
      <form onSubmit={(e) => { e.preventDefault(); tanya(q); }} className="space-y-3">
        <label htmlFor="pertanyaan" className="block text-sm font-semibold">Pertanyaan Anda</label>
        <textarea id="pertanyaan" value={q} onChange={(e) => setQ(e.target.value)} maxLength={300} rows={3}
          className="w-full rounded-lg border border-border bg-surface p-3 text-base focus-visible:outline-2 focus-visible:outline-primary" placeholder="Contoh: apa isi tas siaga untuk keluarga dengan balita?" />
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">{q.length}/300</span>
          <button type="submit" disabled={s.fase === "memuat" || q.trim().length < 3} className={TOMBOL}>
            <Send className="size-4" aria-hidden="true" /> Tanya
          </button>
        </div>
      </form>
      <div className="mt-4 flex flex-wrap gap-2">
        {CONTOH.map((c) => (
          <button key={c} type="button" onClick={() => { setQ(c); tanya(c); }} className="min-h-11 rounded-full border border-border bg-surface px-3 text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary">{c}</button>
        ))}
      </div>
      <div aria-live="polite">
        {s.fase === "memuat" && <Memuat teks="Mencari jawaban di panduan resmi" />}
        {s.fase === "galat" && <div className="mt-4"><StatusBanner tone="warning">{s.pesan}</StatusBanner></div>}
        {s.fase === "ok" && (
          <section className="mt-6 rounded-2xl border border-border bg-surface p-5" aria-labelledby="judul-jawaban">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="judul-jawaban" className="text-lg font-bold">Jawaban</h2>
              {!s.hasil.refused && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                  <Sparkles className="size-3.5" aria-hidden="true" /> {s.hasil.mode === "ai" ? "Disederhanakan AI dari panduan resmi" : "Kutipan langsung panduan resmi"}
                </span>
              )}
            </div>
            <p className="mt-3 whitespace-pre-line leading-relaxed">{s.hasil.jawaban}</p>
            {s.hasil.darurat && <Link href="/darurat" className={`${TOMBOL} mt-4`}>Buka Mode Darurat</Link>}
            {s.hasil.sumber.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold">Sumber</h3>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                  {s.hasil.sumber.map((x) => (
                    <li key={x.id}><a href={x.url} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">{x.judul}</a></li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function PanelTerjemah() {
  const profil = useProfilStore((s) => s.profil);

  const [teks, setTeks] = useState(() => {
    try {
      const t = sessionStorage.getItem("sigap:v1:prefill-peringatan");

      if (t) {
        sessionStorage.removeItem("sigap:v1:prefill-peringatan");
        return t;
      }
    } catch {
      /* abaikan */
    }

    return "";
  });

  const [s, jalankan] = useKirim<HasilTerjemah>();
  
  const siap = teks.trim().length >= 20;
  const kirimTeks = () =>
    void jalankan("/api/terjemah", {
      teksPeringatan: teks.trim(),
      profil: { jumlahAnggota: profil.jumlahAnggota, lansia: profil.lansia, balita: profil.balita, hamil: profil.hamil, disabilitas: profil.disabilitas },
    });
  return (
    <div>
      <p className="text-sm text-muted-foreground">Tempel teks peringatan resmi (mis. dari BMKG). SIGAP hanya menyederhanakan isinya, tidak menambah informasi baru.</p>
      <form onSubmit={(e) => { e.preventDefault(); if (siap) kirimTeks(); }} className="mt-3 space-y-3">
        <label htmlFor="teks-peringatan" className="block text-sm font-semibold">Teks peringatan</label>
        <textarea id="teks-peringatan" value={teks} onChange={(e) => setTeks(e.target.value)} maxLength={2000} rows={7}
          className="w-full rounded-lg border border-border bg-surface p-3 text-base focus-visible:outline-2 focus-visible:outline-primary" />
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">{teks.length}/2000 · minimal 20 karakter</span>
          <button type="submit" disabled={s.fase === "memuat" || !siap} className={TOMBOL}>Jelaskan</button>
        </div>
      </form>
      <div aria-live="polite">
        {s.fase === "memuat" && <Memuat teks="Menyederhanakan peringatan" />}
        {s.fase === "galat" && <div className="mt-4"><StatusBanner tone="warning">{s.pesan}</StatusBanner></div>}
        {s.fase === "ok" && (
          <section className="mt-6 rounded-2xl border border-border bg-surface p-5" aria-labelledby="judul-terjemah">
            <h2 id="judul-terjemah" className="text-lg font-bold">Penjelasan sederhana</h2>
            <p className="mt-3 leading-relaxed">{s.hasil.penjelasan}</p>
            <h3 className="mt-4 text-sm font-semibold">Yang bisa dilakukan</h3>
            <ul className="mt-1 list-disc space-y-1 pl-5">{s.hasil.tindakan.map((t) => <li key={t}>{t}</li>)}</ul>
            <p className="mt-4 text-sm text-muted-foreground">Yang berlaku adalah teks resmi. <a href={s.hasil.tautanResmi} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">Buka kanal resmi BMKG</a></p>
          </section>
        )}
      </div>
    </div>
  );
}

export function TanyaView() {
  const awal = useSearchParams().get("tab") === "terjemah" ? "terjemah" : "tanya";
  const [tab, setTab] = useState<Tab>(awal);
  useEffect(() => { void useProfilStore.persist.rehydrate(); }, []);
  const tabs: Array<[Tab, string]> = [["tanya", "Tanya"], ["terjemah", "Terjemah Peringatan"]];
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Tanya SIGAP</h1>
        <p className="mt-2 text-muted-foreground">Jawaban disusun dari panduan resmi BNPB dan BMKG. SIGAP tidak memprediksi bencana dan tidak memberi saran medis.</p>
      </header>
      <div role="tablist" aria-label="Fitur AI" className="flex gap-2">
        {tabs.map(([id, label]) => (
          <button key={id} role="tab" id={`tab-${id}`} aria-selected={tab === id} aria-controls={`panel-${id}`} type="button" onClick={() => setTab(id)}
            className={`min-h-11 rounded-lg border px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-primary ${tab === id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface hover:bg-muted"}`}>{label}</button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>{tab === "tanya" ? <PanelTanya /> : <PanelTerjemah />}</div>
      <DisclaimerBox />
    </div>
  );
}
