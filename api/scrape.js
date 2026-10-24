import { setCors, isRateLimited } from './_cors.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  // Strict Rate Limit for Scrape: 5 req/min (high resource cost)
  if (isRateLimited(req, 5)) return res.status(429).json({ error: 'Rate limit exceeded (5 req/min)' });

  // App Token Security
  const { validateAppToken, trackAbuse } = await import('./_cors.js');
  if (!validateAppToken(req)) return res.status(403).json({ error: 'Unauthorized: Missing or invalid x-app-token' });

  // Global Abuse Protection (Layer 6)
  if (await trackAbuse(req)) return res.status(429).json({ error: 'System busy — too many requests from your IP' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { url } = body;
    if (!url) return res.status(400).json({ error: 'url required' });

    const u = new URL(url);
    const BLOCKED = ['localhost', '127.0.0.1', '169.254', '10.', '192.168.'];
    if (BLOCKED.some(d => u.hostname.includes(d))) return res.status(400).json({ error: 'Invalid URL: Internal access blocked' });
    if (!['http:', 'https:'].includes(u.protocol)) return res.status(400).json({ error: 'Invalid protocol' });

    // Jina AI Reader — free, no key needed, converts any URL to clean markdown
    const jinaUrl = `https://r.jina.ai/${url}`;
    const jinaCtrl = new AbortController();
    const jinaTid = setTimeout(() => jinaCtrl.abort(), 15000);
    const response = await fetch(jinaUrl, {
      headers: { 'Accept': 'text/plain', 'X-Return-Format': 'markdown', 'X-Timeout': '15' },
      signal: jinaCtrl.signal,
    });
    clearTimeout(jinaTid);

    if (!response.ok) throw new Error(`Jina returned ${response.status}`);
    const text = await response.text();

    // Trim to 8000 chars to keep within Claude context
    const trimmed = text.slice(0, 8000);
    return res.status(200).json({ content: trimmed, url, chars: trimmed.length });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
