import Link from "next/link";
import { ArrowRight, MapPin, Pencil } from "lucide-react";
import type { Lokasi } from "@/types";
import type { LangkahWizard, ProfilDraft } from "@/types/rencana";
import { HAZARD_BY_ID } from "@/lib/hazards/hazards";
import { OPSI_BANGUNAN } from "./langkah-rumah";

function Ubah({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-primary hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
      <Pencil className="size-4" aria-hidden="true" /> Ubah<span className="sr-only"> {label}</span>
    </button>
  );
}

function Blok({ judul, ubah, children }: { judul: string; ubah: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-bold text-foreground">{judul}</h3>
        {ubah}
      </div>
      <div className="mt-2 text-sm text-foreground">{children}</div>
    </section>
  );
}

/** Ringkasan akhir wizard (Blueprint 7.1 "Penutup wizard"). */
export function RingkasanProfil({
  profil, lokasi, onUbah,
}: { profil: ProfilDraft; lokasi: Lokasi | null; onUbah: (l: LangkahWizard) => void }) {
  const kelompok = [
    profil.lansia > 0 && `${profil.lansia} lansia`,
    profil.balita > 0 && `${profil.balita} balita`,
    profil.hamil > 0 && `${profil.hamil} ibu hamil atau menyusui`,
    profil.disabilitas > 0 && `${profil.disabilitas} dengan disabilitas`,
    profil.obatRutin && `${profil.jumlahObatRutin} berobat rutin`,
    profil.hewanPeliharaan && "memelihara hewan",
  ].filter(Boolean) as string[];
  const bangunan = OPSI_BANGUNAN.find((o) => o.value === profil.bangunan)?.label ?? "-";

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-foreground">Periksa ringkasan Anda</h2>
        <p className="mt-1 text-sm text-muted-foreground">Pastikan sudah sesuai, lalu susun Rencana Siaga.</p>
      </div>

      <Blok judul="Lokasi" ubah={<Link href="/lokasi" className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-primary hover:bg-primary/5">Ubah<span className="sr-only"> lokasi</span></Link>}>
        {lokasi ? (
          <p className="flex items-start gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            {lokasi.kelurahan}, Kec. {lokasi.kecamatan}, {lokasi.kabKota}, {lokasi.provinsi}</p>
        ) : (
          <p className="text-muted-foreground">Belum dipilih. Pilih lokasi supaya rencana sesuai tempat Anda.</p>
        )}
      </Blok>

      <Blok judul="Bahaya" ubah={<Ubah onClick={() => onUbah(1)} label="bahaya" />}>
        <ul className="flex flex-wrap gap-2">
          {profil.bahaya.map((id) => (
            <li key={id} className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-sm font-medium">
              <span className={`size-2.5 rounded-full bg-current ${HAZARD_BY_ID[id].colorClass}`} aria-hidden="true" />
              {HAZARD_BY_ID[id].label}
            </li>
          ))}
        </ul>
      </Blok>

      <Blok judul="Keluarga" ubah={<Ubah onClick={() => onUbah(2)} label="keluarga" />}>
        <p>{profil.jumlahAnggota} anggota{kelompok.length > 0 ? `: ${kelompok.join(", ")}` : ", tanpa kebutuhan khusus yang dicatat"}.</p>
      </Blok>

      <Blok judul="Rumah dan kondisi" ubah={<Ubah onClick={() => onUbah(3)} label="rumah dan kondisi" />}>
        <p>
          {bangunan}{profil.lantaiTinggal ? `, lantai ${profil.lantaiTinggal}` : ""}; {profil.punyaKendaraan ? "memiliki" : "tidak memiliki"} kendaraan;
          persediaan {profil.persediaanHari} hari; {profil.kontakDarurat.length} kontak darurat.
        </p>
      </Blok>

      <div className="flex justify-end pt-2">
        <Link href="/rencana"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          Susun Rencana Siaga <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
