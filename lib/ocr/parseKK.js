// Parser teks OCR hasil bacaan dokumen KK menjadi field-field terstruktur.
//
// Header KK berbentuk 2 kolom (kiri: kepala keluarga, alamat, RT/RW, desa;
// kanan: kecamatan, kabupaten, kode pos, provinsi), jadi OCR sering
// menggabungkan keduanya dalam satu baris. Karena itu setiap nilai dipotong
// di label berikutnya yang ditemukan pada baris yang sama.
//
// Angka 16-digit PERTAMA = No. KK, angka 16-digit berikutnya = NIK anggota
// (satu baris = satu orang). Field yang tidak yakin sengaja dikosongkan.

const KATA_AGAMA = ['ISLAM', 'KRISTEN', 'KATOLIK', 'HINDU', 'BUDDHA', 'KONGHUCU'];
const KATA_KAWIN = ['BELUM KAWIN', 'CERAI HIDUP', 'CERAI MATI', 'KAWIN'];
const KATA_HUBUNGAN = [
  'KEPALA KELUARGA', 'SUAMI', 'ISTRI', 'ANAK', 'MENANTU', 'CUCU',
  'ORANG TUA', 'MERTUA', 'FAMILI LAIN', 'PEMBANTU', 'LAINNYA',
];

// Pola label header (toleran terhadap salah baca "/" jadi "I" atau "|")
const LABEL = {
  kepala: /NAMA\s+KEPALA\s+KELUARGA/i,
  alamat: /ALAMAT/i,
  rtrw: /RT\s*[/|I]\s*RW/i,
  kelurahan: /DESA\s*[/|I]\s*KELURAHAN|KELURAHAN/i,
  kecamatan: /KECAMATAN/i,
  kabkota: /KABUPATEN\s*[/|I]\s*KOTA/i,
  kodepos: /KODE\s*POS/i,
  provinsi: /PROVINSI/i,
};

function cariKataPertama(teks, daftarKata) {
  const teksUpper = teks.toUpperCase();
  for (const kata of daftarKata) {
    if (teksUpper.includes(kata)) return kata;
  }
  return '';
}

function toTitleCase(teks) {
  if (!teks) return '';
  return teks
    .toLowerCase()
    .split(' ')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');
}

function bersihkanNama(teks) {
  return teks
    .replace(/[^A-Za-z\s'.-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function bersihkanNilai(teks) {
  return teks
    .replace(/^[\s:;|!.=-]+/, '') // pemisah di depan
    .replace(/^\d\s+(?=[A-Za-z])/, '') // ":" yang salah dibaca jadi angka tunggal
    .replace(/[\s:;|]+$/, '') // pemisah di belakang
    .replace(/\s+/g, ' ')
    .trim();
}

// Ambil nilai setelah sebuah label, dipotong di label lain pada baris yang sama.
function ambilNilai(baris, kunci) {
  for (const b of baris) {
    const m = b.match(LABEL[kunci]);
    if (!m) continue;

    let sisa = b.slice(m.index + m[0].length);
    let potong = sisa.length;
    for (const [k, pola] of Object.entries(LABEL)) {
      if (k === kunci) continue;
      const mm = sisa.match(pola);
      if (mm && mm.index < potong) potong = mm.index;
    }
    const nilai = bersihkanNilai(sisa.slice(0, potong));
    if (nilai) return nilai;
  }
  return '';
}

export function parseTeksKK(teksMentah, daftarKelurahan = []) {
  const kosong = {
    noKK: '', kepalaKeluarga: '', alamat: '', kelurahanId: '', kelurahanBaru: null,
    rt: '', rw: '', anggota: [],
  };

  const semuaNikMatch = [...teksMentah.matchAll(/\b\d{16}\b/g)];
  if (semuaNikMatch.length === 0) return kosong;

  const noKK = semuaNikMatch[0][0];
  const baris = teksMentah
    .split('\n')
    .map((b) => b.trim())
    .filter(Boolean);

  let kepalaKeluarga = ambilNilai(baris, 'kepala');
  const alamat = ambilNilai(baris, 'alamat');
  const kelurahanTeks = ambilNilai(baris, 'kelurahan');
  const kecamatan = ambilNilai(baris, 'kecamatan');
  const kabupatenKota = ambilNilai(baris, 'kabkota');
  const provinsi = ambilNilai(baris, 'provinsi');
  const kodePosTeks = ambilNilai(baris, 'kodepos');
  const kodePos = (kodePosTeks.match(/\d{5}/) || [''])[0];

  // RT/RW: ambil dua angka dari nilai setelah label; cadangan: pola bebas di seluruh teks
  let rt = '';
  let rw = '';
  const nilaiRtRw = ambilNilai(baris, 'rtrw');
  const angkaRtRw = nilaiRtRw.match(/(\d{1,3})\D{0,6}(\d{1,3})/);
  if (angkaRtRw) {
    rt = angkaRtRw[1];
    rw = angkaRtRw[2];
  } else {
    const cadangan =
      teksMentah.match(/RT\s*[/|I]\s*RW\s*[:;.]?\s*(\d{1,3})\s*[/|]\s*(\d{1,3})/i) ||
      teksMentah.match(/RT\s*[:.]?\s*(\d{1,3})\s*[/|]?\s*RW\s*[:.]?\s*(\d{1,3})/i);
    if (cadangan) {
      rt = cadangan[1];
      rw = cadangan[2];
    }
  }

  const kelurahanCocok = kelurahanTeks
    ? daftarKelurahan.find((k) => k.nama.trim().toUpperCase() === kelurahanTeks.toUpperCase())
    : null;

  const kelurahanBaru =
    kelurahanTeks && !kelurahanCocok
      ? {
          nama: toTitleCase(kelurahanTeks),
          kecamatan: toTitleCase(kecamatan),
          kabupatenKota: toTitleCase(kabupatenKota),
          provinsi: toTitleCase(provinsi),
          kodePos,
        }
      : null;

  const anggota = [];

  for (const barisIni of baris) {
    const nikMatch = barisIni.match(/\b\d{16}\b/);
    if (!nikMatch || nikMatch[0] === noKK) continue;

    const nik = nikMatch[0];
    const idxNik = barisIni.indexOf(nik);
    const sebelumNIK = barisIni.slice(0, idxNik);

    const jenisKelamin = /PEREMPUAN/i.test(barisIni) ? 'P' : /\bLAKI/i.test(barisIni) ? 'L' : '';
    const agama = cariKataPertama(barisIni, KATA_AGAMA);
    const statusPerkawinan = cariKataPertama(barisIni, KATA_KAWIN);
    const statusHubungan = cariKataPertama(barisIni, KATA_HUBUNGAN);
    const kewarganegaraan = /\bWNA\b/.test(barisIni.toUpperCase()) ? 'WNA' : 'WNI';

    let tanggalLahir = '';
    let tempatLahir = '';
    const tglMatch = barisIni.match(/\b(\d{2})[-/.](\d{2})[-/.](\d{4})\b/);
    if (tglMatch) {
      tanggalLahir = `${tglMatch[3]}-${tglMatch[2]}-${tglMatch[1]}`;
      const sesudahNIK = barisIni.slice(idxNik + 16, tglMatch.index);
      const sesudahGender = sesudahNIK.replace(/PEREMPUAN|LAKI-LAKI|LAKI/i, ' ');
      tempatLahir = toTitleCase(bersihkanNama(sesudahGender));
    }

    anggota.push({
      namaLengkap: bersihkanNama(sebelumNIK),
      nik,
      jenisKelamin,
      tempatLahir,
      tanggalLahir,
      agama: toTitleCase(agama),
      pendidikanTerakhir: '',
      pekerjaan: '',
      statusPerkawinan: toTitleCase(statusPerkawinan),
      statusHubungan: toTitleCase(statusHubungan),
      kewarganegaraan,
      nomorPaspor: '',
      nomorKitap: '',
      namaAyah: '',
      namaIbu: '',
    });
  }

  // Cadangan: kalau label kepala keluarga gagal terbaca, ambil dari anggota berstatus kepala keluarga
  if (!kepalaKeluarga) {
    const kepala = anggota.find((a) => a.statusHubungan === 'Kepala Keluarga');
    if (kepala) kepalaKeluarga = kepala.namaLengkap;
  }

  return {
    noKK,
    kepalaKeluarga,
    alamat,
    kelurahanId: kelurahanCocok?.id || '',
    kelurahanBaru,
    rt: rt ? rt.padStart(3, '0') : '',
    rw: rw ? rw.padStart(3, '0') : '',
    anggota,
  };
}
