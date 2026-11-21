"use client";
// Sebutan pihak: saat yang dibuka keluarga lain (mis. warga yang didata RT), "wilayah Anda" / "rumah Anda" /
// "keluarga Anda" menjadi nama keluarga itu di seluruh fitur, agar jelas data siapa yang sedang dilihat.
import { Children, Fragment, cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { gantiAnda } from "@/lib/keluarga/keluarga";
import { useKeluarga } from "@/hooks/use-keluarga";

export function usePihak(): { lain: boolean; nama: string | null; s: (teks: string) => string } {
  const { siap, aktif } = useKeluarga();
  const nama = siap && aktif && !aktif.milikSaya ? aktif.nama : null;
  return { lain: nama !== null, nama, s: (teks: string) => gantiAnda(teks, nama) };
}

/** Ubah string di dalam node; fragmen ditelusuri (mis. judul `<>... rumah Anda <A>7 hari</A></>`), elemen lain dibiarkan. */
function ubahNode(node: ReactNode, s: (t: string) => string): ReactNode {
  if (typeof node === "string") return s(node);
  if (isValidElement(node) && node.type === Fragment) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    return cloneElement(el, undefined, ...Children.toArray(el.props.children).map((c) => ubahNode(c, s)));
  }
  return node;
}

/** Bungkus teks JSX yang menyebut data keluarga ("wilayah Anda", "rumah Anda", ...). */
export function TeksPihak({ children }: { children: ReactNode }) {
  const { s } = usePihak();
  return <>{Children.map(children, (c) => ubahNode(c, s))}</>;
}
