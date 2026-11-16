/**
 * Groq Adapter (Free LPU Tier Priority)
 */
export async function executeGroq({
  model = 'llama-3.3-70b-versatile',
  messages = [],
  stream = false,
  temperature = 0.7,
  maxTokens = 1200,
  timeoutMs = 22000,
  key
}) {
  if (!key) {
    const err = new Error('Groq API key missing');
    err.status = 401;
    err.isPermanentAuthFailure = true;
    throw err;
  }

  // Normalize model identifier
  let reqModel = model;
  if (reqModel.startsWith('llama3.1-70b')) {
    reqModel = 'llama-3.3-70b-versatile';
  } else if (!reqModel.includes('llama') && !reqModel.includes('mixtral') && !reqModel.includes('gemma')) {
    reqModel = 'llama-3.3-70b-versatile';
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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
      const err = new Error(`groq/${reqModel} (${response.status}): ${errText.slice(0, 150)}`);
      err.status = response.status;
      if (response.status === 401 || response.status === 403) err.isPermanentAuthFailure = true;
      else err.isModelSpecificFailure = true;
      throw err;
    }

    return { response, model: reqModel, provider: 'groq' };
  } catch (e) {
    if (e.name === 'AbortError') {
      const timeoutErr = new Error(`groq/${reqModel} timed out after ${timeoutMs}ms`);
      timeoutErr.name = 'AbortError';
      timeoutErr.isModelSpecificFailure = true;
      throw timeoutErr;
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
