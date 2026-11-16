import crypto from 'crypto';

// ── 1. CRYPTOGRAPHIC SECRET INITIALIZATION ─────────────────────────────────
// Enforce mandatory production secret.
// If unset in environment, generate an in-memory 256-bit cryptographically secure random secret.
// This guarantees that no static/hardcoded secret exists in the repository or can ever be guessed.
let _activeSecret = process.env.JWT_SECRET;
if (!_activeSecret) {
  if (process.env.NODE_ENV === 'production') {
    console.warn('[SECURITY WARNING]: JWT_SECRET is not set in environment. Generating ephemeral 256-bit secret.');
  }
  _activeSecret = crypto.randomBytes(32).toString('hex');
}
export const JWT_SECRET = _activeSecret;
export const TOKEN_AUDIENCE = 'bvmbino-app';
export const TOKEN_ISSUER = 'bvmbino-auth';

// ── 2. LOGIN RATE LIMITING & BRUTE-FORCE PROTECTION ─────────────────────────
// Max 5 failed login attempts per 15-minute window per IP
const FAILED_LOGIN_LIMIT = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;
const failedLoginMap = new Map();

/**
 * Check whether an IP is currently locked out from logging in
 * Returns true if locked out, false if allowed to attempt
 */
export function checkLoginRateLimit(ip) {
  if (!ip) return false;
  const now = Date.now();
  const entry = failedLoginMap.get(ip);
  if (!entry) return false;

  if (now - entry.firstAttempt > LOCKOUT_WINDOW_MS) {
    failedLoginMap.delete(ip);
    return false;
  }

  return entry.count >= FAILED_LOGIN_LIMIT;
}

/**
 * Record a failed login attempt for an IP
 */
export function recordFailedLogin(ip) {
  if (!ip) return;
  const now = Date.now();
  const entry = failedLoginMap.get(ip);

  if (!entry || now - entry.firstAttempt > LOCKOUT_WINDOW_MS) {
    failedLoginMap.set(ip, { count: 1, firstAttempt: now });
  } else {
    entry.count += 1;
    failedLoginMap.set(ip, entry);
  }

  // Cleanup old records if map grows large
  if (failedLoginMap.size > 2000) {
    for (const [k, v] of failedLoginMap.entries()) {
      if (now - v.firstAttempt > LOCKOUT_WINDOW_MS) failedLoginMap.delete(k);
    }
  }
}

/**
 * Clear failed login attempts for an IP upon successful authentication
 */
export function clearFailedLogins(ip) {
  if (ip) failedLoginMap.delete(ip);
}

// ── 3. TOKEN SIGNING & VERIFICATION ─────────────────────────────────────────
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

// ── 4. ADMINISTRATOR CREDENTIALS CHECK (NO DEFAULT IN SOURCE) ───────────────
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

  // Mandatory: Credentials must be explicitly configured in environment variables
  if (!configuredUser || !rawPasswords) {
    console.error('[SECURITY WARNING]: Admin authentication rejected — ADMIN_USER or ADMIN_PASSWORD(S) is not configured in environment variables.');
    return false;
  }

  if (u !== configuredUser) return false;

  // Support rotated passwords via comma-separated list
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
