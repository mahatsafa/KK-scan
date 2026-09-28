// Parser teks OCR hasil bacaan dokumen KK menjadi field-field terstruktur.
//
// Pendekatan: cari semua angka 16 digit di teks. Angka 16-digit PERTAMA
// diasumsikan No. KK (selalu muncul di bagian atas dokumen). Setiap angka
// 16-digit BERIKUTNYA dianggap NIK satu anggota keluarga, dan baris teks
// tempat NIK itu ditemukan dianggap berisi data satu orang.
//
// Field dengan kosakata tetap (jenis kelamin, agama, status perkawinan,
// status hubungan, kewarganegaraan) dicari lewat daftar kata kunci. Field
// bebas teks (pendidikan, pekerjaan, nama orang tua) SENGAJA dikosongkan,
// daripada menebak dan salah - lebih aman untuk dilengkapi manual.

const KATA_AGAMA = ['ISLAM', 'KRISTEN', 'KATOLIK', 'HINDU', 'BUDDHA', 'KONGHUCU'];
const KATA_KAWIN = ['BELUM KAWIN', 'CERAI HIDUP', 'CERAI MATI', 'KAWIN'];
const KATA_HUBUNGAN = [
  'KEPALA KELUARGA', 'SUAMI', 'ISTRI', 'ANAK', 'MENANTU', 'CUCU',
  'ORANG TUA', 'MERTUA', 'FAMILI LAIN', 'PEMBANTU', 'LAINNYA',
];

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

function cariNilaiSetelahLabel(baris, label) {
  const found = baris.find((b) => b.toUpperCase().includes(label));
  if (!found) return '';
  const idx = found.toUpperCase().indexOf(label);
  let sisa = found.slice(idx + label.length);
  sisa = sisa.replace(/^[:\s.]+/, '').trim();
  return sisa;
}

export function parseTeksKK(teksMentah, daftarKelurahan = []) {
  const semuaNikMatch = [...teksMentah.matchAll(/\b\d{16}\b/g)];

  if (semuaNikMatch.length === 0) {
    return { noKK: '', kepalaKeluarga: '', alamat: '', kelurahanId: '', rt: '', rw: '', anggota: [] };
  }

  const noKK = semuaNikMatch[0][0];
  const baris = teksMentah
    .split('\n')
    .map((b) => b.trim())
    .filter(Boolean);

  const kepalaKeluarga = cariNilaiSetelahLabel(baris, 'NAMA KEPALA KELUARGA');
  const alamat = cariNilaiSetelahLabel(baris, 'ALAMAT');
  const kelurahanTeks =
    cariNilaiSetelahLabel(baris, 'DESA/KELURAHAN') ||
    cariNilaiSetelahLabel(baris, 'KELURAHAN') ||
    cariNilaiSetelahLabel(baris, 'DESA');

  const kelurahanCocok = daftarKelurahan.find(
    (k) => k.nama.trim().toUpperCase() === kelurahanTeks.trim().toUpperCase()
  );

  const rtRwMatch =
    teksMentah.match(/RT\s*\/\s*RW\s*[:.]?\s*(\d{1,3})\s*\/\s*(\d{1,3})/i) ||
    teksMentah.match(/RT\s*[:.]?\s*(\d{1,3})\s*\/?\s*RW\s*[:.]?\s*(\d{1,3})/i);

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

    // Tanggal lahir: pola dd-mm-yyyy cukup pasti. Tempat lahir: teks di antara
    // kata jenis kelamin dan tanggal (kalau keduanya ketemu).
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

  return {
    noKK,
    kepalaKeluarga,
    alamat,
    kelurahanId: kelurahanCocok?.id || '',
    rt: rtRwMatch ? rtRwMatch[1].padStart(3, '0') : '',
    rw: rtRwMatch ? rtRwMatch[2].padStart(3, '0') : '',
    anggota,
  };
}
