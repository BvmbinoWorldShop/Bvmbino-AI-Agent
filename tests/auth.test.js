import test from 'node:test';
import assert from 'node:assert/strict';
import { signToken, verifyToken, checkAdminCredentials, JWT_SECRET, TOKEN_AUDIENCE } from '../api/_lib/auth.js';

test('Auth: signs and verifies a valid token', () => {
  const token = signToken({ sub: 'Lataupe95', role: 'admin' });
  assert.ok(typeof token === 'string' && token.split('.').length === 3);

  const payload = verifyToken(token);
  assert.ok(payload);
  assert.equal(payload.sub, 'Lataupe95');
  assert.equal(payload.role, 'admin');
  assert.equal(payload.aud, TOKEN_AUDIENCE);
  assert.ok(payload.exp > Math.floor(Date.now() / 1000));
});

test('Auth: rejects expired tokens', () => {
  // Signed with exp in the past (-10 seconds)
  const token = signToken({ sub: 'expiredUser' }, JWT_SECRET, -10);
  const payload = verifyToken(token);
  assert.equal(payload, null);
});

test('Auth: rejects token with wrong audience', () => {
  const token = signToken({ sub: 'user', aud: 'malicious-aud' });
  const payload = verifyToken(token, JWT_SECRET, 'bvmbino-app');
  assert.equal(payload, null);
});

test('Auth: rejects tampered signature or body', () => {
  const token = signToken({ sub: 'Lataupe95' });
  const [h, b, s] = token.split('.');

  // Tampered payload
  const tamperedPayload = Buffer.from(JSON.stringify({ sub: 'hacker', aud: TOKEN_AUDIENCE })).toString('base64url');
  assert.equal(verifyToken(`${h}.${tamperedPayload}.${s}`), null);

  // Tampered signature
  assert.equal(verifyToken(`${h}.${b}.${s.slice(0, -4)}AAAA`), null);
});

test('Auth: rejects token signed with different secret', () => {
  const token = signToken({ sub: 'user' }, 'other-secret-key-12345');
  assert.equal(verifyToken(token, JWT_SECRET), null);
});

test('Auth: validates admin credentials and supports rotation', () => {
  // Standard default credentials
  assert.equal(checkAdminCredentials('LATAUPE95', 'Tyanna225'), true);
  assert.equal(checkAdminCredentials('lataupe95', '021291'), true); // case-insensitive user
  assert.equal(checkAdminCredentials('LATAUPE95', 'wrongpass'), false);
  assert.equal(checkAdminCredentials('UNKNOWN', 'Tyanna225'), false);

  // Dynamic env rotation test
  process.env.ADMIN_USER = 'SUPERADMIN';
  process.env.ADMIN_PASSWORDS = 'newsecret123,backupsecret456';
  assert.equal(checkAdminCredentials('superadmin', 'newsecret123'), true);
  assert.equal(checkAdminCredentials('SUPERADMIN', 'backupsecret456'), true);
  assert.equal(checkAdminCredentials('superadmin', 'Tyanna225'), false);

  // Restore defaults
  delete process.env.ADMIN_USER;
  delete process.env.ADMIN_PASSWORDS;
});
