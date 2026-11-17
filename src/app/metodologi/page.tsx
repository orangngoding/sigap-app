import type { Metadata } from "next";
import { DisclaimerBox } from "@/components/global/disclaimer-box";

export const metadata: Metadata = {
  title: "Metodologi",
  description: "Dari mana data SIGAP berasal, bagaimana rencana disusun, apa peran AI, dan batasan yang perlu Anda ketahui.",
};

const BAGIAN: Array<{ judul: string; isi: string[] }> = [
  {
    judul: "Sumber data",
    isi: [
      "Prakiraan cuaca, gempa bumi terkini, dan peringatan dini diambil dari BMKG. Data iklim historis diambil dari Open-Meteo. Setiap kartu menampilkan sumber dan waktu pengambilan data.",
      "Bila sumber tidak dapat dibaca, kartu menampilkan data lama yang tersimpan di perangkat Anda dengan penanda jelas, atau mengarahkan Anda ke kanal resmi. SIGAP tidak pernah menyatakan \"tidak ada peringatan\" ketika umpan resmi tidak terbaca.",
    ],
  },
  {
    judul: "Panduan kesiapsiagaan",
    isi: [
      "Setiap langkah dalam rencana berasal dari basis pengetahuan berisi potongan panduan pendek dengan sumber, halaman, dan tanggal akses. Sumber utama adalah BNPB dan BMKG.",
      "Sebuah bahaya baru dibuka untuk umum setelah jumlah potongan panduannya memenuhi minimum dan setiap potongan ditinjau oleh dua orang.",
    ],
  },
  {
    judul: "Peran AI",
    isi: [
      "AI hanya meringkas dan menyusun ulang potongan panduan yang sudah bersumber, serta menyederhanakan teks peringatan resmi. AI tidak menambah fakta, tidak memprediksi bencana, dan tidak memberi saran medis.",
      "Setiap keluaran AI diperiksa kode: sumber yang tidak dikenal dibuang, kata yang berupa prediksi atau jaminan ditolak, dan angka baru pada penjelasan peringatan ditolak. Bila AI gagal atau kuota harian habis, rencana disusun otomatis dari panduan yang sama tanpa AI, dan hal ini diberi label.",
      "Skor kesiapan dan rekomendasi bacaan dihitung oleh kode, bukan AI.",
    ],
  },
  {
    judul: "Privasi",
    isi: [
      "Lokasi, profil keluarga, rencana, dan progres Anda disimpan di perangkat ini saja. Tidak ada akun dan tidak ada pelacakan iklan.",
      "Saat menyusun rencana, yang dikirim ke server hanya nama wilayah dan ringkasan profil tanpa nama, nomor telepon, atau kontak darurat. Anda bisa melihat dan menghapus semua data di halaman Data Saya.",
    ],
  },
  {
    judul: "Batasan",
    isi: [
      "SIGAP bukan sistem peringatan dini dan tidak memprediksi bencana. Rencana bersifat umum dan tidak menggantikan arahan BPBD, BMKG, atau petugas berwenang. SIGAP tidak menentukan lokasi evakuasi.",
      "Pencocokan peringatan ke wilayah Anda memakai nama kecamatan dan kabupaten/kota; peringatan tingkat provinsi tidak berarti wilayah Anda terdampak.",
    ],
  },
];

export default function MetodologiPage() {
  return (
    <main id="konten" tabIndex={-1} className="flex-1 focus:outline-none">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Metodologi</h1>
        <p className="mt-2 text-muted-foreground">Cara SIGAP bekerja, dijelaskan apa adanya.</p>
        {BAGIAN.map((b) => (
          <section key={b.judul} className="mt-8">
            <h2 className="text-xl font-bold">{b.judul}</h2>
            {b.isi.map((p) => <p key={p} className="mt-2 leading-relaxed">{p}</p>)}
          </section>
        ))}
        <div className="mt-8"><DisclaimerBox /></div>
      </div>
    </main>
  );
}
