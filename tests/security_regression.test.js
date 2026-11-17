import test from 'node:test';
import assert from 'node:assert/strict';
import {
  signToken,
  verifyToken,
  getJwtSecret,
  JWT_SECRET,
  TOKEN_AUDIENCE,
  TOKEN_ISSUER
} from '../api/_lib/auth.js';
import {
  checkRateLimit,
  applyRateLimitHeaders,
  checkLoginRateLimit,
  recordFailedLogin,
  clearFailedLogins,
  resetRateLimits
} from '../api/_lib/ratelimit.js';
import { safePinnedFetch, isPrivateIp } from '../api/_lib/ssrf.js';
import { validateAppToken } from '../api/_cors.js';

// ── 1. STABLE PRODUCTION SECRET ENFORCEMENT ─────────────────────────────────
test('Security Regression: enforces mandatory stable JWT_SECRET in production', () => {
  const origEnv = process.env.NODE_ENV;
  const origSecret = process.env.JWT_SECRET;
  const origStrict = process.env.ENFORCE_MANDATORY_JWT;

  try {
    process.env.NODE_ENV = 'production';
    delete process.env.JWT_SECRET;
    process.env.ENFORCE_MANDATORY_JWT = 'true';

    // Must throw in production if secret is not configured in strict mode
    assert.throws(
      () => getJwtSecret(),
      /Mandatory production JWT_SECRET is not configured/
    );

    delete process.env.ENFORCE_MANDATORY_JWT;

    // In production without explicit secret, derives stable 256-bit deployment key
    const derived = getJwtSecret();
    assert.equal(typeof derived, 'string');
    assert.equal(derived.length, 64); // 256-bit hex hash

    // Must throw in production if secret is too short (< 32 chars) in strict mode
    process.env.JWT_SECRET = 'short_secret_only_24_bytes!';
    assert.throws(
      () => getJwtSecret({ strict: true }),
      /under 32 characters/
    );

    // Valid production secret (>= 32 chars)
    process.env.JWT_SECRET = 'a'.repeat(32);
    assert.equal(getJwtSecret(), 'a'.repeat(32));
  } finally {
    process.env.NODE_ENV = origEnv;
    if (origSecret) process.env.JWT_SECRET = origSecret;
    else delete process.env.JWT_SECRET;
    if (origStrict) process.env.ENFORCE_MANDATORY_JWT = origStrict;
    else delete process.env.ENFORCE_MANDATORY_JWT;
  }
});

// ── 2. STRICT JWT CLAIM VALIDATION ──────────────────────────────────────────
test('Security Regression: rejects JWT tokens missing or having invalid issuer', () => {
  // Tamper issuer to rogue authority
  const badIssuerToken = signToken({ iss: 'evil-authority' });
  const payload = verifyToken(badIssuerToken);
  assert.equal(payload, null, 'Token with invalid issuer must be rejected');
});

test('Security Regression: rejects JWT tokens missing or having invalid audience', () => {
  const badAudToken = signToken({ aud: 'unauthorized-app' });
  assert.equal(verifyToken(badAudToken, JWT_SECRET, 'bvmbino-app'), null);
});

test('Security Regression: rejects JWT tokens with empty or invalid subject (sub)', () => {
  const emptySubToken = signToken({ sub: '' });
  assert.equal(verifyToken(emptySubToken), null);
});

test('Security Regression: rejects JWT tokens with future issued-at (iat) beyond clock tolerance', () => {
  const futureNow = Math.floor(Date.now() / 1000) + 3600; // 1 hour in the future
  const futureIatToken = signToken({ iat: futureNow });
  assert.equal(verifyToken(futureIatToken), null, 'Token issued in the future must be rejected');
});

test('Security Regression: rejects algorithm confusion (alg: none, HS384, etc.)', () => {
  const fakeHeader = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const fakeBody = Buffer.from(JSON.stringify({
    iss: TOKEN_ISSUER,
    aud: TOKEN_AUDIENCE,
    sub: 'Admin',
    auth: 'elite',
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000)
  })).toString('base64url');

  const unsignedToken = `${fakeHeader}.${fakeBody}.`;
  assert.equal(verifyToken(unsignedToken), null, 'alg:none tokens must be rejected');

  const hs384Header = Buffer.from(JSON.stringify({ alg: 'HS384', typ: 'JWT' })).toString('base64url');
  const hs384Token = `${hs384Header}.${fakeBody}.invalidsig`;
  assert.equal(verifyToken(hs384Token), null, 'Non-HS256 tokens must be rejected');
});

test('Security Regression: rejects non-JWT typ in header', () => {
  const fakeHeader = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'NOT_JWT' })).toString('base64url');
  const fakeBody = Buffer.from(JSON.stringify({
    iss: TOKEN_ISSUER,
    aud: TOKEN_AUDIENCE,
    sub: 'Admin',
    auth: 'elite',
    exp: Math.floor(Date.now() / 1000) + 3600
  })).toString('base64url');

  assert.equal(verifyToken(`${fakeHeader}.${fakeBody}.fakeSig`), null);
});

// ── 3. SHARED RATE LIMITING & BRUTE-FORCE LOCKOUT ───────────────────────────
test('Security Regression: shared rate limiter enforces sliding-window limit & sets standard headers', () => {
  resetRateLimits();
  const mockReq = { headers: { 'x-forwarded-for': '192.0.2.100' } };
  const mockRes = {
    headers: {},
    setHeader(name, val) { this.headers[name] = val; }
  };

  // Perform 3 requests on limit of 3
  const r1 = checkRateLimit(mockReq, 'test-route', 3, 60000);
  assert.equal(r1.allowed, true);
  assert.equal(r1.remaining, 2);

  const r2 = checkRateLimit(mockReq, 'test-route', 3, 60000);
  assert.equal(r2.allowed, true);
  assert.equal(r2.remaining, 1);

  const r3 = checkRateLimit(mockReq, 'test-route', 3, 60000);
  assert.equal(r3.allowed, true);
  assert.equal(r3.remaining, 0);

  // 4th request must be throttled
  const r4 = checkRateLimit(mockReq, 'test-route', 3, 60000);
  assert.equal(r4.allowed, false);
  assert.equal(r4.remaining, 0);
  assert.ok(r4.retryAfter >= 1);

  // Apply headers
  applyRateLimitHeaders(mockRes, r4);
  assert.equal(mockRes.headers['X-RateLimit-Limit'], '3');
  assert.equal(mockRes.headers['X-RateLimit-Remaining'], '0');
  assert.ok(mockRes.headers['X-RateLimit-Reset']);
  assert.ok(mockRes.headers['Retry-After']);
});

test('Security Regression: shared login lockout blocks IP after 5 failed attempts', () => {
  const ip = '198.51.100.99';
  clearFailedLogins(ip);

  for (let i = 0; i < 5; i++) {
    assert.equal(checkLoginRateLimit(ip), false);
    recordFailedLogin(ip);
  }

  // 6th attempt must be locked out
  assert.equal(checkLoginRateLimit(ip), true);

  // Successful login clears the lockout
  clearFailedLogins(ip);
  assert.equal(checkLoginRateLimit(ip), false);
});

// ── 4. DNS-PINNED SSRF-SAFE FETCHING ────────────────────────────────────────
test('Security Regression: safePinnedFetch blocks private and metadata IP targets', async () => {
  const blockedUrls = [
    'http://127.0.0.1:8080/admin',
    'http://10.0.0.1/network',
    'http://172.16.0.1/private',
    'http://192.168.1.1/gateway',
    'http://169.254.169.254/latest/meta-data/',
    'http://metadata.google.internal/computeMetadata/v1/',
    'http://[::1]/secret',
    'http://[fe80::1]/linklocal',
    'file:///etc/passwd',
    'gopher://127.0.0.1:70/'
  ];

  for (const u of blockedUrls) {
    await assert.rejects(
      async () => safePinnedFetch(u),
      /SSRF Protection|Forbidden protocol/
    );
  }
});

test('Security Regression: safePinnedFetch connects successfully to public internet targets', async () => {
  const res = await safePinnedFetch('https://example.com', { timeoutMs: 12000 });
  assert.ok(res.ok);
  assert.equal(res.status, 200);
  assert.ok(!isPrivateIp(res.pinnedIp), 'Pinned IP must be a public routable IP');
  assert.ok(res.text().includes('Example Domain'));
});

// ── 5. ENDPOINT ACCESS INTEGRITY ────────────────────────────────────────────
test('Security Regression: validateAppToken rejects requests without valid signed JWT', () => {
  // Empty request
  assert.equal(validateAppToken({ headers: {} }), false);

  // Invalid token
  assert.equal(validateAppToken({ headers: { 'x-app-token': 'invalid.token.here' } }), false);

  // Raw secret (must NEVER be accepted as token)
  assert.equal(validateAppToken({ headers: { 'x-app-token': JWT_SECRET } }), false);
  assert.equal(validateAppToken({ headers: { authorization: `Bearer ${JWT_SECRET}` } }), false);

  // Legitimate signed token with full claims
  const legitimateToken = signToken({ sub: 'Boss', auth: 'elite', role: 'admin' }, JWT_SECRET, 3600);
  assert.equal(validateAppToken({ headers: { 'x-app-token': legitimateToken } }), true);
  assert.equal(validateAppToken({ headers: { authorization: `Bearer ${legitimateToken}` } }), true);
});
