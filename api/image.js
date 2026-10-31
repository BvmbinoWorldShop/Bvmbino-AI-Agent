import { setCors } from './_cors.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { prompt, width = 768, height = 768, quality = 'standard', keys = {} } = body;
    if (!prompt) return res.status(400).json({ error: 'prompt is required' });

    const geminiKey = keys.gemini || req.headers['x-gemini-key'] || process.env.GEMINI_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
    const openaiKey = keys.openai || req.headers['x-openai-key'] || process.env.OPENAI_API_KEY || '';
    const hfKey = keys.huggingface || req.headers['x-hf-key'] || process.env.HUGGINGFACE_API_KEY || '';

    // ── 1. GOOGLE GEMINI NANO BANANA (IMAGEN 3) ENGINE (100% Free of Charge) ──
    if (geminiKey) {
      // Primary: Google Imagen 3 (imagen-3.0-generate-002)
      try {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 22000);
        const gUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${geminiKey}`;
        const gRes = await fetch(gUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            instances: [{ prompt }],
            parameters: {
              sampleCount: 1,
              aspectRatio: '1:1',
              outputMimeType: 'image/jpeg'
            }
          }),
          signal: ctrl.signal
        });
        clearTimeout(tid);
        if (gRes.ok) {
          const gData = await gRes.json();
          const b64 = gData.predictions?.[0]?.bytesBase64Encoded;
          if (b64) {
            return res.status(200).json({
              success: true,
              url: `data:image/jpeg;base64,${b64}`,
              model: 'gemini-imagen-3-nano-banana'
            });
          }
        }
      } catch (e) {
        console.warn('[image] Gemini Imagen 3 error:', e.message);
      }

      // Secondary: Gemini 2.0 Flash Multimodal Image Generation
      try {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 20000);
        const flashUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${geminiKey}`;
        const flashRes = await fetch(flashUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `Generate an image: ${prompt}` }] }],
            generationConfig: { responseModalities: ['TEXT', 'IMAGE'] }
          }),
          signal: ctrl.signal
        });
        clearTimeout(tid);
        if (flashRes.ok) {
          const fData = await flashRes.json();
          const parts = fData.candidates?.[0]?.content?.parts || [];
          for (const p of parts) {
            if (p.inlineData && p.inlineData.data) {
              const mime = p.inlineData.mimeType || 'image/png';
              return res.status(200).json({
                success: true,
                url: `data:${mime};base64,${p.inlineData.data}`,
                model: 'gemini-2.0-flash-nano-banana'
              });
            }
          }
        }
      } catch (e) {
        console.warn('[image] Gemini 2.0 Flash error:', e.message);
      }
    }

    // ── 2. OPENAI DALL-E 3 (if key provided) ──
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

    // ── 3. HUGGING FACE FLUX.1-SCHNELL (if key provided) ──
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

    // ── 4. FREE TIER DIFFUSION ENGINE: Pollinations Turbo ──
    // Fetched server-side with browser User-Agent
    try {
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 12000);
      const pollUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&nologo=true&seed=${Date.now()}&model=turbo`;
      const pRes = await fetch(pollUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
        },
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

    // Direct URL fallback from Pollinations Turbo (client-side render)
    const directUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&nologo=true&seed=${Date.now()}&model=turbo`;
    return res.status(200).json({
      success: true,
      url: directUrl,
      model: 'pollinations-turbo-direct'
    });

  } catch (err) {
    return res.status(500).json({ error: err.message || 'Image generation failed' });
  }
}
