import crypto from 'crypto';

export const JWT_SECRET = process.env.JWT_SECRET || 'bvmbino-prod-secret-v4-s0v3r31gn';
export const TOKEN_AUDIENCE = 'bvmbino-app';
export const TOKEN_ISSUER = 'bvmbino-auth';

/**
 * Sign an HMAC-SHA256 JWT with expiration and audience claims
 */
export function signToken(payload = {}, secret = JWT_SECRET, expiresInSec = 30 * 24 * 3600) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    iss: TOKEN_ISSUER,
    aud: TOKEN_AUDIENCE,
    iat: now,
    exp: now + expiresInSec,
    auth: 'elite',
    ...payload,
  };
  const encHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encPayload = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${encHeader}.${encPayload}`)
    .digest('base64url');
  return `${encHeader}.${encPayload}.${signature}`;
}

/**
 * Verify HMAC-SHA256 signature, expiration timestamp, and audience
 */
export function verifyToken(token, secret = JWT_SECRET, expectedAudience = TOKEN_AUDIENCE) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.trim().split('.');
  if (parts.length !== 3) return null;
  const [encHeader, encPayload, signature] = parts;

  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(`${encHeader}.${encPayload}`)
    .digest('base64url');

  if (signature.length !== expectedSig.length) return null;
  try {
    const validSig = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig));
    if (!validSig) return null;
  } catch {
    return null;
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.from(encPayload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  // Expiration check
  if (typeof payload.exp === 'number' && payload.exp < now) {
    return null;
  }
  // Audience check
  if (expectedAudience && payload.aud !== expectedAudience) {
    return null;
  }

  return payload;
}

/**
 * Check admin username & password against environment variables (with rotation support)
 */
export function checkAdminCredentials(username, password) {
  const u = (username || '').trim().toUpperCase();
  const p = (password || '').trim();
  if (!u || !p) return false;

  const configuredUser = (process.env.ADMIN_USER || 'LATAUPE95').trim().toUpperCase();
  if (u !== configuredUser) return false;

  // Support rotated passwords via comma-separated list, e.g. ADMIN_PASSWORDS="newpass,Tyanna225,021291"
  const rawPasswords = process.env.ADMIN_PASSWORDS || process.env.ADMIN_PASSWORD || 'Tyanna225,021291';
  const allowedPasswords = rawPasswords.split(',').map(s => s.trim()).filter(Boolean);

  return allowedPasswords.some(allowed => allowed === p);
}
