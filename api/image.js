export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { prompt, width = 512, height = 512 } = body;
    if (!prompt) return res.status(400).json({ error: 'prompt is required' });

    // Unsplash Source — instant, free, no key, high quality photos for any topic
    const keywords = prompt
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, '')
      .trim()
      .split(' ')
      .slice(0, 4)
      .join(',');

    const unsplashUrl = `https://source.unsplash.com/${width}x${height}/?${encodeURIComponent(keywords)}`;

    // Follow the redirect to get the actual image URL
    const r = await fetch(unsplashUrl, { redirect: 'follow', signal: AbortSignal.timeout(8000) });
    if (r.ok && r.url && r.url !== unsplashUrl) {
      return res.status(200).json({ data: [{ url: r.url }], model: 'unsplash' });
    }

    // Fallback: Pollinations direct URL (browser loads it patiently)
    const encoded = encodeURIComponent(prompt);
    const pollUrl = `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&nologo=true&model=flux&seed=${Date.now()}`;
    return res.status(200).json({ data: [{ url: pollUrl }], model: 'pollinations' });

  } catch (err) {
    // Always fallback to Pollinations on any error
    const encoded = encodeURIComponent(req.body?.prompt || 'abstract art');
    return res.status(200).json({
      data: [{ url: `https://image.pollinations.ai/prompt/${encoded}?width=512&height=512&nologo=true` }],
      model: 'pollinations-fallback',
    });
  }
}
