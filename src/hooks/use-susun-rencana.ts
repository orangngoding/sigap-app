"use client";
import { useCallback, useMemo, useRef, useState } from "react";
import type { Lokasi, ProfilAnonim } from "@/types";
import type { HasilRencana } from "@/lib/ai/rencana";
import { bacaRingkasanLokal, bangunPermintaan, catatPenyusunan, jatahPenyusunan, kePenyimpanan, ringkasRisiko } from "@/lib/rencana/klien";
import { useRisikoLokasi } from "./use-risiko-lokasi";
import { bangunRencanaTemplat } from "@/lib/rencana/templat";
import { SEMUA_CHUNK } from "@/lib/kb/data";
import { useRencanaStore } from "@/stores/rencana-store";

export type StatusSusun = "diam" | "menyusun" | "selesai" | "batas" | "offline" | "gagal";
const BATAS_WAKTU_KLIEN = 32_000;

/**
 * Menyusun rencana lewat /api/rencana. Apa pun hasilnya pengguna selalu berakhir dengan rencana yang bisa dipakai:
 * gagal/offline/batas -> templat deterministik disimpan secara lokal (Blueprint 9.4).
 */
export function useSusunRencana(lokasi: Lokasi | null, anon: ProfilAnonim | null) {
  const [status, setStatus] = useState<StatusSusun>("diam");
  const [alasan, setAlasan] = useState<HasilRencana["meta"]["alasanCadangan"]>();
  const [pulihMenit, setPulihMenit] = useState(0);
  const ctrl = useRef<AbortController | null>(null);
  const simpan = useRencanaStore((s) => s.setRencana);
  const risikoQ = useRisikoLokasi(lokasi);
  const risiko = useMemo(() => ringkasRisiko(risikoQ.data?.nilai), [risikoQ.data]);

  const batalPengguna = useRef(false);
  const batal = useCallback(() => {
    batalPengguna.current = true;
    ctrl.current?.abort();
  }, []);

  const susun = useCallback(
    async ({ paksa = false, otomatis = false }: { paksa?: boolean; otomatis?: boolean } = {}) => {
      if (!lokasi || !anon) return;
      const { sorotan, ringkasanData } = bacaRingkasanLokal(lokasi);
      const templat = () => bangunRencanaTemplat({ adm4: lokasi.adm4, namaLokasi: lokasi.kelurahan, profil: anon, kb: SEMUA_CHUNK, sorotan, risiko });

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        if (!otomatis) simpan(templat());
        setStatus("offline");
        return;
      }
      if (!otomatis) {
        const j = jatahPenyusunan();
        if (j.sisa === 0) {
          setPulihMenit(Math.ceil(j.pulihDalamMs / 60_000));
          setStatus("batas");
          return;
        }
      }
      ctrl.current?.abort();
      batalPengguna.current = false;
      const c = new AbortController();
      ctrl.current = c;
      const timer = setTimeout(() => c.abort(), BATAS_WAKTU_KLIEN);
      setStatus("menyusun");
      setAlasan(undefined);
      if (!otomatis) catatPenyusunan(); // penyusunan otomatis tidak memakan jatah "Susun ulang" pengguna
      try {
        const res = await fetch("/api/rencana", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(bangunPermintaan(lokasi, anon, ringkasanData, paksa, risiko)),
          signal: c.signal,
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as HasilRencana;
        simpan(kePenyimpanan(data, lokasi.adm4, anon));
        setAlasan(data.meta.alasanCadangan);
        setStatus("selesai");
      } catch (e) {
        if (batalPengguna.current) {
          setStatus("diam"); // dibatalkan pengguna: pertahankan rencana yang sudah ada
        } else {
          simpan(templat()); // galat/timeout: tetap beri rencana yang bisa dipakai
          const batas = e instanceof Error && e.message === "429";
          if (batas) setPulihMenit(1);
          setStatus(batas ? "batas" : "gagal");
        }
      } finally {
        clearTimeout(timer);
      }
    },
    [lokasi, anon, simpan, risiko],
  );

  return { status, alasan, pulihMenit, susun, batal };
}
