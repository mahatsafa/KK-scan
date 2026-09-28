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
// Teks OCR boleh memuat " | " sebagai penanda celah antar kolom (dibuat di
// route ekstrak dari posisi kata). Parser tetap jalan tanpa penanda itu.
// Field yang tidak yakin sengaja dikosongkan, bukan ditebak.

const KATA_AGAMA = ['ISLAM', 'KRISTEN', 'KATOLIK', 'HINDU', 'BUDDHA', 'KONGHUCU'];
const KATA_KAWIN = ['BELUM KAWIN', 'CERAI HIDUP', 'CERAI MATI', 'KAWIN'];
const KATA_HUBUNGAN = [
  'KEPALA KELUARGA', 'SUAMI', 'ISTRI', 'ANAK', 'MENANTU', 'CUCU',
  'ORANG TUA', 'MERTUA', 'FAMILI LAIN', 'PEMBANTU', 'LAINNYA',
];

// Jenjang pendidikan resmi di KK (urutan penting: yang paling spesifik dulu)
const PENDIDIKAN = [
  [/TIDAK\s*\/?\s*BELUM\s+SEKOLAH/, 'Tidak/Belum Sekolah'],
  [/BELUM\s+TAMAT\s+SD(?:\s*\/?\s*SEDERAJAT)?/, 'Belum Tamat SD/Sederajat'],
  [/TAMAT\s+SD(?:\s*\/?\s*SEDERAJAT)?/, 'Tamat SD/Sederajat'],
  [/\bSD\s*\/?\s*SEDERAJAT/, 'Tamat SD/Sederajat'],
  [/SLTP(?:\s*\/?\s*SEDERAJAT)?|\bSMP(?:\s*\/?\s*SEDERAJAT)?/, 'SLTP/Sederajat'],
  [/SLTA(?:\s*\/?\s*SEDERAJAT)?|\bSMA(?:\s*\/?\s*SEDERAJAT)?/, 'SLTA/Sederajat'],
  [/DIPLOMA\s+IV\s*\/?\s*STRATA\s+I\b/, 'Diploma IV/Strata I'],
  [/AKADEMI\s*\/?\s*DIPLOMA\s+III(?:\s*\/?\s*S\.?\s*MUDA)?/, 'Akademi/Diploma III/S. Muda'],
  [/DIPLOMA\s+I\s*\/\s*II/, 'Diploma I/II'],
  [/STRATA\s+III/, 'Strata III'],
  [/STRATA\s+II\b/, 'Strata II'],
  [/STRATA\s+I\b/, 'Strata I'],
];

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

const REGEX_TANGGAL = /\b(\d{2})[-/.](\d{2})[-/.](\d{4})\b/;

function regexKata(kata) {
  return new RegExp('\\b' + kata.replace(/\s+/g, '\\s+') + '\\b', 'i');
}

function cariKataPertama(teks, daftarKata) {
  for (const kata of daftarKata) {
    if (regexKata(kata).test(teks)) return kata;
  }
  return '';
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
    .replace(/\s*\|\s*/g, ' ') // penanda kolom di tengah nilai
    .replace(/^[\s:;|!.=-]+/, '')
    .replace(/^\d\s+(?=[A-Za-z])/, '') // ":" yang salah dibaca jadi angka tunggal
    .replace(/[\s:;|]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function ambilNilai(baris, kunci) {
  for (const b of baris) {
    const m = b.match(LABEL[kunci]);
    if (!m) continue;

    const sisa = b.slice(m.index + m[0].length);
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

// Hapus tanda "-" tunggal dan pemisah sisa dari teks nama
function rapikanSisa(teks) {
  return teks
    .replace(/(^|\s)-+(?=\s|$)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Pisahkan teks berisi nama ayah + nama ibu.
function pisahAyahIbu(teks, namaAnggota) {
  const bersih = bersihkanNama(teks);
  if (!bersih) return { ayah: '', ibu: '' };

  // 1) Kalau nama anggota lain KK ikut tertulis (mis. ayah = kepala keluarga)
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

  // 2) Bagi dua kalau jumlah kata genap
  const kata = bersih.split(' ');
  if (kata.length >= 2 && kata.length % 2 === 0) {
    const tengah = kata.length / 2;
    return {
      ayah: toTitleCase(kata.slice(0, tengah).join(' ')),
      ibu: toTitleCase(kata.slice(tengah).join(' ')),
    };
  }

  // 3) Tidak bisa dipastikan: taruh semuanya di ayah supaya admin yang memisahkan
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

  // Nama ayah & ibu: pakai sekat kolom "|" kalau ada
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

// Bagian tabel 1 setelah NIK: gender, tempat/tgl lahir, agama, pendidikan, pekerjaan
function parseBagianIdentitas(sesudahNIK) {
  const teks = sesudahNIK;

  const mGender = teks.match(/PEREMPUAN|LAKI[\s-]*LAKI|\bLAKI\b/i);
  const jenisKelamin = mGender ? (/PEREMPUAN/i.test(mGender[0]) ? 'P' : 'L') : '';

  let tanggalLahir = '';
  let tempatLahir = '';
  let sesudahTanggal = teks;

  const mTgl = teks.match(REGEX_TANGGAL);
  if (mTgl) {
    tanggalLahir = `${mTgl[3]}-${mTgl[2]}-${mTgl[1]}`;
    const awal = mGender ? mGender.index + mGender[0].length : 0;
    tempatLahir = toTitleCase(bersihkanNama(teks.slice(awal, mTgl.index)));
    sesudahTanggal = teks.slice(mTgl.index + mTgl[0].length);
  }

  // Agama, lalu sisanya = pendidikan + pekerjaan (+ golongan darah)
  let agama = '';
  let sisa = sesudahTanggal;
  for (const kata of KATA_AGAMA) {
    const m = sesudahTanggal.match(regexKata(kata));
    if (m) {
      agama = kata;
      sisa = sesudahTanggal.slice(m.index + m[0].length);
      break;
    }
  }

  const sisaAsli = sisa;
  sisa = sisa
    .replace(/\s*\|?\s*(?:TIDAK\s+TAHU|AB|A|B|O)\s*$/i, '') // golongan darah di ujung
    .replace(/\s+/g, ' ')
    .trim();

  let pendidikanTerakhir = '';
  let pekerjaan = '';
  const sisaUpper = sisa.toUpperCase();

  for (const [pola, tampilan] of PENDIDIKAN) {
    const m = sisaUpper.match(pola);
    if (m) {
      pendidikanTerakhir = tampilan;
      const sisaPekerjaan = (sisa.slice(0, m.index) + ' ' + sisa.slice(m.index + m[0].length))
        .replace(/\s*\|\s*/g, ' ');
      pekerjaan = toTitleCase(rapikanSisa(sisaPekerjaan).replace(/^[\s|:;.-]+|[\s|:;.-]+$/g, ''));
      break;
    }
  }

  // Cadangan: kalau jenjang tidak dikenali tapi ada sekat kolom, pakai sel pertama & kedua
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

  return {
    jenisKelamin,
    tempatLahir,
    tanggalLahir,
    agama: toTitleCase(agama),
    pendidikanTerakhir,
    pekerjaan,
  };
}

export function parseTeksKK(teksAsli, daftarKelurahan = []) {
  const teksMentah = perbaikiAngka(teksAsli);
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

  // ----- Tabel 1: baris ber-NIK -----
  const anggota = [];
  const teksTambahanSatuBaris = []; // bagian tabel 2 yang menempel di baris yang sama (layout 1 tabel)

  for (const barisIni of baris) {
    const nikMatch = barisIni.match(/\b\d{16}\b/);
    if (!nikMatch || nikMatch[0] === noKK) continue;

    const nik = nikMatch[0];
    const idxNik = barisIni.indexOf(nik);
    const sebelumNIK = barisIni.slice(0, idxNik);
    const sesudahNIK = barisIni.slice(idxNik + 16);

    const identitas = parseBagianIdentitas(sesudahNIK);

    anggota.push({
      namaLengkap: bersihkanNama(sebelumNIK),
      nik,
      ...identitas,
      statusPerkawinan: '',
      statusHubungan: '',
      kewarganegaraan: 'WNI',
      nomorPaspor: '',
      nomorKitap: '',
      namaAyah: '',
      namaIbu: '',
    });
    teksTambahanSatuBaris.push(sesudahNIK);
  }

  const namaAnggota = anggota.map((a) => a.namaLengkap);

  // ----- Tabel 2: baris tanpa NIK berisi status perkawinan / hubungan -----
  const barisTabel2 = baris.filter(
    (b) =>
      !/\b\d{16}\b/.test(b) &&
      !/STATUS|KEWARGANEGARAAN|PERKAWINAN|DOKUMEN|ORANG\s*TUA/i.test(b) &&
      cariKataPertama(b, KATA_KAWIN) &&
      (cariKataPertama(b, KATA_HUBUNGAN) || /\b(WNI|WNA)\b/i.test(b))
  );

  anggota.forEach((a, i) => {
    let status;
    if (barisTabel2[i]) {
      status = parseBagianStatus(barisTabel2[i], namaAnggota);
    } else if (cariKataPertama(teksTambahanSatuBaris[i], KATA_KAWIN)) {
      // Layout 1 tabel: status ada di baris yang sama dengan NIK
      status = parseBagianStatus(teksTambahanSatuBaris[i], namaAnggota);
    } else {
      return;
    }
    Object.assign(a, status);
  });

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

// OCR sering salah baca angka panjang. Di sini kita rapikan dulu supaya NIK / No. KK
// tetap dikenali: (1) huruf yang mirip angka diganti (O->0, I/l->1, S->5, B->8) pada
// token yang hampir semuanya angka, (2) angka 16 digit yang terpecah oleh spasi atau
// sekat kolom digabung kembali.
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
