import { setCors, isRateLimited } from './_cors.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (isRateLimited(req)) return res.status(429).json({ error: 'Rate limit exceeded (30 req/min)' });

  const gKey = process.env.GEMINI_KEY_2 || process.env.GEMINI_KEY || process.env.GOOGLE_API_KEY;

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { query, count = 5 } = body;
    if (!query) return res.status(400).json({ error: 'query required' });

    // Step 1: Fetch raw results via Jina + DuckDuckGo (no key, no quota)
    const ddgUrl = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`;
    const jinaCtrl = new AbortController();
    const jinaTid = setTimeout(() => jinaCtrl.abort(), 12000);
    let jinaRes;
    try {
      jinaRes = await fetch(`https://r.jina.ai/${ddgUrl}`, {
        headers: { 'Accept': 'text/plain', 'X-Return-Format': 'markdown', 'X-Timeout': '12' },
        signal: jinaCtrl.signal,
      });
    } catch (e) { jinaRes = null; }
    clearTimeout(jinaTid);
    const rawText = jinaRes?.ok ? await jinaRes.text() : '';

    // Step 2: Parse clickable results (DDG lite has links as plain URLs in the text)
    const results = [];
    const urlRegex = /https?:\/\/(?!(?:www\.)?duckduckgo)[^\s<>"']+/g;
    const titleRegex = /\*\*(.+?)\*\*/g;
    const urls = [...rawText.matchAll(urlRegex)].map(m => m[0]).filter(u => !u.includes('duckduckgo'));
    const titles = [...rawText.matchAll(titleRegex)].map(m => m[1]);

    for (let i = 0; i < Math.min(urls.length, count); i++) {
      results.push({ title: titles[i] || `Result ${i + 1}`, url: urls[i], description: '' });
    }

    // Step 3: Summarize with Gemini (uses GEMINI_KEY_2 — separate quota from chat)
    let answer = '';
    if (!gKey) {
      answer = '⚠️ Gemini API key not configured. Summary unavailable, showing raw search results.';
    } else if (rawText) {
      const cleanText = rawText.replace(/[#*`]/g, '').slice(0, 3000);
      const gCtrl = new AbortController();
      const gTid = setTimeout(() => gCtrl.abort(), 8000);
      try {
        const gRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${gKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `Based on these search results for "${query}", give a direct useful summary in 3-5 bullet points:\n\n${cleanText}` }] }],
              generationConfig: { maxOutputTokens: 400 },
            }),
            signal: gCtrl.signal,
          }
        );
        clearTimeout(gTid);
        const gData = await gRes.json();
        answer = gData.candidates?.[0]?.content?.parts?.[0]?.text || '';
      } catch (e) { clearTimeout(gTid); answer = ''; }
    }

    return res.status(200).json({ results, answer, query });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
