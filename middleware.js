export default function middleware(request) {
  const { pathname } = new URL(request.url);

  // Never block: auth page, auth API, portfolio, static assets
  if (
    pathname === '/auth.html' ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/portfolio') ||
    pathname.startsWith('/api/') ||
    pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|webp|woff|woff2|ttf|json|txt)$/)
  ) {
    return; // pass through — no auth needed
  }

  // Check auth cookie
  const cookie = request.headers.get('cookie') || '';
  if (cookie.includes('bvmbino_auth=ok')) return; // authenticated ✓

  // Not authenticated → send to login
  return new Response(null, {
    status: 302,
    headers: {
      Location: '/auth.html',
      'Cache-Control': 'no-store',
    },
  });
}

// Match ALL routes except Next.js internals
export const config = {
  matcher: ['/((?!_next|_vercel).*)'],
};
