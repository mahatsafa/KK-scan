import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import KKForm from '@/components/admin/KKForm';

export default async function EditKKPage({ params }) {
  const [daftarKelurahan, kk] = await Promise.all([
    prisma.kelurahan.findMany({ orderBy: { nama: 'asc' } }),
    prisma.kartuKeluarga.findUnique({
      where: { id: params.id },
      include: { anggota: true },
    }),
  ]);

  if (!kk) notFound();

  return (
    <div>
      <h1 className="mb-6 font-display text-xl font-semibold text-ink">Edit Kartu Keluarga</h1>
      <KKForm daftarKelurahan={daftarKelurahan} initialData={kk} kkId={kk.id} />
    </div>
  );
}