import { setCors, isRateLimited, validateAppToken, trackAbuse } from './_cors.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Rate Limit check (20 image generations / min)
  if (isRateLimited(req, 20)) return res.status(429).json({ error: 'Rate limit exceeded (20 req/min)' });

  // Mandatory App Token Authentication
  if (!validateAppToken(req)) {
    return res.status(403).json({ error: 'Unauthorized: Valid Bvmbino session required' });
  }

  // Abuse Protection
  if (await trackAbuse(req)) {
    return res.status(429).json({ error: 'System busy — too many requests from your IP' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { prompt, width = 1024, height = 1024, quality = 'standard', keys = {} } = body;
    if (!prompt) return res.status(400).json({ error: 'prompt is required' });

    // Clean and enrich the prompt for studio-grade, sharp, photorealistic 4K visual outputs
    const rawPrompt = String(prompt).replace(/[^\w\s.,!?'"-\/]/gi, ' ').trim();
    const cleanPrompt = `${rawPrompt}, sharp focus, highly detailed, professional photography, cinematic studio lighting, 8k uhd, photorealistic masterpiece`;
    const negativePrompt = 'blurry, low quality, pixelated, bad quality, artifacts, watermark, signature, distortion, amateur, lowres, grainy, deformed';

    const rawHf = keys.huggingface || req.headers['x-hf-key'] || process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN || '';
    const hfKey = String(rawHf).replace(/[^\x20-\x7E]/g, '').trim();

    const rawOpenai = keys.openai || req.headers['x-openai-key'] || process.env.OPENAI_API_KEY || '';
    const openaiKey = String(rawOpenai).replace(/[^\x20-\x7E]/g, '').trim();

    const rawGemini = keys.gemini || req.headers['x-gemini-key'] || process.env.GEMINI_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
    const geminiKey = String(rawGemini).replace(/[^\x20-\x7E]/g, '').trim();

    const errors = [];

    // ── 1. HUGGING FACE FLUX.1 (Free Token · Studio Quality 1024x1024 Visuals) ──
    if (hfKey) {
      try {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 24000);
        const hfRes = await fetch('https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${hfKey}` },
          body: JSON.stringify({ inputs: cleanPrompt }),
          signal: ctrl.signal
        });
        clearTimeout(tid);
        if (hfRes.ok) {
          const buf = Buffer.from(await hfRes.arrayBuffer());
          const mime = hfRes.headers.get('content-type') || 'image/jpeg';
          return res.status(200).json({
            success: true,
            url: `data:${mime};base64,${buf.toString('base64')}`,
            model: 'flux-1-schnell-4k'
          });
        } else {
          const errTxt = await hfRes.text().catch(() => '');
          errors.push(`HuggingFace status ${hfRes.status}: ${errTxt.slice(0, 100)}`);
        }
      } catch (e) {
        errors.push(`HF error: ${e.message}`);
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
          body: JSON.stringify({
            model: 'dall-e-3',
            prompt: rawPrompt,
            n: 1,
            size: '1024x1024',
            quality: 'hd',
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
              model: 'dall-e-3-hd'
            });
          }
        } else {
          const errTxt = await oRes.text().catch(() => '');
          errors.push(`OpenAI status ${oRes.status}: ${errTxt.slice(0, 100)}`);
        }
      } catch (e) {
        errors.push(`OpenAI error: ${e.message}`);
      }
    }

    // ── 3. 100% FREE FLUX & TURBO ENGINE (CRISP 1024x1024 DIFFUSION) ──
    // Note: seed MUST be <= 2147483647 (int32 max) to pass backend validation
    const validSeed = Math.floor(Math.random() * 2000000000);
    const freeModels = ['flux', 'turbo'];

    for (const m of freeModels) {
      try {
        const pollUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?width=${width}&height=${height}&nologo=true&seed=${validSeed}&model=${m}`;
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 12000);
        const pRes = await fetch(pollUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'image/jpeg,image/png,image/*;q=0.8'
          },
          signal: ctrl.signal
        });
        clearTimeout(tid);

        if (pRes.ok) {
          const cType = pRes.headers.get('content-type') || '';
          if (cType.includes('image')) {
            const buf = Buffer.from(await pRes.arrayBuffer());
            if (buf.length > 2000) {
              const mime = cType.split(';')[0] || 'image/jpeg';
              return res.status(200).json({
                success: true,
                url: `data:${mime};base64,${buf.toString('base64')}`,
                model: `${m}-1024-clean`
              });
            }
          }
        } else {
          const pErr = await pRes.text().catch(() => '');
          errors.push(`Pollinations [${m}] status ${pRes.status}: ${pErr.slice(0, 80)}`);
        }
      } catch (e) {
        errors.push(`Pollinations [${m}] error: ${e.message}`);
      }
    }

    // ── 4. 100% FREE SDXL DECENTRALIZED STABLE DIFFUSION (AI HORDE) ──
    // Uses high-quality photorealistic SDXL models (Juggernaut XL, AlbedoBase XL, AbsoluteReality)
    try {
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 20000);
      const hordePrompt = `${cleanPrompt} ### ${negativePrompt}`;
      const hSubmit = await fetch('https://aihorde.net/api/v2/generate/async', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': '0000000000' },
        body: JSON.stringify({
          prompt: hordePrompt,
          models: ['Juggernaut XL', 'AlbedoBase XL (SDXL)', 'AbsoluteReality', 'Deliberate', 'stable_diffusion'],
          params: { steps: 22, width: 768, height: 768, cfg_scale: 7.5 }
        }),
        signal: ctrl.signal
      });
      clearTimeout(tid);

      if (hSubmit.status === 202) {
        const hData = await hSubmit.json();
        const hordeId = hData.id;
        if (hordeId) {
          for (let p = 0; p < 7; p++) {
            await new Promise(r => setTimeout(r, 2000));
            const statRes = await fetch(`https://aihorde.net/api/v2/generate/status/${hordeId}`);
            if (statRes.ok) {
              const statData = await statRes.json();
              if (statData.done && statData.generations?.[0]?.img) {
                const imgLoc = statData.generations[0].img;
                if (imgLoc.startsWith('http')) {
                  const imgRes = await fetch(imgLoc);
                  if (imgRes.ok) {
                    const buf = Buffer.from(await imgRes.arrayBuffer());
                    return res.status(200).json({
                      success: true,
                      url: `data:image/webp;base64,${buf.toString('base64')}`,
                      model: `sdxl-${statData.generations[0].model || 'clean'}`
                    });
                  }
                } else if (imgLoc.length > 500) {
                  return res.status(200).json({
                    success: true,
                    url: `data:image/webp;base64,${imgLoc}`,
                    model: 'sdxl-horde-clean'
                  });
                }
              }
            }
          }
        }
      }
    } catch (e) {
      errors.push(`Horde error: ${e.message}`);
    }

    // ── 5. OPTIONAL GEMINI FALLBACK (if user explicitly configured key) ──
    if (geminiKey) {
      try {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 12000);
        const iRes = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey },
          body: JSON.stringify({
            model: 'gemini-nano-banana-2.1',
            input: rawPrompt,
            response_format: { type: 'image', aspect_ratio: '1:1', image_size: '2K' }
          }),
          signal: ctrl.signal
        });
        clearTimeout(tid);
        if (iRes.ok) {
          const iData = await iRes.json();
          for (const step of (iData.steps || [])) {
            for (const c of (step.content || [])) {
              if (c.type === 'image' && c.data) {
                return res.status(200).json({
                  success: true,
                  url: `data:${c.mime_type || 'image/png'};base64,${c.data}`,
                  model: 'gemini-nano-banana-2k'
                });
              }
            }
          }
        }
      } catch (e) {
        errors.push(`Gemini error: ${e.message}`);
      }
    }

    // ── 6. DIRECT CLIENT BROWSER RESOLVER ──
    return res.status(200).json({
      success: false,
      fallbackToBrowser: true,
      prompt: cleanPrompt,
      width,
      height,
      diagnostics: errors
    });

  } catch (err) {
    return res.status(500).json({ error: err.message || 'Image generation failed' });
  }
}
