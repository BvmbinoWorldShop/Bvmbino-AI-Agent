export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.GEMINI_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_KEY not set' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { query, count = 6 } = body;
    if (!query) return res.status(400).json({ error: 'query required' });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Search and summarize: ${query}` }] }],
          tools: [{ googleSearch: {} }],
          generationConfig: { maxOutputTokens: 1024 },
        }),
      }
    );

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Gemini search error');

    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const chunks = data.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    const results = chunks.slice(0, count).map(c => ({
      title: c.web?.title || query,
      url: c.web?.uri || '',
      description: c.web?.title || '',
    }));

    return res.status(200).json({ results, answer, query });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
