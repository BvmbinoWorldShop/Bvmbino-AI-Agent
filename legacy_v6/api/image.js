import { setCors, isRateLimited } from './_cors.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (isRateLimited(req)) return res.status(429).json({ error: 'Rate limit exceeded (30 req/min)' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { prompt, width = 512, height = 512 } = body;
    if (!prompt) return res.status(400).json({ error: 'prompt is required' });

    // Pollinations — free, no key, AI image generation
    const encoded = encodeURIComponent(prompt);
    const pollUrl = `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&nologo=true&model=flux&seed=${Date.now()}`;
    return res.status(200).json({ data: [{ url: pollUrl }], model: 'pollinations' });

  } catch (err) {
    const encoded = encodeURIComponent(req.body?.prompt || 'abstract art');
    return res.status(200).json({
      data: [{ url: `https://image.pollinations.ai/prompt/${encoded}?width=512&height=512&nologo=true` }],
      model: 'pollinations-fallback',
    });
  }
}
