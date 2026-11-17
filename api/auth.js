import {
  signToken,
  checkAdminCredentials,
  checkLoginRateLimit,
  recordFailedLogin,
  clearFailedLogins,
  JWT_SECRET
} from './_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.connection?.remoteAddress || '127.0.0.1';

  // 1. Brute-Force Rate Limiting (Max 5 attempts per 15 min)
  if (checkLoginRateLimit(ip)) {
    return res.status(429).json({
      error: 'Too many failed login attempts. Access temporarily locked for 15 minutes for security.'
    });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { username, password } = body || {};

    // 2. Validate credentials against mandatory environment variables
    const isValid = checkAdminCredentials(username, password);

    if (isValid) {
      // Clear failed attempts upon successful login
      clearFailedLogins(ip);

      const cleanUser = (username || 'Admin').trim();
      // Generate signed JWT token with 30-day persistence and audience claim
      const token = signToken({ sub: cleanUser, role: 'admin' }, JWT_SECRET, 30 * 24 * 3600);

      res.setHeader('Set-Cookie', [
        `bvmbino_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`,
        `bvmbino_auth=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`
      ]);
      return res.status(200).json({ ok: true, token, username: cleanUser });
    } else {
      // Record failed attempt
      recordFailedLogin(ip);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (e) {
    recordFailedLogin(ip);
    return res.status(400).json({ error: 'Bad request: ' + e.message });
  }
}
