import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSafeUrl, isPrivateIp } from '../api/_lib/ssrf.js';

test('SSRF: blocks loopback IPv4 and IPv6 addresses', async () => {
  assert.equal(isPrivateIp('127.0.0.1'), true);
  assert.equal(isPrivateIp('127.12.34.56'), true);
  assert.equal(isPrivateIp('::1'), true);

  await assert.rejects(
    async () => validateSafeUrl('http://127.0.0.1/admin'),
    /restricted private\/internal/
  );
  await assert.rejects(
    async () => validateSafeUrl('http://[::1]/status'),
    /restricted private\/internal/
  );
});

test('SSRF: blocks RFC 1918 private IPv4 ranges', async () => {
  assert.equal(isPrivateIp('10.0.0.1'), true);
  assert.equal(isPrivateIp('172.16.0.1'), true);
  assert.equal(isPrivateIp('172.31.255.255'), true);
  assert.equal(isPrivateIp('192.168.1.100'), true);

  await assert.rejects(
    async () => validateSafeUrl('http://10.1.2.3:8080'),
    /restricted private\/internal/
  );
  await assert.rejects(
    async () => validateSafeUrl('http://172.20.0.5/api'),
    /restricted private\/internal/
  );
  await assert.rejects(
    async () => validateSafeUrl('http://192.168.0.1/router'),
    /restricted private\/internal/
  );
});

test('SSRF: blocks link-local and cloud metadata addresses', async () => {
  assert.equal(isPrivateIp('169.254.169.254'), true);
  assert.equal(isPrivateIp('169.254.1.1'), true);

  await assert.rejects(
    async () => validateSafeUrl('http://169.254.169.254/latest/meta-data/'),
    /SSRF Protection/
  );
  await assert.rejects(
    async () => validateSafeUrl('http://metadata.google.internal/computeMetadata/v1/'),
    /SSRF Protection/
  );
});

test('SSRF: blocks private/unique local IPv6 ranges and IPv4-mapped IPv6', async () => {
  assert.equal(isPrivateIp('fe80::1'), true);
  assert.equal(isPrivateIp('fc00::abcd'), true);
  assert.equal(isPrivateIp('::ffff:127.0.0.1'), true);
  assert.equal(isPrivateIp('::ffff:192.168.1.1'), true);

  await assert.rejects(
    async () => validateSafeUrl('http://[fe80::1]/admin'),
    /restricted private\/internal/
  );
  await assert.rejects(
    async () => validateSafeUrl('http://[::ffff:127.0.0.1]/secret'),
    /restricted private\/internal/
  );
});

test('SSRF: rejects non-http/https protocols', async () => {
  await assert.rejects(
    async () => validateSafeUrl('file:///etc/passwd'),
    /Forbidden protocol/
  );
  await assert.rejects(
    async () => validateSafeUrl('gopher://127.0.0.1:70/'),
    /Forbidden protocol/
  );
  await assert.rejects(
    async () => validateSafeUrl('ftp://example.com/test'),
    /Forbidden protocol/
  );
});

test('SSRF: allows valid public internet domains', async () => {
  const result = await validateSafeUrl('https://example.com');
  assert.ok(result);
  assert.ok(result.url.startsWith('https://example.com'));
  assert.ok(result.ip && !isPrivateIp(result.ip));
});
