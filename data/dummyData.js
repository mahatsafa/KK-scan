// Data dummy untuk Kartu Keluarga (KK).
//
// Semua data di bawah ini DIGENERATE OTOMATIS dengan seed tetap (lihat SEED),
// jadi hasilnya selalu sama setiap kali aplikasi dijalankan — bukan disimpan
// sebagai ratusan objek yang diketik manual.
//
// Saat nanti sudah terhubung ke database/API asli, cukup ganti isi fungsi
// getRTList(), getRWList(), dan searchKK() di bagian bawah file ini supaya
// mengambil data dari sumber sungguhan. Komponen UI (WilayahFilter, KKList,
// KKRow, KKDetailModal) tidak perlu diubah karena hanya bergantung pada
// bentuk data yang dikembalikan tiga fungsi tersebut.

const SEED = 20260926;
const TAHUN_REFERENSI = 2026;

// ---------- Bank data nama & atribut ----------

const NAMA_DEPAN_LAKI = [
  'Ahmad', 'Budi', 'Agus', 'Dedi', 'Eko', 'Fajar', 'Gunawan', 'Hendra', 'Irfan', 'Joko',
  'Kurniawan', 'Lukman', 'Muhammad', 'Nurdin', 'Oki', 'Prasetyo', 'Rudi', 'Slamet', 'Tono', 'Umar',
  'Wahyu', 'Yusuf', 'Zainal', 'Bambang', 'Candra',
];

const NAMA_DEPAN_PEREMPUAN = [
  'Ani', 'Bunga', 'Citra', 'Dewi', 'Endang', 'Fitri', 'Gita', 'Hesti', 'Indah', 'Juwita',
  'Kartika', 'Lestari', 'Mega', 'Nurul', 'Oktavia', 'Puspita', 'Ratna', 'Sri', 'Titik', 'Umi',
  'Wati', 'Yuni', 'Zahra', 'Anisa', 'Diana',
];

const NAMA_BELAKANG = [
  'Santoso', 'Wijaya', 'Kusuma', 'Setiawan', 'Saputra', 'Pratama', 'Hidayat', 'Nugroho', 'Susanto', 'Firmansyah',
  'Handoko', 'Purnomo', 'Prasetya', 'Wibowo', 'Rahayu', 'Lestari', 'Anggraini', 'Safitri', 'Rahmawati',
  'Fauzi', 'Suryadi', 'Kurniawan', 'Permana', 'Ramadhan', 'Wulandari',
];

const TEMPAT_LAHIR = [
  'Malang', 'Surabaya', 'Blitar', 'Kediri', 'Jember', 'Madiun', 'Pasuruan',
  'Probolinggo', 'Sidoarjo', 'Mojokerto', 'Batu', 'Tulungagung',
];

const NAMA_JALAN = [
  'Jl. Mawar', 'Jl. Melati', 'Jl. Anggrek', 'Jl. Kenanga', 'Jl. Flamboyan',
  'Jl. Cempaka', 'Jl. Dahlia', 'Jl. Teratai', 'Dusun Krajan', 'Dusun Sumberan',
];

const PENDIDIKAN_DEWASA = ['Tamat SD/Sederajat', 'SMP/Sederajat', 'SMA/Sederajat', 'D3/Sederajat', 'S1', 'S2'];

const PEKERJAAN_DEWASA = [
  'PNS', 'Karyawan Swasta', 'Wiraswasta', 'Petani/Pekebun', 'Buruh Harian Lepas',
  'Guru', 'Pedagang', 'Ibu Rumah Tangga', 'Belum/Tidak Bekerja',
];

// ---------- Data wilayah ----------

const KELURAHAN_LIST = [
  { id: 'kel-01', nama: 'Sukamaju', kecamatan: 'Kecamatan Sukasari', kabupatenKota: 'Kabupaten Makmur', provinsi: 'Jawa Timur', kodePos: '65111', kodeWilayah: '357301' },
  { id: 'kel-02', nama: 'Sukajadi', kecamatan: 'Kecamatan Sukasari', kabupatenKota: 'Kabupaten Makmur', provinsi: 'Jawa Timur', kodePos: '65112', kodeWilayah: '357302' },
  { id: 'kel-03', nama: 'Sumber Mulyo', kecamatan: 'Kecamatan Sumberrejo', kabupatenKota: 'Kabupaten Makmur', provinsi: 'Jawa Timur', kodePos: '65113', kodeWilayah: '357303' },
];

const DAFTAR_RT = ['001', '002', '003'];
const DAFTAR_RW = ['001', '002'];

// ---------- PRNG sederhana (mulberry32) supaya data konsisten di setiap run ----------

function buatRng(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function acak(rng, daftar) {
  return daftar[Math.floor(rng() * daftar.length)];
}

// ---------- Helper pembuat data individu ----------

function buatNamaLengkap(rng, jenisKelamin) {
  const depan = jenisKelamin === 'L' ? acak(rng, NAMA_DEPAN_LAKI) : acak(rng, NAMA_DEPAN_PEREMPUAN);
  return `${depan} ${acak(rng, NAMA_BELAKANG)}`;
}

function buatTanggalLahir(rng, umur) {
  const tahunLahir = TAHUN_REFERENSI - umur;
  const bulan = 1 + Math.floor(rng() * 12);
  const tanggal = 1 + Math.floor(rng() * 28);
  return `${tahunLahir}-${String(bulan).padStart(2, '0')}-${String(tanggal).padStart(2, '0')}`;
}

function pilihAgama(rng) {
  const r = rng();
  if (r < 0.85) return 'Islam';
  if (r < 0.9) return 'Kristen';
  if (r < 0.94) return 'Katolik';
  if (r < 0.97) return 'Hindu';
  if (r < 0.99) return 'Buddha';
  return 'Konghucu';
}

function pilihPendidikan(rng, umur) {
  if (umur < 6) return 'Tidak/Belum Sekolah';
  if (umur < 12) return 'SD/Sederajat';
  if (umur < 15) return 'SMP/Sederajat';
  if (umur < 18) return 'SMA/Sederajat';
  return acak(rng, PENDIDIKAN_DEWASA);
}

function pilihPekerjaan(rng, umur) {
  if (umur < 6) return 'Belum/Tidak Bekerja';
  if (umur < 18) return 'Pelajar/Mahasiswa';
  return acak(rng, PEKERJAAN_DEWASA);
}

// NIK fiktif namun mengikuti format 16 digit: 6 digit kode wilayah +
// tanggal lahir (tanggal ditambah 40 untuk perempuan) + 4 digit acak.
function buatNIK(rng, kodeWilayah, tanggalLahir, jenisKelamin) {
  const [, bulan, tanggal] = tanggalLahir.split('-');
  const hariEncoded = jenisKelamin === 'P' ? Number(tanggal) + 40 : Number(tanggal);
  const dd = String(hariEncoded).padStart(2, '0');
  const yy = tanggalLahir.slice(2, 4);
  const urut = String(1000 + Math.floor(rng() * 9000));
  return `${kodeWilayah}${dd}${bulan}${yy}${urut}`;
}

// No. KK fiktif, juga 16 digit: 6 digit kode wilayah + 6 digit acak +
// 4 digit nomor urut (dijamin unik karena index selalu bertambah).
function buatNoKK(rng, kodeWilayah, index) {
  const tengah = String(100000 + Math.floor(rng() * 900000));
  const urut = String(index).padStart(4, '0');
  return `${kodeWilayah}${tengah}${urut}`;
}

function buatNomorPaspor(rng) {
  const huruf = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(rng() * 26)];
  return `${huruf}${1000000 + Math.floor(rng() * 9000000)}`;
}

function buatNomorKitas(rng) {
  const angka = Math.floor(rng() * 900000000000) + 100000000000;
  return `2C1JI${angka}`;
}

function buatOrang(rng, opsi) {
  const { jenisKelamin, umur, statusHubungan, statusPerkawinan, namaAyah, namaIbu, kodeWilayah } = opsi;
  const tanggalLahir = buatTanggalLahir(rng, umur);
  const isWNA = rng() < 0.03;

  return {
    namaLengkap: buatNamaLengkap(rng, jenisKelamin),
    nik: buatNIK(rng, kodeWilayah, tanggalLahir, jenisKelamin),
    jenisKelamin,
    tempatLahir: acak(rng, TEMPAT_LAHIR),
    tanggalLahir,
    agama: pilihAgama(rng),
    pendidikanTerakhir: pilihPendidikan(rng, umur),
    pekerjaan: pilihPekerjaan(rng, umur),
    statusPerkawinan,
    statusHubungan,
    kewarganegaraan: isWNA ? 'WNA' : 'WNI',
    nomorPaspor: isWNA ? buatNomorPaspor(rng) : '',
    nomorKitap: isWNA ? buatNomorKitas(rng) : '',
    namaAyah,
    namaIbu,
  };
}

// Menyusun satu keluarga: kepala keluarga (wajib), pasangan (opsional),
// dan sejumlah anak, sampai total anggota 2-5 orang.
function generateKeluarga(rng, kel) {
  const totalAnggota = 2 + Math.floor(rng() * 4); // 2-5
  const kepalaGender = rng() < 0.85 ? 'L' : 'P';
  const kepalaUmur = 30 + Math.floor(rng() * 35); // 30-64
  const adaPasangan = rng() < 0.75;

  let statusKepala;
  if (adaPasangan) {
    statusKepala = 'Kawin';
  } else {
    const r = rng();
    statusKepala = r < 0.5 ? 'Cerai Mati' : r < 0.8 ? 'Cerai Hidup' : 'Belum Kawin';
  }

  const kepala = buatOrang(rng, {
    jenisKelamin: kepalaGender,
    umur: kepalaUmur,
    statusHubungan: 'Kepala Keluarga',
    statusPerkawinan: statusKepala,
    namaAyah: buatNamaLengkap(rng, 'L'),
    namaIbu: buatNamaLengkap(rng, 'P'),
    kodeWilayah: kel.kodeWilayah,
  });

  const anggota = [kepala];
  let sisaSlot = totalAnggota - 1;
  let namaPasangan = null;

  if (adaPasangan && sisaSlot > 0) {
    const pasangan = buatOrang(rng, {
      jenisKelamin: kepalaGender === 'L' ? 'P' : 'L',
      umur: Math.max(20, kepalaUmur - 5 + Math.floor(rng() * 10)),
      statusHubungan: kepalaGender === 'L' ? 'Istri' : 'Suami',
      statusPerkawinan: 'Kawin',
      namaAyah: buatNamaLengkap(rng, 'L'),
      namaIbu: buatNamaLengkap(rng, 'P'),
      kodeWilayah: kel.kodeWilayah,
    });
    anggota.push(pasangan);
    namaPasangan = pasangan.namaLengkap;
    sisaSlot--;
  }

  while (sisaSlot > 0) {
    const maksUmurAnak = Math.max(0, kepalaUmur - 18);
    const umurAnak = Math.floor(rng() * (maksUmurAnak + 1));
    anggota.push(
      buatOrang(rng, {
        jenisKelamin: rng() < 0.5 ? 'L' : 'P',
        umur: umurAnak,
        statusHubungan: 'Anak',
        statusPerkawinan: umurAnak >= 19 && rng() < 0.25 ? 'Kawin' : 'Belum Kawin',
        namaAyah: kepalaGender === 'L' ? kepala.namaLengkap : namaPasangan || buatNamaLengkap(rng, 'L'),
        namaIbu: kepalaGender === 'P' ? kepala.namaLengkap : namaPasangan || buatNamaLengkap(rng, 'P'),
        kodeWilayah: kel.kodeWilayah,
      })
    );
    sisaSlot--;
  }

  return { kepala, anggota };
}

function generateSemuaData() {
  const rng = buatRng(SEED);
  const semuaKK = [];
  let index = 1;

  for (const kel of KELURAHAN_LIST) {
    for (const rt of DAFTAR_RT) {
      for (const rw of DAFTAR_RW) {
        const jumlahKK = 5 + Math.floor(rng() * 6); // 5-10 KK per RT/RW
        for (let i = 0; i < jumlahKK; i++) {
          const { kepala, anggota } = generateKeluarga(rng, kel);
          const jalan = acak(rng, NAMA_JALAN);
          const nomorRumah = 1 + Math.floor(rng() * 60);

          semuaKK.push({
            id: `kk-${String(index).padStart(4, '0')}`,
            noKK: buatNoKK(rng, kel.kodeWilayah, index),
            kelurahanId: kel.id,
            namaKelurahan: kel.nama,
            rt,
            rw,
            alamat: `${jalan} No. ${nomorRumah}`,
            kecamatan: kel.kecamatan,
            kabupatenKota: kel.kabupatenKota,
            provinsi: kel.provinsi,
            kodePos: kel.kodePos,
            kepalaKeluarga: kepala.namaLengkap,
            desil: 1 + Math.floor(rng() * 10),
            anggotaKeluarga: anggota,
          });

          index++;
        }
      }
    }
  }

  return semuaKK;
}

// ---------- Data siap pakai + fungsi query ----------
// Ganti isi tiga fungsi di bawah ini kalau sudah pindah ke database/API asli.

export const daftarKelurahan = KELURAHAN_LIST;
export const daftarKK = generateSemuaData();

export function getRTList(kelurahanId) {
  const set = new Set(daftarKK.filter((kk) => kk.kelurahanId === kelurahanId).map((kk) => kk.rt));
  return Array.from(set).sort();
}

export function getRWList(kelurahanId, rt) {
  const set = new Set(
    daftarKK.filter((kk) => kk.kelurahanId === kelurahanId && kk.rt === rt).map((kk) => kk.rw)
  );
  return Array.from(set).sort();
}

export function searchKK(kelurahanId, rt, rw) {
  return daftarKK.filter((kk) => kk.kelurahanId === kelurahanId && kk.rt === rt && kk.rw === rw);
}
