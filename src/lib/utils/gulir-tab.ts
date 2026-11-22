/**
 * Dipanggil saat tab berganti di halaman yang bilah tabnya menempel (sticky): bila pengguna sudah menggulir melewati
 * awal isi tab, halaman langsung kembali ke awal isi tab baru (tepat di bawah header dan bilah tab). Tanpa ini, tab
 * baru yang lebih pendek membuat browser menahan posisi gulir di dasar halaman, sehingga yang terlihat justru footer.
 *
 * `jangkar` adalah elemen biasa (tidak menempel) tepat di atas bilah tab, dengan scroll-margin-top setinggi header.
 * Bilah tab sendiri tidak bisa dipakai sebagai patokan: saat menempel, posisinya selalu sama di layar.
 * Posisi dihitung sendiri (bukan scrollIntoView), karena scrollIntoView ikut menambahkan scroll-padding-top milik
 * <html> (7,5rem di halaman berbilah lengket, untuk tautan jangkar) sehingga bilah tab berhenti terlalu rendah.
 * Lompatan instan (bukan halus): animasi gulir bisa terpotong saat tinggi halaman berubah karena isi tab berganti.
 */
export function gulirKeAwalTab(jangkar: HTMLElement | null) {
  if (!jangkar) return;
  const batas = parseFloat(getComputedStyle(jangkar).scrollMarginTop) || 0;
  const atas = jangkar.getBoundingClientRect().top;
  if (atas < batas) window.scrollTo({ top: window.scrollY + atas - batas, behavior: "instant" });
}
