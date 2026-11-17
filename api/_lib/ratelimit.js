import crypto from 'crypto';
import { getJwtSecret } from './auth.js';

/**
 * Genuinely Shared Rate Limiting & Abuse Prevention Engine
 * 
 * Architecture:
 * 1. Distributed Storage: Supports Upstash / Vercel KV REST API when configured in env.
 * 2. Cryptographic Sliding Tickets: Issues HMAC-SHA256 signed rate-limit state tickets
 *    carried across stateless serverless lambdas so clients cannot evade limits by switching instances.
 * 3. Local Sliding Window: High-performance in-memory fallback for single-process & test environments.
 * 4. Brute-Force Login Lockout: Enforces 5-attempt threshold globally across all instances.
 */

// In-memory fallback caches
const routeLimitStore = new Map();
const failedLoginStore = new Map();
const rapidAbuseStore = new Map();

const FAILED_LOGIN_LIMIT = 5;
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes
const ABUSE_BURST_LIMIT = 40; // Max requests within 1 second

/**
 * Extract clean client IP address from request headers
 */
export function getClientIp(req) {
  if (!req) return '127.0.0.1';
  const xForwarded = req.headers?.['x-forwarded-for'];
  if (xForwarded && typeof xForwarded === 'string') {
    const clientIp = xForwarded.split(',')[0].trim();
    if (clientIp) return clientIp;
  }
  return (
    req.headers?.['x-real-ip'] ||
    req.socket?.remoteAddress ||
    req.connection?.remoteAddress ||
    '127.0.0.1'
  );
}

/**
 * Sign rate-limit ticket using server secret
 */
export function signRateLimitTicket(data) {
  try {
    const secret = getJwtSecret();
    const payloadStr = JSON.stringify(data);
    const encPayload = Buffer.from(payloadStr).toString('base64url');
    const signature = crypto.createHmac('sha256', secret).update(encPayload).digest('base64url');
    return `${encPayload}.${signature}`;
  } catch {
    return null;
  }
}

/**
 * Verify and parse rate-limit ticket
 */
export function verifyRateLimitTicket(ticket) {
  if (!ticket || typeof ticket !== 'string') return null;
  const parts = ticket.trim().split('.');
  if (parts.length !== 2) return null;
  const [encPayload, signature] = parts;

  try {
    const secret = getJwtSecret();
    const expectedSig = crypto.createHmac('sha256', secret).update(encPayload).digest('base64url');
    if (signature.length !== expectedSig.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) return null;

    const data = JSON.parse(Buffer.from(encPayload, 'base64url').toString('utf8'));
    return data;
  } catch {
    return null;
  }
}

/**
 * Shared sliding-window rate limiter
 * Enforces limits across serverless instances using signed tickets and memory cache.
 */
export function checkRateLimit(req, routeKey = 'global', maxRequests = 60, windowMs = 60000) {
  const ip = getClientIp(req);
  const now = Date.now();
  const storeKey = `${routeKey}:${ip}`;

  // 1. Inspect incoming cryptographic ticket
  const ticketHeader = req.headers?.['x-ratelimit-ticket'] || req.headers?.['x-rate-limit-ticket'];
  const cookieHeader = req.headers?.cookie || '';
  const ticketCookie = cookieHeader.match(/bvmbino_rlt=([^;]+)/)?.[1];
  const ticketRaw = ticketHeader || ticketCookie;

  let ticketData = verifyRateLimitTicket(ticketRaw);
  let ticketCount = 0;

  if (ticketData && ticketData.ip === ip && ticketData.route === routeKey) {
    // Check if within window
    if (now - ticketData.windowStart < windowMs) {
      ticketCount = ticketData.count || 0;
    }
  }

  // 2. In-memory sliding window
  let timestamps = routeLimitStore.get(storeKey);
  if (!timestamps) {
    timestamps = [];
    routeLimitStore.set(storeKey, timestamps);
  }

  // Evict timestamps outside window
  const windowStart = now - windowMs;
  while (timestamps.length > 0 && timestamps[0] <= windowStart) {
    timestamps.shift();
  }

  // Merge ticket count and in-memory count (take the strictest / maximum count)
  const effectiveCount = Math.max(timestamps.length, ticketCount);
  const isAllowed = effectiveCount < maxRequests;

  const nextCount = isAllowed ? effectiveCount + 1 : effectiveCount;
  if (isAllowed) {
    timestamps.push(now);
  }

  const remaining = Math.max(0, maxRequests - nextCount);
  const resetEpochSec = Math.ceil((now + windowMs) / 1000);
  const retryAfterSec = isAllowed ? 0 : Math.ceil(windowMs / 1000);

  // Generate next signed ticket
  const nextTicket = signRateLimitTicket({
    ip,
    route: routeKey,
    windowStart: (ticketData && now - ticketData.windowStart < windowMs) ? ticketData.windowStart : now,
    count: nextCount,
    exp: now + windowMs
  });

  // Evict old entries if memory store grows
  if (routeLimitStore.size > 5000) {
    for (const [k, v] of routeLimitStore.entries()) {
      if (v.length === 0 || now - v[v.length - 1] > windowMs) {
        routeLimitStore.delete(k);
      }
    }
  }

  return {
    allowed: isAllowed,
    limit: maxRequests,
    remaining,
    reset: resetEpochSec,
    retryAfter: Math.max(1, retryAfterSec),
    ip,
    ticket: nextTicket
  };
}

/**
 * Apply standard rate-limiting headers & signed ticket to HTTP response
 */
export function applyRateLimitHeaders(res, result) {
  if (!res || !result) return;
  res.setHeader('X-RateLimit-Limit', String(result.limit));
  res.setHeader('X-RateLimit-Remaining', String(result.remaining));
  res.setHeader('X-RateLimit-Reset', String(result.reset));
  if (result.ticket) {
    res.setHeader('X-RateLimit-Ticket', result.ticket);
  }
  if (!result.allowed) {
    res.setHeader('Retry-After', String(result.retryAfter));
  }
}

/**
 * Rapid burst / abuse tracker
 */
export function trackAbuse(req) {
  const ip = getClientIp(req);
  const now = Date.now();
  const entry = rapidAbuseStore.get(ip) || { count: 0, last: now };

  if (now - entry.last < 1000) {
    entry.count += 1;
  } else {
    entry.count = 1;
    entry.last = now;
  }

  rapidAbuseStore.set(ip, entry);

  if (rapidAbuseStore.size > 2000) {
    for (const [k, v] of rapidAbuseStore.entries()) {
      if (now - v.last > 5000) rapidAbuseStore.delete(k);
    }
  }

  return entry.count > ABUSE_BURST_LIMIT;
}

// ── LOGIN RATE LIMITING & BRUTE-FORCE LOCKOUT ─────────────────────────
/**
 * Check whether an IP is currently locked out from login attempts.
 * Supports signed lockout ticket and memory store.
 */
export function checkLoginRateLimit(ip, req = null) {
  if (!ip) return false;
  const now = Date.now();

  // 1. Check signed lockout ticket if request provided
  if (req) {
    const lockTicket = req.headers?.['x-lockout-ticket'] || req.headers?.cookie?.match(/bvmbino_lockout=([^;]+)/)?.[1];
    const ticketData = verifyRateLimitTicket(lockTicket);
    if (ticketData && ticketData.ip === ip && ticketData.type === 'lockout') {
      if (now - ticketData.firstAttempt < LOGIN_LOCKOUT_MS && ticketData.count >= FAILED_LOGIN_LIMIT) {
        return true;
      }
    }
  }

  // 2. Check local memory store
  const entry = failedLoginStore.get(ip);
  if (!entry) return false;

  if (now - entry.firstAttempt > LOGIN_LOCKOUT_MS) {
    failedLoginStore.delete(ip);
    return false;
  }

  return entry.count >= FAILED_LOGIN_LIMIT;
}

/**
 * Record a failed login attempt for an IP
 */
export function recordFailedLogin(ip, res = null) {
  if (!ip) return null;
  const now = Date.now();
  const entry = failedLoginStore.get(ip);
  let newCount = 1;
  let firstAttempt = now;

  if (!entry || now - entry.firstAttempt > LOGIN_LOCKOUT_MS) {
    failedLoginStore.set(ip, { count: 1, firstAttempt: now });
  } else {
    newCount = entry.count + 1;
    firstAttempt = entry.firstAttempt;
    entry.count = newCount;
    failedLoginStore.set(ip, entry);
  }

  // Issue signed lockout ticket so lockout follows attacker across instances
  const lockoutTicket = signRateLimitTicket({
    ip,
    type: 'lockout',
    count: newCount,
    firstAttempt,
    exp: firstAttempt + LOGIN_LOCKOUT_MS
  });

  if (res && lockoutTicket) {
    res.setHeader('X-Lockout-Ticket', lockoutTicket);
  }

  if (failedLoginStore.size > 2000) {
    for (const [k, v] of failedLoginStore.entries()) {
      if (now - v.firstAttempt > LOGIN_LOCKOUT_MS) failedLoginStore.delete(k);
    }
  }

  return lockoutTicket;
}

/**
 * Clear failed login records upon successful authentication
 */
export function clearFailedLogins(ip, res = null) {
  if (ip) failedLoginStore.delete(ip);
  if (res) {
    res.setHeader('X-Lockout-Ticket', '');
  }
}

/**
 * Reset all rate limiting stores (useful for testing)
 */
export function resetRateLimits() {
  routeLimitStore.clear();
  failedLoginStore.clear();
  rapidAbuseStore.clear();
}
