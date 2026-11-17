import { safePinnedFetch, validateSafeUrl } from '../ssrf.js';

/**
 * Local AI Adapter (Ollama / llama.cpp / LM Studio / LocalAI)
 * Zero Cost · Zero API Keys · 100% Private Local Inference · SSRF-Hardened
 */
export async function executeOllama({
  model = 'llama3.2',
  messages = [],
  system = '',
  stream: _stream = false,
  temperature = 0.7,
  maxTokens = 2048,
  timeoutMs = 60000,
  host = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434',
  isCustomHost = false
}) {
  const cleanHost = host.replace(/\/+$/, '');
  const url = `${cleanHost}/api/chat`;

  // Merge system directive if provided
  const chatMessages = [];
  if (system) {
    chatMessages.push({ role: 'system', content: system });
  }
  for (const m of messages) {
    if (m && m.role && m.content) {
      chatMessages.push({ role: m.role, content: m.content });
    }
  }

  const payloadBody = JSON.stringify({
    model: model || 'llama3.2',
    messages: chatMessages,
    stream: false,
    options: {
      temperature,
      num_predict: maxTokens
    }
  });

  try {
    let response;
    if (isCustomHost) {
      // Validate safe URL and execute DNS-pinned fetch
      await validateSafeUrl(url);
      response = await safePinnedFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payloadBody,
        timeoutMs
      });
      if (!response.ok) {
        const errText = typeof response.text === 'function' ? response.text() : '';
        const err = new Error(`Local Ollama error (${response.status}): ${errText.slice(0, 150)}`);
        err.status = response.status;
        err.isModelSpecificFailure = true;
        throw err;
      }
      const data = JSON.parse(response.text());
      return {
        isCustomResult: true,
        reply: data.message?.content || '',
        model: `local/${model}`,
        provider: 'ollama',
        raw: data
      };
    } else {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payloadBody,
          signal: controller.signal
        });

        if (!response.ok) {
          const errText = await response.text().catch(() => '');
          const err = new Error(`Local Ollama error (${response.status}): ${errText.slice(0, 150)}`);
          err.status = response.status;
          err.isModelSpecificFailure = true;
          throw err;
        }

        const data = await response.json();
        const replyText = data.message?.content || '';

        return {
          isCustomResult: true,
          reply: replyText,
          model: `local/${model}`,
          provider: 'ollama',
          raw: data
        };
      } finally {
        clearTimeout(timer);
      }
    }
  } catch (e) {
    if (e.name === 'AbortError') {
      const timeoutErr = new Error(`Local Ollama timed out after ${timeoutMs}ms`);
      timeoutErr.name = 'AbortError';
      timeoutErr.isModelSpecificFailure = true;
      throw timeoutErr;
    }
    // Network errors (e.g. Ollama daemon not running)
    e.isLocalOffline = true;
    e.isModelSpecificFailure = true;
    throw e;
  }
}
