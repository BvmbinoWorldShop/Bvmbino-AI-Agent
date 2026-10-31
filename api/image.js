import { setCors } from './_cors.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { prompt, width = 768, height = 768, quality = 'standard', keys = {} } = body;
    if (!prompt) return res.status(400).json({ error: 'prompt is required' });

    const rawGemini = keys.gemini || req.headers['x-gemini-key'] || process.env.GEMINI_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
    const geminiKey = String(rawGemini).replace(/[^\x20-\x7E]/g, '').trim();

    const rawOpenai = keys.openai || req.headers['x-openai-key'] || process.env.OPENAI_API_KEY || '';
    const openaiKey = String(rawOpenai).replace(/[^\x20-\x7E]/g, '').trim();

    const rawHf = keys.huggingface || req.headers['x-hf-key'] || process.env.HUGGINGFACE_API_KEY || '';
    const hfKey = String(rawHf).replace(/[^\x20-\x7E]/g, '').trim();

    const errors = [];

    // ── 1. GOOGLE GEMINI NANO BANANA MULTI-MODEL CASCADE ──
    if (geminiKey) {
      const geminiConfigs = [
        {
          model: 'gemini-2.5-flash-image',
          url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${geminiKey}`,
          payload: {
            contents: [{ role: 'user', parts: [{ text: `Generate a photorealistic, high quality, cinematic image: ${prompt}` }] }],
            generationConfig: { responseModalities: ['TEXT', 'IMAGE'] }
          }
        },
        {
          model: 'gemini-2.0-flash-exp',
          url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiKey}`,
          payload: {
            contents: [{ role: 'user', parts: [{ text: `Generate a photorealistic, high quality, cinematic image: ${prompt}` }] }],
            generationConfig: { responseModalities: ['TEXT', 'IMAGE'] }
          }
        },
        {
          model: 'gemini-2.0-flash',
          url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
          payload: {
            contents: [{ role: 'user', parts: [{ text: `Generate a photorealistic, high quality, cinematic image: ${prompt}` }] }],
            generationConfig: { responseModalities: ['TEXT', 'IMAGE'] }
          }
        },
        {
          model: 'gemini-3.1-flash-image',
          url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent?key=${geminiKey}`,
          payload: {
            contents: [{ role: 'user', parts: [{ text: `Generate a photorealistic, high quality, cinematic image: ${prompt}` }] }],
            generationConfig: { responseModalities: ['TEXT', 'IMAGE'] }
          }
        },
        {
          model: 'gemini-2.0-flash-preview-image-generation',
          url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${geminiKey}`,
          payload: {
            contents: [{ role: 'user', parts: [{ text: `Generate an image: ${prompt}` }] }],
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
          const tid = setTimeout(() => ctrl.abort(), 20000);
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
                const inline = p.inlineData || p.inline_data;
                if (inline && inline.data) {
                  const mime = inline.mimeType || inline.mime_type || 'image/jpeg';
                  return res.status(200).json({
                    success: true,
                    url: `data:${mime};base64,${inline.data}`,
                    model: cfg.model
                  });
                }
              }
            }
          } else {
            const errTxt = await gRes.text().catch(() => '');
            errors.push(`[${cfg.model}] status ${gRes.status}: ${errTxt.slice(0, 150)}`);
          }
        } catch (e) {
          errors.push(`[${cfg.model}] exception: ${e.message}`);
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
        const tid = setTimeout(() => ctrl.abort(), 22000);
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
        } else {
          const errTxt = await hfRes.text().catch(() => '');
          errors.push(`HuggingFace status ${hfRes.status}: ${errTxt.slice(0, 120)}`);
        }
      } catch (e) {
        errors.push(`HF error: ${e.message}`);
      }
    }

    // ── 4. ERROR REPORTING (NO PROCEDURAL SVG / NO UGLY PLACEHOLDERS) ──
    // If keys failed or were not provided, return the actual reason so the user knows what to fix
    if (geminiKey) {
      const firstErr = errors.find(e => e.includes('API_KEY_INVALID') || e.includes('status 400') || e.includes('status 403')) || errors[0] || 'API request rejected';
      return res.status(400).json({
        success: false,
        error: `Google Gemini image generation failed. ${firstErr}. Please check your key at https://aistudio.google.com/apikey`,
        diagnostics: errors
      });
    }

    return res.status(400).json({
      success: false,
      error: 'No image engine key configured. Add your free Google AI Studio key in ⚙️ Settings (100% free at aistudio.google.com/apikey) to generate images.',
      diagnostics: errors
    });

  } catch (err) {
    return res.status(500).json({ error: err.message || 'Image generation failed' });
  }
}
