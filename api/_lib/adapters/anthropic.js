/**
 * Anthropic Adapter (Handles Anthropic-specific /v1/messages format)
 */

export function transformAnthropicPayload(messages = [], baseSystem = '', maxTokens = 1200, temperature = 0.7, model = 'claude-3-5-sonnet-latest', stream = false) {
  let systemParts = [];
  if (baseSystem) systemParts.push(baseSystem);

  const cleanMessages = [];
  for (const m of messages) {
    if (!m) continue;
    if (m.role === 'system') {
      if (m.content) systemParts.push(m.content);
    } else if (m.role === 'user' || m.role === 'assistant') {
      const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
      // Merge consecutive same-role messages
      if (cleanMessages.length > 0 && cleanMessages[cleanMessages.length - 1].role === m.role) {
        cleanMessages[cleanMessages.length - 1].content += '\n\n' + content;
      } else {
        cleanMessages.push({ role: m.role, content });
      }
    }
  }

  // Anthropic requires at least one user message
  if (cleanMessages.length === 0) {
    cleanMessages.push({ role: 'user', content: 'Hello' });
  }

  const payload = {
    model,
    messages: cleanMessages,
    max_tokens: maxTokens || 1024,
    temperature: typeof temperature === 'number' ? Math.min(1.0, Math.max(0.0, temperature)) : 0.7,
    stream: stream === true
  };

  const fullSystem = systemParts.join('\n\n').trim();
  if (fullSystem) {
    payload.system = fullSystem;
  }

  return payload;
}

export async function executeAnthropic({
  model = 'claude-3-5-sonnet-latest',
  messages = [],
  system = '',
  stream = false,
  temperature = 0.7,
  maxTokens = 1200,
  timeoutMs = 25000,
  key
}) {
  if (!key) {
    const err = new Error('Anthropic API key missing');
    err.status = 401;
    err.isPermanentAuthFailure = true;
    throw err;
  }

  let reqModel = model;
  if (!reqModel.includes('claude')) {
    reqModel = 'claude-3-5-sonnet-latest';
  }

  const payload = transformAnthropicPayload(messages, system, maxTokens, temperature, reqModel, stream);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    if (!response.ok) {
      const errText = await response.text();
      const err = new Error(`anthropic/${reqModel} (${response.status}): ${errText.slice(0, 150)}`);
      err.status = response.status;
      if (response.status === 401 || response.status === 403 || response.status === 402) {
        err.isPermanentAuthFailure = true;
      } else {
        err.isModelSpecificFailure = true;
      }
      throw err;
    }

    if (stream) {
      return { response, model: reqModel, provider: 'anthropic' };
    }

    const data = await response.json();
    const replyText = data.content?.map(c => c.text || '').join('\n') || '';

    return {
      isCustomResult: true,
      reply: replyText,
      model: reqModel,
      provider: 'anthropic',
      raw: data
    };
  } catch (e) {
    if (e.name === 'AbortError') {
      const timeoutErr = new Error(`anthropic/${reqModel} timed out after ${timeoutMs}ms`);
      timeoutErr.name = 'AbortError';
      timeoutErr.isModelSpecificFailure = true;
      throw timeoutErr;
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
