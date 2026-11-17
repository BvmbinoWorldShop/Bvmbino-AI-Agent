import test from 'node:test';
import assert from 'node:assert/strict';
import {
  checkRateLimit,
  applyRateLimitHeaders,
  signRateLimitTicket,
  verifyRateLimitTicket,
  recordFailedLogin,
  checkLoginRateLimit,
  clearFailedLogins,
  resetRateLimits
} from '../api/_lib/ratelimit.js';

test('Shared Rate Limiting: signed tickets maintain request count across separate serverless instances', () => {
  resetRateLimits();
  const ip = '198.51.100.42';

  // Instance 1: First request
  const req1 = { headers: { 'x-forwarded-for': ip } };
  const res1 = { headers: {}, setHeader(k, v) { this.headers[k.toLowerCase()] = v; } };
  const r1 = checkRateLimit(req1, 'test-route', 3, 60000);
  applyRateLimitHeaders(res1, r1);

  assert.equal(r1.allowed, true);
  assert.equal(r1.remaining, 2);
  const ticket1 = res1.headers['x-ratelimit-ticket'];
  assert.ok(ticket1, 'Ticket must be returned');

  // Instance 2 (different memory context simulated by clearing in-memory store):
  resetRateLimits();
  const req2 = {
    headers: {
      'x-forwarded-for': ip,
      'x-ratelimit-ticket': ticket1 // Client sends ticket to instance 2
    }
  };
  const res2 = { headers: {}, setHeader(k, v) { this.headers[k.toLowerCase()] = v; } };
  const r2 = checkRateLimit(req2, 'test-route', 3, 60000);
  applyRateLimitHeaders(res2, r2);

  assert.equal(r2.allowed, true);
  assert.equal(r2.remaining, 1, 'Instance 2 must detect previous request count via ticket');
  const ticket2 = res2.headers['x-ratelimit-ticket'];

  // Instance 3: Third request (Limit reached)
  resetRateLimits();
  const req3 = {
    headers: {
      'x-forwarded-for': ip,
      'x-ratelimit-ticket': ticket2
    }
  };
  const res3 = { headers: {}, setHeader(k, v) { this.headers[k.toLowerCase()] = v; } };
  const r3 = checkRateLimit(req3, 'test-route', 3, 60000);
  applyRateLimitHeaders(res3, r3);

  assert.equal(r3.allowed, true);
  assert.equal(r3.remaining, 0);
  const ticket3 = res3.headers['x-ratelimit-ticket'];

  // Instance 4: Fourth request (Exceeded limit -> Blocked)
  resetRateLimits();
  const req4 = {
    headers: {
      'x-forwarded-for': ip,
      'x-ratelimit-ticket': ticket3
    }
  };
  const res4 = { headers: {}, setHeader(k, v) { this.headers[k.toLowerCase()] = v; } };
  const r4 = checkRateLimit(req4, 'test-route', 3, 60000);
  applyRateLimitHeaders(res4, r4);

  assert.equal(r4.allowed, false, 'Request must be blocked across stateless instances');
  assert.equal(r4.remaining, 0);
  assert.ok(r4.retryAfter > 0);
});

test('Shared Rate Limiting: rejects tampered or forged rate limit tickets', () => {
  const ip = '198.51.100.88';
  const realTicket = signRateLimitTicket({ ip, count: 2, windowStart: Date.now() });

  // Tamper with payload
  const [, sig] = realTicket.split('.');
  const forgedPayload = Buffer.from(JSON.stringify({ ip, count: 0, windowStart: Date.now() })).toString('base64url');
  const tamperedTicket = `${forgedPayload}.${sig}`;

  const verified = verifyRateLimitTicket(tamperedTicket);
  assert.equal(verified, null, 'Tampered ticket signature must fail verification');
});

test('Shared Rate Limiting: enforces brute-force login lockout across serverless instances', () => {
  resetRateLimits();
  const ip = '203.0.113.99';
  let lastTicket = null;

  // Simulate 5 failed login attempts across different serverless invocations
  for (let i = 1; i <= 5; i++) {
    const res = { headers: {}, setHeader(k, v) { this.headers[k.toLowerCase()] = v; } };
    lastTicket = recordFailedLogin(ip, res);
    assert.ok(lastTicket);
  }

  // Simulate new serverless instance with cleared local memory
  resetRateLimits();
  const reqFromNewInstance = {
    headers: {
      'x-forwarded-for': ip,
      'x-lockout-ticket': lastTicket
    }
  };

  const isLocked = checkLoginRateLimit(ip, reqFromNewInstance);
  assert.equal(isLocked, true, 'IP must be locked out on any serverless instance via ticket');

  // Verify clearing login lockout
  clearFailedLogins(ip);
  assert.equal(checkLoginRateLimit(ip), false, 'Lockout must be cleared on successful login');
});
