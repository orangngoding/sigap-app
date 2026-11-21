"use client";
// Daftar keluarga di perangkat (lib/keluarga). Berganti atau menambah keluarga memuat ulang halaman tujuan, agar
// semua store (lokasi, profil, rencana, ...) membaca data keluarga yang baru tanpa sisa data keluarga sebelumnya.
import { useEffect, useMemo, useSyncExternalStore } from "react";
import { toast } from "@/lib/toast";
import {
  KUNCI_KELUARGA, bacaDaftar, hapusKeluarga, pindahKe, ringkasKeluarga, tambahKeluarga, ubahNama,
  type DaftarKeluarga, type Keluarga, type Penyimpanan, type RingkasKeluarga,
} from "@/lib/keluarga/keluarga";
import { useRencanaStore } from "@/stores/rencana-store";
import { useProgresStore } from "@/stores/progres-store";
import { useProfilStore } from "@/stores/profil-store";
import { useLokasiStore } from "@/stores/lokasi-store";
import { useKartuStore } from "@/stores/kartu-store";

const PERISTIWA = "sigap:keluarga";

function penyimpanan(): Penyimpanan | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Ringkasan keluarga AKTIF dibaca dari kunci aktif (lokasi, profil, rencana, centang). Perubahan di tab yang sama tidak
 * memicu peristiwa "storage", jadi store-nya ikut dipantau. Pemberitahuan ditunda satu microtask karena persist zustand
 * menulis ke penyimpanan SESUDAH memberi tahu pendengar; tanpa penundaan, ringkasan membaca isi lama (mis. Kartu Siaga
 * baru tampil setelah halaman dimuat ulang).
 */
function langganan(cb: () => void) {
  const tunda = () => queueMicrotask(cb);
  window.addEventListener("storage", cb);
  window.addEventListener(PERISTIWA, cb);
  const lepas = [useRencanaStore, useProgresStore, useProfilStore, useLokasiStore].map((st) => st.subscribe(tunda));
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(PERISTIWA, cb);
    lepas.forEach((l) => l());
  };
}

const KUNCI_PANTAU = [KUNCI_KELUARGA, "sigap:v1:lokasi", "sigap:v1:profil", "sigap:v1:rencana", "sigap:v1:progres"];
const ambilMentah = () => {
  try {
    return KUNCI_PANTAU.map((k) => window.localStorage.getItem(k) ?? "").join("\u0000");
  } catch {
    return null;
  }
};

export interface KeluargaTampil extends Keluarga {
  aktif: boolean;
  ringkas: RingkasKeluarga;
}

/** Daftar keluarga untuk tampilan. `siap` false di server dan sebelum hidrasi (tampilkan kerangka). */
export function useKeluarga(): { siap: boolean; daftar: KeluargaTampil[]; aktif: KeluargaTampil | null; jumlah: number } {
  const mentah = useSyncExternalStore(langganan, ambilMentah, () => "__server__");
  return useMemo(() => {
    const st = mentah === "__server__" ? null : penyimpanan();
    if (!st) return { siap: false, daftar: [], aktif: null, jumlah: 0 };
    const d: DaftarKeluarga = bacaDaftar(st);
    const daftar = d.daftar.map((k) => ({ ...k, aktif: k.id === d.aktif, ringkas: ringkasKeluarga(st, d, k) }));
    return { siap: true, daftar, aktif: daftar.find((k) => k.aktif) ?? null, jumlah: daftar.length };
  }, [mentah]);
}

const kabari = () => window.dispatchEvent(new Event(PERISTIWA));

/** Pindah ke keluarga lain lalu buka `tujuan` (muat ulang penuh). */
export function bukaKeluarga(id: string, tujuan = "/rencana") {
  const st = penyimpanan();
  if (!st || !pindahKe(st, id)) {
    toast("Belum dapat berganti keluarga: penyimpanan ponsel penuh atau diblokir. Hapus keluarga yang tidak dipakai lalu coba lagi.");
    return;
  }
  window.location.assign(tujuan);
}

const aktifDari = (mentah: string | null) => {
  try {
    const v = mentah ? (JSON.parse(mentah) as { aktif?: unknown }).aktif : null;
    return typeof v === "string" ? v : null;
  } catch {
    return null;
  }
};

/**
 * Tab lain berganti keluarga: store di tab ini masih memegang data keluarga lama di memori dan akan menuliskannya ke
 * kunci aktif (yang kini milik keluarga lain) pada perubahan berikutnya. Muat ulang agar tab ini ikut keluarga baru.
 */
export function useIkutiKeluargaTabLain() {
  useEffect(() => {
    const awal = aktifDari(penyimpanan()?.getItem(KUNCI_KELUARGA) ?? null);
    const cb = (e: StorageEvent) => {
      if (e.key !== KUNCI_KELUARGA && e.key !== null) return;
      const baru = aktifDari(e.key === null ? null : e.newValue);
      if (awal && baru !== awal) window.location.reload();
    };
    window.addEventListener("storage", cb);
    return () => window.removeEventListener("storage", cb);
  }, []);
}

export function tambahDanBuka(nama: string, salinLokasi: boolean): string | null {
  const st = penyimpanan();
  if (!st) return "Penyimpanan perangkat tidak tersedia (mode penyamaran atau diblokir).";
  const r = tambahKeluarga(st, nama, { salinLokasi });
  if (!r.ok) return r.pesan;
  // Lokasi sudah ada: langsung isi profil keluarga. Belum: pilih lokasinya dulu (alur yang sama seperti biasa).
  window.location.assign(salinLokasi ? "/rencana/profil" : "/lokasi");
  return null;
}

export function namaiKeluarga(id: string, nama: string): boolean {
  const st = penyimpanan();
  const ok = Boolean(st && ubahNama(st, id, nama));
  if (ok) {
    // Nama Kartu Siaga keluarga aktif bisa ikut berubah di penyimpanan: store di memori dibaca ulang agar tidak
    // menulis balik nama lama.
    if (useKartuStore.persist.hasHydrated()) void useKartuStore.persist.rehydrate();
    kabari();
  }
  return ok;
}

export function buangKeluarga(id: string): boolean {
  const st = penyimpanan();
  const ok = Boolean(st && hapusKeluarga(st, id));
  if (ok) kabari();
  return ok;
}
