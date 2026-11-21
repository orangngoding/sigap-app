"use client";
import { useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  CalendarClock, ChevronDown, ClipboardList, CloudOff, Download, Dumbbell, FileCheck2, HardDrive, Lock, MapPin,
  MessageSquare, Share2, ShieldCheck, Smartphone, Trash2, Upload, UserX, Users,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { StatusBanner } from "@/components/global/status-banner";
import { useHydrate } from "@/hooks/use-hydrate";
import { finalisasiProfil } from "@/lib/preparedness/profil-schema";
import { AWALAN, bacaCadangan, ringkasIsi, type IsiCadangan } from "@/lib/data-saya/cadangan";
import { AMBANG_LULUS } from "@/lib/latihan/mesin";
import { SKENARIO_BY_ID } from "@/lib/latihan/skenario";
import { HAZARD_BY_ID } from "@/lib/hazards/hazards";
import { waktuMutlak, waktuRelatif } from "@/lib/utils/format";
import { useKartuStore } from "@/stores/kartu-store";
import { useLatihanStore } from "@/stores/latihan-store";
import { useLokasiStore } from "@/stores/lokasi-store";
import { useProfilStore } from "@/stores/profil-store";
import { useProgresStore } from "@/stores/progres-store";
import { useRencanaStore } from "@/stores/rencana-store";
import { useTanyaStore } from "@/stores/tanya-store";
import { useTasStore } from "@/stores/tas-store";
import { useMedisStore } from "@/stores/medis-store";
import { useSimulasiStore } from "@/stores/simulasi-store";
import { useAksiIklimStore } from "@/stores/aksi-iklim-store";
import { useIklimRumahStore } from "@/stores/iklim-rumah-store";

const BTN = "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-5 text-sm font-semibold hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const BTN_UTAMA = "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/30 hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

/** Hapus semua kunci SIGAP (cache respons, log AI, prefill) selain yang dikelola store. */
function hapusSisaKunci() {
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith(AWALAN)) localStorage.removeItem(k);
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
      if (!k.startsWith(AWALAN)) continue;
      const mentah = localStorage.getItem(k);
      try { out[k] = mentah ? JSON.parse(mentah) : null; } catch { out[k] = mentah; }
    }
  } catch {
    /* penyimpanan tidak tersedia */
  }
  return out;
}

const ukuranKb = (data: Record<string, unknown>) => Math.max(1, Math.round(new Blob([JSON.stringify(data)]).size / 1024));
const NAMA_BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
// Ekstensi .sigap (isinya tetap teks biasa) agar tidak tampak seperti berkas teknis di galeri atau WhatsApp.
const namaFile = () => {
  const d = new Date();
  return `Data-SIGAP-${d.getDate()}-${NAMA_BULAN[d.getMonth()]}-${d.getFullYear()}.sigap`;
};

function berkasCadangan(): File {
  const isi = {
    aplikasi: "SIGAP",
    catatan: "Data SIGAP Anda. Tidak perlu dibuka. Untuk memasukkannya ke HP baru: buka SIGAP > Data & privasi > Ambil data dari HP lama.",
    diekspor: new Date().toISOString(),
    data: kumpulkanData(),
  };
  return new File([JSON.stringify(isi, null, 2)], namaFile(), { type: "application/json" });
}

interface KartuData {
  Ikon: typeof MapPin;
  judul: string;
  ringkas: string;
  rinci: string[];
}

/** Satu kartu "yang tersimpan", bisa dibuka untuk melihat isinya dalam bahasa biasa. */
function KartuIsi({ k }: { k: KartuData }) {
  const [buka, setBuka] = useState(false);
  const kosong = k.rinci.length === 0;
  return (
    <li className="rounded-2xl border border-border bg-surface">
      <button
        type="button" disabled={kosong} onClick={() => setBuka((x) => !x)} aria-expanded={buka}
        className="flex w-full items-start gap-3 rounded-2xl p-4 text-left hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-default disabled:hover:bg-transparent"
      >
        <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${kosong ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"}`}><k.Ikon className="size-5" aria-hidden="true" /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-foreground">{k.judul}</span>
          <span className="block text-sm text-muted-foreground">{k.ringkas}</span>
        </span>
        {!kosong && <ChevronDown className={`mt-2 size-4 shrink-0 text-muted-foreground transition-transform ${buka ? "rotate-180" : ""}`} aria-hidden="true" />}
      </button>
      <AnimatePresence initial={false}>
        {buka && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden px-4 text-sm text-foreground">
            <ul className="space-y-1 border-t border-border py-3">
              {k.rinci.map((r) => <li key={r} className="flex gap-2"><span className="text-primary" aria-hidden="true">•</span> {r}</li>)}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

export function DataSayaView() {
  const siap = useHydrate(useLokasiStore, useProfilStore, useProgresStore, useRencanaStore, useKartuStore, useTanyaStore, useLatihanStore, useTasStore);
  const lokasi = useLokasiStore((s) => s.lokasi);
  const profil = useProfilStore((s) => s.profil);
  const progres = useProgresStore((s) => s.progres);
  const rencana = useRencanaStore((s) => s.rencana);
  const sesi = useTanyaStore((s) => s.sesi);
  const latihan = useLatihanStore((s) => s.hasil);
  const kedaluwarsa = useTasStore((s) => s.kedaluwarsa);
  const [selesai, setSelesai] = useState(false);
  const [konfirmasi, setKonfirmasi] = useState(false);
  const [cadangan, setCadangan] = useState<IsiCadangan | null>(null);
  const [galatPulih, setGalatPulih] = useState<string | null>(null);
  const pemilihFile = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const hapusSemua = () => {
    useLokasiStore.getState().clearLokasi();
    useProfilStore.getState().reset();
    useProgresStore.getState().reset();
    useRencanaStore.getState().reset();
    useKartuStore.getState().reset();
    // Store yang ditambahkan kemudian juga dikosongkan, agar isinya di memori tidak menulis ulang ke perangkat.
    useTanyaStore.getState().hapusSemuaSesi();
    useLatihanStore.getState().reset();
    useTasStore.getState().reset();
    // Info medis, Simulasi, dan Siaga Iklim juga: tanpa ini info medis masih tampil di Mode Darurat sampai dimuat ulang.
    useMedisStore.getState().reset();
    useSimulasiStore.getState().reset();
    useIklimRumahStore.getState().reset();
    useAksiIklimStore.setState({ aksi: [] });
    hapusSisaKunci();
    setKonfirmasi(false);
    setSelesai(true);
    toast("Semua data SIGAP di perangkat ini sudah dihapus.");
    router.push("/");
  };

  const unduh = () => {
    const url = URL.createObjectURL(berkasCadangan());
    const a = document.createElement("a");
    a.href = url;
    a.download = namaFile();
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); // dicabut langsung dapat membatalkan unduhan di Safari
    toast("Data Anda tersimpan di folder Unduhan. Kirim ke HP baru Anda, lalu ambil lewat “Ambil data dari HP lama”.");
  };

  // Di HP: langsung kirim data lewat menu Bagikan (WhatsApp, Drive, email) bila peramban mendukung.
  const bisaBagikan = useSyncExternalStore(() => () => {}, () => "canShare" in navigator, () => false);
  const bagikan = async () => {
    const f = berkasCadangan();
    try {
      if (navigator.canShare?.({ files: [f] })) {
        await navigator.share({ files: [f], title: "Data SIGAP saya", text: "Data SIGAP saya. Di HP baru, buka SIGAP > Data & privasi > Ambil data dari HP lama, lalu pilih berkas ini." });
        return;
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
    }
    unduh();
  };

  const pilihFile = async (f: File | undefined) => {
    setGalatPulih(null);
    setCadangan(null);
    if (!f) return;
    const h = bacaCadangan(await f.text());
    if (!h.ok) setGalatPulih(h.pesan);
    else setCadangan(h.isi);
    if (pemilihFile.current) pemilihFile.current.value = "";
  };

  const pulihkan = () => {
    if (!cadangan) return;
    try {
      // Data lama dibersihkan dulu agar tidak tercampur, lalu halaman dimuat ulang supaya semua store membaca data baru.
      hapusSisaKunci();
      for (const [k, v] of Object.entries(cadangan.kunci)) localStorage.setItem(k, v);
      toast("Data Anda sudah dimasukkan.");
      window.location.reload();
    } catch {
      setGalatPulih("Penyimpanan perangkat penuh atau diblokir, data belum dapat dimasukkan.");
    }
  };

  const lulus = Object.values(latihan).filter((x) => x.terbaik >= AMBANG_LULUS).length;
  const profilLengkap = finalisasiProfil(profil);
  const kartu: KartuData[] = [
    {
      Ikon: MapPin, judul: "Lokasi", ringkas: lokasi ? `${lokasi.kelurahan}, ${lokasi.kabKota}` : "Belum dipilih",
      rinci: lokasi ? [`${lokasi.kelurahan}, Kec. ${lokasi.kecamatan}`, `${lokasi.kabKota}, ${lokasi.provinsi}`] : [],
    },
    {
      Ikon: Users, judul: "Profil keluarga", ringkas: profilLengkap ? `${profil.jumlahAnggota} anggota, ${profil.bahaya.length} bahaya` : "Belum diisi lengkap",
      rinci: profilLengkap
        ? [
            `${profil.jumlahAnggota} anggota keluarga${profil.lansia ? `, ${profil.lansia} lansia` : ""}${profil.balita ? `, ${profil.balita} balita` : ""}`,
            `Bahaya: ${profil.bahaya.map((b) => HAZARD_BY_ID[b].label).join(", ")}`,
            `Kontak darurat: ${profil.kontakDarurat.length} orang (hanya di perangkat ini)`,
            profil.titikKumpul ? `Titik kumpul: ${profil.titikKumpul}` : "Titik kumpul belum diisi",
          ]
        : [],
    },
    {
      Ikon: ClipboardList, judul: "Rencana siaga", ringkas: rencana ? `${rencana.tindakan.length} tindakan · ${Object.keys(progres).length} dicentang` : "Belum ada",
      rinci: rencana ? [`Dibuat ${waktuMutlak(rencana.dibuatPada)}`, rencana.mode === "ai" ? "Disusun dengan bantuan AI dari panduan resmi" : "Disusun dari panduan resmi tanpa AI", `${rencana.tas.length} jenis isi tas siaga`] : [],
    },
    {
      Ikon: MessageSquare, judul: "Percakapan Asisten", ringkas: sesi.length ? `${sesi.length} percakapan` : "Belum ada",
      rinci: sesi.slice(0, 6).map((s) => `${s.judul} (${waktuRelatif(s.diubah)})`).concat(sesi.length > 6 ? [`dan ${sesi.length - 6} lainnya`] : []),
    },
    {
      Ikon: Dumbbell, judul: "Latihan Siaga", ringkas: Object.keys(latihan).length ? `${Object.keys(latihan).length} dicoba, ${lulus} lulus` : "Belum ada",
      rinci: Object.entries(latihan).map(([id, c]) => `${SKENARIO_BY_ID[id]?.judul ?? id}: nilai terbaik ${c.terbaik}`),
    },
    {
      Ikon: CalendarClock, judul: "Kedaluwarsa tas", ringkas: Object.keys(kedaluwarsa).length ? `${Object.keys(kedaluwarsa).length} tanggal dicatat` : "Belum ada",
      rinci: Object.entries(kedaluwarsa).map(([id, t]) => `${rencana?.tas.find((x) => x.id === id)?.nama ?? id}: ${t}`),
    },
  ];
  const adaData = kartu.some((k) => k.rinci.length > 0);

  return (
    <div className="space-y-10">
      {selesai && <StatusBanner tone="info">Semua data di perangkat ini sudah dihapus.</StatusBanner>}

      {/* Prinsip privasi dalam tiga butir */}
      <ul className="grid gap-3 sm:grid-cols-3" aria-label="Prinsip privasi SIGAP">
        {[
          { Ikon: UserX, judul: "Tanpa akun", isi: "Tidak perlu daftar, email, atau nomor HP." },
          { Ikon: Smartphone, judul: "Tersimpan di HP ini", isi: "Profil, rencana, dan percakapan hanya ada di perangkat Anda." },
          { Ikon: CloudOff, judul: "Tidak disimpan server", isi: "Server hanya menerima ringkasan tanpa identitas untuk menyusun rencana." },
        ].map(({ Ikon, judul, isi }, i) => (
          <motion.li key={judul} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 * i }} className="rounded-2xl bg-primary/5 p-5">
            <Ikon className="size-6 text-primary" aria-hidden="true" />
            <p className="mt-3 font-bold text-foreground">{judul}</p>
            <p className="mt-1 text-sm text-muted-foreground">{isi}</p>
          </motion.li>
        ))}
      </ul>

      <section aria-labelledby="judul-ringkas">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="judul-ringkas" className="text-2xl font-extrabold tracking-tight">Apa saja yang tersimpan?</h2>
            <p className="text-sm text-muted-foreground">Ketuk kartu untuk melihat isinya.</p>
          </div>
          <p className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground">
            <HardDrive className="size-4" aria-hidden="true" /> {siap ? `${ukuranKb(kumpulkanData())} KB di perangkat ini` : "Menghitung"}
          </p>
        </div>
        {!siap ? (
          <div className="mt-4 h-40 animate-pulse rounded-3xl bg-muted" aria-busy="true" />
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {kartu.map((k) => <KartuIsi key={k.judul} k={k} />)}
          </ul>
        )}
      </section>

      <section aria-labelledby="judul-cadangan" className="overflow-hidden rounded-3xl border border-border bg-surface">
        <div className="p-6 sm:p-8">
          <h2 id="judul-cadangan" className="flex items-center gap-2 text-2xl font-extrabold tracking-tight"><Smartphone className="size-6 text-primary" aria-hidden="true" /> Pindahkan data ke HP lain</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Rencana siaga, kontak darurat, dan titik kumpul Anda hanya tersimpan di HP ini, karena SIGAP tidak memakai akun. Agar tidak hilang saat ganti HP atau data peramban terhapus, <strong className="text-foreground">simpan data Anda</strong> lalu masukkan lagi di HP baru. Anda tidak perlu membuka berkasnya.
          </p>
          <ol className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              { n: 1, Ikon: Download, judul: "Simpan data", isi: "Di HP lama, ketuk tombol di bawah." },
              { n: 2, Ikon: Share2, judul: "Kirim ke diri sendiri", isi: "Lewat WhatsApp ke nomor sendiri, Google Drive, atau email." },
              { n: 3, Ikon: Upload, judul: "Ambil di HP baru", isi: "Buka halaman ini di HP baru, ketuk “Ambil data dari HP lama”, lalu pilih berkas tadi." },
            ].map(({ n, Ikon, judul, isi }) => (
              <li key={n} className="relative rounded-2xl border border-border bg-background p-4">
                <span className="absolute right-4 top-4 text-3xl font-extrabold text-primary/15" aria-hidden="true">{n}</span>
                <Ikon className="size-5 text-primary" aria-hidden="true" />
                <p className="mt-2 font-semibold text-foreground">{judul}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{isi}</p>
              </li>
            ))}
          </ol>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {bisaBagikan && (
              <button type="button" onClick={() => void bagikan()} disabled={!adaData} className={`${BTN_UTAMA} disabled:opacity-50`}>
                <Share2 className="size-4" aria-hidden="true" /> Kirim data saya (WhatsApp, Drive, email)
              </button>
            )}
            <button type="button" onClick={unduh} disabled={!adaData} className={`${bisaBagikan ? BTN : BTN_UTAMA} disabled:opacity-50`}>
              <Download className="size-4" aria-hidden="true" /> Simpan data ke HP ini
            </button>
            <label className={`${BTN} cursor-pointer has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary`}>
              <Upload className="size-4" aria-hidden="true" /> Ambil data dari HP lama
              <input ref={pemilihFile} type="file" accept=".sigap,.json,application/json" className="sr-only" onChange={(e) => void pilihFile(e.target.files?.[0])} />
            </label>
          </div>
          {siap && !adaData && <p className="mt-3 text-sm text-muted-foreground">Belum ada data untuk dicadangkan. Mulai dari <Link href="/lokasi" className="font-semibold text-primary underline">memilih lokasi</Link>.</p>}

          <div aria-live="polite">
            {galatPulih && <div className="mt-4"><StatusBanner tone="warning">{galatPulih}</StatusBanner></div>}
            <AnimatePresence>
              {cadangan && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role="alertdialog" aria-labelledby="judul-pulih" className="mt-4 rounded-2xl border border-primary/30 bg-primary/5 p-4">
                  <p id="judul-pulih" className="flex items-center gap-2 font-semibold text-foreground">
                    <FileCheck2 className="size-5 text-primary" aria-hidden="true" /> Masukkan data{cadangan.diekspor ? ` yang disimpan ${waktuMutlak(cadangan.diekspor)}` : ""}?
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Berisi: {ringkasIsi(cadangan).join(", ")}. Data SIGAP yang ada di HP ini sekarang akan diganti.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={pulihkan} className={BTN_UTAMA}>Ya, masukkan data</button>
                    <button type="button" onClick={() => setCadangan(null)} className={BTN}>Batal</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        <p className="flex items-start gap-2 border-t border-border bg-muted/40 px-6 py-3 text-xs text-muted-foreground sm:px-8">
          <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          Berkas ini berisi kontak darurat dan titik kumpul Anda. Simpan di tempat pribadi dan jangan kirim ke grup umum.
        </p>
      </section>

      <section aria-labelledby="judul-hapus-data" className="rounded-3xl border border-red-200 bg-red-50/50 p-6 sm:p-8">
        <h2 id="judul-hapus-data" className="flex items-center gap-2 text-2xl font-extrabold tracking-tight"><Trash2 className="size-6 text-destructive" aria-hidden="true" /> Hapus data</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Menghapus lokasi, profil, rencana, centang, percakapan Asisten, hasil latihan, dan tanggal kedaluwarsa dari perangkat ini. Cocok bila HP akan dipakai orang lain.</p>
        <div className="mt-4" aria-live="polite">
          {!konfirmasi ? (
            <button type="button" onClick={() => setKonfirmasi(true)} className={BTN}><Trash2 className="size-4" aria-hidden="true" /> Hapus semua data saya</button>
          ) : (
            <div role="alertdialog" aria-labelledby="judul-hapus" className="rounded-2xl border border-red-200 bg-surface p-4">
              <p id="judul-hapus" className="font-semibold text-red-900">Hapus semua data SIGAP dari perangkat ini? Tindakan ini tidak bisa dibatalkan. Simpan data Anda dulu bila masih diperlukan.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={hapusSemua} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-destructive px-5 text-sm font-semibold text-white hover:bg-red-800">Ya, hapus semua</button>
                <button type="button" onClick={() => setKonfirmasi(false)} className={BTN}>Batal</button>
              </div>
            </div>
          )}
        </div>
      </section>

      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <ShieldCheck className="size-4 text-primary" aria-hidden="true" /> Penjelasan lengkap tentang data dan AI ada di <Link href="/metodologi#m6" className="font-semibold text-primary underline-offset-2 hover:underline">Metodologi: Privasi</Link>.
      </p>
    </div>
  );
}
