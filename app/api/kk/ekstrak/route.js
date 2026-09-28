import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createWorker } from 'tesseract.js';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { parseTeksKK } from '@/lib/ocr/parseKK';

export const runtime = 'nodejs';

const TIPE_DIIZINKAN = ['image/jpeg', 'image/png', 'application/pdf'];
const UKURAN_MAKS = 10 * 1024 * 1024; // 10MB
const FOLDER_UPLOAD = path.join(process.cwd(), 'storage', 'uploads');

// Ambil daftar baris (beserta kata & posisinya) dari hasil Tesseract, apa pun
// bentuk keluarannya di versi library yang terpasang.
function ambilBaris(data) {
  if (Array.isArray(data.lines) && data.lines.length) return data.lines;
  const dariBlocks = (data.blocks || [])
    .flatMap((b) => b.paragraphs || [])
    .flatMap((p) => p.lines || []);
  return dariBlocks;
}

// Susun teks per baris. Celah horizontal yang lebar antar kata (batas kolom
// tabel) ditandai " | " supaya parser bisa memisahkan kolom dengan pasti.
function teksDenganKolom(data) {
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

  try {
    if (file.type === 'application/pdf') {
      const hasilPdf = await pdfParse(buffer);
      teksMentah = hasilPdf.text || '';

      if (teksMentah.trim().length < 50) {
        return Response.json(
          {
            message:
              'PDF ini sepertinya hasil scan/foto (tidak ada teks yang bisa dibaca langsung). Untuk sementara, upload sebagai JPG/PNG.',
          },
          { status: 422 }
        );
      }
    } else {
      const worker = await createWorker('ind');
      try {
        const hasil = await worker.recognize(buffer);
        teksMentah = teksDenganKolom(hasil.data);
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

  return Response.json({ ...hasilParse, fileAsliPath, teksMentah });
}
