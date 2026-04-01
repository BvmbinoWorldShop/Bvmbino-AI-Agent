export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { query, count = 6 } = body;
    if (!query) return res.status(400).json({ error: 'query required' });

    // Jina reader + DuckDuckGo lite — no API key, no quota, always free
    const ddgUrl = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`;
    const jinaUrl = `https://r.jina.ai/${ddgUrl}`;

    const response = await fetch(jinaUrl, {
      headers: {
        'Accept': 'text/plain',
        'X-Return-Format': 'markdown',
        'X-Timeout': '15',
      }
    });

    if (!response.ok) throw new Error(`Search fetch ${response.status}`);
    const text = await response.text();

    // Parse result links and snippets from markdown
    const results = [];
    const lines = text.split('\n');
    for (let i = 0; i < lines.length && results.length < count; i++) {
      const linkMatch = lines[i].match(/\[(.+?)\]\((https?:\/\/[^\)]+)\)/);
      if (linkMatch && !linkMatch[2].includes('duckduckgo.com')) {
        const snippet = lines[i + 1]?.replace(/[#*>`]/g, '').trim() || '';
        results.push({
          title: linkMatch[1].trim(),
          url: linkMatch[2],
          description: snippet.slice(0, 150),
        });
      }
    }

    // Answer: extract clean text summary from the markdown
    const answer = text
      .split('\n')
      .filter(l => l.trim() && !l.startsWith('#') && !l.startsWith('[') && !l.includes('duckduckgo'))
      .slice(0, 5)
      .join(' ')
      .slice(0, 500);

    return res.status(200).json({ results, answer, query });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
