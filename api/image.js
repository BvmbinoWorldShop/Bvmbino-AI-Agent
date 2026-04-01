export const config = { maxDuration: 55 };

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
    const pollUrl = `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&nologo=true&model=flux&seed=${Date.now()}`;

    // Fetch image bytes server-side — browser gets base64 instantly, no timeout
    const imgRes = await fetch(pollUrl, { signal: AbortSignal.timeout(50000) });
    if (!imgRes.ok) throw new Error(`Pollinations ${imgRes.status}`);

    const buffer = await imgRes.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const mime = imgRes.headers.get('content-type') || 'image/jpeg';

    return res.status(200).json({
      data: [{ url: `data:${mime};base64,${base64}` }],
      model: 'pollinations-flux',
    });
  } catch (err) {
    console.error('Image error:', err.message);
    return res.status(500).json({ error: 'Image generation failed: ' + err.message });
  }
}
