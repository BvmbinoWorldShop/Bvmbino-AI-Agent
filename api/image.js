export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { prompt, width = 1024, height = 1024 } = body;

    if (!prompt) return res.status(400).json({ error: 'prompt is required' });

    const encoded = encodeURIComponent(prompt);
    const imageUrl = `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&nologo=true&seed=${Date.now()}`;

    const check = await fetch(imageUrl, { method: 'HEAD' });
    if (!check.ok) throw new Error(`Pollinations returned ${check.status}`);

    return res.status(200).json({ data: [{ url: imageUrl }] });
  } catch (err) {
    console.error('Image proxy error:', err);
    return res.status(500).json({ error: 'Image proxy error', detail: err.message });
  }
}
