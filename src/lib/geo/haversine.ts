const R_KM = 6371;
const rad = (d: number) => (d * Math.PI) / 180;

/** Jarak lingkaran-besar dalam km. */
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.sqrt(a));
}

/** Dibulatkan ke 10 km terdekat (Blueprint 6.3). */
export function jarakBulat10(km: number): number {
  return Math.round(km / 10) * 10;
}
