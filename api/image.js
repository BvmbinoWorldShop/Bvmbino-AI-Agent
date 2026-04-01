export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.TOGETHER_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'TOGETHER_KEY not set. Get a free key at api.together.xyz and add it to Vercel environment variables.'
    });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { prompt, width = 1024, height = 1024, steps = 4, n = 1 } = body;

    if (!prompt) return res.status(400).json({ error: 'prompt is required' });

    const response = await fetch('https://api.together.xyz/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'black-forest-labs/FLUX.1-schnell-Free',  // Free tier model
        prompt,
        width,
        height,
        steps,
        n,
        response_format: 'url',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || data.message || 'Together AI error',
        detail: data
      });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error('Image proxy error:', err);
    return res.status(500).json({ error: 'Image proxy error', detail: err.message });
  }
}
