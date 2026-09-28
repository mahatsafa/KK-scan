import { getSession } from '@/lib/session';

export async function POST(request) {
  const { username, password } = await request.json();

  const validUsername = username === process.env.ADMIN_USER;
  const validPassword = password === process.env.ADMIN_PASSWORD;

  if (!validUsername || !validPassword) {
    return Response.json({ message: 'Username atau password salah' }, { status: 401 });
  }

  const session = await getSession();
  session.isLoggedIn = true;
  session.username = username;
  await session.save();

  return Response.json({ success: true });
}
