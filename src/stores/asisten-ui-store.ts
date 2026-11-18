"use client";
import { create } from "zustand";
import { useTanyaStore } from "./tanya-store";

interface AsistenUiState {
  terbuka: boolean;
  setTerbuka: (v: boolean) => void;
  /** Buka panel Asisten; bila ada pertanyaan, langsung dikirim (dipakai tombol "Tanya Asisten" di seluruh aplikasi). */
  tanyakan: (pertanyaan?: string) => void;
  /** Buka panel dan jelaskan teks peringatan resmi (tombol "Jelaskan untuk saya" di kartu Peringatan). */
  jelaskan: (teks: string) => void;
}

/** Status tampilan panel Asisten melayang. Tidak disimpan ke perangkat. */
export const useAsistenUi = create<AsistenUiState>()((set) => ({
  terbuka: false,
  setTerbuka: (terbuka) => set({ terbuka }),
  tanyakan: (pertanyaan) => {
    set({ terbuka: true });
    if (!pertanyaan) return;
    // Pertanyaan kontekstual dari halaman lain dimulai di sesi baru agar tidak tercampur topik sebelumnya.
    const t = useTanyaStore.getState();
    if (t.memuat) return;
    t.sesiBaru();
    void t.kirim(pertanyaan);
  },
  jelaskan: (teks) => {
    set({ terbuka: true });
    const t = useTanyaStore.getState();
    if (t.memuat) return;
    t.sesiBaru();
    void t.jelaskanPeringatan(teks);
  },
}));
