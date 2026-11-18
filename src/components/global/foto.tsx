import Image from "next/image";
import type { Foto as DataFoto } from "@/lib/gambar";

/**
 * Foto dalam bingkai yang mengisi wadahnya (object-cover). `zoom`: membesar halus saat kartu induk
 * (`.group`) disorot. Ukuran responsif dan WebP/AVIF dibuat next/image dari berkas di public/img.
 */
export function Foto({
  foto, sizes, className = "", zoom = false, prioritas = false, posisi = "center", hias = false, latar = false,
}: {
  foto: DataFoto;
  sizes: string;
  className?: string;
  zoom?: boolean;
  prioritas?: boolean;
  posisi?: string;
  /** true bila foto hanya hiasan (teks di sekitarnya sudah menjelaskan): alt kosong. */
  hias?: boolean;
  /** true: mengisi induk yang `relative` sebagai latar (absolute inset-0). */
  latar?: boolean;
}) {
  return (
    <div className={`${latar ? "absolute inset-0" : "relative"} overflow-hidden bg-muted ${zoom ? "foto-zoom" : ""} ${className}`}>
      <Image
        src={foto.src}
        alt={hias ? "" : foto.alt}
        fill
        sizes={sizes}
        loading={prioritas ? "eager" : "lazy"}
        fetchPriority={prioritas ? "high" : "auto"}
        className="object-cover"
        style={{ objectPosition: posisi }}
      />
    </div>
  );
}
