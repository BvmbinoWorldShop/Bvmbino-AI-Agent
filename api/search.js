import { setCors, isRateLimited } from './_cors.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (isRateLimited(req, 40)) return res.status(429).json({ error: 'Rate limit exceeded (40 req/min)' });

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

    for (let i = 0; i < Math.min(urls.length, count); i++) {
      results.push({ title: titles[i] || `Result ${i + 1}`, url: urls[i], description: '' });
    }

    // Step 3: Summarize with Gemini if key available
    let answer = '';
    if (gKey && rawText) {
      const cleanText = rawText.replace(/[#*`]/g, '').slice(0, 3000);
      const gCtrl = new AbortController();
      const gTid = setTimeout(() => gCtrl.abort(), 8000);
      try {
        const gRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${gKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': gKey },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: `Based on these search results for "${query}", give a direct, verified, comprehensive summary with all key names, numbers, and facts:\n\n${cleanText}` }] }],
              generationConfig: { maxOutputTokens: 600 },
            }),
            signal: gCtrl.signal,
          }
        );
        clearTimeout(gTid);
        const gData = await gRes.json();
        answer = gData.candidates?.[0]?.content?.parts?.[0]?.text || '';
      } catch (e) { clearTimeout(gTid); answer = ''; }
    } else {
      answer = rawText.slice(0, 1000);
    }

    return res.status(200).json({ results, answer, query });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
