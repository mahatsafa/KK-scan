import { execFile } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';

const execFileAsync = promisify(execFile);

// Ubah halaman PDF (hasil scan) menjadi gambar PNG 300 dpi memakai `pdftoppm`
// (bagian dari paket poppler-utils). Melempar Error('PDFTOPPM_TIDAK_ADA') kalau
// program itu belum terpasang di server.
export async function pdfKeGambar(bufferPdf, maksHalaman = 2) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'kk-pdf-'));
  try {
    const pdfPath = path.join(dir, 'in.pdf');
    await fs.writeFile(pdfPath, bufferPdf);

    try {
      await execFileAsync(
        'pdftoppm',
        ['-r', '300', '-png', '-f', '1', '-l', String(maksHalaman), pdfPath, path.join(dir, 'hal')],
        { timeout: 120000 }
      );
    } catch (err) {
      if (err.code === 'ENOENT') throw new Error('PDFTOPPM_TIDAK_ADA');
      throw err;
    }

    const files = (await fs.readdir(dir)).filter((f) => /^hal-\d+\.png$/.test(f)).sort();
    return await Promise.all(files.map((f) => fs.readFile(path.join(dir, f))));
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}
