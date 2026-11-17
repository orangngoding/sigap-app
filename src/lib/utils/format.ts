// Format waktu dari string ISO BMKG TANPA konversi zona: jam yang tampil = jam setempat lokasi.
const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export const jamLokal = (iso: string) => iso.slice(11, 16);
export const tanggalLokal = (iso: string) => iso.slice(0, 10);

export function namaHari(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  return HARI[d.getUTCDay()];
}

export function hariTanggal(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  return `${HARI[d.getUTCDay()]}, ${d.getUTCDate()} ${BULAN[d.getUTCMonth()]}`;
}

/** "5 menit lalu", "2 jam lalu", dst. */
export function waktuRelatif(iso: string, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (s < 60) return "baru saja";
  if (s < 3600) return `${Math.floor(s / 60)} menit lalu`;
  if (s < 86400) return `${Math.floor(s / 3600)} jam lalu`;
  return `${Math.floor(s / 86400)} hari lalu`;
}

export const waktuMutlak = (iso: string) =>
  new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
