import jwt from 'jsonwebtoken';
// Shared CORS + rate limiting helper — imported by all API routes
// Files prefixed with _ are not treated as API endpoints by Vercel

// ── CORS ─────────────────────────────────────────────────────────────────────
// Allow only the production domain + localhost for dev
export function setCors(req, res) {
  const origin = req.headers.origin || '';
  const allowed =
    /^https?:\/\/localhost(:\d+)?$/.test(origin) ||
    /^https:\/\/bvmbino-ai-agent[^.]*\.vercel\.app$/.test(origin);

  res.setHeader('Access-Control-Allow-Origin', allowed ? origin : 'https://bvmbino-ai-agent.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-app-token');
  res.setHeader('Vary', 'Origin');
}

// ── RATE LIMITING ────────────────────────────────────────────────────────────
// Simple in-memory counter — 30 req/min per IP (resets on cold start, basic protection)
const rateMap = new Map();
export function isRateLimited(req, limit = 30) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  const entry = rateMap.get(ip) || { count: 0, reset: now + 60_000 };
  if (now > entry.reset) { entry.count = 0; entry.reset = now + 60_000; }
  entry.count++;
  rateMap.set(ip, entry);
  // Cleanup old entries to prevent memory leak
  if (rateMap.size > 5000) {
    for (const [k, v] of rateMap) { if (now > v.reset) rateMap.delete(k); }
  }
  return entry.count > limit;
}

// ── ABUSE MONITORING (Layer 6) ──────────────────────────────────────────────
export async function trackAbuse(req) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  
  // Vercel KV REST API fallback (if process.env.KV_REST_API_URL is set)
  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;

  if (!kvUrl || !kvToken) return false; // Fail safe if KV not configured

  try {
    const key = `abuse:${ip}`;
    const res = await fetch(`${kvUrl}/incr/${key}`, {
      headers: { Authorization: `Bearer ${kvToken}` }
    });
    const { result } = await res.json();
    
    // Set expiry to 1 hour if new key
    if (result === 1) {
      await fetch(`${kvUrl}/expire/${key}/3600`, {
        headers: { Authorization: `Bearer ${kvToken}` }
      });
    }

    if (result > 50) {
      console.warn(`ABUSE DETECTED: IP ${ip} has ${result} hits in last hour.`);
      // Optional: Add Slack/Email notification here
      return true; 
    }
  } catch (e) { console.error("KV Monitoring error:", e); }
  return false;
}

// ── APP TOKEN AUTH ──────────────────────────────────────────────────────────
export function validateAppToken(req) {
  const token = req.headers['x-app-token'];
  if (!token) return false;
  
  try {
    const secret = process.env.JWT_SECRET || 'bvmbino-auteur-engine-default-secret-secure-777';
    jwt.verify(token, secret);
    return true;
  } catch (err) {
    console.warn('Invalid or expired application token');
    return false;
  }
}

// ── INPUT VALIDATION ─────────────────────────────────────────────────────────
export function validateMessages(messages) {
  if (!Array.isArray(messages)) return 'messages must be an array';
  if (messages.length > 100) return 'too many messages (max 100)';
  for (const m of messages) {
    if (!m || typeof m !== 'object') return 'invalid message format';
    if (!['user', 'assistant'].includes(m.role)) return `invalid role: ${m.role}`;
    if (typeof m.content !== 'string') return 'message content must be a string';
    if (m.content.length > 50_000) return 'message too long (max 50k chars)';
  }
  return null;
}
