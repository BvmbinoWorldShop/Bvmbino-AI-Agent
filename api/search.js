export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { query, count = 5 } = body;
    if (!query) return res.status(400).json({ error: 'query required' });

    const url = `https://s.jina.ai/${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'X-Retain-Images': 'none',
      }
    });

    if (!response.ok) throw new Error(`Jina search ${response.status}: ${await response.text()}`);
    const text = await response.text();

    const results = text
      .split('\n\n')
      .filter(block => block.trim())
      .slice(0, count)
      .map(block => {
        const titleMatch = block.match(/Title:\s*(.+)/);
        const urlMatch = block.match(/URL:\s*(.+)/);
        const descMatch = block.match(/Description:\s*(.+)/);
        return {
          title: titleMatch?.[1]?.trim() || 'Result',
          url: urlMatch?.[1]?.trim() || '',
          description: descMatch?.[1]?.trim() || block.slice(0, 200),
        };
      });

    return res.status(200).json({ results, query });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
