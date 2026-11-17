import assert from "node:assert/strict";
import { hitungTas } from "@/lib/preparedness/tas";
import { bangunButir, hitungSkor, labelTingkat } from "@/lib/preparedness/skor";
import { semuaFaktor, hitungFaktorKerentanan } from "@/lib/preparedness/faktor";
import { sarankanBahaya, terapkanPerubahanJawaban } from "@/lib/preparedness/saran-bahaya";
import { buatProfilAwal, buatProfilContoh, rapikanProfil } from "@/lib/preparedness/profil-awal";
import { normalizeCuaca } from "@/lib/data/cuaca";
import type { HazardId } from "@/types";

let lulus = 0; const gagal: string[] = [];
const uji = (nama: string, fn: () => void) => { try { fn(); lulus++; console.log("OK   ", nama); } catch (e) { gagal.push(nama); console.log("GAGAL", nama, "->", (e as Error).message.split("\n")[0]); } };

const dasar = { bahaya: ["gempa"] as HazardId[], jumlahAnggota: 4, persediaanHari: 3 as const, lansia: 0, balita: 0, hamil: 0, disabilitas: 0, obatRutin: false, jumlahObatRutin: 0, hewanPeliharaan: false };
const val = (t: ReturnType<typeof hitungTas>, id: string) => t.find(x => x.id === id)?.jumlah;

uji("tas n=4 d=3: air 36, makanan 36", () => { const t = hitungTas(dasar); assert.equal(val(t,"air"),36); assert.equal(val(t,"makanan"),36); });
uji("tas n=4: senter/baterai/powerbank 2, pakaian 8", () => { const t = hitungTas(dasar); assert.equal(val(t,"senter"),2); assert.equal(val(t,"baterai"),2); assert.equal(val(t,"power-bank"),2); assert.equal(val(t,"pakaian"),8); });
uji("tas n=1 d=3: air 9, senter 1, pakaian 2", () => { const t = hitungTas({ ...dasar, jumlahAnggota: 1 }); assert.equal(val(t,"air"),9); assert.equal(val(t,"senter"),1); assert.equal(val(t,"pakaian"),2); });
uji("tas n=3: senter ceil(3/2)=2", () => assert.equal(val(hitungTas({ ...dasar, jumlahAnggota: 3 }),"senter"),2));
uji("baris khusus keluarga tidak muncul bila kondisi tidak terpenuhi", () => { const t = hitungTas(dasar); for (const id of ["susu-bayi","popok","perlengkapan-hamil","perlengkapan-lansia","alat-disabilitas","perlengkapan-bayi","hewan","obat-rutin"]) assert.equal(val(t,id), undefined, id); });
uji("baris khusus keluarga muncul bila terpenuhi", () => { const t = hitungTas({ ...dasar, lansia:1, balita:2, hamil:1, disabilitas:1, obatRutin:true, jumlahObatRutin:1, hewanPeliharaan:true }); assert.equal(val(t,"popok"),2*3*6); assert.equal(val(t,"susu-bayi"),3); assert.equal(val(t,"perlengkapan-bayi"),2); assert.equal(val(t,"obat-rutin"),7); assert.equal(val(t,"hewan"),3); });
uji("obat rutin max(d,7): d=7 -> 7", () => assert.equal(val(hitungTas({ ...dasar, persediaanHari:7, obatRutin:true, jumlahObatRutin:1 }),"obat-rutin"),7));
uji("syarat hazard: masker/peluit/sepatu hanya gempa", () => { const t = hitungTas(dasar); assert.equal(val(t,"masker"),12); assert.equal(val(t,"peluit"),4); assert.equal(val(t,"sepatu"),4); assert.equal(val(t,"jas-hujan"),undefined); assert.equal(val(t,"dry-bag"),undefined); });
uji("syarat hazard: banjir -> jas hujan + dry bag, tanpa masker", () => { const t = hitungTas({ ...dasar, bahaya:["banjir"] }); assert.equal(val(t,"jas-hujan"),4); assert.equal(val(t,"dry-bag"),1); assert.equal(val(t,"masker"),undefined); });
uji("id tas unik", () => { const t = hitungTas({ ...dasar, bahaya:["banjir","gempa","cuaca_ekstrem","longsor","tsunami","karhutla","gunung_api","gelombang_abrasi","kekeringan"], lansia:1,balita:1,hamil:1,disabilitas:1,obatRutin:true,jumlahObatRutin:1,hewanPeliharaan:true }); assert.equal(new Set(t.map(x=>x.id)).size, t.length); });
uji("tas deterministik", () => assert.deepEqual(hitungTas(dasar), hitungTas(dasar)));

// skor
const T = (id:string,prio:"tinggi"|"sedang"|"rendah") => ({ actionId:id, hazard:"gempa" as const, phase:"sebelum" as const, title:id, detail:"x", priority:prio, forGroups:["umum" as const], sourceIds:[id] });
const tind = [T("a","tinggi"),T("b","sedang"),T("c","rendah")];
uji("skor: hanya bobot 3 dicentang = 50", () => assert.equal(hitungSkor(bangunButir(tind,[]),{a:true}).skor,50));
uji("skor: tanpa butir = 0", () => assert.equal(hitungSkor([],{}).skor,0));
uji("skor: tanpa centang = 0", () => assert.equal(hitungSkor(bangunButir(tind,[]),{}).skor,0));
uji("skor: semua dicentang = 100", () => assert.equal(hitungSkor(bangunButir(tind,[]),{a:true,b:true,c:true}).skor,100));
uji("label batas", () => { const m: Record<number,string> = {0:"Baru mulai",39:"Baru mulai",40:"Cukup siap",69:"Cukup siap",70:"Siap",89:"Siap",90:"Sangat siap",100:"Sangat siap"}; for (const [k,v] of Object.entries(m)) assert.equal(labelTingkat(+k), v, k); });
uji("fase Sesudah tidak dihitung", () => { const s = {...T("s","tinggi"), phase:"sesudah" as const}; assert.equal(bangunButir([s],[]).length,0); });
uji("langkah berikutnya: bobot tertinggi, lalu Sebelum dulu", () => { const t = [ {...T("saat3","tinggi"),phase:"saat" as const}, T("sebelum3","tinggi") ]; assert.equal(hitungSkor(bangunButir(t,[]),{}).langkahBerikutnya?.key,"sebelum3"); });
uji("skor tas membobot kelompok (air=2, perlengkapan=1)", () => { const t = hitungTas(dasar); const b = bangunButir([],t); assert.ok(b.find(x=>x.key==="tas:air")!.bobot===2 && b.find(x=>x.key==="tas:senter")!.bobot===1); });

// faktor
uji("faktor: urutan & isi", () => { const f = semuaFaktor({lansia:1,balita:1,hamil:0,disabilitas:0,obatRutin:true,punyaKendaraan:false,bangunan:"apartemen",lantaiTinggal:5,jumlahAnggota:6,hewanPeliharaan:true}); assert.deepEqual(f,["Ada anggota lansia","Ada balita","Ada anggota yang membutuhkan obat rutin","Tidak memiliki kendaraan untuk evakuasi","Tinggal di lantai tinggi","Keluarga besar","Memiliki hewan peliharaan"]); });
uji("faktor: maksimal 6 untuk AI", () => assert.equal(hitungFaktorKerentanan({lansia:1,balita:1,hamil:1,disabilitas:1,obatRutin:true,punyaKendaraan:false,bangunan:"kos",lantaiTinggal:4,jumlahAnggota:8,hewanPeliharaan:true}).length,6));
uji("faktor: lantai tinggi hanya apartemen/kos", () => assert.ok(!semuaFaktor({lansia:0,balita:0,hamil:0,disabilitas:0,obatRutin:false,punyaKendaraan:true,bangunan:"rumah_bertingkat",lantaiTinggal:5,jumlahAnggota:1,hewanPeliharaan:false}).includes("Tinggal di lantai tinggi")));

// saran bahaya
uji("saran: gempa+cuaca selalu", () => assert.deepEqual(sarankanBahaya(buatProfilAwal().jawabanPemicu).map(s=>s.id),["gempa","cuaca_ekstrem"]));
uji("saran: pesisir -> tsunami + gelombang_abrasi", () => { const j = {...buatProfilAwal().jawabanPemicu,"q-pesisir":"ya" as const}; const ids = sarankanBahaya(j).map(s=>s.id); assert.ok(ids.includes("tsunami")&&ids.includes("gelombang_abrasi")); });
uji("selisih saran: jawaban Ya->banjir ditambah; Tidak->dilepas", () => { const p = buatProfilAwal(); const j1 = {...p.jawabanPemicu,"q-sungai":"ya" as const}; const r1 = terapkanPerubahanJawaban(p, j1); assert.ok(r1.bahaya.includes("banjir")); assert.deepEqual(r1.varianBanjir.sort(),["genangan","sungai"]); const r2 = terapkanPerubahanJawaban({...p,...r1,jawabanPemicu:j1}, p.jawabanPemicu); assert.ok(!r2.bahaya.includes("banjir")); });
uji("saran: jawaban pesisir memilih tsunami dan gelombang_abrasi (keduanya aktif)", () => { const p = buatProfilAwal(); const r = terapkanPerubahanJawaban(p,{...p.jawabanPemicu,"q-pesisir":"ya"}); assert.ok(r.bahaya.includes("tsunami")); assert.ok(r.bahaya.includes("gelombang_abrasi")); });

// profil
uji("rapikan: hitungan dijepit ke jumlah anggota", () => { const p = rapikanProfil({...buatProfilAwal(), jumlahAnggota:2, lansia:5}); assert.equal(p.lansia,2); });
uji("profil contoh: 4 org,1 lansia,1 balita", () => { const p = buatProfilContoh(); assert.equal(p.jumlahAnggota,4); assert.equal(p.lansia,1); assert.equal(p.balita,1); });

// zona waktu BMKG (WIB/WITA/WIT): offset diturunkan dari pasangan local_datetime dan utc_datetime
const itemZ = (local: string, utc: string | undefined) => ({ local_datetime: local, utc_datetime: utc, weather_desc: "Cerah", t: 30, hu: 70, ws: 5, wd: "B", vs_text: "> 10 km" });
uji("cuaca: WITA (+08:00) dari pasangan local/utc", () => {
  const c = normalizeCuaca({ lokasi: { timezone: "Asia/Makassar" }, data: [{ cuaca: [[itemZ("2026-11-15 10:00:00", "2026-11-15 02:00:00")]] }] }, new Date("2026-11-15T02:00:00Z"));
  assert.equal(c.prakiraan[0].waktu, "2026-11-15T10:00:00+08:00");
});
uji("cuaca: WIT (+09:00) dari pasangan local/utc", () => {
  const c = normalizeCuaca({ lokasi: { timezone: "Asia/Jayapura" }, data: [{ cuaca: [[itemZ("2026-11-15 11:00:00", "2026-11-15 02:00:00")]] }] }, new Date("2026-11-15T02:00:00Z"));
  assert.equal(c.prakiraan[0].waktu, "2026-11-15T11:00:00+09:00");
});
uji("cuaca: tanpa utc_datetime, nama zona IANA dipetakan", () => {
  const c = normalizeCuaca({ lokasi: { timezone: "Asia/Makassar" }, data: [{ cuaca: [[itemZ("2026-11-15 10:00:00", undefined)]] }] }, new Date("2026-11-15T02:00:00Z"));
  assert.equal(c.prakiraan[0].waktu, "2026-11-15T10:00:00+08:00");
});
uji("cuaca: format lama '+0700' tetap berfungsi", () => {
  const c = normalizeCuaca({ lokasi: { timezone: "+0700" }, data: [{ cuaca: [[itemZ("2026-11-15 09:00:00", undefined)]] }] }, new Date("2026-11-15T02:00:00Z"));
  assert.equal(c.prakiraan[0].waktu, "2026-11-15T09:00:00+07:00");
});

console.log(`\n${lulus} lulus, ${gagal.length} gagal`);
process.exit(gagal.length ? 1 : 0);
