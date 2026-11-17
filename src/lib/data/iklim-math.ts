// Fungsi murni tanpa impor server — aman dipakai di klien maupun server.

/** Bulatkan koordinat ke grid 0,25° (resolusi ERA5) — dipakai sebagai kunci cache dan permintaan. */
export function snapGrid(v: number): number {
  return Math.round(v / 0.25) * 0.25;
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
