import test from 'node:test';
import assert from 'node:assert/strict';
import {
  signToken,
  verifyToken,
  checkAdminCredentials,
  checkLoginRateLimit,
  recordFailedLogin,
  clearFailedLogins,
  JWT_SECRET,
  TOKEN_AUDIENCE
} from '../api/_lib/auth.js';
import { validateAppToken } from '../api/_cors.js';

test('Security: JWT_SECRET has no predictable static fallback', () => {
  assert.ok(JWT_SECRET && typeof JWT_SECRET === 'string');
  assert.ok(JWT_SECRET.length >= 32);
  // Ensure legacy vulnerable fallback string is never used
  assert.notEqual(JWT_SECRET, 'bvmbino-secret-v3');
  assert.notEqual(JWT_SECRET, 'bvmbino-prod-secret-v4-s0v3r31gn');
});

test('Security: rejects default administrator credentials when env is empty', () => {
  // Clear env credentials
  const origUser = process.env.ADMIN_USER;
  const origPass = process.env.ADMIN_PASSWORD;
  const origPasses = process.env.ADMIN_PASSWORDS;
  delete process.env.ADMIN_USER;
  delete process.env.ADMIN_PASSWORD;
  delete process.env.ADMIN_PASSWORDS;

  // Must reject any credentials when unconfigured in env
  assert.equal(checkAdminCredentials('LATAUPE95', 'Tyanna225'), false);
  assert.equal(checkAdminCredentials('admin', 'admin'), false);
  assert.equal(checkAdminCredentials('', ''), false);

  // Restore env
  if (origUser) process.env.ADMIN_USER = origUser;
  if (origPass) process.env.ADMIN_PASSWORD = origPass;
  if (origPasses) process.env.ADMIN_PASSWORDS = origPasses;
});

test('Security: authenticates only when credentials are explicitly set in env', () => {
  process.env.ADMIN_USER = 'SOVEREIGN_BOSS';
  process.env.ADMIN_PASSWORDS = 'UltraSecureKey2026,BackupPass99';

  assert.equal(checkAdminCredentials('sovereign_boss', 'UltraSecureKey2026'), true);
  assert.equal(checkAdminCredentials('SOVEREIGN_BOSS', 'BackupPass99'), true);
  assert.equal(checkAdminCredentials('SOVEREIGN_BOSS', 'WrongPassword'), false);
  assert.equal(checkAdminCredentials('Attacker', 'UltraSecureKey2026'), false);

  delete process.env.ADMIN_USER;
  delete process.env.ADMIN_PASSWORDS;
});

test('Security: enforces login rate limiting (locks out after 5 failed attempts)', () => {
  const testIp = '198.51.100.42';
  clearFailedLogins(testIp);

  // First 4 failed attempts should not trigger lockout
  for (let i = 0; i < 4; i++) {
    const isLocked = checkLoginRateLimit(testIp);
    assert.equal(isLocked, false);
    recordFailedLogin(testIp);
  }

  // 5th failed attempt
  recordFailedLogin(testIp);

  // 6th attempt should be blocked by rate limiter
  const isLockedAfter5 = checkLoginRateLimit(testIp);
  assert.equal(isLockedAfter5, true, 'IP should be locked out after 5 failed login attempts');

  // Resetting on successful login clears lockout
  clearFailedLogins(testIp);
  assert.equal(checkLoginRateLimit(testIp), false);
});

test('Security: validateAppToken does NOT accept raw JWT_SECRET as token', () => {
  const mockReqWithSecret = {
    headers: {
      'x-app-token': JWT_SECRET
    }
  };
  // Should reject the raw secret itself — only signed JWT tokens with exp and aud are valid
  assert.equal(validateAppToken(mockReqWithSecret), false);

  const mockReqWithBearerSecret = {
    headers: {
      'authorization': `Bearer ${JWT_SECRET}`
    }
  };
  assert.equal(validateAppToken(mockReqWithBearerSecret), false);
});

test('Security: validateAppToken accepts valid signed JWT token', () => {
  const validJwt = signToken({ sub: 'Boss', auth: 'elite', role: 'admin' }, JWT_SECRET, 3600);
  const mockReq = {
    headers: {
      'x-app-token': validJwt
    }
  };
  assert.equal(validateAppToken(mockReq), true);
});
