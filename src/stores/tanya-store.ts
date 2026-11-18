"use client";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { HasilTanya } from "@/lib/ai/tanya";
import type { HasilTerjemah } from "@/lib/ai/terjemah";
import { safeStorage } from "@/lib/storage/safe-storage";
import { profilSudahDiisi } from "@/lib/preparedness/profil-awal";
import { MAKS_PERINGATAN, tampakPeringatan } from "@/lib/tanya/deteksi";
import { judulSesi, migrasiTanya, potongSesi, type PesanChat, type SesiChat } from "@/lib/tanya/sesi";
import { useLokasiStore } from "./lokasi-store";
import { useProfilStore } from "./profil-store";
import { useRencanaStore } from "./rencana-store";
import { useProgresStore } from "./progres-store";
import { useTasStore } from "./tas-store";
import { useLatihanStore } from "./latihan-store";
import { ringkasRencana } from "@/lib/tanya/ringkas-rencana";

export type { PesanChat, SesiChat } from "@/lib/tanya/sesi";
export { MAKS_PESAN, MAKS_SESI } from "@/lib/tanya/sesi";
export const MAKS_PERTANYAAN = 500;
export { MAKS_PERINGATAN, tampakPeringatan } from "@/lib/tanya/deteksi";

interface TanyaState {
  /** Semua sesi percakapan, terbaru lebih dulu. */
  sesi: SesiChat[];
  /** Sesi yang sedang dibuka; null = percakapan baru yang belum punya pesan. */
  aktif: string | null;
  /** Tidak disimpan: permintaan yang sedang berjalan dan sesi tujuannya. */
  memuat: boolean;
  memuatSesi: string | null;
  galat: { pesan: string; ulang: string; sesiId: string } | null;

  sesiBaru: () => void;
  pilihSesi: (id: string) => void;
  hapusSesi: (id: string) => void;
  hapusSemuaSesi: () => void;
  gantiJudul: (id: string, judul: string) => void;
  /** Kosongkan sesi yang sedang dibuka (dipertahankan untuk pemanggil lama). */
  hapusSemua: () => void;

  /** Kirim pertanyaan ke Asisten. Bisa dipanggil dari komponen mana pun (halaman Tanya, panel, tombol "Tanya"). */
  kirim: (teks: string) => Promise<void>;
  /** Jelaskan teks peringatan resmi dengan bahasa sederhana (tanpa menambah fakta). */
  jelaskanPeringatan: (teks: string) => Promise<void>;
  /** Ubah pertanyaan pengguna: pesan itu dan semua sesudahnya dibuang, lalu dikirim ulang. */
  editKirim: (pesanId: string, teksBaru: string) => Promise<void>;
  /** Buat ulang jawaban terakhir dari pertanyaan yang sama. */
  ulangJawaban: () => Promise<void>;
  /** Ulangi pertanyaan terakhir yang gagal. */
  ulangi: () => Promise<void>;
  /** Hentikan permintaan yang sedang berjalan. */
  batal: () => void;
}

const KOSONG: PesanChat[] = [];
const idBaru = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
let ctrl: AbortController | null = null;

/** Pesan sesi yang sedang dibuka (referensi stabil saat kosong). */
export const pilihPesanAktif = (s: Pick<TanyaState, "sesi" | "aktif">): PesanChat[] =>
  s.sesi.find((x) => x.id === s.aktif)?.pesan ?? KOSONG;

/** Pastikan store dari penyimpanan lokal sudah dipulihkan sebelum menulis, agar riwayat tidak tertimpa. */
async function pastikanTerhidrasi() {
  for (const s of [useTanyaStore, useProfilStore, useLokasiStore, useRencanaStore, useProgresStore, useTasStore, useLatihanStore]) {
    if (!s.persist.hasHydrated()) await s.persist.rehydrate();
  }
}

/** Konteks anonim keluarga untuk personalisasi (tanpa nama, kontak, titik kumpul, catatan). */
function konteksKeluarga() {
  const profil = useProfilStore.getState().profil;
  const lokasi = useLokasiStore.getState().lokasi;
  const wilayah = lokasi ? `${lokasi.kecamatan}, ${lokasi.kabKota}, ${lokasi.provinsi}` : undefined;
  // Lokasi lengkap dipakai server untuk membaca kondisi BMKG terkini; koordinat tidak diteruskan ke AI.
  const lok = lokasi ? { adm4: lokasi.adm4, kecamatan: lokasi.kecamatan, kabKota: lokasi.kabKota, provinsi: lokasi.provinsi, lat: lokasi.lat, lon: lokasi.lon } : undefined;
  const r = useRencanaStore.getState().rencana;
  const rencana = r && (!lokasi || r.lokasiAdm4 === lokasi.adm4)
    ? ringkasRencana(r, useProgresStore.getState().progres, useTasStore.getState().kedaluwarsa, useLatihanStore.getState().hasil)
    : undefined;
  if (!profilSudahDiisi(profil)) return { konteks: wilayah ? { wilayah } : undefined, lokasi: lok, rencana };
  return {
    lokasi: lok,
    rencana,
    bahaya: profil.bahaya.length ? profil.bahaya : undefined,
    konteks: {
      wilayah,
      jumlahAnggota: profil.jumlahAnggota,
      lansia: profil.lansia,
      balita: profil.balita,
      hamil: profil.hamil,
      disabilitas: profil.disabilitas,
      hewanPeliharaan: profil.hewanPeliharaan,
      bangunan: profil.bangunan ?? undefined,
    },
  };
}

const pesanGalat = (e: unknown, standar: string) => {
  const offline = typeof navigator !== "undefined" && !navigator.onLine;
  return offline ? "Anda sedang offline. Sambungkan internet untuk memakai Asisten." : e instanceof Error ? e.message : standar;
};

/** Percakapan Asisten SIGAP di perangkat, kunci `sigap:v1:tanya` (Blueprint 12.2). */
export const useTanyaStore = create<TanyaState>()(
  persist(
    (set, get) => {
      /** Pastikan ada sesi tujuan; percakapan baru dibuat saat pesan pertama dikirim. */
      const sesiTujuan = (teksPertama: string): string => {
        const { aktif, sesi } = get();
        if (aktif && sesi.some((x) => x.id === aktif)) return aktif;
        const kini = new Date().toISOString();
        const baru: SesiChat = { id: idBaru(), judul: judulSesi(teksPertama), dibuat: kini, diubah: kini, pesan: [] };
        set({ sesi: potongSesi([baru, ...sesi]), aktif: baru.id });
        return baru.id;
      };

      const tambahKe = (sesiId: string, p: PesanChat) =>
        set((s) => {
          const x = s.sesi.find((y) => y.id === sesiId);
          if (!x) return {};
          const diperbarui = { ...x, pesan: [...x.pesan, p].slice(-40), diubah: p.waktu };
          return { sesi: [diperbarui, ...s.sesi.filter((y) => y.id !== sesiId)] };
        });

      const potongPesan = (sesiId: string, sampai: number) =>
        set((s) => ({ sesi: s.sesi.map((x) => (x.id === sesiId ? { ...x, pesan: x.pesan.slice(0, sampai) } : x)) }));

      /** Jalankan satu permintaan untuk sesi tertentu; hasil selalu masuk ke sesi itu walau pengguna pindah sesi. */
      const jalankan = async (sesiId: string, teks: string, permintaan: (signal: AbortSignal) => Promise<PesanChat>, standarGalat: string) => {
        ctrl?.abort();
        const c = new AbortController();
        ctrl = c;
        set({ memuat: true, memuatSesi: sesiId, galat: null });
        try {
          tambahKe(sesiId, await permintaan(c.signal));
        } catch (e) {
          if (c.signal.aborted) return;
          set({ galat: { pesan: pesanGalat(e, standarGalat), ulang: teks, sesiId } });
        } finally {
          if (ctrl === c) {
            ctrl = null;
            set({ memuat: false, memuatSesi: null });
          }
        }
      };

      return {
        sesi: [],
        aktif: null,
        memuat: false,
        memuatSesi: null,
        galat: null,

        sesiBaru: () => set({ aktif: null, galat: null }),
        pilihSesi: (id) => set({ aktif: id, galat: null }),
        hapusSesi: (id) => {
          if (get().memuatSesi === id) ctrl?.abort();
          set((s) => ({
            sesi: s.sesi.filter((x) => x.id !== id),
            aktif: s.aktif === id ? null : s.aktif,
            galat: s.galat?.sesiId === id ? null : s.galat,
            ...(s.memuatSesi === id ? { memuat: false, memuatSesi: null } : {}),
          }));
        },
        hapusSemuaSesi: () => {
          ctrl?.abort();
          set({ sesi: [], aktif: null, memuat: false, memuatSesi: null, galat: null });
        },
        gantiJudul: (id, judul) => {
          const j = judul.trim().slice(0, 80);
          if (j) set((s) => ({ sesi: s.sesi.map((x) => (x.id === id ? { ...x, judul: j, judulManual: true } : x)) }));
        },
        hapusSemua: () => {
          const a = get().aktif;
          if (a) get().hapusSesi(a);
        },

        batal: () => {
          ctrl?.abort();
          ctrl = null;
          set({ memuat: false, memuatSesi: null });
        },

        ulangi: async () => {
          const g = get().galat;
          if (!g) return;
          // Pesan pengguna yang gagal dibuang dulu agar tidak tercatat dua kali.
          const x = get().sesi.find((y) => y.id === g.sesiId);
          if (x && x.pesan.at(-1)?.peran === "pengguna") potongPesan(g.sesiId, x.pesan.length - 1);
          set({ galat: null, aktif: g.sesiId });
          await get().kirim(g.ulang);
        },

        editKirim: async (pesanId, teksBaru) => {
          if (get().memuat || teksBaru.trim().length < 2) return;
          const a = get().aktif;
          const x = get().sesi.find((y) => y.id === a);
          const i = x?.pesan.findIndex((p) => p.id === pesanId) ?? -1;
          if (!a || !x || i < 0 || x.pesan[i].peran !== "pengguna") return;
          potongPesan(a, i);
          // Pertanyaan pertama diubah: judul otomatis ikut berubah (kecuali sudah dinamai pengguna).
          if (i === 0 && !x.judulManual) set((s) => ({ sesi: s.sesi.map((y) => (y.id === a ? { ...y, judul: judulSesi(teksBaru) } : y)) }));
          set({ galat: null });
          await get().kirim(teksBaru);
        },

        ulangJawaban: async () => {
          if (get().memuat) return;
          const a = get().aktif;
          const x = get().sesi.find((y) => y.id === a);
          if (!a || !x) return;
          const i = x.pesan.findLastIndex((p) => p.peran === "pengguna");
          if (i < 0) return;
          const teks = x.pesan[i].teks;
          potongPesan(a, i);
          await get().kirim(teks);
        },

        jelaskanPeringatan: async (teks) => {
          const t = teks.trim().slice(0, MAKS_PERINGATAN);
          if (t.length < 20 || get().memuat) return;
          await pastikanTerhidrasi();
          const sesiId = sesiTujuan("Penjelasan peringatan BMKG");
          tambahKe(sesiId, { id: idBaru(), peran: "pengguna", teks: t, waktu: new Date().toISOString() });
          const p = useProfilStore.getState().profil;
          await jalankan(sesiId, t, async (signal) => {
            const res = await fetch("/api/terjemah", {
              method: "POST",
              headers: { "content-type": "application/json" },
              signal,
              body: JSON.stringify({
                teksPeringatan: t,
                profil: profilSudahDiisi(p) ? { jumlahAnggota: p.jumlahAnggota, lansia: p.lansia, balita: p.balita, hamil: p.hamil, disabilitas: p.disabilitas } : undefined,
              }),
            });
            if (!res.ok) throw new Error(res.status === 429 ? "Terlalu banyak permintaan. Coba lagi dalam beberapa saat." : "Peringatan belum dapat dijelaskan. Coba lagi.");
            const h = (await res.json()) as HasilTerjemah;
            const isi = [h.penjelasan, "", "**Yang bisa dilakukan keluarga:**", ...h.tindakan.map((x) => `- ${x}`), "", "Yang berlaku tetap teks resmi BMKG."].join("\n");
            return {
              id: idBaru(), peran: "asisten", teks: isi, waktu: new Date().toISOString(),
              hasil: {
                mode: h.mode, refused: false, dasar: "peringatan", sumberWeb: [],
                sumber: [{ id: "bmkg-peringatan-dini", judul: "Peringatan dini resmi BMKG", url: h.tautanResmi }],
                saran: ["Apa isi tas siaga yang perlu disiapkan?", "Bagaimana melindungi lansia dan balita?", "Apa yang dilakukan saat hujan lebat dan petir?"],
              },
            };
          }, "Peringatan belum dapat dijelaskan.");
        },

        kirim: async (teks) => {
          if (tampakPeringatan(teks)) return get().jelaskanPeringatan(teks);
          const t = teks.trim().slice(0, MAKS_PERTANYAAN);
          if (t.length < 2 || get().memuat) return;
          await pastikanTerhidrasi();
          const sesiId = sesiTujuan(t);
          // Riwayat dikirim apa adanya (teks saja); server memangkasnya ke 8 giliran terakhir.
          const riwayat = (get().sesi.find((x) => x.id === sesiId)?.pesan ?? []).map((m) => ({ peran: m.peran, teks: m.teks })).slice(-16);
          tambahKe(sesiId, { id: idBaru(), peran: "pengguna", teks: t, waktu: new Date().toISOString() });
          await jalankan(sesiId, t, async (signal) => {
            const res = await fetch("/api/tanya", {
              method: "POST",
              headers: { "content-type": "application/json" },
              signal,
              body: JSON.stringify({ pertanyaan: t, riwayat, ...konteksKeluarga() }),
            });
            if (!res.ok) throw new Error(res.status === 429 ? "Terlalu banyak pertanyaan. Coba lagi dalam beberapa saat." : "Asisten belum dapat menjawab. Coba lagi.");
            const { jawaban, ...sisa } = (await res.json()) as HasilTanya;
            return { id: idBaru(), peran: "asisten", teks: jawaban, waktu: new Date().toISOString(), hasil: sisa };
          }, "Asisten belum dapat menjawab.");
        },
      };
    },
    {
      name: "sigap:v1:tanya",
      version: 2,
      skipHydration: true,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ sesi: s.sesi, aktif: s.aktif }),
      // v1 menyimpan satu percakapan ({ pesan }); dipindahkan menjadi satu sesi agar riwayat tidak hilang.
      migrate: (p, versi) => migrasiTanya(p, versi),
    },
  ),
);
