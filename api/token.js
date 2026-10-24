import crypto from 'crypto';
import { setCors } from './_cors.js';

const JWT_SECRET = process.env.JWT_SECRET || 'bvmbino-secret-v3';

function signToken(payload, secret) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

export default async function handler(req, res) {
  setCors(req, res);

  if (req.method === 'OPTIONS') return res.status(200).end();

  const authCookie = req.headers.cookie || '';
  const isAuthenticated = authCookie.includes('bvmbino_auth=ok') || process.env.NODE_ENV === 'development';

  if (!isAuthenticated) {
    return res.status(401).json({
      error: 'Unauthorized: Access restricted to Bvmbino Pro members.',
      instructions: 'Please log in via the main dashboard.'
    });
  }

  try {
    const token = signToken({ 
      auth: 'elite',
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24)
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
