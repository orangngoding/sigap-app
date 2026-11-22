"use client";
import Link from "next/link";
import { useCallback, useMemo, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, BookOpen, Clock, Layers, Search, X } from "lucide-react";
import { HAZARD_BY_ID } from "@/lib/hazards/hazards";
import { IKON_BAHAYA } from "@/lib/hazards/ikon";
import { Pilihan } from "@/components/ui/pilihan";
import type { Foto as DataFoto } from "@/lib/gambar";
import { Foto } from "@/components/global/foto";
import type { HazardId } from "@/types";

export interface ArtikelKartu {
  slug: string;
  title: string;
  ringkasan: string;
  hazards: string[];
  kategori: string;
  menit: number;
  foto: DataFoto;
}

const KUNCI_FILTER = "sigap:pustaka-filter";
const KATEGORI = ["Bencana", "Iklim", "Keluarga", "Komunitas"];

/** Nama pendek di kartu agar baris info muat satu baris (nama lengkap tetap di tooltip). */
const PENDEK: Record<string, string> = { longsor: "Longsor", cuaca_ekstrem: "Cuaca ekstrem", karhutla: "Karhutla", gelombang_abrasi: "Gelombang", gunung_api: "Gunung api", gempa: "Gempa" };
const namaHazard = (h: string) => (h === "umum" ? "Umum" : (HAZARD_BY_ID[h as HazardId]?.label ?? h));
const norm = (s: string) => s.toLowerCase();

interface Filter {
  kata: string;
  bahaya: string;
  kategori: string;
}
const FILTER_AWAL: Filter = { kata: "", bahaya: "semua", kategori: "semua" };

// Filter tercermin di URL (?q=banjir&bahaya=banjir&kategori=Bencana) agar hasil pencarian bisa dibagikan atau
// ditandai, dan bertahan selama sesi peramban agar kembali dari artikel tidak mengosongkan pencarian. Urutan baca:
// perubahan terakhir di halaman ini, lalu URL, lalu sessionStorage. Dibaca lewat useSyncExternalStore: server dan
// render pertama memakai nilai awal, lalu klien menyesuaikan tanpa galat hidrasi.
const pendengar = new Set<() => void>();
let terakhir: string | null = null; // perubahan terakhir; juga cadangan bila sessionStorage tidak tersedia
const dariUrl = (): string | null => {
  const q = new URLSearchParams(window.location.search);
  if (!q.has("q") && !q.has("bahaya") && !q.has("kategori")) return null;
  return JSON.stringify({ kata: q.get("q") ?? "", bahaya: q.get("bahaya") ?? "semua", kategori: q.get("kategori") ?? "semua" });
};
const bacaMentah = () => {
  if (terakhir !== null) return terakhir;
  const url = dariUrl();
  if (url !== null) return url;
  try {
    return sessionStorage.getItem(KUNCI_FILTER);
  } catch {
    return null;
  }
};
const langganan = (cb: () => void) => {
  pendengar.add(cb);
  const kembali = () => {
    terakhir = null; // tombol Kembali/Maju peramban: URL menjadi sumber kebenaran lagi
    cb();
  };
  window.addEventListener("popstate", kembali);
  return () => {
    pendengar.delete(cb);
    window.removeEventListener("popstate", kembali);
  };
};
function tulisUrl(f: Filter) {
  const q = new URLSearchParams();
  if (f.kata.trim()) q.set("q", f.kata.trim());
  if (f.bahaya !== FILTER_AWAL.bahaya) q.set("bahaya", f.bahaya);
  if (f.kategori !== FILTER_AWAL.kategori) q.set("kategori", f.kategori);
  const s = q.toString();
  window.history.replaceState(window.history.state, "", `${window.location.pathname}${s ? `?${s}` : ""}${window.location.hash}`);
}

function useFilterTersimpan() {
  const mentah = useSyncExternalStore(langganan, bacaMentah, () => null);
  const filter = useMemo<Filter>(() => {
    try {
      const t = JSON.parse(mentah ?? "null") as Partial<Record<keyof Filter, unknown>> | null;
      return {
        kata: typeof t?.kata === "string" ? t.kata.slice(0, 80) : FILTER_AWAL.kata,
        bahaya: typeof t?.bahaya === "string" ? t.bahaya : FILTER_AWAL.bahaya,
        kategori: typeof t?.kategori === "string" && (t.kategori === "semua" || KATEGORI.includes(t.kategori)) ? t.kategori : FILTER_AWAL.kategori,
      };
    } catch {
      return FILTER_AWAL;
    }
  }, [mentah]);
  const ubah = useCallback(
    (bagian: Partial<Filter>) => {
      const baru = { ...filter, ...bagian };
      terakhir = JSON.stringify(baru);
      tulisUrl(baru);
      try {
        sessionStorage.setItem(KUNCI_FILTER, terakhir);
      } catch {
        /* tetap tersimpan di memori */
      }
      pendengar.forEach((cb) => cb());
    },
    [filter],
  );
  return { ...filter, ubah };
}

/** Daftar artikel bersampul foto, dengan pencarian dan filter di sisi klien (Blueprint 8.4). */
export function PustakaDaftar({ artikel }: { artikel: ArtikelKartu[] }) {
  const { kata, bahaya: bahayaMentah, kategori, ubah } = useFilterTersimpan();
  const setKata = (v: string) => ubah({ kata: v });
  const setBahaya = (v: string) => ubah({ bahaya: v });
  const setKategori = (v: string) => ubah({ kategori: v });

  const opsi = useMemo(() => Array.from(new Set(artikel.flatMap((a) => a.hazards))), [artikel]);
  // Nilai bahaya dari URL yang tidak dikenal dianggap "semua", bukan menghasilkan daftar kosong.
  const bahaya = bahayaMentah === "semua" || opsi.includes(bahayaMentah) ? bahayaMentah : "semua";
  const tampil = useMemo(() => {
    const q = norm(kata.trim());
    return artikel.filter(
      (a) =>
        (bahaya === "semua" || a.hazards.includes(bahaya)) &&
        (kategori === "semua" || a.kategori === kategori) &&
        (!q || norm(`${a.title} ${a.ringkasan}`).includes(q)),
    );
  }, [artikel, kata, bahaya, kategori]);

  const chip = (aktif: boolean) =>
    `relative min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary ${aktif ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`;
  const adaFilter = kata || bahaya !== "semua" || kategori !== "semua";

  return (
    <div className="min-w-0">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div role="group" aria-label="Filter kategori" className="flex gap-1 overflow-x-auto rounded-full [scrollbar-width:none] sm:flex-wrap sm:overflow-visible lg:shrink-0 lg:flex-nowrap border border-border bg-surface p-1">
          {["semua", ...KATEGORI].map((k) => (
            <button key={k} type="button" aria-pressed={kategori === k} onClick={() => setKategori(k)} className={chip(kategori === k)}>
              {kategori === k && <motion.span layoutId="kategori-aktif" className="absolute inset-0 -z-0 rounded-full bg-primary" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
              <span className="relative">{k === "semua" ? "Semua" : k}</span>
            </button>
          ))}
        </div>
        <div className="relative w-full xl:max-w-sm">
          <label htmlFor="cari-pustaka" className="sr-only">Cari artikel</label>
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            id="cari-pustaka" name="cari" type="search" autoComplete="off" value={kata} onChange={(e) => setKata(e.target.value)}
            placeholder="Cari, misalnya: tas siaga…"
            className="min-h-12 w-full rounded-full border border-border bg-surface pl-11 pr-4 text-base shadow-sm focus-visible:outline-2 focus-visible:outline-primary"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <label htmlFor="filter-bahaya" className="text-sm font-semibold text-foreground">Bahaya</label>
        <Pilihan
          id="filter-bahaya" nilai={bahaya} onUbah={setBahaya} className="min-w-52"
          opsi={[
            { nilai: "semua", label: "Semua bahaya", Ikon: Layers, warnaIkon: "text-primary", jumlah: artikel.length },
            ...opsi.map((h) => ({
              nilai: h,
              label: namaHazard(h),
              Ikon: h === "umum" ? BookOpen : IKON_BAHAYA[h as HazardId],
              warnaIkon: h === "umum" ? "text-muted-foreground" : HAZARD_BY_ID[h as HazardId]?.colorClass,
              jumlah: artikel.filter((a) => a.hazards.includes(h)).length,
            })),
          ]}
        />
        <p role="status" className="text-sm text-muted-foreground">{tampil.length} artikel</p>
        {adaFilter && (
          <button type="button" onClick={() => ubah(FILTER_AWAL)} className="inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-sm font-medium text-primary hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-primary">
            <X className="size-4" aria-hidden="true" /> Hapus filter
          </button>
        )}
      </div>

      {tampil.length === 0 ? (
        <p className="mt-8 rounded-3xl border border-dashed border-border bg-surface p-10 text-center text-sm text-muted-foreground">
          Belum ada artikel yang cocok. Coba kata lain atau hapus filter.
        </p>
      ) : (
        <motion.ul layout className="mt-6 grid grid-cols-1 gap-3 sm:mt-8 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
          <AnimatePresence initial={false}>
            {tampil.map((a, i) => (
              <motion.li
                key={a.slug} layout
                initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.25 }}
                className={`min-w-0 ${i === 0 && !adaFilter ? "sm:col-span-2" : ""}`}
              >
                {/* HP: kartu ringkas mendatar (foto kecil di kiri) kecuali artikel unggulan; layar lebar: kartu berfoto penuh.
                    Baris info selalu satu baris dan menempel di bawah, agar tombol Baca sejajar di semua kartu. */}
                <Link
                  href={`/pustaka/${a.slug}`}
                  className={`angkat group flex h-full overflow-hidden rounded-3xl border border-border bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${i === 0 && !adaFilter ? "flex-col" : "flex-row sm:flex-col"}`}
                >
                  <div className={`relative shrink-0 ${i === 0 && !adaFilter ? "" : "w-28 sm:w-auto"}`}>
                    <Foto foto={a.foto} hias zoom sizes={i === 0 && !adaFilter ? "(min-width: 1280px) 45vw, 100vw" : "(min-width: 1280px) 22vw, (min-width: 640px) 40vw, 112px"} className={i === 0 && !adaFilter ? "aspect-[16/9] sm:aspect-[16/8]" : "h-full min-h-32 sm:aspect-[16/10] sm:h-auto sm:min-h-0"} />
                    <span className={`absolute left-4 top-4 rounded-md bg-white/90 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-foreground shadow-sm backdrop-blur ${i === 0 && !adaFilter ? "" : "max-sm:hidden"}`}>{a.kategori}</span>
                  </div>
                  <div className={`flex min-w-0 flex-1 flex-col ${i === 0 && !adaFilter ? "p-5 sm:p-6" : "p-4 sm:p-5"}`}>
                    {!(i === 0 && !adaFilter) && <p className="mb-1 text-xs font-bold uppercase tracking-wide text-primary sm:hidden">{a.kategori}</p>}
                    <h2 className={`font-bold leading-snug text-foreground group-hover:text-primary ${i === 0 && !adaFilter ? "text-xl" : "text-base sm:text-lg"}`}>{a.title}</h2>
                    <p className={`mt-1.5 text-sm leading-relaxed text-muted-foreground ${i === 0 && !adaFilter ? "line-clamp-3" : "line-clamp-2 sm:line-clamp-3"}`}>{a.ringkasan}</p>
                    <div className="mt-auto flex items-center gap-2 pt-3 text-xs font-medium text-muted-foreground sm:pt-4">
                      <span className="inline-flex shrink-0 items-center gap-1"><Clock className="size-3.5" aria-hidden="true" /> {a.menit} menit</span>
                      {(() => {
                        const utama = a.hazards.find((h) => h !== "umum") ?? a.hazards[0];
                        return utama ? <span className="shrink-0 whitespace-nowrap rounded-full bg-muted px-2.5 py-0.5" title={a.hazards.map(namaHazard).join(", ")}>{PENDEK[utama] ?? namaHazard(utama)}</span> : null;
                      })()}
                      <span className="ml-auto hidden shrink-0 items-center gap-1 text-sm font-semibold text-primary sm:inline-flex">Baca <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></span>
                    </div>
                  </div>
                </Link>
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      )}
    </div>
  );
}
