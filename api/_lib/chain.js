/**
 * Builds the provider execution chain respecting the user mandate:
 * 1. 100% Free / Local AI first (Local Ollama, Groq, Cerebras, OpenRouter free, Gemini free tier).
 * 2. Paid frontier models (OpenAI, Anthropic) strictly last as optional accelerators.
 */
export function buildExecutionChain({ keys = {}, requestedModel = null, pdfDocuments = [] }) {
  const chain = [];

  // Honour explicit user-requested model first if corresponding key/endpoint is provided
  if (requestedModel) {
    const rm = requestedModel.toLowerCase();
    if ((rm.startsWith('local/') || rm.startsWith('ollama/')) || rm.includes('llama3.2') || rm.includes('qwen') || rm.includes('phi3')) {
      chain.push({ provider: 'ollama', model: requestedModel.replace(/^(local|ollama)\//, '') });
    } else if (rm.includes('claude') && keys.anthropic) {
      chain.push({ provider: 'anthropic', model: requestedModel });
    } else if (rm.includes('gpt') && keys.openai) {
      chain.push({ provider: 'openai', model: requestedModel });
    } else if (rm.includes('gemini') && keys.gemini) {
      chain.push({ provider: 'gemini', model: requestedModel });
    } else if (rm.includes('mistral') && keys.mistral) {
      chain.push({ provider: 'mistral', model: requestedModel });
    } else if (rm.includes('/') && keys.openrouter) {
      chain.push({ provider: 'openrouter', model: requestedModel.replace(':free', '') });
    } else if ((rm === 'llama-3.3-70b' || rm.startsWith('llama3.1-') || rm.startsWith('cerebras/')) && keys.cerebras) {
      chain.push({ provider: 'cerebras', model: requestedModel.replace('cerebras/', '') });
    } else if ((rm.startsWith('groq/') || rm.includes('llama-3.3-70b-versatile')) && keys.groq) {
      chain.push({ provider: 'groq', model: requestedModel.replace('groq/', '') });
    }
  }

  // Priority 0: Native Multimodal PDF Document Engines (Gemini 2.0 Flash has 1M context + native OCR)
  if (pdfDocuments && pdfDocuments.length > 0) {
    if (keys.gemini)    chain.push({ provider: 'gemini', model: 'gemini-2.0-flash' });
    if (keys.anthropic) chain.push({ provider: 'anthropic', model: 'claude-3-5-sonnet-latest' });
  }

  // Priority 1: Free Ultra-Fast Cloud LPUs & Free Cloud Engines (Groq, Cerebras, Gemini Free Tier, OpenRouter Free)
  if (keys.groq) {
    chain.push({ provider: 'groq', model: 'llama-3.3-70b-versatile' });
  }
  if (keys.cerebras) {
    chain.push({ provider: 'cerebras', model: 'llama-3.3-70b' });
    chain.push({ provider: 'cerebras', model: 'llama3.1-8b' });
  }
  if (keys.gemini) {
    chain.push({ provider: 'gemini', model: 'gemini-2.0-flash' });
    chain.push({ provider: 'gemini', model: 'gemini-1.5-flash' });
  }
  if (keys.openrouter) {
    chain.push({ provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct:free' });
  }
  if (keys.groq) {
    chain.push({ provider: 'groq', model: 'llama-3.1-8b-instant' });
  }

  // Priority 2: Local AI (Zero API Keys · 100% Private · Zero Cost)
  if (keys.ollama || keys.local || process.env.OLLAMA_HOST) {
    chain.push({ provider: 'ollama', model: 'llama3.2' });
  }

  // Priority 3: Generous / Developer Cloud Tier
  if (keys.openrouter) {
    chain.push({ provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct' });
  }
  if (keys.mistral) {
    chain.push({ provider: 'mistral', model: 'mistral-small-latest' });
  }

  // Priority 4: Paid Frontier Models (STRICTLY LAST)
  if (keys.openai) {
    chain.push({ provider: 'openai', model: 'gpt-4o-mini' });
    chain.push({ provider: 'openai', model: 'gpt-4o' });
  }
  if (keys.anthropic) {
    chain.push({ provider: 'anthropic', model: 'claude-3-5-haiku-latest' });
    chain.push({ provider: 'anthropic', model: 'claude-3-5-sonnet-latest' });
  }

  // Deduplicate entries preserving priority order
  const seen = new Set();
  return chain.filter(item => {
    const id = `${item.provider}:${item.model}`;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}
