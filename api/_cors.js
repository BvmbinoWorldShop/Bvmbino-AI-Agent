import { verifyToken, JWT_SECRET, TOKEN_AUDIENCE } from './_lib/auth.js';
import {
  checkRateLimit,
  checkDistributedRateLimit,
  applyRateLimitHeaders,
  trackAbuse as sharedTrackAbuse
} from './_lib/ratelimit.js';

// ── 1. CORS HANDLER ───────────────────────────────────────────────────────
export function setCors(req, res) {
  const origin = req.headers?.origin;
  
  // Strict Production Origin Matching
  const isAllowed = !origin || 
    origin.includes('localhost') || 
    origin.includes('127.0.0.1') || 
    /^https:\/\/bvmbino-ai-agent[^.]*\.vercel\.app$/.test(origin);

  if (isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-app-token, x-gemini-key');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
}

// ── 2. APP TOKEN SECURITY (Strict Signed-Token Verification Only) ───────────
export function validateAppToken(req) {
  if (!req || !req.headers) return false;

  // 1. Check cookies for signed token
  const cookieHeader = req.headers['cookie'] || '';
  const cookieTokens = [
    cookieHeader.match(/bvmbino_session=([^;]+)/)?.[1],
    cookieHeader.match(/bvmbino_auth=([^;]+)/)?.[1]
  ].filter(Boolean);

  for (const cToken of cookieTokens) {
    const payload = verifyToken(cToken, JWT_SECRET, TOKEN_AUDIENCE);
    if (payload && (payload.auth === 'elite' || payload.role === 'admin' || payload.sub)) {
      return true;
    }
  }

  // 2. Check x-app-token header (strictly verify cryptographic signature & claims)
  const token = req.headers['x-app-token'];
  if (token) {
    const payload = verifyToken(token, JWT_SECRET, TOKEN_AUDIENCE);
    if (payload && (payload.auth === 'elite' || payload.role === 'admin' || payload.sub)) {
      return true;
    }
  }

  // 3. Check authorization header (Bearer <signed-jwt>)
  const auth = req.headers['authorization'];
  if (auth && auth.startsWith('Bearer ')) {
    const bearerToken = auth.slice(7).trim();
    const payload = verifyToken(bearerToken, JWT_SECRET, TOKEN_AUDIENCE);
    if (payload && (payload.auth === 'elite' || payload.role === 'admin' || payload.sub)) {
      return true;
    }
  }

  return false;
}

// ── 3. ABUSE PROTECTION & RATE LIMITING (Shared Engine) ────────────────────
export const trackAbuse = sharedTrackAbuse;

export async function isRateLimited(req, limit = 60, res = null, routeKey = 'api') {
  const result = await checkDistributedRateLimit(req, routeKey, limit, 60000);
  if (res) {
    applyRateLimitHeaders(res, result);
  }
  return !result.allowed;
}

// ── 4. MESSAGE VALIDATION ──────────────────────────────────────────────────
export function validateMessages(messages) {
  if (!messages) return 'messages are required';
  if (!Array.isArray(messages)) return 'messages must be an array';
  if (messages.length === 0) return 'messages cannot be empty';
  return null;
}

export { checkRateLimit, applyRateLimitHeaders };
