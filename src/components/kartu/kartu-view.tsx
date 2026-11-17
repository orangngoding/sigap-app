"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { useHydrate } from "@/hooks/use-hydrate";
import { HAZARD_BY_ID } from "@/lib/hazards/hazards";
import { langkahSaat } from "@/lib/rencana/ringkas-saat";
import kontak from "@/generated/kontak.json";
import { useLokasiStore } from "@/stores/lokasi-store";
import { useProfilStore } from "@/stores/profil-store";
import { useRencanaStore } from "@/stores/rencana-store";
import { finalisasiProfil } from "@/lib/preparedness/profil-schema";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "";

/** Kartu Siaga satu halaman, hitam putih, huruf minimal 11 pt (Blueprint 8). Dicetak lewat dialog cetak peramban. */
export function KartuView() {
  const siap = useHydrate(useLokasiStore, useProfilStore, useRencanaStore);
  const lokasi = useLokasiStore((s) => s.lokasi);
  const draft = useProfilStore((s) => s.profil);
  const rencana = useRencanaStore((s) => s.rencana);
  const [ukuran, setUkuran] = useState<"A4" | "A5">("A4");
  const [qr, setQr] = useState<string | null>(null);
  const profil = finalisasiProfil(draft);

  useEffect(() => {
    let batal = false;
    const url = `${SITE_URL || window.location.origin}/darurat`;
    import("qrcode")
      .then((m) => m.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M" }))
      .then((svg) => { if (!batal) setQr(svg); })
      .catch(() => { if (!batal) setQr(null); });
    return () => { batal = true; };
  }, []);

  if (!siap) return <div className="h-64 animate-pulse rounded-2xl bg-muted" aria-busy="true" aria-label="Memuat kartu" />;
  if (!lokasi || !profil || !rencana) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-8 text-center">
        <p className="font-semibold">Kartu Siaga dibuat dari rencana Anda.</p>
        <p className="mt-1 text-sm text-muted-foreground">Pilih lokasi dan isi profil keluarga dulu, lalu buka Rencana Siaga.</p>
        <Link href="/rencana" className="mt-4 inline-flex min-h-12 items-center rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground">Ke Rencana Siaga</Link>
      </div>
    );
  }

  const grup = langkahSaat(rencana.tindakan, profil.bahaya);
  const kecil = ukuran === "A5";

  return (
    <div>
      <style>{`
        @page { size: ${ukuran}; margin: 10mm; }
        @media print {
          header, footer, nav, .tanpa-cetak { display: none !important; }
          body { background: #fff !important; }
          .kartu { border: 0 !important; padding: 0 !important; box-shadow: none !important; }
        }
      `}</style>
      <div className="tanpa-cetak mb-6 flex flex-wrap items-center gap-3">
        <div role="group" aria-label="Ukuran kertas" className="flex gap-2">
          {(["A4", "A5"] as const).map((u) => (
            <button key={u} type="button" aria-pressed={ukuran === u} onClick={() => setUkuran(u)}
              className={`min-h-11 rounded-lg border px-4 text-sm font-semibold ${ukuran === u ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface"}`}>
              {u}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => window.print()} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          <Printer className="size-4" aria-hidden="true" /> Cetak atau simpan PDF
        </button>
        <p className="text-sm text-muted-foreground">Pilih “Simpan sebagai PDF” di dialog cetak bila tidak ada printer.</p>
      </div>

      <article className="kartu rounded-2xl border border-border bg-white p-6 text-black" style={{ fontSize: kecil ? "11pt" : "12pt", lineHeight: 1.35 }}>
        <header className="border-b-2 border-black pb-2">
          <h1 className="text-2xl font-extrabold" style={{ fontSize: kecil ? "16pt" : "20pt" }}>Kartu Siaga Keluarga</h1>
          <p>{lokasi.kelurahan}, Kec. {lokasi.kecamatan}, {lokasi.kabKota}</p>
        </header>

        <section className="mt-3">
          <h2 className="font-bold">Nomor penting</h2>
          <ul className="mt-1 grid grid-cols-2 gap-x-4">
            {kontak.kontak.map((k) => (<li key={k.nomor}><strong>{k.nomor}</strong> {k.nama}</li>))}
          </ul>
          {profil.kontakDarurat.length > 0 && (
            <ul className="mt-1">
              {profil.kontakDarurat.map((k, i) => (<li key={i}><strong>{k.telepon}</strong> {k.nama}</li>))}
            </ul>
          )}
        </section>

        {profil.titikKumpul && (
          <section className="mt-3"><h2 className="font-bold">Titik kumpul keluarga</h2><p>{profil.titikKumpul}</p></section>
        )}

        {grup.map(({ hazard, langkah }) => (
          <section key={hazard} className="mt-3">
            <h2 className="font-bold">Saat {HAZARD_BY_ID[hazard as keyof typeof HAZARD_BY_ID].label}</h2>
            <ol className="ml-5 list-decimal">
              {langkah.map((t) => (<li key={t.actionId}>{t.title}</li>))}
            </ol>
          </section>
        ))}

        <footer className="mt-4 flex items-end justify-between gap-4 border-t-2 border-black pt-2">
          <p style={{ maxWidth: "70%" }}>Pindai untuk Mode Darurat (bisa dibuka tanpa internet setelah pernah dibuka). Panduan ini bukan pengganti arahan BNPB, BPBD, dan BMKG.</p>
          {qr ? <div aria-label="Kode QR ke halaman Mode Darurat" style={{ width: "28mm", height: "28mm" }} dangerouslySetInnerHTML={{ __html: qr }} /> : <p><strong>{(SITE_URL || "").replace(/^https?:\/\//, "")}/darurat</strong></p>}
        </footer>
      </article>
    </div>
  );
}
