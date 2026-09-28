import { parseTeksKK } from './parseKK';

// Foto/scan KK sering buram, miring, atau berlatar motif keamanan, dan tidak ada
// satu pengaturan OCR yang selalu terbaik. Jadi gambar dibaca dengan beberapa
// variasi pra-pemrosesan lalu dipilih hasil yang datanya paling lengkap.
// Berhenti lebih awal kalau sebuah variasi sudah cukup lengkap.

const VARIAN = [
  {
    nama: 'asli',
    psm: '3',
    siapkan: (img) => img.resize({ width: 3500, withoutEnlargement: true }),
  },
  {
    nama: 'tajam',
    psm: '3',
    siapkan: (img) => img.resize({ width: 3000 }).grayscale().normalize().sharpen(),
  },
  {
    nama: 'hitam-putih',
    psm: '3',
    siapkan: (img) => img.resize({ width: 3000 }).grayscale().normalize().median(3).threshold(165),
  },
  {
    nama: 'hitam-putih-blok',
    psm: '6',
    siapkan: (img) => img.resize({ width: 3000 }).grayscale().normalize().median(3).threshold(165),
  },
  {
    nama: 'hitam-putih-150',
    psm: '3',
    siapkan: (img) => img.resize({ width: 3000 }).grayscale().normalize().median(3).threshold(150),
  },
];

// Ambil daftar baris (beserta kata & posisinya) dari hasil Tesseract, apa pun
// bentuk keluarannya di versi library yang terpasang.
function ambilBaris(data) {
  if (Array.isArray(data.lines) && data.lines.length) return data.lines;
  return (data.blocks || [])
    .flatMap((b) => b.paragraphs || [])
    .flatMap((p) => p.lines || []);
}

// Susun teks per baris. Celah horizontal yang lebar antar kata (batas kolom
// tabel) ditandai " | " supaya parser bisa memisahkan kolom dengan pasti.
export function teksDenganKolom(data) {
  try {
    const baris = ambilBaris(data);
    if (!baris.length) return data.text || '';

    const hasil = baris
      .map((line) => {
        const kata = (line.words || []).filter((w) => w.text && w.text.trim() && w.bbox);
        if (!kata.length) return (line.text || '').trim();

        const tinggi = Math.max(1, (line.bbox ? line.bbox.y1 - line.bbox.y0 : 0) || 12);
        let out = kata[0].text.trim();
        for (let i = 1; i < kata.length; i++) {
          const celah = kata[i].bbox.x0 - kata[i - 1].bbox.x1;
          out += (celah > tinggi ? ' | ' : ' ') + kata[i].text.trim();
        }
        return out;
      })
      .filter(Boolean)
      .join('\n');

    return hasil || data.text || '';
  } catch (err) {
    return data.text || '';
  }
}

const FIELD_PENILAI = ['jenisKelamin', 'tanggalLahir', 'agama', 'pendidikanTerakhir', 'statusHubungan'];

// Nilai seberapa lengkap data yang berhasil di-parse dari teks OCR.
export function nilaiTeks(teks) {
  const h = parseTeksKK(teks, []);
  let skor = h.noKK ? 1 : 0;
  let terisi = 0;

  for (const a of h.anggota) {
    skor += 2;
    for (const f of FIELD_PENILAI) {
      if (a[f]) {
        skor += 1;
        terisi += 1;
      }
    }
  }

  const maks = h.anggota.length * FIELD_PENILAI.length;
  const cukup = h.anggota.length >= 1 && terisi / maks >= 0.9;
  return { skor, jumlahAnggota: h.anggota.length, cukup };
}

// `worker` = worker Tesseract.js yang sudah dibuat pemanggil (dipakai ulang).
export async function bacaGambarTerbaik(buffer, worker) {
  let sharp = null;
  try {
    sharp = (await import('sharp')).default;
  } catch (err) {
    sharp = null; // sharp tidak terpasang: baca gambar apa adanya
  }

  const daftar = sharp ? VARIAN : [{ nama: 'asli-tanpa-sharp', psm: '3', siapkan: null }];
  let terbaik = { skor: -1, jumlahAnggota: 0, teks: '', varian: '' };

  for (const v of daftar) {
    let gambar = buffer;
    if (v.siapkan) {
      try {
        gambar = await v.siapkan(sharp(buffer).rotate()).png().toBuffer();
      } catch (err) {
        continue;
      }
    }

    await worker.setParameters({ tessedit_pageseg_mode: v.psm, preserve_interword_spaces: '1' });
    const hasil = await worker.recognize(gambar);
    const teks = teksDenganKolom(hasil.data);
    const nilai = nilaiTeks(teks);

    if (nilai.skor > terbaik.skor) terbaik = { ...nilai, teks, varian: v.nama };
    if (nilai.cukup) break;
  }

  return terbaik;
}
