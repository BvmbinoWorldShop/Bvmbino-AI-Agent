export default function middleware(request) {
  const { pathname } = new URL(request.url);

  // Public routes — no auth needed
  const isPublic =
    pathname === '/portfolio.html' ||
    pathname.startsWith('/portfolio') ||
    pathname === '/auth.html' ||
    pathname.startsWith('/auth') ||
    pathname === '/api/auth';

  if (isPublic) return; // pass through

  // Check auth cookie (set by /api/auth after login)
  const cookie = request.headers.get('cookie') || '';
  if (cookie.includes('bvmbino_auth=ok')) return; // authenticated — pass through

  // Not authenticated — redirect to login page
  return new Response(null, {
    status: 302,
    headers: { Location: '/auth.html' },
  });
}

export const config = {
  matcher: '/(.*)',
};
