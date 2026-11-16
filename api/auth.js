import { signToken, checkAdminCredentials, JWT_SECRET } from './lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { username, password } = body || {};
    
    // Check credentials against environment variables (with secure password rotation)
    const isValid = checkAdminCredentials(username, password);

    if (isValid) {
      const cleanUser = (username || 'Lataupe95').trim();
      // Generate signed JWT token with 30-day expiration and audience check
      const token = signToken({ sub: cleanUser, role: 'admin' }, JWT_SECRET, 30 * 24 * 3600);

      // Set secure auth cookie with 30-day persistence
      res.setHeader('Set-Cookie', [
        `bvmbino_session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000`,
        `bvmbino_auth=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000`
      ]);
      return res.status(200).json({ ok: true, token, username: cleanUser });
    } else {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (e) {
    return res.status(400).json({ error: 'Bad request: ' + e.message });
  }
}
