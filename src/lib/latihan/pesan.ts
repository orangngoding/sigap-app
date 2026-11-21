// Simulasi lewat notifikasi ponsel: tiap situasi datang sebagai pesan bertanda waktu dari berbagai sumber, seperti
// saat bencana sungguhan. Sebagian pesan sengaja berisi kabar bohong yang sering beredar saat bencana, agar
// pengguna terlatih memeriksa ke sumber resmi; penjelasannya baru tampil setelah pengguna memilih tindakan.
// Ditulis tim (bukan AI). Isi pesan resmi tidak mengutip peringatan nyata dan tidak memakai nomor atau tautan asli.

export type JenisPesan = "resmi" | "keluarga" | "warga" | "medsos" | "radio";

export interface Pesan {
  dari: string;
  jenis: JenisPesan;
  jam: string;
  teks: string;
  /** Bila diisi: pesan ini hoaks; teks ini menjelaskan cirinya (tampil setelah menjawab). */
  hoaks?: string;
}

/** Pesan per id langkah skenario (lihat skenario.ts). Langkah tanpa entri tampil tanpa pesan. */
export const PESAN: Record<string, Pesan[]> = {
  // ---------- Gempa saat memasak malam hari ----------
  g1: [{ dari: "Keluarga", jenis: "keluarga", jam: "20.58", teks: "Makan malamnya sebentar lagi ya?" }],
  g2: [
    { dari: "Info BMKG", jenis: "resmi", jam: "21.04", teks: "Gempa dirasakan kuat di wilayah Anda. Tidak berpotensi tsunami. Waspadai gempa susulan dan periksa bangunan sebelum masuk." },
    { dari: "Grup Rusun Blok C", jenis: "warga", jam: "21.05", teks: "Warga diminta turun ke halaman lewat tangga. Lift dimatikan pengelola." },
  ],
  g3: [{ dari: "Keluarga", jenis: "keluarga", jam: "21.09", teks: "Kami sudah di bawah. Kumpul di mana?" }],
  g4: [{ dari: "Grup Rusun Blok C", jenis: "warga", jam: "21.15", teks: "Ada bau gas di lantai 4. Petugas sedang memeriksa, jangan ada yang masuk dulu." }],
  g5: [{ dari: "Diteruskan berkali-kali", jenis: "medsos", jam: "21.31", teks: "PENTING!! Info dari orang BMKG: gempa lebih besar datang jam 23.00 malam ini. Sebarkan ke semua keluarga!!", hoaks: "Gempa tidak dapat diprediksi jamnya oleh siapa pun. Ciri hoaks: mengatasnamakan lembaga tanpa tautan resmi, huruf kapital dan tanda seru, serta ajakan \"sebarkan\"." }],

  // ---------- Banjir kiriman ----------
  b1: [
    { dari: "Info BMKG", jenis: "resmi", jam: "16.10", teks: "Peringatan dini: hujan lebat disertai kilat dan angin kencang di wilayah Anda hingga malam hari." },
    { dari: "Pengumuman RT 03", jenis: "warga", jam: "17.40", teks: "Air sungai sudah level kuning. Warga dekat bantaran mohon bersiap dan amankan barang." },
  ],
  b1x: [{ dari: "Grup Keluarga", jenis: "keluarga", jam: "18.45", teks: "Air sudah masuk rumah sebelah. Kalian masih di rumah?" }],
  b2: [
    { dari: "Diteruskan berkali-kali", jenis: "medsos", jam: "18.50", teks: "Pintu air utama JEBOL! Air setinggi 3 meter datang 10 menit lagi, cepat lari ke mana saja!!", hoaks: "Kabar ini tanpa sumber resmi dan mendorong lari tanpa arah. Ikuti pengumuman RT, BPBD, atau petugas, dan menuju tempat aman yang sudah diarahkan." },
    { dari: "Petugas BPBD (lewat RT)", jenis: "resmi", jam: "18.52", teks: "Warga RT 03 dan RT 04 evakuasi mandiri ke balai desa. Utamakan lansia, anak, dan ibu hamil." },
  ],
  b3: [{ dari: "Grup Keluarga", jenis: "keluarga", jam: "19.05", teks: "Nenek sudah di balai desa. Kamu menyusul?" }],
  b4: [{ dari: "Pengumuman RT 03", jenis: "warga", jam: "19.12", teks: "Jalan utama tergenang dan berarus. Lewat gang belakang masjid, jangan bawa kendaraan." }],
  b5: [{ dari: "Info BPBD", jenis: "resmi", jam: "08.00", teks: "Air sudah surut. Warga boleh kembali bertahap; waspadai lumpur, kabel, dan binatang berbisa." }],

  // ---------- Tsunami di pantai ----------
  t1: [{ dari: "Grup Keluarga", jenis: "keluarga", jam: "10.21", teks: "Fotoin kami di pantai dong!" }],
  t2: [{ dari: "Info BMKG", jenis: "resmi", jam: "10.26", teks: "Peringatan dini tsunami untuk pantai di wilayah Anda. Segera menjauhi pantai menuju tempat tinggi." }],
  t3: [{ dari: "Radio daerah", jenis: "radio", jam: "10.31", teks: "Jalur menuju bukit padat. Warga diimbau berjalan kaki dan tidak melewati jembatan dekat muara." }],
  t4: [{ dari: "Grup Keluarga", jenis: "keluarga", jam: "10.58", teks: "Kata orang-orang sudah aman, airnya cuma sedikit. Turun yuk, barang kita di penginapan.", hoaks: "\"Kata orang\" bukan informasi resmi. Gelombang tsunami berikutnya bisa lebih besar; tunggu sampai pihak berwenang menyatakan aman." }],

  // ---------- Petir di lapangan ----------
  c1: [{ dari: "Info BMKG", jenis: "resmi", jam: "15.20", teks: "Peringatan dini: hujan lebat disertai petir dan angin kencang dalam 1-2 jam ke depan di wilayah Anda." }],
  c2: [{ dari: "Anak Anda", jenis: "keluarga", jam: "15.32", teks: "Aku takut, kilatnya dekat banget." }],
  c3: [{ dari: "Diteruskan berkali-kali", jenis: "medsos", jam: "15.40", teks: "Tips: saat angin kencang, berlindung di bawah papan reklame atau pohon besar paling aman dari hujan.", hoaks: "Saran ini berbahaya. Papan reklame dan pohon besar bisa roboh saat angin kencang. Cek saran keselamatan ke kanal resmi BMKG dan BNPB." }],
  c4: [{ dari: "Grup Warga", jenis: "warga", jam: "16.30", teks: "Ada kabel listrik putus di depan rumah Bu Sari, jangan ada yang lewat situ dulu." }],
  c5: [{ dari: "Anak Anda", jenis: "keluarga", jam: "16.40", teks: "Tanganku perih, tadi kena pagar waktu lari." }],

  // ---------- Kabut asap karhutla ----------
  k1: [{ dari: "Info kualitas udara", jenis: "resmi", jam: "06.30", teks: "Kualitas udara di kota Anda: tidak sehat. Kurangi aktivitas di luar ruangan." }],
  k2: [{ dari: "Diteruskan berkali-kali", jenis: "medsos", jam: "09.10", teks: "Rahasia dokter: minum air kelapa sebelum keluar bikin paru-paru kebal asap, tidak perlu masker!", hoaks: "Klaim kesehatan tanpa sumber dan menyuruh meninggalkan masker. Panduan resmi menganjurkan masker (N95 lebih baik) saat harus keluar." }],
  k3: [{ dari: "Grup Keluarga", jenis: "keluarga", jam: "13.15", teks: "Bapak batuknya nggak berhenti dari tadi, napasnya pendek." }],
  k4: [{ dari: "Grup Warga", jenis: "warga", jam: "16.40", teks: "Ada api di lahan kosong ujung gang, asapnya makin tebal ke arah rumah-rumah." }],

  // ---------- Longsor di lereng ----------
  l1: [{ dari: "Info BMKG", jenis: "resmi", jam: "02.10", teks: "Hujan lebat masih berlangsung. Warga di lereng dan tebing diimbau waspada longsor." }],
  l2: [{ dari: "Grup Warga", jenis: "warga", jam: "02.25", teks: "Tanah turun di belakang rumah Pak Darto. Yang dekat lereng siap-siap keluar." }],
  l3: [{ dari: "Diteruskan berkali-kali", jenis: "medsos", jam: "02.31", teks: "Sirine desa lagi rusak, bunyi sendiri dari tadi. Abaikan saja, tidur lagi.", hoaks: "Jangan abaikan sirine tanpa konfirmasi dari perangkat desa atau petugas. Saat ragu, lebih aman menuju zona evakuasi." }],
  l4: [{ dari: "Grup Warga", jenis: "warga", jam: "03.05", teks: "Mbah Sri di ujung RT belum kelihatan di posko." }],
  // ---------- Erupsi gunung api ----------
  e1: [
    { dari: "Info PVMBG", jenis: "resmi", jam: "16.20", teks: "Status gunung api dinaikkan ke Level III (Siaga). Warga di kawasan yang direkomendasikan dikosongkan diminta mengikuti arahan petugas." },
    { dari: "Grup Warga Dusun", jenis: "warga", jam: "16.32", teks: "Truk evakuasi kumpul di balai dusun. Lansia dan anak naik duluan." },
  ],
  e2: [{ dari: "Keluarga", jenis: "keluarga", jam: "16.45", teks: "Di sini abunya mulai turun. Masker yang di lemari dibawa ya." }],
  e3: [{ dari: "Grup Warga Dusun", jenis: "warga", jam: "17.05", teks: "Jalan ke posko lewat jalur evakuasi utara, jangan lewat bantaran kali." }],
  e4: [{ dari: "Diteruskan berkali-kali", jenis: "medsos", jam: "21.40", teks: "KABAR GEMBIRA!! Gunung sudah tenang, status sudah normal lagi. Warga boleh pulang malam ini, info dari orang dalam!!", hoaks: "Status gunung api dan izin pulang hanya diumumkan PVMBG dan petugas. Ciri hoaks: \"info dari orang dalam\", tanpa sumber resmi, huruf kapital dan tanda seru." }],
  e5: [{ dari: "Info BPBD", jenis: "resmi", jam: "09.15", teks: "Warga diizinkan kembali ke rumah. Bersihkan abu dari atap dengan hati-hati dan gunakan masker." }],

  // ---------- Kemarau panjang El Niño ----------
  kr1: [{ dari: "Info BMKG", jenis: "resmi", jam: "07.00", teks: "Awal musim hujan di sebagian besar wilayah diprakirakan mundur. Masyarakat diimbau menghemat air." }],
  kr2: [{ dari: "Keluarga", jenis: "keluarga", jam: "07.40", teks: "Keran kamar mandi netes terus dari semalam, Pak." }],
  kr3: [{ dari: "Grup RT", jenis: "warga", jam: "12.10", teks: "Mobil tangki air belum bisa datang minggu ini. Yang punya cadangan tolong dihemat." }],
  kr4: [{ dari: "Diteruskan berkali-kali", jenis: "medsos", jam: "15.25", teks: "PEMBAGIAN AIR BERSIH GRATIS!! Kuota terbatas, daftar sekarang, transfer biaya pendaftaran ke rekening panitia!!", hoaks: "Bantuan resmi tidak memungut biaya pendaftaran. Ciri penipuan: meminta transfer, \"kuota terbatas\" agar terburu-buru, dan tidak ada kanal resmi pemerintah." }],
  kr5: [{ dari: "Grup RT", jenis: "warga", jam: "16.00", teks: "Minggu ini kerja bakti bikin biopori di tiap rumah. Bor tanah dipinjami kelurahan." }],
  // ---------- Rob dan gelombang tinggi ----------
  r1: [{ dari: "Info BMKG", jenis: "resmi", jam: "18.30", teks: "Peringatan gelombang tinggi dan banjir pesisir (rob) untuk pesisir di wilayah Anda bertepatan dengan fase bulan purnama. Warga pesisir diimbau waspada." }],
  r2: [{ dari: "Keluarga", jenis: "keluarga", jam: "21.10", teks: "Air sudah masuk teras. Stopkontak di bawah gimana?" }],
  r3: [{ dari: "Grup Warga Pesisir", jenis: "warga", jam: "21.25", teks: "Jalan depan musala sudah selutut. Yang punya lansia ke balai desa sekarang." }],
  r4: [{ dari: "Diteruskan berkali-kali", jenis: "medsos", jam: "22.40", teks: "DARURAT!!! Tanggul pantai JEBOL, air bakal setinggi atap jam 12 malam!! Sebarkan biar semua selamat!!", hoaks: "Tidak ada sumber resmi, memakai angka jam yang menakutkan, huruf kapital dan banyak tanda seru, serta ajakan menyebarkan. Kabar tanggul jebol harus dicek ke perangkat desa atau BPBD." }],
  r5: [{ dari: "Info Desa", jenis: "resmi", jam: "07.30", teks: "Air sudah surut. Warga boleh kembali. Periksa kerusakan rumah dan jaga kebersihan air minum." }],
};

/** Detik untuk memutuskan per langkah: cukup untuk membaca, cukup singkat untuk terasa mendesak. */
export const DETIK_KEPUTUSAN = 25;

/** Keadaan "keselamatan keluarga" 0-100 sesudah tiap jawaban: tepat +15, kurang tepat -5, berbahaya -20. */
export const AWAL_KESELAMATAN = 60;
export function meterKeselamatan(nilai: Array<0 | 1 | 2>): number[] {
  const hasil: number[] = [];
  let m = AWAL_KESELAMATAN;
  for (const n of nilai) {
    m = Math.max(0, Math.min(100, m + (n === 2 ? 15 : n === 1 ? -5 : -20)));
    hasil.push(m);
  }
  return hasil;
}
