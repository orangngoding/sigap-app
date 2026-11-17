import type { Metadata } from "next";
import { DisclaimerBox } from "@/components/global/disclaimer-box";
import { HAZARDS } from "@/lib/hazards/hazards";
import { isHazardAktif } from "@/lib/hazards/pack-status";
import { KANAL_DIVERIFIKASI } from "@/lib/hazards/kanal";
import { SEMUA_CHUNK } from "@/lib/kb/data";
import { MIN_POTONGAN } from "@/lib/kb/schema";
import { ASUMSI, BOBOT_PRIORITAS, TINGKAT_SKOR } from "@/lib/preparedness/constants";
import { BOBOT_KELOMPOK } from "@/lib/preparedness/tas";
import { AMBANG_HARI_KERING_MM, AMBANG_HUJAN_LEBAT_MM } from "@/lib/data/iklim";
import kontak from "@/generated/kontak.json";

export const metadata: Metadata = {
  title: "Metodologi",
  description: "Dari mana data SIGAP berasal, bagaimana rencana dan skor dihitung, apa peran AI, privasi, atribusi, dan batasan yang perlu Anda ketahui.",
};

const URL_MASUKAN = "https://github.com/orangngoding/sigap-app/issues";

// Ringkasan KB dihitung dari isi KB sendiri agar halaman ini tidak pernah berbeda dari data sebenarnya.
const PER_BAHAYA = [{ id: "umum", label: "Umum (semua bahaya)" }, ...HAZARDS.map((h) => ({ id: h.id, label: h.label }))].map((h) => {
  const milik = SEMUA_CHUNK.filter((c) => c.hazard === h.id);
  const fase = (p: string) => milik.filter((c) => c.phase === p).length;
  return { ...h, total: milik.length, sebelum: fase("sebelum"), saat: fase("saat"), sesudah: fase("sesudah"), turunan: milik.filter((c) => c.turunan).length };
});
const PENERBIT = Array.from(new Set(SEMUA_CHUNK.map((c) => c.sourceTitle.replace(/,?\s*hlm\..*$/, "").trim()))).sort();
const AKSES_TERBARU = SEMUA_CHUNK.map((c) => c.accessedAt).sort().at(-1);
const JUMLAH_TURUNAN = SEMUA_CHUNK.filter((c) => c.turunan).length;

const H2 = "text-xl font-bold";
const P = "mt-2 leading-relaxed";
const TABEL = "mt-3 w-full min-w-[32rem] border-collapse text-sm";
const TH = "border-b border-border px-2 py-2 text-left font-semibold";
const TD = "border-b border-border px-2 py-2 align-top";

function Tabel({ kepala, baris }: { kepala: string[]; baris: Array<Array<string | number>> }) {
  return (
    <div className="overflow-x-auto">
      <table className={TABEL}>
        <thead><tr>{kepala.map((k) => <th key={k} scope="col" className={TH}>{k}</th>)}</tr></thead>
        <tbody>{baris.map((b, i) => <tr key={i}>{b.map((s, j) => <td key={j} className={TD}>{s}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

export default function MetodologiPage() {
  return (
    <main id="konten" tabIndex={-1} className="flex-1 focus:outline-none">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Metodologi</h1>
        <p className="mt-2 text-muted-foreground">Cara SIGAP bekerja, dijelaskan apa adanya.</p>

        <nav aria-label="Isi halaman" className="tanpa-cetak mt-6 rounded-2xl border border-border bg-surface p-4 text-sm">
          <ol className="grid list-decimal gap-1 pl-5 sm:grid-cols-2">
            {["Apa itu SIGAP dan batasannya", "Sumber data", "Panduan kesiapsiagaan", "Peran AI dan pagar pengaman", "Rumus skor dan Tas Siaga", "Privasi", "Atribusi", "Pemakaian AI dalam pengembangan", "Versi konten", "Cara memberi masukan"].map((j, i) => (
              <li key={j}><a href={`#m${i + 1}`} className="underline-offset-2 hover:underline">{j}</a></li>
            ))}
          </ol>
        </nav>

        <section id="m1" className="mt-10">
          <h2 className={H2}>1. Apa itu SIGAP dan batasannya</h2>
          <p className={P}>SIGAP membantu keluarga menyusun rencana kesiapsiagaan untuk sembilan jenis bencana dari data resmi dan jawaban mereka sendiri, lalu mengubahnya menjadi checklist, skor, Kartu Siaga cetak, dan Mode Darurat yang bisa dibuka tanpa internet.</p>
          <p className={P}>SIGAP bukan sistem peringatan dini, tidak memprediksi bencana, tidak menentukan lokasi evakuasi, dan bukan sumber saran medis. Rencana bersifat umum dan tidak menggantikan arahan BPBD, BMKG, atau petugas berwenang. Dalam keadaan darurat, hubungi 112.</p>
        </section>

        <section id="m2" className="mt-10">
          <h2 className={H2}>2. Sumber data</h2>
          <Tabel
            kepala={["Data", "Sumber", "Pembaruan di SIGAP"]}
            baris={[
              ["Prakiraan cuaca per kelurahan", "BMKG", "Disimpan sementara 10 menit"],
              ["Gempa terbaru, M5+, dan dirasakan", "BMKG", "Disimpan sementara 2 menit"],
              ["Peringatan dini cuaca", "BMKG (RSS dan CAP)", "Disimpan sementara 2 menit"],
              ["Tren hujan lebat dan hari kering", "Open-Meteo, model ERA5 (CC BY 4.0)", "Disimpan sementara 7 hari"],
              ["Kode dan nama wilayah", "Kepmendagri No 300.2.2-2138 Tahun 2025, lewat dataset cahyadsn/wilayah (MIT)", "Tetap, dikemas di aplikasi"],
              ["Peta", "OpenStreetMap", "Langsung dari server ubin OSM"],
            ]}
          />
          <p className={P}>Bila sumber tidak dapat dibaca, kartu menampilkan data lama yang tersimpan di perangkat Anda dengan penanda jelas, atau mengarahkan Anda ke kanal resmi. SIGAP tidak pernah menyatakan &ldquo;tidak ada peringatan&rdquo; ketika umpan resmi tidak terbaca.</p>
          <p className={P}>Dataset wilayah hanya memuat koordinat pusat kabupaten/kota, jadi titik peta dan jarak gempa adalah perkiraan, bukan letak persis kelurahan. Pencocokan peringatan memakai nama kecamatan dan kabupaten/kota; peringatan tingkat provinsi tidak berarti wilayah Anda pasti terdampak.</p>
        </section>

        <section id="m3" className="mt-10">
          <h2 className={H2}>3. Panduan kesiapsiagaan</h2>
          <p className={P}>Setiap langkah dalam rencana berasal dari basis pengetahuan berisi {SEMUA_CHUNK.length} potongan panduan pendek, masing-masing dengan sumber, halaman, dan tanggal akses. Sebuah bahaya dibuka untuk umum setelah jumlah potongannya memenuhi minimum.</p>
          <Tabel
            kepala={["Bahaya", "Sebelum", "Saat", "Sesudah", "Total (minimum)", "Status"]}
            baris={PER_BAHAYA.map((h) => [h.label, h.sebelum, h.saat, h.sesudah, `${h.total} (${MIN_POTONGAN[h.id]})`, h.id === "umum" || isHazardAktif(h.id as Parameters<typeof isHazardAktif>[0]) ? "Aktif" : "Segera hadir"])}
          />
          <p className={P}>Potongan disusun dengan bantuan AI dari sumber resmi, dengan kalimat sendiri (parafrase), lalu halaman yang dikutip dicocokkan ke dokumen aslinya. Potongan ini belum melalui tinjauan terpisah oleh ahli, jadi periksa sumbernya bila ragu.</p>
          <p className={P}>{JUMLAH_TURUNAN} langkah ditandai <strong>turunan</strong>: tidak ada panduan resmi khusus untuk bahaya itu (misalnya langkah saat dan sesudah gelombang tinggi atau banjir rob), sehingga langkahnya diambil dari panduan banjir umum. Label ini selalu tampil di Rencana dan Mode Darurat.</p>
          <details className="mt-3 rounded-lg border border-border p-3 text-sm">
            <summary className="cursor-pointer font-semibold">Daftar dokumen sumber ({PENERBIT.length})</summary>
            <ul className="mt-2 list-disc space-y-1 pl-5">{PENERBIT.map((s) => <li key={s}>{s}</li>)}</ul>
          </details>
        </section>

        <section id="m4" className="mt-10">
          <h2 className={H2}>4. Peran AI dan pagar pengaman</h2>
          <p className={P}>AI hanya meringkas dan menyusun ulang potongan panduan yang sudah bersumber, serta menyederhanakan teks peringatan resmi. AI tidak menambah fakta, tidak memprediksi bencana, dan tidak memberi saran medis.</p>
          <p className={P}>Setiap keluaran AI diperiksa kode: sumber yang tidak dikenal dibuang, kalimat berupa prediksi atau jaminan (misalnya &ldquo;pasti aman&rdquo;) ditolak, dan angka baru pada penjelasan peringatan ditolak. Kutipan persis dari teks resmi BMKG tetap boleh. Teks dari pengguna dan dari BMKG diperlakukan sebagai data, bukan perintah. Bila AI gagal atau kuota harian habis, rencana disusun otomatis dari panduan yang sama tanpa AI, dan hal ini diberi label.</p>
          <p className={P}>Angka perlengkapan, skor, faktor yang perlu diperhatikan, dan rekomendasi bacaan dihitung oleh kode, bukan AI.</p>
        </section>

        <section id="m5" className="mt-10">
          <h2 className={H2}>5. Rumus skor dan Tas Siaga</h2>
          <p className={P}>Skor kesiapan = bulatkan(100 &times; jumlah bobot butir yang dicentang &divide; jumlah bobot semua butir). Butir yang dihitung adalah tindakan Sebelum, tindakan Saat (dicentang bila sudah dipahami), dan item Tas Siaga. Panduan Sesudah tidak dihitung karena belum bisa dilakukan sebelum kejadian.</p>
          <Tabel
            kepala={["Butir", "Bobot"]}
            baris={[
              ["Tindakan prioritas tinggi / sedang / rendah", `${BOBOT_PRIORITAS.tinggi} / ${BOBOT_PRIORITAS.sedang} / ${BOBOT_PRIORITAS.rendah}`],
              ...Object.entries(BOBOT_KELOMPOK).map(([k, v]) => [`Tas Siaga: ${k}`, v]),
            ]}
          />
          <p className={P}>Tingkat: {TINGKAT_SKOR.map((t, i) => `${t.min}${i < TINGKAT_SKOR.length - 1 ? `-${TINGKAT_SKOR[i + 1].min - 1}` : "-100"} ${t.label}`).join(", ")}.</p>
          <p className={P}>Jumlah perlengkapan dihitung dari jumlah anggota keluarga dan lama persediaan (3, 5, atau 7 hari), lalu dibulatkan ke atas. Asumsi per orang per hari: air minum {ASUMSI.airLiterPerOrangHari} liter, makanan {ASUMSI.porsiPerOrangHari} porsi, popok {ASUMSI.popokPerBalitaHari} buah per balita; masker {ASUMSI.maskerPerOrang} buah per orang; pakaian ganti {ASUMSI.pakaianSetPerOrang} set per orang; obat rutin minimal {ASUMSI.minHariObatRutin} hari. Angka ini adalah asumsi awal penyusun dan belum dicocokkan dengan panduan resmi BNPB, PMI, atau Kemenkes. Panduan Keluarga BNPB (2018) misalnya menyebut air minum minimal 2 liter per orang per hari, jadi angka SIGAP lebih longgar. SIGAP tidak pernah menyebut jenis atau dosis obat.</p>
          <p className={P}>Banner &ldquo;Perhatikan hari ini&rdquo; muncul bila prakiraan BMKG 48 jam ke depan memuat hujan lebat atau petir, atau bila ada gempa M5,0 ke atas dalam 24 jam terakhir dalam radius 300 km dari lokasi Anda. Grafik tren iklim menghitung hari hujan lebat sebagai hari dengan curah hujan di atas {AMBANG_HUJAN_LEBAT_MM} mm, dan hari kering sebagai hari di bawah {AMBANG_HARI_KERING_MM} mm. Semua ambang ini bisa diubah tim dan tidak berarti bencana akan terjadi.</p>
        </section>

        <section id="m6" className="mt-10">
          <h2 className={H2}>6. Privasi</h2>
          <p className={P}>Tidak ada akun, tidak ada cookie pelacak, dan tidak ada analitik pihak ketiga.</p>
          <Tabel
            kepala={["Data", "Disimpan di", "Dikirim ke server SIGAP", "Dikirim ke penyedia AI"]}
            baris={[
              ["Lokasi (kelurahan, koordinat pusat wilayah)", "Perangkat", "Ya, untuk mengambil data cuaca, gempa, iklim", "Nama wilayah saja"],
              ["Profil tanpa identitas (jumlah anggota, kategori, bangunan, bahaya)", "Perangkat", "Ya, untuk menyusun rencana", "Ya"],
              ["Titik kumpul, kontak darurat, catatan khusus", "Perangkat", "Tidak", "Tidak"],
              ["Rencana, centang, pengaturan kartu", "Perangkat", "Tidak", "Tidak"],
              ["Pertanyaan Tanya Jawab", "Perangkat (riwayat)", "Ya, diproses sementara", "Ya"],
              ["Teks peringatan yang ditempel", "Tidak disimpan", "Ya, diproses sementara", "Ya"],
            ]}
          />
          <p className={P}>Koordinat dari &ldquo;Gunakan lokasi saya&rdquo; hanya dipakai sekali untuk menebak kabupaten/kota terdekat dan tidak disimpan. Log server hanya mencatat rute, status, durasi, dan kode galat, tanpa isi permintaan. Alamat IP hanya dipakai di memori untuk pembatasan laju. Anda bisa mengekspor dan menghapus semua data di halaman Data Saya.</p>
        </section>

        <section id="m7" className="mt-10">
          <h2 className={H2}>7. Atribusi</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 leading-relaxed">
            <li>Data cuaca, gempa, dan peringatan dini: Badan Meteorologi, Klimatologi, dan Geofisika (BMKG).</li>
            <li>Data iklim historis: Open-Meteo, lisensi CC BY 4.0.</li>
            <li>Peta: &copy; kontributor OpenStreetMap (ODbL), ditampilkan dengan Leaflet (BSD-2-Clause) dan react-leaflet (Hippocratic-2.1).</li>
            <li>Kode wilayah: dataset cahyadsn/wilayah (MIT), berdasarkan Kepmendagri No 300.2.2-2138 Tahun 2025.</li>
            <li>Panduan: BNPB, BAKORNAS PB, Kemenkes, BMKG, dan Kementerian ESDM (daftar lengkap di bagian 3).</li>
            <li>Perangkat lunak terbuka: Next.js, React, Tailwind CSS, Zustand, TanStack Query, Zod, Recharts, Lucide, dan qrcode. Daftar dan versinya ada di berkas docs/attribution.md di repositori.</li>
          </ul>
        </section>

        <section id="m8" className="mt-10">
          <h2 className={H2}>8. Pemakaian AI dalam pengembangan</h2>
          <p className={P}>Di dalam aplikasi, AI (Google Gemini) dipakai sebagai komponen fungsional untuk Rencana Siaga, Jelaskan Peringatan, dan Tanya Jawab, dengan instruksi sistem, skema keluaran, dan penyaring buatan tim.</p>
          <p className={P}>Selama pengembangan, tim memakai asisten AI pemrograman untuk menulis dan memeriksa kode, menyusun draf potongan panduan dari dokumen resmi, serta mencocokkan halaman sumber. Keputusan produk dan arsitektur diambil tim.</p>
        </section>

        <section id="m9" className="mt-10">
          <h2 className={H2}>9. Versi konten</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 leading-relaxed">
            <li>Basis pengetahuan: {SEMUA_CHUNK.length} potongan, sumber terakhir diakses {AKSES_TERBARU}.</li>
            <li>Daftar nomor darurat: diperbarui {kontak.diperbarui}{kontak.perluVerifikasi ? ", masih menunggu verifikasi ke situs resmi tiap lembaga" : ""}.</li>
            <li>Tautan kanal resmi per bahaya: diperiksa {KANAL_DIVERIFIKASI}.</li>
          </ul>
        </section>

        <section id="m10" className="mt-10">
          <h2 className={H2}>10. Cara memberi masukan</h2>
          <p className={P}>
            Menemukan langkah yang keliru, sumber yang tidak sesuai, atau masalah tampilan? Laporkan lewat{" "}
            <a href={URL_MASUKAN} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline-offset-2 hover:underline">GitHub Issues di repositori SIGAP</a>.
            Sertakan nama halaman dan, bila ada, nama bahaya atau langkah yang dimaksud. Jangan menulis data pribadi di laporan.
          </p>
        </section>

        <div className="mt-10"><DisclaimerBox /></div>
      </div>
    </main>
  );
}
