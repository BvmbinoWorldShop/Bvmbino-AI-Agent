export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.GEMINI_KEY;

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { query, count = 5 } = body;
    if (!query) return res.status(400).json({ error: 'query required' });

    // Step 1: Fetch raw results via Jina + DuckDuckGo (no key, no quota)
    const ddgUrl = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`;
    const jinaRes = await fetch(`https://r.jina.ai/${ddgUrl}`, {
      headers: { 'Accept': 'text/plain', 'X-Return-Format': 'markdown', 'X-Timeout': '12' }
    });
    const rawText = jinaRes.ok ? await jinaRes.text() : '';

    // Step 2: Parse clickable results (DDG lite has links as plain URLs in the text)
    const results = [];
    const urlRegex = /https?:\/\/(?!(?:www\.)?duckduckgo)[^\s<>"']+/g;
    const titleRegex = /\*\*(.+?)\*\*/g;
    const urls = [...rawText.matchAll(urlRegex)].map(m => m[0]).filter(u => !u.includes('duckduckgo'));
    const titles = [...rawText.matchAll(titleRegex)].map(m => m[1]);

    for (let i = 0; i < Math.min(urls.length, count); i++) {
      results.push({ title: titles[i] || `Result ${i + 1}`, url: urls[i], description: '' });
    }

    // Step 3: Summarize with Gemini chat (NO grounding tool = no quota issues)
    let answer = '';
    if (apiKey && rawText) {
      const cleanText = rawText.replace(/[#*`]/g, '').slice(0, 3000);
      const gRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `Based on these search results for "${query}", give a direct useful summary in 3-5 bullet points:\n\n${cleanText}` }] }],
            generationConfig: { maxOutputTokens: 400 },
          }),
        }
      );
      const gData = await gRes.json();
      answer = gData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    return res.status(200).json({ results, answer, query });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
