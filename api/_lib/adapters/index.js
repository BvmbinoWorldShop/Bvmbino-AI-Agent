import { executeGroq } from './groq.js';
import { executeCerebras } from './cerebras.js';
import { executeOpenRouter } from './openrouter.js';
import { executeGemini } from './gemini.js';
import { executeAnthropic, transformAnthropicPayload } from './anthropic.js';
import { executeOpenAI } from './openai.js';
import { executeMistral } from './mistral.js';
import { executeOllama } from './ollama.js';

export const ADAPTERS = {
  groq: executeGroq,
  cerebras: executeCerebras,
  openrouter: executeOpenRouter,
  gemini: executeGemini,
  anthropic: executeAnthropic,
  openai: executeOpenAI,
  mistral: executeMistral,
  ollama: executeOllama,
  local: executeOllama,
};

export async function executeAdapter(provider, options) {
  const adapter = ADAPTERS[provider];
  if (!adapter) {
    const err = new Error(`Unsupported provider adapter: ${provider}`);
    err.status = 400;
    throw err;
  }
  return adapter(options);
}

export {
  executeGroq,
  executeCerebras,
  executeOpenRouter,
  executeGemini,
  executeAnthropic,
  transformAnthropicPayload,
  executeOpenAI,
  executeMistral,
  executeOllama
};
