import { setCors, isRateLimited, validateAppToken, trackAbuse } from './_cors.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  // Mandatory App Token Authentication
  if (!validateAppToken(req)) {
    return res.status(403).json({ error: 'Unauthorized: Valid Bvmbino session required' });
  }

  // Rate Limit check (40 req/min)
  if (await isRateLimited(req, 40, res, 'search')) {
    return res.status(429).json({ error: 'Rate limit exceeded (40 req/min)' });
  }

  // Abuse Protection
  if (await trackAbuse(req)) {
    return res.status(429).json({ error: 'System busy — too many requests from your IP' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { query, count = 5 } = body || {};
    if (!query) return res.status(400).json({ error: 'query required' });

    const rawGKey = req.headers?.['x-gemini-key'] || body?.keys?.gemini || body?.key || process.env.GEMINI_KEY_2 || process.env.GEMINI_KEY || process.env.GOOGLE_API_KEY || '';
    const gKey = String(rawGKey).replace(/[^\x20-\x7E]/g, '').trim();

    // Step 1: Fetch raw results via Jina + Swisscows (clean snippets, zero bot challenges)
    let rawText = '';
    const jinaCtrl = new AbortController();
    const jinaTid = setTimeout(() => jinaCtrl.abort(), 10000);
    try {
      const scUrl = `https://swisscows.com/en/web?query=${encodeURIComponent(query)}`;
      const jinaRes = await fetch(`https://r.jina.ai/${scUrl}`, {
        headers: { 'Accept': 'text/plain', 'X-Return-Format': 'text', 'X-Timeout': '10' },
        signal: jinaCtrl.signal,
      });
      if (jinaRes?.ok) {
        rawText = (await jinaRes.text()).trim().slice(0, 6000);
      }
    } catch (e) {
      // Fallback to DDG Lite via Jina
      try {
        const ddgUrl = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`;
        const ddgRes = await fetch(`https://r.jina.ai/${ddgUrl}`, {
          headers: { 'Accept': 'text/plain', 'X-Return-Format': 'text' },
          signal: jinaCtrl.signal,
        });
        if (ddgRes?.ok) {
          rawText = (await ddgRes.text()).trim().slice(0, 6000);
        }
      } catch (err) {}
    }
    clearTimeout(jinaTid);

    // Step 2: Parse clickable results
    const results = [];
    const urlRegex = /https?:\/\/(?!(?:www\.)?(?:duckduckgo|swisscows))[^\s<>"')]+/g;
    const titleRegex = /\*\*(.+?)\*\*/g;
    const urls = [...rawText.matchAll(urlRegex)].map(m => m[0]);
    const titles = [...rawText.matchAll(titleRegex)].map(m => m[1]);

    const seen = new Set();
    urls.slice(0, count).forEach((u, i) => {
      if (!seen.has(u)) {
        seen.add(u);
        results.push({
          title: titles[i] || u.replace(/https?:\/\/(www\.)?/, '').split('/')[0],
          url: u,
          snippet: rawText.slice(Math.max(0, rawText.indexOf(u) - 100), rawText.indexOf(u) + 150).replace(/[#*`]/g, '').trim(),
        });
      }
    });

    // Step 3: Synthesis with Gemini if key available, else return clean web snippets
    let answer = '';
    if (gKey && results.length > 0) {
      try {
        const gemCtrl = new AbortController();
        const gemTid = setTimeout(() => gemCtrl.abort(), 8000);
        const gemRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${gKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              role: 'user',
              parts: [{ text: `Synthesize a direct, concise executive answer based strictly on these search results:\n\nQuery: ${query}\n\nIntel:\n${rawText.slice(0, 3000)}` }]
            }],
            generationConfig: { maxOutputTokens: 300 }
          }),
          signal: gemCtrl.signal
        });
        clearTimeout(gemTid);
        if (gemRes.ok) {
          const gd = await gemRes.json();
          answer = gd.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
        }
      } catch {}
    }

    return res.status(200).json({ query, results, answer, count: results.length });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
