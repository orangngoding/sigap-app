// Latihan Siaga: simulasi keputusan saat bencana. Konten ditulis tim dari potongan panduan KB (bukan AI),
// dan setiap umpan balik mengutip id potongan itu. Diuji: semua `sumber` harus ada di KB dan setiap langkah
// punya tepat satu jawaban terbaik (nilai 2).
import type { HazardId } from "@/types";

export interface Pilihan {
  teks: string;
  /** 2 = tepat, 1 = kurang tepat, 0 = berbahaya. */
  nilai: 0 | 1 | 2;
  umpanBalik: string;
  /** Id potongan KB yang menjadi dasar umpan balik. */
  sumber: string;
  /** Langkah berikutnya bila pilihan ini diambil (percabangan). Bawaan: langkah sesudahnya di daftar utama. */
  lanjut?: string;
}

export interface Langkah {
  id: string;
  situasi: string;
  pilihan: Pilihan[];
}

export interface Skenario {
  id: string;
  hazard: HazardId;
  judul: string;
  ringkas: string;
  /** Langkah utama berurutan. Langkah cabang hanya dicapai lewat `lanjut`. */
  langkah: Langkah[];
  cabang?: Langkah[];
}

export const SKENARIO: Skenario[] = [
  {
    id: "gempa-malam",
    hazard: "gempa",
    judul: "Gempa saat memasak malam hari",
    ringkas: "Guncangan kuat datang saat Anda di dapur rusun lantai 4.",
    langkah: [
      {
        id: "g1",
        situasi: "Pukul 21.00 Anda sedang memasak di dapur. Tiba-tiba lantai berguncang keras dan piring berjatuhan dari rak.",
        pilihan: [
          { teks: "Lari keluar lewat pintu depan secepatnya", nilai: 0, umpanBalik: "Berlari saat guncangan kuat membuat Anda mudah jatuh atau tertimpa benda. Lindungi kepala dan badan dulu, baru keluar bila memungkinkan.", sumber: "gempa-saat-001" },
          { teks: "Matikan kompor bila aman, lalu berlindung di bawah meja kokoh sambil melindungi kepala", nilai: 2, umpanBalik: "Tepat. Mematikan kompor mencegah kebakaran, dan meja kokoh melindungi kepala dari benda jatuh.", sumber: "gempa-saat-002" },
          { teks: "Berdiri di dekat jendela untuk melihat keadaan di luar", nilai: 0, umpanBalik: "Kaca jendela bisa pecah saat gempa. Jauhi kaca dan lindungi kepala di bawah meja yang kokoh.", sumber: "gempa-saat-001" },
        ],
      },
      {
        id: "g2",
        situasi: "Guncangan berhenti. Unit Anda di lantai 4, dan Anda memutuskan keluar gedung bersama keluarga.",
        pilihan: [
          { teks: "Naik lift supaya lebih cepat sampai bawah", nilai: 0, umpanBalik: "Jangan memakai lift saat atau segera setelah gempa. Lift bisa macet atau listrik padam saat Anda di dalamnya.", sumber: "gempa-saat-005" },
          { teks: "Keluar dengan tertib lewat tangga biasa", nilai: 2, umpanBalik: "Tepat. Tangga biasa adalah jalur keluar yang aman setelah gempa, bukan lift atau tangga berjalan.", sumber: "gempa-sesudah-001" },
          { teks: "Tetap di unit sambil menunggu kabar dari media sosial", nilai: 1, umpanBalik: "Tetap di tempat boleh bila tidak dalam bahaya, tetapi ikuti informasi resmi dan arahan petugas, bukan kabar media sosial.", sumber: "umum-saat-003" },
        ],
      },
      {
        id: "g3",
        situasi: "Di halaman, Anda melihat tiang listrik miring dan dinding bangunan di sebelah retak.",
        pilihan: [
          { teks: "Berkumpul di bawah tiang listrik sambil menunggu", nilai: 0, umpanBalik: "Tiang listrik bisa roboh, apalagi bila ada gempa susulan. Menjauhlah dari gedung, tiang, dan pohon.", sumber: "gempa-saat-003" },
          { teks: "Menuju tempat terbuka yang jauh dari gedung, tiang, dan pohon", nilai: 2, umpanBalik: "Tepat. Tempat terbuka melindungi Anda dari bangunan atau tiang yang roboh.", sumber: "gempa-saat-003" },
          { teks: "Berteduh di dalam bangunan sebelah yang dindingnya retak", nilai: 0, umpanBalik: "Jangan masuk ke bangunan yang terdampak gempa karena berisiko runtuh.", sumber: "gempa-sesudah-003" },
        ],
      },
      {
        id: "g4",
        situasi: "Anda ingin kembali sebentar mengambil dompet, lalu mencium bau gas dari arah dapur.",
        pilihan: [
          { teks: "Nyalakan lampu agar bisa melihat sumber kebocoran", nilai: 0, umpanBalik: "Percikan listrik bisa memicu api saat ada kebocoran gas. Jangan menyalakan listrik atau api.", sumber: "gempa-sesudah-002" },
          { teks: "Jangan menyalakan api atau listrik, menjauh, dan laporkan ke petugas", nilai: 2, umpanBalik: "Tepat. Saat ada kebocoran gas, matikan sumber api dan listrik bila aman, lalu menjauh.", sumber: "gempa-sesudah-002" },
          { teks: "Nyalakan korek api untuk memeriksa", nilai: 0, umpanBalik: "Api bisa menyulut gas yang bocor. Jangan menyalakan api.", sumber: "gempa-sesudah-002" },
        ],
      },
      {
        id: "g5",
        situasi: "Beredar pesan berantai yang mengatasnamakan BMKG: gempa lebih besar akan datang pukul 23.00 malam ini. Beberapa kerabat mulai panik.",
        pilihan: [
          { teks: "Teruskan ke semua kontak agar mereka waspada", nilai: 0, umpanBalik: "Gempa tidak dapat diprediksi jamnya. Menyebarkan kabar yang tidak jelas sumbernya menambah kepanikan.", sumber: "umum-sesudah-002" },
          { teks: "Cek kanal resmi BMKG dan jangan mudah percaya kabar tanpa sumber", nilai: 2, umpanBalik: "Tepat. Dengarkan informasi dari sumber resmi dan jangan percaya kabar yang tidak jelas asalnya.", sumber: "umum-sesudah-002" },
          { teks: "Abaikan semua informasi dan tidur di kamar yang dindingnya retak", nilai: 0, umpanBalik: "Gempa susulan masih mungkin terjadi. Hindari area dan bangunan yang terdampak.", sumber: "gempa-sesudah-004" },
        ],
      },
    ],
  },
  {
    id: "banjir-kiriman",
    hazard: "banjir",
    judul: "Air sungai naik setelah hujan deras",
    ringkas: "RT mengumumkan air di level kuning. Ada nenek dan balita di rumah.",
    langkah: [
      {
        id: "b1",
        situasi: "Hujan deras sejak sore. Pengurus RT mengumumkan air sungai sudah di level kuning dan warga diminta bersiap.",
        pilihan: [
          { teks: "Pindahkan dokumen dan barang elektronik ke tempat tinggi, lalu siapkan tas siaga", nilai: 2, umpanBalik: "Tepat. Barang berharga dan dokumen aman di tempat tinggi, dan tas siaga siap dibawa bila harus mengungsi.", sumber: "banjir-saat-004" },
          { teks: "Menunggu dulu, biasanya banjir tidak sampai ke rumah", nilai: 0, umpanBalik: "Menunda membuat Anda kehilangan waktu berharga. Mengungsilah sejak dini selagi genangan masih bisa dilewati.", sumber: "banjir-saat-003", lanjut: "b1x" },
          { teks: "Pergi ke tepi sungai untuk melihat ketinggian air", nilai: 0, umpanBalik: "Arus dan kedalaman air di sungai dan saluran sulit diperkirakan. Jauhi saluran air.", sumber: "banjir-saat-001" },
        ],
      },
      {
        id: "b2",
        situasi: "Di rumah ada nenek yang sulit berjalan dan seorang balita. Petugas mengarahkan warga untuk evakuasi mandiri.",
        pilihan: [
          { teks: "Antar nenek dan balita lebih dulu ke tempat aman yang diarahkan petugas", nilai: 2, umpanBalik: "Tepat. Anggota rentan perlu dipindahkan jauh sebelum air meninggi karena butuh waktu lebih lama.", sumber: "banjir-saat-016" },
          { teks: "Tunggu sampai air setinggi pinggang baru membawa mereka", nilai: 0, umpanBalik: "Air setinggi pinggang sangat menyulitkan lansia dan balita. Bawa anggota rentan ke tempat aman lebih awal.", sumber: "banjir-saat-016" },
          { teks: "Biarkan balita bermain air di teras sambil Anda berkemas", nilai: 0, umpanBalik: "Anak-anak harus diawasi agar tidak bermain air banjir, baik di dalam maupun di luar rumah.", sumber: "banjir-saat-014" },
        ],
      },
      {
        id: "b3",
        situasi: "Sebelum berangkat, air mulai menggenangi lantai dan mendekati stopkontak.",
        pilihan: [
          { teks: "Cabut alat listrik dan matikan listrik dari meteran bila Anda tidak berdiri di air", nilai: 2, umpanBalik: "Tepat. Memutus listrik mencegah sengatan, asalkan Anda tidak sedang berdiri di genangan.", sumber: "banjir-saat-008" },
          { teks: "Biarkan saja, listrik akan padam sendiri", nilai: 0, umpanBalik: "Listrik belum tentu padam. Matikan listrik atau minta PLN memutusnya di wilayah terdampak.", sumber: "banjir-saat-002" },
          { teks: "Cabut steker sambil berdiri di genangan", nilai: 0, umpanBalik: "Jangan menyentuh peralatan listrik saat berdiri di atas atau di dalam air karena berisiko tersetrum.", sumber: "banjir-saat-008" },
        ],
      },
      {
        id: "b4",
        situasi: "Jalan menuju tempat aman tergenang. Mobil keluarga ada di garasi.",
        pilihan: [
          { teks: "Kemudikan mobil menembus genangan", nilai: 0, umpanBalik: "Jangan mengemudi di wilayah banjir. Mobil bisa terseret arus walau airnya terlihat dangkal.", sumber: "banjir-saat-006" },
          { teks: "Berjalan kaki di jalur tanpa arus sambil memeriksa pijakan dengan tongkat", nilai: 2, umpanBalik: "Tepat. Pijakan yang kokoh dan jalur tanpa arus mengurangi risiko terseret atau terperosok.", sumber: "banjir-saat-009" },
          { teks: "Lewat pinggir saluran air karena terlihat lebih dangkal", nilai: 0, umpanBalik: "Pinggir saluran air berbahaya: arusnya kuat dan kedalamannya sulit diperkirakan.", sumber: "banjir-saat-001" },
        ],
      },
      {
        id: "b5",
        situasi: "Dua hari kemudian air surut. Anda kembali dan menemukan makanan di dapur yang terendam air banjir.",
        pilihan: [
          { teks: "Buang makanan yang terkena air banjir lalu cuci tangan dengan sabun", nilai: 2, umpanBalik: "Tepat. Air banjir mencemari makanan dan bisa menyebabkan penyakit.", sumber: "banjir-sesudah-005" },
          { teks: "Tetap dimasak, yang penting dipanaskan", nilai: 0, umpanBalik: "Makanan yang terkontaminasi air banjir sebaiknya dibuang, bukan dimasak ulang.", sumber: "banjir-sesudah-005" },
          { teks: "Langsung masuk rumah walau masih tergenang untuk mengecek semuanya", nilai: 1, umpanBalik: "Jangan langsung masuk rumah yang masih digenangi air. Waspadai binatang beracun dan benda berbahaya yang tersembunyi.", sumber: "banjir-sesudah-009" },
        ],
      },
    ],
    cabang: [
      {
        id: "b1x",
        situasi: "Satu jam kemudian air masuk rumah setinggi mata kaki dan terus naik. Dokumen penting masih di laci bawah.",
        pilihan: [
          { teks: "Pindahkan dokumen ke tempat tinggi, ambil tas siaga, dan bersiap mengungsi", nilai: 2, umpanBalik: "Pilihan terbaik dalam keadaan ini. Lain kali, bersiaplah sejak air masih di level kuning.", sumber: "banjir-saat-015", lanjut: "b2" },
          { teks: "Tetap di rumah menunggu air surut", nilai: 0, umpanBalik: "Air yang terus naik bisa memutus jalan keluar. Mengungsilah sejak dini.", sumber: "banjir-saat-003", lanjut: "b2" },
          { teks: "Menyalakan pompa air listrik sambil berdiri di genangan", nilai: 0, umpanBalik: "Jangan menyentuh peralatan listrik saat berdiri di air.", sumber: "banjir-saat-008", lanjut: "b2" },
        ],
      },
    ],
  },
  {
    id: "tsunami-pantai",
    hazard: "tsunami",
    judul: "Gempa kuat saat berlibur di pantai",
    ringkas: "Guncangan kuat terasa di pantai, lalu air laut surut.",
    langkah: [
      {
        id: "t1",
        situasi: "Anda sekeluarga berlibur di pantai. Gempa kuat mengguncang hingga sulit berdiri.",
        pilihan: [
          { teks: "Setelah guncangan, segera berlari ke tempat yang tinggi", nilai: 2, umpanBalik: "Tepat. Gempa kuat di pantai adalah tanda alam tsunami. Segera menuju tempat tinggi dan bertahan di sana.", sumber: "tsunami-saat-001" },
          { teks: "Menunggu sirine berbunyi dulu baru bergerak", nilai: 1, umpanBalik: "Sirine membantu, tetapi gempa kuat di pantai sudah cukup menjadi tanda untuk segera ke tempat tinggi.", sumber: "tsunami-saat-001" },
          { teks: "Kembali ke penginapan di tepi pantai untuk mengambil barang", nilai: 0, umpanBalik: "Setiap menit berharga. Jangan kembali ke dekat pantai; segera menuju tempat tinggi.", sumber: "tsunami-saat-002" },
        ],
      },
      {
        id: "t2",
        situasi: "Air laut tiba-tiba surut jauh dan banyak ikan menggelepar di pasir.",
        pilihan: [
          { teks: "Ambil ikan selagi sempat", nilai: 0, umpanBalik: "Air laut yang surut tiba-tiba adalah tanda tsunami. Jangan menangkap ikan yang terdampar.", sumber: "tsunami-saat-002" },
          { teks: "Merekam pemandangan itu dengan ponsel", nilai: 0, umpanBalik: "Tidak perlu melihat atau merekam datangnya tsunami. Segera menjauhi pantai.", sumber: "tsunami-saat-002" },
          { teks: "Terus menjauhi pantai menuju tempat tinggi", nilai: 2, umpanBalik: "Tepat. Segera menjauhi pantai dan jangan menunggu gelombang terlihat.", sumber: "tsunami-saat-002" },
        ],
      },
      {
        id: "t3",
        situasi: "Jalan menuju bukit macet total, dan Anda berada di dalam mobil.",
        pilihan: [
          { teks: "Tetap di mobil sampai macet terurai", nilai: 0, umpanBalik: "Menunggu di mobil membuang waktu. Kunci dan tinggalkan kendaraan, lalu lanjutkan berjalan kaki.", sumber: "tsunami-saat-007" },
          { teks: "Kunci dan tinggalkan mobil, lalu lanjutkan evakuasi dengan berjalan kaki", nilai: 2, umpanBalik: "Tepat. Evakuasi dengan berjalan kaki dianjurkan saat jalan macet.", sumber: "tsunami-saat-007" },
          { teks: "Putar balik lewat jembatan di muara sungai", nilai: 0, umpanBalik: "Hindari jalan yang melewati jembatan, terutama di dekat muara.", sumber: "tsunami-saat-006" },
        ],
      },
      {
        id: "t4",
        situasi: "Anda sudah di bukit. Gelombang pertama terlihat kecil dan air sudah surut lagi.",
        pilihan: [
          { teks: "Turun untuk melihat kondisi penginapan", nilai: 0, umpanBalik: "Gelombang kedua dan ketiga biasanya lebih besar. Jangan turun sebelum dinyatakan aman.", sumber: "tsunami-saat-005" },
          { teks: "Bertahan di tempat tinggi dan pantau informasi resmi lewat radio atau ponsel", nilai: 2, umpanBalik: "Tepat. Tsunami bisa datang beberapa kali; tunggu sampai pihak berwenang menyatakan aman.", sumber: "tsunami-saat-008" },
          { teks: "Turun sebentar lalu naik lagi bila ada gelombang", nilai: 0, umpanBalik: "Gelombang berikutnya bisa datang tiba-tiba dan lebih besar. Tetap di tempat tinggi.", sumber: "tsunami-saat-005" },
        ],
      },
    ],
  },
  {
    id: "petir-lapangan",
    hazard: "cuaca_ekstrem",
    judul: "Petir dan angin kencang di lapangan",
    ringkas: "Langit gelap saat Anda dan anak berada di lapangan terbuka.",
    langkah: [
      {
        id: "c1",
        situasi: "Anda dan anak sedang di lapangan terbuka. Langit gelap dan suara guntur makin dekat.",
        pilihan: [
          { teks: "Berteduh di bawah pohon besar di pinggir lapangan", nilai: 0, umpanBalik: "Pohon besar bisa tersambar petir atau tumbang. Jangan berlindung di bawahnya.", sumber: "cuaca_ekstrem-saat-004" },
          { teks: "Segera masuk ke bangunan yang kokoh", nilai: 2, umpanBalik: "Tepat. Bangunan kokoh adalah tempat berlindung terbaik saat ada petir.", sumber: "cuaca_ekstrem-saat-003" },
          { teks: "Tiarap di tengah lapangan", nilai: 0, umpanBalik: "Jangan tiarap di tanah. Bila petir sudah dekat dan tidak ada bangunan, membungkuk, duduk, dan peluk lutut.", sumber: "cuaca_ekstrem-saat-001" },
        ],
      },
      {
        id: "c2",
        situasi: "Tidak ada bangunan di dekat Anda, dan kilat menyambar sangat dekat.",
        pilihan: [
          { teks: "Membungkuk, duduk, dan memeluk lutut tanpa tiarap", nilai: 2, umpanBalik: "Tepat. Posisi ini memperkecil risiko tersambar dibanding berdiri atau tiarap.", sumber: "cuaca_ekstrem-saat-001" },
          { teks: "Berdiri tegak di dekat tiang listrik", nilai: 0, umpanBalik: "Jauhi benda tinggi seperti tiang listrik dan bangunan tinggi saat ada petir.", sumber: "cuaca_ekstrem-saat-002" },
          { teks: "Berlari mengangkat payung tinggi-tinggi", nilai: 0, umpanBalik: "Benda yang menjulang menambah risiko. Rendahkan posisi tubuh dan jauhi benda tinggi.", sumber: "cuaca_ekstrem-saat-002" },
        ],
      },
      {
        id: "c3",
        situasi: "Angin bertiup kencang. Di dekat halte ada papan reklame besar yang bergoyang.",
        pilihan: [
          { teks: "Berlindung di bawah papan reklame dari hujan", nilai: 0, umpanBalik: "Papan reklame bisa jatuh atau roboh saat angin kencang.", sumber: "cuaca_ekstrem-saat-004" },
          { teks: "Menjauh dari papan reklame dan tiang, lalu cari bangunan kokoh", nilai: 2, umpanBalik: "Tepat. Jauhi papan reklame, tiang listrik, dan bangunan tinggi.", sumber: "cuaca_ekstrem-saat-002" },
          { teks: "Merekam papan yang bergoyang dari dekat", nilai: 0, umpanBalik: "Benda yang roboh bisa melukai Anda. Menjauhlah.", sumber: "cuaca_ekstrem-saat-002" },
        ],
      },
      {
        id: "c4",
        situasi: "Badai reda dan Anda tiba di rumah. Di jalan depan, kabel listrik putus menjuntai dekat genangan.",
        pilihan: [
          { teks: "Jauhi kabel dan laporkan kerusakan listrik ke PLN atau petugas", nilai: 2, umpanBalik: "Tepat. Kabel putus bisa masih bertegangan. Laporkan kerusakan listrik ke pihak berwenang dan jangan mendekat.", sumber: "cuaca_ekstrem-sesudah-002" },
          { teks: "Singkirkan kabel dengan tongkat kayu agar jalan aman", nilai: 0, umpanBalik: "Menyentuh kabel putus, apalagi di dekat genangan, berisiko tersengat listrik. Biarkan petugas yang menangani.", sumber: "cuaca_ekstrem-sesudah-002" },
          { teks: "Memotretnya untuk dibagikan, lalu masuk rumah", nilai: 1, umpanBalik: "Menjauh sudah benar, tetapi kerusakan perlu dilaporkan ke pihak berwenang agar segera diperbaiki.", sumber: "cuaca_ekstrem-sesudah-002" },
        ],
      },
      {
        id: "c5",
        situasi: "Di dalam rumah, anak Anda bilang tangannya tergores saat berlari tadi. Anggota lain belum Anda tanyai.",
        pilihan: [
          { teks: "Periksa semua anggota keluarga dan beri pertolongan pertama bila perlu", nilai: 2, umpanBalik: "Tepat. Sesudah cuaca ekstrem, pastikan tidak ada yang cedera dan beri pertolongan darurat bila perlu.", sumber: "cuaca_ekstrem-sesudah-001" },
          { teks: "Langsung membereskan barang yang berantakan di halaman", nilai: 1, umpanBalik: "Barang bisa menunggu. Utamakan memeriksa kondisi setiap anggota keluarga lebih dulu.", sumber: "cuaca_ekstrem-sesudah-001" },
          { teks: "Membiarkan luka anak karena hanya goresan", nilai: 0, umpanBalik: "Luka kecil yang dibiarkan kotor bisa memburuk. Bersihkan dan rawat, lalu periksa anggota lain.", sumber: "cuaca_ekstrem-sesudah-001" },
        ],
      },
    ],
  },
  {
    id: "asap-karhutla",
    hazard: "karhutla",
    judul: "Kabut asap kebakaran hutan dan lahan",
    ringkas: "Asap tebal menyelimuti kota; ayah Anda punya penyakit paru.",
    langkah: [
      {
        id: "k1",
        situasi: "Kabut asap tebal menyelimuti kota sejak pagi. Anda tidak punya keperluan mendesak di luar.",
        pilihan: [
          { teks: "Tetap di rumah dan tutup celah yang bisa dimasuki asap", nilai: 2, umpanBalik: "Tepat. Tetap di dalam rumah dan jaga udara dalam ruangan sebersih mungkin.", sumber: "karhutla-saat-002" },
          { teks: "Tetap jogging pagi seperti biasa", nilai: 0, umpanBalik: "Bila tidak ada kepentingan, jangan keluar rumah saat udara berasap.", sumber: "karhutla-saat-001" },
          { teks: "Buka semua jendela agar udara mengalir", nilai: 0, umpanBalik: "Membuka jendela memasukkan asap. Tutup semua akses udara berasap.", sumber: "karhutla-saat-002" },
        ],
      },
      {
        id: "k2",
        situasi: "Anda harus keluar untuk membeli kebutuhan dapur.",
        pilihan: [
          { teks: "Periksa indeks kualitas udara, lalu pakai masker (N95 lebih baik)", nilai: 2, umpanBalik: "Tepat. Masker melindungi pernapasan, dan indeks kualitas udara membantu memilih waktu keluar.", sumber: "karhutla-saat-003" },
          { teks: "Keluar tanpa masker karena hanya sebentar", nilai: 0, umpanBalik: "Lindungi pernapasan setiap kali beraktivitas di luar ruangan saat berasap.", sumber: "karhutla-saat-003" },
          { teks: "Menutup hidung dengan kain seadanya", nilai: 1, umpanBalik: "Kain lebih baik daripada tidak sama sekali, tetapi masker N95 memberi perlindungan lebih baik.", sumber: "karhutla-saat-003" },
        ],
      },
      {
        id: "k3",
        situasi: "Ayah Anda yang lansia dan punya penyakit paru mulai batuk terus-menerus dan sesak napas.",
        pilihan: [
          { teks: "Menunggu sampai asap hilang", nilai: 0, umpanBalik: "Jangan sepelekan gejala pernapasan. Sesak napas atau batuk menetap perlu segera diperiksa.", sumber: "karhutla-saat-009" },
          { teks: "Segera bawa ke puskesmas atau rumah sakit", nilai: 2, umpanBalik: "Tepat. Kelompok rentan dengan gangguan paru perlu segera mendapat pertolongan tenaga kesehatan.", sumber: "karhutla-saat-009" },
          { teks: "Memberi obat batuk apa saja yang ada di rumah", nilai: 0, umpanBalik: "Jangan menebak obat sendiri. Serahkan pada tenaga kesehatan di puskesmas atau rumah sakit.", sumber: "karhutla-saat-009" },
        ],
      },
      {
        id: "k4",
        situasi: "Dari jendela, Anda melihat api menjalar dari lahan kosong ke arah permukiman.",
        pilihan: [
          { teks: "Segera laporkan ke Posko Kebakaran atau pihak terkait", nilai: 2, umpanBalik: "Tepat. Api yang menjalar harus segera dilaporkan agar cepat ditangani petugas.", sumber: "karhutla-saat-006" },
          { teks: "Membiarkannya karena nanti padam sendiri", nilai: 0, umpanBalik: "Api di lahan bisa cepat menjalar. Laporkan segera.", sumber: "karhutla-saat-006" },
          { teks: "Mendekat untuk merekam video", nilai: 0, umpanBalik: "Mendekati api dan asap berbahaya. Laporkan dari tempat aman.", sumber: "karhutla-saat-006" },
        ],
      },
    ],
  },
  {
    id: "longsor-lereng",
    hazard: "longsor",
    judul: "Suara gemuruh dari lereng",
    ringkas: "Hujan lebat semalaman di permukiman lereng bukit.",
    langkah: [
      {
        id: "l1",
        situasi: "Hujan lebat turun semalaman. Anda mendengar suara gemuruh dari arah lereng di belakang rumah.",
        pilihan: [
          { teks: "Segera menjauh dari arah suara gemuruh bersama keluarga", nilai: 2, umpanBalik: "Tepat. Suara gemuruh bisa menandakan longsoran. Segera menjauh dari arah datangnya.", sumber: "longsor-saat-001" },
          { teks: "Naik ke lereng untuk melihat apa yang terjadi", nilai: 0, umpanBalik: "Mendekati sumber gemuruh sangat berbahaya. Menjauhlah dari arah longsoran.", sumber: "longsor-saat-001" },
          { teks: "Kembali tidur karena mungkin hanya suara guntur", nilai: 0, umpanBalik: "Jangan abaikan suara gemuruh saat hujan lebat di daerah lereng. Segera menjauh.", sumber: "longsor-saat-001" },
        ],
      },
      {
        id: "l2",
        situasi: "Longsor kecil terjadi di dekat rumah tetangga, dan hujan masih turun.",
        pilihan: [
          { teks: "Mendekat ke lokasi longsor untuk menonton", nilai: 0, umpanBalik: "Tanah di wilayah yang baru longsor masih labil. Hindari area itu.", sumber: "longsor-saat-002" },
          { teks: "Tinggalkan rumah menuju tempat aman dan waspadai longsor susulan", nilai: 2, umpanBalik: "Tepat. Bila longsor terjadi di sekitar rumah, cepat tinggalkan rumah karena longsor susulan bisa terjadi.", sumber: "longsor-saat-006" },
          { teks: "Masuk rumah dan menunggu hujan reda", nilai: 0, umpanBalik: "Hujan setelah longsor bisa memicu longsor susulan. Jangan menunggu di rumah yang terancam.", sumber: "longsor-saat-004" },
        ],
      },
      {
        id: "l3",
        situasi: "Sirine peringatan longsor di desa berbunyi.",
        pilihan: [
          { teks: "Menuju zona evakuasi yang telah ditentukan", nilai: 2, umpanBalik: "Tepat. Ikuti sirine dan menuju zona evakuasi yang sudah ditetapkan.", sumber: "longsor-saat-003" },
          { teks: "Menunggu kabar dari kerabat di kota dulu", nilai: 0, umpanBalik: "Sirine adalah tanda untuk segera bergerak, bukan menunggu.", sumber: "longsor-saat-003" },
          { teks: "Berlari panik tanpa arah", nilai: 0, umpanBalik: "Panik membuat kita tidak bisa bertindak tepat. Tetap tenang dan ikuti jalur evakuasi.", sumber: "longsor-saat-005" },
        ],
      },
      {
        id: "l4",
        situasi: "Di tempat aman, Anda sadar tetangga lansia masih tertinggal di rumahnya yang jauh dari longsoran.",
        pilihan: [
          { teks: "Bila aman, bantu tetangga dan hubungi petugas setempat", nilai: 2, umpanBalik: "Tepat. Bantu orang lain bila memungkinkan, dan hubungi petugas di lingkungan Anda.", sumber: "longsor-saat-009" },
          { teks: "Memotong jalan lewat area yang baru longsor supaya cepat", nilai: 0, umpanBalik: "Area yang baru longsor masih labil. Pilih jalur yang aman.", sumber: "longsor-saat-002" },
          { teks: "Hanya mengabarkannya di media sosial", nilai: 1, umpanBalik: "Lebih baik langsung hubungi petugas di lingkungan tempat tinggal agar segera ditangani.", sumber: "longsor-saat-008" },
        ],
      },
    ],
  },
  {
    id: "erupsi-siaga",
    hazard: "gunung_api",
    judul: "Status gunung naik ke Siaga",
    ringkas: "Desa Anda di lereng gunung api aktif, dan abu mulai turun.",
    langkah: [
      {
        id: "e1",
        situasi: "PVMBG menaikkan status gunung di dekat desa Anda ke Level III (Siaga). Rumah Anda berada di kawasan yang diminta dikosongkan.",
        pilihan: [
          { teks: "Bersiap dan tinggalkan kawasan itu sesuai arahan petugas", nilai: 2, umpanBalik: "Tepat. Jangan berada di kawasan yang direkomendasikan untuk dikosongkan; ikuti arahan petugas dan PVMBG.", sumber: "gunung_api-saat-001" },
          { teks: "Tetap di rumah sampai benar-benar melihat awan panas", nilai: 0, umpanBalik: "Awan panas bergerak sangat cepat, jadi tidak ada waktu untuk menunggu melihatnya. Status Siaga adalah tanda untuk bersiap dan mengikuti arahan.", sumber: "gunung_api-sebelum-002" },
          { teks: "Naik ke arah puncak untuk merekam aktivitas gunung", nilai: 0, umpanBalik: "Mendekati puncak berarti masuk ke kawasan paling berbahaya: awan panas, lontaran batu pijar, dan gas beracun yang tidak berbau.", sumber: "gunung_api-sebelum-004" },
        ],
      },
      {
        id: "e2",
        situasi: "Saat bersiap berangkat, hujan abu mulai turun dan udara terasa berdebu.",
        pilihan: [
          { teks: "Tutup hidung dan mulut dengan masker atau kain basah, dan pakai kacamata pelindung", nilai: 2, umpanBalik: "Tepat. Masker atau kain basah melindungi pernapasan, kacamata pelindung melindungi mata dari abu.", sumber: "gunung_api-saat-004" },
          { teks: "Pakai lensa kontak supaya penglihatan tetap jelas", nilai: 0, umpanBalik: "Abu bisa terperangkap di bawah lensa kontak dan melukai mata. Pakai kacamata pelindung, bukan lensa kontak.", sumber: "gunung_api-saat-005" },
          { teks: "Menunggu di halaman terbuka sampai abu berhenti", nilai: 0, umpanBalik: "Hindari tempat terbuka saat hujan abu dan lindungi diri, termasuk dengan pakaian yang menutup tubuh.", sumber: "gunung_api-saat-003" },
        ],
      },
      {
        id: "e3",
        situasi: "Jalan tercepat ke tempat pengungsian menyusuri lembah sungai yang berhulu di gunung.",
        pilihan: [
          { teks: "Pilih jalur evakuasi resmi yang menjauhi lembah dan aliran sungai", nilai: 2, umpanBalik: "Tepat. Lembah dan aliran sungai adalah jalur awan panas dan lahar. Pakai jalur evakuasi yang sudah ditetapkan.", sumber: "gunung_api-saat-002" },
          { teks: "Tetap lewat lembah karena lebih cepat", nilai: 0, umpanBalik: "Jangan berada di lembah atau daerah aliran sungai saat gunung api meletus.", sumber: "gunung_api-saat-002" },
          { teks: "Berhenti di jembatan untuk melihat aliran sungai", nilai: 0, umpanBalik: "Aliran sungai yang berhulu di gunung bisa dilanda lahar sewaktu-waktu, apalagi saat hujan. Jauhi sungai.", sumber: "gunung_api-sesudah-004" },
        ],
      },
      {
        id: "e4",
        situasi: "Di pengungsian, sebuah pesan berantai mengabarkan bahwa warga sudah boleh pulang malam ini.",
        pilihan: [
          { teks: "Periksa status resmi di PVMBG atau MAGMA Indonesia dan tunggu arahan petugas", nilai: 2, umpanBalik: "Tepat. Status dan izin kembali hanya dari PVMBG dan petugas setempat, bukan dari pesan berantai.", sumber: "gunung_api-sebelum-001" },
          { teks: "Pulang malam ini juga untuk menjaga rumah", nilai: 0, umpanBalik: "Kembali ke kawasan yang masih harus dikosongkan sangat berbahaya. Tunggu arahan resmi.", sumber: "gunung_api-saat-001" },
          { teks: "Bagikan pesan itu ke grup keluarga dulu", nilai: 0, umpanBalik: "Pesan tanpa sumber resmi bisa membuat orang kembali ke kawasan berbahaya. Periksa dulu ke PVMBG.", sumber: "gunung_api-sebelum-001" },
        ],
      },
      {
        id: "e5",
        situasi: "Petugas mengizinkan warga pulang. Atap rumah Anda tertutup abu tebal.",
        pilihan: [
          { teks: "Bersihkan abu dari atap dengan hati-hati, memakai masker", nilai: 2, umpanBalik: "Tepat. Timbunan abu berat dan bisa merobohkan atap, apalagi bila basah terkena hujan.", sumber: "gunung_api-sesudah-003" },
          { teks: "Biarkan saja, nanti hujan membersihkannya", nilai: 0, umpanBalik: "Abu yang basah justru makin berat dan bisa merusak atau merobohkan atap.", sumber: "gunung_api-sesudah-003" },
          { teks: "Berkendara keliling desa untuk melihat kerusakan", nilai: 1, umpanBalik: "Hindari berkendara di daerah hujan abu: abu merusak mesin dan mengganggu pandangan. Utamakan rumah sendiri dulu.", sumber: "gunung_api-sesudah-002" },
        ],
      },
    ],
  },
  {
    id: "kemarau-elnino",
    hazard: "kekeringan",
    judul: "Kemarau panjang tahun El Niño",
    ringkas: "Musim hujan mundur, dan sumur mulai surut.",
    langkah: [
      {
        id: "kr1",
        situasi: "BMKG menyampaikan bahwa musim hujan di wilayah Anda mundur karena El Niño. Air sumur mulai turun.",
        pilihan: [
          { teks: "Isi cadangan air bersih selagi pasokan masih ada, untuk minum dan memasak", nilai: 2, umpanBalik: "Tepat. Isi cadangan saat pasokan masih tersedia dan simpan untuk kebutuhan prioritas.", sumber: "kekeringan-sebelum-007" },
          { teks: "Menunggu sampai sumur benar-benar kering", nilai: 0, umpanBalik: "Saat sumur sudah kering, cadangan sulit dicari dan banyak orang berebut. Bersiap lebih awal.", sumber: "kekeringan-sebelum-007" },
          { teks: "Tetap mencuci kendaraan setiap hari seperti biasa", nilai: 0, umpanBalik: "Gunakan air dengan bijak sepanjang waktu, terutama saat kemarau panjang.", sumber: "kekeringan-sebelum-002" },
        ],
      },
      {
        id: "kr2",
        situasi: "Keran di kamar mandi terus menetes dan pipa di halaman rembes.",
        pilihan: [
          { teks: "Perbaiki keran dan pipa yang bocor sekarang", nilai: 2, umpanBalik: "Tepat. Kebocoran kecil membuang banyak air dalam sebulan. Perbaiki segera.", sumber: "kekeringan-sebelum-008" },
          { teks: "Taruh ember di bawah keran saja", nilai: 1, umpanBalik: "Menampung tetesan lebih baik daripada membiarkannya, tetapi memperbaiki kebocoran jauh lebih hemat.", sumber: "kekeringan-sebelum-008" },
          { teks: "Biarkan, tetesannya kecil", nilai: 0, umpanBalik: "Tetesan kecil terus-menerus tetap membuang air yang sangat berharga saat kemarau.", sumber: "kekeringan-saat-003" },
        ],
      },
      {
        id: "kr3",
        situasi: "Air di tandon tinggal sedikit, dan kiriman berikutnya belum pasti.",
        pilihan: [
          { teks: "Utamakan air untuk minum dan memasak, dan atur jadwal pemakaiannya", nilai: 2, umpanBalik: "Tepat. Prioritaskan kebutuhan pokok, lalu atur jadwal agar air cukup untuk keluarga.", sumber: "kekeringan-saat-005" },
          { teks: "Menyiram tanaman dengan air bersih dari tandon", nilai: 1, umpanBalik: "Untuk tanaman, pakai ulang air bekas yang masih layak, misalnya air cucian sayur.", sumber: "kekeringan-saat-006" },
          { teks: "Mandi berendam supaya segar", nilai: 0, umpanBalik: "Saat air terbatas, mandi berendam menghabiskan cadangan untuk minum dan memasak.", sumber: "kekeringan-saat-002" },
        ],
      },
      {
        id: "kr4",
        situasi: "Sebuah pesan berantai menawarkan pembagian air gratis, tetapi meminta biaya pendaftaran lewat transfer.",
        pilihan: [
          { teks: "Periksa ke kanal resmi pemerintah daerah atau BPBD, dan laporkan kekurangan air ke pihak berwenang", nilai: 2, umpanBalik: "Tepat. Bantuan air bersih resmi dimintakan ke pihak berwenang dan diumumkan lewat kanal resmi, tanpa biaya pendaftaran.", sumber: "kekeringan-saat-001" },
          { teks: "Transfer biayanya agar kebagian", nilai: 0, umpanBalik: "Meminta uang untuk bantuan adalah ciri penipuan. Simak informasi dari sumber resmi pemerintah.", sumber: "kekeringan-saat-004" },
          { teks: "Bagikan ke tetangga supaya mereka juga daftar", nilai: 0, umpanBalik: "Membagikan pesan penipuan membuat lebih banyak orang tertipu. Periksa dulu ke sumber resmi.", sumber: "kekeringan-saat-004" },
        ],
      },
      {
        id: "kr5",
        situasi: "Hujan pertama akhirnya datang. RT mengajak warga bersiap agar kemarau berikutnya tidak separah ini.",
        pilihan: [
          { teks: "Buat lubang biopori atau sumur resapan bersama warga", nilai: 2, umpanBalik: "Tepat. Biopori dan sumur resapan membuat air hujan meresap ke tanah dan mengisi kembali air tanah.", sumber: "kekeringan-sesudah-001" },
          { teks: "Hanya menampung air hujan di ember untuk dipakai minggu ini", nilai: 1, umpanBalik: "Menampung air hujan berguna; tandon penampung di pekarangan dan resapan bersama warga memberi manfaat lebih lama.", sumber: "kekeringan-sebelum-004" },
          { teks: "Menyemen seluruh halaman agar tidak becek", nilai: 0, umpanBalik: "Halaman yang tertutup semen membuat air hujan tidak meresap, sehingga air tanah makin sulit pulih.", sumber: "kekeringan-sesudah-001" },
        ],
      },
    ],
  },
  {
    id: "rob-purnama",
    hazard: "gelombang_abrasi",
    judul: "Rob saat purnama dan gelombang tinggi",
    ringkas: "Kampung pesisir, air laut naik masuk ke jalan dan rumah.",
    langkah: [
      {
        id: "r1",
        situasi: "Malam purnama. BMKG memperingatkan gelombang tinggi dan banjir pesisir (rob) untuk pantai di dekat rumah Anda.",
        pilihan: [
          { teks: "Pindahkan barang berharga ke tempat tinggi dan siapkan rencana mengungsi", nilai: 2, umpanBalik: "Tepat. Rob paling parah saat pasang purnama bertepatan dengan gelombang tinggi. Amankan barang dan siapkan rencana sebelum air naik.", sumber: "gelombang_abrasi-saat-006" },
          { teks: "Pergi ke pantai untuk melihat ombak besar", nilai: 0, umpanBalik: "Saat gelombang tinggi, jauhi pantai. Ombak bisa menyapu orang di tepi pantai.", sumber: "gelombang_abrasi-saat-001" },
          { teks: "Abaikan, rob biasanya hanya sebentar", nilai: 0, umpanBalik: "Rob yang bertepatan dengan gelombang tinggi bisa jauh lebih dalam dari biasanya. Pantau peringatan BMKG.", sumber: "gelombang_abrasi-sebelum-015" },
        ],
      },
      {
        id: "r2",
        situasi: "Air laut mulai masuk ke jalan dan teras. Lampu dan stopkontak di lantai bawah masih menyala.",
        pilihan: [
          { teks: "Matikan listrik sesuai arahan dan jangan menyentuh alat listrik saat berdiri di air", nilai: 2, umpanBalik: "Tepat. Air dan listrik berbahaya. Matikan jaringan listrik bila diminta petugas dan cabut alat yang tersambung.", sumber: "gelombang_abrasi-saat-002" },
          { teks: "Mencabut steker sambil berdiri di genangan", nilai: 0, umpanBalik: "Jangan menyentuh peralatan listrik saat berdiri di air: risiko tersengat listrik.", sumber: "gelombang_abrasi-saat-002" },
          { teks: "Biarkan listrik menyala supaya rumah tetap terang", nilai: 1, umpanBalik: "Penerangan penting, tetapi pakai senter. Listrik yang menyala di rumah tergenang berisiko tersengat.", sumber: "gelombang_abrasi-saat-002" },
        ],
      },
      {
        id: "r3",
        situasi: "Air terus naik. Mobil keluarga terparkir di jalan yang mulai tergenang.",
        pilihan: [
          { teks: "Tinggalkan mobil dan menuju tempat yang lebih tinggi bersama keluarga", nilai: 2, umpanBalik: "Tepat. Jangan mengemudi di wilayah banjir; mobil dapat tersapu arus. Utamakan keselamatan orang.", sumber: "gelombang_abrasi-saat-004" },
          { teks: "Mengemudikan mobil menerobos genangan", nilai: 0, umpanBalik: "Air yang dalam dan arus dapat menyeret mobil. Jangan mengemudi di wilayah banjir.", sumber: "gelombang_abrasi-saat-004" },
          { teks: "Berjalan memotong lewat saluran air yang tertutup genangan", nilai: 0, umpanBalik: "Waspadai arus bawah, saluran air, dan kubangan yang tidak terlihat di bawah genangan.", sumber: "gelombang_abrasi-saat-005" },
        ],
      },
      {
        id: "r4",
        situasi: "Di tempat pengungsian, sebuah pesan berantai menyebut tanggul pantai jebol dan air akan setinggi atap malam ini.",
        pilihan: [
          { teks: "Tetap di tempat aman dan cek kebenarannya ke perangkat desa atau BPBD", nilai: 2, umpanBalik: "Tepat. Ikuti informasi petugas. Pesan berantai yang menakutkan tanpa sumber sering tidak benar dan membuat panik.", sumber: "gelombang_abrasi-sebelum-009" },
          { teks: "Kembali ke rumah untuk menyelamatkan barang sebelum air naik", nilai: 0, umpanBalik: "Kembali ke rumah hanya setelah dinyatakan aman oleh pihak berwenang.", sumber: "gelombang_abrasi-sesudah-001" },
          { teks: "Bagikan ke grup keluarga agar semua bersiap", nilai: 0, umpanBalik: "Membagikan kabar tanpa sumber dapat menimbulkan kepanikan. Periksa dulu ke petugas setempat.", sumber: "gelombang_abrasi-sebelum-009" },
        ],
      },
      {
        id: "r5",
        situasi: "Air sudah surut dan petugas mengizinkan warga pulang. Lantai rumah berlumpur dan ada makanan yang terendam.",
        pilihan: [
          { teks: "Bersihkan rumah, buang makanan yang terendam, dan cuci tangan dengan sabun", nilai: 2, umpanBalik: "Tepat. Air rob bisa tercemar. Buang makanan yang terkena air dan jaga kebersihan diri.", sumber: "gelombang_abrasi-sesudah-005" },
          { teks: "Bermain di genangan sisa bersama anak-anak", nilai: 0, umpanBalik: "Air genangan bisa tercemar zat berbahaya dan berisiko kesetrum. Hindari air genangan.", sumber: "gelombang_abrasi-sesudah-004" },
          { teks: "Langsung masuk rumah tanpa memeriksa kerusakan", nilai: 1, umpanBalik: "Berhati-hatilah saat memasuki bangunan yang terendam: fondasi atau lantai bisa rusak tanpa terlihat.", sumber: "gelombang_abrasi-sesudah-003" },
        ],
      },
    ],
  },
];

export const SKENARIO_BY_ID: Record<string, Skenario> = Object.fromEntries(SKENARIO.map((s) => [s.id, s]));
