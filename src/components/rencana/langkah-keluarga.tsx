"use client";
import type { ProfilRumahTangga } from "@/types";
import type { ErrorMap, ProfilDraft } from "@/types/rencana";
import { BATAS_PROFIL as B } from "@/lib/preparedness/constants";
import { CheckboxGroup, NumberStepper, YaTidak } from "./form-kit";
import { usePihak } from "./teks-pihak";

const JENIS_DISABILITAS: ReadonlyArray<{ value: ProfilRumahTangga["jenisDisabilitas"][number]; label: string }> = [
  { value: "mobilitas", label: "Mobilitas" },
  { value: "penglihatan", label: "Penglihatan" },
  { value: "pendengaran", label: "Pendengaran" },
  { value: "kognitif", label: "Kognitif atau mental" },
  { value: "lainnya", label: "Lainnya" },
];

interface Props {
  profil: ProfilDraft;
  ubah: (patch: Partial<ProfilDraft>) => void;
  errors: ErrorMap;
}

export function LangkahKeluarga({ profil, ubah, errors }: Props) {
  const n = profil.jumlahAnggota;
  const { s: sebut } = usePihak();
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-bold text-foreground">{sebut("Siapa saja yang tinggal bersama Anda?")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Hanya jumlah orang yang dibutuhkan. Satu orang boleh masuk lebih dari satu kategori. Tidak perlu menulis nama atau nama obat.
        </p>
      </div>

      <NumberStepper
        name="jumlahAnggota" label={sebut("Jumlah anggota keluarga (termasuk Anda)")} value={n}
        min={B.anggotaMin} max={B.anggotaMaks} onChange={(v) => ubah({ jumlahAnggota: v })} error={errors.jumlahAnggota}
      />

      <div className="grid gap-6 sm:grid-cols-2">
        <NumberStepper name="lansia" label="Lansia" bantuan="Usia 60 tahun ke atas." value={profil.lansia} min={0} max={n} onChange={(v) => ubah({ lansia: v })} error={errors.lansia} />
        <NumberStepper name="balita" label="Balita" bantuan="Usia 5 tahun ke bawah." value={profil.balita} min={0} max={n} onChange={(v) => ubah({ balita: v })} error={errors.balita} />
        <NumberStepper name="hamil" label="Ibu hamil atau menyusui" value={profil.hamil} min={0} max={n} onChange={(v) => ubah({ hamil: v })} error={errors.hamil} />
        <NumberStepper name="disabilitas" label="Anggota dengan disabilitas" value={profil.disabilitas} min={0} max={n} onChange={(v) => ubah({ disabilitas: v })} error={errors.disabilitas} />
      </div>

      {profil.disabilitas > 0 && (
        <CheckboxGroup
          name="jenisDisabilitas" legend="Jenis disabilitas" bantuan="Boleh lebih dari satu."
          options={JENIS_DISABILITAS} value={profil.jenisDisabilitas} onChange={(v) => ubah({ jenisDisabilitas: v })} error={errors.jenisDisabilitas}
        />
      )}

      <div className="space-y-4">
        <YaTidak
          name="obatRutin" legend="Apakah ada anggota yang membutuhkan obat rutin?"
          bantuan="SIGAP hanya mengingatkan persediaan. Tidak ada nama obat atau dosis yang ditanyakan."
          value={profil.obatRutin} onChange={(v) => ubah({ obatRutin: v, jumlahObatRutin: v ? Math.max(1, profil.jumlahObatRutin) : 0 })}
        />
        {profil.obatRutin && (
          <NumberStepper
            name="jumlahObatRutin" label="Berapa orang yang berobat rutin?" value={profil.jumlahObatRutin}
            min={1} max={n} onChange={(v) => ubah({ jumlahObatRutin: v })} error={errors.jumlahObatRutin}
          />
        )}
      </div>

      <YaTidak
        name="hewanPeliharaan" legend={sebut("Apakah Anda memelihara hewan?")} bantuan="Memengaruhi isi tas siaga dan rencana."
        value={profil.hewanPeliharaan} onChange={(v) => ubah({ hewanPeliharaan: v })}
      />
    </div>
  );
}
