import { NextResponse } from 'next/server';
const { verifyLogin } = require('@/lib/db');
import { encrypt, SESSION_COOKIE } from '@/lib/auth';

export async function POST(request) {
  try {
    const { username, password } = await request.json();
    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
    }

    const user = verifyLogin(username, password);
    if (!user) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const sessionToken = await encrypt({ id: user.id, username: user.username, name: user.name, role: user.role });

    const response = NextResponse.json({ success: true, user });
    response.cookies.set({
      name: SESSION_COOKIE,
      value: sessionToken,
      httpOnly: true,
      path: '/',
      expires
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
