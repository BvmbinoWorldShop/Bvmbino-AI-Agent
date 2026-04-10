import jwt from 'jsonwebtoken';
import { setCors } from './_cors.js';

const JWT_SECRET = process.env.JWT_SECRET || 'bvmbino-secret-v3';

export default async function handler(req, res) {
  setCors(req, res);

  // Handle preflight
  if (req.method === 'OPTIONS') return res.status(200).end();

  // We only care about GET/POST for token acquisition
  // In v3.6, we use a session-based auth check (cookie)
  const authCookie = req.headers.cookie || '';
  const isAuthenticated = authCookie.includes('bvmbino_auth=ok') || process.env.NODE_ENV === 'development';

  if (!isAuthenticated) {
    return res.status(401).json({
      error: 'Unauthorized: Access restricted to Bvmbino Pro members.',
      instructions: 'Please log in via the main dashboard.'
    });
  }

  try {
    // Generate a short-lived App Token for the session
    // This token is passed in 'x-app-token' for all /api/chat calls
    const token = jwt.sign({ 
      auth: 'elite',
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24 hours
    }, JWT_SECRET);

    return res.status(200).json({
      token,
      status: 'active',
      empire: 'bvmbino_pro_v3'
    });
  } catch (err) {
    console.error('[Token] Generation Failed:', err);
    return res.status(500).json({ error: 'Identity Service Offline' });
  }
}
