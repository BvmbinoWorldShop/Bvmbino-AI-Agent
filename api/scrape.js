export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { url } = body;
    if (!url) return res.status(400).json({ error: 'url required' });

    // Jina AI Reader — free, no key needed, converts any URL to clean markdown
    const jinaUrl = `https://r.jina.ai/${url}`;
    const response = await fetch(jinaUrl, {
      headers: {
        'Accept': 'text/plain',
        'X-Return-Format': 'markdown',
        'X-Timeout': '15',
      }
    });

    if (!response.ok) throw new Error(`Jina returned ${response.status}`);
    const text = await response.text();

    // Trim to 8000 chars to keep within Claude context
    const trimmed = text.slice(0, 8000);
    return res.status(200).json({ content: trimmed, url, chars: trimmed.length });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
