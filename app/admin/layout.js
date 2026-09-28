import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import LogoutButton from '@/components/admin/LogoutButton';

export default async function AdminLayout({ children }) {
  const session = await getSession();

  if (!session.isLoggedIn) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="flex items-center justify-between bg-ink px-4 py-4 sm:px-6">
        <div>
          <p className="font-display text-lg font-semibold text-paper">Admin Kartu Keluarga</p>
          <p className="text-xs text-paper/70">Masuk sebagai {session.username}</p>
        </div>
        <LogoutButton />
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}