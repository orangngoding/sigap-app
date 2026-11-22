"use client";
import { ExternalLink, Lightbulb } from "lucide-react";
import type { HazardId, Lokasi, VarianBanjir } from "@/types";
import type { ErrorMap, JawabanPemicu, ProfilDraft } from "@/types/rencana";
import { HazardChip } from "@/components/global/hazard-chip";
import { HAZARDS, HAZARD_BY_ID } from "@/lib/hazards/hazards";
import { HAZARD_DESKRIPSI, isHazardAktif } from "@/lib/hazards/pack-status";
import { PERTANYAAN_PEMICU, URL_INARISK } from "@/lib/hazards/pertanyaan";
import { sarankanBahaya, tambahkanBahaya, terapkanPerubahanJawaban, varianDisarankan } from "@/lib/preparedness/saran-bahaya";
import { ProfilRisiko } from "@/components/risiko/profil-risiko";
import { CheckboxGroup, FieldError, RadioGroup, fieldId } from "./form-kit";
import { usePihak } from "@/components/rencana/teks-pihak";

const JAWABAN = [
  { value: "ya", label: "Ya" },
  { value: "tidak", label: "Tidak" },
  { value: "tidak_tahu", label: "Tidak tahu" },
] as const;

const VARIAN_BANJIR: ReadonlyArray<{ value: VarianBanjir; label: string }> = [
  { value: "genangan", label: "Genangan perkotaan" },
  { value: "sungai", label: "Luapan sungai" },
  { value: "bandang", label: "Banjir bandang" },
  { value: "rob", label: "Banjir rob" },
];

interface Props {
  profil: ProfilDraft;
  ubah: (patch: Partial<ProfilDraft>) => void;
  errors: ErrorMap;
  /** Bila ada, bahaya disarankan dari DATA lokasi (gunung api, gempa, tsunami, pantai, lereng, iklim). */
  lokasi?: Lokasi | null;
}

export function LangkahBahaya({ profil, ubah, errors, lokasi }: Props) {
  const { s: sebut } = usePihak();
  const saran = sarankanBahaya(profil.jawabanPemicu);

  const jawab = (id: string, nilai: JawabanPemicu) => {
    const baru = { ...profil.jawabanPemicu, [id]: nilai };
    ubah({ jawabanPemicu: baru, ...terapkanPerubahanJawaban(profil, baru) });
  };

  const toggleBahaya = (id: HazardId) => {
    if (!isHazardAktif(id)) return;
    if (profil.bahaya.includes(id)) {
      ubah({ bahaya: profil.bahaya.filter((x) => x !== id) });
      return;
    }
    const bahaya = HAZARDS.map((h) => h.id).filter((x) => x === id || profil.bahaya.includes(x));
    // Saat banjir dipilih manual dan belum ada varian, isi dari jawaban (bila ada).
    ubah(id === "banjir" && profil.varianBanjir.length === 0
      ? { bahaya, varianBanjir: varianDisarankan(profil.jawabanPemicu) }
      : { bahaya });
  };

  return (
    <div className="space-y-8">
      {lokasi && (
        <ProfilRisiko
          lokasi={lokasi}
          terpilih={profil.bahaya}
          ringkas
          judul={sebut("Langkah 1: risiko di lokasi Anda menurut data")}
          onTambah={(ids, varian) => ubah(tambahkanBahaya(profil, ids, varian))}
        />
      )}
      <section aria-labelledby="judul-pertanyaan">
        <h2 id="judul-pertanyaan" className="text-lg font-bold text-foreground">{sebut("Kenali lingkungan tempat tinggal Anda")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Data tidak bisa melihat sungai kecil, tebing, atau saluran di dekat rumah. Jawab tujuh pertanyaan singkat ini untuk melengkapinya.
        </p>
        <div className="mt-5 space-y-6">
          {PERTANYAAN_PEMICU.map((q) => (
            <RadioGroup<JawabanPemicu>
              key={q.id} name={`jawaban-${q.id}`} legend={sebut(q.teks)} bantuan={sebut(q.bantuan)} options={JAWABAN}
              value={profil.jawabanPemicu[q.id] ?? "tidak_tahu"} onChange={(v) => jawab(q.id, v)}
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="judul-saran" className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
        <h2 id="judul-saran" className="flex items-center gap-2 text-base font-bold text-foreground">
          <Lightbulb className="size-5 text-primary" aria-hidden="true" /> Bahaya yang disarankan
        </h2>
        <ul className="mt-3 space-y-2" aria-live="polite">
          {saran.map((s) => {
            const h = HAZARD_BY_ID[s.id];
            return (
              <li key={s.id} className="text-sm">
                <span className="inline-flex items-center gap-2 font-semibold text-foreground">
                  <span className={`size-2.5 rounded-full bg-current ${h.colorClass}`} aria-hidden="true" />
                  {h.label}
                  {!isHazardAktif(s.id) && (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-normal text-muted-foreground">Segera hadir</span>
                  )}
                </span>
                <span className="block text-muted-foreground">Disarankan karena {sebut(s.alasan.join("; "))}.</span>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-sm text-muted-foreground">
          {sebut("Saran ini berasal dari jawaban Anda, bukan peta risiko resmi.")}{" "}
          <a href={URL_INARISK} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1 font-semibold text-primary underline-offset-2 hover:underline">
            Cek peta risiko resmi di InaRISK <ExternalLink className="size-3.5" aria-hidden="true" />
            <span className="sr-only">(tab baru)</span>
          </a>
        </p>
      </section>

      <section aria-labelledby="judul-picker">
        <fieldset id={fieldId("bahaya")} tabIndex={-1} className="min-w-0 focus:outline-none">
          <legend id="judul-picker" className="text-lg font-bold text-foreground">{sebut("Pilih bahaya untuk rencana Anda")}</legend>
          <p className="mt-1 text-sm text-muted-foreground">
            Pilih minimal satu. Semua 9 bahaya tersedia dan masing-masing punya langkah sebelum, saat, dan sesudah. Anda bebas menambah atau mengurangi.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {HAZARDS.map((h) => (
              <HazardChip key={h.id} id={h.id} selected={profil.bahaya.includes(h.id)} segera={!isHazardAktif(h.id)} onToggle={toggleBahaya} />
            ))}
          </div>
          <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
            {HAZARDS.filter((h) => profil.bahaya.includes(h.id)).map((h) => (
              <li key={h.id}><span className="font-semibold text-foreground">{h.label}:</span> {HAZARD_DESKRIPSI[h.id]}</li>
            ))}
          </ul>
          <FieldError id={`${fieldId("bahaya")}-galat`} message={errors.bahaya} />
        </fieldset>

        {profil.bahaya.includes("banjir") && (
          <div className="mt-6">
            <CheckboxGroup<VarianBanjir>
              name="varianBanjir" legend="Jenis banjir yang perlu diwaspadai" bantuan="Boleh lebih dari satu."
              options={VARIAN_BANJIR} value={profil.varianBanjir} onChange={(v) => ubah({ varianBanjir: v })}
            />
          </div>
        )}
      </section>
    </div>
  );
}
