import crypto from 'crypto';
export {
  checkLoginRateLimit,
  recordFailedLogin,
  clearFailedLogins
} from './ratelimit.js';

export const TOKEN_AUDIENCE = 'bvmbino-app';
export const TOKEN_ISSUER = 'bvmbino-auth';
const CLOCK_TOLERANCE_SEC = 30; // Max allowable clock skew

/**
 * Resolve stable JWT Secret.
 * In production, an explicit JWT_SECRET environment variable of >= 32 characters is strictly mandatory.
 * In development/test, a deterministic 32-character key is used if unset.
 */
export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  const isProd = process.env.NODE_ENV === 'production';

  if (!secret || secret.trim().length < 32) {
    if (isProd) {
      throw new Error(
        '[SECURITY ERROR]: Mandatory production JWT_SECRET is not configured or is under 32 characters. ' +
        'Set JWT_SECRET in your Vercel Environment Variables.'
      );
    }
    return 'bvmbino-dev-deterministic-secret-key-32chars!!';
  }

  return secret.trim();
}

export const JWT_SECRET = getJwtSecret();

/**
 * Sign an HMAC-SHA256 JWT with strict standard claims
 */
export function signToken(payload = {}, secret = JWT_SECRET, expiresInSec = 30 * 24 * 3600) {
  const activeSecret = secret || getJwtSecret();
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);

  const fullPayload = {
    iss: TOKEN_ISSUER,
    aud: TOKEN_AUDIENCE,
    iat: now,
    exp: now + expiresInSec,
    auth: 'elite',
    sub: payload.sub || 'Lataupe95',
    ...payload,
  };

  const encHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encPayload = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', activeSecret)
    .update(`${encHeader}.${encPayload}`)
    .digest('base64url');

  return `${encHeader}.${encPayload}.${signature}`;
}

/**
 * Strict JWT verification enforcing signature, algorithm, and all required claims
 */
export function verifyToken(token, secret = JWT_SECRET, expectedAudience = TOKEN_AUDIENCE) {
  if (!token || typeof token !== 'string') return null;

  const parts = token.trim().split('.');
  if (parts.length !== 3) return null;
  const [encHeader, encPayload, signature] = parts;

  // 1. Verify Header
  let header;
  try {
    header = JSON.parse(Buffer.from(encHeader, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  // Strict algorithm and type enforcement (prevents alg:none and confusion attacks)
  if (!header || header.alg !== 'HS256' || header.typ !== 'JWT') {
    return null;
  }

  // 2. Verify Cryptographic Signature with Timing-Safe Equality
  let activeSecret;
  try {
    activeSecret = secret || getJwtSecret();
  } catch {
    return null;
  }

  const expectedSig = crypto
    .createHmac('sha256', activeSecret)
    .update(`${encHeader}.${encPayload}`)
    .digest('base64url');

  if (signature.length !== expectedSig.length) return null;
  try {
    const validSig = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig));
    if (!validSig) return null;
  } catch {
    return null;
  }

  // 3. Verify Payload Claims
  let payload;
  try {
    payload = JSON.parse(Buffer.from(encPayload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  if (!payload || typeof payload !== 'object') return null;

  const now = Math.floor(Date.now() / 1000);

  // Expiration Claim (exp)
  if (typeof payload.exp !== 'number' || payload.exp <= now) {
    return null;
  }

  // Issued-At Claim (iat) with clock tolerance
  if (typeof payload.iat === 'number' && payload.iat > now + CLOCK_TOLERANCE_SEC) {
    return null;
  }

  // Audience Claim (aud)
  if (expectedAudience && payload.aud !== expectedAudience) {
    return null;
  }

  // Issuer Claim (iss)
  if (payload.iss && payload.iss !== TOKEN_ISSUER) {
    return null;
  }

  // Subject Claim (sub)
  if (!payload.sub || typeof payload.sub !== 'string' || payload.sub.trim().length === 0) {
    return null;
  }

  // Role / Auth Claim
  if (payload.auth !== 'elite' && payload.role !== 'admin') {
    return null;
  }

  return payload;
}

/**
 * Check admin username & password strictly against environment variables.
 * If ADMIN_USER or ADMIN_PASSWORD(S) is not configured in env, authentication is denied.
 */
export function checkAdminCredentials(username, password) {
  const u = (username || '').trim().toUpperCase();
  const p = (password || '').trim();
  if (!u || !p) return false;

  const configuredUser = (process.env.ADMIN_USER || '').trim().toUpperCase();
  const rawPasswords = process.env.ADMIN_PASSWORDS || process.env.ADMIN_PASSWORD || '';

  if (!configuredUser || !rawPasswords) {
    console.error('[SECURITY WARNING]: Admin authentication rejected — ADMIN_USER or ADMIN_PASSWORD(S) is not configured in environment variables.');
    return false;
  }

  if (u !== configuredUser) return false;

  const allowedPasswords = rawPasswords.split(',').map(s => s.trim()).filter(Boolean);
  return allowedPasswords.some(allowed => {
    if (allowed.length !== p.length) return false;
    try {
      return crypto.timingSafeEqual(Buffer.from(allowed), Buffer.from(p));
    } catch {
      return false;
    }
  });
}
