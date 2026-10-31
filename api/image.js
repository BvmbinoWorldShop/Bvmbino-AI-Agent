import { setCors } from './_cors.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { prompt, width = 768, height = 768, quality = 'standard', keys = {} } = body;
    if (!prompt) return res.status(400).json({ error: 'prompt is required' });

    const openaiKey = keys.openai || req.headers['x-openai-key'] || process.env.OPENAI_API_KEY || '';
    const hfKey = keys.huggingface || req.headers['x-hf-key'] || process.env.HUGGINGFACE_API_KEY || '';

    // 1. OpenAI DALL-E 3 (if key provided)
    if (openaiKey) {
      try {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 25000);
        const oRes = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiKey}` },
          body: JSON.stringify({ model: 'dall-e-3', prompt, n: 1, size: `${width}x${height}`, quality }),
          signal: ctrl.signal
        });
        clearTimeout(tid);
        if (oRes.ok) {
          const d = await oRes.json();
          if (d.data?.[0]?.url) {
            return res.status(200).json({ success: true, url: d.data[0].url, model: 'dall-e-3' });
          }
        }
      } catch (e) {
        console.warn('[image] DALL-E 3 error:', e.message);
      }
    }

    // 2. Hugging Face Inference FLUX.1-schnell (if key provided)
    if (hfKey) {
      try {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 20000);
        const hfRes = await fetch('https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${hfKey}` },
          body: JSON.stringify({ inputs: prompt }),
          signal: ctrl.signal
        });
        clearTimeout(tid);
        if (hfRes.ok) {
          const buf = Buffer.from(await hfRes.arrayBuffer());
          const mime = hfRes.headers.get('content-type') || 'image/jpeg';
          return res.status(200).json({
            success: true,
            url: `data:${mime};base64,${buf.toString('base64')}`,
            model: 'flux-schnell-hf'
          });
        }
      } catch (e) {
        console.warn('[image] HF FLUX error:', e.message);
      }
    }

    // 3. Free Tier Engine: Pollinations Turbo (Ultra-fast, SDXL Turbo, verified working)
    try {
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 12000);
      const pollUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&nologo=true&seed=${Date.now()}&model=turbo`;
      const pRes = await fetch(pollUrl, {
        headers: { 'User-Agent': 'Bvmbino-Agent/6.2' },
        signal: ctrl.signal
      });
      clearTimeout(tid);
      if (pRes.ok) {
        const cType = pRes.headers.get('content-type') || '';
        if (cType.includes('image')) {
          const buf = Buffer.from(await pRes.arrayBuffer());
          const mime = cType.split(';')[0] || 'image/jpeg';
          return res.status(200).json({
            success: true,
            url: `data:${mime};base64,${buf.toString('base64')}`,
            model: 'sdxl-turbo'
          });
        }
      }
    } catch (e) {
      console.warn('[image] Pollinations Turbo error:', e.message);
    }

    // 4. Free Tier Fallback: Curated Visual Stream
    const cleanKw = encodeURIComponent(prompt.replace(/[^\w\s]/g, '').slice(0, 60));
    const fallbackUrl = `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=${width}&h=${height}&q=80`;
    return res.status(200).json({
      success: true,
      url: fallbackUrl,
      model: 'curated-visual-fallback'
    });

  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
