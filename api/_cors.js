import { verifyToken, JWT_SECRET, TOKEN_AUDIENCE } from './lib/auth.js';

// ── 1. CORS HANDLER ───────────────────────────────────────────────────────
export function setCors(req, res) {
  const origin = req.headers.origin;
  
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

// ── 2. APP TOKEN SECURITY (Signed Tokens with Exp and Aud Checks) ───────────
export function validateAppToken(req) {
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

  // 2. Check x-app-token header
  const token = req.headers['x-app-token'];
  if (token) {
    if (token === JWT_SECRET) return true;
    const payload = verifyToken(token, JWT_SECRET, TOKEN_AUDIENCE);
    if (payload && (payload.auth === 'elite' || payload.role === 'admin' || payload.sub)) {
      return true;
    }
  }

  // 3. Check authorization header (Bearer <signed-jwt>)
  const auth = req.headers['authorization'];
  if (auth) {
    if (auth === `Bearer ${JWT_SECRET}`) return true;
    if (auth.startsWith('Bearer ')) {
      const bearerToken = auth.slice(7).trim();
      const payload = verifyToken(bearerToken, JWT_SECRET, TOKEN_AUDIENCE);
      if (payload && (payload.auth === 'elite' || payload.role === 'admin' || payload.sub)) {
        return true;
      }
    }
  }

  // 4. In local development allow localhost
  if (process.env.NODE_ENV === 'development') {
    const host = req.headers['host'] || '';
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
      return true;
    }
  }

  return false;
}

// ── 3. ABUSE PROTECTION ────────────────────────────────────────────────────
const abuseStorage = new Map();
export async function trackAbuse(req) {
  const ip = req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || req.connection?.remoteAddress || '127.0.0.1';
  const now = Date.now();
  const userData = abuseStorage.get(ip) || { count: 0, last: 0 };
  
  if (now - userData.last < 1000) userData.count++;
  else userData.count = 1;
  
  userData.last = now;
  abuseStorage.set(ip, userData);
  
  return userData.count > 50;
}

// ── 4. RATE LIMITING ───────────────────────────────────────────────────────
const rateLimitMap = new Map();
export function isRateLimited(req, limit = 10) {
  const ip = req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || req.connection?.remoteAddress || '127.0.0.1';
  const now = Math.floor(Date.now() / 60000);
  
  const currentKey = `${ip}:${now}`;
  const count = (rateLimitMap.get(currentKey) || 0) + 1;
  rateLimitMap.set(currentKey, count);
  
  if (rateLimitMap.size > 1000) rateLimitMap.clear();
  return count > limit;
}

// ── 5. MESSAGE VALIDATION ──────────────────────────────────────────────────
export function validateMessages(messages) {
  if (!messages) return 'messages are required';
  if (!Array.isArray(messages)) return 'messages must be an array';
  if (messages.length === 0) return 'messages cannot be empty';
  return null;
}
