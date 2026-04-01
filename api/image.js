export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GEMINI_KEY;

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { prompt, width = 1024, height = 1024 } = body;

    if (!prompt) return res.status(400).json({ error: 'prompt is required' });

    // Try Gemini image generation first
    if (apiKey) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
            }),
          }
        );
        const gData = await geminiRes.json();
        const parts = gData.candidates?.[0]?.content?.parts || [];
        const imgPart = parts.find(p => p.inlineData);
        if (imgPart) {
          const dataUrl = `data:${imgPart.inlineData.mimeType};base64,${imgPart.inlineData.data}`;
          return res.status(200).json({ data: [{ url: dataUrl }], model: 'gemini' });
        }
      } catch (geminiErr) {
        console.error('Gemini image error, falling back to Pollinations:', geminiErr.message);
      }
    }

    // Fallback: Pollinations (free, no key)
    const encoded = encodeURIComponent(prompt);
    const imageUrl = `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&nologo=true&seed=${Date.now()}`;
    const check = await fetch(imageUrl, { method: 'HEAD' });
    if (!check.ok) throw new Error(`Pollinations returned ${check.status}`);
    return res.status(200).json({ data: [{ url: imageUrl }], model: 'pollinations' });

  } catch (err) {
    console.error('Image proxy error:', err);
    return res.status(500).json({ error: 'Image proxy error', detail: err.message });
  }
}
