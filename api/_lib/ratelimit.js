/**
 * Shared API & Login Rate Limiting Engine
 * Supports sliding-window request throttling, brute-force login lockout,
 * standard rate limit headers (RFC 6585 / IETF draft), and memory eviction.
 */

// Sliding window stores
const routeLimitStore = new Map();
const failedLoginStore = new Map();
const rapidAbuseStore = new Map();

// Configuration defaults
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
    // Return first non-empty IP in the comma-separated chain
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
 * Shared sliding-window rate limiter
 * @param {object} req - Request object
 * @param {string} routeKey - Namespace for the rate limit (e.g. 'chat', 'search', 'image')
 * @param {number} maxRequests - Max requests allowed in the window
 * @param {number} windowMs - Window duration in milliseconds (default 60,000ms = 1 minute)
 */
export function checkRateLimit(req, routeKey = 'global', maxRequests = 60, windowMs = 60000) {
  const ip = getClientIp(req);
  const now = Date.now();
  const storeKey = `${routeKey}:${ip}`;

  let timestamps = routeLimitStore.get(storeKey);
  if (!timestamps) {
    timestamps = [];
    routeLimitStore.set(storeKey, timestamps);
  }

  // Remove timestamps outside the sliding window
  const windowStart = now - windowMs;
  while (timestamps.length > 0 && timestamps[0] <= windowStart) {
    timestamps.shift();
  }

  const currentCount = timestamps.length;
  const isAllowed = currentCount < maxRequests;

  if (isAllowed) {
    timestamps.push(now);
  }

  const remaining = Math.max(0, maxRequests - (isAllowed ? currentCount + 1 : currentCount));
  const oldestTimestamp = timestamps[0] || now;
  const resetEpochSec = Math.ceil((oldestTimestamp + windowMs) / 1000);
  const retryAfterSec = isAllowed ? 0 : Math.ceil(((oldestTimestamp + windowMs) - now) / 1000);

  // Evict old entries if store grows excessively
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
    ip
  };
}

/**
 * Apply standard rate-limiting headers to HTTP response
 */
export function applyRateLimitHeaders(res, result) {
  if (!res || !result) return;
  res.setHeader('X-RateLimit-Limit', String(result.limit));
  res.setHeader('X-RateLimit-Remaining', String(result.remaining));
  res.setHeader('X-RateLimit-Reset', String(result.reset));
  if (!result.allowed) {
    res.setHeader('Retry-After', String(result.retryAfter));
  }
}

/**
 * Rapid burst / abuse tracker (detects denial-of-service bursts)
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

// ── LOGIN RATE LIMITING & BRUTE-FORCE LOCKOUT ──────────────────────────────
/**
 * Check whether an IP is currently locked out from login attempts
 */
export function checkLoginRateLimit(ip) {
  if (!ip) return false;
  const now = Date.now();
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
export function recordFailedLogin(ip) {
  if (!ip) return;
  const now = Date.now();
  const entry = failedLoginStore.get(ip);

  if (!entry || now - entry.firstAttempt > LOGIN_LOCKOUT_MS) {
    failedLoginStore.set(ip, { count: 1, firstAttempt: now });
  } else {
    entry.count += 1;
    failedLoginStore.set(ip, entry);
  }

  if (failedLoginStore.size > 2000) {
    for (const [k, v] of failedLoginStore.entries()) {
      if (now - v.firstAttempt > LOGIN_LOCKOUT_MS) failedLoginStore.delete(k);
    }
  }
}

/**
 * Clear failed login records upon successful authentication
 */
export function clearFailedLogins(ip) {
  if (ip) failedLoginStore.delete(ip);
}

/**
 * Reset all rate limiting stores (useful for testing)
 */
export function resetRateLimits() {
  routeLimitStore.clear();
  failedLoginStore.clear();
  rapidAbuseStore.clear();
}
