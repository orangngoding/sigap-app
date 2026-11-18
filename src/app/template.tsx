/** Setiap navigasi: isi halaman baru masuk halus (CSS; dimatikan oleh "kurangi gerakan"). */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="halaman-masuk flex flex-1 flex-col">{children}</div>;
}
