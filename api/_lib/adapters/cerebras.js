/**
 * Cerebras Adapter (Wafer-Scale Fast Inference Priority)
 */
export async function executeCerebras({
  model = 'llama3.1-8b',
  messages = [],
  stream = false,
  temperature = 0.7,
  maxTokens = 1200,
  timeoutMs = 22000,
  key
}) {
  if (!key) {
    const err = new Error('Cerebras API key missing');
    err.status = 401;
    err.isPermanentAuthFailure = true;
    throw err;
  }

  // Model identifier normalization
  let reqModel = model.replace('cerebras/', '');
  if (!reqModel.startsWith('llama3.1-') && !reqModel.startsWith('llama-3.3-')) {
    reqModel = 'llama3.1-8b';
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
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
      const err = new Error(`cerebras/${reqModel} (${response.status}): ${errText.slice(0, 150)}`);
      err.status = response.status;
      if (response.status === 401 || response.status === 403) err.isPermanentAuthFailure = true;
      else err.isModelSpecificFailure = true;
      throw err;
    }

    return { response, model: reqModel, provider: 'cerebras' };
  } catch (e) {
    if (e.name === 'AbortError') {
      const timeoutErr = new Error(`cerebras/${reqModel} timed out after ${timeoutMs}ms`);
      timeoutErr.name = 'AbortError';
      timeoutErr.isModelSpecificFailure = true;
      throw timeoutErr;
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
