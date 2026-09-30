// Parser teks OCR hasil bacaan dokumen KK menjadi field-field terstruktur.
//
// Dokumen KK asli punya:
//  - Header 2 kolom (kiri: kepala keluarga, alamat, RT/RW, desa; kanan:
//    kecamatan, kabupaten, kode pos, provinsi) -> nilai dipotong di label lain
//    pada baris yang sama.
//  - TABEL 1 (ada NIK): nama, NIK, jenis kelamin, tempat/tgl lahir, agama,
//    pendidikan, pekerjaan, golongan darah.
//  - TABEL 2 (tanpa NIK): status perkawinan, tgl perkawinan, status hubungan,
//    kewarganegaraan, no. paspor, no. KITAS/KITAP, nama ayah, nama ibu.
//    Baris tabel 2 dicocokkan ke anggota berdasarkan URUTAN baris.
//
// Prinsip: kalau tidak yakin, kosongkan field-nya daripada menebak salah -
// admin yang mengoreksi manual. Tapi JANGAN sampai satu baris anggota hilang
// total hanya karena satu sub-field-nya gagal terbaca (mis. NIK rusak) -
// baris itu tetap dimunculkan dengan field yang bisa dipastikan saja.

const KATA_AGAMA = ['ISLAM', 'KRISTEN', 'KATOLIK', 'HINDU', 'BUDDHA', 'KONGHUCU'];
const KATA_KAWIN = ['BELUM KAWIN', 'CERAI HIDUP', 'CERAI MATI', 'KAWIN'];
const KATA_HUBUNGAN = [
  'KEPALA KELUARGA', 'SUAMI', 'ISTRI', 'ISTERI', 'ANAK', 'MENANTU', 'CUCU',
  'ORANG TUA', 'MERTUA', 'FAMILI LAIN', 'PEMBANTU', 'LAINNYA',
];

// Jenjang pendidikan resmi di KK (urutan penting: yang paling spesifik dulu).
// Sufiks "I"/"II"/"III" kadang hilang dibaca OCR karena nempel garis kolom,
// jadi dibuat opsional di beberapa pola.
const PENDIDIKAN = [
  [/TIDAK\s*\/?\s*BELUM\s+SEKOLAH/, 'Tidak/Belum Sekolah'],
  [/BELUM\s+TAMAT\s+SD(?:\s*\/?\s*SEDERAJAT)?/, 'Belum Tamat SD/Sederajat'],
  [/TAMAT\s+SD(?:\s*\/?\s*SEDERAJAT)?/, 'Tamat SD/Sederajat'],
  [/\bSD\s*\/?\s*SEDERAJAT/, 'Tamat SD/Sederajat'],
  [/SLTP(?:\s*\/?\s*SEDERAJAT)?|\bSMP(?:\s*\/?\s*SEDERAJAT)?/, 'SLTP/Sederajat'],
  [/SLTA(?:\s*\/?\s*SEDERAJAT)?|\bSMA(?:\s*\/?\s*SEDERAJAT)?/, 'SLTA/Sederajat'],
  [/DIPLOMA\s+IV\s*\/?\s*I?STRATA(?:\s+(?:I\b|!))?/, 'Diploma IV/Strata I'],
  [/AKADEMI\s*\/?\s*DIPLOMA\s+III(?:\s*\/?\s*S\.?\s*MUDA)?/, 'Akademi/Diploma III/S. Muda'],
  [/DIPLOMA\s+I\s*\/\s*II/, 'Diploma I/II'],
  [/STRATA\s+III/, 'Strata III'],
  [/STRATA\s+II\b/, 'Strata II'],
  [/STRATA\s+I\b/, 'Strata I'],
];

const LABEL = {
  kepala: /NAMA\s+KEPALA\s+KELUARGA/i,
  alamat: /ALAMAT/i,
  rtrw: /RT\s*[\/|Il1]{0,3}\s*RW/i,
  kelurahan: /DESA\s*[\/|Il1]{0,3}\s*KELURAHAN|KELURAHAN/i,
  kecamatan: /KECAMATAN/i,
  kabkota: /KABUPATEN\s*[\/|Il1]{0,3}\s*KOTA/i,
  kodepos: /KODE\s*POS/i,
  provinsi: /PROVINSI/i,
};

const REGEX_TANGGAL = /\b(\d{2})[-/.\s](\d{2})[-/.\s](\d{4})\b/;
const REGEX_GENDER = /PEREMPUAN|LAKI[\s-]*LAKI|\bLAKI\b/i;

function regexKata(kata) {
  return new RegExp('\\b' + kata.replace(/\s+/g, '\\s+') + '\\b', 'i');
}

// Cocokkan berdasarkan SUBSTRING (bukan word-boundary) karena OCR sering
// menempelkan huruf sampah tepat sebelum/sesudah kata kunci (mis. "JISLAM").
function cariKataPertama(teks, daftarKata) {
  const upper = teks.toUpperCase();
  const upperTanpaSpasi = upper.replace(/\s+/g, '');
  for (const kata of daftarKata) {
    if (upper.includes(kata)) return kata;
    if (kata.includes(' ') && upperTanpaSpasi.includes(kata.replace(/\s+/g, ''))) return kata;
  }
  return '';
}

// Sama seperti di atas, tapi juga mengembalikan posisi supaya sisa teks
// setelah kata kunci bisa diproses lebih lanjut.
function cariSubstringPosisi(teks, daftarKata) {
  const upper = teks.toUpperCase();
  for (const kata of daftarKata) {
    const idx = upper.indexOf(kata);
    if (idx !== -1) return { kata, idx, akhir: idx + kata.length };
  }
  return null;
}

function toTitleCase(teks) {
  if (!teks) return '';
  return teks
    .toLowerCase()
    .replace(/(^|[\s/])([a-z])/g, (_, pemisah, huruf) => pemisah + huruf.toUpperCase());
}

function bersihkanNama(teks) {
  return teks
    .replace(/[^A-Za-z\s'.-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function bersihkanNilai(teks) {
  return teks
    .replace(/\s*\|\s*/g, ' ')
    .replace(/^[\s:;|!.=-]+/, '')
    .replace(/^\d\s+(?=[A-Za-z])/, '')
    .replace(/[\s:;|]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function ambilNilai(baris, kunci) {
  for (let i = 0; i < baris.length; i++) {
    const b = baris[i];
    const m = b.match(LABEL[kunci]);
    if (!m) continue;

    const sisa = b.slice(m.index + m[0].length);
    let potong = sisa.length;
    for (const [k, pola] of Object.entries(LABEL)) {
      if (k === kunci) continue;
      const mm = sisa.match(pola);
      if (mm && mm.index < potong) potong = mm.index;
    }
    let nilai = bersihkanNilai(sisa.slice(0, potong));

    // Kadang label dan nilainya kepisah baris karena OCR salah baca layout
    // kolom. Kalau baris yang sama kosong, coba beberapa baris berikutnya -
    // lewati baris yang jelas bukan nilai (judul dokumen, baris No. KK,
    // atau baris label lain).
    if (!nilai) {
      for (let j = i + 1; j < Math.min(i + 6, baris.length); j++) {
        const kandidat = baris[j];
        if (Object.values(LABEL).some((pola) => pola.test(kandidat))) break;
        if (/^:?\s*No\.?\s*[:.\-]?\s*[\dOoIlSsBb]{10,}/i.test(kandidat)) continue;
        if (/^:?\s*KARTU\s+KELUARGA/i.test(kandidat)) continue;
        const bersih = bersihkanNilai(kandidat);
        if (bersih) {
          nilai = bersih;
          break;
        }
      }
    }

    if (nilai) return nilai;
  }
  return '';
}

// Cari No. KK secara khusus di beberapa baris PALING ATAS dokumen (sebelum
// baris label wilayah/tabel muncul), toleran terhadap huruf yang mirip
// angka. Tidak dipaksa tepat 16 digit - kalau OCR salah baca jumlah digit,
// nilai apa adanya tetap lebih aman daripada memotongnya secara sembarangan
// (yang bisa menghasilkan angka yang salah tapi terlihat valid).
function ambilNoKKLabel(baris) {
  const peta = { O: '0', o: '0', I: '1', l: '1', S: '5', s: '5', B: '8', b: '8' };
  for (const b of baris.slice(0, 12)) {
    const m = b.match(/\bNo\.?\s*[:.\-]?\s*([\dOoIlSsBb]{14,20})\b/i);
    if (m) {
      const angka = m[1].replace(/[OoIlSsBb]/g, (c) => peta[c]);
      if (angka.length >= 14) return angka;
    }
  }
  return '';
}

// Hapus tanda "-" tunggal dan pemisah sisa
function rapikanSisa(teks) {
  return teks
    .replace(/(^|\s)-+(?=\s|$)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// OCR di beberapa dokumen konsisten membaca garis pembatas kolom tepat
// setelah nomor urut baris sebagai huruf "J" (mis. "1JTEGUH", "2 JMEI").
// Ini menghapus "J" itu SAJA kalau munculnya tepat setelah nomor urut di
// awal baris - tidak menyentuh huruf J di tempat lain supaya nama asli
// yang diawali J (mis. "Joko") tetap aman.
function bersihkanAwalBaris(b) {
  return b.replace(/^(\s*[A-Za-z]?\d{1,3}\s*\|?\s*)J(?=[A-Z])/, '$1');
}

// OCR sering salah baca angka panjang. Di sini kita rapikan dulu supaya NIK
// tetap dikenali: (1) huruf yang mirip angka diganti (O->0, I/l->1, S->5,
// B->8) pada token yang hampir semuanya angka, (2) angka 16 digit yang
// terpecah oleh spasi atau sekat kolom digabung kembali.
function perbaikiAngka(teks) {
  const peta = { O: '0', o: '0', I: '1', l: '1', S: '5', s: '5', B: '8', b: '8' };

  return teks
    .split('\n')
    .map((baris) => {
      const token = baris.split(' ');

      for (let i = 0; i < token.length; i++) {
        const t = token[i];
        if (/^[0-9OoIlSsBb]{13,18}$/.test(t) && (t.match(/\d/g) || []).length >= 10) {
          token[i] = t.replace(/[OoIlSsBb]/g, (c) => peta[c]);
        }
      }

      for (let i = 0; i < token.length; i++) {
        if (!/^\d{1,15}$/.test(token[i])) continue;
        let jumlah = 0;
        let gabung = '';
        const indeks = [];
        for (let j = i; j < token.length; j++) {
          if (token[j] === '|') continue;
          if (!/^\d{1,15}$/.test(token[j])) break;
          if (jumlah + token[j].length > 16) break;
          jumlah += token[j].length;
          gabung += token[j];
          indeks.push(j);
          if (jumlah === 16) break;
        }
        if (jumlah === 16 && indeks.length > 1) {
          token[indeks[0]] = gabung;
          for (const k of indeks.slice(1)) token[k] = '';
          i = indeks[indeks.length - 1];
        }
      }

      return token.filter((t) => t !== '').join(' ');
    })
    .join('\n');
}

// Pisahkan teks berisi nama ayah + nama ibu.
function pisahAyahIbu(teks, namaAnggota) {
  const bersih = bersihkanNama(teks);
  if (!bersih) return { ayah: '', ibu: '' };

  const upper = bersih.toUpperCase();
  const ketemu = namaAnggota
    .map((n) => ({ nama: n, pos: n ? upper.indexOf(n.toUpperCase()) : -1 }))
    .filter((x) => x.nama && x.pos >= 0)
    .sort((a, b) => a.pos - b.pos);

  if (ketemu.length >= 2) {
    return { ayah: toTitleCase(ketemu[0].nama), ibu: toTitleCase(ketemu[1].nama) };
  }
  if (ketemu.length === 1) {
    const { nama, pos } = ketemu[0];
    const sebelum = bersih.slice(0, pos).trim();
    const sesudah = bersih.slice(pos + nama.length).trim();
    if (pos === 0) return { ayah: toTitleCase(nama), ibu: toTitleCase(sesudah) };
    if (!sesudah) return { ayah: toTitleCase(sebelum), ibu: toTitleCase(nama) };
  }

  const kata = bersih.split(' ');
  if (kata.length >= 2 && kata.length % 2 === 0) {
    const tengah = kata.length / 2;
    return {
      ayah: toTitleCase(kata.slice(0, tengah).join(' ')),
      ibu: toTitleCase(kata.slice(tengah).join(' ')),
    };
  }

  return { ayah: toTitleCase(bersih), ibu: '' };
}

// Bagian tabel 2: status perkawinan, hubungan, kewarganegaraan, paspor/KITAS, ayah/ibu
function parseBagianStatus(teks, namaAnggota) {
  const statusPerkawinan = cariKataPertama(teks, KATA_KAWIN);
  const statusHubungan = cariKataPertama(teks, KATA_HUBUNGAN);

  const mWarga = teks.match(/\b(WNI|WNA)\b/i);
  const kewarganegaraan = mWarga ? mWarga[1].toUpperCase() : 'WNI';

  let sisa = mWarga ? teks.slice(mWarga.index + mWarga[0].length) : '';
  sisa = sisa.replace(new RegExp(REGEX_TANGGAL, 'g'), ' ');

  let nomorPaspor = '';
  let nomorKitap = '';

  if (kewarganegaraan === 'WNA') {
    const kandidat = [...sisa.matchAll(/\b(?=[A-Z0-9-]*\d)[A-Z0-9-]{6,}\b/g)].map((m) => m[0]);
    nomorPaspor = kandidat[0] || '';
    nomorKitap = kandidat[1] || '';
    for (const k of kandidat) sisa = sisa.replace(k, ' ');
  }

  let ayah = '';
  let ibu = '';
  const sel = sisa
    .split('|')
    .map((s) => rapikanSisa(s))
    .filter((s) => s && /[A-Za-z]/.test(s));

  if (sel.length >= 2) {
    ayah = toTitleCase(bersihkanNama(sel[sel.length - 2]));
    ibu = toTitleCase(bersihkanNama(sel[sel.length - 1]));
  } else if (sel.length === 1) {
    ({ ayah, ibu } = pisahAyahIbu(sel[0], namaAnggota));
  }

  return {
    statusPerkawinan: toTitleCase(statusPerkawinan),
    statusHubungan: toTitleCase(statusHubungan),
    kewarganegaraan,
    nomorPaspor,
    nomorKitap,
    namaAyah: ayah,
    namaIbu: ibu,
  };
}

// Bagian tabel 1 setelah nama: gender, tempat/tgl lahir, agama, pendidikan, pekerjaan.
// `teks` adalah SISA baris setelah nama (baik itu setelah NIK, atau setelah
// nama pada baris tanpa NIK yang terbaca).
function parseBagianIdentitas(teks) {
  const mGender = teks.match(REGEX_GENDER);
  const jenisKelamin = mGender ? (/PEREMPUAN/i.test(mGender[0]) ? 'P' : 'L') : '';

  let tanggalLahir = '';
  let tempatLahir = '';
  let sesudahTanggal = teks;

  const mTgl = teks.match(REGEX_TANGGAL);
  if (mTgl) {
    tanggalLahir = `${mTgl[3]}-${mTgl[2]}-${mTgl[1]}`;

    const sebelumTgl = teks.slice(0, mTgl.index);
    const selSebelum = sebelumTgl
      .split('|')
      .map((s) => rapikanSisa(s))
      .filter(Boolean);

    let calonTempat = selSebelum.length ? selSebelum[selSebelum.length - 1] : sebelumTgl;
    calonTempat = calonTempat.replace(REGEX_GENDER, ' ');
    tempatLahir = toTitleCase(bersihkanNama(calonTempat));

    sesudahTanggal = teks.slice(mTgl.index + mTgl[0].length);
  }

  const cocokAgama = cariSubstringPosisi(sesudahTanggal, KATA_AGAMA);
  let agama = '';
  let sisa = sesudahTanggal;
  if (cocokAgama) {
    agama = cocokAgama.kata;
    sisa = sesudahTanggal.slice(cocokAgama.akhir);
  }

  const sisaAsli = sisa;
  sisa = sisa
    .replace(/\s*\|?\s*(?:TIDAK\s+TAHU|AB|A|B|O|0)\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  let pendidikanTerakhir = '';
  let pekerjaan = '';
  const sisaUpper = sisa.toUpperCase();

  for (const [pola, tampilan] of PENDIDIKAN) {
    const m = sisaUpper.match(pola);
    if (m) {
      pendidikanTerakhir = tampilan;
      const sisaPekerjaan = (sisa.slice(0, m.index) + ' ' + sisa.slice(m.index + m[0].length)).replace(
        /\s*\|\s*/g,
        ' '
      );
      pekerjaan = toTitleCase(rapikanSisa(sisaPekerjaan).replace(/^[\s|:;.-]+|[\s|:;.-]+$/g, ''));
      break;
    }
  }

  if (!pendidikanTerakhir) {
    const sel = sisaAsli
      .split('|')
      .map((s) => rapikanSisa(s))
      .filter(Boolean);
    if (sel.length >= 2) {
      pendidikanTerakhir = toTitleCase(sel[0]);
      pekerjaan = toTitleCase(sel[1]);
    }
  }

  return { jenisKelamin, tempatLahir, tanggalLahir, agama: toTitleCase(agama), pendidikanTerakhir, pekerjaan };
}

// Untuk baris tanpa NIK yang terbaca tapi kelihatan seperti baris anggota
// (ada kata kunci agama): tebak batas antara nama dan sisa data dari titik
// pertama yang ditemukan (sekat kolom, jenis kelamin, tanggal lahir, atau
// agama) - mana yang paling awal muncul.
function baleNamaDanSisa(barisIni) {
  if (barisIni.includes('|')) {
    const parts = barisIni.split('|');
    return { nama: rapikanSisa(parts[0]), sisa: parts.slice(1).join('|') };
  }

  const titik = [];
  const mG = barisIni.match(REGEX_GENDER);
  if (mG) titik.push(mG.index);
  const mT = barisIni.match(REGEX_TANGGAL);
  if (mT) titik.push(mT.index);
  const cA = cariSubstringPosisi(barisIni, KATA_AGAMA);
  if (cA) titik.push(cA.idx);

  if (!titik.length) return { nama: '', sisa: barisIni };
  const awal = Math.min(...titik);
  return { nama: rapikanSisa(barisIni.slice(0, awal)), sisa: barisIni.slice(awal) };
}

export function parseTeksKK(teksAsli, daftarKelurahan = []) {
  const kosong = {
    noKK: '', kepalaKeluarga: '', alamat: '', kelurahanId: '', kelurahanBaru: null,
    rt: '', rw: '', anggota: [],
  };

  const teksMentah = perbaikiAngka(teksAsli);
  const semuaNikMatch = [...teksMentah.matchAll(/\b\d{16}\b/g)];
  const noKKLabel = ambilNoKKLabel(
    teksMentah.split('\n').map((b) => b.trim()).filter(Boolean)
  );

  if (semuaNikMatch.length === 0 && !noKKLabel) return kosong;

  const noKKTerpercaya = Boolean(noKKLabel);
  const noKK = noKKLabel || (semuaNikMatch[0] ? semuaNikMatch[0][0] : '');
  if (!noKK) return kosong;

  const baris = teksMentah
    .split('\n')
    .map((b) => bersihkanAwalBaris(b.trim()))
    .filter(Boolean);

  // ----- Header -----
  let kepalaKeluarga = ambilNilai(baris, 'kepala');
  const alamat = ambilNilai(baris, 'alamat');
  const kelurahanTeks = ambilNilai(baris, 'kelurahan');
  const kecamatan = ambilNilai(baris, 'kecamatan');
  const kabupatenKota = ambilNilai(baris, 'kabkota');
  const provinsi = ambilNilai(baris, 'provinsi');
  const kodePosTeks = ambilNilai(baris, 'kodepos');
  const kodePos = (kodePosTeks.match(/\d{5}/) || [''])[0];

  let rt = '';
  let rw = '';
  const nilaiRtRw = ambilNilai(baris, 'rtrw');
  const angkaRtRw = nilaiRtRw.match(/(\d{1,3})\D{0,6}(\d{1,3})/);
  if (angkaRtRw) {
    rt = angkaRtRw[1];
    rw = angkaRtRw[2];
  } else {
    const cadangan =
      teksMentah.match(/RT\s*[\/|Il1]{0,3}\s*RW\s*[:;.]?\s*(\d{1,3})\s*[\/|]\s*(\d{1,3})/i) ||
      teksMentah.match(/RT\s*[:.]?\s*(\d{1,3})\s*[\/|]?\s*RW\s*[:.]?\s*(\d{1,3})/i);
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

  // ----- Tabel 1: satu pass, urutan dokumen dijaga -----
  const anggota = [];
  const teksTambahanSatuBaris = [];

  for (const barisIni of baris) {
    const nikMatch = barisIni.match(/\b\d{16}\b/);
    const nikDipakaiSebagaiNoKK = noKKTerpercaya && nikMatch && nikMatch[0] === noKK;

    if (nikMatch && !nikDipakaiSebagaiNoKK) {
      const nik = nikMatch[0];
      const idxNik = barisIni.indexOf(nik);
      const sebelumNIK = barisIni.slice(0, idxNik);
      const sesudahNIK = barisIni.slice(idxNik + 16);
      const identitas = parseBagianIdentitas(sesudahNIK);

      anggota.push({
        namaLengkap: bersihkanNama(sebelumNIK),
        nik,
        ...identitas,
        statusPerkawinan: '', statusHubungan: '', kewarganegaraan: 'WNI',
        nomorPaspor: '', nomorKitap: '', namaAyah: '', namaIbu: '',
      });
      teksTambahanSatuBaris.push(sesudahNIK);
      continue;
    }

    if (!nikMatch && cariKataPertama(barisIni, KATA_AGAMA)) {
      const { nama, sisa } = baleNamaDanSisa(barisIni);
      if (!nama) continue; // tidak ada anchor sama sekali, terlalu berisiko ditebak
      const identitas = parseBagianIdentitas(sisa);

      anggota.push({
        namaLengkap: bersihkanNama(nama),
        nik: '',
        ...identitas,
        statusPerkawinan: '', statusHubungan: '', kewarganegaraan: 'WNI',
        nomorPaspor: '', nomorKitap: '', namaAyah: '', namaIbu: '',
      });
      teksTambahanSatuBaris.push(sisa);
    }
  }

  const namaAnggota = anggota.map((a) => a.namaLengkap);

  // ----- Tabel 2: baris tanpa NIK berisi status perkawinan / hubungan -----
  //
  // Baris tabel 2 dipasangkan ke anggota BERDASARKAN URUTAN. Ini beresiko:
  // kalau satu baris di tengah gagal terbaca sama sekali (dilewati), semua
  // baris SESUDAHNYA akan salah geser ke anggota yang salah. Karena salah
  // menaruh info hubungan/status keluarga lebih berbahaya daripada
  // mengosongkannya, pemasangan ini HANYA dilakukan kalau jumlah baris
  // kandidat yang ditemukan PERSIS SAMA dengan jumlah anggota (berarti besar
  // kemungkinan tidak ada baris yang terlewat/tergeser). Kalau jumlahnya
  // tidak cocok, semua field tabel 2 dibiarkan kosong untuk SEMUA anggota -
  // lebih aman untuk diisi manual daripada ditebak salah pasang.
  const idxHeaderTabel2 = baris.findIndex((b) =>
    /STATUS|KEWARGANEGARAAN|DOKUMEN\s*IMIGRASI|ORANG\s*TUA/i.test(b)
  );
  const mulaiZona = idxHeaderTabel2 === -1 ? 0 : idxHeaderTabel2 + 1;
  const idxAkhirRel = baris
    .slice(mulaiZona)
    .findIndex((b) =>
      /\bLEMBAR\b|DIKELUARKAN|TANDA\s*TANGAN|CAP\s*JEMPOL|KASUDIN|KEPALA\s+DINAS|A\.?\s*N\.?\s*KA/i.test(b)
    );
  const akhirZona = idxAkhirRel === -1 ? baris.length : mulaiZona + idxAkhirRel;
  const zonaTabel2 = baris.slice(mulaiZona, akhirZona);

  const barisTabel2 = zonaTabel2.filter((b) => {
    if ((b.match(/[A-Za-z]/g) || []).length < 3) return false; // baris kosong/placeholder "-"
    if (/PERKAWINAN|HUBUNGAN\s*DALAM|KEWARGANEGARAAN/i.test(b)) return false; // lanjutan judul kolom
    if (cariKataPertama(b, KATA_KAWIN)) return true;
    if (cariKataPertama(b, KATA_HUBUNGAN)) return true;
    if (/\bWN[IA]?\b/.test(b.toUpperCase())) return true;
    const bUpper = b.toUpperCase();
    return namaAnggota.some((n) => n && n.length > 2 && bUpper.includes(n.toUpperCase()));
  });

  if (barisTabel2.length === anggota.length) {
    anggota.forEach((a, i) => {
      Object.assign(a, parseBagianStatus(barisTabel2[i], namaAnggota));
    });
  } else {
    // Coba per baris yang sama dengan data tabel 1 (layout satu tabel, bukan dua)
    anggota.forEach((a, i) => {
      if (cariKataPertama(teksTambahanSatuBaris[i], KATA_KAWIN)) {
        Object.assign(a, parseBagianStatus(teksTambahanSatuBaris[i], namaAnggota));
      }
    });
  }

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
