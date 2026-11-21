// Rencana untuk BANYAK keluarga (mis. ketua RT, kader, relawan) tanpa login. Semua fitur SIGAP tetap membaca satu
// set data "aktif" di kunci yang sudah ada (sigap:v1:lokasi, profil, rencana, ...). Daftar keluarga menyimpan salinan
// data tiap keluarga lain; berganti keluarga = simpan data aktif ke slotnya, lalu muat slot tujuan ke kunci aktif.
// Dengan begitu cara kerja fitur yang ada tidak berubah sama sekali. Data hanya di perangkat ini.

/** Penyimpanan minimal (localStorage di peramban; Map di tes). */
export interface Penyimpanan {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

export const KUNCI_KELUARGA = "sigap:v1:keluarga";

/** Data yang melekat pada satu keluarga. Info medis, riwayat Asisten, dan hasil simulasi tetap milik pemilik ponsel. */
export const KUNCI_PER_KELUARGA = ["lokasi", "profil", "rencana", "progres", "tas", "kartu", "aksiiklim", "iklimrumah", "risiko"].map((k) => `sigap:v1:${k}`);
/** Kunci yang ikut disalin saat "lokasi sama dengan keluarga aktif". */
export const KUNCI_LOKASI = ["sigap:v1:lokasi", "sigap:v1:risiko"];

export const MAKS_KELUARGA = 30;
export const NAMA_MAKS = 60;
const DATA_MAKS_BYTE = 400_000;

export interface Keluarga {
  id: string;
  nama: string;
  /** Keluarga pemilik ponsel: tidak bisa dihapus, dan dipakai Mode Darurat. */
  milikSaya: boolean;
  dibuat: string;
  diubah: string;
  /** Salinan data keluarga ini. Untuk keluarga AKTIF kosong: datanya ada di kunci aktif. */
  data: Record<string, string>;
}

export interface DaftarKeluarga {
  versi: 1;
  aktif: string;
  daftar: Keluarga[];
}

const sekarang = () => new Date().toISOString();
const idBaru = () => `k${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
export const rapikanNama = (s: string) => s.replace(/\s+/g, " ").trim().slice(0, NAMA_MAKS);

function awal(): DaftarKeluarga {
  const id = idBaru();
  const t = sekarang();
  return { versi: 1, aktif: id, daftar: [{ id, nama: "Keluarga saya", milikSaya: true, dibuat: t, diubah: t, data: {} }] };
}

/** Terima hanya isi yang sah (bisa berasal dari berkas cadangan buatan siapa saja). */
export function bersihkanDaftar(x: unknown): DaftarKeluarga | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  if (!Array.isArray(o.daftar)) return null;
  const izin = new Set(KUNCI_PER_KELUARGA);
  const daftar: Keluarga[] = [];
  const dipakai = new Set<string>();
  for (const k of o.daftar.slice(0, MAKS_KELUARGA)) {
    if (!k || typeof k !== "object") continue;
    const r = k as Record<string, unknown>;
    if (typeof r.id !== "string" || !/^[a-z0-9]{4,40}$/.test(r.id) || dipakai.has(r.id)) continue;
    const data: Record<string, string> = {};
    if (r.data && typeof r.data === "object")
      for (const [kunci, nilai] of Object.entries(r.data as Record<string, unknown>)) if (izin.has(kunci) && typeof nilai === "string" && nilai.length <= DATA_MAKS_BYTE) data[kunci] = nilai;
    dipakai.add(r.id);
    daftar.push({
      id: r.id,
      nama: rapikanNama(typeof r.nama === "string" ? r.nama : "") || "Keluarga tanpa nama",
      milikSaya: r.milikSaya === true,
      dibuat: typeof r.dibuat === "string" ? r.dibuat : sekarang(),
      diubah: typeof r.diubah === "string" ? r.diubah : sekarang(),
      data,
    });
  }
  if (!daftar.length) return null;
  // Tepat satu keluarga milik pemilik ponsel (yang pertama bila tidak ada atau lebih dari satu).
  const pertama = Math.max(0, daftar.findIndex((k) => k.milikSaya));
  daftar.forEach((k, i) => { k.milikSaya = i === pertama; });
  const aktif = typeof o.aktif === "string" && daftar.some((k) => k.id === o.aktif) ? o.aktif : daftar[0].id;
  return { versi: 1, aktif, daftar };
}

/** Daftar dari penyimpanan; bila belum ada, satu "Keluarga saya" (data yang sudah ada = data keluarga ini). */
export function bacaDaftar(st: Penyimpanan): DaftarKeluarga {
  let d: DaftarKeluarga | null = null;
  try {
    const mentah = st.getItem(KUNCI_KELUARGA);
    d = mentah ? bersihkanDaftar(JSON.parse(mentah)) : null;
  } catch {
    d = null;
  }
  if (d) return d;
  // Belum ada (atau rusak): data yang sudah ada menjadi "Keluarga saya". Langsung disimpan agar id-nya stabil.
  const baru = awal();
  try {
    tulis(st, baru);
  } catch {
    // penyimpanan penuh atau diblokir: tetap dipakai di memori
  }
  return baru;
}

function tulis(st: Penyimpanan, d: DaftarKeluarga) {
  st.setItem(KUNCI_KELUARGA, JSON.stringify(d));
}

/** Ambil data aktif dari kunci aktif ke slot keluarga aktif (dipanggil sebelum berganti atau menambah). */
function simpanAktif(st: Penyimpanan, d: DaftarKeluarga) {
  const k = d.daftar.find((x) => x.id === d.aktif);
  if (!k) return;
  const data: Record<string, string> = {};
  for (const kunci of KUNCI_PER_KELUARGA) {
    const v = st.getItem(kunci);
    if (v !== null) data[kunci] = v;
  }
  k.data = data;
  k.diubah = sekarang();
}

/** Muat data slot ke kunci aktif; kunci yang tidak ada di slot dikosongkan. */
function muatSlot(st: Penyimpanan, k: Keluarga, pengecualian: string[] = []) {
  for (const kunci of KUNCI_PER_KELUARGA) {
    if (pengecualian.includes(kunci)) continue;
    const v = k.data[kunci];
    if (v !== undefined) st.setItem(kunci, v);
    else st.removeItem(kunci);
  }
  k.data = {};
}

/** Jadikan keluarga `id` aktif. Mengembalikan false bila id tidak dikenal. */
export function pindahKe(st: Penyimpanan, id: string): boolean {
  const d = bacaDaftar(st);
  const tujuan = d.daftar.find((k) => k.id === id);
  if (!tujuan) return false;
  if (d.aktif === id) return true;
  const asal = d.daftar.find((k) => k.id === d.aktif);
  // Urutan aman bila penyimpanan penuh: salinan data aktif DITULIS dulu ke daftar, baru kunci aktif ditimpa.
  // Sebelumnya kunci aktif ditimpa lebih dulu, sehingga gagal menulis daftar = data keluarga asal hilang.
  simpanAktif(st, d);
  try {
    tulis(st, d);
  } catch {
    return false;
  }
  try {
    muatSlot(st, tujuan);
    d.aktif = id;
    tulis(st, d);
  } catch {
    // Gagal di tengah jalan: kembalikan kunci aktif ke keluarga asal (salinannya sudah aman di daftar).
    if (asal) try { muatSlot(st, { ...asal, data: { ...asal.data } }); } catch { /* salinan tetap ada di daftar */ }
    return false;
  }
  return true;
}

/**
 * Tambah keluarga baru lalu jadikan aktif dengan data kosong. `salinLokasi`: lokasi keluarga aktif ikut dipakai
 * (mis. warga satu RT), sehingga pengguna langsung ke profil keluarga tanpa memilih kelurahan lagi.
 */
export function tambahKeluarga(st: Penyimpanan, namaMentah: string, opsi: { salinLokasi?: boolean } = {}): { ok: true; id: string } | { ok: false; pesan: string } {
  const nama = rapikanNama(namaMentah);
  if (nama.length < 2) return { ok: false, pesan: "Tulis nama keluarga, misalnya: Keluarga Bu Sari, RT 03." };
  const d = bacaDaftar(st);
  if (d.daftar.length >= MAKS_KELUARGA) return { ok: false, pesan: `Paling banyak ${MAKS_KELUARGA} keluarga di satu ponsel. Hapus keluarga yang tidak dipakai, atau pakai ponsel lain.` };
  const asal = d.daftar.find((k) => k.id === d.aktif);
  simpanAktif(st, d);
  const PENUH = { ok: false as const, pesan: "Penyimpanan ponsel penuh, keluarga baru belum dapat dibuat. Hapus keluarga yang tidak dipakai lalu coba lagi." };
  // Salinan data aktif ditulis dulu (lihat pindahKe), baru kunci aktif dikosongkan untuk keluarga baru.
  try {
    tulis(st, d);
  } catch {
    return PENUH;
  }
  const t = sekarang();
  const baru: Keluarga = { id: idBaru(), nama, milikSaya: false, dibuat: t, diubah: t, data: {} };
  try {
    muatSlot(st, baru, opsi.salinLokasi ? KUNCI_LOKASI : []);
    // Nama keluarga langsung terpakai di Kartu Siaga.
    st.setItem("sigap:v1:kartu", JSON.stringify({ state: { namaKeluarga: nama.slice(0, 40), ukuran: "A4", tampilkanCatatan: false }, version: 1 }));
    d.daftar.push(baru);
    d.aktif = baru.id;
    tulis(st, d);
  } catch {
    if (asal) try { muatSlot(st, { ...asal, data: { ...asal.data } }); } catch { /* salinan tetap ada di daftar */ }
    return PENUH;
  }
  return { ok: true, id: baru.id };
}

export function ubahNama(st: Penyimpanan, id: string, namaMentah: string): boolean {
  const nama = rapikanNama(namaMentah);
  if (nama.length < 2) return false;
  const d = bacaDaftar(st);
  const k = d.daftar.find((x) => x.id === id);
  if (!k) return false;
  k.nama = nama;
  // Mengubah nama keluarga = keinginan terbaru pengguna, jadi nama di Kartu Siaga (dan Dokumen Rencana) selalu ikut.
  // (Dulu hanya bila nama kartu sama persis dengan nama lama; beda huruf besar-kecil saja membuatnya tidak ikut.)
  const KARTU = "sigap:v1:kartu";
  const aktif = d.aktif === id;
  const kartu = json((aktif ? st.getItem(KARTU) : k.data[KARTU]) ?? null);
  const state = (kartu?.state ?? {}) as Record<string, unknown>;
  const baru = JSON.stringify({ state: { ukuran: "A4", tampilkanCatatan: false, ...state, namaKeluarga: nama.slice(0, 40) }, version: typeof kartu?.version === "number" ? kartu.version : 1 });
  if (aktif) st.setItem(KARTU, baru);
  else k.data[KARTU] = baru;
  tulis(st, d);
  return true;
}

/** Hapus keluarga yang tidak aktif dan bukan milik pemilik ponsel. */
export function hapusKeluarga(st: Penyimpanan, id: string): boolean {
  const d = bacaDaftar(st);
  const k = d.daftar.find((x) => x.id === id);
  if (!k || k.milikSaya || d.aktif === id) return false;
  d.daftar = d.daftar.filter((x) => x.id !== id);
  tulis(st, d);
  return true;
}

// ---------- Sebutan: "Anda" menjadi nama keluarga yang sedang dibuka ----------
/**
 * Saat yang dibuka keluarga lain, kalimat yang merujuk data keluarga ("wilayah Anda", "rumah Anda", "keluarga Anda")
 * menyebut nama keluarga itu, agar jelas data siapa yang sedang dilihat. Kalimat lain (mis. "Anda bisa...") tetap.
 */
export function gantiAnda(teks: string, nama: string | null): string {
  if (!nama) return teks;
  // Fungsi pengganti (bukan string) agar "$" di nama keluarga tidak dibaca sebagai pola ganti ($1, $&).
  return teks
    .replace(/\b([Pp]rofil|[Rr]encana|[Dd]ata|[Kk]artu) keluarga (Anda|saya)\b/g, (_, a: string) => `${a} ${nama}`)
    .replace(/\b[Kk]eluarga (Anda|saya)\b/g, () => nama)
    .replace(/\s*\(termasuk Anda\)/g, "")
    .replace(/\byang tinggal bersama Anda\b/g, () => `anggota ${nama}`)
    .replace(/\b([Ss]ekitar) (Anda|saya)\b/g, (_, a: string) => `${a} lokasi ${nama}`)
    .replace(/\b([Jj]awaban) (Anda|saya)\b/g, (_, a: string) => `${a} untuk ${nama}`)
    .replace(/\buntuk Anda\b/g, () => `untuk ${nama}`)
    .replace(/\bAnda menjawab\b/g, () => `Untuk ${nama} dijawab`)
    .replace(/\b([Aa]pakah )?Anda (tinggal|memelihara)\b/g, (_, apa: string | undefined, kerja: string) => `${apa ?? ""}${nama} ${kerja}`)
    .replace(
      /\b(Kartu Siaga|[Ww]ilayah|[Rr]umah|[Ll]okasi|[Kk]elurahan|[Kk]ecamatan|kabupaten\/kota|[Pp]rovinsi|[Zz]ona|[Kk]artu|[Aa]ir simpanan|[Tt]empat tinggal|[Tt]empat|[Rr]encana|[Pp]rofil|[Rr]ingkasan|[Kk]ondisi|[Kk]ebutuhan|[Bb]atasan|[Pp]engalaman|[Dd]ata) (Anda|saya)\b/g,
      (_, a: string) => `${a} ${nama}`,
    );
}

// ---------- Ringkasan untuk daftar dan rekap warga ----------
export interface RingkasKeluarga {
  kelurahan: string | null;
  kecamatan: string | null;
  kabKota: string | null;
  anggota: number;
  lansia: number;
  balita: number;
  hamil: number;
  disabilitas: number;
  titikKumpul: string;
  adaProfil: boolean;
  adaRencana: boolean;
  /** Tindakan "sebelum" dan "saat" dari rencana, dan yang sudah dicentang. */
  tindakan: number;
  tindakanSiap: number;
}

const json = (s: string | null | undefined): Record<string, unknown> | null => {
  if (!s) return null;
  try {
    const v = JSON.parse(s);
    return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
};
const bil = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0);

/** Ringkasan satu keluarga dari salinan datanya (atau dari kunci aktif untuk keluarga aktif). */
export function ringkasData(ambil: (kunci: string) => string | null | undefined): RingkasKeluarga {
  const lok = (json(ambil("sigap:v1:lokasi"))?.state as Record<string, unknown> | undefined)?.lokasi as Record<string, unknown> | null | undefined;
  const prof = (json(ambil("sigap:v1:profil"))?.state as Record<string, unknown> | undefined)?.profil as Record<string, unknown> | undefined;
  const ren = (json(ambil("sigap:v1:rencana"))?.state as Record<string, unknown> | undefined)?.rencana as Record<string, unknown> | null | undefined;
  const prog = ((json(ambil("sigap:v1:progres"))?.state as Record<string, unknown> | undefined)?.progres ?? {}) as Record<string, unknown>;
  const tindakan = Array.isArray(ren?.tindakan) ? (ren!.tindakan as Array<Record<string, unknown>>).filter((t) => t && t.phase !== "sesudah") : [];
  const teks = (v: unknown) => (typeof v === "string" ? v : null);
  const anggota = bil(prof?.jumlahAnggota);
  return {
    kelurahan: teks(lok?.kelurahan),
    kecamatan: teks(lok?.kecamatan),
    kabKota: teks(lok?.kabKota),
    anggota,
    lansia: bil(prof?.lansia),
    balita: bil(prof?.balita),
    hamil: bil(prof?.hamil),
    disabilitas: bil(prof?.disabilitas),
    titikKumpul: (teks(prof?.titikKumpul) ?? "").trim(),
    adaProfil: Boolean(prof) && anggota > 0,
    adaRencana: tindakan.length > 0,
    tindakan: tindakan.length,
    tindakanSiap: tindakan.filter((t) => typeof t.actionId === "string" && prog[t.actionId as string] === true).length,
  };
}

export function ringkasKeluarga(st: Penyimpanan, d: DaftarKeluarga, k: Keluarga): RingkasKeluarga {
  return ringkasData((kunci) => (k.id === d.aktif ? st.getItem(kunci) : k.data[kunci]));
}

/** Rekap seluruh keluarga (untuk RT/relawan): jumlah orang dan kelompok rentan, bahan rencana evakuasi lingkungan. */
export function rekap(daftar: RingkasKeluarga[]) {
  const jml = (f: (r: RingkasKeluarga) => number) => daftar.reduce((a, r) => a + f(r), 0);
  return {
    keluarga: daftar.length,
    denganRencana: daftar.filter((r) => r.adaRencana).length,
    orang: jml((r) => r.anggota),
    lansia: jml((r) => r.lansia),
    balita: jml((r) => r.balita),
    hamil: jml((r) => r.hamil),
    disabilitas: jml((r) => r.disabilitas),
  };
}

/**
 * Profil keluarga pemilik ponsel untuk Mode Darurat bila yang sedang aktif adalah keluarga lain (mis. warga yang
 * sedang didata RT). null = pemilik ponsel sedang aktif (pakai data aktif seperti biasa).
 */
export interface ProfilMilikSaya {
  id: string;
  nama: string;
  kontakDarurat: Array<{ nama: string; telepon: string }>;
  titikKumpul: string;
  jumlahAnggota: number;
  /** Bahaya pilihan profil pemilik ponsel (urutan bahaya di Mode Darurat). */
  bahaya: string[];
  /** Titik lokasi dan ringkasan risiko mentah (`sigap:v1:risiko`) milik pemilik ponsel. */
  titik: { lat: number; lon: number } | null;
  risikoMentah: string | null;
}

export function profilMilikSaya(st: Penyimpanan): ProfilMilikSaya | null {
  const mentah = st.getItem(KUNCI_KELUARGA);
  if (!mentah) return null;
  const d = bacaDaftar(st);
  const saya = d.daftar.find((k) => k.milikSaya);
  if (!saya || saya.id === d.aktif) return null;
  const prof = (json(saya.data["sigap:v1:profil"])?.state as Record<string, unknown> | undefined)?.profil as Record<string, unknown> | undefined;
  const kontak = Array.isArray(prof?.kontakDarurat)
    ? (prof!.kontakDarurat as Array<Record<string, unknown>>).filter((k) => k && typeof k.nama === "string" && typeof k.telepon === "string").map((k) => ({ nama: k.nama as string, telepon: k.telepon as string })).slice(0, 5)
    : [];
  const lok = (json(saya.data["sigap:v1:lokasi"])?.state as Record<string, unknown> | undefined)?.lokasi as Record<string, unknown> | null | undefined;
  const titik = lok && typeof lok.lat === "number" && typeof lok.lon === "number" ? { lat: lok.lat, lon: lok.lon } : null;
  return {
    id: saya.id,
    nama: saya.nama,
    kontakDarurat: kontak,
    titikKumpul: typeof prof?.titikKumpul === "string" ? prof.titikKumpul.trim() : "",
    jumlahAnggota: bil(prof?.jumlahAnggota),
    bahaya: Array.isArray(prof?.bahaya) ? (prof!.bahaya as unknown[]).filter((b): b is string => typeof b === "string") : [],
    titik,
    risikoMentah: saya.data["sigap:v1:risiko"] ?? null,
  };
}
