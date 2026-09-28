import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import DeleteKKButton from '@/components/admin/DeleteKKButton';

export default async function AdminDashboard({ searchParams }) {
  const q = (searchParams?.q || '').trim();

  const daftarKK = await prisma.kartuKeluarga.findMany({
    where: q
      ? {
          OR: [{ kepalaKeluarga: { contains: q, mode: 'insensitive' } }, { noKK: { contains: q } }],
        }
      : undefined,
    include: { kelurahan: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-xl font-semibold text-ink">Data Kartu Keluarga</h1>
        <Link
          href="/admin/tambah"
          className="inline-block rounded bg-ink px-4 py-2 text-center text-sm font-medium text-paper hover:bg-ink-soft"
        >
          + Tambah KK
        </Link>
      </div>

      <form className="mt-6" action="/admin">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Cari nama kepala keluarga atau No. KK…"
          className="w-full rounded border border-line px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink sm:max-w-sm"
        />
      </form>

      <div className="mt-4 divide-y divide-line rounded border border-line bg-white">
        {daftarKK.length === 0 && <p className="p-4 text-sm text-ink-soft">Belum ada data.</p>}
        {daftarKK.map((kk) => (
          <div key={kk.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-xs text-ink-soft">{kk.noKK}</p>
              <p className="text-sm font-medium text-ink">{kk.kepalaKeluarga}</p>
              <p className="text-xs text-ink-soft">
                {kk.kelurahan.nama} · RT {kk.rt}/RW {kk.rw} · Desil {kk.desil}
              </p>
            </div>
              <div className="flex shrink-0 gap-2">
                {kk.fileAsliPath && (
                
                  href={`/api/kk/${kk.id}/file`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded border border-line px-3 py-1.5 text-sm text-ink hover:bg-paper"
                >
                  Lihat file
                </a>
              )}
                <Link
                  href={`/admin/${kk.id}/edit`}
                  className="rounded border border-line px-3 py-1.5 text-sm text-ink hover:bg-paper"
                >
                  Edit
                </Link>
                <DeleteKKButton id={kk.id} />
              </div>
          </div>
        ))}
      </div>
    </div>
  );
}