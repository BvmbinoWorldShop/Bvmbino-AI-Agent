import { setCors, isRateLimited } from './_cors.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (isRateLimited(req)) return res.status(429).json({ error: 'Rate limit exceeded (30 req/min)' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { url } = body;
    if (!url) return res.status(400).json({ error: 'url required' });

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
