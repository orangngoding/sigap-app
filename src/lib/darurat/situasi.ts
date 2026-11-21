// Situasi kritis di Mode Darurat: keadaan yang sering terjadi SAAT dan SESUDAH bencana apa pun dan menentukan
// nyawa dalam hitungan menit (terjebak reruntuhan, perdarahan, henti jantung, kebakaran, bau gas, arus banjir,
// terpisah dari keluarga). Ditulis tim dari sumber resmi (bukan AI), langkah singkat satu gagasan, tanpa obat atau
// dosis. Tiap situasi menyebut sumbernya dan nomor yang tepat. Ini bukan pengganti pelatihan pertolongan pertama.

export interface SumberSituasi {
  nama: string;
  url: string;
}

export interface Situasi {
  id: "terjebak" | "perdarahan" | "tidak-bernapas" | "kebakaran" | "bau-gas" | "arus-banjir" | "terpisah";
  judul: string;
  /** Kalimat pendek di tombol. */
  ringkas: string;
  /** Nomor yang paling tepat untuk situasi ini. */
  nomor: { nomor: string; label: string };
  langkah: string[];
  /** Alat bantu di Mode Darurat yang relevan. */
  alat?: "peluit" | "ketukan-rjp" | "kabari";
  sumber: SumberSituasi[];
}

const S = {
  bnpbSaku: { nama: "BNPB, Buku Saku Menghadapi Bencana: Tanggap Tangkas Tangguh (2019)", url: "https://www.bnpb.go.id/storage/app/media/Buku%20BNPB/Buku%20Saku%20Bencana%20BNPB.pdf" },
  readyGempa: { nama: "Ready.gov (FEMA): Earthquakes", url: "https://www.ready.gov/earthquakes" },
  kemenkesBhd: { nama: "Kemenkes RI: Bantuan Hidup Dasar dan Pertolongan Pertama", url: "https://keslan.kemkes.go.id/view_artikel/1241/bantuan-hidup-dasar-basic-life-support-and-first-aid-training" },
  msdP3k: { nama: "MSD Manual (versi Indonesia): Pertolongan pertama", url: "https://www.msdmanuals.com/id/home/cedera-dan-keracunan/pertolongan-pertama/pengantar-pertolongan-pertama" },
  msdRjp: { nama: "MSD Manual (versi Indonesia): Resusitasi jantung paru", url: "https://www.msdmanuals.com/id/home/gangguan-jantung-dan-pembuluh-darah/resusitasi-jantung-paru-rjp" },
  readyApi: { nama: "Ready.gov (FEMA): Home Fires", url: "https://www.ready.gov/home-fires" },
  bmkgGempa: { nama: "BMKG: Antisipasi gempa bumi", url: "https://www.bmkg.go.id/gempabumi/mitigasi/antisipasi-gempabumi" },
  readyBanjir: { nama: "Ready.gov (FEMA): Floods", url: "https://www.ready.gov/floods" },
  indonesiaBaik: { nama: "Indonesia Baik: Nomor Penting Darurat Bencana", url: "https://indonesiabaik.id/infografis/nomor-penting-darurat-bencana" },
} as const;

/** Ketukan kompresi dada per menit untuk metronom RJP (rentang anjuran 100-120 per menit). */
export const KETUKAN_RJP_PER_MENIT = 110;

export const SITUASI: Situasi[] = [
  {
    id: "terjebak",
    judul: "Terjebak di reruntuhan",
    ringkas: "Tertimpa atau terkurung bangunan",
    nomor: { nomor: "112", label: "Panggilan darurat 112" },
    langkah: [
      "Tetap tenang dan jangan banyak bergerak agar debu tidak naik.",
      "Tutup hidung dan mulut dengan baju atau kain.",
      "Cari celah untuk bernapas.",
      "Ketuk pipa atau dinding berulang supaya tim penolong mendengar.",
      "Tiup peluit atau nyalakan Peluit SOS. Jangan terus berteriak: menghabiskan tenaga dan menghirup debu.",
      "Kirim SMS ke keluarga atau 112; SMS lebih mudah terkirim saat jaringan padat.",
      "Hemat baterai: matikan aplikasi lain dan redupkan layar.",
    ],
    alat: "peluit",
    sumber: [S.bnpbSaku, S.readyGempa],
  },
  {
    id: "perdarahan",
    judul: "Luka berdarah banyak",
    ringkas: "Perdarahan yang tidak berhenti",
    nomor: { nomor: "119", label: "Ambulans 119" },
    langkah: [
      "Pastikan tempat Anda aman sebelum menolong.",
      "Tekan luka kuat-kuat dengan kain bersih, terus-menerus.",
      "Bila darah merembes, tambahkan kain di atasnya. Jangan angkat kain pertama.",
      "Bila bisa, angkat bagian yang luka lebih tinggi dari jantung.",
      "Benda yang menancap jangan dicabut. Tekan di kedua sisinya.",
      "Baringkan korban dan jaga tetap hangat sampai bantuan datang.",
    ],
    sumber: [S.kemenkesBhd, S.msdP3k],
  },
  {
    id: "tidak-bernapas",
    judul: "Tidak sadar dan tidak bernapas",
    ringkas: "Pingsan, tidak bernapas normal",
    nomor: { nomor: "119", label: "Ambulans 119" },
    langkah: [
      "Pastikan tempat aman. Tepuk bahu korban dan panggil dengan keras.",
      "Bila tidak merespons, minta orang lain menelepon 119 atau 112, atau telepon sendiri dengan pengeras suara.",
      "Bila korban tidak bernapas atau hanya terengah-engah, mulai tekan dada.",
      "Letakkan telapak tangan di tengah dada, tangan lain di atasnya, lengan lurus.",
      "Tekan keras dan cepat sekitar 5 cm, 100 sampai 120 kali per menit. Ikuti ketukan RJP.",
      "Biarkan dada kembali naik setiap kali. Jangan berhenti sampai bantuan datang atau korban bernapas.",
    ],
    alat: "ketukan-rjp",
    sumber: [S.kemenkesBhd, S.msdRjp],
  },
  {
    id: "kebakaran",
    judul: "Kebakaran di rumah",
    ringkas: "Api atau asap tebal di dalam rumah",
    nomor: { nomor: "113", label: "Pemadam kebakaran 113" },
    langkah: [
      "Keluar sekarang bersama keluarga. Jangan kembali untuk mengambil barang.",
      "Merangkak di bawah asap; udara lebih bersih di dekat lantai.",
      "Sentuh pintu dengan punggung tangan. Bila panas, cari jalan keluar lain.",
      "Bila pakaian terbakar: berhenti, jatuhkan diri, dan berguling.",
      "Setelah di luar, telepon 113 dan jangan masuk lagi.",
    ],
    sumber: [S.readyApi],
  },
  {
    id: "bau-gas",
    judul: "Bau gas atau kebocoran",
    ringkas: "Tercium gas setelah gempa atau banjir",
    nomor: { nomor: "113", label: "Pemadam kebakaran 113" },
    langkah: [
      "Jangan menyalakan api, korek, atau rokok.",
      "Jangan menyalakan atau mematikan saklar listrik.",
      "Buka pintu dan jendela lebar-lebar.",
      "Tutup katup atau lepas regulator tabung gas bila aman.",
      "Keluar dari rumah, lalu laporkan kebocoran ke petugas.",
    ],
    sumber: [S.bmkgGempa, S.bnpbSaku],
  },
  {
    id: "arus-banjir",
    judul: "Terjebak air banjir yang mengalir",
    ringkas: "Air deras di jalan atau di rumah",
    nomor: { nomor: "115", label: "Basarnas 115" },
    langkah: [
      "Jangan berjalan atau berkendara menembus air yang mengalir. Arus setinggi 15 cm pun bisa menjatuhkan orang.",
      "Naik ke tempat paling tinggi yang terdekat, misalnya lantai atas atau atap.",
      "Jauhi saluran air dan sungai; arus dan kedalamannya sulit diperkirakan.",
      "Bila mobil terjebak air naik, tinggalkan mobil dan menuju tempat tinggi.",
      "Beri tanda dengan kain terang, senter, atau Layar senter, lalu telepon 115 atau 112.",
    ],
    sumber: [S.readyBanjir, S.bnpbSaku],
  },
  {
    id: "terpisah",
    judul: "Terpisah dari keluarga",
    ringkas: "Anggota keluarga belum ditemukan",
    nomor: { nomor: "117", label: "BNPB 117" },
    langkah: [
      "Menuju titik kumpul keluarga yang sudah disepakati.",
      "Kabari keluarga lewat SMS bahwa Anda selamat dan di mana Anda berada.",
      "Laporkan nama dan ciri anggota yang hilang ke posko pengungsian atau petugas.",
      "Untuk mencari kerabat korban bencana, hubungi BNPB 117.",
      "Anak yang terpisah: minta bantuan petugas berseragam, jangan ikut orang asing.",
    ],
    alat: "kabari",
    sumber: [S.bnpbSaku, S.indonesiaBaik],
  },
];

export const SITUASI_BY_ID = Object.fromEntries(SITUASI.map((s) => [s.id, s])) as Record<Situasi["id"], Situasi>;

// ---------- Pesan kabar keluarga (SMS, tanpa internet data) ----------
export type JenisKabar = "selamat" | "butuh-bantuan";

export interface Posisi {
  lat: number;
  lon: number;
  akurasi: number;
}

/**
 * Teks SMS singkat untuk keluarga. SMS dipilih karena tetap terkirim saat internet data mati atau jaringan padat.
 * Panjang dijaga agar muat dalam sekitar dua SMS. Tidak memuat data medis (itu hanya tampil di layar penolong).
 */
export function teksKabar(jenis: JenisKabar, o: { posisi?: Posisi | null; titikKumpul?: string; jam: string; jumlahOrang?: number }): string {
  const awal = jenis === "selamat" ? "SIGAP: Saya SELAMAT." : "SIGAP: Saya BUTUH BANTUAN.";
  const orang = o.jumlahOrang && o.jumlahOrang > 1 ? ` Bersama ${o.jumlahOrang} orang.` : "";
  const posisi = o.posisi
    ? ` Lokasi: https://maps.google.com/?q=${o.posisi.lat.toFixed(5)},${o.posisi.lon.toFixed(5)} (akurasi ${Math.round(o.posisi.akurasi)} m).`
    : "";
  const titik = jenis === "selamat" && o.titikKumpul?.trim() ? ` Menuju titik kumpul: ${o.titikKumpul.trim().slice(0, 60)}.` : "";
  const akhir = jenis === "butuh-bantuan" ? " Tolong hubungi 112 dan sebutkan lokasi ini." : " Kabari saya bila kamu sudah aman.";
  return `${awal}${orang}${posisi}${titik} Jam ${o.jam}.${akhir}`;
}

/**
 * Tautan SMS ke banyak penerima sekaligus. Android memakai pemisah koma; iOS hanya andal untuk satu penerima, jadi
 * antarmuka juga menyediakan tombol per kontak. Nomor dibersihkan: hanya angka dan tanda +.
 */
export function tautanSms(nomor: string[], teks: string): string {
  const penerima = nomor.map((n) => n.replace(/[^\d+]/g, "")).filter((n) => n.length >= 6);
  return `sms:${penerima.join(",")}?body=${encodeURIComponent(teks)}`;
}
