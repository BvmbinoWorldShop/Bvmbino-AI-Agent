/**
 * Mistral Adapter
 */
export async function executeMistral({
  model = 'mistral-small-latest',
  messages = [],
  stream = false,
  temperature = 0.7,
  maxTokens = 1200,
  timeoutMs = 22000,
  key
}) {
  if (!key) {
    const err = new Error('Mistral API key missing');
    err.status = 401;
    err.isPermanentAuthFailure = true;
    throw err;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model,
        messages,
        stream,
        temperature,
        max_tokens: maxTokens
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const errText = await response.text();
      const err = new Error(`mistral/${model} (${response.status}): ${errText.slice(0, 150)}`);
      err.status = response.status;
      if (response.status === 401 || response.status === 403 || response.status === 402) {
        err.isPermanentAuthFailure = true;
      } else {
        err.isModelSpecificFailure = true;
      }
      throw err;
    }

    return { response, model, provider: 'mistral' };
  } catch (e) {
    if (e.name === 'AbortError') {
      const timeoutErr = new Error(`mistral/${model} timed out after ${timeoutMs}ms`);
      timeoutErr.name = 'AbortError';
      timeoutErr.isModelSpecificFailure = true;
      throw timeoutErr;
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
