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

    const errors = [];

    // ── 1. GOOGLE GEMINI NANO BANANA MULTI-MODEL CASCADE ──
    if (geminiKey) {
      // Model cascade for Gemini Image Generation:
      // a) gemini-2.5-flash-image (Current official Nano Banana image generation model)
      // b) gemini-2.0-flash-exp (Multimodal generateContent with responseModalities)
      // c) gemini-2.0-flash (Multimodal generateContent with responseModalities)
      // d) gemini-3.1-flash-image (Nano Banana 2 preview)
      // e) gemini-3-pro-image-preview
      // f) gemini-2.0-flash-preview-image-generation
      // g) imagen-3.0-generate-002:predict

      const geminiConfigs = [
        {
          model: 'gemini-2.5-flash-image',
          url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${geminiKey}`,
          payload: {
            contents: [{ parts: [{ text: `Generate a high quality, detailed, photorealistic image of: ${prompt}` }] }]
          }
        },
        {
          model: 'gemini-2.0-flash-exp',
          url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiKey}`,
          payload: {
            contents: [{ parts: [{ text: `Generate an image of: ${prompt}` }] }],
            generationConfig: { responseModalities: ['TEXT', 'IMAGE'] }
          }
        },
        {
          model: 'gemini-2.0-flash',
          url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
          payload: {
            contents: [{ parts: [{ text: `Generate an image of: ${prompt}` }] }],
            generationConfig: { responseModalities: ['TEXT', 'IMAGE'] }
          }
        },
        {
          model: 'gemini-3.1-flash-image',
          url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent?key=${geminiKey}`,
          payload: {
            contents: [{ parts: [{ text: `Generate an image of: ${prompt}` }] }],
            generationConfig: { responseModalities: ['TEXT', 'IMAGE'] }
          }
        },
        {
          model: 'gemini-2.0-flash-preview-image-generation',
          url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${geminiKey}`,
          payload: {
            contents: [{ parts: [{ text: `Generate an image: ${prompt}` }] }],
            generationConfig: { responseModalities: ['TEXT', 'IMAGE'] }
          }
        },
        {
          model: 'imagen-3.0-generate-002',
          url: `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${geminiKey}`,
          payload: {
            instances: [{ prompt }],
            parameters: { sampleCount: 1, aspectRatio: '1:1', outputMimeType: 'image/jpeg' }
          }
        }
      ];

      for (const cfg of geminiConfigs) {
        try {
          const ctrl = new AbortController();
          const tid = setTimeout(() => ctrl.abort(), 18000);
          const gRes = await fetch(cfg.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': geminiKey
            },
            body: JSON.stringify(cfg.payload),
            signal: ctrl.signal
          });
          clearTimeout(tid);

          if (gRes.ok) {
            const gData = await gRes.json();
            // Check predict syntax
            const b64Predict = gData.predictions?.[0]?.bytesBase64Encoded;
            if (b64Predict) {
              return res.status(200).json({
                success: true,
                url: `data:image/jpeg;base64,${b64Predict}`,
                model: cfg.model
              });
            }
            // Check generateContent syntax
            const candidates = gData.candidates || [];
            for (const cand of candidates) {
              const parts = cand.content?.parts || [];
              for (const p of parts) {
                if (p.inlineData && p.inlineData.data) {
                  const mime = p.inlineData.mimeType || 'image/jpeg';
                  return res.status(200).json({
                    success: true,
                    url: `data:${mime};base64,${p.inlineData.data}`,
                    model: cfg.model
                  });
                }
              }
            }
          } else {
            const errTxt = await gRes.text().catch(() => '');
            errors.push(`Gemini [${cfg.model}] status ${gRes.status}: ${errTxt.slice(0, 120)}`);
          }
        } catch (e) {
          errors.push(`Gemini [${cfg.model}] exception: ${e.message}`);
        }
      }
    }

    // ── 2. OPENAI DALL-E 3 (returns base64 directly in-app) ──
    if (openaiKey) {
      try {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 25000);
        const oRes = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiKey}` },
          body: JSON.stringify({
            model: 'dall-e-3',
            prompt,
            n: 1,
            size: `${width}x${height}`,
            quality,
            response_format: 'b64_json'
          }),
          signal: ctrl.signal
        });
        clearTimeout(tid);
        if (oRes.ok) {
          const d = await oRes.json();
          const b64 = d.data?.[0]?.b64_json;
          if (b64) {
            return res.status(200).json({
              success: true,
              url: `data:image/png;base64,${b64}`,
              model: 'dall-e-3'
            });
          }
          if (d.data?.[0]?.url) {
            return res.status(200).json({ success: true, url: d.data[0].url, model: 'dall-e-3' });
          }
        } else {
          const errTxt = await oRes.text().catch(() => '');
          errors.push(`OpenAI status ${oRes.status}: ${errTxt.slice(0, 120)}`);
        }
      } catch (e) {
        errors.push(`OpenAI error: ${e.message}`);
      }
    }

    // ── 3. HUGGING FACE FLUX.1 (Free inference router with key) ──
    if (hfKey) {
      try {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 20000);
        const hfRes = await fetch('https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell', {
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
        errors.push(`HF error: ${e.message}`);
      }
    }

    // ── 4. FREE DIFFUSION ENGINE (Server-Side Fetch to Base64 — NEVER RETURNS EXTERNAL URLS) ──
    // Fetches image bytes entirely on the server and encodes directly as base64 data URI
    // ZERO external redirects, ZERO client tabs, ZERO logins required!
    try {
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 14000);
      const seed = Math.floor(Math.random() * 1000000);
      const pollUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&nologo=true&seed=${seed}&model=turbo`;
      const pRes = await fetch(pollUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
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
            model: 'in-app-diffusion-base64'
          });
        }
      }
    } catch (e) {
      errors.push(`Server diffusion error: ${e.message}`);
    }

    // ── 5. ZERO-FAILURE IN-APP PROCEDURAL SVG ART ENGINE (100% IN-APP BASE64) ──
    // Guarantees an immediate visual is delivered directly inside chat, never blank, never redirecting
    const safeP = prompt.replace(/[<>&"']/g, '').slice(0, 100);
    const hash = Array.from(safeP).reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) & 0xffffff, 0);
    const h1 = hash % 360;
    const h2 = (h1 + 60) % 360;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="100%" height="100%">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="hsl(${h1}, 70%, 12%)"/>
      <stop offset="50%" stop-color="#0a0800"/>
      <stop offset="100%" stop-color="hsl(${h2}, 80%, 10%)"/>
    </linearGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#f59e0b"/>
      <stop offset="50%" stop-color="#e8a912"/>
      <stop offset="100%" stop-color="#fbbf24"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#e8a912" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
    <filter id="blur">
      <feGaussianBlur stdDeviation="30"/>
    </filter>
  </defs>
  <rect width="800" height="800" fill="url(#bg)"/>
  <circle cx="400" cy="400" r="320" fill="url(#glow)"/>
  <g transform="translate(400, 360)">
    <circle cx="0" cy="0" r="140" fill="none" stroke="url(#gold)" stroke-width="2.5" opacity="0.6"/>
    <circle cx="0" cy="0" r="100" fill="none" stroke="#22c55e" stroke-width="1.5" stroke-dasharray="6,6" opacity="0.7"/>
    <polygon points="0,-70 60,35 -60,35" fill="none" stroke="url(#gold)" stroke-width="2" opacity="0.8"/>
    <circle cx="0" cy="0" r="18" fill="#e8a912" filter="url(#blur)"/>
    <circle cx="0" cy="0" r="10" fill="#22c55e"/>
  </g>
  <rect x="60" y="620" width="680" height="120" rx="12" fill="#0f0c02" stroke="#e8a912" stroke-opacity="0.3" stroke-width="1"/>
  <text x="400" y="660" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="700" fill="#e8a912" text-anchor="middle" letter-spacing="2">BVMBINO AI · IN-APP SYNTHESIS</text>
  <text x="400" y="695" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="500" fill="#ffffff" text-anchor="middle">"${safeP}"</text>
</svg>`;

    const b64Svg = Buffer.from(svg).toString('base64');
    return res.status(200).json({
      success: true,
      url: `data:image/svg+xml;base64,${b64Svg}`,
      model: 'bvmbino-inapp-canvas',
      diagnostics: errors.length ? errors : undefined
    });

  } catch (err) {
    return res.status(500).json({ error: err.message || 'Image generation failed' });
  }
}
