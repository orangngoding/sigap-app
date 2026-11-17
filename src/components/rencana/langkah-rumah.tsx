"use client";
import { Plus, Trash2, Lock } from "lucide-react";
import type { Bangunan, ErrorMap, ProfilDraft } from "@/types/rencana";
import { BATAS_PROFIL as B } from "@/lib/preparedness/constants";
import { RadioGroup, TextField, YaTidak, fieldId } from "./form-kit";

export const OPSI_BANGUNAN: ReadonlyArray<{ value: Bangunan; label: string }> = [
  { value: "rumah_1_lantai", label: "Rumah 1 lantai" },
  { value: "rumah_bertingkat", label: "Rumah bertingkat" },
  { value: "apartemen", label: "Apartemen" },
  { value: "kos", label: "Kos atau kontrakan" },
  { value: "lainnya", label: "Lainnya" },
];

const HARI = [
  { value: 3, label: "3 hari" },
  { value: 5, label: "5 hari" },
  { value: 7, label: "7 hari" },
] as const;

interface Props {
  profil: ProfilDraft;
  ubah: (patch: Partial<ProfilDraft>) => void;
  errors: ErrorMap;
}

export function LangkahRumah({ profil, ubah, errors }: Props) {
  const tingkat = profil.bangunan === "apartemen" || profil.bangunan === "kos";
  const ubahKontak = (i: number, patch: Partial<{ nama: string; telepon: string }>) =>
    ubah({ kontakDarurat: profil.kontakDarurat.map((k, idx) => (idx === i ? { ...k, ...patch } : k)) });

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-bold text-foreground">Rumah dan kondisi Anda</h2>
        <p className="mt-1 text-sm text-muted-foreground">Dipakai untuk saran evakuasi dan jumlah persediaan.</p>
      </div>

      <RadioGroup<Bangunan>
        name="bangunan" legend="Jenis bangunan tempat tinggal" options={OPSI_BANGUNAN}
        value={profil.bangunan} onChange={(v) => ubah({ bangunan: v })} error={errors.bangunan}
      />

      {tingkat && (
        <div>
          <label htmlFor={fieldId("lantaiTinggal")} className="block text-sm font-semibold text-foreground">Tinggal di lantai berapa? (opsional)</label>
          <p id={`${fieldId("lantaiTinggal")}-bantuan`} className="mt-0.5 text-sm text-muted-foreground">Memengaruhi saran evakuasi vertikal.</p>
          <input
            id={fieldId("lantaiTinggal")} type="number" inputMode="numeric" min={B.lantaiMin} max={B.lantaiMaks}
            value={profil.lantaiTinggal ?? ""} placeholder="Mis. 3"
            aria-describedby={`${fieldId("lantaiTinggal")}-bantuan${errors.lantaiTinggal ? ` ${fieldId("lantaiTinggal")}-galat` : ""}`}
            aria-invalid={errors.lantaiTinggal ? true : undefined}
            onChange={(e) => ubah({ lantaiTinggal: e.target.value === "" ? undefined : Math.trunc(e.target.valueAsNumber) })}
            className={`mt-2 min-h-11 w-28 rounded-lg border bg-surface px-3 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${errors.lantaiTinggal ? "border-destructive" : "border-input"}`}
          />
          {errors.lantaiTinggal && <p id={`${fieldId("lantaiTinggal")}-galat`} className="mt-1.5 text-sm font-medium text-danger-foreground">{errors.lantaiTinggal}</p>}
        </div>
      )}

      <YaTidak
        name="punyaKendaraan" legend="Apakah keluarga memiliki kendaraan?" bantuan="Memengaruhi saran evakuasi."
        value={profil.punyaKendaraan} onChange={(v) => ubah({ punyaKendaraan: v })} error={errors.punyaKendaraan}
      />

      <RadioGroup<3 | 5 | 7>
        name="persediaanHari" legend="Persediaan untuk berapa hari?" bantuan="Dipakai menghitung jumlah air, makanan, dan perlengkapan di tas siaga."
        options={HARI} value={profil.persediaanHari} onChange={(v) => ubah({ persediaanHari: v })} error={errors.persediaanHari}
      />

      <section aria-labelledby="judul-lokal" className="space-y-6 rounded-2xl border border-border bg-muted/50 p-5">
        <div>
          <h3 id="judul-lokal" className="flex items-center gap-2 text-base font-bold text-foreground">
            <Lock className="size-4 text-primary" aria-hidden="true" /> Hanya untuk Kartu Siaga Anda
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Data di bawah ini tersimpan di perangkat ini saja dan tidak pernah dikirim ke server atau AI.
          </p>
        </div>

        <TextField
          name="titikKumpul" label="Titik kumpul keluarga (diisi Anda; bukan lokasi evakuasi resmi)" maxLength={B.titikKumpulMaks}
          bantuan="Tanyakan titik kumpul resmi ke BPBD atau kelurahan setempat." value={profil.titikKumpul ?? ""}
          onChange={(v) => ubah({ titikKumpul: v })} error={errors.titikKumpul}
        />

        <fieldset id={fieldId("kontakDarurat")} tabIndex={-1} className="min-w-0 focus:outline-none">
          <legend className="text-sm font-semibold text-foreground">Kontak darurat keluarga (maksimal {B.kontakMaks})</legend>
          <div className="mt-3 space-y-4">
            {profil.kontakDarurat.map((k, i) => (
              <div key={i} className="rounded-xl border border-border bg-surface p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField name={`kontakDarurat.${i}.nama`} label={`Nama kontak ${i + 1}`} maxLength={B.namaKontakMaks} autoComplete="off"
                    value={k.nama} onChange={(v) => ubahKontak(i, { nama: v })} error={errors[`kontakDarurat.${i}.nama`]} />
                  <TextField name={`kontakDarurat.${i}.telepon`} label="Nomor telepon" inputMode="tel" maxLength={B.teleponMaks} autoComplete="off"
                    value={k.telepon} onChange={(v) => ubahKontak(i, { telepon: v })} error={errors[`kontakDarurat.${i}.telepon`]} />
                </div>
                <button type="button" onClick={() => ubah({ kontakDarurat: profil.kontakDarurat.filter((_, idx) => idx !== i) })}
                  className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium text-danger-foreground hover:bg-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                  <Trash2 className="size-4" aria-hidden="true" /> Hapus kontak {i + 1}
                </button>
              </div>
            ))}
          </div>
          {profil.kontakDarurat.length < B.kontakMaks && (
            <button type="button" onClick={() => ubah({ kontakDarurat: [...profil.kontakDarurat, { nama: "", telepon: "" }] })}
              className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-medium hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
              <Plus className="size-4" aria-hidden="true" /> Tambah kontak
            </button>
          )}
        </fieldset>

        <TextField
          name="catatanKhusus" label="Catatan khusus (opsional)" multiline maxLength={B.catatanMaks}
          bantuan="Mis. alergi. Jangan menulis data yang tidak ingin tercetak." value={profil.catatanKhusus ?? ""}
          onChange={(v) => ubah({ catatanKhusus: v })} error={errors.catatanKhusus}
        />
      </section>
    </div>
  );
}
