export default function middleware(request) {
  const { pathname } = new URL(request.url);

  // Portfolio is PUBLIC — no auth needed
  if (
    pathname === '/portfolio.html' ||
    pathname === '/portfolio' ||
    pathname.startsWith('/portfolio')
  ) {
    return; // pass through
  }

  // Check Basic Auth header
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Basic ')) {
    try {
      const base64 = authHeader.slice(6);
      const decoded = atob(base64);
      const password = decoded.split(':')[1];
      if (password === '021291') {
        return; // correct password — allow through
      }
    } catch {}
  }

  // Block — return 401 with WWW-Authenticate to trigger browser dialog
  return new Response(null, {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Bvmbino AI Agent"',
    },
  });
}

export const config = {
  matcher: '/(.*)',
};
