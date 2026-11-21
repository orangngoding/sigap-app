// Fungsi murni tanpa impor server — aman dipakai di klien maupun server.

/** Bulatkan koordinat ke grid 0,25° (resolusi ERA5) — dipakai sebagai kunci cache dan permintaan. */
export function snapGrid(v: number): number {
  return Math.round(v / 0.25) * 0.25;
}

/**
 * Grid kasar 0,5° untuk proyeksi iklim. Model iklim beresolusi 25-50 km, jadi hasil dua lokasi yang berdekatan
 * praktis sama; membulatkan lebih kasar membuat lokasi berdekatan berbagi satu permintaan (dan satu cache) ke penyedia
 * data yang kuota gratisnya kecil, dan membuat daftar kota bawaan lebih sering terpakai.
 */
export function snapKasar(v: number): number {
  return Math.round(v / 0.5) * 0.5;
}

/**
 * Grid proyeksi model iklim 0,25°, sesuai resolusi model HighResMIP (sekitar 25 km). Grid 0,5° terlalu kasar untuk
 * wilayah berbukit atau pesisir: Kota Yogyakarta jatuh ke sel pantai selatan Gunungkidul yang jauh lebih kering, sehingga
 * kemarau tahun terburuk tampil 129 hari padahal sel terdekatnya sekitar 45-55 hari (sejalan dengan pengamatan).
 */
export function snapProyeksi(v: number): number {
  return snapGrid(v);
}

/** Regresi linear sederhana; mengembalikan kemiringan per satuan x. */
export function slope(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 2) return 0;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  return den === 0 ? 0 : num / den;
}
