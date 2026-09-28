import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createWorker } from 'tesseract.js';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { parseTeksKK } from '@/lib/ocr/parseKK';
import { bacaGambarTerbaik } from '@/lib/ocr/bacaGambar';
import { pdfKeGambar } from '@/lib/ocr/pdfKeGambar';

export const runtime = 'nodejs';

const TIPE_DIIZINKAN = ['image/jpeg', 'image/png', 'application/pdf'];
const UKURAN_MAKS = 10 * 1024 * 1024; // 10MB
const FOLDER_UPLOAD = path.join(process.cwd(), 'storage', 'uploads');

async function pastikanLogin() {
  const session = await getSession();
  return session.isLoggedIn === true;
}

export async function POST(request) {
  if (!(await pastikanLogin())) {
    return Response.json({ message: 'Belum login' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file');

  if (!file || typeof file === 'string') {
    return Response.json({ message: 'File tidak ditemukan.' }, { status: 400 });
  }
  if (!TIPE_DIIZINKAN.includes(file.type)) {
    return Response.json({ message: 'Format file harus JPG, PNG, atau PDF.' }, { status: 400 });
  }
  if (file.size > UKURAN_MAKS) {
    return Response.json({ message: 'Ukuran file maksimal 10MB.' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Simpan file asli permanen (di luar folder public, hanya bisa dibuka lewat route terproteksi login)
  await fs.mkdir(FOLDER_UPLOAD, { recursive: true });
  const ekstensi = file.type === 'application/pdf' ? '.pdf' : file.type === 'image/png' ? '.png' : '.jpg';
  const namaFile = `${crypto.randomUUID()}${ekstensi}`;
  await fs.writeFile(path.join(FOLDER_UPLOAD, namaFile), buffer);
  const fileAsliPath = `storage/uploads/${namaFile}`;

  let teksMentah = '';
  let sumberTeks = '';

  try {
    if (file.type === 'application/pdf') {
      const hasilPdf = await pdfParse(buffer);
      const teksPdf = hasilPdf.text || '';

      if (teksPdf.trim().length >= 50) {
        // PDF "born-digital": sudah ada teksnya, tidak perlu OCR
        teksMentah = teksPdf;
        sumberTeks = 'PDF (teks langsung)';
      } else {
        // Kemungkinan PDF hasil scan/foto: ubah jadi gambar dulu, baru OCR
        let halaman;
        try {
          halaman = await pdfKeGambar(buffer, 2);
        } catch (err) {
          if (err.message === 'PDFTOPPM_TIDAK_ADA') {
            return Response.json(
              {
                message:
                  'PDF ini sepertinya hasil scan/foto. Untuk membacanya otomatis, server butuh paket "poppler-utils" ' +
                  '(jalankan: sudo apt install poppler-utils -y lalu coba lagi). Sementara itu, upload sebagai JPG/PNG.',
              },
              { status: 422 }
            );
          }
          throw err;
        }

        const worker = await createWorker('ind');
        try {
          let terbaik = { skor: -1, teks: '', varian: '' };
          for (const gambarHalaman of halaman) {
            const hasil = await bacaGambarTerbaik(gambarHalaman, worker);
            if (hasil.skor > terbaik.skor) terbaik = hasil;
            if (hasil.cukup) break;
          }
          teksMentah = terbaik.teks;
          sumberTeks = `PDF hasil scan, dibaca sebagai gambar (${terbaik.varian})`;
        } finally {
          await worker.terminate();
        }
      }
    } else {
      const worker = await createWorker('ind');
      try {
        const hasil = await bacaGambarTerbaik(buffer, worker);
        teksMentah = hasil.teks;
        sumberTeks = `Gambar (${hasil.varian})`;
      } finally {
        await worker.terminate();
      }
    }
  } catch (err) {
    console.error(err);
    return Response.json({ message: 'Gagal membaca isi file.' }, { status: 500 });
  }

  const daftarKelurahan = await prisma.kelurahan.findMany();
  const hasilParse = parseTeksKK(teksMentah, daftarKelurahan);

  return Response.json({ ...hasilParse, fileAsliPath, teksMentah, sumberTeks });
}
