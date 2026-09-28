'use client';

import KKRow from './KKRow';

export default function KKList({ loading, hasil, onLihatDetail }) {
  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-ink-soft">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-ink" />
        <p className="text-sm">Mencari data kartu keluarga…</p>
      </div>
    );
  }

  if (hasil === null) {
    return (
      <div className="rounded border border-dashed border-line py-14 text-center text-sm text-ink-soft">
        Pilih kelurahan, RT, dan RW untuk menampilkan data kartu keluarga.
      </div>
    );
  }

  if (hasil.length === 0) {
    return (
      <div className="rounded border border-dashed border-line py-14 text-center text-sm text-ink-soft">
        Belum ada kartu keluarga tercatat untuk wilayah ini.
      </div>
    );
  }

  return (
    <div>
      <p className="mb-3 text-sm text-ink-soft">{hasil.length} kartu keluarga ditemukan</p>
      <div className="divide-y divide-line rounded border border-line bg-white">
        {hasil.map((kk) => (
          <KKRow key={kk.id} kk={kk} onLihatDetail={onLihatDetail} />
        ))}
      </div>
    </div>
  );
}
