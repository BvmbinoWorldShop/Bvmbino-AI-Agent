export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { query, count = 5 } = body;
    if (!query) return res.status(400).json({ error: 'query required' });

    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) throw new Error(`DuckDuckGo ${response.status}`);
    const data = await response.json();

    const results = [];

    if (data.AbstractText) {
      results.push({
        title: data.Heading || query,
        url: data.AbstractURL || '',
        description: data.AbstractText,
      });
    }

    (data.RelatedTopics || []).slice(0, count - results.length).forEach(t => {
      if (t.Text && t.FirstURL) {
        results.push({
          title: t.Text.split(' - ')[0] || t.Text.slice(0, 60),
          url: t.FirstURL,
          description: t.Text,
        });
      }
    });

    return res.status(200).json({ results, query });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
