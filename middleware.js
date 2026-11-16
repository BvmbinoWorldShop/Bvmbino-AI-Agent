export const config = {
  matcher: ['/((?!_next|_vercel|favicon).*)'],
};

const JWT_SECRET = process.env.JWT_SECRET || '';
const TOKEN_AUDIENCE = 'bvmbino-app';

async function verifyEdgeToken(token, secret, expectedAudience) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.trim().split('.');
  if (parts.length !== 3) return false;
  const [encHeader, encPayload, signature] = parts;

  // Verify payload claims (exp, aud)
  let payload;
  try {
    const rawPayload = atob(encPayload.replace(/-/g, '+').replace(/_/g, '/'));
    payload = JSON.parse(rawPayload);
  } catch {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp === 'number' && payload.exp < now) return false;
  if (expectedAudience && payload.aud !== expectedAudience) return false;

  // Verify HMAC-SHA256 signature using Web Crypto API (Vercel Edge Runtime)
  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const binSig = atob(signature.replace(/-/g, '+').replace(/_/g, '/'));
    const sigBytes = new Uint8Array(binSig.length);
    for (let i = 0; i < binSig.length; i++) sigBytes[i] = binSig.charCodeAt(i);

    const data = enc.encode(`${encHeader}.${encPayload}`);
    return await crypto.subtle.verify('HMAC', key, sigBytes, data);
  } catch {
    return false;
  }
}

export default async function middleware(request) {
  const { pathname } = new URL(request.url);

  // Public assets & endpoints — always pass through
  const isPublic =
    pathname === '/auth.html' ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/api/') ||
    /\.(js|css|png|jpg|jpeg|svg|ico|webp|woff|woff2|ttf|json|txt|xml|map|br|gz)$/.test(pathname);

  if (isPublic) return;

  // Check for signed auth session cookie
  const cookie = request.headers.get('cookie') || '';
  const token = 
    cookie.match(/bvmbino_session=([^;]+)/)?.[1] ||
    cookie.match(/bvmbino_auth=([^;]+)/)?.[1];

  if (token) {
    const isValid = await verifyEdgeToken(token, JWT_SECRET, TOKEN_AUDIENCE);
    if (isValid) return; // Authenticated with valid signed token
  }

  // Not authenticated → redirect to login page
  return Response.redirect(new URL('/auth.html', request.url));
}
