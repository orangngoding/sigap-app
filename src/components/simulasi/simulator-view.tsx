"use client";
// Simulator Bencana AI: uji awal (5 soal acak dari bank soal tim) -> AI menyusun simulasi untuk keluarga, rumah,
// lokasi, dan konsep yang keliru di uji awal -> simulasi dimainkan mesin Latihan -> rapor (kunci jawaban uji awal,
// nilai keputusan simulasi, dan perkembangan antar-sesi).
import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, BrainCircuit, CheckCircle2, ClipboardList, CloudSun, Flame, Layers, Loader2, MapPin, RotateCcw, Sparkles, TrendingUp, UserRound, type LucideIcon } from "lucide-react";
import type { HazardId } from "@/types";
import type { HasilSimulasi } from "@/lib/ai/simulasi";
import type { HasilLatihan } from "@/lib/latihan/mesin";
import { skenarioUntuk } from "@/lib/latihan/mesin";
import { SKENARIO } from "@/lib/latihan/skenario";
import { HAZARD_BY_ID } from "@/lib/hazards/hazards";
import { IKON_BAHAYA } from "@/lib/hazards/ikon";
import { JUMLAH_SOAL, fokusDari, nilaiUji, soalUjiGabungan, type HasilUji, type SoalUji } from "@/lib/simulasi/uji";
import { LABEL_TINGKAT, TINGKAT_SIMULASI, bencanaKedua, type TingkatSimulasi } from "@/lib/simulasi/tingkat";
import { finalisasiProfil } from "@/lib/preparedness/profil-schema";
import { anonimkan } from "@/lib/rencana/hash";
import { ringkasRisiko } from "@/lib/rencana/klien";
import { useHydrate } from "@/hooks/use-hydrate";
import { useRisikoLokasi } from "@/hooks/use-risiko-lokasi";
import { useLokasiStore } from "@/stores/lokasi-store";
import { useProfilStore } from "@/stores/profil-store";
import { useLatihanStore } from "@/stores/latihan-store";
import { useProgresStore } from "@/stores/progres-store";
import { useRencanaStore } from "@/stores/rencana-store";
import { ringkasDampak, useSimulasiStore } from "@/stores/simulasi-store";
import { LatihanMain } from "@/components/latihan/latihan-main";
import { LencanaTingkat } from "@/components/risiko/profil-risiko";
import { UjiPemahaman } from "./uji-pemahaman";

type Tahap = "siapkan" | "uji-awal" | "menyusun" | "main" | "rapor";
const TOMBOL = "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50";
const TOMBOL_2 = "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-5 text-sm font-semibold hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const BAHAYA_SIM = SKENARIO.map((s) => s.hazard);
const LANGKAH: Array<{ id: Tahap; label: string }> = [
  { id: "uji-awal", label: "Uji awal" },
  { id: "main", label: "Simulasi AI" },
  { id: "rapor", label: "Rapor" },
];

/** Cadangan di klien bila permintaan gagal (offline, batas): skenario bank tim untuk bahaya ini. */
function cadanganLokal(h: HazardId): HasilSimulasi {
  const s = skenarioUntuk(h)!;
  return { mode: "cadangan", dibuatPada: new Date().toISOString(), skenario: s, personalisasi: [], meta: { cache: false, durasiMs: 0, alasanCadangan: "jaringan" } };
}

function Langkah({ tahap }: { tahap: Tahap }) {
  const idx = LANGKAH.findIndex((l) => l.id === tahap || (tahap === "menyusun" && l.id === "main"));
  return (
    <ol className="mb-6 grid grid-cols-3 gap-2 text-center text-xs font-semibold" aria-label="Tahapan simulator">
      {LANGKAH.map((l, i) => (
        <li key={l.id} aria-current={i === idx ? "step" : undefined} className={`rounded-full px-2 py-1.5 ${i < idx ? "bg-primary/15 text-primary" : i === idx ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
          {l.label}
        </li>
      ))}
    </ol>
  );
}

const PESAN_MENYUSUN = [
  "Membaca profil keluarga dan kondisi rumah…",
  "Mencocokkan dengan risiko di lokasi Anda…",
  "Memilih panduan resmi BNPB, BMKG, dan Kemenkes yang relevan…",
  "Menyusun situasi yang menyasar konsep yang terlewat…",
  "Memeriksa setiap pilihan terhadap panduan…",
];

export function SimulatorView() {
  const siap = useHydrate(useLokasiStore, useProfilStore, useSimulasiStore, useLatihanStore, useProgresStore, useRencanaStore);
  const lokasi = useLokasiStore((s) => s.lokasi);
  const draft = useProfilStore((s) => s.profil);
  const profil = useMemo(() => finalisasiProfil(draft), [draft]);
  const risikoQ = useRisikoLokasi(siap ? lokasi : null);
  const risiko = useMemo(() => ringkasRisiko(risikoQ.data?.nilai), [risikoQ.data]);
  const { catat, naikkanVarian, varian, ingatSoal } = useSimulasiStore();
  const riwayat = useSimulasiStore((s) => s.riwayat);
  const dampak = ringkasDampak(riwayat);
  const dariUrl = useSearchParams().get("bahaya");

  const urutan = useMemo(() => {
    const t = new Map((risikoQ.data?.nilai ?? []).map((n) => [n.id, n.tingkat]));
    const bobot = (h: HazardId) => ({ tinggi: 3, sedang: 2, rendah: 0, "belum-diketahui": 0 })[t.get(h) ?? "belum-diketahui"] + (draft.bahaya.includes(h) ? 0.5 : 0);
    return [...BAHAYA_SIM].sort((a, b) => bobot(b) - bobot(a));
  }, [risikoQ.data, draft.bahaya]);
  const tingkat = (h: HazardId) => risikoQ.data?.nilai.find((n) => n.id === h)?.tingkat;

  const [pilihan, setPilihan] = useState<HazardId | null>(null);
  const hazard = pilihan ?? (BAHAYA_SIM.includes(dariUrl as HazardId) ? (dariUrl as HazardId) : urutan[0]);
  const [tingkatSim, setTingkatSim] = useState<TingkatSimulasi>("dasar");
  const petaRisiko = useMemo(() => Object.fromEntries((risikoQ.data?.nilai ?? []).map((n) => [n.id, n.tingkat])), [risikoQ.data]);
  const kedua = tingkatSim === "beruntun" ? bencanaKedua(hazard, petaRisiko) : null;
  const [tahap, setTahap] = useState<Tahap>("siapkan");
  const [awal, setAwal] = useState<HasilUji | null>(null);
  const [sim, setSim] = useState<HasilSimulasi | null>(null);
  const [hasilSim, setHasilSim] = useState<HasilLatihan | null>(null);
  const [pesanKe, setPesanKe] = useState(0);
  const [soalAwal, setSoalAwal] = useState<SoalUji[]>([]);

  /** Ambil 5 soal acak baru, mendahulukan soal yang belum muncul di sesi-sesi terakhir, lalu mulai uji awal. */
  const mulaiUji = (h: HazardId = hazard, k: HazardId | null = kedua) => {
    const terakhir = useSimulasiStore.getState().soalTerakhir;
    const soal = soalUjiGabungan(h, k, { hindari: [...(terakhir[h] ?? []), ...(k ? terakhir[k] ?? [] : [])] });
    setSoalAwal(soal);
    ingatSoal(h, soal.map((s) => s.id));
    if (k) ingatSoal(k, soal.map((s) => s.id));
    setTahap("uji-awal");
  };

  const susun = async (hasilAwal: HasilUji) => {
    if (!lokasi || !profil) return;
    setTahap("menyusun");
    setPesanKe(0);
    const putar = setInterval(() => setPesanKe((x) => Math.min(PESAN_MENYUSUN.length - 1, x + 1)), 2600);
    try {
      const res = await fetch("/api/simulasi", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          hazard,
          lokasi: { kelurahan: lokasi.kelurahan, kecamatan: lokasi.kecamatan, kabKota: lokasi.kabKota, provinsi: lokasi.provinsi },
          profil: anonimkan(profil),
          ...(risiko ? { risiko } : {}),
          fokus: fokusDari(soalAwal, hasilAwal.salah).slice(0, 6),
          varian: varian[hazard] ?? 0,
          tingkat: tingkatSim,
          ...(kedua ? { kedua } : {}),
          // Hanya untuk mengambil prakiraan nyata minggu ini di server; tidak diteruskan ke AI.
          titik: { lat: lokasi.lat, lon: lokasi.lon },
        }),
        signal: AbortSignal.timeout(50_000),
      });
      setSim(res.ok ? ((await res.json()) as HasilSimulasi) : cadanganLokal(hazard));
    } catch {
      setSim(cadanganLokal(hazard));
    } finally {
      clearInterval(putar);
    }
    setTahap("main");
  };

  /** Mulai lagi. `langsung`: skenario baru (variasi berikutnya) dengan bencana yang sama, langsung ke uji awal. */
  const ulang = (o: { langsung: boolean; tingkat?: TingkatSimulasi }) => {
    naikkanVarian(hazard);
    if (o.tingkat) setTingkatSim(o.tingkat);
    setAwal(null);
    setSim(null);
    setHasilSim(null);
    if (o.langsung) {
      const t = o.tingkat ?? tingkatSim;
      mulaiUji(hazard, t === "beruntun" ? bencanaKedua(hazard, petaRisiko) : null);
    } else setTahap("siapkan");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!siap) return <div className="h-80 animate-pulse rounded-3xl bg-muted motion-reduce:animate-none" aria-busy="true" />;
  if (!lokasi || !profil)
    return (
      <div className="rounded-3xl border border-border bg-surface p-8 text-center">
        <UserRound className="mx-auto size-10 text-primary" aria-hidden="true" />
        <h2 className="mt-3 text-lg font-bold">Simulasi disusun untuk keluarga dan lokasi Anda</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">Pilih lokasi dan isi profil keluarga (anggota rentan, jenis rumah, kendaraan) dulu, agar AI bisa membuat skenario yang benar-benar sesuai keadaan Anda.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          {!lokasi && <Link href="/lokasi" className={TOMBOL}><MapPin className="size-4" aria-hidden="true" /> Pilih lokasi</Link>}
          {lokasi && <Link href="/rencana/profil" className={TOMBOL}>Isi profil keluarga</Link>}
        </div>
      </div>
    );

  const label = HAZARD_BY_ID[hazard].label;

  return (
    <div>
      {tahap !== "siapkan" && <Langkah tahap={tahap} />}

      {tahap === "siapkan" && (
        <section aria-labelledby="judul-siapkan" className="space-y-6">
          <div className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
            <h2 id="judul-siapkan" className="text-lg font-bold">Pilih bencana yang ingin disimulasikan</h2>
            <p className="mt-1 text-sm text-muted-foreground">Diurutkan dari risiko tertinggi di {lokasi.kelurahan} menurut data lokasi.</p>
            <div role="radiogroup" aria-label="Bencana" className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {urutan.map((h) => {
                const Ikon = IKON_BAHAYA[h];
                const t = tingkat(h);
                const aktif = h === hazard;
                return (
                  <button key={h} type="button" role="radio" aria-checked={aktif} onClick={() => setPilihan(h)} className={`flex min-h-16 flex-col items-start gap-1.5 rounded-2xl border-2 p-3 text-left text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-primary ${aktif ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}>
                    <span className="flex items-center gap-2"><Ikon className={`size-5 ${HAZARD_BY_ID[h].colorClass}`} aria-hidden="true" /> {HAZARD_BY_ID[h].label}</span>
                    {t && t !== "belum-diketahui" && t !== "rendah" && <LencanaTingkat t={t} />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
            <h2 className="text-lg font-bold">Pilih tingkat kesulitan</h2>
            <div role="radiogroup" aria-label="Tingkat kesulitan" className="mt-3 grid gap-2 md:grid-cols-3">
              {TINGKAT_SIMULASI.map((t) => {
                const Ikon: LucideIcon = t === "dasar" ? CloudSun : t === "menantang" ? Flame : Layers;
                const aktif = t === tingkatSim;
                return (
                  <button key={t} type="button" role="radio" aria-checked={aktif} onClick={() => setTingkatSim(t)} className={`flex flex-col items-start gap-1 rounded-2xl border-2 p-3 text-left focus-visible:outline-2 focus-visible:outline-primary ${aktif ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}>
                    <span className="flex items-center gap-2 text-sm font-bold"><Ikon className="size-4 text-primary" aria-hidden="true" /> {LABEL_TINGKAT[t].judul}</span>
                    <span className="text-xs leading-snug text-muted-foreground">{LABEL_TINGKAT[t].isi}</span>
                  </button>
                );
              })}
            </div>
            {kedua && <p className="mt-3 rounded-xl bg-muted px-3 py-2 text-sm"><strong>{label}</strong> akan disusul <strong>{HAZARD_BY_ID[kedua].label.toLowerCase()}</strong>, sesuai risiko di lokasi Anda. Uji awal mencakup keduanya.</p>}
            <p className="mt-3 flex items-start gap-2 text-sm text-muted-foreground"><CloudSun className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" /> Bila prakiraan minggu ini di lokasi Anda relevan (hujan lebat, hari kering, El Niño), simulasi dibuka dari kondisi nyata itu.</p>
          </div>

          <div className="rounded-3xl border border-primary/25 bg-primary/5 p-5 sm:p-6">
            <h3 className="flex items-center gap-2 font-bold"><BrainCircuit className="size-5 text-primary" aria-hidden="true" /> Cara kerja simulator</h3>
            <ol className="mt-3 grid gap-3 text-sm sm:grid-cols-4">
              {[
                ["Uji awal", `${JUMLAH_SOAL} soal acak yang berganti tiap sesi, untuk melihat pemahaman Anda sekarang.`],
                ["AI menyusun", "Skenario baru untuk keluarga, rumah, dan lokasi Anda, menyasar hal yang keliru di uji awal."],
                ["Simulasi", "Satu situasi per layar dengan tiga pilihan; setiap pilihan dijelaskan akibat dan dasarnya."],
                ["Rapor", "Kunci jawaban uji awal, nilai keputusan simulasi, dan perkembangan Anda dari sesi ke sesi."],
              ].map(([j, t], i) => (
                <li key={j} className="rounded-2xl bg-surface p-3">
                  <span className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{i + 1}</span>
                  <p className="mt-2 font-semibold">{j}</p>
                  <p className="mt-0.5 text-muted-foreground">{t}</p>
                </li>
              ))}
            </ol>
            <button type="button" onClick={() => mulaiUji()} className={`${TOMBOL} mt-5`}>
              Mulai simulasi {label.toLowerCase()} <ArrowRight className="size-4" aria-hidden="true" />
            </button>
            <p className="mt-2 text-xs text-muted-foreground">Sekitar 5 menit. Yang dikirim ke AI: atribut keluarga tanpa nama atau kontak, nama wilayah, fakta risiko, dan prakiraan; koordinat hanya dipakai server untuk mengambil prakiraan dan tidak diteruskan ke AI.</p>
          </div>

          {dampak && (
            <p className="flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-3 text-sm">
              <TrendingUp className="size-5 shrink-0 text-primary" aria-hidden="true" />
              <span><strong>Riwayat Anda:</strong> rata-rata uji awal {dampak.awal}% dan keputusan simulasi {dampak.simulasi}%, dari {dampak.sesi} simulasi.</span>
            </p>
          )}
        </section>
      )}

      {tahap === "uji-awal" && (
        <UjiPemahaman key="awal" soal={soalAwal} judul={`Uji awal · ${label}`} keterangan="Pilih tindakan yang menurut Anda paling tepat. Kunci jawaban baru tampil di rapor."
          onSelesai={(j) => { const h = nilaiUji(soalAwal, j); setAwal(h); void susun(h); }} />
      )}

      {tahap === "menyusun" && (
        <section aria-live="polite" aria-busy="true" className="rounded-3xl border border-border bg-surface p-6 text-center sm:p-8">
          <Loader2 className="mx-auto size-10 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
          <h2 className="mt-3 text-lg font-bold">AI menyusun simulasi untuk keluarga Anda</h2>
          <p className="mt-1 text-sm text-muted-foreground">{PESAN_MENYUSUN[pesanKe]}</p>
          {awal && <p className="mt-4 text-sm">Uji awal: <strong>{awal.benar} dari {awal.total}</strong> tepat. {awal.salah.length > 0 ? `Simulasi akan menyasar ${awal.salah.length} hal yang belum tepat.` : "Simulasi akan menguji dengan situasi yang lebih sulit."}</p>}
        </section>
      )}

      {tahap === "main" && sim && (
        <div className="space-y-4">
          <div className="rounded-3xl border border-border bg-surface p-5">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
              <Sparkles className="size-4" aria-hidden="true" /> {sim.mode === "ai" ? "Disusun AI untuk keluarga Anda" : "Skenario tim (AI sedang tidak tersedia)"}
            </p>
            <h2 className="mt-1 text-xl font-bold">{sim.skenario.judul}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{sim.skenario.ringkas}</p>
            {sim.personalisasi.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Disesuaikan dengan">
                {sim.personalisasi.map((p) => <li key={p} className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">{p}</li>)}
              </ul>
            )}
            {sim.mode === "ai" && <p className="mt-3 text-xs text-muted-foreground">Setiap pilihan diperiksa kode: tepat satu tindakan terbaik per langkah, umpan balik mengutip panduan resmi, angka hanya dari data Anda. Ini simulasi fiksi, bukan ramalan.</p>}
          </div>
          <LatihanMain
            key={sim.skenario.id}
            id={sim.skenario.id}
            skenario={sim.skenario}
            onSelesai={(h) => {
              setHasilSim(h);
              if (awal) catat({ waktu: new Date().toISOString(), hazard, awal: awal.persen, simulasi: h.persen, mode: sim.mode });
            }}
            sesudah={
              <div className="rounded-3xl border border-primary/30 bg-primary/5 p-5 text-center">
                <p className="font-semibold">Simulasi selesai. Lihat rapor dan kunci jawaban uji awal Anda.</p>
                <button type="button" onClick={() => { setTahap("rapor"); window.scrollTo({ top: 0, behavior: "smooth" }); }} className={`${TOMBOL} mt-3`}>Lihat rapor <ArrowRight className="size-4" aria-hidden="true" /></button>
              </div>
            }
          />
        </div>
      )}

      {tahap === "rapor" && awal && (
        <Rapor hazard={hazard} tingkat={tingkatSim} awal={awal} simulasi={hasilSim} soal={soalAwal} onUlang={ulang} />
      )}
    </div>
  );
}

function Batang({ label, nilai, warna }: { label: string; nilai: number; warna: string }) {
  return (
    <div>
      <div className="flex justify-between text-sm"><span className="font-semibold">{label}</span><span className="tabular-nums font-bold">{nilai}%</span></div>
      <div className="mt-1 h-3 overflow-hidden rounded-full bg-muted">
        <motion.div initial={{ width: 0 }} animate={{ width: `${nilai}%` }} transition={{ duration: 0.8, ease: "easeOut" }} className={`h-full rounded-full ${warna}`} />
      </div>
    </div>
  );
}

function Rapor({ hazard, tingkat, awal, simulasi, soal, onUlang }: { hazard: HazardId; tingkat: TingkatSimulasi; awal: HasilUji; simulasi: HasilLatihan | null; soal: SoalUji[]; onUlang: (o: { langsung: boolean; tingkat?: TingkatSimulasi }) => void }) {
  const berikut: TingkatSimulasi | null = tingkat === "dasar" ? "menantang" : tingkat === "menantang" ? "beruntun" : null;
  const riwayat = useSimulasiStore((s) => s.riwayat);
  const belum = soal.filter((q) => awal.salah.includes(q.id));
  const nilaiSim = simulasi?.persen ?? null;
  const kalimat =
    nilaiSim === null ? "Simulasi belum selesai."
    : nilaiSim >= 80 ? "Keputusan Anda dalam simulasi sudah sangat baik."
    : nilaiSim >= 60 ? "Keputusan Anda cukup baik. Ulangi dengan skenario baru untuk memantapkan."
    : "Masih banyak keputusan yang perlu diperbaiki. Baca kunci jawaban di bawah, lalu coba skenario baru.";
  const sesiIni = riwayat.filter((r) => r.hazard === hazard);

  return (
    <section aria-labelledby="judul-rapor" className="space-y-5">
      <div className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
        <h2 id="judul-rapor" className="flex items-center gap-2 text-xl font-bold"><TrendingUp className="size-6 text-primary" aria-hidden="true" /> Rapor simulasi {HAZARD_BY_ID[hazard].label.toLowerCase()}</h2>
        <div className="mt-5 space-y-3">
          <Batang label={`Uji awal (${awal.benar} dari ${awal.total} tepat)`} nilai={awal.persen} warna="bg-muted-foreground/50" />
          {simulasi && <Batang label="Keputusan selama simulasi" nilai={simulasi.persen} warna="bg-primary" />}
        </div>
        <p className="mt-4 text-sm text-muted-foreground">{kalimat}</p>
      </div>

      {belum.length > 0 ? (
        <div className="rounded-3xl border border-warning-foreground/30 bg-warning p-5">
          <h3 className="flex items-center gap-2 font-bold"><ClipboardList className="size-5" aria-hidden="true" /> Kunci jawaban uji awal yang belum tepat</h3>
          <ul className="mt-2 space-y-3 text-sm">
            {belum.map((q) => <li key={q.id}><span className="text-muted-foreground">{q.situasi}</span><br /><strong>Tindakan tepat: {q.teksTerbaik}</strong></li>)}
          </ul>
        </div>
      ) : (
        <p className="flex items-center gap-2 rounded-3xl border border-success-foreground/30 bg-success p-5 font-semibold text-success-foreground"><CheckCircle2 className="size-5" aria-hidden="true" /> Semua soal uji awal dijawab dengan tindakan yang tepat.</p>
      )}

      {sesiIni.length > 1 && (
        <div className="rounded-3xl border border-border bg-surface p-5">
          <h3 className="font-bold">Perkembangan Anda ({sesiIni.length} simulasi {HAZARD_BY_ID[hazard].label.toLowerCase()})</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Nilai uji awal tiap sesi. Soalnya berganti, jadi nilai yang naik menandakan pemahaman yang makin luas.</p>
          <ol className="mt-3 flex items-end gap-2" aria-label="Nilai uji awal per simulasi">
            {sesiIni.slice(-8).map((r) => (
              <li key={r.waktu} className="flex flex-1 flex-col items-center gap-1 text-xs">
                <span className="w-full rounded-t-md bg-primary" style={{ height: `${Math.max(6, r.awal) * 0.8}px` }} aria-hidden="true" />
                <span className="tabular-nums">{r.awal}%</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="rounded-3xl border border-border bg-surface p-5">
        <h3 className="font-bold">Lanjutkan berlatih</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {belum.length > 0 ? "Ulangi dengan skenario baru dan soal uji yang berbeda; AI akan menyasar hal yang masih keliru." : berikut ? `Pemahaman Anda baik. Coba tingkat ${LABEL_TINGKAT[berikut].judul.toLowerCase()} agar lebih siap menghadapi keadaan yang lebih sulit.` : "Coba bencana lain yang berisiko di lokasi Anda."}
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <button type="button" onClick={() => onUlang({ langsung: true })} className={TOMBOL}><RotateCcw className="size-4" aria-hidden="true" /> Skenario baru, bencana sama</button>
          {berikut && <button type="button" onClick={() => onUlang({ langsung: true, tingkat: berikut })} className={TOMBOL_2}>Naik ke tingkat {LABEL_TINGKAT[berikut].judul.toLowerCase()}</button>}
          <button type="button" onClick={() => onUlang({ langsung: false })} className={TOMBOL_2}>Pilih bencana lain</button>
        </div>
      </div>
    </section>
  );
}
