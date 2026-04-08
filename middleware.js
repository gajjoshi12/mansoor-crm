import { NextResponse } from 'next/server';
import { decrypt, SESSION_COOKIE } from '@/lib/auth';

const protectedRoutes = ['/', '/analytics', '/settings', '/follow-up-1', '/follow-up-2', '/support'];

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  
  // Public routes
  if (pathname === '/login') return NextResponse.next();
  if (pathname.startsWith('/api/auth') || pathname.startsWith('/api/webhook')) return NextResponse.next();

  // Check if it's a protected UI route or protected API route
  const isProtectedPath = protectedRoutes.some(r => pathname === r || pathname.startsWith(r + '/')) || pathname.startsWith('/api/');

  if (isProtectedPath) {
    const sessionCookie = request.cookies.get(SESSION_COOKIE)?.value;
    const session = sessionCookie ? await decrypt(sessionCookie) : null;
    
    if (!session) {
      if (pathname.startsWith('/api/')) {
         return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
