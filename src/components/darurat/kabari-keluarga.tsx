"use client";
// Kabari keluarga lewat SMS: satu ketuk "Saya selamat" atau "Saya butuh bantuan", lengkap dengan lokasi GPS.
// SMS dipilih karena tetap terkirim saat internet data mati atau jaringan padat sesudah bencana; GPS juga tidak
// butuh internet. Pesan disusun di perangkat dan dikirim oleh pengguna sendiri lewat aplikasi SMS.
import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { Check, CheckCircle2, HeartHandshake, Loader2, LocateFixed, MessageSquare, Plus, Send, ShieldCheck, X } from "lucide-react";
import { kanonNomor, nomorUnik, pakaiIos, rapikanNomor, tautanSms, teksKabar, type JenisKabar, type Posisi } from "@/lib/darurat/situasi";

const FOKUS = "focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-white";

const jamSekarang = () => new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" }).format(new Date()).replace(":", ".");

/** Posisi GPS: untuk SMS tunggu paling lama 10 detik dan terima posisi 5 menit terakhir; gagal = null (pesan tetap dikirim). */
function ambilPosisi(batasMs = 10_000, umurMs = 300_000): Promise<Posisi | null> {
  return new Promise((selesai) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator) || !window.isSecureContext) return selesai(null);
    navigator.geolocation.getCurrentPosition(
      (p) => selesai({ lat: p.coords.latitude, lon: p.coords.longitude, akurasi: p.coords.accuracy }),
      () => selesai(null),
      { enableHighAccuracy: true, timeout: batasMs, maximumAge: umurMs },
    );
  });
}

// ---------- Nomor lain tersimpan di perangkat (sigap:v1:smslain) ----------
const KUNCI_LAIN = "sigap:v1:smslain";
const MAKS_LAIN = 10;
const pendengarLain = new Set<() => void>();
let cadanganLain = "[]"; // dipakai bila localStorage tidak tersedia (mode privat)
const bacaLain = () => {
  try {
    return localStorage.getItem(KUNCI_LAIN) ?? "[]";
  } catch {
    return cadanganLain;
  }
};
function simpanNomorLain(daftar: string[]) {
  const isi = JSON.stringify(daftar.slice(-MAKS_LAIN));
  cadanganLain = isi;
  try {
    localStorage.setItem(KUNCI_LAIN, isi);
  } catch {
    /* tetap di memori */
  }
  pendengarLain.forEach((f) => f());
}
const langgananLain = (f: () => void) => {
  pendengarLain.add(f);
  window.addEventListener("storage", f);
  return () => { pendengarLain.delete(f); window.removeEventListener("storage", f); };
};
function useNomorLain(): string[] {
  const mentah = useSyncExternalStore(langgananLain, bacaLain, () => "[]");
  return useMemo(() => {
    try {
      const d = JSON.parse(mentah) as unknown;
      return Array.isArray(d) ? d.filter((x): x is string => typeof x === "string").map((x) => rapikanNomor(x)).filter((x): x is string => !!x) : [];
    } catch {
      return [];
    }
  }, [mentah]);
}

interface Props {
  kontak: Array<{ nama: string; telepon: string }>;
  titikKumpul?: string;
  jumlahOrang?: number;
}

export function KabariKeluarga({ kontak, titikKumpul, jumlahOrang }: Props) {
  const [menyiapkan, setMenyiapkan] = useState<JenisKabar | null>(null);
  const [siap, setSiap] = useState<{ jenis: JenisKabar; teks: string; adaLokasi: boolean } | null>(null);
  // Koordinat besar untuk dibacakan ke petugas 112 lewat telepon (GPS tetap bekerja tanpa internet).
  const [koordinat, setKoordinat] = useState<Posisi | "mencari" | "gagal" | null>(null);
  const tampilkanKoordinat = async () => {
    setKoordinat("mencari");
    setKoordinat((await ambilPosisi(20_000, 30_000)) ?? "gagal");
  };
  // Penerima: kontak tersimpan (bisa dicentang/dilepas) ditambah nomor lain yang diketik sendiri. Nomor lain disimpan
  // di perangkat ini (sigap:v1:smslain) agar tidak hilang saat halaman dimuat ulang; ikut terhapus oleh "Hapus semua data".
  // Semua nomor dibandingkan dalam bentuk baku (0812... = +62812...) agar satu orang tidak dikirimi dua kali.
  const kontakValid = kontak
    .filter((k) => k.telepon.replace(/\D/g, "").length >= 6)
    .filter((k, i, a) => a.findIndex((x) => kanonNomor(x.telepon) === kanonNomor(k.telepon)) === i);
  const [dilepas, setDilepas] = useState<Set<string>>(new Set());
  const lain = useNomorLain();
  const [ketik, setKetik] = useState("");
  const [galatNomor, setGalatNomor] = useState<string | null>(null);
  const [dibuka, setDibuka] = useState<Set<string>>(new Set()); // penerima yang aplikasi SMS-nya sudah dibuka
  const ios = useSyncExternalStore(() => () => {}, () => pakaiIos(navigator.userAgent, navigator.maxTouchPoints), () => false);
  const penerima: Array<{ nama: string; telepon: string }> = [
    ...kontakValid.filter((k) => !dilepas.has(k.telepon)),
    ...lain.filter((n) => !kontakValid.some((k) => kanonNomor(k.telepon) === n)).map((n) => ({ nama: n, telepon: n })),
  ];
  const nomor = nomorUnik(penerima.map((p) => p.telepon));
  const tandai = (n: string[]) => setDibuka((s) => new Set([...s, ...n.map(kanonNomor)]));

  const tambahNomor = () => {
    const n = rapikanNomor(ketik);
    if (!n) return setGalatNomor("Nomor belum benar. Ketik 6–15 angka, boleh diawali +62.");
    setKetik("");
    const kontakSama = kontakValid.find((k) => kanonNomor(k.telepon) === n);
    if (kontakSama) {
      // Nomor sudah ada sebagai kontak: pastikan terpilih, jangan dibuat dobel.
      setDilepas((s) => { const b = new Set(s); b.delete(kontakSama.telepon); return b; });
      return setGalatNomor(`Nomor ini sudah ada sebagai kontak ${kontakSama.nama}, dan sudah dipilih.`);
    }
    setGalatNomor(lain.includes(n) ? "Nomor ini sudah ada di daftar." : null);
    simpanNomorLain([...lain.filter((x) => x !== n), n]);
  };
  const alihKontak = (telepon: string) =>
    setDilepas((s) => {
      const baru = new Set(s);
      if (baru.has(telepon)) baru.delete(telepon);
      else baru.add(telepon);
      return baru;
    });

  const susun = async (jenis: JenisKabar) => {
    // Nomor yang masih diketik tapi belum ditambahkan ikut dikirimi, agar tidak terlewat saat panik.
    const ketikan = rapikanNomor(ketik);
    const tujuan = nomorUnik(ketikan ? [...nomor, ketikan] : nomor);
    if (ketikan) tambahNomor();
    setMenyiapkan(jenis);
    setDibuka(new Set());
    const posisi = await ambilPosisi();
    const teks = teksKabar(jenis, { posisi, titikKumpul, jam: jamSekarang(), jumlahOrang });
    setMenyiapkan(null);
    setSiap({ jenis, teks, adaLokasi: Boolean(posisi) });
    // Satu penerima atau tanpa penerima: langsung buka aplikasi SMS. Banyak penerima: tampilkan pilihan (iOS hanya andal satu per satu).
    if (tujuan.length <= 1) {
      tandai(tujuan);
      window.location.assign(tautanSms(tujuan, teks, ios));
    }
  };

  return (
    <section id="d-kabari" aria-labelledby="d-kabari-judul" className="mt-8 scroll-mt-4 rounded-3xl border-2 border-white/80 p-5 sm:p-6">
      <h2 id="d-kabari-judul" className="text-2xl font-bold">Kabari keluarga</h2>
      <p className="mt-1 text-base text-white/80">Lewat SMS beserta lokasi GPS. SMS tetap terkirim saat internet mati atau jaringan padat, dan GPS bekerja tanpa internet.</p>

      {/* Pilih penerima: kontak tersimpan dan/atau nomor yang diketik sendiri. */}
      <fieldset className="mt-4 min-w-0 rounded-2xl bg-white/10 p-4">
        <legend className="sr-only">Kirim SMS ke</legend>
        <p className="text-lg font-bold" aria-hidden="true">Kirim ke</p>
        {kontakValid.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2">
            {kontakValid.map((k, i) => {
              const pilih = !dilepas.has(k.telepon);
              return (
                <li key={`${k.telepon}-${i}`}>
                  <button type="button" aria-pressed={pilih} onClick={() => alihKontak(k.telepon)} className={`inline-flex min-h-12 items-center gap-2 rounded-full border-2 px-4 text-base font-bold ${FOKUS} ${pilih ? "border-yellow-300 bg-yellow-300 text-black" : "border-white/50 text-white/80"}`}>
                    {pilih ? <Check className="size-5" aria-hidden="true" /> : <span className="size-5 rounded-full border-2 border-white/60" aria-hidden="true" />}
                    {k.nama}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {lain.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2" aria-label="Nomor lain">
            {lain.map((n) => (
              <li key={n} className="inline-flex min-h-12 items-center gap-1 rounded-full border-2 border-yellow-300 bg-yellow-300 pl-4 pr-1 text-base font-bold text-black">
                {n}
                <button type="button" onClick={() => simpanNomorLain(lain.filter((x) => x !== n))} aria-label={`Hapus nomor ${n}`} className={`grid size-10 place-items-center rounded-full hover:bg-black/10 ${FOKUS}`}>
                  <X className="size-5" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <label htmlFor="sms-nomor-lain" className="mt-3 block text-base font-semibold text-white/85">Nomor lain (opsional)</label>
        <div className="mt-1.5 flex gap-2">
          <input
            id="sms-nomor-lain" type="tel" inputMode="tel" autoComplete="tel" value={ketik}
            onChange={(e) => { setKetik(e.target.value); setGalatNomor(null); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); tambahNomor(); } }}
            placeholder="0812 3456 7890"
            aria-invalid={galatNomor?.startsWith("Nomor belum") ?? false} aria-describedby={galatNomor ? "sms-nomor-galat" : "sms-nomor-ket"}
            className={`min-h-14 min-w-0 flex-1 rounded-2xl border-2 bg-black px-4 text-xl font-bold text-white placeholder:text-base placeholder:font-normal placeholder:text-white/50 ${galatNomor?.startsWith("Nomor belum") ? "border-red-400" : "border-white/70"} ${FOKUS}`}
          />
          <button type="button" onClick={tambahNomor} className={`inline-flex min-h-14 shrink-0 items-center gap-1.5 rounded-2xl border-2 border-white px-4 text-lg font-bold hover:bg-white/10 ${FOKUS}`}>
            <Plus className="size-5" aria-hidden="true" /> Tambah
          </button>
        </div>
        {galatNomor && <p id="sms-nomor-galat" role="alert" className={`mt-2 text-base ${galatNomor.startsWith("Nomor belum") ? "text-red-300" : "text-yellow-200"}`}>{galatNomor}</p>}
        <p id="sms-nomor-ket" className="mt-2 text-sm text-white/65">Nomor lain tersimpan di HP ini untuk lain kali. Hapus dengan tombol ✕.</p>
        <p className="mt-3 text-base text-white/80" aria-live="polite">
          {nomor.length === 0 ? "Belum ada penerima: Anda memilih penerima sendiri di aplikasi SMS." : `${nomor.length} penerima dipilih.`}
        </p>
      </fieldset>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={() => void susun("selamat")} disabled={menyiapkan !== null} className={`flex min-h-20 items-center justify-center gap-3 rounded-2xl bg-emerald-500 px-4 text-xl font-extrabold text-black hover:bg-emerald-400 disabled:opacity-60 ${FOKUS}`}>
          {menyiapkan === "selamat" ? <Loader2 className="size-7 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <ShieldCheck className="size-7" aria-hidden="true" />} Saya selamat
        </button>
        <button type="button" onClick={() => void susun("butuh-bantuan")} disabled={menyiapkan !== null} className={`flex min-h-20 items-center justify-center gap-3 rounded-2xl bg-red-600 px-4 text-xl font-extrabold hover:bg-red-500 disabled:opacity-60 ${FOKUS}`}>
          {menyiapkan === "butuh-bantuan" ? <Loader2 className="size-7 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <HeartHandshake className="size-7" aria-hidden="true" />} Saya butuh bantuan
        </button>
      </div>
      {menyiapkan && <p role="status" className="mt-2 text-base text-white/80">Mencari lokasi GPS (paling lama 10 detik)…</p>}

      <div className="mt-3" aria-live="polite">
        {koordinat && typeof koordinat === "object" ? (
          <div className="rounded-2xl border-2 border-white/80 p-4">
            <p className="text-base font-semibold text-white/85">Bacakan ke petugas 112:</p>
            <p className="mt-2 rounded-xl bg-white px-4 py-3 font-mono text-2xl font-bold text-black">{koordinat.lat.toFixed(5)}, {koordinat.lon.toFixed(5)}</p>
            <p className="mt-2 text-base text-white/80">Akurasi sekitar {Math.round(koordinat.akurasi)} meter. Sebutkan juga patokan terdekat.</p>
          </div>
        ) : (
          <button type="button" onClick={() => void tampilkanKoordinat()} disabled={koordinat === "mencari"} className={`inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 border-white px-5 text-lg font-bold disabled:opacity-60 sm:w-auto ${FOKUS}`}>
            {koordinat === "mencari" ? <><Loader2 className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> Mencari lokasi…</> : <><LocateFixed className="size-5 text-yellow-300" aria-hidden="true" /> Tampilkan koordinat untuk petugas</>}
          </button>
        )}
        {koordinat === "gagal" && <p className="mt-2 text-base text-yellow-200">Lokasi belum didapat. Nyalakan GPS (lokasi) di ponsel, beri izin lokasi, lalu coba lagi di tempat terbuka.</p>}
      </div>

      {siap && (
        <div className="mt-4 space-y-3" aria-live="polite">
          <p className="rounded-2xl bg-white px-4 py-3 text-base font-semibold text-black">{siap.teks}</p>
          {!siap.adaLokasi && <p className="text-base text-yellow-200">Lokasi GPS belum didapat; pesan dikirim tanpa lokasi. Sebutkan patokan terdekat bila menelepon.</p>}
          {/* Situs web tidak bisa mengirim SMS sendiri: pengguna harus menekan Kirim di aplikasi SMS. */}
          <p className="flex items-start gap-2 rounded-2xl border-2 border-yellow-300 px-4 py-3 text-base font-semibold text-yellow-100">
            <Send className="mt-0.5 size-5 shrink-0 text-yellow-300" aria-hidden="true" />
            Aplikasi SMS terbuka dengan pesan siap kirim. Tekan tombol Kirim di aplikasi SMS, lalu kembali ke sini.
          </p>
          {nomor.length > 1 && (
            <>
              <a href={tautanSms(nomor, siap.teks, ios)} onClick={() => tandai(nomor)} className={`flex min-h-16 items-center justify-center gap-2 rounded-2xl bg-yellow-300 text-xl font-extrabold text-black ${FOKUS}`}>
                <MessageSquare className="size-6" aria-hidden="true" /> Kirim ke semua ({nomor.length} penerima)
              </a>
              <p className="text-base text-white/80">Bila aplikasi SMS hanya mengisi satu nomor, kirim satu per satu lewat tombol di bawah. Yang sudah dibuka diberi tanda ✓.</p>
              <ul className="grid gap-2 sm:grid-cols-2">
                {penerima.map((k, i) => {
                  const sudah = dibuka.has(kanonNomor(k.telepon));
                  return (
                    <li key={`${k.telepon}-${i}`}>
                      <a href={tautanSms([k.telepon], siap.teks, ios)} onClick={() => tandai([k.telepon])} className={`flex min-h-14 items-center gap-2 rounded-2xl border-2 px-4 text-lg font-bold ${FOKUS} ${sudah ? "border-emerald-400 bg-emerald-400/10" : "border-white"}`}>
                        {sudah ? <CheckCircle2 className="size-5 text-emerald-400" aria-hidden="true" /> : <MessageSquare className="size-5 text-yellow-300" aria-hidden="true" />}
                        <span className="flex-1">{k.nama}</span>
                        {sudah && <span className="text-sm font-semibold text-emerald-300">sudah dibuka</span>}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
          {nomor.length <= 1 && (
            <a href={tautanSms(nomor, siap.teks, ios)} onClick={() => tandai(nomor)} className={`inline-flex min-h-14 items-center gap-2 rounded-2xl border-2 border-white px-5 text-lg font-bold ${FOKUS}`}>
              <MessageSquare className="size-5 text-yellow-300" aria-hidden="true" /> Buka SMS lagi
            </a>
          )}
        </div>
      )}
      {kontak.length === 0 && (
        <p className="mt-3 text-base text-white/80">
          Belum ada kontak keluarga tersimpan.{" "}
          <Link href="/rencana/profil" className="font-bold underline underline-offset-4">Tambahkan kontak</Link> agar lain kali langsung terpilih.
        </p>
      )}
    </section>
  );
}
