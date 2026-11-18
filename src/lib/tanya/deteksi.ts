export const MAKS_PERINGATAN = 2000;

/** Penanda khas teks peringatan resmi (BMKG nowcast, CAP, status gunung api). */
const PENANDA = [
  /\bperingatan dini\b/i,
  /\bbmkg\b/i,
  /\b(ber)?potensi\b/i,
  /\bnowcast\b/i,
  /\bstatus (gunung|level)\b/i,
  /\b(pkl|pukul)\s*\d{1,2}[.:]\d{2}\b/i,
  /\b(wib|wita|wit)\b/i,
  /\b(berlaku|hingga|sampai) (pukul|pkl|tanggal|tgl)\b/i,
  /\b(kab\.|kec\.|kabupaten|kecamatan)\s/i,
];

/**
 * Teks panjang yang tampak seperti peringatan resmi (mis. tempelan dari BMKG) dijelaskan, bukan dijawab sebagai
 * pertanyaan. Perlu minimal dua penanda berbeda; teks yang diakhiri tanda tanya selalu dianggap pertanyaan.
 */
export function tampakPeringatan(t: string): boolean {
  const s = t.trim();
  if (s.length < 120 || /\?\s*$/.test(s)) return false;
  return PENANDA.filter((p) => p.test(s)).length >= 2;
}
