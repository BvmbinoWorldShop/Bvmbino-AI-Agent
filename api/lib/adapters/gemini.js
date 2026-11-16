/**
 * Google Gemini Adapter (Free Tier 15 RPM / 1500 RPD + Multimodal PDF OCR)
 */
export async function executeGemini({
  model = 'gemini-2.0-flash',
  messages = [],
  system = '',
  stream = false,
  temperature = 0.7,
  maxTokens = 2048,
  timeoutMs = 25000,
  key,
  pdfDocuments = [],
  userPrompt = ''
}) {
  if (!key) {
    const err = new Error('Gemini API key missing');
    err.status = 401;
    err.isPermanentAuthFailure = true;
    throw err;
  }

  let reqModel = model;
  if (!reqModel.includes('gemini')) {
    reqModel = 'gemini-2.0-flash';
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // ── Flow A: Multimodal Native PDF Ingestion ─────────────────────────────
    if (pdfDocuments && pdfDocuments.length > 0) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${reqModel}:generateContent?key=${key}`;
      const inlinePdfs = pdfDocuments.map(p => ({
        inlineData: { mimeType: p.mimeType || 'application/pdf', data: p.data }
      }));

      const directive = `${system ? system + '\n\n' : ''}[INSTRUCTION]: Read and analyze this attached PDF document completely. Extract all workout splits, exercises, sets, reps, tables, or contract details directly without asking for confirmation.\n\n${userPrompt || 'Analyze attached document.'}`;

      const gRes = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': key
        },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [
              { text: directive },
              ...inlinePdfs
            ]
          }],
          generationConfig: { maxOutputTokens: maxTokens, temperature }
        }),
        signal: controller.signal
      });

      if (!gRes.ok) {
        const errT = await gRes.text();
        const err = new Error(`gemini-pdf/${reqModel} (${gRes.status}): ${errT.slice(0, 150)}`);
        err.status = gRes.status;
        if (gRes.status === 401 || gRes.status === 403) err.isPermanentAuthFailure = true;
        else err.isModelSpecificFailure = true;
        throw err;
      }

      const gData = await gRes.json();
      const replyText = gData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!replyText) {
        const err = new Error('Gemini returned empty candidate');
        err.status = 502;
        err.isModelSpecificFailure = true;
        throw err;
      }

      // Return unified structure
      return {
        isCustomResult: true,
        reply: replyText,
        model: reqModel,
        provider: 'gemini'
      };
    }

    // ── Flow B: Standard OpenAI-Compatible Endpoint ─────────────────────────
    const url = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model: reqModel,
        messages,
        stream,
        temperature,
        max_tokens: maxTokens
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const errText = await response.text();
      const err = new Error(`gemini/${reqModel} (${response.status}): ${errText.slice(0, 150)}`);
      err.status = response.status;
      if (response.status === 401 || response.status === 403) err.isPermanentAuthFailure = true;
      else err.isModelSpecificFailure = true;
      throw err;
    }

    return { response, model: reqModel, provider: 'gemini' };
  } catch (e) {
    if (e.name === 'AbortError') {
      const timeoutErr = new Error(`gemini/${reqModel} timed out after ${timeoutMs}ms`);
      timeoutErr.name = 'AbortError';
      timeoutErr.isModelSpecificFailure = true;
      throw timeoutErr;
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
