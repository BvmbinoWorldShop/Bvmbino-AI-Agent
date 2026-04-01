export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.BRAVE_KEY;
  if (!apiKey) return res.status(500).json({ error: 'BRAVE_KEY not set. Get free key at api.search.brave.com' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { query, count = 5 } = body;
    if (!query) return res.status(400).json({ error: 'query required' });

    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}&text_decorations=false&search_lang=en`;
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': apiKey,
      }
    });

    if (!response.ok) throw new Error(`Brave API ${response.status}: ${await response.text()}`);
    const data = await response.json();

    const results = (data.web?.results || []).map(r => ({
      title: r.title,
      url: r.url,
      description: r.description,
    }));

    return res.status(200).json({ results, query });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
