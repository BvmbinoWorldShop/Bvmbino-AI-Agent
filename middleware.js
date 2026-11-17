export const config = {
  matcher: ['/((?!_next|_vercel|favicon).*)'],
};

const TOKEN_AUDIENCE = 'bvmbino-app';
const TOKEN_ISSUER = 'bvmbino-auth';

async function getEdgeSecret() {
  const secret = process.env.JWT_SECRET;
  const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

  // In production, strictly require a proper JWT_SECRET (minimum 32 characters)
  if (isProd) {
    if (!secret || secret.trim().length < 32) {
      console.error('[SECURITY ERROR]: Production deployment strictly requires a secure JWT_SECRET (minimum 32 chars).');
      return null;
    }
    return secret.trim();
  }

  if (secret && secret.trim().length >= 32) {
    return secret.trim();
  }
  return 'bvmbino-dev-deterministic-secret-key-32chars!!';
}

async function verifyEdgeToken(token, secret, expectedAudience) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.trim().split('.');
  if (parts.length !== 3) return false;
  const [encHeader, encPayload, signature] = parts;

  // 1. Check header
  let header;
  try {
    const rawHeader = atob(encHeader.replace(/-/g, '+').replace(/_/g, '/'));
    header = JSON.parse(rawHeader);
  } catch {
    return false;
  }

  if (!header || header.alg !== 'HS256' || header.typ !== 'JWT') {
    return false;
  }

  // 2. Check payload claims
  let payload;
  try {
    const rawPayload = atob(encPayload.replace(/-/g, '+').replace(/_/g, '/'));
    payload = JSON.parse(rawPayload);
  } catch {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  // Expiration check
  if (typeof payload.exp !== 'number' || payload.exp <= now) return false;
  // Issued-at check with 30s clock tolerance
  if (typeof payload.iat === 'number' && payload.iat > now + 30) return false;
  // Audience check
  if (expectedAudience && payload.aud !== expectedAudience) return false;
  // Issuer check
  if (payload.iss && payload.iss !== TOKEN_ISSUER) return false;
  // Subject check
  if (!payload.sub || typeof payload.sub !== 'string') return false;

  // 3. Verify HMAC-SHA256 signature using Web Crypto API
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

  // Check for signed auth session cookie or header
  const cookie = request.headers.get('cookie') || '';
  const authHeader = request.headers.get('authorization') || '';
  const headerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  const xAppToken = request.headers.get('x-app-token') || null;

  const token = 
    cookie.match(/bvmbino_session=([^;]+)/)?.[1] ||
    cookie.match(/bvmbino_auth=([^;]+)/)?.[1] ||
    headerToken ||
    xAppToken;

  const secret = await getEdgeSecret();
  if (token && secret) {
    const isValid = await verifyEdgeToken(token, secret, TOKEN_AUDIENCE);
    if (isValid) return;
  }

  // Not authenticated → redirect to login page
  return Response.redirect(new URL('/auth.html', request.url));
}
