import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';

export const sessionOptions = {
  password: process.env.SESSION_SECRET,
  cookieName: 'kk_admin_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
  },
};

// Next.js 14 App Router: cookies() itu sendiri sinkron, getIronSession() yang async.
export async function getSession() {
  return getIronSession(cookies(), sessionOptions);
}