// Pesan galat geolokasi yang menyebut penyebab sebenarnya. Peramban mengembalikan PERMISSION_DENIED (kode 1) untuk
// dua hal yang sangat berbeda bagi pengguna: izin memang ditolak/diblokir, atau halaman dibuka lewat alamat yang
// tidak aman (http selain localhost), tempat lokasi selalu ditolak bahkan bila izin sudah diberikan.

export const PESAN_TIDAK_AMAN =
  "Lokasi perangkat hanya bisa dipakai lewat alamat yang aman (https, atau localhost saat pengembangan). Alamat ini tidak aman, jadi peramban menolaknya.";

/** Pesan untuk pengguna, tanpa istilah teknis. `akhiran` ditambahkan di akhir (mis. ajakan memilih manual). */
export async function pesanGalatLokasi(err: GeolocationPositionError, akhiran = ""): Promise<string> {
  const tambah = akhiran ? ` ${akhiran}` : "";
  if (typeof window !== "undefined" && !window.isSecureContext) return `${PESAN_TIDAK_AMAN}${tambah}`;
  if (err.code === err.PERMISSION_DENIED) {
    let diblokir = false;
    try {
      diblokir = (await navigator.permissions.query({ name: "geolocation" as PermissionName })).state === "denied";
    } catch {
      /* Permissions API tidak tersedia: anggap izin belum diberikan */
    }
    return diblokir
      ? `Izin lokasi diblokir untuk situs ini. Klik ikon gembok di sebelah alamat, ubah Lokasi menjadi Izinkan, lalu coba lagi.${tambah}`
      : `Izin lokasi belum diberikan.${tambah}`;
  }
  if (err.code === err.TIMEOUT) return `Menentukan lokasi terlalu lama. Coba lagi di tempat terbuka.${tambah}`;
  return `Lokasi belum dapat ditentukan.${tambah}`;
}
