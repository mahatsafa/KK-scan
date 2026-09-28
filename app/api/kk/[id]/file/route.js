import { promises as fs } from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export const runtime = 'nodejs';

const TIPE_MIME = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

export async function GET(request, { params }) {
  const session = await getSession();
  if (session.isLoggedIn !== true) {
    return Response.json({ message: 'Belum login' }, { status: 401 });
  }

  const kk = await prisma.kartuKeluarga.findUnique({
    where: { id: params.id },
    select: { fileAsliPath: true },
  });

  if (!kk || !kk.fileAsliPath) {
    return Response.json({ message: 'File tidak ditemukan.' }, { status: 404 });
  }

  // Cegah path traversal: file harus berada di dalam storage/uploads
  const folderUpload = path.join(process.cwd(), 'storage', 'uploads');
  const pathFile = path.join(process.cwd(), kk.fileAsliPath);
  if (!pathFile.startsWith(folderUpload + path.sep)) {
    return Response.json({ message: 'Path file tidak valid.' }, { status: 400 });
  }

  try {
    const data = await fs.readFile(pathFile);
    const mime = TIPE_MIME[path.extname(pathFile).toLowerCase()] || 'application/octet-stream';
    return new Response(data, { headers: { 'Content-Type': mime } });
  } catch (err) {
    return Response.json({ message: 'File tidak ditemukan di server.' }, { status: 404 });
  }
}
