// Kartu Siaga sebagai PDF yang dibuat di peramban (Blueprint 8.1). Teks asli, bukan gambar (16.6),
// hitam putih, tepi 12 mm, huruf minimal 10 pt (A5) atau 11 pt (A4), selalu satu halaman: isi yang
// berlebih dipangkas dari bawah dan diberi tanda, tidak dipecah ke halaman kedua.
// jsPDF dan qrcode dimuat malas hanya saat pengguna menekan Unduh PDF.

export interface IsiKartuPdf {
  ukuran: "A4" | "A5";
  namaKeluarga: string;
  dibuat: string; // tanggal sudah diformat
  lokasi: string;
  bahaya: string[];
  /** Fakta risiko tinggi di lokasi (Profil Risiko Lokasi), maksimal 3 baris. */
  faktaRisiko?: string[];
  kontakNasional: Array<{ nomor: string; nama: string }>;
  kontakKeluarga: Array<{ nama: string; telepon: string }>;
  titikKumpul: string;
  langkah: Array<{ bahaya: string; langkah: string[] }>;
  tas: string[];
  catatan?: string;
  urlDarurat: string;
}

export const namaBerkasKartu = (kelurahan: string) =>
  `Kartu-Siaga-${kelurahan.trim().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "") || "Keluarga"}.pdf`;

const GARIS = "________________";

/** Hasil PDF beserta tanda apakah ada isi yang dipangkas agar muat satu halaman. */
export interface HasilPdfKartu {
  blob: Blob;
  terpangkas: boolean;
}

export async function buatPdfKartu(isi: IsiKartuPdf): Promise<HasilPdfKartu> {
  const [{ jsPDF }, QR] = await Promise.all([import("jspdf"), import("qrcode")]);
  const doc = new jsPDF({ unit: "mm", format: isi.ukuran.toLowerCase(), orientation: "portrait" });
  const kecil = isi.ukuran === "A5";
  const pt = kecil ? 10 : 11;
  const tepi = 12;
  const lebar = doc.internal.pageSize.getWidth() - 2 * tepi;
  const tinggi = doc.internal.pageSize.getHeight();
  const qrMm = kecil ? 20 : 24;
  const batasBawah = tinggi - tepi - qrMm - 4; // ruang kaki (QR dan penafian) selalu tersedia
  const baris = (p: number) => p * 0.3528 * 1.18; // tinggi baris dalam mm
  let y = tepi;
  let terpangkas = false;

  const tulis = (teks: string, opsi: { ukuran?: number; tebal?: boolean; indent?: number } = {}) => {
    const u = opsi.ukuran ?? pt;
    doc.setFont("helvetica", opsi.tebal ? "bold" : "normal");
    doc.setFontSize(u);
    const potong = doc.splitTextToSize(teks, lebar - (opsi.indent ?? 0)) as string[];
    for (const b of potong) {
      if (y + baris(u) > batasBawah) {
        terpangkas = true;
        return false;
      }
      y += baris(u);
      doc.text(b, tepi + (opsi.indent ?? 0), y);
    }
    return true;
  };
  const judulBagian = (t: string) => {
    y += 1;
    return tulis(t, { tebal: true });
  };
  /** Dua kolom untuk daftar pendek (isi tas, kontak) agar kartu tetap satu halaman. */
  const duaKolom = (daftar: string[]) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(pt);
    const lk = (lebar - 4) / 2;
    for (let i = 0; i < daftar.length; i += 2) {
      const kiri = doc.splitTextToSize(daftar[i], lk) as string[];
      const kanan = daftar[i + 1] ? (doc.splitTextToSize(daftar[i + 1], lk) as string[]) : [];
      const n = Math.max(kiri.length, kanan.length);
      if (y + n * baris(pt) > batasBawah) {
        terpangkas = true;
        return false;
      }
      for (let k = 0; k < n; k++) {
        y += baris(pt);
        if (kiri[k]) doc.text(kiri[k], tepi, y);
        if (kanan[k]) doc.text(kanan[k], tepi + lk + 4, y);
      }
    }
    return true;
  };

  tulis("KARTU SIAGA KELUARGA", { ukuran: kecil ? 15 : 18, tebal: true });
  if (isi.namaKeluarga.trim()) tulis(isi.namaKeluarga.trim(), { tebal: true });
  tulis(isi.lokasi);
  tulis(`Dibuat: ${isi.dibuat}`);
  doc.setLineWidth(0.6);
  doc.line(tepi, y + 1.5, tepi + lebar, y + 1.5);
  y += 2;

  judulBagian("Bahaya yang disiapkan");
  tulis(isi.bahaya.join(", "));
  for (const f of (isi.faktaRisiko ?? []).slice(0, 3)) tulis(`- ${f}`);

  judulBagian("Nomor darurat nasional");
  duaKolom(isi.kontakNasional.map((k) => `${k.nomor}  ${k.nama}`));

  judulBagian("Kontak keluarga dan BPBD");
  duaKolom([...isi.kontakKeluarga.map((k) => `${k.telepon}  ${k.nama}`), `BPBD setempat: ${GARIS}`]);

  judulBagian("Titik kumpul dan jalur keluar");
  tulis(`Titik kumpul: ${isi.titikKumpul.trim() || GARIS}`);
  tulis(`Jalur keluar: ${GARIS}`);

  if (isi.langkah.length > 0 && judulBagian("Tindakan kunci saat kejadian")) {
    // Satu paragraf per bahaya: "Banjir: 1) ... 2) ..." agar hemat baris tanpa mengecilkan huruf.
    for (const g of isi.langkah) if (!tulis(`${g.bahaya}: ${g.langkah.map((l, i) => `${i + 1}) ${l}`).join("  ")}`)) break;
  }

  if (judulBagian("Isi tas siaga (ringkas)")) duaKolom(isi.tas.map((t) => `- ${t}`));

  if (isi.catatan?.trim() && judulBagian("Catatan khusus")) tulis(isi.catatan.trim());

  if (terpangkas) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(pt);
    doc.text("(Sebagian isi dipangkas agar muat satu halaman.)", tepi, batasBawah + 1);
  }

  // Kaki: garis, penafian, dan QR ke Mode Darurat.
  const yKaki = tinggi - tepi - qrMm;
  doc.setLineWidth(0.6);
  doc.line(tepi, yKaki - 2, tepi + lebar, yKaki - 2);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(pt);
  const penafian = doc.splitTextToSize(
    "Dibuat dengan SIGAP. Pindai kode QR atau buka alamat di bawah untuk Mode Darurat (bisa tanpa internet setelah pernah dibuka). Bukan pengganti arahan BPBD, BMKG, atau petugas berwenang.",
    lebar - qrMm - 4,
  ) as string[];
  doc.text(penafian, tepi, yKaki + baris(pt));
  // Alamat tertulis: tetap bisa diketik bila kamera tidak bisa memindai; di PDF juga dapat diklik.
  doc.setFont("helvetica", "bold");
  doc.textWithLink(isi.urlDarurat.replace(/^https?:\/\//, ""), tepi, yKaki + baris(pt) * (penafian.length + 1) + 0.5, { url: isi.urlDarurat });
  const qr = await QR.toDataURL(isi.urlDarurat, { margin: 0, errorCorrectionLevel: "M", width: 300 });
  doc.addImage(qr, "PNG", tepi + lebar - qrMm, yKaki, qrMm, qrMm);

  doc.setProperties({ title: "Kartu Siaga Keluarga", subject: isi.lokasi, creator: "SIGAP" });
  return { blob: doc.output("blob"), terpangkas };
}
