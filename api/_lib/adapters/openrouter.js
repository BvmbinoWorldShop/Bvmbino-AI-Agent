/**
 * OpenRouter Adapter
 */
export async function executeOpenRouter({
  model = 'meta-llama/llama-3.3-70b-instruct',
  messages = [],
  stream = false,
  temperature = 0.7,
  maxTokens = 1200,
  timeoutMs = 22000,
  key
}) {
  if (!key) {
    const err = new Error('OpenRouter API key missing');
    err.status = 401;
    err.isPermanentAuthFailure = true;
    throw err;
  }

  let reqModel = model;
  // Normalize model
  if (!reqModel.includes('/')) {
    reqModel = `meta-llama/${reqModel}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
        'HTTP-Referer': 'https://bvmbino-ai-agent.vercel.app',
        'X-Title': 'Bvmbino Pro'
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
      const err = new Error(`openrouter/${reqModel} (${response.status}): ${errText.slice(0, 150)}`);
      err.status = response.status;
      if (response.status === 401 || response.status === 403 || response.status === 402) {
        err.isPermanentAuthFailure = true;
      } else {
        err.isModelSpecificFailure = true;
      }
      throw err;
    }

    return { response, model: reqModel, provider: 'openrouter' };
  } catch (e) {
    if (e.name === 'AbortError') {
      const timeoutErr = new Error(`openrouter/${reqModel} timed out after ${timeoutMs}ms`);
      timeoutErr.name = 'AbortError';
      timeoutErr.isModelSpecificFailure = true;
      throw timeoutErr;
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
