import { prisma } from '@/lib/prisma';
import TambahKKClient from '@/components/admin/TambahKKClient';

export default async function TambahKKPage() {
  const daftarKelurahan = await prisma.kelurahan.findMany({ orderBy: { nama: 'asc' } });

  return (
    <div>
      <h1 className="mb-6 font-display text-xl font-semibold text-ink">Tambah Kartu Keluarga</h1>
      <TambahKKClient daftarKelurahan={daftarKelurahan} />
    </div>
  );
}
