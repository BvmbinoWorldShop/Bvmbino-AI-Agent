import pkg from 'jsonwebtoken';
const { verify } = pkg;

const JWT_SECRET = process.env.JWT_SECRET || 'bvmbino-secret-v3';

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
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-app-token');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
}

// ── 2. APP TOKEN SECURITY ──────────────────────────────────────────────────
export function validateAppToken(req) {
  // Check cookie auth from login portal
  const cookie = req.headers['cookie'] || '';
  if (cookie.includes('bvmbino_auth=ok')) return true;

  // Check x-app-token header
  const token = req.headers['x-app-token'];
  if (token) {
    try {
      const decoded = verify(token, JWT_SECRET);
      if (decoded && decoded.auth === 'elite') return true;
    } catch (err) {
      console.error('[Auth] Token Validation Failed:', err.message);
    }
  }

  // Check authorization header
  const auth = req.headers['authorization'];
  if (auth && auth.startsWith('Bearer ')) return true;

  return false;
}

// ── 3. ABUSE PROTECTION ────────────────────────────────────────────────────
const abuseStorage = new Map();
export async function trackAbuse(req) {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
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
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
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
