'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Login gagal');
        setLoading(false);
        return;
      }

      router.push('/admin');
      router.refresh();
    } catch (err) {
      setError('Terjadi kesalahan, coba lagi.');
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded border border-line bg-white p-6">
        <h1 className="font-display text-xl font-semibold text-ink">Login Admin</h1>
        <p className="mt-1 text-sm text-ink-soft">Khusus untuk mengelola data Kartu Keluarga.</p>

        {error && (
          <p className="mt-4 rounded border border-seal/30 bg-seal/5 px-3 py-2 text-sm text-seal">{error}</p>
        )}

        <label className="mt-4 block">
          <span className="mb-1.5 block text-sm text-ink-soft">Username</span>
          <input
            type="text"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded border border-line px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
          />
        </label>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-sm text-ink-soft">Password</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded border border-line px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded bg-ink px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-ink-soft disabled:opacity-60"
        >
          {loading ? 'Memproses…' : 'Masuk'}
        </button>
      </form>
    </main>
  );
}