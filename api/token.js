import { setCors } from './_cors.js';
import { signToken, verifyToken, JWT_SECRET, TOKEN_AUDIENCE } from './lib/auth.js';

export default async function handler(req, res) {
  setCors(req, res);

  if (req.method === 'OPTIONS') return res.status(200).end();

  const authCookie = req.headers.cookie || '';
  const sessionToken = 
    authCookie.match(/bvmbino_session=([^;]+)/)?.[1] ||
    authCookie.match(/bvmbino_auth=([^;]+)/)?.[1] ||
    req.headers['authorization']?.replace('Bearer ', '');

  const payload = sessionToken ? verifyToken(sessionToken, JWT_SECRET, TOKEN_AUDIENCE) : null;
  const isAuthenticated = !!payload || process.env.NODE_ENV === 'development';

  if (!isAuthenticated) {
    return res.status(401).json({
      error: 'Unauthorized: Access restricted to Bvmbino Pro members.',
      instructions: 'Please log in via the main dashboard.'
    });
  }

  try {
    const token = signToken({ 
      sub: payload?.sub || 'Lataupe95',
      auth: 'elite',
      role: 'admin'
    }, JWT_SECRET, 60 * 60 * 24);

    return res.status(200).json({
      token,
      status: 'active',
      empire: 'bvmbino_pro_v4'
    });
  } catch (err) {
    console.error('[Token] Generation Failed:', err);
    return res.status(500).json({ error: 'Identity Service Offline' });
  }
}
