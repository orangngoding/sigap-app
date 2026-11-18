"use client";
import { BellRing, ExternalLink } from "lucide-react";
import type { Lokasi, PeringatanResponse } from "@/types";
import { useDataCard, TTL } from "@/hooks/use-data-card";
import { waktuMutlak } from "@/lib/utils/format";
import { DataCard } from "./data-card";
import { useAsistenUi } from "@/stores/asisten-ui-store";

/** Buka panel Asisten dan jelaskan teks peringatan resmi ini dengan bahasa sederhana. */
function TombolJelaskan({ teks }: { teks: string }) {
  const jelaskan = useAsistenUi((s) => s.jelaskan);
  return (
    <button type="button" onClick={() => jelaskan(teks)} className="font-semibold text-primary underline underline-offset-2">
      Jelaskan untuk saya
    </button>
  );
}

const RESMI = "https://www.bmkg.go.id/peringatan-dini";

/** Kalimat takeaway dari kode. Bila umpan tidak terbaca, JANGAN menyatakan "tidak ada peringatan" (Blueprint 6.2). */
export function takeawayPeringatan(d: PeringatanResponse): string {
  if (!d.tersedia) return "Umpan peringatan dini sedang tidak dapat dibaca. Periksa langsung di kanal resmi BMKG.";
  const lokal = d.daftar.filter((x) => x.cakupan === "lokasi").length;
  if (lokal > 0) return `Ada ${lokal} peringatan BMKG yang menyebut wilayah Anda.`;
  if (d.daftar.length > 0) return `Ada ${d.daftar.length} peringatan BMKG di tingkat provinsi. Periksa apakah wilayah Anda disebut.`;
  return "Tidak ada peringatan yang terbaca dari umpan BMKG saat ini. Tetap periksa kanal resmi untuk keadaan terbaru.";
}

/** Simpan teks sementara agar halaman Tanya bisa menjelaskannya; gagal menyimpan tidak mengganggu. */
export function siapkanPenjelasan(teks: string) {
  try {
    sessionStorage.setItem("sigap:v1:prefill-peringatan", teks.slice(0, 2000));
  } catch {
    /* sessionStorage tidak tersedia: pengguna dapat menempel teks sendiri */
  }
}

export function PeringatanCard({ lokasi }: { lokasi: Pick<Lokasi, "adm4" | "provinsi" | "kabKota" | "kecamatan"> }) {
  const qs = new URLSearchParams({ provinsi: lokasi.provinsi, kabKota: lokasi.kabKota, kecamatan: lokasi.kecamatan }).toString();
  const query = useDataCard<PeringatanResponse>("peringatan", lokasi.adm4, `/api/peringatan?${qs}`, TTL.peringatan);
  return (
    <DataCard title="Peringatan Dini" icon={BellRing} query={query} officialUrl={RESMI} minHeight="min-h-40" takeaway={takeawayPeringatan}
      tanya={(d) => (d.daftar[0] ? `Apa arti peringatan dini BMKG "${d.daftar[0].judul}" untuk keluarga saya dan apa yang perlu disiapkan?` : "Apa itu peringatan dini cuaca BMKG dan bagaimana cara memantaunya?")}>
      {(d) => (
        <div className="space-y-3 text-sm">
          {d.daftar.slice(0, 3).map((p) => (
            <article key={p.id} className="rounded-xl border border-border p-3">
              <h3 className="font-semibold">{p.judul}</h3>
              <p className="text-xs text-muted-foreground">
                {p.cakupan === "lokasi" ? "Menyebut wilayah Anda" : "Tingkat provinsi"}
                {p.waktuTerbit ? ` · terbit ${waktuMutlak(p.waktuTerbit)}` : ""}
                {p.berlakuSampai ? ` · berlaku sampai ${waktuMutlak(p.berlakuSampai)}` : ""}
              </p>
              <p className="mt-2">{p.ringkasan}</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <TombolJelaskan teks={p.teks} />
                <a href={p.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary underline underline-offset-2">
                  Teks resmi <ExternalLink className="size-3.5" aria-hidden="true" />
                </a>
              </div>
            </article>
          ))}
          <a href={d.tautanResmi || RESMI} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 font-medium hover:bg-muted">
            Buka peringatan dini BMKG <ExternalLink className="size-4" aria-hidden="true" />
          </a>
        </div>
      )}
    </DataCard>
  );
}
