import { NextResponse } from 'next/server';

export const config = {
  matcher: ['/((?!_next|_vercel|favicon).*)'],
};

export default function middleware(request) {
  const { pathname } = new URL(request.url);

  // Public — always pass through without auth check
  const isPublic =
    pathname === '/auth.html' ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/portfolio') ||
    pathname.startsWith('/api/') ||
    /\.(js|css|png|jpg|jpeg|svg|ico|webp|woff|woff2|ttf|json|txt|xml|map)$/.test(pathname);

  if (isPublic) return NextResponse.next(); // ← explicit pass-through → rewrites apply ✓

  // Check for auth cookie
  const cookie = request.headers.get('cookie') || '';
  if (cookie.includes('bvmbino_auth=ok')) return NextResponse.next(); // authenticated ✓

  // Not authenticated → login page
  return NextResponse.redirect(new URL('/auth.html', request.url));
}
