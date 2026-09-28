'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function DeleteKKButton({ id }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm('Hapus data KK ini? Tindakan ini tidak bisa dibatalkan.')) return;
    setLoading(true);
    await fetch(`/api/kk/${id}`, { method: 'DELETE' });
    router.refresh();
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="rounded border border-seal/40 px-3 py-1.5 text-sm text-seal hover:bg-seal/5 disabled:opacity-60"
    >
      {loading ? 'Menghapus…' : 'Hapus'}
    </button>
  );
}